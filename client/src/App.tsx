import { useState, useEffect, useRef } from "react";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Header } from "@/components/Header";
import { NavigationTabs } from "@/components/NavigationTabs";
import { Dashboard } from "@/pages/Dashboard";
import { Analytics } from "@/pages/Analytics";
import { Alerts } from "@/pages/Alerts";
import { History } from "@/pages/History";
import { SettingsModal } from "@/components/SettingsModal";
import { ExportModal } from "@/components/ExportModal";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { QuickActions } from "@/components/QuickActions";
import { VoiceButton } from "@/components/VoiceButton";
import { VoiceStatusIndicator } from "@/components/VoiceStatusIndicator";
import { DashboardSkeleton } from "@/components/LoadingSkeleton";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useVoiceControl } from "@/hooks/use-voice-control";
import { 
  SensorReading,
  InsertSensorReading,
  SystemStatus, 
  Alert as AlertType, 
  Settings,
  InsertSettings,
  TrendData
} from "@shared/schema";

function AppContent() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Ensure we default to dashboard on first load
  useEffect(() => {
    if (!location || location === "") {
      setLocation("/");
    }
  }, [location, setLocation]);

  // Live data from Firebase Realtime Database (REST API)
  const FIREBASE_URL = "https://clima-610f6-default-rtdb.firebaseio.com/";

  const [sensorData, setSensorData] = useState<SensorReading | undefined>(undefined);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | undefined>(undefined);
  const [aiRecommendation, setAiRecommendation] = useState<string | undefined>(undefined);
  const [sensorTrends, setSensorTrends] = useState<SensorReading[]>([]);

  // Track recent alerts to prevent spam (map of title -> last timestamp)
  const alertTrackingRef = useRef<Map<string, number>>(new Map());

  const [alerts, setAlerts] = useState<AlertType[]>([
    {
      id: "1",
      type: "info",
      title: "System Started",
      message: "CLIMANEER dashboard is now online and monitoring sensors",
      timestamp: new Date().toISOString(),
      read: false,
    },
    {
      id: "2",
      type: "success",
      title: "Soil Moisture Optimal",
      message: "Soil moisture levels are within optimal range (65%)",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      read: true,
    },
  ]);

  const [settings, setSettings] = useState<Omit<Settings, "id">>({
    soundAlerts: true,
    pushNotifications: true,
    moistureThreshold: 30,
    batteryThreshold: 20,
    temperatureUnit: "celsius",
    pollInterval: 5000,
    darkMode: false,
    controlMode: "automatic",
    scheduledSettings: {
      enabled: false,
      startTime: "08:00",
      endTime: "18:00",
      durationMinutes: 30,
    },
    // Additional thresholds for expanded alerts
    airQualityThreshold: 150,      // AQI > 150 is unhealthy
    temperatureHighThreshold: 35,  // °C - too hot
    temperatureLowThreshold: 5,    // °C - too cold
    humidityHighThreshold: 80,     // % - too humid
    humidityLowThreshold: 20,      // % - too dry
    waterLevelLowThreshold: 20,    // % - tank low
  });

  type HistoryEntry = { id: string; timestamp: string; sensors: SensorReading };

  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const [trendData] = useState<TrendData>({
    timestamps: ["12:00", "13:00", "14:00", "15:00", "16:00"],
    moisture: [60, 62, 65, 63, 65],
    humidity: [50, 52, 55, 54, 55],
    temperature: [22, 23, 24, 24, 24],
    ph: [6.5, 6.7, 6.8, 6.8, 6.8],
    waterLevel: [78, 77, 76, 75, 75],
    flow: [2.3, 2.5, 2.5, 2.4, 2.5],
  });

  // Simulate initial loading
  useEffect(() => {
    // Load sensor trends from localStorage if available
    try {
      const stored = localStorage.getItem("sensorTrends");
      if (stored) {
        setSensorTrends(JSON.parse(stored));
      }
    } catch (e) {
      // ignore localStorage errors
    }
    
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing data...",
        variant: "default",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline",
        description: "You're viewing cached data",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  // Pull-to-refresh simulation for mobile
  useEffect(() => {
    let touchStartY = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndY = e.changedTouches[0].clientY;
      const distance = touchEndY - touchStartY;
      
      // If swiped down at least 100px from top
      if (distance > 100 && window.scrollY === 0) {
        handleRefresh();
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const handleRefresh = async () => {
    toast({
      title: "Refreshing",
      description: "Updating sensor data...",
    });
    // Fetch latest data from Firebase
    try {
      await fetchFirebaseOnce();
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err.message ?? String(err), variant: "destructive" });
    }
    
    toast({
      title: "Updated",
      description: "All sensor data refreshed",
    });
  };

  // Map firebase keys (snake_case) to app SensorReading type (camelCase)
  function mapFirebaseSensors(sensors: any): SensorReading | undefined {
    if (!sensors) return undefined;

    const now = new Date().toISOString();
    return {
      id: sensors.id ?? "firebase-sensor",
      timestamp: sensors.timestamp ?? now,
      soilMoisture: Number(sensors.soil_moisture ?? sensors.soilMoisture ?? 0),
      airHumidity: Number(sensors.air_humidity ?? sensors.airHumidity ?? 0),
      waterLevel: Number(sensors.water_level ?? sensors.waterLevel ?? 0),
      pH: Number(sensors.ph ?? sensors.pH ?? 0),
      airTemperature: Number(sensors.air_temp ?? sensors.airTemperature ?? 0),
      waterTemperature: Number(sensors.water_temp ?? sensors.waterTemperature ?? 0),
      airQuality: Number(sensors.air_quality ?? sensors.airQuality ?? 0),
      flowRate: Number(sensors.flow ?? sensors.flowRate ?? 0),
      battery: Number(sensors.battery ?? 0),
    };
  }

  function mapFirebaseControls(controls: any): SystemStatus | undefined {
    if (!controls) return undefined;

    const pumpOn = controls.pump === true || controls.pump === "on" || controls.pump === 1;
    const mode = controls.mode?.toString().toLowerCase() ?? (controls.manual_override ? "manual" : "automatic");
    return {
      uptime: Number(controls.uptime ?? 0),
      pumpStatus: pumpOn ? "running" : "stopped",
      pumpRuntime: Number(controls.pump_runtime ?? controls.pumpRuntime ?? 0),
      controlMode: mode === "manual" ? "manual" : "automatic",
      networkSignal: controls.firebase_online ? "strong" : "weak",
      dataUsage: Number(controls.dataUsage ?? 0),
    };
  }

  async function fetchFirebaseOnce() {
    const url = `${FIREBASE_URL}/.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    const data = await res.json();

    // Data structure expected: { ai: {...}, controls: {...}, sensors: {...} }
    const firebaseSensors = mapFirebaseSensors(data?.sensors);
    const firebaseStatus = mapFirebaseControls(data?.controls);

    if (firebaseSensors) {
      setSensorData(firebaseSensors);
      // Store in trends (keep last 24h of data in localStorage)
      setSensorTrends((prev) => {
        const updated = [...prev, firebaseSensors];
        const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24h ago
        const filtered = updated.filter((s) => new Date(s.timestamp).getTime() > cutoffTime);
        // Store to localStorage for persistence
        try {
          localStorage.setItem("sensorTrends", JSON.stringify(filtered));
        } catch (e) {
          // localStorage might be full, just keep in memory
        }
        return filtered;
      });

      // Append to history (most recent first), cap at 1000 entries
      try {
        const newEntry: HistoryEntry = {
          id: firebaseSensors.id ?? String(Date.now()),
          timestamp: firebaseSensors.timestamp ?? new Date().toISOString(),
          sensors: firebaseSensors,
        };
        setHistory((prev) => {
          const next = [newEntry, ...prev];
          return next.slice(0, 1000);
        });
      } catch (e) {
        // ignore history append errors
      }

      // Basic alerting for unhealthy/unwanted readings
      try {
        const ALERT_COOLDOWN = 60 * 60 * 1000; // 1 hour between same alerts
        const now = Date.now();
        
        const maybeAddAlert = (type: AlertType['type'], title: string, message: string) => {
          // Check if this alert was recently triggered
          const lastAlertTime = alertTrackingRef.current.get(title) ?? 0;
          if (now - lastAlertTime < ALERT_COOLDOWN) {
            console.log(`[Alert Dedup] Skipping "${title}" (cooldown active)`);
            return; // Skip - alert recently triggered
          }
          
          // Update tracking and add alert
          alertTrackingRef.current.set(title, now);
          const alert: AlertType = {
            id: `${type}-${now}`,
            type,
            title,
            message,
            timestamp: new Date().toISOString(),
            read: false,
          };
          setAlerts((prev) => [alert, ...prev].slice(0, 200));
          console.log(`[Alert Added] ${title}: ${message}`);
        };

        // ===== SENSOR CHECKS =====
        
        // Low soil moisture
        const moistureThreshold = settings.moistureThreshold ?? 30;
        if (firebaseSensors.soilMoisture < moistureThreshold) {
          maybeAddAlert('warning', 'Low Soil Moisture', `Soil moisture is ${firebaseSensors.soilMoisture}%, below threshold ${moistureThreshold}%`);
        }

        // Low battery
        const batteryThreshold = settings.batteryThreshold ?? 20;
        if (typeof firebaseSensors.battery === 'number' && firebaseSensors.battery < batteryThreshold) {
          maybeAddAlert('warning', 'Low Battery', `Sensor battery is ${firebaseSensors.battery}%, below ${batteryThreshold}%`);
        }

        // pH out of expected range (6.0 - 8.0)
        if (typeof firebaseSensors.pH === 'number' && (firebaseSensors.pH < 6.0 || firebaseSensors.pH > 8.0)) {
          maybeAddAlert('warning', 'pH Out of Range', `pH level is ${firebaseSensors.pH.toFixed(1)} — expected between 6.0 and 8.0`);
        }

        // Air quality check
        const airQualityThreshold = (settings as any).airQualityThreshold ?? 150;
        if (typeof firebaseSensors.airQuality === 'number' && firebaseSensors.airQuality > airQualityThreshold) {
          const aqi = firebaseSensors.airQuality;
          const quality = aqi > 300 ? 'Hazardous' : aqi > 200 ? 'Very Unhealthy' : aqi > 150 ? 'Unhealthy' : 'Unknown';
          maybeAddAlert('danger', 'Poor Air Quality', `Air quality index is ${aqi} (${quality}) — threshold: ${airQualityThreshold}`);
        }

        // Temperature extremes
        const tempHigh = (settings as any).temperatureHighThreshold ?? 35;
        const tempLow = (settings as any).temperatureLowThreshold ?? 5;
        if (typeof firebaseSensors.airTemperature === 'number') {
          if (firebaseSensors.airTemperature > tempHigh) {
            maybeAddAlert('danger', 'High Temperature', `Air temperature is ${firebaseSensors.airTemperature}°C, exceeds max threshold ${tempHigh}°C`);
          } else if (firebaseSensors.airTemperature < tempLow) {
            maybeAddAlert('warning', 'Low Temperature', `Air temperature is ${firebaseSensors.airTemperature}°C, below min threshold ${tempLow}°C`);
          }
        }

        // Humidity extremes
        const humidityHigh = (settings as any).humidityHighThreshold ?? 80;
        const humidityLow = (settings as any).humidityLowThreshold ?? 20;
        if (typeof firebaseSensors.airHumidity === 'number') {
          if (firebaseSensors.airHumidity > humidityHigh) {
            maybeAddAlert('warning', 'High Humidity', `Air humidity is ${firebaseSensors.airHumidity}%, exceeds max threshold ${humidityHigh}%`);
          } else if (firebaseSensors.airHumidity < humidityLow) {
            maybeAddAlert('warning', 'Low Humidity', `Air humidity is ${firebaseSensors.airHumidity}%, below min threshold ${humidityLow}%`);
          }
        }

        // Water level low
        const waterLevelLow = (settings as any).waterLevelLowThreshold ?? 20;
        if (typeof firebaseSensors.waterLevel === 'number' && firebaseSensors.waterLevel < waterLevelLow) {
          maybeAddAlert('warning', 'Low Water Level', `Water level is ${firebaseSensors.waterLevel}%, below threshold ${waterLevelLow}%`);
        }
      } catch (e) {
        console.error("[Alert Generation Error]", e);
        // ignore alerting errors
      }
    }
    if (firebaseStatus) setSystemStatus(firebaseStatus);

    // Store AI recommendation separately (do NOT add to alerts)
    if (data?.ai?.recommendation) {
      setAiRecommendation(String(data.ai.recommendation));
    }

    return data;
  }

  // Polling effect: fetch on mount and at pollInterval
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        await fetchFirebaseOnce();
      } catch (err: any) {
        // ignore initial fetch errors but notify
        toast({ title: "Failed to load data", description: String(err), variant: "destructive" });
      }
    })();

    const id = setInterval(() => {
      if (!mounted) return;
      fetchFirebaseOnce().catch(() => {});
    }, settings.pollInterval ?? 5000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.pollInterval]);

  // Upload controls/settings back to Firebase (PUT to /controls.json)
  async function uploadControlsToFirebase(controls: Record<string, unknown>) {
    const url = `${FIREBASE_URL}/controls.json`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(controls),
    });
    if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
    return await res.json();
  }

  const handleSettingsSave = (newSettings: Omit<Settings, "id">) => {
    setSettings(newSettings);
    console.log("[Settings Save] New settings:", newSettings);
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated",
    });
    // Try to persist relevant settings into Firebase controls (non-destructive)
    (async () => {
      try {
        const mode = newSettings.controlMode ?? "automatic";
        const isManual = mode === "manual";
        const isScheduled = mode === "scheduled";
        
        console.log("[Firebase Sync] Mode:", mode, "isManual:", isManual, "isScheduled:", isScheduled);
        
        const controls: Record<string, unknown> = {
          pump: systemStatus?.pumpStatus === "running",
          manual_override: isManual,
          mode: isManual ? "manual" : (isScheduled ? "scheduled" : "FIREBASE"),
          last_settings_saved_at: new Date().toISOString(),
        };

        // If scheduled mode, always add schedule config (even if disabled)
        if (isScheduled && newSettings.scheduledSettings) {
          controls.scheduled_start_time = newSettings.scheduledSettings.startTime;
          controls.scheduled_end_time = newSettings.scheduledSettings.endTime;
          controls.scheduled_duration_minutes = newSettings.scheduledSettings.durationMinutes;
          controls.scheduled_enabled = newSettings.scheduledSettings.enabled;
          console.log("[Firebase Sync] Schedule config:", controls);
        }

        console.log("[Firebase Sync] Sending controls:", controls);
        await uploadControlsToFirebase(controls);
        console.log("[Firebase Sync] Success!");
        toast({ title: "Settings synced", description: "Settings uploaded to Firebase" });
      } catch (err: any) {
        console.error("[Firebase Sync] Error:", err);
        toast({ title: "Sync failed", description: String(err), variant: "destructive" });
      }
    })();
  };

  const handleAlertDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast({
      title: "Alert Dismissed",
      description: "Alert removed from list",
    });
  };

  const handleAlertMarkRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
  };

  const handleClearAllAlerts = () => {
    setAlerts([]);
    toast({
      title: "Alerts Cleared",
      description: "All alerts have been removed",
    });
  };

  const unreadAlertCount = alerts.filter(a => !a.read).length;
  
  // Determine active tab from location
  const activeTab = location === "/" ? "dashboard" : location.substring(1);
  
  // Navigate to tab
  const handleTabChange = (tab: string) => {
    setLocation(tab === "dashboard" ? "/" : `/${tab}`);
  };

  // Manual pump toggle: write a simple controls object to Firebase and update local status optimistically
  const togglePump = async (turnOn: boolean) => {
    // optimistic UI update
    setSystemStatus((prev) => prev ? { ...prev, pumpStatus: turnOn ? "running" : "stopped" } : prev);
    try {
      const controls = {
        pump: turnOn,
        manual_override: true,
        mode: "manual",
        last_manual_pump_change: new Date().toISOString(),
      } as Record<string, unknown>;

      await uploadControlsToFirebase(controls);
      toast({ title: `Pump ${turnOn ? "enabled" : "disabled"}`, description: "Control updated in Firebase" });
    } catch (err: any) {
      // revert optimistic update on failure
      setSystemStatus((prev) => prev ? { ...prev, pumpStatus: !turnOn ? "running" : "stopped" } : prev);
      toast({ title: "Failed to toggle pump", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  // Auto mode: switch to automatic control and clear manual override
  const switchToAutoMode = async () => {
    try {
      console.log("[Switch to Auto Mode] Starting...");
      const controls = {
        manual_override: false,
        mode: "FIREBASE",
        last_mode_change: new Date().toISOString(),
      } as Record<string, unknown>;

      console.log("[Switch to Auto Mode] Uploading controls:", controls);
      await uploadControlsToFirebase(controls);
      console.log("[Switch to Auto Mode] Firebase upload successful");
      
      // Update local settings to reflect auto mode
      setSettings((prev) => {
        console.log("[Switch to Auto Mode] Updating settings from:", prev.controlMode, "to: automatic");
        return { ...prev, controlMode: "automatic" };
      });
      
      console.log("[Switch to Auto Mode] Complete!");
      toast({ title: "Auto Mode Enabled", description: "System returned to automatic control" });
    } catch (err: any) {
      console.error("[Switch to Auto Mode] Error:", err);
      toast({ title: "Failed to switch to auto mode", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  const switchToManualMode = async () => {
    try {
      console.log("[Switch to Manual Mode] Starting...");
      const controls = {
        manual_override: true,
        mode: "MANUAL",
        last_mode_change: new Date().toISOString(),
      } as Record<string, unknown>;

      console.log("[Switch to Manual Mode] Uploading controls:", controls);
      await uploadControlsToFirebase(controls);
      console.log("[Switch to Manual Mode] Firebase upload successful");
      
      // Update local settings to reflect manual mode
      setSettings((prev) => {
        console.log("[Switch to Manual Mode] Updating settings from:", prev.controlMode, "to: manual");
        return { ...prev, controlMode: "manual" };
      });
      
      console.log("[Switch to Manual Mode] Complete!");
      toast({ title: "Manual Mode Enabled", description: "System switched to manual control" });
    } catch (err: any) {
      console.error("[Switch to Manual Mode] Error:", err);
      toast({ title: "Failed to switch to manual mode", description: String(err), variant: "destructive" });
      throw err;
    }
  };

  // Scheduled mode runner
  // This effect watches `settings.controlMode === 'scheduled'` and `settings.scheduledSettings`.
  // If the current time falls within the configured window and the schedule is enabled,
  // it will turn the pump on for `durationMinutes` and then turn it off and clear manual override.
  const scheduleTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // Helper: parse "HH:MM" into a Date for today
    const parseToday = (hhmm?: string) => {
      if (!hhmm) return null;
      const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
      const d = new Date();
      d.setHours(hh, mm, 0, 0);
      return d;
    };

    const isNowInWindow = (start?: string, end?: string) => {
      const now = new Date();
      const s = parseToday(start);
      const e = parseToday(end);
      if (!s || !e) return false;
      // If end is <= start, assume window spans midnight
      if (e.getTime() <= s.getTime()) {
        // now >= s OR now <= e (next day)
        return now.getTime() >= s.getTime() || now.getTime() <= e.getTime();
      }
      return now.getTime() >= s.getTime() && now.getTime() <= e.getTime();
    };

    // Clear any existing timer
    if (scheduleTimerRef.current) {
      window.clearTimeout(scheduleTimerRef.current);
      scheduleTimerRef.current = null;
    }

    const runScheduleCheck = async () => {
      try {
        const mode = settings.controlMode ?? "automatic";
        const sched = settings.scheduledSettings;
        if (mode !== "scheduled" || !sched?.enabled) return;

        const within = isNowInWindow(sched.startTime, sched.endTime);
        // If within window, and pump is not running, turn it on for durationMinutes
        if (within && systemStatus?.pumpStatus !== "running") {
          // Set pump ON for duration
          await togglePump(true);
          // Notify user that scheduled pump has started
          toast({
            title: "Scheduled Pump Started",
            description: `Pump running until ${sched.endTime} (duration: ${sched.durationMinutes} min)`,
          });
          // Schedule turn-off after durationMinutes
          const ms = (sched.durationMinutes ?? 0) * 60 * 1000;
          if (ms > 0) {
            scheduleTimerRef.current = window.setTimeout(async () => {
              try {
                await togglePump(false);
                toast({
                  title: "Scheduled Pump Stopped",
                  description: "Scheduled cycle completed. Pump turned off.",
                });
                // After scheduled cycle, clear manual override to return to automatic if desired
                const controls: Record<string, unknown> = { manual_override: false, mode: "FIREBASE" };
                await uploadControlsToFirebase(controls);
              } catch (e) {
                // ignore
              }
            }, ms) as unknown as number;
          }
        }
      } catch (e) {
        // ignore schedule errors
      }
    };

    // Check immediately and then every 30 seconds while scheduled mode is active
    runScheduleCheck();
    const intervalId = window.setInterval(() => runScheduleCheck(), 30 * 1000);

    return () => {
      window.clearInterval(intervalId);
      if (scheduleTimerRef.current) {
        window.clearTimeout(scheduleTimerRef.current);
        scheduleTimerRef.current = null;
      }
    };
  // only re-run when schedule settings or control mode changes or systemStatus reference updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.controlMode, settings.scheduledSettings, systemStatus?.pumpStatus]);

  // Voice Control Hook
  const { listening, startListening, stopListening, transcript } = useVoiceControl({
    onCommand: (command) => {
      console.log("[Voice] Processing command:", command);
    },
    getSensorValue: (key: string) => {
      if (!sensorData) return "not available";
      const mapping: Record<string, any> = {
        soilMoisture: `${sensorData.soilMoisture?.toFixed(0) || 0}%`,
        airHumidity: `${sensorData.airHumidity?.toFixed(0) || 0}%`,
        airTemperature: `${sensorData.airTemperature?.toFixed(1) || 0}°C`,
        phValue: `${sensorData.pH?.toFixed(1) || 0}`,
        waterLevel: `${sensorData.waterLevel?.toFixed(0) || 0}%`,
        airQuality: `${sensorData.airQuality?.toFixed(0) || 0} AQI`,
        batteryLevel: `${sensorData.battery?.toFixed(0) || 0}%`,
        flowRate: `${sensorData.flowRate?.toFixed(1) || 0} L/min`,
      };
      return mapping[key] || "not available";
    },
    onPumpToggle: async (on: boolean) => await togglePump(on),
    onAutoMode: async () => await switchToAutoMode(),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header 
          onSettingsClick={() => {}} 
          onRefresh={() => {}} 
          isOnline={isOnline}
        />
        <NavigationTabs 
          activeTab="dashboard" 
          onTabChange={() => {}} 
          alertCount={0}
        />
        <DashboardSkeleton />
      </div>
    );
  }

  const sensorForUI: SensorReading = sensorData ?? {
    id: "default",
    timestamp: new Date().toISOString(),
    soilMoisture: 0,
    airHumidity: 0,
    waterLevel: 0,
    pH: 7,
    airTemperature: 0,
    waterTemperature: 0,
    airQuality: 0,
    flowRate: 0,
    battery: 100,
  };

  const statusForUI: SystemStatus = systemStatus ?? {
    uptime: 0,
    pumpStatus: "stopped",
    pumpRuntime: 0,
    controlMode: "automatic",
    networkSignal: "weak",
    dataUsage: 0,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Offline Indicator */}
      {!isOnline && <OfflineIndicator />}

      {/* Header */}
      <Header 
        onSettingsClick={() => setSettingsOpen(true)}
        onRefresh={handleRefresh}
        isOnline={isOnline}
      />

      {/* Navigation */}
      <NavigationTabs 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        alertCount={unreadAlertCount}
      />

      {/* Main Content */}
      <main className="min-h-[calc(100vh-8rem)]">
        <Switch>
          <Route path="/">
            <Dashboard 
              sensorData={sensorForUI}
              systemStatus={statusForUI}
              aiRecommendation={aiRecommendation}
            />
          </Route>
          
          <Route path="/analytics">
            <Analytics 
              trendData={trendData}
              isLoading={false}
              sensorTrends={sensorTrends}
            />
          </Route>
          
          <Route path="/alerts">
            <Alerts 
              alerts={alerts}
              onDismiss={handleAlertDismiss}
              onMarkRead={handleAlertMarkRead}
              onClearAll={handleClearAllAlerts}
            />
          </Route>
          
          <Route path="/history">
            <History 
              history={history}
              onExport={() => setExportOpen(true)}
            />
          </Route>
        </Switch>
      </main>

      {/* Quick Actions - Only on Dashboard */}
      {location === "/" && (
        <QuickActions 
          onExport={() => setExportOpen(true)}
          onRefresh={handleRefresh}
          onSettings={() => setSettingsOpen(true)}
          pumpOn={statusForUI.pumpStatus === "running"}
          onTogglePump={async (turnOn: boolean) => await togglePump(turnOn)}
          onAutoMode={async () => await switchToAutoMode()}
          onManualMode={async () => await switchToManualMode()}
          currentMode={settings.controlMode as "automatic" | "manual" | "scheduled"}
        />
      )}

      {/* Voice Control Button */}
      <VoiceButton 
        listening={listening}
        onToggle={() => listening ? stopListening() : startListening()}
      />

      {/* Voice Status Indicator */}
      <VoiceStatusIndicator listening={listening} transcript={transcript} />

      {/* Modals */}
      <SettingsModal 
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={handleSettingsSave}
      />

      <ExportModal 
        open={exportOpen}
        onOpenChange={setExportOpen}
        history={history}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
