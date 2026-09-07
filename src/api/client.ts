/**
 * Base API client con gestione automatica del JWT.
 *
 * BASE_URL:
 *   - sviluppo locale → '' (stringa vuota): Vite proxia /api/* → http://127.0.0.1:8000
 *   - produzione      → VITE_API_URL (impostato in Vercel env)
 */
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export async function apiFetch<T>(
    path: string,
    options: RequestInit = {},
): Promise<T> {
    // S5: autenticazione via httpOnly cookie — nessun token in header.
    // In dev mock il cookie non esiste, Django restituisce 401 → il chiamante
    // gestisce il fallback (vedi auth.ts).
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> | undefined ?? {}),
    };

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',   // invia il cookie httpOnly ad ogni richiesta
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { detail?: string };
        const err = new Error(body.detail ?? `HTTP ${res.status}`);
        (err as Error & { status: number }).status = res.status;
        throw err;
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}
