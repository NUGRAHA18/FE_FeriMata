"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { trolleyLayout } from "@/config/dashboard-layout";
import { cn } from "@/lib/cn";
import { END_X_M, HOME_X_M, RAIL_LENGTH_M, stationX } from "./trolley-model";

/* Model 3D sederhana kereta kamera, diturunkan dari model tim hardware (rbwtech.io, Rev. A): rel V-slot
 * 6 m, 10 magnet stasiun tiap 600 mm, stopper di kedua ujung, kereta dengan unit pan dan kotak kamera.
 * Baut, rantai, dan kabel sengaja tidak digambar supaya ringan di ponsel.
 * Satuan meter; x = selatan (HOME) → utara (END), y = atas, z = timur. Rel digambar 2,2 m di atas lantai. */

export type ViewPreset = "miring" | "samping" | "atas";

export type TrolleySceneProps = {
  /** Posisi kereta yang digambar (m sepanjang rel); null = belum diketahui (kereta tidak digambar). */
  x: number | null;
  /** Kamera menghadap barat; null = belum dilaporkan (digambar ke timur, posisi aman). */
  panWest: boolean | null;
  moving: boolean;
  fault: boolean;
  selected: number | null;
  onSelect?: (station: number) => void;
  view: ViewPreset;
  reduceMotion: boolean;
  /** WebGL tidak tersedia: pemanggil menampilkan denah 2D. */
  onUnavailable: () => void;
  className?: string;
};

const RAIL_Y = 2.2;
const BED_Z = 0.75;

type Palette = { bg: string; floor: string; line: string; rail: string; ink: string; accent: string; plant: string; soil: string; danger: string; cam: string };

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  return {
    bg: v("--card-2", "#f5faf6"),
    floor: v("--card", "#ffffff"),
    line: v("--line", "#dce7df"),
    rail: v("--muted", "#5e7066"),
    ink: v("--ink", "#183126"),
    accent: v("--accent", "#218653"),
    plant: v("--accent-2", "#4cc27c"),
    soil: v("--warn-soft", "#fdf2dc"),
    danger: v("--danger", "#dc4c4c"),
    cam: v("--info", "#3a78c2"),
  };
}

const cameraPresets: Record<ViewPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  miring: { pos: [-1.6, 4.6, 5.4], target: [3, 1.1, 0] },
  samping: { pos: [3, 1.6, 7.2], target: [3, 1.3, 0] },
  atas: { pos: [3, 8.5, 0.01], target: [3, 0, 0] },
};

function box(w: number, h: number, d: number, mat: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export default function TrolleyScene(props: TrolleySceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  // Nilai terbaru untuk loop animasi tanpa membuat ulang scene.
  const live = useRef(props);
  useEffect(() => {
    live.current = props;
  });
  const api = useRef<{ invalidate: () => void; setView: (v: ViewPreset) => void; restyle: () => void } | null>(null);

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
    host.prepend(renderer.domElement);
    renderer.domElement.className = "block size-full";
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 60);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = false;
    controls.minDistance = 2;
    controls.maxDistance = 14;
    controls.maxPolarAngle = Math.PI * 0.49;
    // Di ponsel satu jari tetap menggulir halaman; memutar tampilan lewat tombol sudut pandang.
    renderer.domElement.style.touchAction = "pan-y";
    const onPointerDown = (e: PointerEvent) => {
      controls.enabled = e.pointerType !== "touch";
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown, { capture: true });

    scene.add(new THREE.HemisphereLight(0xffffff, 0x445544, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(-3, 8, 5);
    scene.add(sun);

    // Material berwarna token tema; diperbarui saat tema berubah.
    const mats = {
      floor: new THREE.MeshLambertMaterial(),
      soil: new THREE.MeshLambertMaterial(),
      plant: new THREE.MeshLambertMaterial(),
      rail: new THREE.MeshStandardMaterial({ metalness: 0.4, roughness: 0.5 }),
      dark: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
      body: new THREE.MeshStandardMaterial({ roughness: 0.45 }),
      cam: new THREE.MeshStandardMaterial({ roughness: 0.4 }),
      magnet: new THREE.MeshBasicMaterial(),
      selected: new THREE.MeshBasicMaterial(),
      view: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
      grid: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 }),
    };

    // Lantai + bedeng tanaman di sisi barat dan timur lorong.
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RAIL_LENGTH_M + 2, 3.4), mats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(RAIL_LENGTH_M / 2, 0, 0);
    scene.add(floor);
    const grid = new THREE.GridHelper(8, 16);
    (grid.material as THREE.Material).dispose();
    grid.material = mats.grid;
    grid.position.set(RAIL_LENGTH_M / 2, 0.002, 0);
    grid.scale.set(1, 1, 3.4 / 8);
    scene.add(grid);
    const plantGeo = new THREE.SphereGeometry(0.16, 12, 8);
    for (const z of [-BED_Z, BED_Z]) {
      const bed = box(RAIL_LENGTH_M - 0.2, 0.18, 0.5, mats.soil);
      bed.position.set(RAIL_LENGTH_M / 2, 0.09, z);
      scene.add(bed);
      for (let n = 1; n <= trolleyLayout.stationCount; n++) {
        const p = new THREE.Mesh(plantGeo, mats.plant);
        p.position.set(stationX(n), 0.36, z);
        p.scale.set(1, 1.25, 1);
        scene.add(p);
      }
    }

    // Rel V-slot 2040 (40 lebar × 20 tinggi), tiang gantung di lima palang, stopper di kedua ujung.
    const rail = box(RAIL_LENGTH_M, 0.02, 0.04, mats.rail);
    rail.position.set(RAIL_LENGTH_M / 2, RAIL_Y + 0.01, 0);
    scene.add(rail);
    for (const px of [0.3, 1.65, 3, 4.35, 5.7]) {
      const bar = box(0.02, 0.02, 0.9, mats.rail);
      bar.position.set(px, RAIL_Y + 0.03, 0);
      scene.add(bar);
    }
    for (const sx of [0, RAIL_LENGTH_M]) {
      const stop = box(0.006, 0.1, 0.09, mats.dark);
      stop.position.set(sx, RAIL_Y - 0.03, 0);
      scene.add(stop);
    }

    // Magnet stasiun di slot barat rel + penanda di lantai lorong (titik label yang bisa diketuk).
    const markers: THREE.Mesh[] = [];
    const markerGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.01, 24);
    const magnetGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.006, 12);
    const anchors: THREE.Vector3[] = [];
    for (let n = 1; n <= trolleyLayout.stationCount; n++) {
      const x = stationX(n);
      const mag = new THREE.Mesh(magnetGeo, mats.dark);
      mag.position.set(x, RAIL_Y - 0.004, -0.01);
      scene.add(mag);
      const m = new THREE.Mesh(markerGeo, mats.magnet);
      m.position.set(x, 0.006, 0);
      scene.add(m);
      markers.push(m);
      anchors.push(new THREE.Vector3(x, 0.02, 0));
    }
    // Label ujung rel (tidak bisa diketuk): indeks setelah stasiun.
    anchors.push(new THREE.Vector3(HOME_X_M - 0.35, 0.02, 0), new THREE.Vector3(END_X_M + 0.35, 0.02, 0));

    // Kereta: base plate di bawah rel, motor penggerak, unit pan, kotak kamera di ball head miring 35°.
    const trolley = new THREE.Group();
    const plate = box(0.2, 0.004, 0.116, mats.body);
    plate.position.set(0.035, RAIL_Y - 0.07, 0.008);
    trolley.add(plate);
    const gantry = box(0.088, 0.003, 0.126, mats.rail);
    gantry.position.set(0, RAIL_Y - 0.004, 0);
    trolley.add(gantry);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 20), mats.dark);
    motor.rotation.z = Math.PI / 2;
    motor.position.set(0.09, RAIL_Y - 0.05, -0.04);
    trolley.add(motor);
    const pan = new THREE.Group();
    pan.position.set(0.03, RAIL_Y - 0.075, 0);
    const panMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 16), mats.dark);
    panMotor.position.y = -0.02;
    pan.add(panMotor);
    const head = new THREE.Group();
    head.position.y = -0.06;
    // Ball head asli miring 35°; di sini diarahkan ke bedeng supaya terlihat tanaman mana yang difoto.
    head.rotation.x = Math.atan2(RAIL_Y - 0.5, BED_Z);
    const camBox = box(0.1, 0.1, 0.045, mats.cam);
    camBox.position.set(0, -0.05, 0);
    head.add(camBox);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.02, 20), mats.dark);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, -0.05, 0.032);
    head.add(lens);
    // Arah pandang: kerucut tembus pandang ke tanaman.
    const coneLen = Math.hypot(RAIL_Y - 0.5, BED_Z);
    const viewCone = new THREE.Mesh(new THREE.ConeGeometry(0.4, coneLen, 24, 1, true), mats.view);
    viewCone.rotation.x = -Math.PI / 2;
    viewCone.position.set(0, -0.05, coneLen / 2 + 0.05);
    head.add(viewCone);
    pan.add(head);
    trolley.add(pan);
    // Lingkaran bayangan di lantai supaya posisi kereta mudah terbaca dari atas.
    const shadow = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 32), mats.selected);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    trolley.add(shadow);
    scene.add(trolley);

    const restyle = () => {
      const p = readPalette();
      scene.background = new THREE.Color(p.bg);
      mats.floor.color.set(p.floor);
      mats.soil.color.set(p.soil);
      mats.plant.color.set(p.plant);
      mats.rail.color.set(p.rail);
      mats.dark.color.set(p.ink);
      mats.cam.color.set(p.cam);
      mats.magnet.color.set(p.line);
      mats.grid.color.set(p.line);
      const s = live.current;
      mats.body.color.set(s.fault ? p.danger : p.accent);
      mats.selected.color.set(s.fault ? p.danger : p.accent);
      mats.view.color.set(p.cam);
      markers.forEach((m, i) => (m.material = s.selected === i + 1 ? mats.selected : mats.magnet));
    };

    // Animasi hanya saat ada yang berubah (hemat baterai): tween posisi, putar pan, denyut saat bergerak.
    let raf = 0;
    let shownX: number | null = null;
    let shownPan = Math.PI * 0; // 0 = timur (+z), π = barat
    let last = performance.now();
    const project = new THREE.Vector3();

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
      let again = false;

      if (s.x == null) {
        trolley.visible = false;
        shownX = null;
      } else {
        trolley.visible = true;
        if (shownX == null || s.reduceMotion) shownX = s.x;
        const diff = s.x - shownX;
        if (Math.abs(diff) > 0.001) {
          shownX += Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.4, Math.abs(diff) * 4) * dt);
          again = true;
        } else shownX = s.x;
        trolley.position.x = Math.min(END_X_M, Math.max(HOME_X_M, shownX));
      }

      const targetPan = s.panWest ? Math.PI : 0;
      const dp = targetPan - shownPan;
      if (Math.abs(dp) > 0.001 && !s.reduceMotion) {
        // 180°/s seperti motor pan JGY-370.
        shownPan += Math.sign(dp) * Math.min(Math.abs(dp), Math.PI * dt);
        again = true;
      } else shownPan = targetPan;
      pan.rotation.y = shownPan;

      if (s.moving && !s.reduceMotion) {
        const k = 0.5 + 0.5 * Math.sin(now / 180);
        shadow.scale.setScalar(1 + 0.25 * k);
        again = true;
      } else shadow.scale.setScalar(1);

      renderer.render(scene, camera);
      placeLabels();
      if (again) raf = requestAnimationFrame(frame);
    };
    const invalidate = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const setView = (v: ViewPreset) => {
      const preset = cameraPresets[v];
      camera.position.set(...preset.pos);
      controls.target.set(...preset.target);
      controls.update();
      invalidate();
    };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Layar sempit: mundurkan kamera supaya rel 6 m tetap muat.
      camera.fov = w / h < 1.2 ? 52 : 40;
      camera.updateProjectionMatrix();
      invalidate();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    controls.addEventListener("change", invalidate);

    // Ikuti pergantian tema (atribut data-theme di <html>, atau preferensi sistem).
    const mo = new MutationObserver(() => {
      restyle();
      invalidate();
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => {
      restyle();
      invalidate();
    };
    mq.addEventListener("change", onScheme);

    restyle();
    setView(live.current.view);
    resize();
    api.current = { invalidate, setView, restyle };

    return () => {
      api.current = null;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", onScheme);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown, { capture: true });
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
      });
      Object.values(mats).forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  // Props berubah → warna/penanda diperbarui dan satu frame digambar.
  useEffect(() => {
    api.current?.restyle();
    api.current?.invalidate();
  }, [props.x, props.panWest, props.moving, props.fault, props.selected, props.reduceMotion]);

  useEffect(() => {
    api.current?.setView(props.view);
  }, [props.view]);

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
                "tabular pointer-events-auto absolute top-0 left-0 grid size-8 place-items-center rounded-full text-xs font-semibold shadow-sm ring-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none disabled:cursor-default",
                sel ? "bg-accent text-accent-fg ring-accent" : "bg-card text-ink ring-line hover:bg-accent-soft",
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
            className="absolute top-0 left-0 rounded-full bg-card/85 px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-muted ring-1 ring-line"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
