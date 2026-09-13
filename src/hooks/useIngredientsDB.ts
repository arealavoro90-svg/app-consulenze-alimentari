import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { listUserIngredients } from '../api/ingredients';
import { isValidDBIngredient } from '../utils/validation';
import { type DBIngredient } from '../engines/nutrizionaleCalcEngine';

export function useIngredientsDB(errorMessage = 'Impossibile caricare il database ingredienti.') {
    const [db, setDb] = useState<DBIngredient[]>([]);
    const [loadingDB, setLoadingDB] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    const loadDB = useCallback(() => {
        setLoadingDB(true);
        setDbError(null);

        const mockAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true';

        let promise: Promise<DBIngredient[]>;
        if (mockAuth) {
            promise = import('../data/ingredientsDB.json').then(m => (m as { default: DBIngredient[] }).default);
        } else {
            // Load official + user custom in parallel
            const official = apiFetch<DBIngredient[]>('/api/ingredients/');
            const custom = listUserIngredients().catch(() => [] as DBIngredient[]);
            promise = Promise.all([official, custom]).then(([off, cust]) => [...off, ...cust]);

            if (import.meta.env.DEV) {
                // ponytail: dev-only fallback — eliminato dal bundle prod (dead branch)
                promise = promise.catch(() =>
                    import('../data/ingredientsDB.json').then(m => (m as { default: DBIngredient[] }).default)
                );
            }
        }

        promise
            .then(data => {
                let base = Array.isArray(data) ? data : [];
                // Merge localStorage custom (legacy / unauthenticated fallback)
                try {
                    const raw = JSON.parse(localStorage.getItem('custom_ingredients') || '[]') as unknown[];
                    const local = Array.isArray(raw) ? raw.filter(isValidDBIngredient) as DBIngredient[] : [];
                    // Only add local items not already in backend (avoid duplicates by nome)
                    const backendNames = new Set(base.filter(i => i.categoria === '_custom').map(i => i.nome));
                    const newLocal = local.filter(i => !backendNames.has(i.nome));
                    if (newLocal.length) base = [...base, ...newLocal];
                } catch { /* localStorage corrotto */ }
                setDb(base);
                setLoadingDB(false);
            })
            .catch(err => {
                console.error('Error loading DB:', err);
                try {
                    const raw = JSON.parse(localStorage.getItem('custom_ingredients') || '[]') as unknown[];
                    const custom = Array.isArray(raw) ? raw.filter(isValidDBIngredient) as DBIngredient[] : [];
                    if (custom.length) setDb(custom);
                } catch { /* noop */ }
                setLoadingDB(false);
                setDbError(errorMessage);
            });
    }, [errorMessage]);

    useEffect(() => { loadDB(); }, [loadDB]);

    return { db, setDb, loadingDB, dbError, loadDB };
}
