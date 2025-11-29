import { pgTable, varchar, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User Schema (for future auth if needed)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sensor Reading Table
export const sensorReadings = pgTable("sensor_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
  soilMoisture: real("soil_moisture").notNull(),
  airHumidity: real("air_humidity").notNull(),
  waterLevel: real("water_level").notNull(),
  pH: real("ph").notNull(),
  airTemperature: real("air_temperature").notNull(),
  waterTemperature: real("water_temperature").notNull(),
  airQuality: integer("air_quality").notNull(),
  flowRate: real("flow_rate").notNull(),
  battery: real("battery").notNull(),
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadings, {
  soilMoisture: z.number().min(0).max(100),
  airHumidity: z.number().min(0).max(100),
  waterLevel: z.number().min(0).max(100),
  pH: z.number().min(0).max(14),
  battery: z.number().min(0).max(100),
  airQuality: z.number().min(0),
  flowRate: z.number().min(0),
}).omit({ id: true });

export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;

// System Status (runtime data - not persisted to DB)
export const systemStatusSchema = z.object({
  uptime: z.number(),
  pumpStatus: z.enum(["running", "stopped", "error"]),
  pumpRuntime: z.number(),
  controlMode: z.enum(["automatic", "manual"]),
  networkSignal: z.enum(["strong", "medium", "weak"]),
  dataUsage: z.number(),
});

export type SystemStatus = z.infer<typeof systemStatusSchema>;

// Alerts Table
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type", { enum: ["info", "warning", "danger", "success"] }).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  timestamp: timestamp("timestamp", { mode: "string" }).notNull(),
  read: boolean("read").notNull().default(false),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Settings Table
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  soundAlerts: boolean("sound_alerts").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  moistureThreshold: real("moisture_threshold").notNull().default(30),
  batteryThreshold: real("battery_threshold").notNull().default(20),
  temperatureUnit: varchar("temperature_unit", { enum: ["celsius", "fahrenheit"] }).notNull().default("celsius"),
  pollInterval: integer("poll_interval").notNull().default(5000),
  darkMode: boolean("dark_mode").notNull().default(false),
});

export const insertSettingsSchema = createInsertSchema(settings, {
  moistureThreshold: z.number().min(0).max(100),
  batteryThreshold: z.number().min(0).max(100),
  pollInterval: z.number().min(1000).max(60000),
}).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect & {
  controlMode?: "automatic" | "manual" | "scheduled";
  scheduledSettings?: {
    enabled: boolean;
    startTime: string; // "HH:MM" format
    endTime: string;   // "HH:MM" format
    durationMinutes: number;
  };
  // Additional sensor thresholds for alerts
  airQualityThreshold?: number;      // AQI > 150 is unhealthy
  temperatureHighThreshold?: number; // °C - too hot
  temperatureLowThreshold?: number;  // °C - too cold
  humidityHighThreshold?: number;    // % - too humid
  humidityLowThreshold?: number;     // % - too dry
  waterLevelLowThreshold?: number;   // % - tank low
};

// Export Data Schema
export const exportFormatSchema = z.enum(["csv", "json"]);
export type ExportFormat = z.infer<typeof exportFormatSchema>;

// Statistics Schema
export const statisticsSchema = z.object({
  waterUsed: z.number(),
  pumpRuntime: z.number(),
  efficiency: z.number(),
  averageMoisture: z.number(),
  averageTemperature: z.number(),
});

export type Statistics = z.infer<typeof statisticsSchema>;

// Trend data for charts
export const trendDataSchema = z.object({
  timestamps: z.array(z.string()),
  moisture: z.array(z.number()),
  humidity: z.array(z.number()),
  temperature: z.array(z.number()),
  ph: z.array(z.number()),
  waterLevel: z.array(z.number()),
  flow: z.array(z.number()),
});

export type TrendData = z.infer<typeof trendDataSchema>;
