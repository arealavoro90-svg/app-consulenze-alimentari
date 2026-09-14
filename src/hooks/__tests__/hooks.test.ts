// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ponytail: stesso polyfill localStorage scoped usato in AuthContext.test.tsx —
// jsdom + Node in questo repo hanno window.localStorage rotto sotto vitest.
const lsStore: Record<string, string> = {};
const localStorageMock: Storage = {
    getItem: (key: string) => lsStore[key] ?? null,
    setItem: (key: string, value: string) => { lsStore[key] = value; },
    removeItem: (key: string) => { delete lsStore[key]; },
    clear: () => { Object.keys(lsStore).forEach(k => delete lsStore[k]); },
    key: (index: number) => Object.keys(lsStore)[index] ?? null,
    get length() { return Object.keys(lsStore).length; },
};
Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
});

// ─── useLocalStorage ─────────────────────────────────────────────────────────
describe('useLocalStorage', () => {
    beforeEach(() => localStorage.clear());

    it('restituisce il valore di default se la chiave non esiste', async () => {
        const { useLocalStorage } = await import('../useLocalStorage');
        const { result } = renderHook(() => useLocalStorage('test-key', 42));
        expect(result.current[0]).toBe(42);
    });

    it('persiste il valore nel localStorage', async () => {
        const { useLocalStorage } = await import('../useLocalStorage');
        const { result } = renderHook(() => useLocalStorage<number>('test-key', 0));
        act(() => { result.current[1](99); });
        expect(result.current[0]).toBe(99);
        expect(JSON.parse(localStorage.getItem('test-key')!)).toBe(99);
    });

    it('legge un valore già presente in localStorage', async () => {
        localStorage.setItem('pre-key', JSON.stringify('ciao'));
        const { useLocalStorage } = await import('../useLocalStorage');
        const { result } = renderHook(() => useLocalStorage<string>('pre-key', 'default'));
        expect(result.current[0]).toBe('ciao');
    });

    it('removeValue svuota localStorage e ripristina initialValue', async () => {
        const { useLocalStorage } = await import('../useLocalStorage');
        const { result } = renderHook(() => useLocalStorage<number>('rm-key', 5));
        act(() => { result.current[1](100); });
        act(() => { result.current[2](); });
        expect(result.current[0]).toBe(5);
        expect(localStorage.getItem('rm-key')).toBeNull();
    });

    it('JSON parse error → restituisce initialValue senza crash', async () => {
        localStorage.setItem('bad-key', 'NOT_JSON{{{');
        const { useLocalStorage } = await import('../useLocalStorage');
        const { result } = renderHook(() => useLocalStorage<number>('bad-key', -1));
        expect(result.current[0]).toBe(-1);
    });

    it('setValue con funzione updater funziona', async () => {
        const { useLocalStorage } = await import('../useLocalStorage');
        const { result } = renderHook(() => useLocalStorage<number>('fn-key', 10));
        act(() => { result.current[1](prev => prev + 5); });
        expect(result.current[0]).toBe(15);
    });
});

// ─── useAutosave ─────────────────────────────────────────────────────────────
describe('useAutosave', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.useFakeTimers();
    });
    afterEach(() => vi.useRealTimers());

    it('salva in localStorage dopo l\'intervallo', async () => {
        const { useAutosave } = await import('../useAutosave');
        const data = { v: 42 };
        renderHook(() => useAutosave('autosave-key', data, true, 5000));
        expect(localStorage.getItem('autosave-key')).toBeNull();
        act(() => { vi.advanceTimersByTime(5000); });
        expect(JSON.parse(localStorage.getItem('autosave-key')!)).toEqual({ v: 42 });
    });

    it('NON salva quando enabled=false', async () => {
        const { useAutosave } = await import('../useAutosave');
        renderHook(() => useAutosave('autosave-disabled', { v: 1 }, false, 1000));
        act(() => { vi.advanceTimersByTime(5000); });
        expect(localStorage.getItem('autosave-disabled')).toBeNull();
    });

    it('hasDraft: true se esiste qualcosa in localStorage', async () => {
        localStorage.setItem('draft-key', JSON.stringify({ x: 1 }));
        const { useAutosave } = await import('../useAutosave');
        const { result } = renderHook(() => useAutosave('draft-key', {}, true));
        expect(result.current.hasDraft).toBe(true);
    });

    it('loadDraft restituisce i dati salvati', async () => {
        localStorage.setItem('ld-key', JSON.stringify({ foo: 'bar' }));
        const { useAutosave } = await import('../useAutosave');
        const { result } = renderHook(() => useAutosave('ld-key', {}, true));
        expect(result.current.loadDraft()).toEqual({ foo: 'bar' });
    });

    it('clearDraft rimuove la bozza', async () => {
        localStorage.setItem('clr-key', JSON.stringify({ z: 9 }));
        const { useAutosave } = await import('../useAutosave');
        const { result } = renderHook(() => useAutosave('clr-key', {}, true));
        act(() => { result.current.clearDraft(); });
        expect(localStorage.getItem('clr-key')).toBeNull();
    });

    it('salva su beforeunload', async () => {
        const { useAutosave } = await import('../useAutosave');
        const data = { emergency: true };
        renderHook(() => useAutosave('bu-key', data, true));
        // Simula beforeunload
        act(() => { window.dispatchEvent(new Event('beforeunload')); });
        expect(JSON.parse(localStorage.getItem('bu-key')!)).toEqual({ emergency: true });
    });
});

// ─── useArchive (localStorage-only, senza backend) ───────────────────────────
// ponytail: mock di useAuth per restare sul path localStorage (isAuthenticated=false).
vi.mock('../../auth/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: false, user: null }),
}));
// ponytail: mock api/archive — non serve il backend per testare la path locale.
vi.mock('../../api/archive', () => ({
    listArchive: vi.fn(),
    createArchive: vi.fn(),
    updateArchive: vi.fn(),
    deleteArchive: vi.fn(),
}));

describe('useArchive — localStorage path', () => {
    beforeEach(() => localStorage.clear());

    it('items inizialmente vuoto', async () => {
        const { useArchive } = await import('../useArchive');
        const { result } = renderHook(() => useArchive<{ val: number }>('arc-key'));
        expect(result.current.items).toEqual([]);
    });

    it('saveItem aggiunge un elemento e lo persiste', async () => {
        const { useArchive } = await import('../useArchive');
        const { result } = renderHook(() => useArchive<{ val: number }>('arc-save'));
        await act(async () => {
            await result.current.saveItem('Ricetta A', { val: 1 });
        });
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].name).toBe('Ricetta A');
        const stored = JSON.parse(localStorage.getItem('arc-save')!);
        expect(stored).toHaveLength(1);
    });

    it('saveItem con existingId aggiorna l\'elemento', async () => {
        const { useArchive } = await import('../useArchive');
        const { result } = renderHook(() => useArchive<{ val: number }>('arc-upd'));
        let id = '';
        await act(async () => { id = await result.current.saveItem('Prima', { val: 10 }); });
        await act(async () => { await result.current.saveItem('Aggiornata', { val: 20 }, id); });
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].name).toBe('Aggiornata');
    });

    it('deleteItem rimuove l\'elemento', async () => {
        const { useArchive } = await import('../useArchive');
        const { result } = renderHook(() => useArchive<{ val: number }>('arc-del'));
        let id = '';
        await act(async () => { id = await result.current.saveItem('Da cancellare', { val: 99 }); });
        await act(async () => { await result.current.deleteItem(id); });
        expect(result.current.items).toHaveLength(0);
        expect(JSON.parse(localStorage.getItem('arc-del')!)).toHaveLength(0);
    });

    it('carica items già presenti in localStorage al mount', async () => {
        const existing = [{ id: 'x1', name: 'Cached', date: '2026-01-01', data: { val: 7 } }];
        localStorage.setItem('arc-preload', JSON.stringify(existing));
        const { useArchive } = await import('../useArchive');
        const { result } = renderHook(() => useArchive<{ val: number }>('arc-preload'));
        expect(result.current.items).toHaveLength(1);
        expect(result.current.items[0].name).toBe('Cached');
    });
});

// ─── useIngredientsDB ─────────────────────────────────────────────────────────
// S0: fromStatic ora usa dynamic import (non fetch). apiFetch è la sorgente primaria.
// In dev con VITE_DEV_MOCK_AUTH=false (forzato nei test, vedi vite.config.ts):
//   - apiFetch risolve → db popolato dall'API
//   - apiFetch rigetta → fallback a import('../data/ingredientsDB.json')
// In prod: nessun fallback statico (ramo eliminato da Vite a build time).

const MOCK_INGREDIENTS = [
    { id: 1, nome: 'Farina', etichetta: 'Farina di grano tenero', kcal: 364, kj: 1523, proteine: 10, grassi: 1, saturi: 0.2, carboidrati: 76, zuccheri: 0.3, fibre: 2.7, sodio_mg: 2 },
];

vi.mock('../../api/client', () => ({
    apiFetch: vi.fn(),
}));

// Intercetta il dynamic import del JSON bundled (fallback dev) — restituisce MOCK_INGREDIENTS
vi.mock('../../data/ingredientsDB.json', () => ({ default: MOCK_INGREDIENTS }));

import { apiFetch } from '../../api/client';

describe('useIngredientsDB', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(apiFetch).mockImplementation((url: string) =>
            Promise.resolve(url === '/api/ingredients/user/' ? [] : MOCK_INGREDIENTS)
        );
    });
    afterEach(() => vi.restoreAllMocks());

    it('loadingDB=true inizialmente, poi false dopo il caricamento', async () => {
        const { useIngredientsDB } = await import('../useIngredientsDB');
        const { result } = renderHook(() => useIngredientsDB());
        expect(result.current.loadingDB).toBe(true);
        await waitFor(() => expect(result.current.loadingDB).toBe(false));
    });

    it('db contiene i dati dopo il caricamento', async () => {
        const { useIngredientsDB } = await import('../useIngredientsDB');
        const { result } = renderHook(() => useIngredientsDB());
        await waitFor(() => expect(result.current.loadingDB).toBe(false));
        expect(result.current.db).toHaveLength(1);
        expect(result.current.db[0].nome).toBe('Farina');
    });

    it('merge degli ingredienti custom da localStorage', async () => {
        // Struttura richiesta da isValidDBIngredient (validation.ts:13-28)
        const custom = [{ nome: 'Ingrediente Custom', etichetta: 'custom', kcal: 100, kj: 418, proteine: 5, grassi: 2, saturi: 0.5, carboidrati: 10, zuccheri: 0.5, sodio_mg: 10 }];
        localStorage.setItem('custom_ingredients', JSON.stringify(custom));
        const { useIngredientsDB } = await import('../useIngredientsDB');
        const { result } = renderHook(() => useIngredientsDB());
        await waitFor(() => expect(result.current.loadingDB).toBe(false));
        expect(result.current.db.some(i => i.nome === 'Ingrediente Custom')).toBe(true);
    });

    it('API fallisce in dev → fallback JSON bundled, nessun dbError', async () => {
        // In dev: apiFetch rigetta → import('../data/ingredientsDB.json') (mockato sopra) → db popolato
        // In prod: il ramo fallback è eliminato da Vite → dbError verrebbe impostato
        vi.mocked(apiFetch).mockRejectedValue(new Error('network error'));
        const { useIngredientsDB } = await import('../useIngredientsDB');
        const { result } = renderHook(() => useIngredientsDB('Errore DB'));
        await waitFor(() => expect(result.current.loadingDB).toBe(false));
        expect(result.current.dbError).toBeNull();
        expect(result.current.db).toHaveLength(1);
    });
});

// ─── useMobile ────────────────────────────────────────────────────────────────
describe('useMobile', () => {
    const originalMatchMedia = window.matchMedia;

    function mockMatchMedia(matches: boolean) {
        const listeners: Array<(e: MediaQueryListEvent) => void> = [];
        const mq = {
            matches,
            addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => listeners.push(cb),
            removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
                const idx = listeners.indexOf(cb);
                if (idx !== -1) listeners.splice(idx, 1);
            },
            dispatchChange: (newMatches: boolean) => {
                listeners.forEach(cb => cb({ matches: newMatches } as MediaQueryListEvent));
            },
        };
        Object.defineProperty(window, 'matchMedia', {
            value: () => mq,
            writable: true,
            configurable: true,
        });
        return mq;
    }

    afterEach(() => {
        Object.defineProperty(window, 'matchMedia', {
            value: originalMatchMedia,
            writable: true,
            configurable: true,
        });
    });

    it('isMobile=true quando matchMedia.matches=true', async () => {
        mockMatchMedia(true);
        Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true });
        const { useMobile } = await import('../useMobile');
        const { result } = renderHook(() => useMobile());
        expect(result.current).toBe(true);
    });

    it('isMobile=false quando matchMedia.matches=false', async () => {
        mockMatchMedia(false);
        Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
        const { useMobile } = await import('../useMobile');
        const { result } = renderHook(() => useMobile());
        expect(result.current).toBe(false);
    });

    it('aggiorna isMobile al cambio del media query (con debounce)', async () => {
        vi.useFakeTimers();
        const mq = mockMatchMedia(false);
        Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true });
        const { useMobile } = await import('../useMobile');
        const { result } = renderHook(() => useMobile());
        expect(result.current).toBe(false);
        act(() => { mq.dispatchChange(true); });
        // Il debounce è 400ms — avanza il timer
        act(() => { vi.advanceTimersByTime(400); });
        expect(result.current).toBe(true);
        vi.useRealTimers();
    });
});
