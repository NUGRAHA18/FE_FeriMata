"use client";

import { formatDateTime, formatRelative } from "@/lib/format";
import { useNow } from "@/lib/use-now";

/** "12 dtk lalu" yang terus berjalan; tooltip berisi waktu lengkap WIB. */
export function RelativeTime({ iso, prefix, fallback = "—" }: { iso: string | null | undefined; prefix?: string; fallback?: string }) {
  const now = useNow();
  if (!iso) return <>{fallback}</>;
  return (
    <time dateTime={iso} title={formatDateTime(iso)} suppressHydrationWarning>
      {prefix}
      {now ? formatRelative(iso, now) : ""}
    </time>
  );
}
