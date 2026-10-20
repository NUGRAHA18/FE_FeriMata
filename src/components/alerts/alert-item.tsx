"use client";

import Link from "next/link";
import { AlertTriangle, Check, Info, OctagonAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Inset } from "@/components/ui/card";
import { Chip, type Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useAcknowledgeAlert } from "@/lib/api/queries";
import type { Alert } from "@/lib/api/types";
import { useCanWrite } from "@/lib/auth/use-session";
import { alertTypeLabel, formatDateTime, severityLabel, sourceLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export const severityTone: Record<string, Tone> = { INFO: "info", WARNING: "warn", CRITICAL: "danger" };

const severityIcon: Record<string, LucideIcon> = { INFO: Info, WARNING: AlertTriangle, CRITICAL: OctagonAlert };
const severityBubble: Record<string, string> = {
  INFO: "bg-info-soft text-info",
  WARNING: "bg-warn-soft text-warn-ink",
  CRITICAL: "bg-danger-soft text-danger-ink",
};

function RelatedLinks({ a }: { a: Alert }) {
  const links: { href: string; label: string }[] = [];
  if (a.relatedDeviceId != null) links.push({ href: `/devices/${a.relatedDeviceId}`, label: `Alat ${a.relatedDeviceCode ?? `#${a.relatedDeviceId}`}` });
  if (a.relatedSensorId != null) links.push({ href: `/sensors/${a.relatedSensorId}`, label: `Sensor ${a.relatedSensorCode ?? `#${a.relatedSensorId}`}` });
  if (a.relatedActuatorId != null) links.push({ href: `/actuators/${a.relatedActuatorId}`, label: `Kontrol ${a.relatedActuatorCode ?? `#${a.relatedActuatorId}`}` });
  if (!links.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="rounded-md bg-card px-2 py-1 text-xs font-medium text-ink-2 hover:bg-active hover:text-active-fg">
          {l.label} →
        </Link>
      ))}
    </div>
  );
}

/** Satu peringatan: ikon tingkat, judul, pesan, lalu satu tombol "Tandai sudah ditangani". */
export function AlertItem({ alert: a, compact }: { alert: Alert; compact?: boolean }) {
  const ack = useAcknowledgeAlert();
  const canWrite = useCanWrite();
  const tone = severityTone[a.severity] ?? "neutral";
  const Icon = severityIcon[a.severity] ?? Info;
  // 409 = sudah ditangani (mis. oleh operator lain) — bukan kegagalan bagi pengguna.
  const alreadyAcked = ack.error && (ack.error as { status?: number }).status === 409;
  return (
    <Inset className={cn(a.acknowledged && "opacity-75")}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", severityBubble[a.severity] ?? "bg-sunken text-ink-2")}>
          <Icon aria-hidden className="size-[18px]" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium text-ink">{alertTypeLabel(a.type) === a.type ? a.title : alertTypeLabel(a.type)}</p>
            <Chip tone={tone} icon={false} className="py-0.5 text-[11px]">
              {severityLabel[a.severity] ?? a.severity}
            </Chip>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {sourceLabel[a.source] ?? a.source} • <RelativeTime iso={a.createdAt} />
          </p>
          {a.message && <p className={cn("mt-1.5 text-ink-2", compact ? "line-clamp-2 text-sm" : "text-sm")}>{a.message}</p>}
          <RelatedLinks a={a} />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {a.acknowledged ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Check aria-hidden className="size-3.5 text-accent" />
                Sudah ditangani {a.acknowledgedBy ? `oleh ${a.acknowledgedBy}` : ""} · {formatDateTime(a.acknowledgedAt)}
              </span>
            ) : canWrite ? (
              <Button size="md" variant="dark" icon={Check} loading={ack.isPending} onClick={() => ack.mutate(a.id)}>
                Tandai sudah ditangani
              </Button>
            ) : (
              <span className="text-xs text-muted">Belum ditangani</span>
            )}
            {ack.error && (
              <span role="alert" className={cn("text-xs", alreadyAcked ? "text-muted" : "text-danger-ink")}>
                {alreadyAcked ? "Peringatan ini sudah ditangani sebelumnya." : errorMessage(ack.error)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Inset>
  );
}
