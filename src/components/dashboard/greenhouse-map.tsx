"use client";

import { plots, trolleyLayout, type PlotId } from "@/config/dashboard-layout";
import { stationCode } from "@/lib/format";
import { cn } from "@/lib/cn";

type GreenhouseMapProps = {
  selectedPlot?: PlotId;
  onPlotSelect?: (p: PlotId) => void;
  /** Posisi trolley (0 = HOME, 1–12). null = belum dilaporkan. */
  trolleyStation?: number | null;
  /** Stasiun yang disorot (mis. filter AI). */
  selectedStation?: string | null;
  onStationSelect?: (code: string) => void;
  className?: string;
};

// Geometri denah (unit viewBox). Utara di atas; rel kamera di lorong tengah.
const W = 340;
const H = 250;
const RAIL_X = 170;
const HOME_Y = 30;
const FIRST_Y = 50;
const LAST_Y = 222;
const PLOT_Y = 40;
const PLOT_H = 192;
const PLOT_W = 100;
const plotX: Record<PlotId, number> = { a: 38, b: 202 };

function stationY(n: number) {
  if (n <= 0) return HOME_Y;
  const step = (LAST_Y - FIRST_Y) / (trolleyLayout.stationCount - 1);
  return FIRST_Y + (Math.min(n, trolleyLayout.stationCount) - 1) * step;
}

/**
 * Denah greenhouse buatan sendiri: Plot A & B, rel kamera utara→selatan dengan 12 stasiun
 * (jarak 60 cm), posisi trolley, dan tangki fertigasi. Plot terpilih berwarna gelap.
 */
export function GreenhouseMap({ selectedPlot, onPlotSelect, trolleyStation, selectedStation, onStationSelect, className }: GreenhouseMapProps) {
  const stations = Array.from({ length: trolleyLayout.stationCount }, (_, i) => i + 1);
  const trolleyKnown = trolleyStation != null && Number.isFinite(trolleyStation);
  const trolleyLabel = trolleyKnown ? stationCode(Math.round(trolleyStation!)) : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="group"
      aria-label={`Denah greenhouse. Plot terpilih: ${plots.find((p) => p.id === selectedPlot)?.label ?? "—"}. Trolley: ${trolleyLabel ?? "posisi belum dilaporkan"}.`}
      className={cn("h-auto w-full select-none", className)}
    >
      {/* Bangunan & jalur samar seperti peta referensi */}
      <rect x={6} y={6} width={W - 12} height={H - 12} rx={20} className="fill-card-2" />
      <g className="stroke-line" strokeWidth={6} strokeLinecap="round" fill="none">
        <path d={`M 20 ${H / 2} H ${W - 20}`} />
        <path d={`M ${RAIL_X} 18 V ${H - 18}`} opacity={0.6} />
      </g>

      {/* Kompas */}
      <g className="fill-muted" fontSize={10} fontWeight={600}>
        <path d="M 17 26 l 5 -12 l 5 12 l -5 -3 z" className="fill-muted" />
        <text x={22} y={38} textAnchor="middle">
          U
        </text>
      </g>

      {/* Plot */}
      {plots.map((p) => {
        const sel = p.id === selectedPlot;
        const x = plotX[p.id];
        const clickable = !!onPlotSelect;
        return (
          <g
            key={p.id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `Pilih ${p.label}` : undefined}
            aria-pressed={clickable ? sel : undefined}
            onClick={() => onPlotSelect?.(p.id)}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onPlotSelect?.(p.id);
              }
            }}
            className={cn(clickable && "cursor-pointer outline-none focus-visible:[&>rect]:stroke-accent")}
          >
            <rect
              x={x}
              y={PLOT_Y}
              width={PLOT_W}
              height={PLOT_H}
              rx={16}
              strokeWidth={sel ? 0 : 1.5}
              strokeDasharray={sel ? undefined : "5 4"}
              className={cn("transition-colors", sel ? "fill-active" : "fill-card stroke-muted/60")}
            />
            {/* bedengan */}
            {[0, 1, 2].map((i) => (
              <rect
                key={i}
                x={x + 14 + i * 28}
                y={PLOT_Y + 38}
                width={20}
                height={PLOT_H - 58}
                rx={8}
                className={sel ? "fill-active-fg/12" : "fill-sunken/70"}
              />
            ))}
            <text x={x + 14} y={PLOT_Y + 24} fontSize={14} fontWeight={600} className={sel ? "fill-active-fg" : "fill-ink-2"}>
              {p.label}
            </text>
            <text x={x + PLOT_W - 12} y={PLOT_Y + 24} fontSize={10} textAnchor="end" className={sel ? "fill-active-fg/70" : "fill-muted"}>
              {p.prefix}
            </text>
          </g>
        );
      })}

      {/* Rel kamera & stasiun */}
      <line x1={RAIL_X} x2={RAIL_X} y1={HOME_Y} y2={LAST_Y} strokeWidth={2} className="stroke-ink-2" />
      <g>
        <rect x={RAIL_X - 19} y={HOME_Y - 8} width={38} height={16} rx={5} className="fill-card stroke-ink-2" strokeWidth={1} />
        <text x={RAIL_X} y={HOME_Y + 3.5} fontSize={9} fontWeight={600} textAnchor="middle" className="fill-ink-2">
          HOME
        </text>
      </g>
      {stations.map((n) => {
        const code = stationCode(n);
        const sel = selectedStation === code;
        const y = stationY(n);
        const clickable = !!onStationSelect;
        return (
          <g
            key={n}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `Filter stasiun ${code}` : undefined}
            aria-pressed={clickable ? sel : undefined}
            onClick={() => onStationSelect?.(code)}
            onKeyDown={(e) => {
              if (clickable && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onStationSelect?.(code);
              }
            }}
            className={cn(clickable && "cursor-pointer outline-none [&:focus-visible>circle]:stroke-accent")}
          >
            <title>{`${code} — ${(n - 1) * trolleyLayout.stationSpacingCm} cm dari ST-01`}</title>
            {clickable && <rect x={RAIL_X - 24} y={y - 6} width={48} height={12} fill="transparent" />}
            <circle cx={RAIL_X} cy={y} r={sel ? 5.5 : 3.2} strokeWidth={sel ? 2 : 1.2} className={sel ? "fill-accent stroke-card-2" : "fill-card-2 stroke-ink-2"} />
            {(sel || n === 1 || n === trolleyLayout.stationCount) && (
              <text x={RAIL_X + 10} y={y + 3} fontSize={10} fontWeight={sel ? 700 : 500} className={sel ? "fill-accent" : "fill-muted"}>
                {code}
              </text>
            )}
          </g>
        );
      })}

      {/* Trolley */}
      {trolleyKnown && (
        <g aria-hidden style={{ transform: `translateY(${stationY(Math.round(trolleyStation!))}px)`, transition: "transform 600ms ease" }}>
          <circle cx={RAIL_X} cy={0} r={11} className="fill-accent/20" />
          <rect x={RAIL_X - 8} y={-6} width={16} height={12} rx={4} className="fill-accent" />
          <circle cx={RAIL_X} cy={0} r={2.2} className="fill-accent-fg" />
          <text x={RAIL_X - 13} y={3} fontSize={10} fontWeight={700} textAnchor="end" className="fill-accent">
            {trolleyLabel}
          </text>
        </g>
      )}

      {/* Tangki fertigasi */}
      <g>
        <circle cx={W - 20} cy={30} r={10} className="fill-info-soft stroke-info" strokeWidth={1.2} />
        <path d={`M ${W - 24} 32 q 4 -3 8 0`} className="stroke-info" strokeWidth={1.2} fill="none" />
        <text x={W - 20} y={52} fontSize={9} textAnchor="middle" className="fill-muted">
          Tangki
        </text>
      </g>
    </svg>
  );
}
