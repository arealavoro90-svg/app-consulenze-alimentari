import { useState, useEffect } from 'react';

export interface ArchiveItem<T> {
    id: string;
    name: string;
    date: string;
    data: T;
}

export function useArchive<T>(storageKey: string) {
    const [items, setItems] = useState<ArchiveItem<T>[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            try {
                setItems(JSON.parse(stored));
            } catch (err) {
                console.error(`Failed to parse saved items for key ${storageKey}`, err);
            }
        }
    }, [storageKey]);

    const saveItem = (name: string, data: T, existingId?: string) => {
        const newItem: ArchiveItem<T> = {
            id: existingId || crypto.randomUUID(),
            name,
            date: new Date().toISOString(),
            data,
        };

        setItems(prev => {
            let updated;
            if (existingId && prev.some(t => t.id === existingId)) {
                updated = prev.map(t => t.id === existingId ? newItem : t);
            } else {
                updated = [newItem, ...prev];
            }
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });

        return newItem.id;
    };

    const deleteItem = (id: string) => {
        setItems(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    };

    return { items, saveItem, deleteItem };
}
