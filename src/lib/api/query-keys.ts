import type { AlertFilters, DetectionFilter } from "./endpoints";
import type { ActuatorCommand, Alert } from "./types";

/* Kunci cache TanStack Query. lib/realtime/apply.ts menulis langsung ke sini, jadi bentuknya kontrak internal. */
export const qk = {
  me: ["me"] as const,
  users: ["users"] as const,
  overview: ["overview"] as const,
  /** Record<sensorId, SensorReading> — pembacaan terakhir, dinormalisasi per sensor. */
  readings: ["readings"] as const,
  /** Aktivitas yang tiba lewat WebSocket sejak overview terakhir diambil. */
  liveActivity: ["live-activity"] as const,

  devices: ["devices"] as const,
  device: (id: number) => ["devices", id] as const,
  deviceStatus: (id: number) => ["devices", id, "status"] as const,

  /** Daftar bawaan backend: hanya sensor aktif. */
  sensors: ["sensors"] as const,
  /** `?includeDisabled=true` — hanya untuk meninjau/mengaktifkan kembali (Pengaturan). */
  sensorsAll: ["sensors-all"] as const,
  sensor: (id: number) => ["sensors", id] as const,
  sensorLatest: (id: number) => ["sensors", id, "latest"] as const,
  sensorHistory: (id: number, range: string) => ["sensors", id, "history", range] as const,
  calibrationSamples: (id: number) => ["sensors", id, "calibration-samples"] as const,
  sensorCalibrations: (id: number) => ["sensors", id, "calibrations"] as const,
  driftChecksRoot: (id: number) => ["sensors", id, "drift-checks"] as const,
  driftChecks: (id: number, page: number) => ["sensors", id, "drift-checks", page] as const,

  actuators: ["actuators"] as const,
  actuatorsAll: ["actuators-all"] as const,
  actuator: (id: number) => ["actuators", id] as const,
  actuatorCommandsRoot: (id: number) => ["actuators", id, "commands"] as const,
  actuatorCommands: (id: number, page: number, size: number) => ["actuators", id, "commands", { page, size }] as const,
  pumpCalibrations: (id: number) => ["actuators", id, "calibrations"] as const,
  dispensed: (id: number, range: string) => ["actuators", id, "dispensed", range] as const,
  /** Perintah yang sedang dilacak berdasarkan commandUid. */
  command: (uid: string) => ["command", uid] as const,

  alertsRoot: ["alerts"] as const,
  alerts: (f: AlertFilters) => ["alerts", f] as const,

  cycleToday: ["cultivation", "today"] as const,
  plantsRoot: ["plants"] as const,
  plants: (f: Record<string, unknown>) => ["plants", f] as const,

  pushConfig: ["push", "config"] as const,
  irrigationSchedules: ["irrigation", "schedules"] as const,

  detectionsRoot: ["ai", "detections"] as const,
  detections: (f: DetectionFilter, page: number, size: number) => ["ai", "detections", f, { page, size }] as const,
  detection: (id: number) => ["ai", "detection", id] as const,
};

export type LiveActivity =
  | { key: string; kind: "ACTUATOR_COMMAND"; at: string; command: ActuatorCommand }
  | { key: string; kind: "ALERT"; at: string; alert: Alert };
