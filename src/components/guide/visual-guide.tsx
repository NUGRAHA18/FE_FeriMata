"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import type { VisualGuide, VisualPart } from "@/lib/guide-visual";

/* Panduan bergambar: tangkapan layar HP dengan bagian-bagian bernomor. Ketuk nomor di gambar → penjelasan
 * di bawahnya menyala; ketuk penjelasan → bagian di gambar menyala. Penjelasan diletakkan tepat di bawah
 * gambar potongannya supaya tidak perlu menggulir jauh. */

function Screen({ guide, part, index, active, onPick }: { guide: VisualGuide; part: VisualPart; index: number; active: string | null; onPick: (id: string) => void }) {
  const pick = (id: string) => {
    onPick(id);
    // Penjelasan biasanya di bawah layar HP: bawa ke pandangan hanya bila belum terlihat.
    document.getElementById(`gv-${guide.slug}-${id}`)?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={part.image}
          alt={`Contoh tampilan ${guide.screen}, bagian ${index + 1} dari ${guide.parts.length}`}
          width={part.width}
          height={part.height}
          loading="lazy"
          decoding="async"
          className="h-auto w-full rounded-inner bg-card-2 ring-1 ring-line"
        />
        {part.spots.map((s) => {
          const item = guide.items[s.id];
          const on = active === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-label={`Bagian ${s.n}: ${item.title}`}
              aria-pressed={on}
              onClick={() => pick(s.id)}
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: `${s.w}%`, height: `${s.h}%` }}
              className={cn(
                "absolute rounded-[10px] ring-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                on ? "bg-accent/10 ring-4 ring-accent" : "ring-accent/55 hover:ring-accent",
              )}
            >
              <span aria-hidden className="absolute -top-2.5 -left-2.5 grid size-8 place-items-center rounded-full bg-accent text-base font-bold text-accent-fg shadow-card ring-2 ring-white">
                {s.n}
              </span>
            </button>
          );
        })}
      </div>
      <ol className="flex flex-col gap-2.5">
        {part.spots.map((s) => {
          const item = guide.items[s.id];
          const on = active === s.id;
          return (
            <li
              key={s.id}
              id={`gv-${guide.slug}-${s.id}`}
              data-active={on || undefined}
              className={cn("rounded-inner bg-card-2 px-4 py-3 ring-1 ring-line transition", on && "bg-accent-soft ring-2 ring-accent")}
            >
              <button type="button" onClick={() => onPick(s.id)} aria-pressed={on} className="flex w-full items-center gap-3 text-left">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-base font-bold text-accent-fg">
                  {s.n}
                </span>
                <span className="text-base font-semibold text-ink">{item.title}</span>
              </button>
              <p className="mt-1.5 pl-11 text-base leading-relaxed text-ink-2">{item.text}</p>
              {item.link && (
                <Link href={item.link.href} className="mt-1.5 ml-11 inline-flex min-h-11 items-center gap-1.5 text-base font-semibold text-accent hover:underline">
                  {item.link.label} <ArrowRight aria-hidden className="size-4" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function VisualGuideView({ guide }: { guide: VisualGuide }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-base leading-relaxed text-ink-2">Ketuk nomor di gambar untuk membaca penjelasannya. Gambar ini hanya contoh; angkanya di layar Anda akan berbeda.</p>
      {guide.parts.map((part, i) => (
        <Screen key={part.image} guide={guide} part={part} index={i} active={active} onPick={(id) => setActive((cur) => (cur === id ? null : id))} />
      ))}
    </div>
  );
}
