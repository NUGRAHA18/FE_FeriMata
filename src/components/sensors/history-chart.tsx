"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { Point } from "@/lib/history";
import { formatDate, formatDateTime, formatNumber, formatTime } from "@/lib/format";

type Props = { points: Point[]; unit: string; spanMs: number };

function ChartTooltip({ active, payload, unit }: Partial<TooltipContentProps<number, string>> & { unit: string }) {
  const p = payload?.[0]?.payload as Point | undefined;
  if (!active || !p || p.avg == null) return null;
  return (
    <div className="rounded-control bg-active px-3 py-2 text-xs text-active-fg shadow-lg">
      <p className="tabular text-sm font-medium">
        {formatNumber(p.avg)} {unit}
      </p>
      {p.min != null && p.max != null && p.min !== p.max && (
        <p className="tabular opacity-75">
          terendah {formatNumber(p.min)} · tertinggi {formatNumber(p.max)}
        </p>
      )}
      <p className="opacity-75">{formatDateTime(p.t)}</p>
    </div>
  );
}

/**
 * Satu seri: garis = rata-rata tiap titik, pita tipis = terendah–tertinggi (tanpa legenda: judul
 * kartu menamai serinya). Titik null memutus garis, jadi celah berarti alat tidak mengirim data.
 */
export default function HistoryChart({ points, unit, spanMs }: Props) {
  const multiDay = spanMs > 24 * 3_600_000;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis
          dataKey="t"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t: number) => (multiDay ? formatDate(t) : formatTime(t))}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: "var(--line)" }}
          minTickGap={40}
        />
        <YAxis
          width={52}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => formatNumber(v) ?? ""}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ stroke: "var(--ink-2)", strokeWidth: 1, strokeDasharray: "3 3" }} content={<ChartTooltip unit={unit} />} isAnimationActive={false} />
        <Area type="monotone" dataKey="band" stroke="none" fill="var(--accent)" fillOpacity={0.15} activeDot={false} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="avg"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
