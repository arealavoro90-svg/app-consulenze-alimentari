import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
    listArchive,
    createArchive,
    updateArchive,
    deleteArchive,
} from '../api/archive';

export interface ArchiveItem<T> {
    id: string;
    name: string;
    date: string;
    data: T;
}

// Flag localStorage per sapere se la migrazione è già avvenuta per questo tool.
function migrationKey(tool: string): string {
    return `aea_archive_migrated_${tool}`;
}

function readLocal<T>(storageKey: string): ArchiveItem<T>[] {
    try {
        const raw = localStorage.getItem(storageKey);
        return raw ? (JSON.parse(raw) as ArchiveItem<T>[]) : [];
    } catch {
        return [];
    }
}

function writeLocal<T>(storageKey: string, items: ArchiveItem<T>[]): void {
    localStorage.setItem(storageKey, JSON.stringify(items));
}

/**
 * useArchive<T>(storageKey, tool?)
 *
 * - tool non fornito → localStorage puro (comportamento legacy).
 * - tool fornito + utente autenticato → backend Django (/api/calc/archive/?tool=...).
 *   Prima volta dopo login: propone migrazione one-shot dei dati locali.
 * - tool fornito + utente NON autenticato → localStorage fallback.
 *
 * L'interfaccia esterna (ArchiveItem, saveItem, deleteItem) rimane identica
 * a prima: nessun cambio nei calcolatori che già usano questo hook.
 */
export function useArchive<T>(storageKey: string, tool?: string) {
    const { isAuthenticated } = useAuth();
    const { warning } = useToast();
    // AUDIT T3 — in mock auth l'utente è finto e non esiste alcuna sessione: ogni chiamata
    // all'archivio remoto è garantita fallire con 401 e ricadere su localStorage. Saltarla
    // porta allo stesso risultato senza round-trip inutili né errori in console che
    // sembrano guasti. Fuori dal mock il comportamento è invariato, fallback 401 incluso.
    const mockAuth = import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true';
    const useBackend = !!tool && isAuthenticated && !mockAuth;

    const [items, setItems] = useState<ArchiveItem<T>[]>([]);
    const [loading, setLoading] = useState(false);

    // Dati locali non ancora migrati (mostrati al chiamante per proporre migrazione).
    const [pendingMigration, setPendingMigration] = useState<ArchiveItem<T>[]>([]);

    // Timestamp dell'ultimo salvataggio. Previene che una listArchive in volo
    // sovrascriva lo state dopo un save più recente (race condition al mount).
    const lastSaveTimeRef = useRef<number>(0);

    // Carica archivio al mount e quando cambia il contesto auth.
    useEffect(() => {
        if (!useBackend || !tool) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage on auth change
            setItems(readLocal<T>(storageKey));
            return;
        }

        const fetchStartTime = Date.now();
        setLoading(true);
        listArchive(tool)
            .then((backendItems) => {
                // Race condition guard: se un save è avvenuto dopo che questa
                // fetch è partita, lo state locale è più aggiornato — non sovrascrivere.
                if (lastSaveTimeRef.current > fetchStartTime) return;

                const mapped: ArchiveItem<T>[] = backendItems.map((b) => ({
                    id: String(b.id),
                    name: b.name,
                    date: b.created_at,
                    data: b.data as T,
                }));

                // Se il backend restituisce un array vuoto, mostra i dati localStorage
                // (es. salvataggi avvenuti durante cold start backend).
                if (mapped.length > 0) {
                    // Sincronizza localStorage come cache: altri tool (es. EtichetteCalc) che
                    // leggono la stessa storageKey senza tool ricevono dati aggiornati.
                    // Usato anche come fallback al logout (useBackend → false).
                    writeLocal(storageKey, mapped);
                    setItems(mapped);
                } else {
                    setItems(readLocal<T>(storageKey));
                }

                // Controlla se ci sono dati locali da migrare (one-shot).
                if (!localStorage.getItem(migrationKey(tool))) {
                    const local = readLocal<T>(storageKey);
                    if (local.length > 0) setPendingMigration(local);
                }
            })
            .catch(() => {
                // Fallback localStorage se il backend non risponde.
                setItems(readLocal<T>(storageKey));
            })
            .finally(() => setLoading(false));
    }, [useBackend, tool, storageKey]);

    const saveItem = useCallback(
        async (name: string, data: T, existingId?: string): Promise<string> => {
            if (useBackend && tool) {
                try {
                    const numericId = existingId ? parseInt(existingId, 10) : NaN;
                    const backendItem = isNaN(numericId)
                        ? await createArchive(tool, name, data)
                        : await updateArchive(numericId, name, data);

                    const mapped: ArchiveItem<T> = {
                        id: String(backendItem.id),
                        name: backendItem.name,
                        date: backendItem.created_at,
                        data: backendItem.data as T,
                    };

                    lastSaveTimeRef.current = Date.now();
                    setItems((prev) => {
                        const updated = isNaN(numericId)
                            ? [mapped, ...prev]
                            : prev.map((it) => (it.id === existingId ? mapped : it));
                        writeLocal(storageKey, updated); // cache per logout e altri tool read-only
                        return updated;
                    });
                    return mapped.id;
                } catch {
                    // Backend non disponibile — fallback a localStorage.
                    warning('Salvataggio cloud non riuscito. Ricetta salvata localmente su questo dispositivo.');
                }
            }

            // localStorage path (legacy o non autenticato).
            const newItem: ArchiveItem<T> = {
                id: existingId ?? crypto.randomUUID(),
                name,
                date: new Date().toISOString(),
                data,
            };

            lastSaveTimeRef.current = Date.now();
            setItems((prev) => {
                const updated =
                    existingId && prev.some((t) => t.id === existingId)
                        ? prev.map((t) => (t.id === existingId ? newItem : t))
                        : [newItem, ...prev];
                writeLocal(storageKey, updated);
                return updated;
            });

            return newItem.id;
        },
        [useBackend, tool, storageKey, warning],
    );

    const deleteItem = useCallback(
        async (id: string): Promise<void> => {
            if (useBackend) {
                try { await deleteArchive(parseInt(id, 10)); } catch { /* fallback locale */ }
            }
            setItems((prev) => {
                const updated = prev.filter((t) => t.id !== id);
                writeLocal(storageKey, updated); // aggiorna cache in entrambe le modalità
                return updated;
            });
        },
        [useBackend, storageKey],
    );

    /**
     * Migra i dati locali (pendingMigration) nel backend.
     * Chiamare quando l'utente conferma il bottone di migrazione.
     * Dopo la migrazione: svuota localStorage e segna come già migrato.
     */
    const migrateLocalToBackend = useCallback(async (): Promise<void> => {
        if (!tool || !useBackend) return;
        try {
            for (const item of pendingMigration) {
                await createArchive(tool, item.name, item.data);
            }
        } catch {
            warning('Migrazione parzialmente fallita. Riprova.');
            return;
        }
        localStorage.removeItem(storageKey);
        localStorage.setItem(migrationKey(tool), '1');
        setPendingMigration([]);
        // Ricarica dal backend.
        const fresh = await listArchive(tool);
        setItems(
            fresh.map((b) => ({
                id: String(b.id),
                name: b.name,
                date: b.created_at,
                data: b.data as T,
            })),
        );
    }, [tool, useBackend, pendingMigration, storageKey, warning]);

    /**
     * Scarta la migrazione senza farlo. Segna come già gestita.
     */
    const dismissMigration = useCallback((): void => {
        if (tool) localStorage.setItem(migrationKey(tool), '1');
        setPendingMigration([]);
    }, [tool]);

    return {
        items,
        loading,
        saveItem,
        deleteItem,
        pendingMigration,
        migrateLocalToBackend,
        dismissMigration,
    };
}
