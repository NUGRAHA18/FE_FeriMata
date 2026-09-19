"use client";

import Link from "next/link";
import { ArrowUpRight, BellOff } from "lucide-react";
import { useShell } from "@/components/shell/shell-context";
import { Drawer } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/api/client";
import { useAlerts } from "@/lib/api/queries";
import { AlertItem } from "./alert-item";

const filters = { acknowledged: false, page: 0, size: 20 } as const;

function DrawerBody() {
  const q = useAlerts(filters);
  if (q.isPending) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-inner" />
        ))}
      </div>
    );
  }
  if (q.error) return <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />;
  if (!q.data.content.length)
    return <EmptyState icon={<BellOff aria-hidden className="size-5 text-muted" strokeWidth={1.6} />} title="Tidak ada alert aktif" hint="Semua alert sudah ditangani." />;
  return (
    <div className="flex flex-col gap-2">
      {q.data.content.map((a) => (
        <AlertItem key={a.id} alert={a} compact />
      ))}
      {q.data.totalElements > q.data.content.length && (
        <p className="pt-1 text-center text-xs text-muted">
          Menampilkan {q.data.content.length} dari {q.data.totalElements} alert.
        </p>
      )}
    </div>
  );
}

/** Drawer alert yang belum di-acknowledge — dibuka dari pill "N Alert" / lonceng. */
export function AlertDrawer() {
  const { alertDrawerOpen, closeAlertDrawer, alertCount } = useShell();
  return (
    <Drawer
      open={alertDrawerOpen}
      onClose={closeAlertDrawer}
      title="Alert aktif"
      description={`${alertCount} alert belum di-acknowledge`}
      footer={
        <Link
          href="/alerts"
          onClick={closeAlertDrawer}
          className="inline-flex h-10 items-center gap-2 rounded-control bg-active px-4 text-sm font-medium text-active-fg hover:opacity-90"
        >
          Semua alert <ArrowUpRight aria-hidden className="size-4" />
        </Link>
      }
    >
      {alertDrawerOpen && <DrawerBody />}
    </Drawer>
  );
}
