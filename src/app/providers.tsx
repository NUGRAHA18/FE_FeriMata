"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { syncThemeColor } from "@/lib/theme";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data hidup datang lewat WebSocket, jadi tidak perlu refetch agresif.
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => {
          const status = (error as { status?: number }).status;
          if (status && status >= 400 && status < 500) return false;
          return count < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(makeQueryClient);
  useEffect(syncThemeColor, []);
  return (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}
