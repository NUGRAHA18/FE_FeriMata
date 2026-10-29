import type { z } from "zod";
import { apiOrigin } from "@/config/site";
import { ensureFreshToken, refreshSession } from "@/lib/auth/refresh";
import { endSession, getSession, getToken } from "@/lib/auth/session";
import { apiErrorSchema } from "./types";

/** Satu-satunya jenis error dari klien HTTP. `code` = field `error` backend (mis. SAFETY_INTERLOCK). */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown> | null;
  readonly path: string;

  constructor(opts: { status: number; code: string; message: string; details?: Record<string, unknown> | null; path: string }) {
    super(opts.message);
    this.name = "ApiRequestError";
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details ?? null;
    this.path = opts.path;
  }

  /** Pesan per field untuk VALIDATION_ERROR (details: { field: pesan }). */
  fieldErrors(): Record<string, string> {
    if (this.code !== "VALIDATION_ERROR" || !this.details) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(this.details)) {
      if (typeof v === "string") out[k] = v;
      else if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").join(", ");
    }
    return out;
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

type RequestOptions<S extends z.ZodType | undefined> = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  schema?: S;
  signal?: AbortSignal;
  /** false untuk login (tidak mengirim token, 401 tidak mengakhiri sesi). */
  auth?: boolean;
};

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${apiOrigin()}/api${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

const fallbackMessages: Record<number, string> = {
  400: "Permintaan tidak valid.",
  401: "Sesi berakhir. Silakan masuk kembali.",
  403: "Akses ditolak.",
  404: "Data tidak ditemukan.",
  409: "Permintaan bertentangan dengan kondisi saat ini.",
  500: "Terjadi kesalahan di server.",
  503: "Layanan sedang tidak tersedia.",
};

export async function apiRequest<S extends z.ZodType | undefined = undefined>(
  path: string,
  opts: RequestOptions<S> = {},
): Promise<S extends z.ZodType ? z.infer<S> : unknown> {
  const { method = "GET", body, query, schema, signal, auth = true } = opts;

  // Token akses hampir habis? Perbarui dulu, supaya request ini tidak gagal 401.
  if (auth) await ensureFreshToken();

  const send = async () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth) {
      const token = getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    try {
      return await fetch(buildUrl(path, query), {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        cache: "no-store",
      });
    } catch (e) {
      if ((e as Error)?.name === "AbortError") throw e;
      throw new ApiRequestError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Tidak bisa terhubung ke server. Periksa koneksi internet atau jaringan greenhouse.",
        path,
      });
    }
  };

  let res = await send();
  // 401 pada request ber-token: coba perpanjang sesi sekali, lalu ulangi. Kalau refresh gagal,
  // refreshSession sudah mengakhiri sesi.
  if (res.status === 401 && auth && getSession()?.refreshToken && (await refreshSession())) {
    res = await send();
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(data);
    const err = new ApiRequestError({
      status: res.status,
      code: parsed.success ? parsed.data.error : `HTTP_${res.status}`,
      message: (parsed.success && parsed.data.message) || fallbackMessages[res.status] || `Kesalahan HTTP ${res.status}.`,
      details: parsed.success ? (parsed.data.details ?? null) : null,
      path,
    });
    if (res.status === 401 && auth) endSession("unauthorized");
    throw err;
  }

  if (!schema) return data as never;
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[api] Respons ${method} ${path} tidak sesuai kontrak`, result.error.issues);
    throw new ApiRequestError({
      status: res.status,
      code: "INVALID_RESPONSE",
      message: "Jawaban server tidak dikenali. Coba muat ulang halaman.",
      path,
    });
  }
  return result.data as never;
}

/**
 * Berkas terlindungi di luar `/api` (foto patroli di `/captures/**`, BE-2). Backend meminta token yang
 * sama dengan API, sedangkan `<img src>` tidak bisa mengirim header, jadi gambar diambil sebagai blob.
 * 401 dicoba sekali lagi setelah perpanjang sesi; gagal tidak mengakhiri sesi (cukup placeholder).
 */
export async function fetchProtectedBlob(url: string, signal?: AbortSignal): Promise<Blob> {
  await ensureFreshToken();
  const send = () => {
    const token = getToken();
    return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal, cache: "no-store" });
  };
  let res = await send();
  if (res.status === 401 && getSession()?.refreshToken && (await refreshSession())) res = await send();
  if (!res.ok) {
    throw new ApiRequestError({ status: res.status, code: `HTTP_${res.status}`, message: fallbackMessages[res.status] ?? `Kesalahan HTTP ${res.status}.`, path: url });
  }
  return res.blob();
}

/** Berkas teks dari `/api` (ekspor CSV backend). Butuh Bearer token, jadi tidak bisa lewat `<a href>`. */
export async function fetchApiText(path: string, query?: Query, signal?: AbortSignal): Promise<string> {
  return (await fetchProtectedBlob(buildUrl(path, query), signal)).text();
}

/** Pesan ramah untuk ditampilkan di kartu error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "MESSAGING_ERROR") return "Koneksi ke alat terputus; perintah dicatat sebagai gagal.";
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan yang tidak diketahui.";
}
