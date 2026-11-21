// Data contoh untuk tangkapan layar Panduan: semua kartu terisi, tanpa data kebun sungguhan.
// Bentuk data mengikuti respons API asli (lihat src/lib/api/types.ts); katalog perangkat dan aktuator
// diambil dari fixtures/catalog.json. Dipakai shots.mjs lewat page.route.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(readFileSync(join(here, "fixtures/catalog.json"), "utf8"));
const photo = `data:image/jpeg;base64,${readFileSync(join(here, "fixtures/foto-contoh.jpg")).toString("base64")}`;

const iso = (ms) => new Date(ms).toISOString();

// metricKey → [perangkat, nilai, satuan]
const READINGS = {
  "soil_a.moisture": ["GREENHOUSE-01", 62.4, "%"],
  "soil_a.temperature": ["GREENHOUSE-01", 27.1, "C"],
  "soil_a.ph": ["GREENHOUSE-01", 6.4, "pH"],
  "soil_a.ec": ["GREENHOUSE-01", 1.45, "mS/cm"],
  "soil_a.nitrogen": ["GREENHOUSE-01", 118, "mg/kg"],
  "soil_a.phosphorus": ["GREENHOUSE-01", 52, "mg/kg"],
  "soil_a.potassium": ["GREENHOUSE-01", 176, "mg/kg"],
  "air.temperature": ["GREENHOUSE-01", 29.3, "C"],
  "air.humidity": ["GREENHOUSE-01", 71, "%RH"],
  "light.illuminance": ["GREENHOUSE-01", 18400, "lux"],
  "tank.ec": ["RIO-TANK-01", 1.9, "mS/cm"],
  "tank.ph": ["RIO-TANK-01", 6.2, "pH"],
  "tank.water_temperature": ["RIO-TANK-01", 26.1, "C"],
  "tank.float_low_ok": ["RIO-TANK-01", 1, null],
  "mains.voltage": ["PZEM-01", 228.5, "V"],
  "mains.current": ["PZEM-01", 0.31, "A"],
  "mains.power": ["PZEM-01", 66, "W"],
  "mains.energy": ["PZEM-01", 12.4, "kWh"],
  "mains.frequency": ["PZEM-01", 50, "Hz"],
  "mains.power_factor": ["PZEM-01", 0.9, null],
  "jetson.soc_temperature": ["JETSON-01", 52, "C"],
  "trolley.station": ["JETSON-01", 3, null],
  "trolley.home_limit": ["JETSON-01", 0, null],
  "trolley.end_limit": ["JETSON-01", 0, null],
};

export function buildDemo(now = Date.now()) {
  const deviceId = Object.fromEntries(catalog.devices.map((d) => [d.deviceCode, d.id]));
  const base = catalog.sampleReading;
  const latestReadings = Object.entries(READINGS).map(([metricKey, [deviceCode, value, unit]], i) => ({
    ...base,
    id: 900000 + i,
    sensorId: 100 + i,
    sensorCode: metricKey.toUpperCase().replace(/[._]/g, "-"),
    metricKey,
    deviceId: deviceId[deviceCode],
    deviceCode,
    value,
    calibratedValue: null,
    textValue: null,
    unit,
    recordedAt: iso(now - (8 + (i % 7) * 6) * 1000),
    receivedAt: iso(now - (7 + (i % 7) * 6) * 1000),
  }));

  const deviceItems = catalog.deviceStatus.map((d) => ({
    ...d,
    status: "ONLINE",
    lastSeenAt: iso(now - 15_000),
    secondsSinceLastSeen: 15,
    onBackupPower: false,
    powerSource: d.deviceCode === "JETSON-01" ? "MAINS" : null,
  }));
  const devices = catalog.devices.map((d) => ({ ...d, status: "ONLINE", lastSeenAt: iso(now - 15_000) }));
  const actuatorStatus = catalog.actuatorStatus.map((a) => ({ ...a, currentState: "OFF", stateUpdatedAt: iso(now - 3_600_000) }));
  const actuators = catalog.actuators.map((a) => ({ ...a, currentState: "OFF", stateUpdatedAt: iso(now - 3_600_000) }));

  const activity = [
    { kind: "COMMAND", at: iso(now - 40 * 60_000), summary: "Pompa siram dinyalakan", detail: "ON selama 300 detik", status: "EXECUTED", commandType: "ON", actuatorCode: "DIST-PUMP", deviceCode: "PANEL-01", actor: "SCHEDULER", refId: 1, failureCode: null, alertType: null },
    { kind: "COMMAND", at: iso(now - 35 * 60_000), summary: "Pompa siram dimatikan", detail: null, status: "EXECUTED", commandType: "OFF", actuatorCode: "DIST-PUMP", deviceCode: "PANEL-01", actor: "SCHEDULER", refId: 2, failureCode: null, alertType: null },
    { kind: "ALERT", at: iso(now - 3 * 3_600_000), summary: "Pompa pupuk perlu dikalibrasi", detail: "INFO: ukur debit pompa pupuk", status: "INFO", commandType: null, actuatorCode: null, deviceCode: "RIO-TANK-01", actor: "SYSTEM", refId: 7, failureCode: null, alertType: "PUMP_CALIBRATION_DUE" },
  ];
  const alert = {
    id: 7, type: "PUMP_CALIBRATION_DUE", severity: "INFO", title: "Pompa pupuk perlu dikalibrasi", message: "Ukur debit pompa pupuk supaya takaran pupuk tepat.",
    source: "SYSTEM", relatedDeviceId: deviceId["RIO-TANK-01"], relatedDeviceCode: "RIO-TANK-01", relatedSensorId: null, relatedSensorCode: null,
    relatedActuatorId: null, relatedActuatorCode: null, acknowledged: false, acknowledgedBy: null, acknowledgedAt: null, createdAt: iso(now - 3 * 3_600_000), metadata: {},
  };

  const overview = {
    system: { mode: "PRODUCTION", messagingTransport: "MQTT", messagingConnected: true, generatedAt: iso(now) },
    devices: { total: deviceItems.length, online: deviceItems.length, offline: 0, unknown: 0, items: deviceItems },
    sensors: { total: latestReadings.length, enabled: latestReadings.length, latestReadings },
    actuators: actuatorStatus,
    alerts: { unacknowledged: 1, critical: 0, warning: 0, active: [alert] },
    latestAiDetection: null,
    recentActivity: activity,
    cultivation: catalog.cultivation,
  };

  const detection = {
    id: 1, deviceId: deviceId["JETSON-01"], deviceCode: "JETSON-01", plantId: null, plantCode: null, detectionType: "NPK_DEFICIENCY", label: "Healthy",
    confidence: 0.91, scores: { Healthy: 0.72, "Nitrogen-Deficiency": 0.18, "Phosphorus-Deficiency": 0.06, "Potassium-Deficiency": 0.04 }, stationCode: "ST-03",
    panDirection: "TIMUR", captureId: "contoh", imageUrl: photo, metadata: null, detectedAt: iso(now - 20 * 60_000), createdAt: iso(now - 20 * 60_000),
  };

  const tomorrow6 = new Date(now); tomorrow6.setDate(tomorrow6.getDate() + 1); tomorrow6.setHours(6, 0, 0, 0);
  const today17 = new Date(now); today17.setHours(17, 0, 0, 0);
  const sched = (id, time, next, last) => ({
    id, time, durationSeconds: 300, enabled: true, notes: null, nextRunAt: iso(next), lastRunAt: last ? iso(last) : null, lastResult: last ? "STARTED" : null,
    lastMessage: null, lastReasonCode: null, lastDurationSeconds: last ? 300 : null, lastCommandUid: last ? `demo-${id}` : null, lastCommandStatus: last ? "EXECUTED" : null, lastCommandFailureCode: null,
  });

  return {
    me: { id: 1, username: "budi", fullName: "Pak Budi", role: "OPERATOR", enabled: true, mustChangePassword: false, createdAt: iso(now - 30 * 86_400_000) },
    push: { enabled: false, publicKey: null, minSeverity: "CRITICAL", subscriptions: 0 },
    overview,
    detections: { content: [detection], page: 0, size: 10, totalElements: 1, totalPages: 1, last: true },
    devices,
    aiStatus: { configured: true, reachable: true, message: "Running Melon AI System API", latencyMs: 23, checkedAt: iso(now) },
    actuators,
    irrigation: [sched(1, "06:00", tomorrow6.getTime(), now - 40 * 60_000 - 20 * 3_600_000), sched(2, "17:00", today17.getTime() > now ? today17.getTime() : today17.getTime() + 86_400_000, null)],
    fertilization: {
      enabled: true, aiConfigured: true, aiReachable: true, aiError: null, aiScheduleId: 1, intervalDays: 3,
      lastFertilizedDate: new Date(now - 2 * 86_400_000).toISOString().slice(0, 10), lastFertilizedAt: iso(now - 2 * 86_400_000), nextDueDate: new Date(now + 86_400_000).toISOString().slice(0, 10), activeRun: null,
    },
  };
}
