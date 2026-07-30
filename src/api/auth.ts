/**
 * Endpoint di autenticazione.
 * Restituisce il tipo User di mockUsers.ts (stessa interfaccia)
 * in modo che AuthContext non richieda modifiche alla firma pubblica.
 *
 * AUTH-2 (2026-07-30): nessun fallback su errore. Se il backend rifiuta le
 * credenziali o non risponde, l'errore propaga al chiamante (AuthContext),
 * che nega l'accesso. Un'interruzione del backend non deve mai tradursi in
 * un login con account finto.
 */
import { apiFetch } from './client';
import type { User, ToolId } from '../data/mockUsers';

// Struttura restituita da /api/auth/login/ (S5: token solo in cookie, non nel body)
interface BackendLoginResponse {
    user: BackendUser;
}

// Struttura restituita da /api/auth/me/
interface BackendUser {
    id: number;
    email: string;
    name: string;
    company: string;
    role: 'admin' | 'client' | 'demo';
    purchased_tools: string[];
}

/** Mappa il formato backend → User del frontend */
function mapUser(u: BackendUser): User {
    return {
        id:             String(u.id),
        email:          u.email,
        password:       '',                                   // mai memorizzata sul client
        name:           u.name,
        company:        u.company ?? '',
        purchasedTools: (u.purchased_tools ?? []) as ToolId[],
        role:           u.role,
    };
}

/** Chiama /api/auth/login/. Se il backend rifiuta le credenziali o non risponde, l'errore propaga: nessun accesso. */
export async function apiLogin(email: string, password: string): Promise<User> {
    const data = await apiFetch<BackendLoginResponse>('/api/auth/login/', {
        method: 'POST',
        body:   JSON.stringify({ email, password }),
    });
    return mapUser(data.user); // S5: token via cookie httpOnly, nessun setTokens
}

/**
 * Chiama /api/auth/logout/ — Django cancella i cookie httpOnly e blacklista il refresh.
 */
export async function apiLogout(): Promise<void> {
    try {
        await apiFetch('/api/auth/logout/', { method: 'POST' });
    } catch {
        // Cookie scaduti o backend irraggiungibile — non critico
    }
}

/** Verifica il token corrente. Se il backend non risponde o lo rifiuta, l'errore propaga: sessione considerata scaduta. */
export async function apiMe(): Promise<User> {
    const data = await apiFetch<BackendUser>('/api/auth/me/');
    return mapUser(data);
}
