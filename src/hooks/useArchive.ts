import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
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
    const useBackend = !!tool && isAuthenticated;

    const [items, setItems] = useState<ArchiveItem<T>[]>([]);
    const [loading, setLoading] = useState(false);

    // Dati locali non ancora migrati (mostrati al chiamante per proporre migrazione).
    const [pendingMigration, setPendingMigration] = useState<ArchiveItem<T>[]>([]);

    // Carica archivio al mount e quando cambia il contesto auth.
    useEffect(() => {
        if (!useBackend || !tool) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sync from localStorage on auth change
            setItems(readLocal<T>(storageKey));
            return;
        }

        setLoading(true);
        listArchive(tool)
            .then((backendItems) => {
                const mapped: ArchiveItem<T>[] = backendItems.map((b) => ({
                    id: String(b.id),
                    name: b.name,
                    date: b.created_at,
                    data: b.data as T,
                }));
                setItems(mapped);

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

                    setItems((prev) =>
                        isNaN(numericId)
                            ? [mapped, ...prev]
                            : prev.map((it) => (it.id === existingId ? mapped : it))
                    );
                    return mapped.id;
                } catch {
                    // Backend non disponibile — fallback a localStorage.
                }
            }

            // localStorage path (legacy o non autenticato).
            const newItem: ArchiveItem<T> = {
                id: existingId ?? crypto.randomUUID(),
                name,
                date: new Date().toISOString(),
                data,
            };

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
        [useBackend, tool, storageKey],
    );

    const deleteItem = useCallback(
        async (id: string): Promise<void> => {
            if (useBackend) {
                try { await deleteArchive(parseInt(id, 10)); } catch { /* fallback locale */ }
            }
            setItems((prev) => {
                const updated = prev.filter((t) => t.id !== id);
                writeLocal(storageKey, updated);
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
        for (const item of pendingMigration) {
            await createArchive(tool, item.name, item.data);
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
    }, [tool, useBackend, pendingMigration, storageKey]);

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
