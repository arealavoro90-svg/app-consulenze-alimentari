/**
 * Endpoint di autenticazione.
 * Restituisce il tipo User di mockUsers.ts (stessa interfaccia)
 * in modo che AuthContext non richieda modifiche alla firma pubblica.
 *
 * Strategia: se il backend Django non è raggiungibile (sviluppo locale senza
 * backend attivo), usa il fallback MOCK_USERS. In produzione (VITE_API_URL
 * configurato), usa solo il backend reale.
 */
import { apiFetch, setTokens, clearTokens, getRefreshToken } from './client';
import { MOCK_USERS } from '../data/mockUsers';
import type { User, ToolId } from '../data/mockUsers';

const IS_PROD = !!(import.meta.env.VITE_API_URL as string | undefined);

// Struttura restituita da /api/auth/login/
interface BackendLoginResponse {
    access: string;
    refresh: string;
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

/** Chiama /api/auth/login/. In dev senza backend, usa MOCK_USERS come fallback. */
export async function apiLogin(email: string, password: string): Promise<User> {
    if (!IS_PROD) {
        try {
            const data = await apiFetch<BackendLoginResponse>('/api/auth/login/', {
                method: 'POST',
                body:   JSON.stringify({ email, password }),
            });
            setTokens(data.access, data.refresh);
            return mapUser(data.user);
        } catch {
            // Backend non raggiungibile — usa mock locale
            const found = MOCK_USERS.find(
                u => u.email === email && u.password === password
            );
            if (!found) throw new Error('Credenziali non valide');
            // Token fittizio per il mock (non è un JWT reale)
            setTokens('mock-access-token', 'mock-refresh-token');
            return found;
        }
    }
    const data = await apiFetch<BackendLoginResponse>('/api/auth/login/', {
        method: 'POST',
        body:   JSON.stringify({ email, password }),
    });
    setTokens(data.access, data.refresh);
    return mapUser(data.user);
}

/**
 * Chiama /api/auth/logout/ per invalidare il refresh token (blacklist).
 * Pulisce i token locali in ogni caso.
 */
export async function apiLogout(): Promise<void> {
    const refresh = getRefreshToken();
    try {
        if (refresh) {
            await apiFetch('/api/auth/logout/', {
                method: 'POST',
                body:   JSON.stringify({ refresh }),
            });
        }
    } catch {
        // L'invalidazione server-side non è critica:
        // i token scadono comunque. Puliamo solo il locale.
    } finally {
        clearTokens();
    }
}

/** Verifica il token corrente. In dev con token mock, restituisce l'utente dalla cache. */
export async function apiMe(): Promise<User> {
    if (!IS_PROD) {
        try {
            const data = await apiFetch<BackendUser>('/api/auth/me/');
            return mapUser(data);
        } catch {
            // Token mock — leggi l'utente dalla cache localStorage
            const cached = localStorage.getItem('aea_user');
            if (cached) {
                try { return JSON.parse(cached) as User; } catch { /* corrotto */ }
            }
            throw new Error('Sessione scaduta');
        }
    }
    const data = await apiFetch<BackendUser>('/api/auth/me/');
    return mapUser(data);
}
