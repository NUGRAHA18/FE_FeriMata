import { z } from "zod";
import { apiRequest } from "./client";
import {
  actuatorCommandSchema,
  actuatorSchema,
  aiDetectionSchema,
  alertSchema,
  dashboardOverviewSchema,
  deviceSchema,
  deviceStatusSchema,
  loginResponseSchema,
  pageSchema,
  sensorReadingSchema,
  sensorSchema,
  userSchema,
  type AlertSeverity,
} from "./types";

/* Satu fungsi per endpoint di kontrak. Tidak ada endpoint lain yang boleh dipanggil. */

// Auth
export const login = (username: string, password: string) =>
  apiRequest("/auth/login", { method: "POST", body: { username, password }, schema: loginResponseSchema, auth: false });
export const getMe = (signal?: AbortSignal) => apiRequest("/auth/me", { schema: userSchema, signal });

// Dashboard
export const getOverview = (signal?: AbortSignal) => apiRequest("/dashboard/overview", { schema: dashboardOverviewSchema, signal });

// Perangkat
export const getDevices = (signal?: AbortSignal) => apiRequest("/devices", { schema: z.array(deviceSchema), signal });
export const getDevice = (id: number, signal?: AbortSignal) => apiRequest(`/devices/${id}`, { schema: deviceSchema, signal });
export const getDeviceStatus = (id: number, signal?: AbortSignal) =>
  apiRequest(`/devices/${id}/status`, { schema: deviceStatusSchema, signal });

// Sensor
export const getSensors = (deviceId?: number, signal?: AbortSignal) =>
  apiRequest("/sensors", { query: { deviceId }, schema: z.array(sensorSchema), signal });
export const getSensor = (id: number, signal?: AbortSignal) => apiRequest(`/sensors/${id}`, { schema: sensorSchema, signal });
export const getSensorLatest = (id: number, signal?: AbortSignal) =>
  apiRequest(`/sensors/${id}/latest`, { schema: sensorReadingSchema, signal });
export const getSensorHistory = (
  id: number,
  params: { from?: string; to?: string; page?: number; size?: number },
  signal?: AbortSignal,
) => apiRequest(`/sensors/${id}/history`, { query: params, schema: pageSchema(sensorReadingSchema), signal });

export type SensorPatch = Partial<{ name: string; type: string; unit: string; description: string; enabled: boolean; metadata: Record<string, unknown> }>;
export const patchSensor = (id: number, patch: SensorPatch) =>
  apiRequest(`/sensors/${id}`, { method: "PATCH", body: patch, schema: sensorSchema });

// Aktuator
export const getActuators = (deviceId?: number, signal?: AbortSignal) =>
  apiRequest("/actuators", { query: { deviceId }, schema: z.array(actuatorSchema), signal });
export const getActuator = (id: number, signal?: AbortSignal) => apiRequest(`/actuators/${id}`, { schema: actuatorSchema, signal });

export type ActuatorPatch = Partial<{ name: string; type: string; description: string; enabled: boolean; maxRunSeconds: number; metadata: Record<string, unknown> }>;
export const patchActuator = (id: number, patch: ActuatorPatch) =>
  apiRequest(`/actuators/${id}`, { method: "PATCH", body: patch, schema: actuatorSchema });

export type CommandRequest = { command: string; parameters?: Record<string, unknown> };
export const sendActuatorCommand = (id: number, req: CommandRequest) =>
  apiRequest(`/actuators/${id}/commands`, { method: "POST", body: req, schema: actuatorCommandSchema });
export const getActuatorCommands = (id: number, page: number, size = 20, signal?: AbortSignal) =>
  apiRequest(`/actuators/${id}/commands`, { query: { page, size }, schema: pageSchema(actuatorCommandSchema), signal });

// Alert
export type AlertFilters = { acknowledged?: boolean; severity?: AlertSeverity; page?: number; size?: number };
export const getAlerts = (f: AlertFilters, signal?: AbortSignal) =>
  apiRequest("/alerts", { query: { page: 0, size: 20, ...f }, schema: pageSchema(alertSchema), signal });
export const acknowledgeAlert = (id: number) => apiRequest(`/alerts/${id}/acknowledge`, { method: "PATCH", schema: alertSchema });

// AI — filter eksklusif: kirim paling banyak satu dari stationCode / deviceId / detectionType.
export type DetectionFilter =
  | { kind: "none" }
  | { kind: "station"; stationCode: string }
  | { kind: "device"; deviceId: number }
  | { kind: "type"; detectionType: string };

export function detectionQuery(f: DetectionFilter) {
  switch (f.kind) {
    case "station":
      return { stationCode: f.stationCode };
    case "device":
      return { deviceId: f.deviceId };
    case "type":
      return { detectionType: f.detectionType };
    default:
      return {};
  }
}

export const getDetections = (f: DetectionFilter, page = 0, size = 20, signal?: AbortSignal) =>
  apiRequest("/ai/detections", { query: { ...detectionQuery(f), page, size }, schema: pageSchema(aiDetectionSchema), signal });
export const getDetection = (id: number, signal?: AbortSignal) => apiRequest(`/ai/detections/${id}`, { schema: aiDetectionSchema, signal });

// Dev-only (hanya dipakai halaman Dev Tools saat system.mode === DEVELOPMENT)
export const devPost = (path: string, body: unknown) => apiRequest(`/dev${path}`, { method: "POST", body });
export const devOutbox = () => apiRequest("/dev/outbox");
