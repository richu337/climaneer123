import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Settings as SettingsType } from "@shared/schema";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Omit<SettingsType, "id">;
  onSave: (settings: Omit<SettingsType, "id">) => void;
}

export function SettingsModal({ open, onOpenChange, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<Omit<SettingsType, "id">>(() => {
    // Ensure scheduledSettings is always initialized with defaults
    if (!settings.scheduledSettings) {
      return {
        ...settings,
        scheduledSettings: {
          enabled: false,
          startTime: "08:00",
          endTime: "18:00",
          durationMinutes: 30,
        },
      };
    }
    return settings;
  });

  const handleSave = () => {
    onSave(localSettings);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original settings but preserve scheduledSettings defaults
    const resetSettings = {
      ...settings,
      scheduledSettings: settings.scheduledSettings || {
        enabled: false,
        startTime: "08:00",
        endTime: "18:00",
        durationMinutes: 30,
      },
    };
    setLocalSettings(resetSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl">Settings</DialogTitle>
          <DialogDescription>
            Configure your CLIMANEER dashboard preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notifications Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notifications</h3>
            <Separator />
            
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="sound-alerts" className="text-base">Sound Alerts</Label>
                <p className="text-sm text-muted-foreground">Play sound for critical alerts</p>
              </div>
              <Switch
                id="sound-alerts"
                checked={localSettings.soundAlerts}
                onCheckedChange={(checked) => 
                  setLocalSettings({ ...localSettings, soundAlerts: checked })
                }
                data-testid="switch-sound-alerts"
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications" className="text-base">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Enable browser notifications</p>
              </div>
              <Switch
                id="push-notifications"
                checked={localSettings.pushNotifications}
                onCheckedChange={(checked) => 
                  setLocalSettings({ ...localSettings, pushNotifications: checked })
                }
                data-testid="switch-push-notifications"
              />
            </div>
          </div>

          {/* Thresholds Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Thresholds</h3>
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="moisture-threshold">Low Soil Moisture (%)</Label>
              <Input
                id="moisture-threshold"
                type="number"
                min="0"
                max="100"
                value={localSettings.moistureThreshold}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, moistureThreshold: Number(e.target.value) })
                }
                data-testid="input-moisture-threshold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="battery-threshold">Critical Battery Level (%)</Label>
              <Input
                id="battery-threshold"
                type="number"
                min="0"
                max="100"
                value={localSettings.batteryThreshold}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, batteryThreshold: Number(e.target.value) })
                }
                data-testid="input-battery-threshold"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="air-quality-threshold">Air Quality Index Threshold</Label>
              <Input
                id="air-quality-threshold"
                type="number"
                min="0"
                max="500"
                value={(localSettings as any).airQualityThreshold ?? 150}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, airQualityThreshold: Number(e.target.value) } as any)
                }
                data-testid="input-air-quality-threshold"
              />
              <p className="text-xs text-muted-foreground">Alert when AQI exceeds this value (default: 150)</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temp-high">Max Temperature (°C)</Label>
                <Input
                  id="temp-high"
                  type="number"
                  min="-50"
                  max="60"
                  value={(localSettings as any).temperatureHighThreshold ?? 35}
                  onChange={(e) => 
                    setLocalSettings({ ...localSettings, temperatureHighThreshold: Number(e.target.value) } as any)
                  }
                  data-testid="input-temp-high"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temp-low">Min Temperature (°C)</Label>
                <Input
                  id="temp-low"
                  type="number"
                  min="-50"
                  max="60"
                  value={(localSettings as any).temperatureLowThreshold ?? 5}
                  onChange={(e) => 
                    setLocalSettings({ ...localSettings, temperatureLowThreshold: Number(e.target.value) } as any)
                  }
                  data-testid="input-temp-low"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="humidity-high">Max Humidity (%)</Label>
                <Input
                  id="humidity-high"
                  type="number"
                  min="0"
                  max="100"
                  value={(localSettings as any).humidityHighThreshold ?? 80}
                  onChange={(e) => 
                    setLocalSettings({ ...localSettings, humidityHighThreshold: Number(e.target.value) } as any)
                  }
                  data-testid="input-humidity-high"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="humidity-low">Min Humidity (%)</Label>
                <Input
                  id="humidity-low"
                  type="number"
                  min="0"
                  max="100"
                  value={(localSettings as any).humidityLowThreshold ?? 20}
                  onChange={(e) => 
                    setLocalSettings({ ...localSettings, humidityLowThreshold: Number(e.target.value) } as any)
                  }
                  data-testid="input-humidity-low"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="water-level-low">Low Water Level (%)</Label>
              <Input
                id="water-level-low"
                type="number"
                min="0"
                max="100"
                value={(localSettings as any).waterLevelLowThreshold ?? 20}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, waterLevelLowThreshold: Number(e.target.value) } as any)
                }
                data-testid="input-water-level-low"
              />
            </div>
          </div>

          {/* Control Mode Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Control Mode</h3>
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="control-mode">Pump Control Mode</Label>
              <select
                id="control-mode"
                value={localSettings.controlMode ?? "automatic"}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, controlMode: e.target.value as "automatic" | "manual" | "scheduled" })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="select-control-mode"
              >
                <option value="automatic">Automatic (Firebase-controlled)</option>
                <option value="manual">Manual (On/Off)</option>
                <option value="scheduled">Scheduled (Time-based)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {localSettings.controlMode === "automatic" ? "Firebase controls pump automatically" : 
                 localSettings.controlMode === "manual" ? "You control pump manually" :
                 "Pump runs on schedule"}
              </p>
            </div>

            {/* Scheduled Mode Settings */}
            {localSettings.controlMode === "scheduled" && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="scheduled-enabled" className="text-sm">Enable Schedule</Label>
                    <p className="text-xs text-muted-foreground">Turn on to activate scheduled pump</p>
                  </div>
                  <Switch
                    id="scheduled-enabled"
                    checked={localSettings.scheduledSettings?.enabled ?? false}
                    onCheckedChange={(checked) => {
                      const prev = localSettings.scheduledSettings ?? { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 };
                      setLocalSettings({
                        ...localSettings,
                        scheduledSettings: { ...prev, enabled: checked },
                      });
                    }}
                    data-testid="switch-scheduled-enabled"
                  />
                </div>

                {localSettings.scheduledSettings?.enabled && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-start-time" className="text-sm">Start Time (HH:MM)</Label>
                      <Input
                        id="scheduled-start-time"
                        type="time"
                        value={localSettings.scheduledSettings?.startTime ?? "08:00"}
                        onChange={(e) => {
                          const prev = localSettings.scheduledSettings ?? { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 };
                          setLocalSettings({
                            ...localSettings,
                            scheduledSettings: { ...prev, startTime: e.target.value },
                          });
                        }}
                        data-testid="input-scheduled-start-time"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled-end-time" className="text-sm">End Time (HH:MM)</Label>
                      <Input
                        id="scheduled-end-time"
                        type="time"
                        value={localSettings.scheduledSettings?.endTime ?? "18:00"}
                        onChange={(e) => {
                          const prev = localSettings.scheduledSettings ?? { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 };
                          setLocalSettings({
                            ...localSettings,
                            scheduledSettings: { ...prev, endTime: e.target.value },
                          });
                        }}
                        data-testid="input-scheduled-end-time"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="scheduled-duration" className="text-sm">Pump Duration (minutes)</Label>
                      <Input
                        id="scheduled-duration"
                        type="number"
                        min="1"
                        max="120"
                        value={localSettings.scheduledSettings?.durationMinutes ?? 30}
                        onChange={(e) => {
                          const prev = localSettings.scheduledSettings ?? { enabled: false, startTime: "08:00", endTime: "18:00", durationMinutes: 30 };
                          setLocalSettings({
                            ...localSettings,
                            scheduledSettings: { ...prev, durationMinutes: Number(e.target.value) },
                          });
                        }}
                        data-testid="input-scheduled-duration"
                      />
                      <p className="text-xs text-muted-foreground">Pump will turn on for this duration within the time window</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Preferences Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Preferences</h3>
            <Separator />
            
            <div className="space-y-2">
              <Label htmlFor="temperature-unit">Temperature Unit</Label>
              <select
                id="temperature-unit"
                value={localSettings.temperatureUnit}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, temperatureUnit: e.target.value as "celsius" | "fahrenheit" })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="select-temperature-unit"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="poll-interval">Data Refresh Interval (seconds)</Label>
              <Input
                id="poll-interval"
                type="number"
                min="1"
                max="60"
                value={localSettings.pollInterval / 1000}
                onChange={(e) => 
                  setLocalSettings({ ...localSettings, pollInterval: Number(e.target.value) * 1000 })
                }
                data-testid="input-poll-interval"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button onClick={handleSave} data-testid="button-save-settings">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
