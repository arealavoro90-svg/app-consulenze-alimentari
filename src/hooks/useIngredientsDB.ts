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
        fromAPI()
            .catch(() => fromStatic())
            .then(data => {
                let base = data;
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

    useEffect(() => { loadDB(); }, [loadDB]);

    return { db, setDb, loadingDB, dbError, loadDB };
}
