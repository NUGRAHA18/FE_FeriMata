import type { AlertFilters, DetectionFilter } from "./endpoints";
import type { ActuatorCommand, Alert } from "./types";

/*
 * Kunci cache TanStack Query. Event realtime menulis langsung ke kunci-kunci ini
 * (lib/realtime/apply.ts), jadi bentuknya adalah bagian dari kontrak internal.
 */
export const qk = {
  me: ["me"] as const,
  overview: ["overview"] as const,
  /** Record<sensorId, SensorReading> — pembacaan terakhir, dinormalisasi per sensor. */
  readings: ["readings"] as const,
  /** Aktivitas yang tiba lewat WebSocket sejak overview terakhir diambil. */
  liveActivity: ["live-activity"] as const,

  devices: ["devices"] as const,
  device: (id: number) => ["devices", id] as const,
  deviceStatus: (id: number) => ["devices", id, "status"] as const,

  sensors: ["sensors"] as const,
  sensor: (id: number) => ["sensors", id] as const,
  sensorLatest: (id: number) => ["sensors", id, "latest"] as const,
  sensorHistory: (id: number, range: string) => ["sensors", id, "history", range] as const,

  actuators: ["actuators"] as const,
  actuator: (id: number) => ["actuators", id] as const,
  actuatorCommandsRoot: (id: number) => ["actuators", id, "commands"] as const,
  actuatorCommands: (id: number, page: number, size: number) => ["actuators", id, "commands", { page, size }] as const,
  /** Perintah yang sedang dilacak berdasarkan commandUid. */
  command: (uid: string) => ["command", uid] as const,

  alertsRoot: ["alerts"] as const,
  alerts: (f: AlertFilters) => ["alerts", f] as const,

  detectionsRoot: ["ai", "detections"] as const,
  detections: (f: DetectionFilter, page: number, size: number) => ["ai", "detections", f, { page, size }] as const,
  detection: (id: number) => ["ai", "detection", id] as const,
};

export type LiveActivity =
  | { key: string; kind: "ACTUATOR_COMMAND"; at: string; command: ActuatorCommand }
  | { key: string; kind: "ALERT"; at: string; alert: Alert };
