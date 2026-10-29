import { z } from "zod";

/*
 * Kontrak API backend FertiMata. Semua respons divalidasi di batas jaringan.
 * Konvensi: Instant = string ISO-8601 UTC; BigDecimal = number; field boleh null.
 * Enum yang di backend bertipe String (mode, kind) sengaja dibiarkan string agar nilai baru
 * tidak membuat seluruh respons ditolak.
 */

const instant = z.string();
const json = z.record(z.string(), z.unknown());

// ── Auth ──────────────────────────────────────────────────────────────────────
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  fullName: z.string().nullable(),
  role: z.string(),
  enabled: z.boolean(),
  mustChangePassword: z.boolean().optional().default(false),
  createdAt: instant.nullable().optional(),
  updatedAt: instant.nullable().optional(),
});
export type User = z.infer<typeof userSchema>;

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.string(),
  expiresIn: z.number(),
  expiresAt: instant,
  refreshToken: z.string(),
  refreshExpiresAt: instant,
  user: userSchema,
});
export type LoginResponse = z.infer<typeof loginResponseSchema>;

// ── Perangkat ─────────────────────────────────────────────────────────────────
export const deviceLivenessSchema = z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]);
export type DeviceLiveness = z.infer<typeof deviceLivenessSchema>;

export const deviceSchema = z.object({
  id: z.number(),
  deviceCode: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  status: deviceLivenessSchema,
  lastSeenAt: instant.nullable(),
  powerSource: z.string().nullable(),
  powerSourceUpdatedAt: instant.nullable(),
  description: z.string().nullable(),
  createdAt: instant,
  updatedAt: instant,
});
export type Device = z.infer<typeof deviceSchema>;

export const deviceStatusSchema = z.object({
  id: z.number(),
  deviceCode: z.string(),
  status: deviceLivenessSchema,
  lastSeenAt: instant.nullable(),
  secondsSinceLastSeen: z.number().nullable(),
  offlineTimeoutSeconds: z.number(),
  powerSource: z.string().nullable(),
  powerSourceUpdatedAt: instant.nullable(),
  onBackupPower: z.boolean(),
});
export type DeviceStatus = z.infer<typeof deviceStatusSchema>;

// ── Sensor ────────────────────────────────────────────────────────────────────
export const sensorSchema = z.object({
  id: z.number(),
  deviceId: z.number(),
  deviceCode: z.string(),
  code: z.string(),
  metricKey: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  unit: z.string().nullable(),
  enabled: z.boolean(),
  autoRegistered: z.boolean(),
  description: z.string().nullable(),
  metadata: json.nullable(),
  createdAt: instant,
  updatedAt: instant,
});
export type Sensor = z.infer<typeof sensorSchema>;

export const sensorReadingSchema = z.object({
  id: z.number(),
  sensorId: z.number(),
  sensorCode: z.string(),
  metricKey: z.string(),
  deviceId: z.number(),
  deviceCode: z.string(),
  value: z.number().nullable(),
  // Nilai setelah koreksi kalibrasi yang berlaku saat recordedAt; null = belum dikalibrasi (atau
  // kovariat tidak ada). Opsional supaya backend lama tetap terbaca.
  calibratedValue: z.number().nullable().optional(),
  textValue: z.string().nullable(),
  unit: z.string().nullable(),
  recordedAt: instant,
  receivedAt: instant,
});
export type SensorReading = z.infer<typeof sensorReadingSchema>;

export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({
    content: z.array(item),
    page: z.number(),
    size: z.number(),
    totalElements: z.number(),
    totalPages: z.number(),
    last: z.boolean(),
  });
}
export type Page<T> = { content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean };

/** GET /sensors/{id}/history/aggregate. Nilai mentah (tanpa kalibrasi); ember kosong tidak dikirim. */
export const sensorHistorySeriesSchema = z.object({
  sensorId: z.number(),
  sensorCode: z.string(),
  metricKey: z.string(),
  unit: z.string().nullable(),
  interval: z.string(),
  intervalSeconds: z.number(),
  from: instant,
  to: instant,
  points: z.array(
    z.object({
      bucketStart: instant,
      count: z.number(),
      min: z.number().nullable(),
      avg: z.number().nullable(),
      max: z.number().nullable(),
    }),
  ),
});
export type SensorHistorySeries = z.infer<typeof sensorHistorySeriesSchema>;

// ── Kalibrasi (Protokol-Data §7, §8) ─────────────────────────────────────────
const numberMap = z.record(z.string(), z.unknown()).nullable();

export const calibrationSampleSchema = z.object({
  id: z.number(),
  sensorId: z.number(),
  sensorCode: z.string(),
  sampledAt: instant,
  sensorValue: z.number().nullable(),
  labValue: z.number(),
  labMethod: z.string().nullable(),
  covariates: numberMap,
  sampleCode: z.string().nullable(),
  notes: z.string().nullable(),
  recordedBy: z.string().nullable(),
  createdAt: instant,
});
export type CalibrationSample = z.infer<typeof calibrationSampleSchema>;

export const sensorCalibrationSchema = z.object({
  /** Null untuk pratinjau hitungan yang belum disimpan. */
  id: z.number().nullable(),
  sensorId: z.number(),
  sensorCode: z.string(),
  metricKey: z.string(),
  method: z.string(),
  intercept: z.number(),
  slope: z.number(),
  covariates: numberMap,
  validFrom: instant.nullable(),
  sampleCount: z.number().nullable(),
  rSquared: z.number().nullable(),
  rmse: z.number().nullable(),
  mae: z.number().nullable(),
  bias: z.number().nullable(),
  loaLower: z.number().nullable(),
  loaUpper: z.number().nullable(),
  notes: z.string().nullable(),
  createdBy: z.string().nullable(),
  current: z.boolean(),
  createdAt: instant.nullable(),
});
export type SensorCalibration = z.infer<typeof sensorCalibrationSchema>;

export const driftCheckSchema = z.object({
  id: z.number(),
  sensorId: z.number(),
  sensorCode: z.string(),
  checkedAt: instant,
  standardName: z.string(),
  referenceValue: z.number(),
  measuredValue: z.number().nullable(),
  deviation: z.number().nullable(),
  deviationPercent: z.number().nullable(),
  probeCleaned: z.boolean(),
  notes: z.string().nullable(),
  performedBy: z.string().nullable(),
  createdAt: instant,
});
export type DriftCheck = z.infer<typeof driftCheckSchema>;

export const pumpCalibrationSchema = z.object({
  id: z.number(),
  actuatorId: z.number(),
  actuatorCode: z.string(),
  calibratedAt: instant,
  flowMlPerSecond: z.number(),
  trialCount: z.number(),
  trials: z.array(z.object({ durationSeconds: z.number(), volumeMl: z.number() })).nullable(),
  flowCvPercent: z.number().nullable(),
  busVoltage: z.number().nullable(),
  notes: z.string().nullable(),
  performedBy: z.string().nullable(),
  current: z.boolean(),
  createdAt: instant,
});
export type PumpCalibration = z.infer<typeof pumpCalibrationSchema>;

export const dispensedVolumeSchema = z.object({
  actuatorId: z.number(),
  actuatorCode: z.string(),
  actuatorName: z.string().nullable(),
  from: instant,
  to: instant,
  runCount: z.number(),
  totalSeconds: z.number().nullable(),
  /** Null bila tidak ada jalannya pompa yang sudah dikalibrasi. */
  volumeMl: z.number().nullable(),
  uncalibratedRunCount: z.number(),
  unknownDurationRunCount: z.number(),
  currentFlowMlPerSecond: z.number().nullable(),
  currentCalibratedAt: instant.nullable(),
});
export type DispensedVolume = z.infer<typeof dispensedVolumeSchema>;

// ── Aktuator ──────────────────────────────────────────────────────────────────
export const actuatorSchema = z.object({
  id: z.number(),
  deviceId: z.number(),
  deviceCode: z.string(),
  code: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  enabled: z.boolean(),
  currentState: z.string().nullable(),
  stateUpdatedAt: instant.nullable(),
  maxRunSeconds: z.number().nullable(),
  // Perintah yang diterima tipe ini (BE-1), mis. ["START", "STOP"] untuk patroli. Null = bebas.
  // Opsional supaya backend lama tetap terbaca.
  supportedCommands: z.array(z.string()).nullable().optional(),
  description: z.string().nullable(),
  metadata: json.nullable(),
  createdAt: instant,
  updatedAt: instant,
});
export type Actuator = z.infer<typeof actuatorSchema>;

export const actuatorStatusSchema = z.object({
  id: z.number(),
  code: z.string(),
  enabled: z.boolean(),
  currentState: z.string().nullable(),
  stateUpdatedAt: instant.nullable(),
  deviceCode: z.string(),
});
export type ActuatorStatus = z.infer<typeof actuatorStatusSchema>;

export const commandStatusSchema = z.enum(["PENDING", "SENT", "EXECUTED", "FAILED", "CANCELLED"]);
export type CommandStatus = z.infer<typeof commandStatusSchema>;

export const actuatorCommandSchema = z.object({
  id: z.number(),
  commandUid: z.string(),
  actuatorId: z.number(),
  actuatorCode: z.string(),
  deviceId: z.number(),
  deviceCode: z.string(),
  commandType: z.string(),
  parameters: json.nullable(),
  source: z.string(),
  requestedBy: z.string().nullable(),
  status: commandStatusSchema,
  requestedAt: instant,
  sentAt: instant.nullable(),
  executedAt: instant.nullable(),
  errorMessage: z.string().nullable(),
  // Kode alasan dari ACK gagal alat (BE-7), mis. INTERLOCK_POWER. Opsional untuk backend lama.
  failureCode: z.string().nullable().optional(),
});
export type ActuatorCommand = z.infer<typeof actuatorCommandSchema>;

// ── Alert ─────────────────────────────────────────────────────────────────────
export const alertSeveritySchema = z.enum(["INFO", "WARNING", "CRITICAL"]);
export type AlertSeverity = z.infer<typeof alertSeveritySchema>;

export const alertSchema = z.object({
  id: z.number(),
  type: z.string(),
  severity: alertSeveritySchema,
  title: z.string(),
  message: z.string(),
  source: z.string(),
  relatedDeviceId: z.number().nullable(),
  relatedDeviceCode: z.string().nullable(),
  relatedSensorId: z.number().nullable(),
  relatedSensorCode: z.string().nullable(),
  relatedActuatorId: z.number().nullable(),
  relatedActuatorCode: z.string().nullable(),
  acknowledged: z.boolean(),
  acknowledgedBy: z.string().nullable(),
  acknowledgedAt: instant.nullable(),
  createdAt: instant,
  // Metadata mentah peringatan (mis. {commandUid, failureCode}). Opsional untuk backend lama.
  metadata: json.nullable().optional(),
});
export type Alert = z.infer<typeof alertSchema>;

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiDetectionSchema = z.object({
  id: z.number(),
  deviceId: z.number(),
  deviceCode: z.string(),
  plantId: z.number().nullable(),
  plantCode: z.string().nullable(),
  detectionType: z.string(),
  label: z.string().nullable(),
  confidence: z.number().nullable(),
  // Map<String, Object> di backend; nilai non-angka diabaikan saat ditampilkan.
  scores: json.nullable(),
  stationCode: z.string().nullable(),
  // Arah kamera di stasiun: TIMUR / BARAT (Rev A). Opsional supaya backend lama tetap terbaca.
  panDirection: z.string().nullable().optional(),
  captureId: z.string().nullable(),
  imageUrl: z.string().nullable(),
  metadata: json.nullable(),
  detectedAt: instant,
  createdAt: instant,
});
export type AiDetection = z.infer<typeof aiDetectionSchema>;

// ── Umur tanaman & tanaman ────────────────────────────────────────────────────
/*
 * Backend masih menyimpan fase dalam "siklus" aktif, tetapi UI hanya memakai tanggal tanam pindah,
 * HST, dan nama/target EC fase. Field lain dibuat opsional supaya pembersihan backend tidak membuat
 * respons ditolak (zod juga membuang field yang tidak dikenal).
 */
export const growthPhaseSchema = z.object({
  id: z.number().nullable().optional(),
  code: z.string(),
  name: z.string(),
  startHst: z.number(),
  endHst: z.number().nullable(),
  ecTargetMin: z.number().nullable(),
  ecTargetMax: z.number().nullable(),
  notes: z.string().nullable().optional(),
});
export type GrowthPhase = z.infer<typeof growthPhaseSchema>;

export const plantingCycleSchema = z.object({
  id: z.number().optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  transplantDate: z.string(),
  status: z.string().optional(),
  phases: z.array(growthPhaseSchema).optional(),
});
export type PlantingCycle = z.infer<typeof plantingCycleSchema>;

/** GET /cultivation/active & PUT /cultivation/transplant-date. */
export const cycleTodaySchema = z.object({
  cycle: plantingCycleSchema,
  today: z.string(),
  hst: z.number(),
  currentPhase: growthPhaseSchema.nullable(),
  nextPhase: growthPhaseSchema.nullable(),
  daysUntilNextPhase: z.number().nullable(),
  /** Semua tanaman aktif. */
  plantCount: z.number(),
});
export type CycleToday = z.infer<typeof cycleTodaySchema>;

export const plantSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  active: z.boolean(),
  createdAt: instant,
  updatedAt: instant,
});
export type Plant = z.infer<typeof plantSchema>;

// ── Jadwal siram (harian, jam WIB) ───────────────────────────────────────────
export const irrigationScheduleSchema = z.object({
  id: z.number(),
  /** "06:00", waktu kebun (WIB). */
  time: z.string(),
  durationSeconds: z.number(),
  enabled: z.boolean(),
  notes: z.string().nullable(),
  /** Null bila jadwal dimatikan. */
  nextRunAt: instant.nullable(),
  lastRunAt: instant.nullable(),
  /** STARTED · SKIPPED (ditolak aturan keselamatan) · FAILED · MISSED (sistem mati). String agar nilai baru tidak ditolak. */
  lastResult: z.string().nullable(),
  /** Teks teknis bahasa Inggris — hanya untuk "Info teknis". */
  lastMessage: z.string().nullable(),
  /** Kode alasan (interlock, PUMP_UNAVAILABLE, BACKEND_DOWN, kode error API); null bila Disiram. */
  lastReasonCode: z.string().nullable().optional(),
  lastCommandUid: z.string().nullable(),
});
export type IrrigationSchedule = z.infer<typeof irrigationScheduleSchema>;

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const activityEntrySchema = z.object({
  kind: z.string(),
  at: instant,
  summary: z.string(),
  detail: z.string().nullable(),
  // Field terstruktur (backend >= Oktober 2026). Opsional agar backend lama tetap lolos validasi.
  status: z.string().nullable().optional(),
  commandType: z.string().nullable().optional(),
  actuatorCode: z.string().nullable().optional(),
  deviceCode: z.string().nullable().optional(),
  actor: z.string().nullable().optional(),
  refId: z.number().nullable().optional(),
  // Perintah: failureCode perintah; peringatan: metadata.failureCode, atau metadata.reasonCode bila
  // tidak ada (mis. IRRIGATION_SKIPPED → BACKUP_POWER). Null selain itu.
  failureCode: z.string().nullable().optional(),
  /** Tipe peringatan untuk entri ALERT (mis. IRRIGATION_SKIPPED); null untuk perintah. */
  alertType: z.string().nullable().optional(),
});
export type ActivityEntry = z.infer<typeof activityEntrySchema>;

export const dashboardOverviewSchema = z.object({
  system: z.object({
    mode: z.string(),
    messagingTransport: z.string().nullable(),
    messagingConnected: z.boolean(),
    generatedAt: instant,
  }),
  devices: z.object({
    total: z.number(),
    online: z.number(),
    offline: z.number(),
    unknown: z.number(),
    items: z.array(deviceStatusSchema),
  }),
  sensors: z.object({
    total: z.number(),
    enabled: z.number(),
    latestReadings: z.array(sensorReadingSchema),
  }),
  actuators: z.array(actuatorStatusSchema),
  alerts: z.object({
    unacknowledged: z.number(),
    critical: z.number(),
    warning: z.number(),
    active: z.array(alertSchema),
  }),
  latestAiDetection: aiDetectionSchema.nullable().optional(),
  recentActivity: z.array(activityEntrySchema),
  // Null bila tanggal tanam pindah belum diisi; opsional agar backend lama tetap lolos.
  cultivation: z
    .object({
      transplantDate: z.string(),
      hst: z.number(),
      currentPhase: growthPhaseSchema.nullable(),
      nextPhase: growthPhaseSchema.nullable(),
      daysUntilNextPhase: z.number().nullable(),
      plantCount: z.number(),
    })
    .nullable()
    .optional(),
});
export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

// ── Notifikasi push ───────────────────────────────────────────────────────────
export const pushConfigSchema = z.object({
  /** False bila server belum punya kunci VAPID. */
  enabled: z.boolean(),
  publicKey: z.string().nullable(),
  minSeverity: z.string().nullable(),
  /** Jumlah browser akun ini yang berlangganan. */
  subscriptions: z.number(),
});
export type PushConfig = z.infer<typeof pushConfigSchema>;

export const pushTestResultSchema = z.object({ delivered: z.number(), removed: z.number(), failed: z.number() });
export type PushTestResult = z.infer<typeof pushTestResultSchema>;

// ── Error ─────────────────────────────────────────────────────────────────────
export const apiErrorSchema = z.object({
  timestamp: z.string().optional(),
  status: z.number(),
  error: z.string(),
  message: z.string(),
  path: z.string().optional(),
  details: json.nullable().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

// ── Realtime ──────────────────────────────────────────────────────────────────
export const envelopeSchema = z.object({
  event: z.string(),
  timestamp: z.string().optional(),
  data: z.unknown(),
});
export type RealtimeEnvelope = z.infer<typeof envelopeSchema>;

export const telemetryEventSchema = z.object({
  deviceId: z.number(),
  deviceCode: z.string(),
  recordedAt: instant,
  readings: z.array(sensorReadingSchema),
});
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
