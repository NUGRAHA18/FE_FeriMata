import { z } from "zod";
import { apiRequest } from "./client";
import {
  actuatorCommandSchema,
  actuatorSchema,
  aiDetectionSchema,
  alertSchema,
  cycleTodaySchema,
  plantingCycleSchema,
  plantObservationSchema,
  plantSchema,
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

// Siklus tanam
export const getCycleToday = async (signal?: AbortSignal) => {
  try {
    return await apiRequest("/cultivation/active", { schema: cycleTodaySchema, signal });
  } catch (e) {
    if ((e as { status?: number }).status === 404) return null;
    throw e;
  }
};
export const getCycles = (signal?: AbortSignal) => apiRequest("/cultivation/cycles", { schema: z.array(plantingCycleSchema), signal });
export type PhaseInput = { code: string; name: string; startHst: number; endHst: number | null; ecTargetMin: number | null; ecTargetMax: number | null; ratioN: number | null; ratioP: number | null; ratioK: number | null; notes?: string | null };
export type CycleInput = { code: string; name: string; variety?: string; transplantDate: string; expectedHarvestDate?: string; notes?: string; activate?: boolean; phases?: PhaseInput[] };
export const createCycle = (body: CycleInput) => apiRequest("/cultivation/cycles", { method: "POST", body, schema: plantingCycleSchema });
export type CyclePatch = Partial<{ name: string; variety: string; transplantDate: string; expectedHarvestDate: string; notes: string; status: "PLANNED" | "ACTIVE" | "ENDED" }>;
export const patchCycle = (id: number, body: CyclePatch) => apiRequest(`/cultivation/cycles/${id}`, { method: "PATCH", body, schema: plantingCycleSchema });
export const putPhases = (id: number, phases: PhaseInput[]) => apiRequest(`/cultivation/cycles/${id}/phases`, { method: "PUT", body: phases, schema: plantingCycleSchema });

// Tanaman
export type PlantFilters = { cycleId?: number; treatmentCode?: string; blockCode?: string; stationCode?: string; comparisonGroup?: string; active?: boolean };
export const getPlants = (f: PlantFilters, signal?: AbortSignal) => apiRequest("/plants", { query: f, schema: z.array(plantSchema), signal });
export type PlantInput = {
  code: string;
  name?: string;
  description?: string;
  cycleId?: number;
  treatmentCode?: string;
  blockCode?: string;
  rowCode?: string;
  plotCode?: string;
  stationCode?: string;
  positionInRow?: number;
  comparisonGroup?: string;
  taggedLeaves?: string;
};
export const createPlant = (body: PlantInput) => apiRequest("/plants", { method: "POST", body, schema: plantSchema });
export const createPlants = (body: PlantInput[]) => apiRequest("/plants/batch", { method: "POST", body, schema: z.array(plantSchema) });
export type PlantPatch = Partial<PlantInput & { active: boolean }>;
export const patchPlant = (id: number, body: PlantPatch) => apiRequest(`/plants/${id}`, { method: "PATCH", body, schema: plantSchema });
export const getObservations = (plantId: number, page = 0, size = 10, signal?: AbortSignal) =>
  apiRequest(`/plants/${plantId}/observations`, { query: { page, size }, schema: pageSchema(plantObservationSchema), signal });
export type ObservationInput = { observedAt?: string; heightCm?: number; leafCount?: number; leaf3LengthCm?: number; leaf3WidthCm?: number; visualNotes?: string };
export const addObservation = (plantId: number, body: ObservationInput) =>
  apiRequest(`/plants/${plantId}/observations`, { method: "POST", body, schema: plantObservationSchema });

// Dev-only (hanya dipakai halaman Dev Tools saat system.mode === DEVELOPMENT)
export const devPost = (path: string, body: unknown) => apiRequest(`/dev${path}`, { method: "POST", body });
export const devOutbox = () => apiRequest("/dev/outbox");
