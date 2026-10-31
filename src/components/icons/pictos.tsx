import type { ComponentType, CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/cn";

/*
 * Ikon bergambar (piktogram) untuk benda yang diukur: tanah, air, suhu, cahaya, hara, tangki, alat.
 * Gaya: datar, dua-tiga warna, tanpa garis tepi dan tanpa gradien, supaya tetap sederhana di ukuran
 * 20–32 px. Warnanya warna benda (token --pic-*, per tema), bukan warna status: status tetap
 * disampaikan lewat badge/teks. Ikon UI (navigasi, judul kartu, status) tetap memakai lucide.
 */

export type Picto = ComponentType<{ className?: string }>;

const c = (name: string): CSSProperties => ({ fill: `var(--pic-${name})` });

function Svg({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden focusable="false" className={cn("shrink-0", className)}>
      {children}
    </svg>
  );
}

/** Tetes air; `top` = ujung atas, tinggi ±(w × 1.6). */
function drop(cx: number, top: number, w: number) {
  const r = w / 2;
  return `M${cx} ${top}C${cx} ${top} ${cx - r} ${top + r * 1.4} ${cx - r} ${top + r * 2}a${r} ${r} 0 0 0 ${w} 0C${cx + r} ${top + r * 1.4} ${cx} ${top} ${cx} ${top}Z`;
}

function Soil({ y = 23 }: { y?: number }) {
  return (
    <>
      <rect x="2" y={y} width="28" height={30 - y} rx="3.5" style={c("soil")} />
      <circle cx="8" cy={y + 3.5} r="1.2" style={c("soil-2")} />
      <circle cx="15" cy={y + 4.5} r="1" style={c("soil-2")} />
      <circle cx="23" cy={y + 3} r="1.2" style={c("soil-2")} />
    </>
  );
}

function Thermo({ x = 16, top = 3, bulbY = 23 }: { x?: number; top?: number; bulbY?: number }) {
  return (
    <>
      <rect x={x - 3} y={top} width="6" height={bulbY - top} rx="3" style={c("glass")} />
      <rect x={x - 1.25} y={top + 6} width="2.5" height={bulbY - top - 6} rx="1.25" style={c("heat")} />
      <circle cx={x} cy={bulbY} r="5" style={c("heat")} />
      <circle cx={x - 1.6} cy={bulbY - 1.3} r="1.3" style={c("white")} opacity="0.55" />
    </>
  );
}

export function PicSoilMoisture({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <Soil />
      <path d={drop(16, 2, 13)} style={c("water")} />
      <ellipse cx="13.2" cy="14.5" rx="1.3" ry="2.2" style={c("water-2")} />
    </Svg>
  );
}

export function PicSoilTemp({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <Soil y={24} />
      <Thermo top={2} bulbY={21} />
    </Svg>
  );
}

export function PicAirTemp({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <Thermo x={19} top={3} bulbY={23} />
      <g style={{ stroke: "var(--pic-water)" }} strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M3 10.5c1.4-1.2 2.8-1.2 4.2 0s2.8 1.2 4.2 0" />
        <path d="M3 16c1.4-1.2 2.8-1.2 4.2 0s2.8 1.2 4.2 0" />
      </g>
    </Svg>
  );
}

export function PicPh({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M12 3h8v2h-1v6.5l7 12.5a3 3 0 0 1-2.6 4.5H8.6A3 3 0 0 1 6 24l7-12.5V5h-1z" style={c("glass")} />
      <path d="M9.36 18h13.28L26 24a3 3 0 0 1-2.6 4.5H8.6A3 3 0 0 1 6 24z" style={c("violet")} />
      <circle cx="13.5" cy="22.5" r="1.3" style={c("white")} opacity="0.7" />
      <circle cx="18.5" cy="20.6" r="0.9" style={c("white")} opacity="0.7" />
    </Svg>
  );
}

export function PicEc({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d={drop(16, 2, 20)} style={c("water-2")} />
      <path d="M17.5 9 11 19.5h4.5l-2 7L21 15.5h-4.6z" style={c("sun")} />
    </Svg>
  );
}

/** Daun + lencana huruf hara (N/P/K). Huruf membuat ketiganya mudah dibedakan tanpa bergantung warna. */
function Nutrient({ letter, color, className }: { letter: string; color: string; className?: string }) {
  return (
    <Svg className={className}>
      <path d="M4 25C4 12 11 4 26 4c0 14-8 21-22 21z" style={c("leaf-2")} />
      <path d="M5.5 23.5 18 11" style={{ stroke: "var(--pic-leaf)" }} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <circle cx="22" cy="22" r="8" style={{ ...c(color), stroke: "var(--card-2)" }} strokeWidth="2" />
      <text x="22" y="26" textAnchor="middle" fontSize="11.5" fontWeight="700" style={c("white")}>
        {letter}
      </text>
    </Svg>
  );
}

export const PicNitrogen = ({ className }: { className?: string }) => <Nutrient letter="N" color="leaf" className={className} />;
export const PicPhosphorus = ({ className }: { className?: string }) => <Nutrient letter="P" color="orange" className={className} />;
export const PicPotassium = ({ className }: { className?: string }) => <Nutrient letter="K" color="violet" className={className} />;

export function PicHumidity({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M9 17a5 5 0 0 1 .6-10 7 7 0 0 1 13.2 1.6A4.3 4.3 0 0 1 23 17z" style={c("glass")} />
      <path d={drop(12, 19, 6)} style={c("water")} />
      <path d={drop(20, 21, 6)} style={c("water")} />
    </Svg>
  );
}

const rays = [0, 45, 90, 135, 180, 225, 270, 315];

export function PicLight({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <g style={{ stroke: "var(--pic-ray)" }} strokeWidth="2.2" strokeLinecap="round">
        {rays.map((a) => {
          const r = (a * Math.PI) / 180;
          return <line key={a} x1={16 + Math.cos(r) * 9.5} y1={16 + Math.sin(r) * 9.5} x2={16 + Math.cos(r) * 13} y2={16 + Math.sin(r) * 13} />;
        })}
      </g>
      <circle cx="16" cy="16" r="6.5" style={c("sun")} />
    </Svg>
  );
}

export function PicTank({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="6" y="4" width="20" height="25" rx="3.5" style={c("glass")} />
      <path d="M6 15q2.5-1.6 5 0t5 0 5 0 5 0v10.5a3.5 3.5 0 0 1-3.5 3.5h-13A3.5 3.5 0 0 1 6 25.5z" style={c("water")} />
      <rect x="6" y="9" width="20" height="1.8" style={c("metal")} />
      <rect x="9" y="17.5" width="1.8" height="8" rx="0.9" style={c("white")} opacity="0.45" />
    </Svg>
  );
}

/** Alat terhubung: kotak alat dengan lampu + gelombang sinyal. */
export function PicDevices({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <g style={{ stroke: "var(--pic-water)" }} strokeWidth="2.2" strokeLinecap="round" fill="none">
        <path d="M10 9.5a8.5 8.5 0 0 1 12 0" />
        <path d="M12.8 12.6a4.4 4.4 0 0 1 6.4 0" />
      </g>
      <rect x="4" y="17" width="24" height="10" rx="3" style={c("leaf")} />
      <circle cx="9.5" cy="22" r="1.5" style={c("white")} />
      <circle cx="14.5" cy="22" r="1.5" style={c("white")} opacity="0.6" />
      <rect x="19" y="21" width="5.5" height="2" rx="1" style={c("white")} opacity="0.6" />
    </Svg>
  );
}

export function PicBattery({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="4" y="9" width="22" height="14" rx="3" style={c("glass")} />
      <rect x="26" y="13" width="3" height="6" rx="1.2" style={c("metal")} />
      <rect x="7" y="12" width="5" height="8" rx="1.2" style={c("heat")} />
    </Svg>
  );
}

export function PicCamera({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="10" y="6.5" width="9" height="5" rx="2" style={c("dark")} />
      <rect x="3.5" y="9.5" width="25" height="17" rx="4" style={c("dark")} />
      <circle cx="16" cy="18" r="5.6" style={c("water-2")} />
      <circle cx="16" cy="18" r="2.8" style={c("water")} />
      <circle cx="24" cy="13.5" r="1.3" style={c("sun")} />
    </Svg>
  );
}

/** Komputer/papan pengendali (gateway, node). */
export function PicChip({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <g style={c("metal")}>
        {[11, 15, 19].map((p) => (
          <g key={p}>
            <rect x={p} y="4" width="2" height="4" rx="1" />
            <rect x={p} y="24" width="2" height="4" rx="1" />
            <rect x="4" y={p} width="4" height="2" rx="1" />
            <rect x="24" y={p} width="4" height="2" rx="1" />
          </g>
        ))}
      </g>
      <rect x="7.5" y="7.5" width="17" height="17" rx="3.5" style={c("leaf")} />
      <rect x="12" y="12" width="8" height="8" rx="1.6" style={c("leaf-2")} />
    </Svg>
  );
}

export function PicPowerMeter({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="5" y="3.5" width="22" height="25" rx="4" style={c("glass")} />
      <rect x="8.5" y="7" width="15" height="6" rx="1.5" style={c("dark")} />
      <path d="M17 15.5 12.5 22h3.5l-1.5 4.5 5.5-7h-3.5z" style={c("sun")} />
    </Svg>
  );
}

export function PicGauge({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M3 22a13 13 0 0 1 26 0z" style={c("glass")} />
      <path d="M6.5 22a9.5 9.5 0 0 1 19 0" style={{ stroke: "var(--pic-leaf)" }} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="m16 22 5-7" style={{ stroke: "var(--pic-dark)" }} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="22" r="2.4" style={c("dark")} />
    </Svg>
  );
}

export function PicSwitchBoard({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="4" y="6" width="24" height="20" rx="4" style={c("glass")} />
      <rect x="8" y="10.5" width="16" height="5" rx="2.5" style={c("leaf")} />
      <circle cx="21.5" cy="13" r="1.8" style={c("white")} />
      <rect x="8" y="18" width="16" height="5" rx="2.5" style={c("metal")} />
      <circle cx="10.5" cy="20.5" r="1.8" style={c("white")} />
    </Svg>
  );
}

export function PicPump({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="19" y="4" width="4" height="8" rx="1.5" style={c("metal")} />
      <path d={drop(27, 3, 4)} style={c("water")} />
      <rect x="4" y="11" width="12" height="11" rx="2.5" style={c("leaf")} />
      <rect x="6.5" y="14" width="7" height="1.6" rx="0.8" style={c("white")} opacity="0.6" />
      <rect x="6.5" y="17.5" width="7" height="1.6" rx="0.8" style={c("white")} opacity="0.6" />
      <circle cx="21" cy="17" r="6.5" style={c("water")} />
      <circle cx="21" cy="17" r="2.6" style={c("water-2")} />
      <rect x="3" y="24" width="26" height="4" rx="2" style={c("metal")} />
    </Svg>
  );
}

/** Pengaduk: drum berisi larutan dengan baling-baling. */
export function PicStirrer({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="5" y="8" width="22" height="21" rx="4" style={c("glass")} />
      <path d="M5 15q2.75-1.6 5.5 0t5.5 0 5.5 0 5.5 0v10a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" style={c("water")} />
      <rect x="15" y="3" width="2" height="19" rx="1" style={c("dark")} />
      <ellipse cx="16" cy="22.5" rx="6" ry="1.9" style={c("dark")} />
      <path d="M9 19.5a7 3 0 0 0 4 2.6" style={{ stroke: "var(--pic-white)" }} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.8" />
    </Svg>
  );
}

/** Pompa pupuk (dosing): botol pupuk dengan tetes. */
export function PicDosing({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="12.5" y="3" width="7" height="4" rx="1.2" style={c("dark")} />
      <rect x="13.5" y="6.5" width="5" height="4" style={c("glass")} />
      <rect x="7" y="10" width="18" height="19" rx="4.5" style={c("leaf")} />
      <rect x="10.5" y="15" width="11" height="9" rx="2" style={c("white")} opacity="0.9" />
      <path d={drop(16, 16.2, 4.4)} style={c("leaf")} />
    </Svg>
  );
}

/** Jadwal siram otomatis: kalender dengan tetes air. */
export function PicSchedule({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <rect x="4" y="6" width="24" height="23" rx="4" style={c("glass")} />
      <path d="M4 10a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v3H4z" style={c("leaf")} />
      <rect x="9" y="3" width="2.4" height="6" rx="1.2" style={c("dark")} />
      <rect x="20.6" y="3" width="2.4" height="6" rx="1.2" style={c("dark")} />
      <path d={drop(16, 15, 7.5)} style={c("water")} />
    </Svg>
  );
}

/** Suhu larutan/air: termometer di atas gelombang air. */
export function PicLiquidTemp({ className }: { className?: string }) {
  return (
    <Svg className={className}>
      <path d="M2 23q3.5-2 7 0t7 0 7 0 7 0V27a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3z" style={c("water")} />
      <Thermo top={2} bulbY={21} />
    </Svg>
  );
}

const devicePictos: Record<string, Picto> = {
  EDGE_GATEWAY: PicChip,
  POWER_METER: PicPowerMeter,
  MODBUS_IO: PicSwitchBoard,
  MODBUS_SENSOR_GROUP: PicGauge,
};

/** Piktogram per tipe alat dari katalog backend; tipe yang belum dikenal → papan pengendali. */
export function DevicePicto({ kind, className }: { kind: string | null | undefined; className?: string }) {
  const P = devicePictos[kind ?? ""] ?? PicChip;
  return <P className={className} />;
}

const sensorPictos: Record<string, Picto> = {
  SOIL_MOISTURE: PicSoilMoisture,
  SOIL_TEMPERATURE: PicSoilTemp,
  SOIL_EC: PicEc,
  SOIL_PH: PicPh,
  SOIL_NITROGEN: PicNitrogen,
  SOIL_PHOSPHORUS: PicPhosphorus,
  SOIL_POTASSIUM: PicPotassium,
  AIR_TEMPERATURE: PicAirTemp,
  AIR_HUMIDITY: PicHumidity,
  ILLUMINANCE: PicLight,
  SOLUTION_EC: PicEc,
  SOLUTION_PH: PicPh,
  SOLUTION_TEMPERATURE: PicLiquidTemp,
  LEVEL_SWITCH: PicTank,
  LIMIT_SWITCH: PicSwitchBoard,
  TEMPERATURE: PicAirTemp,
  VOLTAGE: PicPowerMeter,
  CURRENT: PicPowerMeter,
  POWER: PicPowerMeter,
  ENERGY: PicPowerMeter,
  POSITION: PicCamera,
};

/** Piktogram per tipe sensor dari katalog backend; tipe yang belum dikenal → jarum ukur. */
export function SensorPicto({ kind, className }: { kind: string | null | undefined; className?: string }) {
  const P = sensorPictos[kind ?? ""] ?? PicGauge;
  return <P className={className} />;
}

const actuatorPictos: Record<string, Picto> = {
  DISTRIBUTION_PUMP: PicPump,
  DOSING_PUMP: PicDosing,
  STIRRER: PicStirrer,
  SENSOR_POWER: PicPowerMeter,
  CAMERA_PAN: PicCamera,
  SAMPLING_PUMP: PicPump,
  FILL_VALVE: PicPump,
  ILLUMINATION: PicLight,
  TROLLEY_MOTOR: PicCamera,
  TROLLEY_DIRECTION: PicCamera,
  TROLLEY_PATROL: PicCamera,
  TROLLEY_POSITION: PicCamera,
};

/** Piktogram per tipe aktuator dari katalog backend; tipe yang belum dikenal → panel saklar. */
export function ActuatorPicto({ kind, className }: { kind: string | null | undefined; className?: string }) {
  const P = actuatorPictos[kind ?? ""] ?? PicSwitchBoard;
  return <P className={className} />;
}

/** Kotak latar netral untuk piktogram (warnanya sudah dari gambar, jadi latarnya tidak ikut berwarna). */
export const pictoTile = "grid shrink-0 place-items-center rounded-[12px] bg-card-2 ring-1 ring-line";
