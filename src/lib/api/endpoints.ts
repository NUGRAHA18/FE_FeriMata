import { z } from "zod";
import { apiRequest, fetchApiText } from "./client";
import {
  actuatorCommandSchema,
  actuatorSchema,
  aiDetectionSchema,
  alertSchema,
  irrigationScheduleSchema,
  calibrationSampleSchema,
  dispensedVolumeSchema,
  driftCheckSchema,
  pumpCalibrationSchema,
  sensorCalibrationSchema,
  sensorHistorySeriesSchema,
  cycleTodaySchema,
  plantSchema,
  pushConfigSchema,
  pushTestResultSchema,
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

// Auth
export const login = (username: string, password: string) =>
  apiRequest("/auth/login", {
    method: "POST",
    body: {
      username, password
    },
    schema: loginResponseSchema, auth: false
  });
export const getMe = (signal?: AbortSignal) =>
  apiRequest("/auth/me", {
    schema: userSchema,
    signal
  });
export const logout = (refreshToken: string) => apiRequest("/auth/logout", { method: "POST", body: { refreshToken }, auth: false });
export const changePassword = (body: { currentPassword: string; newPassword: string }) =>
  apiRequest("/auth/change-password", { method: "POST", body, schema: loginResponseSchema });

// Pengguna (ADMIN)
export const getUsers = (signal?: AbortSignal) => apiRequest("/users", { schema: z.array(userSchema), signal });
export type UserInput = { username: string; password: string; fullName?: string; role: string; mustChangePassword?: boolean };
export const createUser = (body: UserInput) => apiRequest("/users", { method: "POST", body, schema: userSchema });
export type UserPatch = Partial<{ fullName: string; role: string; enabled: boolean }>;
export const patchUser = (id: number, body: UserPatch) => apiRequest(`/users/${id}`, { method: "PATCH", body, schema: userSchema });
export const resetUserPassword = (id: number, newPassword: string) =>
  apiRequest(`/users/${id}/reset-password`, { method: "POST", body: { newPassword }, schema: userSchema });

// Dashboard
export const getOverview = (signal?: AbortSignal) => apiRequest("/dashboard/overview", { schema: dashboardOverviewSchema, signal });

// Perangkat
export const getDevices = (signal?: AbortSignal) => apiRequest("/devices", { schema: z.array(deviceSchema), signal });
export const getDevice = (id: number, signal?: AbortSignal) => apiRequest(`/devices/${id}`, { schema: deviceSchema, signal });
export const getDeviceStatus = (id: number, signal?: AbortSignal) =>
  apiRequest(`/devices/${id}/status`, { schema: deviceStatusSchema, signal });

// Sensor
/** Bawaan: hanya sensor aktif. `includeDisabled` hanya untuk layar meninjau/mengaktifkan kembali. */
export const getSensors = (deviceId?: number, signal?: AbortSignal, includeDisabled = false) =>
  apiRequest("/sensors", { query: { deviceId, includeDisabled: includeDisabled || undefined }, schema: z.array(sensorSchema), signal });
export const getSensor = (id: number, signal?: AbortSignal) => apiRequest(`/sensors/${id}`, { schema: sensorSchema, signal });
export const getSensorLatest = (id: number, signal?: AbortSignal) =>
  apiRequest(`/sensors/${id}/latest`, { schema: sensorReadingSchema, signal });
export const getSensorHistory = (
  id: number,
  params: { from?: string; to?: string; page?: number; size?: number },
  signal?: AbortSignal,
) => apiRequest(`/sensors/${id}/history`, { query: params, schema: pageSchema(sensorReadingSchema), signal });

export const getSensorHistoryAggregate = (id: number, params: { from?: string; to?: string; interval?: string }, signal?: AbortSignal) =>
  apiRequest(`/sensors/${id}/history/aggregate`, { query: params, schema: sensorHistorySeriesSchema, signal });

export type SensorPatch = Partial<{ name: string; type: string; unit: string; description: string; enabled: boolean; metadata: Record<string, unknown> }>;
export const patchSensor = (id: number, patch: SensorPatch) =>
  apiRequest(`/sensors/${id}`, { method: "PATCH", body: patch, schema: sensorSchema });

// Kalibrasi sensor (sampel lab berpasangan, model koreksi, cek drift)
export const getCalibrationSamples = (sensorId: number, signal?: AbortSignal) =>
  apiRequest(`/sensors/${sensorId}/calibration-samples`, { schema: z.array(calibrationSampleSchema), signal });
export type CalibrationSampleInput = { sampledAt?: string; sensorValue?: number; labValue: number; labMethod?: string; sampleCode?: string; notes?: string };
export const addCalibrationSample = (sensorId: number, body: CalibrationSampleInput) =>
  apiRequest(`/sensors/${sensorId}/calibration-samples`, { method: "POST", body, schema: calibrationSampleSchema });
/** CSV sampel lab (BOM UTF-8, waktu WIB, kovariat jadi kolom), disusun backend. */
export const exportCalibrationSamplesCsv = (sensorId: number, signal?: AbortSignal) =>
  fetchApiText(`/sensors/${sensorId}/calibration-samples.csv`, undefined, signal);
export const deleteCalibrationSample = (sensorId: number, sampleId: number) =>
  apiRequest(`/sensors/${sensorId}/calibration-samples/${sampleId}`, { method: "DELETE" });
export const getSensorCalibrations = (sensorId: number, signal?: AbortSignal) =>
  apiRequest(`/sensors/${sensorId}/calibrations`, { schema: z.array(sensorCalibrationSchema), signal });
export type CalibrationFitInput = { covariateKeys?: string[]; samplesFrom?: string; samplesTo?: string; save?: boolean; validFrom?: string; notes?: string };
export const fitSensorCalibration = (sensorId: number, body: CalibrationFitInput) =>
  apiRequest(`/sensors/${sensorId}/calibrations/fit`, { method: "POST", body, schema: sensorCalibrationSchema });
export type SensorCalibrationInput = { intercept: number; slope: number; validFrom?: string; notes?: string };
export const createSensorCalibration = (sensorId: number, body: SensorCalibrationInput) =>
  apiRequest(`/sensors/${sensorId}/calibrations`, { method: "POST", body, schema: sensorCalibrationSchema });
export const getDriftChecks = (sensorId: number, page = 0, size = 10, signal?: AbortSignal) =>
  apiRequest(`/sensors/${sensorId}/drift-checks`, { query: { page, size }, schema: pageSchema(driftCheckSchema), signal });
export type DriftCheckInput = { standardName: string; referenceValue: number; measuredValue?: number; probeCleaned?: boolean; notes?: string };
export const addDriftCheck = (sensorId: number, body: DriftCheckInput) =>
  apiRequest(`/sensors/${sensorId}/drift-checks`, { method: "POST", body, schema: driftCheckSchema });
/** Hapus cek drift yang salah ketik (OPERATOR+; 404 bila bukan milik sensor ini). */
export const deleteDriftCheck = (sensorId: number, checkId: number) =>
  apiRequest(`/sensors/${sensorId}/drift-checks/${checkId}`, { method: "DELETE" });

// Aktuator
export const getActuators = (deviceId?: number, signal?: AbortSignal, includeDisabled = false) =>
  apiRequest("/actuators", { query: { deviceId, includeDisabled: includeDisabled || undefined }, schema: z.array(actuatorSchema), signal });
export const getActuator = (id: number, signal?: AbortSignal) => apiRequest(`/actuators/${id}`, { schema: actuatorSchema, signal });

export type ActuatorPatch = Partial<{ name: string; type: string; description: string; enabled: boolean; maxRunSeconds: number; metadata: Record<string, unknown> }>;
export const patchActuator = (id: number, patch: ActuatorPatch) =>
  apiRequest(`/actuators/${id}`, { method: "PATCH", body: patch, schema: actuatorSchema });

export type CommandRequest = { command: string; parameters?: Record<string, unknown> };
export const sendActuatorCommand = (id: number, req: CommandRequest) =>
  apiRequest(`/actuators/${id}/commands`, { method: "POST", body: req, schema: actuatorCommandSchema });
export const getActuatorCommands = (id: number, page: number, size = 20, signal?: AbortSignal) =>
  apiRequest(`/actuators/${id}/commands`, { query: { page, size }, schema: pageSchema(actuatorCommandSchema), signal });

// Kalibrasi debit pompa dosing
export const getPumpCalibrations = (actuatorId: number, signal?: AbortSignal) =>
  apiRequest(`/actuators/${actuatorId}/calibrations`, { schema: z.array(pumpCalibrationSchema), signal });
export type PumpTrial = { durationSeconds: number; volumeMl: number };
export type PumpCalibrationInput = { trials: PumpTrial[]; notes?: string };
export const createPumpCalibration = (actuatorId: number, body: PumpCalibrationInput) =>
  apiRequest(`/actuators/${actuatorId}/calibrations`, { method: "POST", body, schema: pumpCalibrationSchema });
export const getDispensed = (actuatorId: number, params: { from?: string; to?: string }, signal?: AbortSignal) =>
  apiRequest(`/actuators/${actuatorId}/dispensed`, { query: params, schema: dispensedVolumeSchema, signal });

// Jadwal siram harian (pompa siram dinyalakan backend lewat jalur perintah biasa)
export const getIrrigationSchedules = (signal?: AbortSignal) =>
  apiRequest("/irrigation/schedules", { schema: z.array(irrigationScheduleSchema), signal });
export type IrrigationInput = { time: string; durationSeconds: number; enabled?: boolean; notes?: string };
export const createIrrigationSchedule = (body: IrrigationInput) =>
  apiRequest("/irrigation/schedules", { method: "POST", body, schema: irrigationScheduleSchema });
export const patchIrrigationSchedule = (id: number, body: Partial<IrrigationInput>) =>
  apiRequest(`/irrigation/schedules/${id}`, { method: "PATCH", body, schema: irrigationScheduleSchema });
export const deleteIrrigationSchedule = (id: number) => apiRequest(`/irrigation/schedules/${id}`, { method: "DELETE" });

// Alert
export type AlertFilters = {
  acknowledged?: boolean;
  severity?: AlertSeverity;
  deviceId?: number;
  sensorId?: number;
  actuatorId?: number;
  page?: number;
  size?: number;
};
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

// Umur tanaman: HST & fase dihitung backend dari satu tanggal semai = hari ke-0 (404 = belum diisi).
export const getCycleToday = async (signal?: AbortSignal) => {
  try {
    return await apiRequest("/cultivation/active", { schema: cycleTodaySchema, signal });
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
};
/** Isi atau ubah tanggal semai ("2026-09-12"); jawabannya sama dengan GET /cultivation/active. */
export const putSowingDate = (sowingDate: string) =>
  apiRequest("/cultivation/sowing-date", { method: "PUT", body: { sowingDate }, schema: cycleTodaySchema });

// Tanaman (semua tanaman aktif, tidak per siklus)
export type PlantFilters = { active?: boolean };
export const getPlants = (f: PlantFilters, signal?: AbortSignal) => apiRequest("/plants", { query: f, schema: z.array(plantSchema), signal });
/** `code` opsional: bila kosong backend membuatnya dari `name`. Salah satu wajib diisi. */
export type PlantInput = { name: string; code?: string; description?: string };
export const createPlant = (body: PlantInput) => apiRequest("/plants", { method: "POST", body, schema: plantSchema });
/** 204. Pengamatan/panen tanaman ikut terhapus; deteksi AI tetap disimpan tanpa tanaman. */
export const deletePlant = (id: number) => apiRequest(`/plants/${id}`, { method: "DELETE" });

// Notifikasi push (semua peran). Body langganan = PushSubscription.toJSON() apa adanya.
export const getPushConfig = (signal?: AbortSignal) => apiRequest("/push/config", { schema: pushConfigSchema, signal });
export const subscribePush = (subscription: PushSubscriptionJSON) => apiRequest("/push/subscriptions", { method: "POST", body: subscription });
export const unsubscribePush = (endpoint: string) => apiRequest("/push/subscriptions", { method: "DELETE", body: { endpoint } });
export const sendTestPush = () => apiRequest("/push/test", { method: "POST", schema: pushTestResultSchema });

// Dev-only (hanya dipakai halaman Dev Tools saat system.mode === DEVELOPMENT)
export const devPost = (path: string, body: unknown) => apiRequest(`/dev${path}`, { method: "POST", body });
export const devOutbox = () => apiRequest("/dev/outbox");
