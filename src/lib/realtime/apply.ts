import type { QueryClient } from "@tanstack/react-query";
import type { AlertFilters, DetectionFilter } from "@/lib/api/endpoints";
import { qk, type LiveActivity } from "@/lib/api/query-keys";
import {
  actuatorCommandSchema,
  actuatorStatusSchema,
  aiDetectionSchema,
  alertSchema,
  deviceStatusSchema,
  envelopeSchema,
  telemetryEventSchema,
  type Actuator,
  type ActuatorCommand,
  type ActuatorStatus,
  type AiDetection,
  type Alert,
  type DashboardOverview,
  type Device,
  type DeviceStatus,
  type Page,
  type SensorReading,
} from "@/lib/api/types";

/*
 * Penerapan event STOMP ke cache TanStack Query dengan setQueryData — tanpa refetch.
 * Semua pembaruan immutable dan hanya membuat objek baru untuk bagian yang berubah, sehingga
 * komponen yang memakai `select` tidak ikut re-render bila datanya tidak berubah.
 */

const LIVE_ACTIVITY_MAX = 15;
const OVERVIEW_ALERTS_MAX = 10;

export type ReadingMap = Record<number, SensorReading>;

function isNewer(a: SensorReading, b: SensorReading | undefined) {
  return !b || Date.parse(a.recordedAt) >= Date.parse(b.recordedAt);
}

/** Gabungkan pembacaan baru ke peta per sensorId; mengembalikan objek lama bila tidak ada perubahan. */
export function mergeReadings(prev: ReadingMap | undefined, readings: SensorReading[]): ReadingMap {
  let next: ReadingMap | undefined;
  for (const r of readings) {
    const cur = (next ?? prev)?.[r.sensorId];
    if (cur && cur.id === r.id) continue;
    if (!isNewer(r, cur)) continue;
    next ??= { ...prev };
    next[r.sensorId] = r;
  }
  return next ?? prev ?? {};
}

function upsertById<T extends { id: number }>(list: T[], item: T, merge: (old: T) => T = () => item): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  if (i < 0) return [...list, item];
  const copy = list.slice();
  copy[i] = merge(list[i]);
  return copy;
}

export function recountDevices(items: DeviceStatus[]) {
  let online = 0,
    offline = 0,
    unknown = 0;
  for (const d of items) {
    if (d.status === "ONLINE") online++;
    else if (d.status === "OFFLINE") offline++;
    else unknown++;
  }
  return { total: items.length, online, offline, unknown };
}

function pushLiveActivity(qc: QueryClient, entry: LiveActivity) {
  qc.setQueryData<LiveActivity[]>(qk.liveActivity, (prev = []) => {
    const rest = prev.filter((e) => e.key !== entry.key);
    return [entry, ...rest].slice(0, LIVE_ACTIVITY_MAX);
  });
}

// ── Handler per event ────────────────────────────────────────────────────────

function onTelemetry(qc: QueryClient, readings: SensorReading[]) {
  qc.setQueryData<ReadingMap>(qk.readings, (prev) => mergeReadings(prev, readings));
  for (const r of readings) {
    if (qc.getQueryData(qk.sensorLatest(r.sensorId)) !== undefined) {
      qc.setQueryData<SensorReading>(qk.sensorLatest(r.sensorId), (prev) => (prev && !isNewer(r, prev) ? prev : r));
    }
  }
}

function onDeviceStatus(qc: QueryClient, s: DeviceStatus) {
  qc.setQueryData<DashboardOverview>(qk.overview, (o) => {
    if (!o) return o;
    const items = upsertById(o.devices.items, s);
    return { ...o, devices: { ...o.devices, ...recountDevices(items), items } };
  });
  const patch = (d: Device): Device => ({
    ...d,
    status: s.status,
    lastSeenAt: s.lastSeenAt,
    powerSource: s.powerSource,
    powerSourceUpdatedAt: s.powerSourceUpdatedAt,
  });
  qc.setQueryData<Device[]>(qk.devices, (list) => list?.map((d) => (d.id === s.id ? patch(d) : d)));
  qc.setQueryData<Device>(qk.device(s.id), (d) => (d ? patch(d) : d));
  qc.setQueryData<DeviceStatus>(qk.deviceStatus(s.id), (prev) => (prev ? s : prev));
}

function onActuatorStatus(qc: QueryClient, s: ActuatorStatus) {
  qc.setQueryData<DashboardOverview>(qk.overview, (o) => (o ? { ...o, actuators: upsertById(o.actuators, s) } : o));
  const patch = (a: Actuator): Actuator => ({ ...a, enabled: s.enabled, currentState: s.currentState, stateUpdatedAt: s.stateUpdatedAt });
  qc.setQueryData<Actuator[]>(qk.actuators, (list) => list?.map((a) => (a.id === s.id ? patch(a) : a)));
  qc.setQueryData<Actuator>(qk.actuator(s.id), (a) => (a ? patch(a) : a));
}

function onCommand(qc: QueryClient, c: ActuatorCommand) {
  qc.setQueryData<ActuatorCommand>(qk.command(c.commandUid), c);
  qc.setQueriesData<Page<ActuatorCommand>>({ queryKey: qk.actuatorCommandsRoot(c.actuatorId) }, (page) => {
    if (!page) return page;
    if (page.content.some((x) => x.id === c.id)) {
      return { ...page, content: page.content.map((x) => (x.id === c.id ? c : x)) };
    }
    if (page.page !== 0) return page;
    return { ...page, content: [c, ...page.content].slice(0, page.size), totalElements: page.totalElements + 1 };
  });
  pushLiveActivity(qc, { key: `cmd:${c.commandUid}`, kind: "ACTUATOR_COMMAND", at: c.executedAt ?? c.sentAt ?? c.requestedAt, command: c });
}

function alertMatches(f: AlertFilters, a: Alert) {
  return (f.acknowledged === undefined || f.acknowledged === a.acknowledged) && (f.severity === undefined || f.severity === a.severity);
}

function onAlert(qc: QueryClient, a: Alert) {
  qc.setQueryData<DashboardOverview>(qk.overview, (o) => {
    if (!o || o.alerts.active.some((x) => x.id === a.id)) return o;
    const unacked = a.acknowledged ? 0 : 1;
    return {
      ...o,
      alerts: {
        unacknowledged: o.alerts.unacknowledged + unacked,
        critical: o.alerts.critical + (a.severity === "CRITICAL" ? unacked : 0),
        warning: o.alerts.warning + (a.severity === "WARNING" ? unacked : 0),
        active: a.acknowledged ? o.alerts.active : [a, ...o.alerts.active].slice(0, OVERVIEW_ALERTS_MAX),
      },
    };
  });
  for (const [key, page] of qc.getQueriesData<Page<Alert>>({ queryKey: qk.alertsRoot })) {
    const f = (key[1] ?? {}) as AlertFilters;
    if (!page || page.page !== 0 || !alertMatches(f, a) || page.content.some((x) => x.id === a.id)) continue;
    qc.setQueryData<Page<Alert>>(key, { ...page, content: [a, ...page.content].slice(0, page.size), totalElements: page.totalElements + 1 });
  }
  pushLiveActivity(qc, { key: `alert:${a.id}`, kind: "ALERT", at: a.createdAt, alert: a });
}

export function detectionMatches(f: DetectionFilter, d: AiDetection) {
  switch (f.kind) {
    case "station":
      return d.stationCode === f.stationCode;
    case "device":
      return d.deviceId === f.deviceId;
    case "type":
      return d.detectionType === f.detectionType;
    default:
      return true;
  }
}

function onDetection(qc: QueryClient, d: AiDetection) {
  qc.setQueryData<DashboardOverview>(qk.overview, (o) => (o ? { ...o, latestAiDetection: d } : o));
  for (const [key, page] of qc.getQueriesData<Page<AiDetection>>({ queryKey: qk.detectionsRoot })) {
    const f = key[2] as DetectionFilter | undefined;
    if (!page || !f || page.page !== 0 || !detectionMatches(f, d) || page.content.some((x) => x.id === d.id)) continue;
    qc.setQueryData<Page<AiDetection>>(key, { ...page, content: [d, ...page.content].slice(0, page.size), totalElements: page.totalElements + 1 });
  }
}

/**
 * Terapkan satu pesan dari /topic/events. Mengembalikan false untuk event yang tidak dikenal
 * atau data yang tidak sesuai kontrak — keduanya diabaikan dengan aman.
 */
export function applyRealtimeEvent(qc: QueryClient, raw: unknown): boolean {
  const env = envelopeSchema.safeParse(raw);
  if (!env.success) return false;
  const { event, data } = env.data;

  switch (event) {
    case "SENSOR_READING_UPDATED": {
      const p = telemetryEventSchema.safeParse(data);
      if (!p.success) return false;
      onTelemetry(qc, p.data.readings);
      return true;
    }
    case "DEVICE_STATUS_CHANGED": {
      const p = deviceStatusSchema.safeParse(data);
      if (!p.success) return false;
      onDeviceStatus(qc, p.data);
      return true;
    }
    case "ACTUATOR_STATUS_CHANGED": {
      const p = actuatorStatusSchema.safeParse(data);
      if (!p.success) return false;
      onActuatorStatus(qc, p.data);
      return true;
    }
    case "ACTUATOR_COMMAND_UPDATED": {
      const p = actuatorCommandSchema.safeParse(data);
      if (!p.success) return false;
      onCommand(qc, p.data);
      return true;
    }
    case "ALERT_CREATED": {
      const p = alertSchema.safeParse(data);
      if (!p.success) return false;
      onAlert(qc, p.data);
      return true;
    }
    case "AI_DETECTION_CREATED": {
      const p = aiDetectionSchema.safeParse(data);
      if (!p.success) return false;
      onDetection(qc, p.data);
      return true;
    }
    default:
      return false;
  }
}

/** Setelah acknowledge berhasil (tidak ada event realtime untuk ini): perbarui cache lokal. */
export function applyAcknowledged(qc: QueryClient, a: Alert) {
  qc.setQueryData<DashboardOverview>(qk.overview, (o) => {
    if (!o) return o;
    const wasActive = o.alerts.active.some((x) => x.id === a.id);
    // Hitungan backend mencakup semua alert, bukan hanya 10 di `active`, jadi selalu dikurangi.
    return {
      ...o,
      alerts: {
        unacknowledged: Math.max(0, o.alerts.unacknowledged - 1),
        critical: Math.max(0, o.alerts.critical - (a.severity === "CRITICAL" ? 1 : 0)),
        warning: Math.max(0, o.alerts.warning - (a.severity === "WARNING" ? 1 : 0)),
        active: wasActive ? o.alerts.active.filter((x) => x.id !== a.id) : o.alerts.active,
      },
    };
  });
  for (const [key, page] of qc.getQueriesData<Page<Alert>>({ queryKey: qk.alertsRoot })) {
    if (!page) continue;
    const f = (key[1] ?? {}) as AlertFilters;
    const has = page.content.some((x) => x.id === a.id);
    if (!has) continue;
    const content = f.acknowledged === false ? page.content.filter((x) => x.id !== a.id) : page.content.map((x) => (x.id === a.id ? a : x));
    qc.setQueryData<Page<Alert>>(key, { ...page, content, totalElements: page.totalElements - (page.content.length - content.length) });
  }
}
