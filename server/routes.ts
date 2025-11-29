import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertSensorReadingSchema,
  insertAlertSchema,
  insertSettingsSchema,
  exportFormatSchema,
  type ExportFormat
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

// Helper to validate request body
function validateBody<T>(schema: z.Schema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const validationError = fromZodError(result.error);
    throw Object.assign(new Error(validationError.message), { status: 400 });
  }
  return result.data;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Sensor Reading endpoints
  app.post("/api/sensor-readings", async (req, res) => {
    try {
      const data = validateBody(insertSensorReadingSchema, req.body);
      const reading = await storage.createSensorReading(data);
      res.json(reading);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  app.get("/api/sensor-readings/latest", async (_req, res) => {
    try {
      const reading = await storage.getLatestSensorReading();
      if (!reading) {
        res.status(404).json({ message: "No sensor readings found" });
        return;
      }
      res.json(reading);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/sensor-readings/history", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const readings = await storage.getSensorReadingHistory(limit);
      res.json(readings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/sensor-readings/trends", async (req, res) => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const trends = await storage.getTrendData(hours);
      res.json(trends);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Alert endpoints
  app.get("/api/alerts", async (_req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const data = validateBody(insertAlertSchema, req.body);
      const alert = await storage.createAlert(data);
      res.json(alert);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const alert = await storage.markAlertAsRead(req.params.id);
      if (!alert) {
        res.status(404).json({ message: "Alert not found" });
        return;
      }
      res.json(alert);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteAlert(req.params.id);
      if (!deleted) {
        res.status(404).json({ message: "Alert not found" });
        return;
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const data = validateBody(insertSettingsSchema.partial(), req.body);
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  // Statistics endpoints
  app.get("/api/statistics", async (_req, res) => {
    try {
      const stats = await storage.getStatistics();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/system-status", async (_req, res) => {
    try {
      const status = await storage.getSystemStatus();
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export endpoint
  app.get("/api/export", async (req, res) => {
    try {
      // Handle query parameter (could be string or array)
      const formatParam = Array.isArray(req.query.format) 
        ? req.query.format[0] 
        : req.query.format;
      const format = validateBody(exportFormatSchema, formatParam || "json");
      const readings = await storage.getSensorReadingHistory(1000);

      if (format === "csv") {
        // Helper function to escape CSV values
        const escapeCsvValue = (value: any): string => {
          if (value === null || value === undefined) {
            return "";
          }
          const str = String(value);
          // If value contains comma, quote, or newline, wrap in quotes and escape quotes
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };

        // Generate CSV
        const headers = ["timestamp", "soilMoisture", "airHumidity", "waterLevel", "pH", "airTemperature", "waterTemperature", "airQuality", "flowRate", "battery"];
        const csv = [
          headers.join(","),
          ...readings.map(r => [
            escapeCsvValue(r.timestamp),
            escapeCsvValue(r.soilMoisture),
            escapeCsvValue(r.airHumidity),
            escapeCsvValue(r.waterLevel),
            escapeCsvValue(r.pH),
            escapeCsvValue(r.airTemperature),
            escapeCsvValue(r.waterTemperature),
            escapeCsvValue(r.airQuality),
            escapeCsvValue(r.flowRate),
            escapeCsvValue(r.battery)
          ].join(","))
        ].join("\n");

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="climaneer-export-${Date.now()}.csv"`);
        res.send(csv);
      } else {
        // Generate JSON
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="climaneer-export-${Date.now()}.json"`);
        res.json({ readings, exportedAt: new Date().toISOString() });
      }
    } catch (error: any) {
      res.status(error.status || 500).json({ message: error.message });
    }
  });

  // Simulation endpoint to generate random sensor data
  app.post("/api/simulate-reading", async (_req, res) => {
    try {
      // Generate random but realistic sensor data
      const reading = await storage.createSensorReading({
        timestamp: new Date().toISOString(),
        soilMoisture: Math.round(55 + Math.random() * 20), // 55-75%
        airHumidity: Math.round(45 + Math.random() * 20), // 45-65%
        waterLevel: Math.round(70 + Math.random() * 15), // 70-85%
        pH: Math.round((6.5 + Math.random() * 0.6) * 10) / 10, // 6.5-7.1
        airTemperature: Math.round((22 + Math.random() * 4) * 10) / 10, // 22-26°C
        waterTemperature: Math.round((18 + Math.random() * 4) * 10) / 10, // 18-22°C
        airQuality: Math.round(30 + Math.random() * 30), // 30-60 AQI
        flowRate: Math.round((2 + Math.random() * 1) * 10) / 10, // 2-3 L/min
        battery: Math.max(20, Math.round(80 + Math.random() * 15)), // 80-95%
      });

      res.json(reading);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
