/**
 * Endpoint di autenticazione.
 * Restituisce il tipo User di mockUsers.ts (stessa interfaccia)
 * in modo che AuthContext non richieda modifiche alla firma pubblica.
 *
 * Strategia: se il backend Django non è raggiungibile (sviluppo locale senza
 * backend attivo), usa il fallback MOCK_USERS. In produzione (VITE_API_URL
 * configurato), usa solo il backend reale.
 */
import { apiFetch, setTokens } from './client';
import type { User, ToolId } from '../data/mockUsers';

// import.meta.env.PROD è una costante compile-time: Vite elimina i rami
// mock dal bundle di produzione tramite tree-shaking (dead-code elimination).
// In dev il fallback mock rimane disponibile per sviluppo offline.
const IS_PROD: boolean = import.meta.env.PROD;

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

/** Chiama /api/auth/login/. Se il backend non è raggiungibile, usa MOCK_USERS come fallback. */
export async function apiLogin(email: string, password: string): Promise<User> {
    try {
        const data = await apiFetch<BackendLoginResponse>('/api/auth/login/', {
            method: 'POST',
            body:   JSON.stringify({ email, password }),
        });
        return mapUser(data.user); // S5: token via cookie httpOnly, nessun setTokens
    } catch {
        // Backend non raggiungibile — fallback mock (rimuovere quando Django è in prod)
        const { MOCK_USERS } = await import('../data/mockUsers');
        const found = MOCK_USERS.find(
            u => u.email === email && u.password === password
        );
        if (!found) throw new Error('Credenziali non valide');
        setTokens('mock-access-token', 'mock-refresh-token');
        return found;
    }
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

/** Verifica il token corrente. Se backend non raggiungibile, legge la cache localStorage. */
export async function apiMe(): Promise<User> {
    try {
        const data = await apiFetch<BackendUser>('/api/auth/me/');
        return mapUser(data);
    } catch {
        // Backend non raggiungibile o token mock — leggi dalla cache
        const cached = localStorage.getItem('aea_user');
        if (cached) {
            try { return JSON.parse(cached) as User; } catch { /* corrotto */ }
        }
        throw new Error('Sessione scaduta');
    }
}
