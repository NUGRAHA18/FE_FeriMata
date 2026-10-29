"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useCanWrite } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { quickTour } from "@/lib/guide-content";
import { useLocalChoice } from "@/lib/local-state";

const GUIDE_KEY = "fertimata.guide";

/** Isi petunjuk ada di lib/guide-content.ts (satu sumber dengan halaman Panduan). */
export const guideSteps = quickTour;

/** Dialog petunjuk bertahap. Ditutup lewat tombol mana pun → dianggap sudah dibaca. */
export function GuideDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const canWrite = useCanWrite();
  const steps = guideSteps.filter((s) => canWrite || !s.writeOnly);
  const [index, setIndex] = useState(0);
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;
  const close = () => {
    setIndex(0);
    onClose();
  };
  const Icon = step.icon;

  return (
    <Dialog
      open={open}
      onClose={close}
      title={step.title}
      description={`Petunjuk ${index + 1} dari ${steps.length}`}
      footer={
        <>
          {!last && (
            <Button variant="ghost" onClick={close} className="mr-auto">
              Lewati
            </Button>
          )}
          {index > 0 && (
            <Button variant="soft" onClick={() => setIndex(index - 1)}>
              Sebelumnya
            </Button>
          )}
          <Button variant="accent" onClick={last ? close : () => setIndex(index + 1)}>
            {last ? "Mulai pakai" : "Lanjut"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <span className="grid size-14 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
          <Icon aria-hidden className="size-7" strokeWidth={1.8} />
        </span>
        {step.body.map((p) => (
          <p key={p} className="text-[15px] leading-relaxed text-ink-2">
            {p}
          </p>
        ))}
        {step.link && (
          <Link href={step.link.href} onClick={close} className="inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-semibold text-accent hover:underline">
            {step.link.label} <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        )}
        <div className="flex justify-center gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <span key={s.title} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-accent" : "w-1.5 bg-line")} />
          ))}
        </div>
      </div>
    </Dialog>
  );
}

/** Petunjuk yang terbuka sendiri sekali di Beranda untuk pengguna baru di perangkat ini. */
export function FirstVisitGuide() {
  const [seen, setSeen] = useLocalChoice(GUIDE_KEY, ["seen", "new"] as const, "new");
  return <GuideDialog open={seen === "new"} onClose={() => setSeen("seen")} />;
}
