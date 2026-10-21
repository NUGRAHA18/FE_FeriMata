"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, LogOut, Save, Settings, UserRound, Users } from "lucide-react";
import { Suspense, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PasswordField } from "@/components/ui/input";
import { KeyValue } from "@/components/ui/key-value";
import { ErrorState, Skeleton } from "@/components/ui/skeleton";
import { RelativeTime } from "@/components/ui/time";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { logout as apiLogout } from "@/lib/api/endpoints";
import { useChangePassword, useMe } from "@/lib/api/queries";
import { endSession, getSession, saveSession } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";
import { formatDateTime, roleLabel } from "@/lib/format";

function ChangePasswordForm({ highlighted }: { highlighted: boolean }) {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setDone(false);
    if (next.length < 8) return setLocalError("Kata sandi baru minimal 8 karakter.");
    if (next !== confirm) return setLocalError("Ulangi kata sandi baru dengan benar.");
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: (res) => {
          // Backend mencabut semua sesi lain dan memberi pasangan token baru untuk perangkat ini.
          saveSession({ token: res.accessToken, expiresAt: res.expiresAt, refreshToken: res.refreshToken, refreshExpiresAt: res.refreshExpiresAt, user: res.user });
          setCurrent("");
          setNext("");
          setConfirm("");
          setDone(true);
        },
      },
    );
  }

  const serverError = change.error ? (change.error instanceof ApiRequestError && change.error.status === 401 ? "Kata sandi saat ini salah." : errorMessage(change.error)) : null;

  return (
    <Card className={highlighted ? "ring-2 ring-accent" : undefined}>
      <CardHeader title="Ganti kata sandi" icon={KeyRound} />
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <PasswordField label="Kata sandi saat ini" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Kata sandi baru" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required hint="Minimal 8 karakter." />
          <PasswordField label="Ulangi kata sandi baru" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {(localError || serverError) && (
          <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
            {localError ?? serverError}
          </p>
        )}
        {done && <p className="rounded-inner bg-accent-soft px-3.5 py-2.5 text-sm text-accent">Kata sandi berhasil diganti. Perangkat lain harus masuk lagi.</p>}
        <div className="flex justify-end">
          <Button type="submit" variant="accent" size="lg" icon={Save} loading={change.isPending} disabled={!current || !next || !confirm}>
            Simpan kata sandi
          </Button>
        </div>
      </form>
    </Card>
  );
}

function ProfileContent() {
  const me = useMe();
  const session = useSession();
  const router = useRouter();
  const highlight = useSearchParams().get("ganti-sandi") === "1";

  async function logout() {
    const s = getSession();
    if (s?.refreshToken) {
      try {
        await apiLogout(s.refreshToken);
      } catch {
        // Token lokal tetap dihapus; refresh token kedaluwarsa sendiri.
      }
    }
    endSession("logout");
    router.replace("/login");
  }

  const isAdmin = session?.user.role === "ADMIN";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Pengguna" icon={UserRound} />
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
                ["Peran", roleLabel(me.data.role)],
                ["Status akun", me.data.enabled ? "Aktif" : "Nonaktif"],
              ]}
            />
          </>
        )}
      </Card>
      <Card>
        <CardHeader title="Sesi" icon={LogOut} />
        <KeyValue
          rows={[
            ["Masuk sampai", session ? formatDateTime(session.refreshExpiresAt) : "—"],
            ["Sisa waktu", session ? <RelativeTime key="r" iso={session.refreshExpiresAt} /> : "—"],
          ]}
        />
        <p className="mt-2 text-xs text-muted">Sesi diperpanjang otomatis selama Anda memakai aplikasi. Keluar untuk mengakhirinya di perangkat ini.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="danger" icon={LogOut} onClick={logout}>
            Keluar
          </Button>
          <Link href="/settings" className="inline-flex h-10 items-center gap-2 rounded-control bg-card-2 px-4 text-sm font-medium text-ink ring-1 ring-line hover:bg-sunken">
            <Settings aria-hidden className="size-4" /> Pengaturan
          </Link>
          {isAdmin && (
            <Link href="/users" className="inline-flex h-10 items-center gap-2 rounded-control bg-card-2 px-4 text-sm font-medium text-ink ring-1 ring-line hover:bg-sunken">
              <Users aria-hidden className="size-4" /> Kelola pengguna
            </Link>
          )}
        </div>
      </Card>
      <div className="lg:col-span-2">
        <ChangePasswordForm highlighted={highlight || !!session?.user.mustChangePassword} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Akun" />
      <Suspense>
        <ProfileContent />
      </Suspense>
    </>
  );
}
