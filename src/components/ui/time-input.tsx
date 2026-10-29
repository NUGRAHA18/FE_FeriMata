"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Isian jam & lama siram yang cukup diketik (tanpa <input type="time"> bawaan yang ikut AM/PM locale,
 * tanpa tombol +/−). Keyboard angka di HP, huruf besar, titik dua disisipkan otomatis, dan pilihan
 * cepat yang paling sering dipakai. Kesalahan diberi tahu tanpa menghapus isian.
 */

const pad = (n: number) => String(n).padStart(2, "0");

/* ── Jam ─────────────────────────────────────────────────────────────────── */

export const QUICK_TIMES = ["06:00", "08:00", "16:00", "17:00"];

/**
 * Rapikan ketikan jam: "." / "," dianggap ":", titik dua disisipkan sendiri.
 * "0600" → "06:00", "600" → "6:00", "060" → "06:0", "2400" → "24:00", "6.3" → "6:3".
 */
export function formatTimeTyping(raw: string): string {
  const t = raw.replace(/[.,]/g, ":");
  if (t.includes(":")) {
    const [h, m = ""] = t.split(":");
    return `${h.replace(/\D/g, "").slice(0, 2)}:${m.replace(/\D/g, "").slice(0, 2)}`;
  }
  const d = t.replace(/\D/g, "");
  if (d.length <= 2) return d;
  // Angka pertama 3–9 pasti jam satu digit ("600" → 6:00, "930" → 9:30); selain itu dua angka pertama
  // adalah jam ("0600" → 06:00, "2400" → 24:00). Salah ketik tidak diam-diam berubah jadi jam lain;
  // yang tidak sah (24:00, 25:75) ditolak saat disimpan dengan pesan.
  return d[0] >= "3" ? `${d[0]}:${d.slice(1, 3)}` : `${d.slice(0, 2)}:${d.slice(2, 4)}`;
}

/** Ketikan jam → "HH:mm", atau null bila bukan jam yang sah. "6" → "06:00", "6:5" → "06:05". */
export function parseTimeText(text: string): string | null {
  const t = formatTimeTyping(text.trim());
  if (!t) return null;
  const [hs, ms = ""] = t.split(":");
  if (!/^\d{1,2}$/.test(hs) || !/^\d{0,2}$/.test(ms)) return null;
  const h = Number(hs);
  const m = ms === "" ? 0 : Number(ms);
  return h <= 23 && m <= 59 ? `${pad(h)}:${pad(m)}` : null;
}

/* ── Lama ────────────────────────────────────────────────────────────────── */

/** Detik → isian menit: 300 → "5", 90 → "1,5", 100 → "1,67". */
export function minutesText(seconds: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2, useGrouping: false }).format(seconds / 60);
}

/** Isian menit (koma/titik desimal boleh) → detik dibulatkan; null bila bukan angka. "1,5" → 90. */
export function parseMinutes(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  return Math.round(Number(t) * 60);
}

/** "15 menit", "1 menit 30 detik". */
export function durationWords(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return [m && `${m} menit`, s && `${s} detik`].filter(Boolean).join(" ") || "0 detik";
}

/* ── Tampilan ────────────────────────────────────────────────────────────── */

type BigInputProps = { label: ReactNode; hint?: ReactNode; error?: string | null; suffix?: ReactNode; children?: ReactNode } & Omit<ComponentProps<"input">, "children">;

function BigInput({ label, hint, error, suffix, children, ...props }: BigInputProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-ink-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? msgId : undefined}
          className={cn(
            "tabular h-14 w-full rounded-control bg-card-2 px-4 text-[1.75rem] font-semibold tracking-tight text-ink ring-1 ring-line outline-none transition placeholder:font-normal placeholder:text-muted focus:ring-2 focus:ring-accent aria-invalid:ring-2 aria-invalid:ring-danger",
            suffix ? "pr-20" : undefined,
          )}
          {...props}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base text-muted">{suffix}</span>}
      </div>
      {(error || hint) && (
        <p id={msgId} role={error ? "alert" : undefined} className={cn("text-sm", error ? "text-danger-ink" : "text-muted")}>
          {error || hint}
        </p>
      )}
      {children}
    </div>
  );
}

function QuickChoices({ label, options, selected, onPick }: { label: string; options: { value: string; text: string }[]; selected: string | null; onPick: (v: string) => void }) {
  if (!options.length) return null;
  return (
    // Kolom sama lebar (bukan flex-wrap) supaya di HP 360 px pilihan tidak terpecah 3 + 1.
    <div role="group" aria-label={label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const on = o.value === selected;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onPick(o.value)}
            className={cn(
              "tabular h-11 min-w-0 rounded-control px-1 text-base font-semibold whitespace-nowrap ring-1 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              on ? "bg-accent text-accent-fg ring-accent" : "bg-card text-ink ring-line hover:bg-accent-soft",
            )}
          >
            {o.text}
          </button>
        );
      })}
    </div>
  );
}

/** Kotak jam yang diketik (24 jam, "HH:MM"). `value` adalah teks ketikan; rapikan dengan parseTimeText saat simpan. */
export function TimeInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string | null }) {
  return (
    <BigInput
      label="Jam siram (WIB, 24 jam)"
      inputMode="numeric"
      autoComplete="off"
      placeholder="06:00"
      maxLength={5}
      value={value}
      onChange={(e) => onChange(formatTimeTyping(e.target.value))}
      onBlur={() => {
        const t = parseTimeText(value);
        if (t) onChange(t);
      }}
      error={error}
      hint="Ketik jamnya, misalnya 0600 atau 17:30."
    >
      <QuickChoices label="Jam yang sering dipakai" options={QUICK_TIMES.map((t) => ({ value: t, text: t }))} selected={parseTimeText(value)} onPick={onChange} />
    </BigInput>
  );
}

/** Lama siram dalam menit (koma boleh). `value` teks ketikan; ubah ke detik dengan parseMinutes. */
export function DurationInput({ value, onChange, max, error }: { value: string; onChange: (v: string) => void; max: number | null; error?: string | null }) {
  const quick = [3, 5, 10].filter((m) => max == null || m * 60 <= max);
  const seconds = parseMinutes(value);
  return (
    <BigInput
      label="Lama siram"
      inputMode="decimal"
      autoComplete="off"
      placeholder="5"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
      suffix="menit"
      error={error}
      hint={`${max != null ? `Paling lama ${durationWords(max)}. ` : ""}Boleh pakai koma: 1,5 = 1 menit 30 detik.`}
    >
      <QuickChoices
        label="Lama yang sering dipakai"
        options={quick.map((m) => ({ value: String(m), text: `${m} menit` }))}
        selected={seconds != null && seconds % 60 === 0 ? String(seconds / 60) : null}
        onPick={onChange}
      />
    </BigInput>
  );
}
