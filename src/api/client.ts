/**
 * Base API client con gestione automatica del JWT.
 *
 * BASE_URL:
 *   - sviluppo locale → '' (stringa vuota): Vite proxia /api/* → http://127.0.0.1:8000
 *   - produzione      → VITE_API_URL (impostato in Vercel env)
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const ACCESS_KEY  = 'aea_access';
const REFRESH_KEY = 'aea_refresh';

export function getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
}

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    const token = getAccessToken();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined ?? {}),
    };

    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        const err = new Error(body.detail ?? `HTTP ${res.status}`);
        (err as Error & { status: number }).status = res.status;
        throw err;
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}
