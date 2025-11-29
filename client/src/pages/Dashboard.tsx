import { SensorCard } from "@/components/SensorCard";
import { StatusCard } from "@/components/StatusCard";
import { ProgressRing } from "@/components/ProgressRing";
import { WaterTankVisualization } from "@/components/WaterTankVisualization";
import { PHScaleVisualization } from "@/components/PHScaleVisualization";
import { TemperatureGauge } from "@/components/TemperatureGauge";
import { AQIBar } from "@/components/AQIBar";
import { WeatherCard } from "@/components/WeatherCard";
import { SensorReading, SystemStatus } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { 
  Droplets, 
  Cloud, 
  Thermometer, 
  Activity, 
  Wind,
  Gauge,
  Beaker,
  Waves,
  Cpu,
  Zap,
  Battery,
  Wifi,
  Lightbulb
} from "lucide-react";

interface DashboardProps {
  sensorData: SensorReading;
  systemStatus: SystemStatus;
  aiRecommendation?: string;
}

export function Dashboard({ sensorData, systemStatus, aiRecommendation }: DashboardProps) {
  const [waterUsedToday, setWaterUsedToday] = useState(0);
  const [previousFlowRate, setPreviousFlowRate] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());

  // Calculate water usage based on flow rate
  useEffect(() => {
    const now = Date.now();
    const timeDiffMinutes = (now - lastUpdateTime) / (1000 * 60); // Convert to minutes
    
    if (timeDiffMinutes > 0 && sensorData.flowRate > 0) {
      // Calculate liters used: flowRate (L/min) * time (min)
      const litersUsed = sensorData.flowRate * timeDiffMinutes;
      setWaterUsedToday((prev) => prev + litersUsed);
    }
    
    setPreviousFlowRate(sensorData.flowRate);
    setLastUpdateTime(now);
  }, [sensorData.flowRate]);
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* AI Recommendation Card */}
      {aiRecommendation && (
        <Card className="p-6 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-200 dark:border-emerald-800">
          <div className="flex gap-4">
            <Lightbulb className="h-6 w-6 text-emerald-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">AI Recommendation</h3>
              <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-1">{aiRecommendation}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Weather Section */}
      <section data-testid="weather-section">
        <WeatherCard />
      </section>

      {/* Status Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="status-overview">
        <StatusCard
          title="System Status"
          value="All Operational"
          subtitle={`Uptime: ${systemStatus.uptime.toFixed(1)}%`}
          icon={Cpu}
          status="active"
          testId="status-system"
        />
        
        <StatusCard
          title="Pump Status"
          value={systemStatus.pumpStatus === "running" ? "Running" : systemStatus.pumpStatus === "stopped" ? "Stopped" : "Error"}
          subtitle={`Runtime: ${Math.floor(systemStatus.pumpRuntime / 60)}h ${systemStatus.pumpRuntime % 60}m`}
          icon={Waves}
          status={systemStatus.pumpStatus === "running" ? "active" : systemStatus.pumpStatus === "error" ? "danger" : "inactive"}
          testId="status-pump"
        />
        
        <StatusCard
          title="Battery Level"
          value={`${sensorData.battery}%`}
          subtitle={`Est. ${Math.floor((sensorData.battery / 100) * 24)}h remaining`}
          icon={Battery}
          status={sensorData.battery > 50 ? "active" : sensorData.battery > 20 ? "warning" : "danger"}
          testId="status-battery"
        />
        
        <StatusCard
          title="Network"
          value={systemStatus.networkSignal.charAt(0).toUpperCase() + systemStatus.networkSignal.slice(1)}
          subtitle={`Data: ${systemStatus.dataUsage.toFixed(1)} MB`}
          icon={Wifi}
          status={systemStatus.networkSignal === "strong" ? "active" : systemStatus.networkSignal === "medium" ? "warning" : "danger"}
          testId="status-network"
        />
      </section>

      {/* Sensor Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="sensor-grid">
        <SensorCard
          title="Soil Moisture"
          value={sensorData.soilMoisture}
          unit="%"
          icon={Droplets}
          status={sensorData.soilMoisture > 60 ? "good" : sensorData.soilMoisture > 30 ? "warning" : "danger"}
          statusText={sensorData.soilMoisture > 60 ? "Optimal" : sensorData.soilMoisture > 30 ? "Low" : "Critical"}
          trend={sensorData.soilMoisture > 50 ? "up" : "down"}
          testId="sensor-soil-moisture"
          visualization={
            <ProgressRing 
              progress={sensorData.soilMoisture} 
              icon={Droplets}
              color={sensorData.soilMoisture > 60 ? "hsl(var(--chart-1))" : sensorData.soilMoisture > 30 ? "hsl(var(--chart-4))" : "hsl(var(--destructive))"}
            />
          }
        />

        <SensorCard
          title="Air Humidity"
          value={sensorData.airHumidity}
          unit="%"
          icon={Cloud}
          status={sensorData.airHumidity > 40 && sensorData.airHumidity < 70 ? "good" : "warning"}
          statusText={sensorData.airHumidity > 40 && sensorData.airHumidity < 70 ? "Optimal" : "Monitor"}
          trend="stable"
          testId="sensor-air-humidity"
          visualization={
            <ProgressRing 
              progress={sensorData.airHumidity} 
              icon={Cloud}
              color="hsl(var(--chart-2))"
            />
          }
        />

        <SensorCard
          title="Water Level"
          value={sensorData.waterLevel}
          unit="%"
          icon={Waves}
          status={sensorData.waterLevel > 50 ? "good" : sensorData.waterLevel > 25 ? "warning" : "danger"}
          statusText={sensorData.waterLevel > 50 ? "Sufficient" : sensorData.waterLevel > 25 ? "Low" : "Critical"}
          trend={sensorData.waterLevel > 50 ? "stable" : "down"}
          testId="sensor-water-level"
          visualization={<WaterTankVisualization level={sensorData.waterLevel} />}
        />

        <SensorCard
          title="pH Level"
          value={sensorData.pH.toFixed(1)}
          icon={Beaker}
          status={sensorData.pH >= 6 && sensorData.pH <= 7.5 ? "good" : "warning"}
          statusText={sensorData.pH >= 6 && sensorData.pH <= 7.5 ? "Optimal" : "Adjust"}
          trend={sensorData.pH > 7 ? "up" : "down"}
          testId="sensor-ph"
          visualization={<PHScaleVisualization value={sensorData.pH} />}
        />

        <SensorCard
          title="Air Temperature"
          value={sensorData.airTemperature}
          unit="°C"
          icon={Thermometer}
          status={sensorData.airTemperature > 15 && sensorData.airTemperature < 30 ? "good" : "warning"}
          statusText="Current conditions"
          trend={sensorData.airTemperature > 25 ? "up" : "stable"}
          testId="sensor-air-temp"
          visualization={<TemperatureGauge temperature={sensorData.airTemperature} />}
        />

        <SensorCard
          title="Water Temperature"
          value={sensorData.waterTemperature}
          unit="°C"
          icon={Thermometer}
          status={sensorData.waterTemperature > 15 && sensorData.waterTemperature < 25 ? "good" : "warning"}
          statusText={sensorData.waterTemperature > 15 && sensorData.waterTemperature < 25 ? "Optimal" : "Monitor"}
          trend="stable"
          testId="sensor-water-temp"
        />

        <SensorCard
          title="Air Quality"
          value={sensorData.airQuality}
          unit="AQI"
          icon={Wind}
          status={sensorData.airQuality < 50 ? "good" : sensorData.airQuality < 100 ? "warning" : "danger"}
          statusText={sensorData.airQuality < 50 ? "Good" : sensorData.airQuality < 100 ? "Moderate" : "Poor"}
          trend={sensorData.airQuality < 50 ? "down" : "up"}
          testId="sensor-air-quality"
          visualization={<AQIBar aqi={sensorData.airQuality} />}
        />

        <SensorCard
          title="Water Flow"
          value={sensorData.flowRate.toFixed(1)}
          unit="L/min"
          icon={Gauge}
          status={sensorData.flowRate > 0 ? "good" : "info"}
          statusText={sensorData.flowRate > 0 ? "Active" : "Idle"}
          trend={sensorData.flowRate > 2 ? "up" : "stable"}
          testId="sensor-flow-rate"
        />
      </section>

      {/* Statistics Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="statistics-section">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Droplets className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Water Usage</p>
              <p className="text-2xl font-bold">{waterUsedToday.toFixed(1)} L</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Current flow: {sensorData.flowRate.toFixed(1)} L/min
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Activity className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">System Efficiency</p>
              <p className="text-2xl font-bold">95%</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Performance: Excellent
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Control Mode</p>
              <p className="text-2xl font-bold">{systemStatus.controlMode === "automatic" ? "Auto" : "Manual"}</p>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Operating mode
          </div>
        </div>
      </section>
    </div>
  );
}
