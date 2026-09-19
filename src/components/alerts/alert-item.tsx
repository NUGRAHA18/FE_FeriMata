"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Inset } from "@/components/ui/card";
import { Chip, StatusDot, type Tone } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useAcknowledgeAlert } from "@/lib/api/queries";
import type { Alert } from "@/lib/api/types";
import { alertTypeLabel, formatDateTime, severityLabel, sourceLabel } from "@/lib/format";
import { cn } from "@/lib/cn";

export const severityTone: Record<string, Tone> = { INFO: "info", WARNING: "warn", CRITICAL: "danger" };

function RelatedLinks({ a }: { a: Alert }) {
  const links: { href: string; label: string }[] = [];
  if (a.relatedDeviceId != null) links.push({ href: `/devices/${a.relatedDeviceId}`, label: a.relatedDeviceCode ?? `Perangkat #${a.relatedDeviceId}` });
  if (a.relatedSensorId != null) links.push({ href: `/sensors/${a.relatedSensorId}`, label: a.relatedSensorCode ?? `Sensor #${a.relatedSensorId}` });
  if (a.relatedActuatorId != null)
    links.push({ href: `/actuators/${a.relatedActuatorId}`, label: a.relatedActuatorCode ?? `Aktuator #${a.relatedActuatorId}` });
  if (!links.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="rounded-md bg-card px-2 py-0.5 font-mono text-[11px] text-ink-2 hover:bg-active hover:text-active-fg"
        >
          #{l.label}
        </Link>
      ))}
    </div>
  );
}

export function AlertItem({ alert: a, compact }: { alert: Alert; compact?: boolean }) {
  const ack = useAcknowledgeAlert();
  const tone = severityTone[a.severity] ?? "neutral";
  // 409 = sudah di-acknowledge (mis. oleh operator lain) — bukan kegagalan bagi pengguna.
  const alreadyAcked = ack.error && (ack.error as { status?: number }).status === 409;
  return (
    <Inset className={cn(a.acknowledged && "opacity-75")}>
      <div className="flex items-start gap-2.5">
        <StatusDot tone={tone} className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-medium text-ink">{a.title}</p>
            <Chip tone={tone} className="py-0.5 text-[11px]">
              {severityLabel[a.severity] ?? a.severity}
            </Chip>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            {alertTypeLabel(a.type)} • {sourceLabel[a.source] ?? a.source} • <RelativeTime iso={a.createdAt} />
          </p>
          {!compact && a.message && <p className="mt-1.5 text-sm text-ink-2">{a.message}</p>}
          {compact && a.message && <p className="mt-1 line-clamp-2 text-xs text-ink-2">{a.message}</p>}
          <RelatedLinks a={a} />
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {a.acknowledged ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Check aria-hidden className="size-3.5 text-accent" />
                Di-acknowledge {a.acknowledgedBy ? `oleh ${a.acknowledgedBy}` : ""} · {formatDateTime(a.acknowledgedAt)}
              </span>
            ) : (
              <Button size="sm" variant="dark" icon={Check} loading={ack.isPending} onClick={() => ack.mutate(a.id)}>
                Acknowledge
              </Button>
            )}
            {ack.error && (
              <span role="alert" className={cn("text-xs", alreadyAcked ? "text-muted" : "text-danger-ink")}>
                {alreadyAcked ? "Alert ini sudah di-acknowledge sebelumnya." : errorMessage(ack.error)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Inset>
  );
}
