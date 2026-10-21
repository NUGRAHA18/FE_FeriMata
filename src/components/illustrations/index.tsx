import { cn } from "@/lib/cn";

/*
 * Ilustrasi dekoratif bergaya referensi (docs/referensi-ui*.png): daun, melon, bunga, greenhouse.
 * Murni hiasan — selalu aria-hidden dan tidak menangkap klik. Warna dari token --leaf-* di
 * globals.css sehingga ikut tema (lebih redup di tema gelap lewat --deco-opacity).
 */

const LEAF = "M0 0 C 0.22 -0.34 0.68 -0.4 1 0 C 0.68 0.4 0.22 0.34 0 0 Z";

type LeafProps = { x: number; y: number; len: number; rot: number; tone?: 1 | 2 | 3 | 4; width?: number; vein?: boolean };

/** Satu daun: pangkal di (x, y), menghadap `rot` derajat. */
function Leaf({ x, y, len, rot, tone = 1, width = 1, vein = true }: LeafProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${len} ${len * width})`}>
      <path d={LEAF} style={{ fill: `var(--leaf-${tone})` }} />
      {vein && <path d="M0.06 0 L0.86 0" style={{ stroke: "var(--leaf-vein)" }} strokeWidth={0.025} strokeLinecap="round" />}
    </g>
  );
}

function Sprout({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C 0 -8 0 -14 0 -20" style={{ stroke: "var(--leaf-1)" }} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Leaf x={0} y={-14} len={13} rot={-155} tone={2} width={0.9} />
      <Leaf x={0} y={-18} len={15} rot={-30} tone={1} width={0.9} />
      <Leaf x={0} y={-8} len={10} rot={-200} tone={1} width={0.8} vein={false} />
    </g>
  );
}

function Flower({ x, y, r = 7 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-r * 0.62} rx={r * 0.42} ry={r * 0.62} transform={`rotate(${a})`} style={{ fill: "var(--flower)" }} />
      ))}
      <circle r={r * 0.32} style={{ fill: "var(--flower-core)" }} />
    </g>
  );
}

function Melon({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} style={{ fill: "var(--melon)" }} />
      {/* Jaring kulit melon */}
      <g style={{ stroke: "var(--melon-net)" }} strokeWidth={0.9} fill="none">
        <path d={`M ${-r * 0.8} ${-r * 0.3} Q 0 ${-r * 0.55} ${r * 0.8} ${-r * 0.3}`} />
        <path d={`M ${-r * 0.95} ${r * 0.15} Q 0 ${-r * 0.05} ${r * 0.95} ${r * 0.15}`} />
        <path d={`M ${-r * 0.7} ${r * 0.62} Q 0 ${r * 0.45} ${r * 0.7} ${r * 0.62}`} />
        <path d={`M ${-r * 0.35} ${-r * 0.9} Q ${-r * 0.55} 0 ${-r * 0.3} ${r * 0.93}`} />
        <path d={`M ${r * 0.3} ${-r * 0.93} Q ${r * 0.55} 0 ${r * 0.35} ${r * 0.9}`} />
      </g>
      <ellipse cx={-r * 0.35} cy={-r * 0.4} rx={r * 0.28} ry={r * 0.16} transform="rotate(-30)" fill="white" opacity={0.35} />
    </g>
  );
}

const decoCls = "pointer-events-none select-none";
const decoStyle = { opacity: "var(--deco-opacity)" } as const;

/** Rumpun daun untuk pojok kanan atas (header halaman, banner). */
export function LeafCorner({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 200 140" className={cn(decoCls, className)} style={decoStyle}>
      <Leaf x={200} y={0} len={110} rot={150} tone={3} width={0.9} />
      <Leaf x={200} y={10} len={95} rot={185} tone={2} />
      <Leaf x={196} y={4} len={80} rot={125} tone={1} />
      <Leaf x={200} y={30} len={70} rot={205} tone={1} width={0.85} />
      <Leaf x={150} y={0} len={55} rot={160} tone={2} width={0.8} />
      <Leaf x={175} y={0} len={60} rot={100} tone={3} width={0.8} vein={false} />
    </svg>
  );
}

/**
 * Pemandangan kebun untuk dasar kartu: bukit lembut, daun melon, bunga, dan satu buah melon.
 * Diletakkan absolut di dasar kartu; konten kartu tetap di atasnya.
 */
export function GardenStrip({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 90" preserveAspectRatio="xMaxYMax meet" className={cn(decoCls, className)} style={decoStyle}>
      <path d="M0 90 C 60 55 120 70 190 58 C 260 46 320 62 400 40 V 90 Z" style={{ fill: "var(--leaf-4)" }} />
      <path d="M0 90 C 80 72 150 84 240 70 C 300 61 350 70 400 62 V 90 Z" style={{ fill: "var(--leaf-3)" }} opacity={0.7} />
      <Leaf x={300} y={88} len={60} rot={-150} tone={2} />
      <Leaf x={300} y={88} len={66} rot={-110} tone={1} />
      <Leaf x={380} y={90} len={58} rot={-80} tone={2} width={0.9} />
      <Leaf x={400} y={70} len={50} rot={-140} tone={1} width={0.9} />
      <Flower x={318} y={52} r={9} />
      <Melon x={360} y={66} r={22} />
      <Leaf x={250} y={90} len={36} rot={-60} tone={1} width={0.9} vein={false} />
      <Leaf x={250} y={90} len={30} rot={-130} tone={3} width={0.9} vein={false} />
    </svg>
  );
}

/** Greenhouse kubah kecil berisi bibit — untuk sapaan beranda dan keadaan kosong kamera. */
export function GreenhouseScene({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 220 130" preserveAspectRatio="xMaxYMax meet" className={cn(decoCls, className)} style={decoStyle}>
      <path d="M0 130 C 50 104 110 114 220 92 V 130 Z" style={{ fill: "var(--leaf-4)" }} />
      {/* Kubah kaca */}
      <path d="M86 118 V 70 A 58 58 0 0 1 202 70 V 118 Z" style={{ fill: "var(--glass)", stroke: "var(--leaf-3)" }} strokeWidth={2} />
      <g style={{ stroke: "var(--leaf-3)" }} strokeWidth={1.4} fill="none">
        <path d="M144 12 V 118" />
        <path d="M144 12 C 118 22 108 46 108 118" />
        <path d="M144 12 C 170 22 180 46 180 118" />
        <path d="M88 76 H 200" />
      </g>
      {/* Bak tanam */}
      <rect x={100} y={108} width={92} height={12} rx={3} style={{ fill: "var(--soil)" }} />
      <Sprout x={116} y={108} s={1} />
      <Sprout x={146} y={108} s={1.25} />
      <Sprout x={176} y={108} s={0.95} />
      {/* Daun besar di luar */}
      <Leaf x={70} y={126} len={46} rot={-125} tone={2} />
      <Leaf x={70} y={126} len={52} rot={-75} tone={1} />
      <Sprout x={40} y={124} s={0.8} />
      <Sprout x={210} y={122} s={0.75} />
    </svg>
  );
}

/** Tunas kecil dengan daun — aksen di banner atau keadaan kosong. */
export function SproutArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="-30 -30 60 34" className={cn(decoCls, className)} style={decoStyle}>
      <Sprout x={0} y={2} s={1.3} />
    </svg>
  );
}
