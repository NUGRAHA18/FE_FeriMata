"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { Point } from "@/lib/history";
import { formatDate, formatDateTime, formatNumber, formatTime } from "@/lib/format";

type Props = { points: Point[]; unit: string; spanMs: number };

function ChartTooltip({ active, payload, unit }: Partial<TooltipContentProps<number, string>> & { unit: string }) {
  const p = payload?.[0]?.payload as Point | undefined;
  if (!active || !p) return null;
  return (
    <div className="rounded-control bg-active px-3 py-2 text-xs text-active-fg shadow-lg">
      <p className="tabular text-sm font-medium">
        {formatNumber(p.v)} {unit}
      </p>
      <p className="opacity-75">{formatDateTime(p.t)}</p>
    </div>
  );
}

/** Grafik garis satu seri (tanpa legenda: judul kartu menamai serinya). */
export default function HistoryChart({ points, unit, spanMs }: Props) {
  const multiDay = spanMs > 24 * 3_600_000;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          dataKey="v"
          width={52}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => formatNumber(v) ?? ""}
          tick={{ fill: "var(--muted)", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip cursor={{ stroke: "var(--ink-2)", strokeWidth: 1, strokeDasharray: "3 3" }} content={<ChartTooltip unit={unit} />} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="v"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: "var(--accent)", stroke: "var(--card)", strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
