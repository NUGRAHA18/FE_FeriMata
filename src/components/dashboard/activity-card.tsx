"use client";

import { AlertTriangle, CheckCircle2, CircleMinus, ListChecks, Loader2, OctagonAlert, XCircle } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useLiveActivity, useOverview } from "@/lib/api/queries";
import type { ActivityEntry } from "@/lib/api/types";
import { commandStatusLabel, severityLabel, sourceLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export function isOnState(state: string | null | undefined) {
  return !!state && state.toUpperCase() === "ON";
}

type FeedItem = { key: string; at: string; title: string; detail: string; icon: "EXECUTED" | "PENDING" | "FAILED" | "CANCELLED" | "WARNING" | "CRITICAL" | "INFO" };

const icons = {
  EXECUTED: <CheckCircle2 aria-hidden className="size-[18px] text-accent" strokeWidth={1.8} />,
  PENDING: <Loader2 aria-hidden className="size-[18px] animate-spin text-ink-2" strokeWidth={1.8} />,
  FAILED: <XCircle aria-hidden className="size-[18px] text-danger" strokeWidth={1.8} />,
  CANCELLED: <CircleMinus aria-hidden className="size-[18px] text-muted" strokeWidth={1.8} />,
  WARNING: <AlertTriangle aria-hidden className="size-[18px] text-warn" strokeWidth={1.8} />,
  CRITICAL: <OctagonAlert aria-hidden className="size-[18px] text-danger" strokeWidth={1.8} />,
  INFO: <AlertTriangle aria-hidden className="size-[18px] text-info" strokeWidth={1.8} />,
};

const iconText: Record<FeedItem["icon"], string> = {
  EXECUTED: "Berhasil",
  PENDING: "Menunggu konfirmasi",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  WARNING: "Peringatan",
  CRITICAL: "Kritis",
  INFO: "Info",
};

function commandIcon(status: string): FeedItem["icon"] {
  if (status === "EXECUTED" || status === "FAILED" || status === "CANCELLED") return status;
  return "PENDING";
}

/** Entri overview backend: summary "ON DIST-PUMP on PANEL-01", detail "EXECUTED, requested by operator". */
export function fromOverviewEntry(e: ActivityEntry, i: number): FeedItem {
  if (e.kind === "ACTUATOR_COMMAND") {
    const s = /^(\S+) (\S+) on (\S+)$/.exec(e.summary);
    const d = /^(\w+), requested by (.+)$/.exec(e.detail ?? "");
    const status = d?.[1] ?? "";
    return {
      key: `o${i}`,
      at: e.at,
      title: s ? `${s[2]} → ${s[1]}` : e.summary,
      detail: d ? `${commandStatusLabel[status] ?? status} · oleh ${sourceLabel[d[2]] ?? d[2]}${s ? ` · ${s[3]}` : ""}` : (e.detail ?? ""),
      icon: commandIcon(status),
    };
  }
  if (e.kind === "ALERT") {
    const sev = (e.detail ?? "").split(":")[0];
    const msg = (e.detail ?? "").slice(sev.length + 1).trim();
    return {
      key: `o${i}`,
      at: e.at,
      title: e.summary,
      detail: msg ? `${severityLabel[sev] ?? sev} · ${msg}` : (e.detail ?? ""),
      icon: sev === "CRITICAL" ? "CRITICAL" : sev === "INFO" ? "INFO" : "WARNING",
    };
  }
  return { key: `o${i}`, at: e.at, title: e.summary, detail: e.detail ?? "", icon: "INFO" };
}

/** Kartu Aktivitas: feed perintah & alert + progress aktuator yang sedang ON. */
export function ActivityCard({ className }: { className?: string }) {
  const overview = useOverview((o) => ({
    on: o.actuators.filter((a) => isOnState(a.currentState)).length,
    total: o.actuators.length,
    entries: o.recentActivity,
  }));
  const live = useLiveActivity();
  const d = overview.data;

  const feed: FeedItem[] = [
    ...live.map<FeedItem>((l) =>
      l.kind === "ACTUATOR_COMMAND"
        ? {
            key: l.key,
            at: l.at,
            title: `${l.command.actuatorCode} → ${l.command.commandType}`,
            detail: `${commandStatusLabel[l.command.status] ?? l.command.status} · oleh ${l.command.requestedBy ?? sourceLabel[l.command.source] ?? l.command.source} · ${l.command.deviceCode}`,
            icon: commandIcon(l.command.status),
          }
        : {
            key: l.key,
            at: l.at,
            title: l.alert.title,
            detail: `${severityLabel[l.alert.severity] ?? l.alert.severity} · ${l.alert.message}`,
            icon: l.alert.severity === "CRITICAL" ? "CRITICAL" : l.alert.severity === "INFO" ? "INFO" : "WARNING",
          },
    ),
    ...(d?.entries ?? []).map(fromOverviewEntry),
  ].slice(0, 15);

  const pct = d && d.total ? Math.round((d.on / d.total) * 100) : 0;

  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader title="Aktivitas & Kontrol" icon={ListChecks} href="/actuators" hrefLabel="Buka kontrol aktuator" />
      {overview.error ? (
        <ErrorState message={errorMessage(overview.error)} onRetry={() => overview.refetch()} />
      ) : !d ? (
        <>
          <Skeleton className="h-2 w-full" />
          <div className="mt-3 flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-inner" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="tabular font-medium text-ink">{pct}%</span>
              <span className="text-muted">
                <span className="tabular">
                  {d.on}/{d.total}
                </span>{" "}
                aktuator menyala
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-label="Aktuator yang sedang menyala"
              aria-valuemin={0}
              aria-valuemax={d.total}
              aria-valuenow={d.on}
            >
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {feed.length === 0 ? (
            <EmptyState className="mt-3" title="Belum ada aktivitas" hint="Perintah aktuator dan alert akan muncul di sini." />
          ) : (
            <ol className="scroll-thin -mx-1 mt-3 flex max-h-[420px] flex-col gap-2 overflow-y-auto px-1">
              {feed.map((f) => (
                <li key={f.key} className="flex items-start gap-3 rounded-inner bg-card-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{f.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{f.detail}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      <RelativeTime iso={f.at} />
                    </p>
                  </div>
                  <span className="mt-0.5 shrink-0">
                    {icons[f.icon]}
                    <span className="sr-only">{iconText[f.icon]}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </Card>
  );
}
