"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { applyAcknowledged, mergeReadings, type ReadingMap } from "@/lib/realtime/apply";
import * as api from "./endpoints";
import { qk, type LiveActivity } from "./query-keys";
import type { Actuator, ActuatorCommand, DashboardOverview, Device, Sensor, SensorReading } from "./types";

// ── Dashboard ────────────────────────────────────────────────────────────────

/** Overview: satu request untuk layar pertama. Juga menyemai peta pembacaan terakhir. */
export function useOverview<T = DashboardOverview>(select?: (o: DashboardOverview) => T) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.overview,
    queryFn: async ({ signal }) => {
      const o = await api.getOverview(signal);
      qc.setQueryData<ReadingMap>(qk.readings, (prev) => mergeReadings(prev, o.sensors.latestReadings));
      // Overview baru sudah mencakup aktivitas yang tiba lewat WebSocket sebelumnya.
      qc.setQueryData<LiveActivity[]>(qk.liveActivity, []);
      return o;
    },
    select,
  });
}

function readingsQuery<T>(select: (m: ReadingMap) => T) {
  return {
    queryKey: qk.readings,
    // Peta ini hanya diisi dari overview & WebSocket; tidak pernah di-fetch sendiri.
    queryFn: () => ({}) as ReadingMap,
    enabled: false,
    staleTime: Infinity,
    select,
  };
}

/** Pembacaan terakhir untuk satu metric key. Re-render hanya bila pembacaan itu berubah. */
export function useReadingByMetric(metricKey: string): SensorReading | undefined {
  const select = useCallback(
    (m: ReadingMap) => {
      let best: SensorReading | undefined;
      for (const r of Object.values(m)) {
        if (r.metricKey === metricKey && (!best || r.recordedAt > best.recordedAt)) best = r;
      }
      return best;
    },
    [metricKey],
  );
  return useQuery(readingsQuery(select)).data;
}

export function useReadingBySensor(sensorId: number): SensorReading | undefined {
  const select = useCallback((m: ReadingMap) => m[sensorId], [sensorId]);
  return useQuery(readingsQuery(select)).data;
}

export function useAllReadings(): ReadingMap {
  return useQuery(readingsQuery((m: ReadingMap) => m)).data ?? {};
}

export function useLiveActivity(): LiveActivity[] {
  return (
    useQuery({ queryKey: qk.liveActivity, queryFn: () => [] as LiveActivity[], enabled: false, staleTime: Infinity }).data ?? []
  );
}

// ── Perangkat ────────────────────────────────────────────────────────────────

export function useDevices<T = Device[]>(select?: (d: Device[]) => T) {
  return useQuery({ queryKey: qk.devices, queryFn: ({ signal }) => api.getDevices(signal), select });
}

export function useDevice(id: number) {
  return useQuery({ queryKey: qk.device(id), queryFn: ({ signal }) => api.getDevice(id, signal), enabled: Number.isFinite(id) });
}

export function useDeviceStatus(id: number) {
  return useQuery({ queryKey: qk.deviceStatus(id), queryFn: ({ signal }) => api.getDeviceStatus(id, signal), enabled: Number.isFinite(id) });
}

// ── Sensor ───────────────────────────────────────────────────────────────────

export function useSensors<T = Sensor[]>(select?: (s: Sensor[]) => T) {
  return useQuery({ queryKey: qk.sensors, queryFn: ({ signal }) => api.getSensors(undefined, signal), select });
}

export function useSensor(id: number) {
  return useQuery({ queryKey: qk.sensor(id), queryFn: ({ signal }) => api.getSensor(id, signal), enabled: Number.isFinite(id) });
}

/** Pembacaan terakhir satu sensor: dari peta realtime bila ada, jika tidak GET /latest (404 = belum ada). */
export function useSensorLatest(id: number) {
  const fromMap = useReadingBySensor(id);
  const q = useQuery({
    queryKey: qk.sensorLatest(id),
    queryFn: async ({ signal }) => {
      try {
        return await api.getSensorLatest(id, signal);
      } catch (e) {
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      }
    },
    enabled: Number.isFinite(id) && !fromMap,
  });
  const fromQuery = q.data ?? undefined;
  const latest = fromMap && (!fromQuery || fromMap.recordedAt >= fromQuery.recordedAt) ? fromMap : fromQuery;
  return { data: latest ?? null, isPending: !fromMap && q.isPending, error: q.error };
}

export function usePatchSensor(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: api.SensorPatch) => api.patchSensor(id, patch),
    onSuccess: (s) => {
      // Tidak ada event realtime untuk perubahan data master: perbarui cache sendiri.
      qc.setQueryData(qk.sensor(id), s);
      qc.setQueryData<Sensor[]>(qk.sensors, (list) => list?.map((x) => (x.id === id ? s : x)));
    },
  });
}

// ── Aktuator ─────────────────────────────────────────────────────────────────

export function useActuators<T = Actuator[]>(select?: (a: Actuator[]) => T) {
  return useQuery({ queryKey: qk.actuators, queryFn: ({ signal }) => api.getActuators(undefined, signal), select });
}

export function useActuator(id: number) {
  return useQuery({ queryKey: qk.actuator(id), queryFn: ({ signal }) => api.getActuator(id, signal), enabled: Number.isFinite(id) });
}

export function useActuatorCommands(id: number, page: number, size = 20) {
  return useQuery({
    queryKey: qk.actuatorCommands(id, page, size),
    queryFn: ({ signal }) => api.getActuatorCommands(id, page, size, signal),
    placeholderData: keepPreviousData,
    enabled: Number.isFinite(id),
  });
}

export function usePatchActuator(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: api.ActuatorPatch) => api.patchActuator(id, patch),
    onSuccess: (a) => {
      qc.setQueryData(qk.actuator(id), a);
      qc.setQueryData<Actuator[]>(qk.actuators, (list) => list?.map((x) => (x.id === id ? a : x)));
      qc.setQueryData<DashboardOverview>(qk.overview, (o) =>
        o ? { ...o, actuators: o.actuators.map((s) => (s.id === id ? { ...s, enabled: a.enabled } : s)) } : o,
      );
    },
  });
}

/** Status perintah yang dilacak (diisi dari respons 202 lalu event ACTUATOR_COMMAND_UPDATED). */
export function useTrackedCommand(uid: string | null): ActuatorCommand | undefined {
  return useQuery({
    queryKey: qk.command(uid ?? "-"),
    queryFn: () => undefined as unknown as ActuatorCommand,
    enabled: false,
    staleTime: Infinity,
  }).data;
}

export function useSendCommand(actuatorId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: api.CommandRequest) => api.sendActuatorCommand(actuatorId, req),
    onSuccess: (cmd) => {
      // Event realtime bisa tiba lebih dulu dari respons 202; jangan timpa status yang lebih maju.
      qc.setQueryData<ActuatorCommand>(qk.command(cmd.commandUid), (prev) => prev ?? cmd);
    },
  });
}

// ── Alert ────────────────────────────────────────────────────────────────────

export function useAlerts(f: api.AlertFilters) {
  return useQuery({ queryKey: qk.alerts(f), queryFn: ({ signal }) => api.getAlerts(f, signal), placeholderData: keepPreviousData });
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.acknowledgeAlert(id),
    onSuccess: (a) => applyAcknowledged(qc, a),
  });
}

// ── AI ───────────────────────────────────────────────────────────────────────

export function useDetections(f: api.DetectionFilter, page = 0, size = 20) {
  return useQuery({
    queryKey: qk.detections(f, page, size),
    queryFn: ({ signal }) => api.getDetections(f, page, size, signal),
    placeholderData: keepPreviousData,
  });
}

// ── Profil ───────────────────────────────────────────────────────────────────

export function useMe() {
  return useQuery({ queryKey: qk.me, queryFn: ({ signal }) => api.getMe(signal), staleTime: 5 * 60_000 });
}
