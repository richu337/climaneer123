import { 
  type User, 
  type InsertUser,
  type SensorReading,
  type InsertSensorReading,
  type Alert,
  type InsertAlert,
  type Settings,
  type Statistics,
  type TrendData,
  type SystemStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Sensor reading methods
  createSensorReading(reading: InsertSensorReading): Promise<SensorReading>;
  getLatestSensorReading(): Promise<SensorReading | undefined>;
  getSensorReadingHistory(limit?: number): Promise<SensorReading[]>;
  getTrendData(hours?: number): Promise<TrendData>;

  // Alert methods
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<Alert | undefined>;
  deleteAlert(id: string): Promise<boolean>;

  // Settings methods
  getSettings(): Promise<Omit<Settings, "id">>;
  updateSettings(settings: Partial<Omit<Settings, "id">>): Promise<Omit<Settings, "id">>;

  // Statistics methods
  getStatistics(): Promise<Statistics>;
  getSystemStatus(): Promise<SystemStatus>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sensorReadings: SensorReading[];
  private alerts: Map<string, Alert>;
  private settings: Omit<Settings, "id">;
  private maxReadingsHistory: number;

  constructor() {
    this.users = new Map();
    this.sensorReadings = [];
    this.alerts = new Map();
    this.maxReadingsHistory = 1000; // Keep last 1000 readings
    
    // Initialize with default settings
    this.settings = {
      soundAlerts: true,
      pushNotifications: true,
      moistureThreshold: 30,
      batteryThreshold: 20,
      temperatureUnit: "celsius",
      pollInterval: 5000,
      darkMode: false,
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Sensor reading methods
  async createSensorReading(reading: InsertSensorReading): Promise<SensorReading> {
    const id = randomUUID();
    const timestamp = reading.timestamp || new Date().toISOString();
    const sensorReading: SensorReading = { ...reading, id, timestamp };
    
    this.sensorReadings.push(sensorReading);
    
    // Keep only the last maxReadingsHistory readings
    if (this.sensorReadings.length > this.maxReadingsHistory) {
      this.sensorReadings = this.sensorReadings.slice(-this.maxReadingsHistory);
    }
    
    return sensorReading;
  }

  async getLatestSensorReading(): Promise<SensorReading | undefined> {
    if (this.sensorReadings.length === 0) return undefined;
    return this.sensorReadings[this.sensorReadings.length - 1];
  }

  async getSensorReadingHistory(limit: number = 100): Promise<SensorReading[]> {
    return this.sensorReadings.slice(-limit).reverse();
  }

  async getTrendData(hours: number = 24): Promise<TrendData> {
    const now = Date.now();
    const cutoffTime = now - (hours * 60 * 60 * 1000);
    
    const recentReadings = this.sensorReadings.filter(r => 
      new Date(r.timestamp).getTime() > cutoffTime
    );

    // If no readings, return empty arrays
    if (recentReadings.length === 0) {
      return {
        timestamps: [],
        moisture: [],
        humidity: [],
        temperature: [],
        ph: [],
        waterLevel: [],
        flow: [],
      };
    }

    return {
      timestamps: recentReadings.map(r => r.timestamp),
      moisture: recentReadings.map(r => r.soilMoisture),
      humidity: recentReadings.map(r => r.airHumidity),
      temperature: recentReadings.map(r => r.airTemperature),
      ph: recentReadings.map(r => r.pH),
      waterLevel: recentReadings.map(r => r.waterLevel),
      flow: recentReadings.map(r => r.flowRate),
    };
  }

  // Alert methods
  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const timestamp = insertAlert.timestamp || new Date().toISOString();
    const alert: Alert = { 
      ...insertAlert, 
      id,
      timestamp,
      read: insertAlert.read ?? false
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async markAlertAsRead(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updatedAlert: Alert = { ...alert, read: true };
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async deleteAlert(id: string): Promise<boolean> {
    return this.alerts.delete(id);
  }

  // Settings methods
  async getSettings(): Promise<Omit<Settings, "id">> {
    return { ...this.settings };
  }

  async updateSettings(updates: Partial<Omit<Settings, "id">>): Promise<Omit<Settings, "id">> {
    this.settings = { ...this.settings, ...updates };
    return { ...this.settings };
  }

  // Statistics methods
  async getStatistics(): Promise<Statistics> {
    if (this.sensorReadings.length === 0) {
      return {
        waterUsed: 0,
        pumpRuntime: 0,
        efficiency: 0,
        averageMoisture: 0,
        averageTemperature: 0,
      };
    }

    const recentReadings = this.sensorReadings.slice(-100);
    const avgMoisture = recentReadings.reduce((sum, r) => sum + r.soilMoisture, 0) / recentReadings.length;
    const avgTemp = recentReadings.reduce((sum, r) => sum + r.airTemperature, 0) / recentReadings.length;
    const totalFlow = recentReadings.reduce((sum, r) => sum + r.flowRate, 0);

    return {
      waterUsed: totalFlow,
      pumpRuntime: 125.5, // Mock data
      efficiency: Math.min(95, Math.round(avgMoisture * 1.2)),
      averageMoisture: Math.round(avgMoisture * 10) / 10,
      averageTemperature: Math.round(avgTemp * 10) / 10,
    };
  }

  async getSystemStatus(): Promise<SystemStatus> {
    return {
      uptime: 99.9,
      pumpStatus: "running",
      pumpRuntime: 125.5,
      controlMode: "automatic",
      networkSignal: "strong",
      dataUsage: 2.3,
    };
  }
}

export const storage = new MemStorage();
