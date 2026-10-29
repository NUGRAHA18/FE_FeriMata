"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, CircleMinus, Info, ListChecks, Loader2, OctagonAlert, XCircle, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { softTone, type Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { commandStatusText, describeCommandFailure, isNoResponse } from "@/lib/actuator-safety";
import { errorMessage } from "@/lib/api/client";
import { useLiveActivity, useOverview } from "@/lib/api/queries";
import type { ActivityEntry } from "@/lib/api/types";
import { alertBody, alertFailureCode, alertHeadline, commandStatusLabel, severityLabel, sourceLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export function isOnState(state: string | null | undefined) {
  return !!state && state.toUpperCase() === "ON";
}

type FeedItem = { key: string; kind: "ALERT" | "COMMAND"; at: string; title: string; detail: string; icon: "EXECUTED" | "PENDING" | "FAILED" | "CANCELLED" | "WARNING" | "CRITICAL" | "INFO" };

/*
 * Semua kejadian memakai kartu putih yang sama; warnanya hanya di kotak ikon kecil. Warna diambil
 * dari status perintah / tingkat peringatan di data (bukan ditebak dari teks judul), dan bentuk
 * ikonnya berbeda per jenis supaya tidak hanya mengandalkan warna.
 */
const feedIcon: Record<FeedItem["icon"], { icon: LucideIcon; tone: Tone; spin?: boolean }> = {
  EXECUTED: { icon: CheckCircle2, tone: "ok" },
  PENDING: { icon: Loader2, tone: "neutral", spin: true },
  FAILED: { icon: XCircle, tone: "danger" },
  CANCELLED: { icon: CircleMinus, tone: "neutral" },
  WARNING: { icon: AlertTriangle, tone: "warn" },
  CRITICAL: { icon: OctagonAlert, tone: "danger" },
  INFO: { icon: Info, tone: "info" },
};

/** Jumlah kejadian yang langsung tampil; sisanya di balik tombol "Tampilkan N lagi". */
const FEED_PREVIEW = 5;

/** Judul berupa kode mentah (mis. SMOKE_WARN_1793032988) — belum ada terjemahannya, tampil apa adanya. */
const isCode = (t: string) => /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/.test(t.trim());

const iconText: Record<FeedItem["icon"], string> = {
  EXECUTED: "Berhasil",
  PENDING: "Menunggu jawaban alat",
  FAILED: "Gagal",
  CANCELLED: "Dibatalkan",
  WARNING: "Perlu perhatian",
  CRITICAL: "Darurat",
  INFO: "Info",
};

function commandIcon(status: string): FeedItem["icon"] {
  if (status === "EXECUTED" || status === "FAILED" || status === "CANCELLED") return status;
  return "PENDING";
}

const commandVerbs: Record<string, string> = {
  ON: "dinyalakan",
  OFF: "dimatikan",
  START: "dimulai",
  STOP: "dihentikan",
  HOME: "dikembalikan ke posisi awal",
  GOTO_STATION: "dipindahkan ke stasiun",
};

function commandVerb(commandType: string) {
  return commandVerbs[commandType.toUpperCase()] ?? commandType;
}

/** " · alasan" untuk perintah gagal (BE-7), kosong selain itu. */
function failureSuffix(c: { status: string; failureCode?: string | null; errorMessage: string | null }): string {
  const f = c.status === "FAILED" ? describeCommandFailure(c) : null;
  return f ? ` · ${f.message}` : "";
}

function severityIcon(sev: string | null | undefined): FeedItem["icon"] {
  return sev === "CRITICAL" ? "CRITICAL" : sev === "INFO" ? "INFO" : "WARNING";
}

/**
 * Entri overview backend. Field terstruktur (status, commandType, actuatorCode, actor) dipakai bila
 * ada; `summary`/`detail` hanya cadangan untuk backend lama yang belum mengirimnya.
 */
export function fromOverviewEntry(e: ActivityEntry, i: number): FeedItem {
  const key = e.refId != null ? `o-${e.kind}-${e.refId}` : `o${i}`;
  if (e.kind === "ACTUATOR_COMMAND") {
    const s = /^(\S+) (\S+) on (\S+)$/.exec(e.summary);
    const d = /^(\w+), requested by (.+)$/.exec(e.detail ?? "");
    const status = e.status ?? d?.[1] ?? "";
    const commandType = e.commandType ?? s?.[1] ?? "";
    const actuatorCode = e.actuatorCode ?? s?.[2] ?? "";
    const actor = e.actor ?? d?.[2] ?? "";
    return {
      key,
      kind: "COMMAND",
      at: e.at,
      title: actuatorCode ? `${actuatorCode} ${commandVerb(commandType)}` : e.summary,
      detail:
        `${commandStatusText({ status, failureCode: e.failureCode }, commandStatusLabel)}${actor ? ` · oleh ${sourceLabel[actor] ?? actor}` : ""}` +
        failureSuffix({ status, failureCode: e.failureCode ?? null, errorMessage: null }),
      icon: isNoResponse({ status, failureCode: e.failureCode }) ? "WARNING" : commandIcon(status),
    };
  }
  if (e.kind === "ALERT") {
    const sev = e.status ?? (e.detail ?? "").split(":")[0];
    const msg = e.status ? (e.detail ?? "").replace(/^[A-Z]+:\s*/, "") : (e.detail ?? "").slice(sev.length + 1).trim();
    return {
      key,
      kind: "ALERT",
      at: e.at,
      title: alertHeadline(e.alertType ?? null, e.summary, e.failureCode),
      detail: msg
        ? `${severityLabel[sev] ?? sev} · ${alertBody(msg, { failureCode: e.failureCode, deviceCode: e.deviceCode, actuatorCode: e.actuatorCode, type: e.alertType })}`
        : (e.detail ?? ""),
      icon: severityIcon(sev),
    };
  }
  return { key, kind: "ALERT", at: e.at, title: e.summary, detail: e.detail ?? "", icon: "INFO" };
}

/** Kartu Aktivitas: apa yang baru saja terjadi (perintah & peringatan) + berapa alat yang sedang menyala. */
export function ActivityCard({ className }: { className?: string }) {
  const overview = useOverview((o) => ({
    on: o.actuators.filter((a) => isOnState(a.currentState)).length,
    total: o.actuators.length,
    entries: o.recentActivity,
  }));
  const live = useLiveActivity();
  const [showAll, setShowAll] = useState(false);
  const d = overview.data;

  const feed: FeedItem[] = [
    ...live.map<FeedItem>((l) =>
      l.kind === "ACTUATOR_COMMAND"
        ? {
          key: l.key,
          kind: "COMMAND",
          at: l.at,
          title: `${l.command.actuatorCode} ${commandVerb(l.command.commandType)}`,
          detail:
            `${commandStatusText(l.command, commandStatusLabel)} · oleh ${l.command.requestedBy ?? sourceLabel[l.command.source] ?? l.command.source}` +
            failureSuffix(l.command),
          icon: isNoResponse(l.command) ? "WARNING" : commandIcon(l.command.status),
        }
        : {
          key: l.key,
          kind: "ALERT",
          at: l.at,
          title: alertHeadline(l.alert.type, l.alert.title, alertFailureCode(l.alert.metadata)),
          detail: `${severityLabel[l.alert.severity] ?? l.alert.severity} · ${alertBody(l.alert.message, {
            failureCode: alertFailureCode(l.alert.metadata),
            deviceCode: l.alert.relatedDeviceCode,
            actuatorCode: l.alert.relatedActuatorCode,
            type: l.alert.type,
            metadata: l.alert.metadata,
          })}`,
          icon: severityIcon(l.alert.severity),
        },
    ),
    ...(d?.entries ?? []).map(fromOverviewEntry),
  ].slice(0, 15);

  const pct = d && d.total ? Math.round((d.on / d.total) * 100) : 0;

  return (
    <Card className={cn("flex min-w-0 flex-col", className)}>
      <CardHeader title="Baru saja terjadi" icon={ListChecks} href="/actuators" hrefLabel="Buka halaman kontrol" />
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
            <div className="flex items-baseline justify-between text-sm">
              <span className="tabular text-base font-bold text-ink">{pct}%</span>
              <span className="text-ink-2">
                <span className="tabular">
                  {d.on} dari {d.total}
                </span>{" "}
                alat sedang menyala
              </span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-label="Alat yang sedang menyala"
              aria-valuemin={0}
              aria-valuemax={d.total}
              aria-valuenow={d.on}
            >
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {feed.length === 0 ? (
            <EmptyState className="mt-3" title="Belum ada kejadian" hint="Perintah ke alat dan peringatan akan muncul di sini." />
          ) : (
            // Tanpa area gulir di dalam kartu (scrollbar ganda di dalam halaman yang juga bergulir):
            // tampilkan beberapa kejadian terbaru, sisanya lewat tombol.
            <ol className="mt-4 flex flex-col gap-2">
              {(showAll ? feed : feed.slice(0, FEED_PREVIEW)).map((f) => {
                const { icon: Icon, tone, spin } = feedIcon[f.icon];
                return (
                  <li key={f.key}>
                    <Link
                      href={f.kind === "ALERT" ? "/alerts" : "/actuators"}
                      className="flex items-start gap-3 rounded-inner bg-card p-3 ring-1 ring-line transition hover:bg-card-2 hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px]", softTone[tone])}>
                        <Icon aria-hidden className={cn("size-4", spin && "animate-spin")} strokeWidth={2} />
                        <span className="sr-only">{iconText[f.icon]}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[13px] leading-5 font-semibold break-words text-ink", isCode(f.title) && "font-mono text-xs break-all")}>{f.title}</p>
                        <p className="mt-0.5 text-xs leading-[18px] break-words text-ink-2">{f.detail}</p>
                        <p className="mt-1 text-[11px] leading-4 text-muted">
                          <RelativeTime iso={f.at} />
                        </p>
                      </div>
                      <ChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-muted" strokeWidth={2} />
                    </Link>
                  </li>
                );
              })}
              {feed.length > FEED_PREVIEW && (
                <li>
                  <Button variant="ghost" size="sm" className="w-full" icon={showAll ? ChevronUp : ChevronDown} onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Tampilkan lebih sedikit" : `Tampilkan ${feed.length - FEED_PREVIEW} lagi`}
                  </Button>
                </li>
              )}
            </ol>
          )}
        </>
      )}
    </Card>
  );
}
