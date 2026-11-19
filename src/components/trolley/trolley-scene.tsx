"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { trolleyLayout } from "@/config/dashboard-layout";
import { cn } from "@/lib/cn";
import { END_X_M, HOME_X_M, RAIL_LENGTH_M, stationX } from "./trolley-model";

/* Model 3D kereta kamera, diturunkan dari model tim hardware (rbwtech.io, Rev. A): rel V-slot 2040 6 m,
 * 10 magnet stasiun tiap 600 mm, stopper + bumper di kedua ujung, kereta (gantry + 4 roda-V, base plate,
 * roda penggerak friction + motor JGB37, unit pan JGY-370, ball head, kotak kamera IMX477 berjendela akrilik).
 * Baut, rantai, dan kabel tidak digambar supaya ringan di ponsel. Kereta digambar 1,8× agar terbaca dari jauh.
 * Satuan meter; x = selatan (HOME) → utara (END), y = atas, z = timur. Rel 2,2 m di atas lantai. */

export type TrolleySceneProps = {
  /** Posisi kereta yang digambar (m sepanjang rel); null = belum diketahui (kereta tidak digambar). */
  x: number | null;
  /** Kamera menghadap barat; null = belum dilaporkan (digambar ke timur, posisi aman). */
  panWest: boolean | null;
  moving: boolean;
  /** Patroli berjalan: lampu REC di kotak kamera menyala. */
  patrol: boolean;
  fault: boolean;
  selected: number | null;
  onSelect?: (station: number) => void;
  reduceMotion: boolean;
  /** WebGL tidak tersedia: pemanggil menampilkan denah 2D. */
  onUnavailable: () => void;
  className?: string;
};

const RAIL_Y = 2.2;
const BED_Z = 0.75;
const PLANT_TOP_Y = 0.55;
const TROLLEY_SCALE = 1.8;

type Palette = { bg: string; line: string; accent: string; danger: string; cam: string };

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--card-2", "#f5faf6"),
    line: v("--line", "#dce7df"),
    accent: v("--accent", "#218653"),
    danger: v("--danger", "#dc4c4c"),
    cam: v("--info", "#3a78c2"),
  };
}

type Preset = { pos: [number, number, number]; target: [number, number, number] };
/** Satu sudut pandang: miring dari selatan-timur, seluruh rel dan kedua bedeng terlihat. */
const widePreset: Preset = { pos: [-0.9, 3.3, 4.3], target: [2.9, 1.0, 0] };
/** Layar sempit (ponsel): lebih jauh dan tinggi supaya rel 6 m, kereta di ujung, dan label tetap muat. */
const narrowPreset: Preset = { pos: [1.2, 4.7, 4.9], target: [3.0, 1.15, 0] };
const isNarrow = (aspect: number) => aspect < 1.5;

/** Profil V-slot 2040 sederhana: persegi 20 × 40 mm dengan alur di tiap sisi. */
function vslotGeometry(length: number) {
  const w = 0.04;
  const h = 0.02;
  const g = 0.003; // dalam alur
  const s = 0.006; // setengah lebar mulut alur
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  for (const cx of [-w / 4, w / 4]) {
    shape.lineTo(cx - s, -h / 2);
    shape.lineTo(cx - s / 2, -h / 2 + g);
    shape.lineTo(cx + s / 2, -h / 2 + g);
    shape.lineTo(cx + s, -h / 2);
  }
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, -s);
  shape.lineTo(w / 2 - g, -s / 2);
  shape.lineTo(w / 2 - g, s / 2);
  shape.lineTo(w / 2, s);
  shape.lineTo(w / 2, h / 2);
  for (const cx of [w / 4, -w / 4]) {
    shape.lineTo(cx + s, h / 2);
    shape.lineTo(cx + s / 2, h / 2 - g);
    shape.lineTo(cx - s / 2, h / 2 - g);
    shape.lineTo(cx - s, h / 2);
  }
  shape.lineTo(-w / 2, h / 2);
  shape.lineTo(-w / 2, s);
  shape.lineTo(-w / 2 + g, s / 2);
  shape.lineTo(-w / 2 + g, -s / 2);
  shape.lineTo(-w / 2, -s);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  // Profil di bidang z-y (lebar ke timur), panjang sepanjang x.
  geo.rotateY(Math.PI / 2);
  return geo;
}

/** Roda-V POM: profil lathe dengan lekuk V di tengah, sumbu y. */
function vWheelGeometry(r: number, t: number) {
  const pts = [
    new THREE.Vector2(0.002, -t / 2),
    new THREE.Vector2(r, -t / 2),
    new THREE.Vector2(r * 0.78, 0),
    new THREE.Vector2(r, t / 2),
    new THREE.Vector2(0.002, t / 2),
  ];
  return new THREE.LatheGeometry(pts, 28);
}

export default function TrolleyScene(props: TrolleySceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  // Nilai terbaru untuk loop animasi tanpa membuat ulang scene.
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });
  const api = useRef<{ invalidate: () => void; restyle: () => void } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      live.current.onUnavailable();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Bayangan dihitung ulang hanya saat kereta atau kamera bergerak (lihat `shadowDirty`).
    renderer.shadowMap.autoUpdate = false;
    host.prepend(renderer.domElement);
    renderer.domElement.className = "block size-full";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    // Pantulan lingkungan studio: logam dan plastik mengilap terlihat nyata tanpa tekstur gambar.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.55;

    const camera = new THREE.PerspectiveCamera(40, 1, 0.02, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 0.6;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.62;
    // Di ponsel satu jari tetap menggulir halaman; memutar tampilan lewat tombol sudut pandang.
    renderer.domElement.style.touchAction = "pan-y";
    const onPointerDown = (e: PointerEvent) => {
      controls.enabled = e.pointerType !== "touch";
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { capture: true });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a8f, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(-1.5, 8, 4.5);
    sun.target.position.set(3, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -4.2, right: 4.2, top: 3, bottom: -3, near: 1, far: 16 });
    sun.shadow.bias = -0.0004;
    sun.shadow.radius = 4;
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun, sun.target);

    const std = (color: THREE.ColorRepresentation, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...o });
    const mats = {
      // Lantai hanya menerima bayangan: latar kartu tetap terlihat, tanpa tepi lantai yang terpotong.
      floor: new THREE.ShadowMaterial({ opacity: 0.14 }),
      grid: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 }),
      soil: std("#5b4332", { roughness: 1 }),
      bedEdge: std("#e9ece8", { roughness: 0.7 }),
      leaf: std("#3f9d55", { roughness: 0.75, flatShading: true }),
      leafDark: std("#2f7d44", { roughness: 0.8, flatShading: true }),
      stem: std("#4c7a3b", { roughness: 0.8 }),
      melon: std("#c9d58a", { roughness: 0.55 }),
      alu: std("#c4cad1", { metalness: 0.85, roughness: 0.32 }),
      aluDark: std("#33383e", { metalness: 0.7, roughness: 0.38 }),
      paint: new THREE.MeshPhysicalMaterial({ roughness: 0.32, metalness: 0.15, clearcoat: 0.7, clearcoatRoughness: 0.15 }),
      pom: std("#f1f1ee", { roughness: 0.42 }),
      rubber: std("#1c1e21", { roughness: 0.9 }),
      gear: std("#c8a14a", { metalness: 0.9, roughness: 0.28 }),
      can: std("#a3a9b0", { metalness: 0.9, roughness: 0.22 }),
      housing: new THREE.MeshPhysicalMaterial({ color: "#f6f7f8", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.08 }),
      glass: new THREE.MeshPhysicalMaterial({ color: "#0d1422", roughness: 0.04, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02 }),
      lensRing: std("#dfe3e8", { metalness: 1, roughness: 0.18 }),
      lensGlass: std("#12203d", { roughness: 0.05, metalness: 0.2, emissive: new THREE.Color("#2d6fd6"), emissiveIntensity: 0.35 }),
      led: std("#000000", { roughness: 0.3, emissiveIntensity: 1 }),
      rec: std("#3a0d0d", { roughness: 0.3, emissive: new THREE.Color("#ff2d2d"), emissiveIntensity: 0 }),
      magnet: new THREE.MeshBasicMaterial(),
      markerSel: new THREE.MeshBasicMaterial(),
      view: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
      spot: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.35, depthWrite: false }),
    };
    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = true;
      return m;
    };
    const rbox = (w: number, h: number, d: number, r: number, mat: THREE.Material) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat);

    // ── Lantai, bedeng, tanaman ─────────────────────────────────────────────────────────────────
    const floor = mesh(new THREE.PlaneGeometry(30, 30), mats.floor, false);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(RAIL_LENGTH_M / 2, 0, 0);
    scene.add(floor);
    const grid = new THREE.GridHelper(8.4, 21);
    (grid.material as THREE.Material).dispose();
    grid.material = mats.grid;
    grid.position.set(RAIL_LENGTH_M / 2, 0.002, 0);
    grid.scale.set(1, 1, 3.6 / 8.4);
    scene.add(grid);

    const leafGeo = new THREE.IcosahedronGeometry(0.09, 0);
    const stemGeo = new THREE.CylinderGeometry(0.008, 0.012, 0.32, 8);
    const melonGeo = new THREE.SphereGeometry(0.055, 16, 12);
    for (const side of [-1, 1]) {
      const z = side * BED_Z;
      const bed = rbox(RAIL_LENGTH_M - 0.2, 0.16, 0.5, 0.03, mats.bedEdge);
      bed.position.set(RAIL_LENGTH_M / 2, 0.08, z);
      scene.add(bed);
      const soil = mesh(new THREE.BoxGeometry(RAIL_LENGTH_M - 0.26, 0.02, 0.44), mats.soil, false);
      soil.position.set(RAIL_LENGTH_M / 2, 0.155, z);
      scene.add(soil);
      for (let n = 1; n <= trolleyLayout.stationCount; n++) {
        const plant = new THREE.Group();
        plant.position.set(stationX(n), 0.16, z);
        plant.rotation.y = (n * 1.7 + side) % (Math.PI * 2);
        const stem = mesh(stemGeo, mats.stem);
        stem.position.y = 0.16;
        plant.add(stem);
        const leaves: [number, number, number, number][] = [
          [0.07, 0.22, 0, 1.15],
          [-0.06, 0.28, 0.05, 1],
          [0.02, 0.36, -0.06, 0.9],
          [-0.03, 0.18, -0.07, 1.05],
          [0.0, 0.42, 0.02, 0.75],
        ];
        leaves.forEach(([lx, ly, lz, s], k) => {
          const leaf = mesh(leafGeo, k % 2 ? mats.leafDark : mats.leaf);
          leaf.position.set(lx, ly, lz);
          leaf.scale.set(s * 1.25, s * 0.45, s);
          leaf.rotation.set(k * 0.6, k * 1.3, k * 0.4);
          plant.add(leaf);
        });
        if ((n + (side > 0 ? 1 : 0)) % 2 === 0) {
          const melon = mesh(melonGeo, mats.melon);
          melon.position.set(0.05, 0.08, 0.04);
          melon.scale.set(1, 0.92, 1);
          plant.add(melon);
        }
        scene.add(plant);
      }
    }

    // ── Rel V-slot, palang, stopper + bumper ─────────────────────────────────────────────────────
    const rail = mesh(vslotGeometry(RAIL_LENGTH_M), mats.alu);
    rail.position.set(0, RAIL_Y + 0.01, 0);
    scene.add(rail);
    for (const px of [0.3, 1.65, 3, 4.35, 5.7]) {
      const bar = mesh(vslotGeometry(0.9), mats.alu);
      bar.rotation.y = Math.PI / 2;
      // Profil 2020: setengah lebar profil 2040 (sumbu lebar = z lokal geometri).
      bar.scale.set(1, 1, 0.5);
      bar.position.set(px, RAIL_Y + 0.03, 0.45);
      scene.add(bar);
    }
    for (const [sx, dir] of [
      [0, 1],
      [RAIL_LENGTH_M, -1],
    ] as const) {
      const stop = rbox(0.006, 0.1, 0.09, 0.002, mats.aluDark);
      stop.position.set(sx, RAIL_Y - 0.03, 0);
      scene.add(stop);
      const bumper = mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.008, 20), mats.rubber);
      bumper.rotation.z = Math.PI / 2;
      bumper.position.set(sx + dir * 0.007, RAIL_Y - 0.03, 0);
      scene.add(bumper);
    }

    // Magnet stasiun di slot barat rel + penanda bulat di lantai lorong (jangkar label yang bisa diketuk).
    const markers: THREE.Mesh[] = [];
    const markerGeo = new THREE.CircleGeometry(0.09, 32);
    const magnetGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.004, 12);
    const anchors: THREE.Vector3[] = [];
    for (let n = 1; n <= trolleyLayout.stationCount; n++) {
      const x = stationX(n);
      const mag = mesh(magnetGeo, mats.aluDark, false);
      mag.position.set(x, RAIL_Y - 0.002, -0.01);
      scene.add(mag);
      const m = new THREE.Mesh(markerGeo, mats.magnet);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.004, 0);
      scene.add(m);
      markers.push(m);
      anchors.push(new THREE.Vector3(x, 0.02, 0));
    }
    // Label ujung rel (tidak bisa diketuk): indeks setelah stasiun.
    anchors.push(new THREE.Vector3(HOME_X_M - 0.35, 0.02, 0), new THREE.Vector3(END_X_M + 0.35, 0.02, 0));

    // ── Kereta. Titik asal = muka bawah rel di pusat gantry; semua anak di bawahnya (y negatif). ─────────
    const trolley = new THREE.Group();
    trolley.scale.setScalar(TROLLEY_SCALE);
    const gantry = rbox(0.088, 0.004, 0.126, 0.0015, mats.aluDark);
    gantry.position.set(0, -0.004, 0);
    trolley.add(gantry);
    // Roda-V menjepit alur samping rel (sumbu tegak), berputar saat kereta bergerak.
    const vWheels: THREE.Mesh[] = [];
    const vGeo = vWheelGeometry(0.012, 0.011);
    for (const wx of [-0.04, 0.04])
      for (const wz of [-0.031, 0.031]) {
        const w = mesh(vGeo, mats.pom);
        w.position.set(wx, 0.01, wz);
        trolley.add(w);
        vWheels.push(w);
        const post = mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.07, 10), mats.can);
        post.position.set(wx, -0.035, wz);
        trolley.add(post);
      }
    const plate = rbox(0.2, 0.004, 0.116, 0.0018, mats.paint);
    plate.position.set(0.035, -0.07, 0.008);
    trolley.add(plate);
    // Strip LED status di tepi timur dan barat base plate.
    for (const lz of [0.067, -0.051]) {
      const led = rbox(0.17, 0.004, 0.003, 0.0012, mats.led);
      led.position.set(0.035, -0.0715, lz);
      led.castShadow = false;
      trolley.add(led);
    }
    // Roda penggerak friction 65 mm menekan muka bawah rel + motor JGB37 (gearbox emas, motor perak).
    const drive = mesh(new THREE.CylinderGeometry(0.0325, 0.0325, 0.016, 32), mats.rubber);
    drive.rotation.x = Math.PI / 2;
    drive.position.set(0.1, -0.0325, 0);
    trolley.add(drive);
    const hub = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 20), mats.can);
    hub.rotation.x = Math.PI / 2;
    hub.position.copy(drive.position);
    trolley.add(hub);
    const gearbox = mesh(new THREE.CylinderGeometry(0.0185, 0.0185, 0.027, 28), mats.gear);
    gearbox.rotation.x = Math.PI / 2;
    gearbox.position.set(0.1, -0.0325, -0.03);
    trolley.add(gearbox);
    const motorCan = mesh(new THREE.CylinderGeometry(0.0175, 0.0175, 0.034, 28), mats.can);
    motorCan.rotation.x = Math.PI / 2;
    motorCan.position.set(0.1, -0.0325, -0.06);
    trolley.add(motorCan);
    // Limit HOME/END di tepi barat base plate.
    for (const lx of [-0.06, 0.13]) {
      const sw = rbox(0.02, 0.0064, 0.01, 0.0015, mats.rubber);
      sw.position.set(lx, -0.064, -0.045);
      trolley.add(sw);
    }

    // Unit pan: piringan aluminium di bawah base plate, motor JGY-370, lalu ball head dan kotak kamera.
    const pan = new THREE.Group();
    pan.position.set(0.03, -0.075, 0);
    const panMotor = rbox(0.032, 0.025, 0.039, 0.003, mats.gear);
    panMotor.position.set(0, -0.004, 0.0);
    pan.add(panMotor);
    const disc = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.003, 36), mats.alu);
    disc.position.y = -0.02;
    pan.add(disc);
    const stemBall = mesh(new THREE.CylinderGeometry(0.005, 0.006, 0.02, 14), mats.aluDark);
    stemBall.position.y = -0.031;
    pan.add(stemBall);
    const ball = mesh(new THREE.SphereGeometry(0.011, 20, 14), mats.aluDark);
    ball.position.y = -0.043;
    pan.add(ball);

    const head = new THREE.Group();
    head.position.y = -0.043;
    // Ball head diarahkan ke bedeng (aslinya miring 35°), supaya terlihat tanaman mana yang difoto.
    const camWorldY = RAIL_Y - 0.15 * TROLLEY_SCALE;
    head.rotation.x = Math.atan2(camWorldY - PLANT_TOP_Y, BED_Z);
    const shell = rbox(0.1, 0.1, 0.045, 0.012, mats.housing);
    shell.position.set(0, -0.062, 0);
    head.add(shell);
    const window_ = rbox(0.072, 0.072, 0.004, 0.008, mats.glass);
    window_.position.set(0, -0.062, 0.0225);
    head.add(window_);
    const ring = mesh(new THREE.TorusGeometry(0.019, 0.003, 12, 40), mats.lensRing);
    ring.position.set(0, -0.062, 0.026);
    head.add(ring);
    const lens = mesh(new THREE.CylinderGeometry(0.016, 0.017, 0.012, 32), mats.lensGlass);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, -0.062, 0.027);
    head.add(lens);
    const rec = mesh(new THREE.SphereGeometry(0.0035, 12, 8), mats.rec, false);
    rec.position.set(0.036, -0.028, 0.025);
    head.add(rec);
    const lensAnchor = new THREE.Object3D();
    lensAnchor.position.set(0, -0.062, 0.03);
    head.add(lensAnchor);
    pan.add(head);
    trolley.add(pan);

    // Cincin di lantai di bawah kereta: posisi tetap terbaca dari tampilan atas.
    const shadowRing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 40), mats.markerSel);
    shadowRing.rotation.x = -Math.PI / 2;
    scene.add(shadowRing);
    scene.add(trolley);

    // Sorot pandang kamera: kerucut dari lensa ke tanaman + bercak terang di bedeng (di luar grup kereta,
    // diarahkan tiap frame supaya tidak ikut skala).
    const coneGeo = new THREE.ConeGeometry(0.28, 1, 32, 1, true);
    coneGeo.rotateX(-Math.PI / 2);
    coneGeo.translate(0, 0, 0.5);
    const viewCone = new THREE.Mesh(coneGeo, mats.view);
    scene.add(viewCone);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40), mats.spot);
    spot.rotation.x = -Math.PI / 2;
    scene.add(spot);

    const restyle = () => {
      const p = readPalette();
      scene.background = new THREE.Color(p.bg);
      mats.grid.color.set(p.line);
      mats.magnet.color.set(p.line);
      const s = live.current;
      const tone = s.fault ? p.danger : p.accent;
      mats.paint.color.set(tone);
      mats.markerSel.color.set(tone);
      mats.led.emissive.set(tone);
      mats.view.color.set(p.cam);
      mats.spot.color.set(p.cam);
      markers.forEach((m, i) => (m.material = s.selected === i + 1 ? mats.markerSel : mats.magnet));
    };

    // Animasi hanya saat ada yang berubah (hemat baterai): tween posisi, putar roda dan pan, denyut LED.
    let raf = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let shadowDirty = true;
    /** Animasi "hiasan" (denyut LED, kedip REC) cukup ±12 fps. */
    const AMBIENT_MS = 83;
    // Kualitas adaptif untuk ponsel lemah: ukur lama render (rata-rata bergerak). Jeda antarframe minimal
    // 2× lama render supaya ketukan tetap ditanggapi; terlalu lambat → resolusi turun, lalu bayangan mati.
    let renderMs = 8;
    let slowFrames = 0;
    let quality = 2; // 2 = penuh, 1 = resolusi 1×, 0 = tanpa bayangan
    const degrade = () => {
      if (quality === 2) renderer.setPixelRatio(1);
      if (quality === 1) {
        renderer.shadowMap.enabled = false;
        Object.values(mats).forEach((m) => (m.needsUpdate = true));
      }
      quality -= 1;
      slowFrames = 0;
      resize();
    };
    let shownX: number | null = null;
    let shownPan = 0; // 0 = timur (+z), π = barat
    let last = performance.now();
    const project = new THREE.Vector3();
    const lensPos = new THREE.Vector3();
    const aim = new THREE.Vector3();

    const placeLabels = () => {
      const w = renderer.domElement.clientWidth;
      const h = renderer.domElement.clientHeight;
      anchors.forEach((a, i) => {
        const el = labelRefs.current[i];
        if (!el) return;
        project.copy(a).project(camera);
        const visible = project.z < 1 && Math.abs(project.x) <= 1.05 && Math.abs(project.y) <= 1.05;
        el.style.visibility = visible ? "visible" : "hidden";
        el.style.transform = `translate(-50%, -50%) translate(${((project.x + 1) / 2) * w}px, ${((1 - project.y) / 2) * h}px)`;
      });
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const s = live.current;
      let again = false; // gerak kereta/pan: frame berikutnya segera
      let ambient = false; // hanya hiasan: frame berikutnya diperlambat

      const visible = s.x != null;
      if (visible !== trolley.visible) shadowDirty = true;
      if (s.x == null) {
        trolley.visible = shadowRing.visible = viewCone.visible = spot.visible = false;
        shownX = null;
      } else {
        trolley.visible = shadowRing.visible = viewCone.visible = spot.visible = true;
        const prevX = shownX ?? s.x;
        if (shownX == null || s.reduceMotion) shownX = s.x;
        const diff = s.x - shownX;
        if (Math.abs(diff) > 0.0005) {
          shownX += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.4, Math.abs(diff) * 4) * dt);
          again = true;
        } else shownX = s.x;
        const x = Math.min(END_X_M, Math.max(HOME_X_M, shownX));
        const moved = x - Math.min(END_X_M, Math.max(HOME_X_M, prevX));
        if (moved !== 0 || trolley.position.x !== x) shadowDirty = true;
        trolley.position.set(x, RAIL_Y, 0);
        shadowRing.position.set(x, 0.005, 0);
        // Roda menggelinding: sudut = jarak / jari-jari (skala tidak memengaruhi jarak tempuh nyata).
        vWheels.forEach((w, i) => (w.rotation.y += (i % 2 ? -1 : 1) * (moved / 0.012)));
        drive.rotation.y -= moved / 0.0325;
      }

      const targetPan = s.panWest ? Math.PI : 0;
      const dp = targetPan - shownPan;
      if (Math.abs(dp) > 0.001 && !s.reduceMotion) {
        // 180°/s seperti motor pan JGY-370.
        shownPan += Math.sign(dp) * Math.min(Math.abs(dp), Math.PI * dt);
        again = true;
        shadowDirty = true;
      } else {
        if (shownPan !== targetPan) shadowDirty = true;
        shownPan = targetPan;
      }
      pan.rotation.y = shownPan;

      // Sorot pandang: dari lensa ke tanaman di sisi yang dihadap.
      if (trolley.visible) {
        trolley.updateMatrixWorld(true);
        lensAnchor.getWorldPosition(lensPos);
        const side = Math.cos(shownPan) >= 0 ? 1 : -1;
        aim.set(trolley.position.x, PLANT_TOP_Y, Math.cos(shownPan) * BED_Z);
        viewCone.position.copy(lensPos);
        viewCone.lookAt(aim);
        viewCone.scale.set(1, 1, lensPos.distanceTo(aim));
        spot.position.set(aim.x, 0.17, side * BED_Z);
        spot.material.opacity = 0.35 * Math.abs(Math.cos(shownPan));
      }

      // LED status: redup saat diam, berdenyut saat bergerak, merah tetap saat rusak. REC berkedip saat patroli.
      const pulse = 0.5 + 0.5 * Math.sin(now / 160);
      if (s.fault) mats.led.emissiveIntensity = 1.6;
      else if (s.moving && !s.reduceMotion) {
        mats.led.emissiveIntensity = 0.6 + 1.4 * pulse;
        shadowRing.scale.setScalar(1 + 0.2 * pulse);
        ambient = true;
      } else {
        mats.led.emissiveIntensity = s.moving ? 1.6 : 0.45;
        shadowRing.scale.setScalar(1);
      }
      if (s.patrol) {
        mats.rec.emissiveIntensity = s.reduceMotion ? 2 : Math.sin(now / 300) > 0 ? 2.4 : 0.2;
        if (!s.reduceMotion) ambient = true;
      } else mats.rec.emissiveIntensity = 0;

      if (shadowDirty) {
        renderer.shadowMap.needsUpdate = true;
        shadowDirty = false;
      }
      const t0 = performance.now();
      renderer.render(scene, camera);
      const spent = performance.now() - t0;
      renderMs = renderMs * 0.8 + spent * 0.2;
      if (renderMs > 34 && quality > 0 && ++slowFrames > 8) degrade();
      placeLabels();
      const gap = Math.max(0, 2 * renderMs - 16);
      if (again && gap < 4) raf = requestAnimationFrame(frame);
      else if (again)
        timer = setTimeout(() => {
          timer = undefined;
          raf = requestAnimationFrame(frame);
        }, gap);
      else if (ambient)
        timer = setTimeout(() => {
          timer = undefined;
          raf = requestAnimationFrame(frame);
        }, AMBIENT_MS);
    };
    const invalidate = () => {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const applyPreset = () => {
      const preset = isNarrow(camera.aspect) ? narrowPreset : widePreset;
      camera.position.set(...preset.pos);
      controls.target.set(...preset.target);
      controls.update();
      invalidate();
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const wasNarrow = isNarrow(camera.aspect);
      camera.aspect = w / h;
      // Pindah antara layar lebar dan sempit (putar ponsel): pasang ulang preset yang sesuai.
      if (wasNarrow !== isNarrow(camera.aspect)) applyPreset();
      // Layar sempit: perlebar sudut supaya rel 6 m tetap muat.
      camera.fov = isNarrow(w / h) ? 50 : 40;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    controls.addEventListener("change", invalidate);

    // Ikuti pergantian tema (atribut data-theme di <html>, atau preferensi sistem).
    const onTheme = () => {
      restyle();
      invalidate();
    };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onTheme);

    restyle();
    applyPreset();
    resize();
    api.current = { invalidate, restyle };

    return () => {
      api.current = null;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", onTheme);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, { capture: true });
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
      });
      Object.values(mats).forEach((m) => m.dispose());
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Props berubah → warna/penanda diperbarui dan satu frame digambar.
  useEffect(() => {
    api.current?.restyle();
    api.current?.invalidate();
  }, [props.x, props.panWest, props.moving, props.patrol, props.fault, props.selected, props.reduceMotion]);

  return (
    <div ref={hostRef} className={cn("relative overflow-hidden", props.className)}>
      {/* Label stasiun = tombol sungguhan di atas kanvas: bisa diketuk, difokus keyboard, dibaca pembaca layar. */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: trolleyLayout.stationCount }, (_, i) => {
          const n = i + 1;
          const sel = props.selected === n;
          return (
            <button
              key={n}
              ref={(el) => {
                labelRefs.current[i] = el;
              }}
              type="button"
              aria-pressed={sel}
              aria-label={`Stasiun ${n}`}
              disabled={!props.onSelect}
              onClick={() => props.onSelect?.(n)}
              style={{ visibility: "hidden" }}
              className={cn(
                "tabular pointer-events-auto absolute top-0 left-0 grid size-7 place-items-center rounded-full text-[11px] font-semibold sm:size-8 sm:text-xs shadow-md ring-1 backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-default",
                sel ? "bg-accent text-accent-fg ring-accent" : "bg-card/90 text-ink ring-line hover:bg-accent-soft",
              )}
            >
              {n}
            </button>
          );
        })}
        {["Awal", "Utara"].map((t, i) => (
          <span
            key={t}
            ref={(el) => {
              labelRefs.current[trolleyLayout.stationCount + i] = el;
            }}
            style={{ visibility: "hidden" }}
            className="absolute top-0 left-0 rounded-full bg-card/85 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-muted ring-1 ring-line backdrop-blur-sm"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
