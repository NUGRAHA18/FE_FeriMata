"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { KeyValue } from "@/components/ui/key-value";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { RelativeTime } from "@/components/ui/time";
import { errorMessage } from "@/lib/api/client";
import { useMe } from "@/lib/api/queries";
import { endSession } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { formatDateTime } from "@/lib/format";

export default function ProfilePage() {
  const me = useMe();
  const session = useSession();
  const router = useRouter();

  function logout() {
    endSession("logout");
    router.replace("/login");
  }

  return (
    <>
      <PageHeader title="Profil" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Operator" icon={UserRound} />
          {me.isPending ? (
            <Skeleton className="h-40" />
          ) : me.error ? (
            <ErrorState message={errorMessage(me.error)} onRetry={() => me.refetch()} />
          ) : (
            <>
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-[16px] bg-active text-lg font-semibold text-active-fg">
                  {(me.data.fullName ?? me.data.username).slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p className="text-lg text-ink">{me.data.fullName ?? me.data.username}</p>
                  <p className="text-sm text-muted">@{me.data.username}</p>
                </div>
              </div>
              <KeyValue
                rows={[
                  ["Role", me.data.role],
                  ["Status akun", me.data.enabled ? "Aktif" : "Nonaktif"],
                  ["ID", String(me.data.id)],
                ]}
              />
            </>
          )}
        </Card>
        <Card>
          <CardHeader title="Sesi" icon={LogOut} />
          <KeyValue
            rows={[
              ["Berakhir", session ? formatDateTime(session.expiresAt) : "—"],
              ["Sisa", session ? <RelativeTime key="r" iso={session.expiresAt} /> : "—"],
              ["Perpanjangan", "Tidak tersedia (backend tanpa refresh token)"],
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="danger" icon={LogOut} onClick={logout}>
              Keluar
            </Button>
            <Link href="/settings" className="inline-flex h-10 items-center gap-2 rounded-control bg-card-2 px-4 text-sm font-medium text-ink hover:bg-sunken">
              <Settings aria-hidden className="size-4" /> Pengaturan
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
