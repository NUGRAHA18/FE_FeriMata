"use client";

import { useRouter } from "next/navigation";
import { KeyRound, Plus, Save, UserRound, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Inset } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field, PasswordField, Switch } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/status";
import { RelativeTime } from "@/components/ui/time";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { useCreateUser, usePatchUser, useResetPassword, useUsers } from "@/lib/api/queries";
import type { User } from "@/lib/api/types";
import { useSession } from "@/lib/auth/use-session";
import { roleLabel } from "@/lib/format";

const roles: { value: string; label: string; hint: string }[] = [
  { value: "VIEWER", label: "Pelihat", hint: "Hanya melihat angka dan foto, tidak bisa menyalakan alat." },
  { value: "OPERATOR", label: "Operator", hint: "Menyalakan/mematikan alat, mencatat tanaman, menangani peringatan." },
  { value: "ADMIN", label: "Admin", hint: "Semua yang operator bisa, plus mengelola pengguna." },
];

function NewUserForm({ onClose }: { onClose: () => void }) {
  const create = useCreateUser();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("OPERATOR");
  const [password, setPassword] = useState("");
  const fieldErrors = create.error instanceof ApiRequestError ? create.error.fieldErrors() : {};

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate({ username: username.trim(), fullName: fullName.trim() || undefined, role, password }, { onSuccess: onClose });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <Field label="Nama pengguna (untuk masuk)" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" spellCheck={false} required error={fieldErrors.username} hint="Huruf kecil, angka, titik, strip. Contoh: pak.budi" />
      <Field label="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} error={fieldErrors.fullName} />
      <Select label="Peran" hideLabel={false} id="nu-role" value={role} onChange={(e) => setRole(e.target.value)} wrapperClassName="flex-col items-start gap-1.5">
        {roles.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </Select>
      <p className="-mt-2 text-xs text-muted">{roles.find((r) => r.value === role)?.hint}</p>
      <PasswordField label="Kata sandi sementara" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required error={fieldErrors.password} hint="Minimal 8 karakter. Pengguna akan diminta menggantinya saat pertama masuk." />
      {create.error && !Object.keys(fieldErrors).length && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {errorMessage(create.error)}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="soft" onClick={onClose} disabled={create.isPending}>
          Batal
        </Button>
        <Button type="submit" variant="dark" icon={Save} loading={create.isPending} disabled={!username.trim() || password.length < 8}>
          Buat akun
        </Button>
      </div>
    </form>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    reset.mutate({ id: user.id, newPassword: password }, { onSuccess: onClose });
  }
  return (
    <Dialog open onClose={onClose} dismissible={!reset.isPending} title={`Atur ulang kata sandi ${user.fullName ?? user.username}`}>
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <PasswordField label="Kata sandi sementara baru" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus hint="Minimal 8 karakter. Semua perangkat pengguna ini akan keluar dan ia harus mengganti sandinya saat masuk." />
        {reset.error && (
          <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
            {errorMessage(reset.error)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="soft" onClick={onClose} disabled={reset.isPending}>
            Batal
          </Button>
          <Button type="submit" variant="danger" icon={KeyRound} loading={reset.isPending} disabled={password.length < 8}>
            Atur ulang
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function UserRow({ user, self }: { user: User; self: boolean }) {
  const patch = usePatchUser();
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [resetting, setResetting] = useState(false);
  return (
    <Inset className={!user.enabled ? "opacity-60" : undefined}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sunken text-ink-2">
            <UserRound aria-hidden className="size-5" strokeWidth={1.7} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">{user.fullName ?? user.username}</p>
              <Badge tone={user.role === "ADMIN" ? "info" : user.role === "OPERATOR" ? "ok" : "neutral"}>{roleLabel(user.role)}</Badge>
              {self && <Badge tone="neutral">Anda</Badge>}
              {!user.enabled && <Badge tone="warn">Nonaktif</Badge>}
              {user.mustChangePassword && <Badge tone="warn">Sandi sementara</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              @{user.username}
              {user.createdAt && (
                <>
                  {" · dibuat "}
                  <RelativeTime iso={user.createdAt} />
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select label="Peran" id={`role-${user.id}`} value={user.role} disabled={self || patch.isPending} onChange={(e) => patch.mutate({ id: user.id, body: { role: e.target.value } })}>
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Button size="sm" icon={KeyRound} onClick={() => setResetting(true)}>
            Atur ulang sandi
          </Button>
          <div className="flex items-center gap-2 text-xs text-muted">
            Aktif
            <Switch checked={user.enabled} label={`Akun ${user.username} aktif`} disabled={self || patch.isPending} onChange={(v) => (v ? patch.mutate({ id: user.id, body: { enabled: true } }) : setConfirmDisable(true))} />
          </div>
        </div>
      </div>
      {patch.error && (
        <p role="alert" className="mt-2 text-xs text-danger-ink">
          {errorMessage(patch.error)}
        </p>
      )}
      <ConfirmDialog
        open={confirmDisable}
        onClose={() => setConfirmDisable(false)}
        onConfirm={() => patch.mutate({ id: user.id, body: { enabled: false } }, { onSuccess: () => setConfirmDisable(false) })}
        pending={patch.isPending}
        error={confirmDisable && patch.error ? errorMessage(patch.error) : null}
        tone="danger"
        title={`Nonaktifkan ${user.fullName ?? user.username}?`}
        confirmLabel="Nonaktifkan"
      >
        Pengguna ini langsung keluar dari semua perangkat dan tidak bisa masuk lagi sampai diaktifkan kembali.
      </ConfirmDialog>
      {resetting && <ResetPasswordDialog user={user} onClose={() => setResetting(false)} />}
    </Inset>
  );
}

export default function UsersPage() {
  const session = useSession();
  const router = useRouter();
  const q = useUsers();
  const [adding, setAdding] = useState(false);
  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    if (session && !isAdmin) router.replace("/");
  }, [session, isAdmin, router]);

  if (!isAdmin) return null;

  return (
    <>
      <PageHeader title="Pengguna" subtitle="Siapa saja yang bisa masuk ke aplikasi dan apa yang boleh mereka lakukan." />
      <Card>
        <CardHeader
          title={q.data ? `${q.data.length} akun` : "Akun"}
          icon={Users}
          action={
            !adding && (
              <Button icon={Plus} onClick={() => setAdding(true)}>
                Tambah pengguna
              </Button>
            )
          }
        />
        {adding && (
          <div className="mb-4 rounded-inner bg-card-2 p-4 ring-1 ring-line">
            <NewUserForm onClose={() => setAdding(false)} />
          </div>
        )}
        {q.isPending ? (
          <Skeleton className="h-40 w-full rounded-inner" />
        ) : q.error ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : !q.data.length ? (
          <EmptyState title="Belum ada pengguna" />
        ) : (
          <div className="flex flex-col gap-2">
            {q.data.map((u) => (
              <UserRow key={u.id} user={u} self={u.username === session?.user.username} />
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
