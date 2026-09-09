import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../api/client';
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

        // S0: prod usa solo API autenticata — nessun fallback statico pubblico.
        // Dev con VITE_DEV_MOCK_AUTH=true: carica JSON bundled (Django non necessario).
        // Dev senza mock: prova API, fallback al JSON bundled se Django non gira.
        // Il ramo import('../data/ingredientsDB.json') è eliminato dal bundle prod da Vite
        // (dead branch su import.meta.env.DEV === false a build time).
        let promise: Promise<DBIngredient[]>;
        if (mockAuth) {
            promise = import('../data/ingredientsDB.json').then(m => (m as { default: DBIngredient[] }).default);
        } else {
            promise = apiFetch<DBIngredient[]>('/api/ingredients/');
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
                try {
                    const raw = JSON.parse(localStorage.getItem('custom_ingredients') || '[]') as unknown[];
                    const custom = Array.isArray(raw) ? raw.filter(isValidDBIngredient) as DBIngredient[] : [];
                    if (custom.length) base = [...base, ...custom];
                } catch { /* localStorage corrotto o non disponibile */ }
                setDb(base);
                setLoadingDB(false);
            })
            .catch(err => { console.error('Error loading DB:', err); setLoadingDB(false); setDbError(errorMessage); });
    }, [errorMessage]);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadDB sets loading state on mount; this is the correct pattern for data fetching
    useEffect(() => { loadDB(); }, [loadDB]);

    return { db, setDb, loadingDB, dbError, loadDB };
}
