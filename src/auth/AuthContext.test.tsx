// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// ponytail: jsdom 29 + Node 25 in questo repo hanno localStorage/sessionStorage
// rotti sotto vitest. Polyfill scoped a questo file per restare nel perimetro
// AUTH-2 (niente modifiche a vite.config.ts condiviso con tutta la repo).
const lsStore: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
    value: {
        getItem: (key: string) => lsStore[key] ?? null,
        setItem: (key: string, value: string) => { lsStore[key] = value; },
        removeItem: (key: string) => { delete lsStore[key]; },
        clear: () => { Object.keys(lsStore).forEach(k => delete lsStore[k]); },
        key: (index: number) => Object.keys(lsStore)[index] ?? null,
        get length() { return Object.keys(lsStore).length; },
    } as Storage,
    writable: true,
    configurable: true,
});
const ssStore: Record<string, string> = {};
Object.defineProperty(globalThis, 'sessionStorage', {
    value: {
        getItem: (key: string) => ssStore[key] ?? null,
        setItem: (key: string, value: string) => { ssStore[key] = value; },
        removeItem: (key: string) => { delete ssStore[key]; },
        clear: () => { Object.keys(ssStore).forEach(k => delete ssStore[k]); },
        key: (index: number) => Object.keys(ssStore)[index] ?? null,
        get length() { return Object.keys(ssStore).length; },
    } as Storage,
    writable: true,
    configurable: true,
});

// AUTH-2 (2026-07-30): un errore del backend non deve MAI autenticare un
// utente con un account finto o con una cache locale non verificata.
describe('AuthContext — AUTH-2: nessun fallback su errore backend', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('login(): se il backend risponde con errore, nega l\'accesso e non imposta alcun utente', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Backend non raggiungibile')));

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

        let ok: boolean | undefined;
        await act(async () => {
            ok = await result.current.login('admin@aea.it', 'admin2024');
        });

        expect(ok).toBe(false);
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(localStorage.getItem('aea_user')).toBeNull();
    });

    it('mount: se apiMe() fallisce, ignora una cache aea_user manomessa (es. role admin) e slogga', async () => {
        // Simula un utente che ha modificato localStorage per auto-elevarsi ad admin.
        localStorage.setItem('aea_access', 'token-falso-o-scaduto');
        localStorage.setItem('aea_refresh', 'refresh-falso-o-scaduto');
        localStorage.setItem('aea_user', JSON.stringify({
            id: 'fake', email: 'attacker@example.com', password: '', name: 'Attacker',
            company: '', role: 'admin',
            purchasedTools: ['nutrizionale', 'etichette', 'etichette-vini', 'rintracciabilita', 'trattamento-termico', 'schede-complete', 'scheda-processo', 'excel-import'],
        }));

        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Backend non raggiungibile')));

        const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

        // Verifica JWT in corso in background: attende l'esito reale, non il flash ottimistico iniziale.
        await waitFor(() => {
            expect(result.current.user).toBeNull();
        });

        expect(result.current.isAuthenticated).toBe(false);
        expect(localStorage.getItem('aea_user')).toBeNull();
        expect(localStorage.getItem('aea_access')).toBeNull();
        expect(localStorage.getItem('aea_refresh')).toBeNull();
    });
});
