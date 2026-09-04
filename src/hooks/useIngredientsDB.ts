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
        // S0: carica da endpoint Django autenticato; in dev senza backend → fallback statico
        const fromAPI = () => apiFetch<DBIngredient[]>('/api/ingredients/');
        const fromStatic = () => fetch('/data/ingredientsDB.json').then(r => r.json() as Promise<DBIngredient[]>);
        // AUDIT T3 — con VITE_DEV_MOCK_AUTH attivo non esiste alcuna sessione: la chiamata
        // all'API è garantita fallire con 401. Saltarla evita un round-trip inutile e
        // toglie dalla console errori che sembrano guasti e non lo sono. Il 401 resta il
        // fallback legittimo in ogni altro caso (dev senza backend avviato, backend giù).
        const mockAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true';
        (mockAuth ? fromStatic() : fromAPI())
            .catch(() => fromStatic())
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
