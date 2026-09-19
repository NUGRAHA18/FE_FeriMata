"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./button";

type PaginationProps = { page: number; totalPages: number; totalElements?: number; onChange: (page: number) => void; busy?: boolean };

/** Paginasi berbasis page 0 dari backend (Page<T>). */
export function Pagination({ page, totalPages, totalElements, onChange, busy }: PaginationProps) {
  if (totalPages <= 1) return totalElements != null ? <p className="text-xs text-muted">{totalElements} data</p> : null;
  return (
    <nav aria-label="Paginasi" className="flex items-center justify-between gap-3">
      <p className="tabular text-xs text-muted" aria-live="polite">
        Halaman {page + 1} dari {totalPages}
        {totalElements != null && ` · ${totalElements} data`}
      </p>
      <div className="flex gap-1.5">
        <IconButton icon={ChevronLeft} label="Halaman sebelumnya" size="sm" disabled={page <= 0 || busy} onClick={() => onChange(page - 1)} />
        <IconButton icon={ChevronRight} label="Halaman berikutnya" size="sm" disabled={page >= totalPages - 1 || busy} onClick={() => onChange(page + 1)} />
      </div>
    </nav>
  );
}
