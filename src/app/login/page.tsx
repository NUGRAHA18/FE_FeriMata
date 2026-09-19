"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { Logo } from "@/components/shell/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import { ApiRequestError, errorMessage } from "@/lib/api/client";
import { login } from "@/lib/api/endpoints";
import { consumeEndReason, safeNext, saveSession, type EndReason } from "@/lib/auth/session";
import { useSession } from "@/lib/auth/use-session";

const reasonText: Record<EndReason, string | null> = {
  expired: "Sesi 60 menit telah berakhir. Silakan masuk kembali.",
  unauthorized: "Sesi tidak lagi berlaku. Silakan masuk kembali.",
  logout: null,
};

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const session = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice] = useState(() => (typeof window === "undefined" ? null : reasonText[consumeEndReason() ?? "logout"]));

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await login(username.trim(), password);
      saveSession({ token: res.accessToken, expiresAt: res.expiresAt, user: res.user });
      // Redirect dilakukan efek di atas begitu sesi tersimpan.
    } catch (err) {
      if (err instanceof ApiRequestError) setFieldErrors(err.fieldErrors());
      setError(err instanceof ApiRequestError && err.status === 401 ? err.message || "Username atau password salah." : errorMessage(err));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {notice && !error && <p className="rounded-inner bg-warn-soft px-3.5 py-2.5 text-sm text-warn-ink">{notice}</p>}
      <Field
        label="Username"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={fieldErrors.username}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      {error && (
        <p role="alert" className="rounded-inner bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          {error}
        </p>
      )}
      <Button type="submit" variant="dark" size="lg" icon={LogIn} loading={pending} disabled={!username.trim() || !password} className="mt-1 w-full">
        Masuk
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px]">
        <div className="rounded-card bg-card p-6 shadow-card sm:p-8">
          <div className="mb-7 flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-xl font-medium text-ink">{siteConfig.name}</h1>
              <p className="text-sm text-muted">Konsol operator Smart Melon</p>
            </div>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-xs text-muted">Sesi berlaku 60 menit. FERTIMATA Rev A.</p>
      </div>
    </main>
  );
}
