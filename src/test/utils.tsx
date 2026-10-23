import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { ShellProvider } from "@/components/shell/shell-context";
import { saveSession } from "@/lib/auth/session";
import type { Alert, DashboardOverview, Page, SensorReading, User } from "@/lib/api/types";

/*
 * Bantuan test halaman. next/link & next/navigation di-mock di tiap berkas test (vi.mock harus
 * berada di berkas test itu sendiri agar di-hoist).
 */

export const t = (s: number) => new Date(Date.UTC(2026, 8, 19, 7, 0, s)).toISOString();

export function json(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));
}

export function signIn(role: User["role"] = "OPERATOR", username = "operator") {
  const far = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();
  saveSession({
    token: "tkn",
    expiresAt: far,
    refreshToken: "rt",
    refreshExpiresAt: far,
    user: { id: 1, username, fullName: "Budi Tani", role, enabled: true, mustChangePassword: false } as User,
  });
}

export function renderWithProviders(ui: ReactNode, qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })) {
  const result = render(
    <QueryClientProvider client={qc}>
      <ShellProvider alertCount={0} connection="connected">
        {ui}
      </ShellProvider>
    </QueryClientProvider>,
  );
  return { ...result, qc, user: userEvent.setup() };
}

export function reading(sensorId: number, value: number, sec: number): SensorReading {
  return {
    id: sensorId * 1000 + sec, sensorId, sensorCode: `S${sensorId}`, metricKey: `m.${sensorId}`, deviceId: 1, deviceCode: "D",
    value, textValue: null, unit: "C", recordedAt: t(sec), receivedAt: t(sec),
  };
}

export function alert(id: number, severity: Alert["severity"] = "WARNING", acknowledged = false): Alert {
  return {
    id, type: "UJI_LAINNYA", severity, title: `Peringatan ${id}`, message: "Pesan", source: "DEVICE", relatedDeviceId: null,
    relatedDeviceCode: null, relatedSensorId: null, relatedSensorCode: null, relatedActuatorId: null, relatedActuatorCode: null,
    acknowledged, acknowledgedBy: acknowledged ? "operator" : null, acknowledgedAt: acknowledged ? t(5) : null, createdAt: t(id),
  };
}

export function overview(): DashboardOverview {
  return {
    system: { mode: "PRODUCTION", messagingTransport: "mqtt", messagingConnected: true, generatedAt: t(0) },
    devices: { total: 0, online: 0, offline: 0, unknown: 0, items: [] },
    sensors: { total: 1, enabled: 1, latestReadings: [reading(1, 21.5, 0)] },
    actuators: [],
    alerts: { unacknowledged: 2, critical: 1, warning: 1, active: [] },
    recentActivity: [],
  } as DashboardOverview;
}

export const page = <T,>(content: T[]): Page<T> => ({ content, page: 0, size: 20, totalElements: content.length, totalPages: 1, last: true });
