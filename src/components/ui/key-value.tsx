import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function display(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "string") return v || "—";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

/** Tabel key-value sederhana (detail entitas, metadata). */
export function KeyValue({ rows, className }: { rows: [ReactNode, ReactNode][]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line rounded-inner bg-card-2 text-sm", className)}>
      {rows.map(([k, v], i) => (
        <div key={i} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-3 px-3.5 py-2.5">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Metadata informatif dari backend (alamat Modbus, kanal, model) — tidak dipakai untuk keputusan. */
export function MetadataTable({ metadata }: { metadata: Record<string, unknown> | null }) {
  const entries = Object.entries(metadata ?? {});
  if (!entries.length) return <p className="rounded-inner bg-card-2 px-3.5 py-3 text-sm text-muted">Tidak ada metadata.</p>;
  return <KeyValue rows={entries.map(([k, v]) => [<span key={k} className="font-mono text-xs">{k}</span>, <span key={`${k}-v`} className="font-mono text-xs">{display(v)}</span>])} />;
}
