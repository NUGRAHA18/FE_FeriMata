import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it } from "vitest";
import { qk, type LiveActivity } from "@/lib/api/query-keys";
import type { Actuator, ActuatorCommand, Alert, DashboardOverview, DeviceStatus, Page, Sensor, SensorReading } from "@/lib/api/types";
import { applyAcknowledged, applyRealtimeEvent, mergeReadings, type ReadingMap } from "./apply";

const t = (s: number) => new Date(Date.UTC(2026, 8, 19, 7, 0, s)).toISOString();

function reading(sensorId: number, value: number, sec: number, id = sensorId * 1000 + sec): SensorReading {
  return { id, sensorId, sensorCode: `S${sensorId}`, metricKey: `m.${sensorId}`, deviceId: 1, deviceCode: "D", value, textValue: null, unit: "C", recordedAt: t(sec), receivedAt: t(sec) };
}

function device(id: number, status: DeviceStatus["status"], backup = false): DeviceStatus {
  return { id, deviceCode: `DEV-${id}`, status, lastSeenAt: t(0), secondsSinceLastSeen: 0, offlineTimeoutSeconds: 120, powerSource: backup ? "BATTERY" : "MAINS", powerSourceUpdatedAt: t(0), onBackupPower: backup };
}

function alert(id: number, severity: Alert["severity"] = "WARNING"): Alert {
  return {
    id, type: "X", severity, title: `A${id}`, message: "m", source: "DEVICE", relatedDeviceId: null, relatedDeviceCode: null, relatedSensorId: null,
    relatedSensorCode: null, relatedActuatorId: null, relatedActuatorCode: null, acknowledged: false, acknowledgedBy: null, acknowledgedAt: null, createdAt: t(id),
  };
}

function command(status: ActuatorCommand["status"], id = 1): ActuatorCommand {
  return {
    id, commandUid: "uid-1", actuatorId: 7, actuatorCode: "DIST-PUMP", deviceId: 3, deviceCode: "PANEL-01", commandType: "ON", parameters: { durationSeconds: 30 },
    source: "OPERATOR", requestedBy: "operator", status, requestedAt: t(0), sentAt: t(1), executedAt: status === "EXECUTED" ? t(3) : null, errorMessage: null,
  };
}

function overview(): DashboardOverview {
  return {
    system: { mode: "DEVELOPMENT", messagingTransport: "mock", messagingConnected: true, generatedAt: t(0) },
    devices: { total: 2, online: 2, offline: 0, unknown: 0, items: [device(1, "ONLINE"), device(2, "ONLINE")] },
    sensors: { total: 1, enabled: 1, latestReadings: [] },
    actuators: [{ id: 7, code: "DIST-PUMP", enabled: true, currentState: "OFF", stateUpdatedAt: t(0), deviceCode: "PANEL-01" }],
    alerts: { unacknowledged: 1, critical: 0, warning: 1, active: [alert(1)] },
    recentActivity: [],
  };
}

const page = <T,>(content: T[]): Page<T> => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1, last: true });

let qc: QueryClient;
beforeEach(() => {
  qc = new QueryClient();
  qc.setQueryData(qk.overview, overview());
});

describe("mergeReadings", () => {
  it("hanya mengganti bila pembacaan lebih baru, dan mempertahankan referensi bila tak berubah", () => {
    const base: ReadingMap = { 1: reading(1, 20, 10) };
    const same = mergeReadings(base, [reading(1, 19, 5)]);
    expect(same).toBe(base);
    const next = mergeReadings(base, [reading(1, 21, 20), reading(2, 5, 20)]);
    expect(next).not.toBe(base);
    expect(next[1].value).toBe(21);
    expect(next[2].value).toBe(5);
  });
});

describe("applyRealtimeEvent", () => {
  it("SENSOR_READING_UPDATED memperbarui peta pembacaan per sensorId", () => {
    const ok = applyRealtimeEvent(qc, {
      event: "SENSOR_READING_UPDATED",
      timestamp: t(1),
      data: { deviceId: 1, deviceCode: "D", recordedAt: t(1), readings: [reading(1, 28.4, 1)] },
    });
    expect(ok).toBe(true);
    expect(qc.getQueryData<ReadingMap>(qk.readings)?.[1].value).toBe(28.4);
  });

  it("DEVICE_STATUS_CHANGED menghitung ulang ringkasan online/offline", () => {
    applyRealtimeEvent(qc, { event: "DEVICE_STATUS_CHANGED", data: device(2, "OFFLINE") });
    const o = qc.getQueryData<DashboardOverview>(qk.overview)!;
    expect(o.devices).toMatchObject({ total: 2, online: 1, offline: 1, unknown: 0 });
  });

  it("ACTUATOR_STATUS_CHANGED menulis status yang dilaporkan perangkat", () => {
    applyRealtimeEvent(qc, {
      event: "ACTUATOR_STATUS_CHANGED",
      data: { id: 7, code: "DIST-PUMP", enabled: true, currentState: "ON", stateUpdatedAt: t(5), deviceCode: "PANEL-01" },
    });
    expect(qc.getQueryData<DashboardOverview>(qk.overview)!.actuators[0].currentState).toBe("ON");
  });

  it("ACTUATOR_COMMAND_UPDATED melacak commandUid, halaman riwayat, dan feed aktivitas tanpa duplikasi", () => {
    qc.setQueryData(qk.actuatorCommands(7, 0, 20), page<ActuatorCommand>([]));
    applyRealtimeEvent(qc, { event: "ACTUATOR_COMMAND_UPDATED", data: command("SENT") });
    applyRealtimeEvent(qc, { event: "ACTUATOR_COMMAND_UPDATED", data: command("EXECUTED") });
    expect(qc.getQueryData<ActuatorCommand>(qk.command("uid-1"))?.status).toBe("EXECUTED");
    const hist = qc.getQueryData<Page<ActuatorCommand>>(qk.actuatorCommands(7, 0, 20))!;
    expect(hist.content).toHaveLength(1);
    expect(hist.content[0].status).toBe("EXECUTED");
    const live = qc.getQueryData<LiveActivity[]>(qk.liveActivity)!;
    expect(live).toHaveLength(1);
  });

  it("ALERT_CREATED menambah hitungan & daftar yang cocok dengan filter", () => {
    qc.setQueryData(qk.alerts({ acknowledged: false, page: 0, size: 20 }), page([alert(1)]));
    qc.setQueryData(qk.alerts({ severity: "INFO", page: 0, size: 20 }), page<Alert>([]));
    applyRealtimeEvent(qc, { event: "ALERT_CREATED", data: alert(2, "CRITICAL") });
    const o = qc.getQueryData<DashboardOverview>(qk.overview)!;
    expect(o.alerts).toMatchObject({ unacknowledged: 2, critical: 1, warning: 1 });
    expect(o.alerts.active[0].id).toBe(2);
    expect(qc.getQueryData<Page<Alert>>(qk.alerts({ acknowledged: false, page: 0, size: 20 }))!.content.map((a) => a.id)).toEqual([2, 1]);
    expect(qc.getQueryData<Page<Alert>>(qk.alerts({ severity: "INFO", page: 0, size: 20 }))!.content).toHaveLength(0);
  });

  it("mengabaikan event tak dikenal dan data yang tidak sesuai kontrak", () => {
    const before = qc.getQueryData(qk.overview);
    expect(applyRealtimeEvent(qc, { event: "SOMETHING_NEW", data: {} })).toBe(false);
    expect(applyRealtimeEvent(qc, { event: "DEVICE_STATUS_CHANGED", data: { id: "x" } })).toBe(false);
    expect(applyRealtimeEvent(qc, "bukan envelope")).toBe(false);
    expect(qc.getQueryData(qk.overview)).toBe(before);
  });
});

function sensor(id: number, name: string): Sensor {
  return {
    id, deviceId: 1, deviceCode: "D", code: `S${id}`, metricKey: `m.${id}`, name, type: null, unit: "C", enabled: true, autoRegistered: false,
    description: null, metadata: null, createdAt: t(0), updatedAt: t(1),
  };
}

function actuator(id: number, patch: Partial<Actuator> = {}): Actuator {
  return {
    id, deviceId: 3, deviceCode: "PANEL-01", code: `A${id}`, name: `Pompa ${id}`, type: "DOSING_PUMP", enabled: true, currentState: "OFF", stateUpdatedAt: t(0),
    maxRunSeconds: 60, supportedCommands: null, description: null, metadata: null, createdAt: t(0), updatedAt: t(1), ...patch,
  };
}

describe("data master (SENSOR_UPDATED, ACTUATOR_UPDATED)", () => {
  it("SENSOR_UPDATED mengganti sensor di daftar & detail, dan menambah sensor baru", () => {
    qc.setQueryData(qk.sensors, [sensor(1, "Suhu")]);
    applyRealtimeEvent(qc, { event: "SENSOR_UPDATED", data: sensor(1, "Suhu udara") });
    applyRealtimeEvent(qc, { event: "SENSOR_UPDATED", data: sensor(2, "Baru") });
    expect(qc.getQueryData<Sensor[]>(qk.sensors)!.map((s) => s.name)).toEqual(["Suhu udara", "Baru"]);
    expect(qc.getQueryData<Sensor>(qk.sensor(1))!.name).toBe("Suhu udara");
  });

  it("ACTUATOR_UPDATED memperbarui daftar, detail, dan saklar 'boleh dinyalakan' di overview", () => {
    qc.setQueryData(qk.actuators, [actuator(7)]);
    applyRealtimeEvent(qc, { event: "ACTUATOR_UPDATED", data: actuator(7, { name: "Pompa A" }) });
    expect(qc.getQueryData<Actuator[]>(qk.actuators)![0].name).toBe("Pompa A");
    applyRealtimeEvent(qc, { event: "ACTUATOR_UPDATED", data: actuator(7, { enabled: false, name: "Pompa A" }) });
    expect(qc.getQueryData<Actuator>(qk.actuator(7))!.enabled).toBe(false);
    expect(qc.getQueryData<DashboardOverview>(qk.overview)!.actuators[0].enabled).toBe(false);
  });

  it("yang dimatikan keluar dari daftar bawaan tapi tetap di daftar includeDisabled; diaktifkan = masuk lagi", () => {
    qc.setQueryData(qk.sensors, [sensor(1, "Suhu"), sensor(2, "pH")]);
    qc.setQueryData(qk.sensorsAll, [sensor(1, "Suhu"), sensor(2, "pH")]);
    applyRealtimeEvent(qc, { event: "SENSOR_UPDATED", data: { ...sensor(2, "pH"), enabled: false } });
    expect(qc.getQueryData<Sensor[]>(qk.sensors)!.map((s) => s.id)).toEqual([1]);
    expect(qc.getQueryData<Sensor[]>(qk.sensorsAll)!.find((s) => s.id === 2)!.enabled).toBe(false);
    applyRealtimeEvent(qc, { event: "SENSOR_UPDATED", data: sensor(2, "pH") });
    expect(qc.getQueryData<Sensor[]>(qk.sensors)!.map((s) => s.id)).toEqual([1, 2]);

    qc.setQueryData(qk.actuators, [actuator(7)]);
    applyRealtimeEvent(qc, { event: "ACTUATOR_STATUS_CHANGED", data: { id: 7, code: "A7", enabled: false, currentState: "OFF", stateUpdatedAt: t(5), deviceCode: "PANEL-01" } });
    expect(qc.getQueryData<Actuator[]>(qk.actuators)).toEqual([]);
  });

  it("ACTUATOR_UPDATED tidak memunculkan aktuator yang sudah dicabut di daftar Kontrol", () => {
    qc.setQueryData(qk.actuators, [actuator(7)]);
    applyRealtimeEvent(qc, { event: "ACTUATOR_UPDATED", data: actuator(9, { type: "DOSING_LOOP" }) });
    expect(qc.getQueryData<Actuator[]>(qk.actuators)!.map((a) => a.id)).toEqual([7]);
  });
});

describe("ALERT_UPDATED", () => {
  it("mengeluarkan alert yang ditangani operator lain dari daftar 'belum ditangani' dan dari overview", () => {
    const key = qk.alerts({ acknowledged: false, page: 0, size: 20 });
    qc.setQueryData(key, page([alert(1)]));
    const ok = applyRealtimeEvent(qc, { event: "ALERT_UPDATED", data: { ...alert(1), acknowledged: true, acknowledgedBy: "rekan", acknowledgedAt: t(9) } });
    expect(ok).toBe(true);
    expect(qc.getQueryData<Page<Alert>>(key)!.content).toHaveLength(0);
    expect(qc.getQueryData<DashboardOverview>(qk.overview)!.alerts.active).toHaveLength(0);
  });
});

describe("applyAcknowledged", () => {
  it("mengurangi hitungan dan mengeluarkan alert dari daftar 'belum ditangani'", () => {
    const key = qk.alerts({ acknowledged: false, page: 0, size: 20 });
    qc.setQueryData(key, page([alert(1)]));
    applyAcknowledged(qc, { ...alert(1), acknowledged: true, acknowledgedBy: "operator", acknowledgedAt: t(9) });
    const o = qc.getQueryData<DashboardOverview>(qk.overview)!;
    expect(o.alerts).toMatchObject({ unacknowledged: 0, warning: 0 });
    expect(o.alerts.active).toHaveLength(0);
    expect(qc.getQueryData<Page<Alert>>(key)!.content).toHaveLength(0);
  });
});
