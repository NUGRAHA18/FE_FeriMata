"use client";

import { Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { errorMessage } from "@/lib/api/client";
import { downloadCsv } from "@/lib/csv";
import type { ExportResult } from "@/lib/reports";
import { cn } from "@/lib/cn";

type Status = { tone: "ok" | "warn" | "danger"; text: string } | null;

/** Tombol "Unduh CSV": mengambil data mentah saat ditekan, lalu menyimpan berkas di perangkat. */
export function ExportButton({
  run,
  filename,
  label = "Unduh CSV",
  truncatedHint,
  size = "sm",
  className,
}: {
  run: (signal: AbortSignal) => Promise<ExportResult>;
  filename: () => string;
  label?: string;
  truncatedHint?: string;
  size?: ButtonProps["size"];
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);

  async function onClick() {
    ctrl.current?.abort();
    const c = (ctrl.current = new AbortController());
    setBusy(true);
    setStatus(null);
    try {
      const r = await run(c.signal);
      if (!r.rows) {
        setStatus({ tone: "warn", text: "Tidak ada data untuk diunduh." });
        return;
      }
      downloadCsv(filename(), r.csv);
      const n = r.rows.toLocaleString("id-ID");
      setStatus(r.truncated ? { tone: "warn", text: `${n} baris terbaru diunduh. ${truncatedHint ?? "Data lebih banyak dari batas ekspor."}` } : { tone: "ok", text: `${n} baris diunduh.` });
    } catch (e) {
      if (!c.signal.aborted) setStatus({ tone: "danger", text: errorMessage(e) });
    } finally {
      if (ctrl.current === c) setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      <Button size={size} icon={Download} loading={busy} onClick={onClick}>
        {label}
      </Button>
      {status && (
        <p role="status" className={cn("text-xs", status.tone === "ok" ? "text-muted" : status.tone === "warn" ? "text-warn-ink" : "text-danger-ink")}>
          {status.text}
        </p>
      )}
    </div>
  );
}
