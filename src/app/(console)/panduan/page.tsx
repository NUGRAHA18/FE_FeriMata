"use client";

import Link from "next/link";
import { ArrowRight, BookA, ChevronDown, CircleAlert, Info, PlayCircle, Search } from "lucide-react";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { GuideDialog } from "@/components/onboarding/guide";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/skeleton";
import { useCanWrite } from "@/lib/auth/use-session";
import { cn } from "@/lib/cn";
import { filterGlossary, filterSections, glossary, guideSections, type GuideSection, type GuideTerm } from "@/lib/guide-content";

/* Isi di lib/guide-content.ts. Bagian terbuka mengikuti #anchor (ikon "?" halaman lain); hanya satu
 * terbuka sekaligus, kecuali saat mencari (semua yang cocok terbuka). */

const GLOSSARY_ID = "istilah";

// ── #anchor sebagai sumber "bagian yang terbuka" ─────────────────────────────
function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
const readHash = () => decodeURIComponent(window.location.hash.slice(1));
/** Ganti #anchor tanpa melompat ke atas; replaceState tidak memicu hashchange, jadi dikirim sendiri. */
function setHash(id: string | null) {
  window.history.replaceState(window.history.state, "", id ? `#${id}` : window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">{children}</h3>;
}

function Terms({ items }: { items: GuideTerm[] }) {
  return (
    <dl className="flex flex-col divide-y divide-line rounded-inner bg-card-2 ring-1 ring-line">
      {items.map((t) => (
        <div key={t.term} className="px-4 py-3">
          <dt className="text-base font-semibold text-ink">{t.term}</dt>
          <dd className="mt-0.5 text-base leading-relaxed text-ink-2">{t.meaning}</dd>
        </div>
      ))}
    </dl>
  );
}

function Accordion({
  id,
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: GuideSection["icon"];
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-4 rounded-card bg-card shadow-card ring-1 ring-line">
      <h2 id={`${id}-title`}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-isi`}
          className="flex min-h-16 w-full items-center gap-3 rounded-card px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:px-5"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-accent-soft text-accent-ink">
            <Icon aria-hidden className="size-[22px]" strokeWidth={1.8} />
          </span>
          <span className="min-w-0 flex-1 text-lg font-semibold text-ink">{title}</span>
          <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-ink-2 transition-transform", open && "rotate-180")} />
        </button>
      </h2>
      {open && (
        <div id={`${id}-isi`} className="flex flex-col gap-5 border-t border-line px-4 pt-4 pb-5 sm:px-5">
          {children}
        </div>
      )}
    </section>
  );
}

function SectionBody({ s, canWrite }: { s: GuideSection; canWrite: boolean }) {
  return (
    <>
      {s.viewerNote && !canWrite && (
        <p className="flex gap-2.5 rounded-inner bg-info-soft px-4 py-3 text-base text-ink">
          <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-info" />
          {s.viewerNote}
        </p>
      )}
      <div>
        <Heading>Halaman ini untuk apa</Heading>
        <p className="text-base leading-relaxed text-ink">{s.purpose}</p>
      </div>
      <div>
        <Heading>Yang tampil di layar</Heading>
        <Terms items={s.onScreen} />
      </div>
      <div>
        <Heading>Yang perlu dilakukan</Heading>
        <ol className="flex flex-col gap-2.5">
          {s.steps.map((step, i) => (
            <li key={step} className="flex gap-3 text-base leading-relaxed text-ink">
              <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-active text-sm font-semibold text-active-fg">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <Heading>Kalau ada masalah</Heading>
        <ul className="flex flex-col gap-2">
          {s.troubles.map((t) => (
            <li key={t.sign} className="rounded-inner bg-warn-soft/60 px-4 py-3 ring-1 ring-line">
              <p className="flex gap-2 text-base font-semibold text-ink">
                <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn-ink" />
                {t.sign}
              </p>
              <p className="mt-1 pl-7 text-base leading-relaxed text-ink-2">{t.action}</p>
            </li>
          ))}
        </ul>
      </div>
      {s.href && (
        <Link
          href={s.href}
          className="inline-flex min-h-11 items-center gap-2 self-start rounded-control bg-card-2 px-4 text-base font-medium text-ink ring-1 ring-line hover:bg-sunken"
        >
          Buka halaman {s.title} <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </>
  );
}

export default function GuidePage() {
  const canWrite = useCanWrite();
  const hash = useSyncExternalStore(subscribeHash, readHash, () => "");
  const [query, setQuery] = useState("");
  const [tourOpen, setTourOpen] = useState(false);
  const searching = query.trim() !== "";
  const sections = filterSections(guideSections, query);
  const terms = filterGlossary(glossary, query);
  const isOpen = (id: string) => searching || hash === id;
  const toggle = (id: string) => setHash(hash === id ? null : id);

  // Dirender setelah sesi diketahui, jadi lompatan bawaan browser ke #anchor sudah lewat; gulir sendiri.
  useEffect(() => {
    const id = readHash();
    if (id) document.getElementById(id)?.scrollIntoView({ block: "start" });
  }, []);

  return (
    <>
      <PageHeader title="Panduan" subtitle="Arti tiap layar dan cara memakainya." />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Cari di panduan</span>
            <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari: pompa, EC, notifikasi"
              className="h-12 w-full rounded-control bg-card pr-4 pl-12 text-base text-ink shadow-card ring-1 ring-line outline-none placeholder:text-muted focus:ring-2 focus:ring-accent"
            />
          </label>
          <Button variant="soft" size="lg" icon={PlayCircle} onClick={() => setTourOpen(true)} className="shrink-0">
            Ulangi petunjuk singkat Beranda
          </Button>
        </div>

        {!searching && (
          <nav aria-label="Daftar isi panduan">
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {[...guideSections, { id: GLOSSARY_ID, title: "Istilah", icon: BookA }].map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      "flex min-h-16 items-center gap-3 rounded-inner bg-card px-3 py-2.5 shadow-card ring-1 ring-line transition hover:bg-card-2",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      hash === s.id && "ring-2 ring-accent",
                    )}
                  >
                    <s.icon aria-hidden className="size-6 shrink-0 text-accent" strokeWidth={1.8} />
                    <span className="min-w-0 text-base leading-snug font-medium text-ink">{s.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {searching && (
          <p role="status" className="text-base text-ink-2">
            {sections.length + (terms.length ? 1 : 0) ? `Ditemukan di ${sections.length} bagian${terms.length ? ` dan ${terms.length} istilah` : ""}.` : ""}
          </p>
        )}

        {searching && !sections.length && !terms.length ? (
          <EmptyState title="Tidak ditemukan" hint="Coba kata lain, misalnya nama tombol atau nama alat." />
        ) : (
          <div className="flex flex-col gap-3">
            {sections.map((s) => (
              <Accordion key={s.id} id={s.id} title={s.title} icon={s.icon} open={isOpen(s.id)} onToggle={() => toggle(s.id)}>
                <SectionBody s={s} canWrite={canWrite} />
              </Accordion>
            ))}
            {terms.length > 0 && (
              <Accordion id={GLOSSARY_ID} title="Istilah" icon={BookA} open={isOpen(GLOSSARY_ID)} onToggle={() => toggle(GLOSSARY_ID)}>
                <p className="text-base leading-relaxed text-ink-2">Kata-kata teknis yang muncul di layar, dengan bahasa sehari-hari.</p>
                <Terms items={terms} />
              </Accordion>
            )}
          </div>
        )}
      </div>
      <GuideDialog open={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  );
}
