import { useState, useEffect } from 'react';
import type { IngredientDB } from '../data/ingredientsDB';
import type { Region } from '../logic/localizationModule';

export interface SavedRecipeRow {
    id: string;
    ingredient: IngredientDB;
    grams: number;
}

export interface SavedTableData {
    id: string;
    name: string;
    date: string;
    mode: 'recipe' | 'manual';
    region: Region;
    portionSize: number;
    // Recipe mode
    cookingLoss?: number;
    rows?: SavedRecipeRow[];
    // Manual mode
    manualFat?: number;
    manualSat?: number;
    manualCarbs?: number;
    manualSugars?: number;
    manualFibre?: number;
    manualProtein?: number;
    manualSalt?: number;
    manualKcal?: number;
    manualAutoKcal?: boolean;
}

const STORAGE_KEY = 'aea_saved_nutrition_tables';

export function useSavedTables() {
    const [tables, setTables] = useState<SavedTableData[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                setTables(JSON.parse(stored));
            } catch (err) {
                console.error('Failed to parse saved tables', err);
            }
        }
    }, []);

    const saveTable = (data: Omit<SavedTableData, 'id' | 'date'>, existingId?: string) => {
        const newTable: SavedTableData = {
            ...data,
            id: existingId || crypto.randomUUID(),
            date: new Date().toISOString(),
        };

        setTables(prev => {
            let updated;
            if (existingId && prev.some(t => t.id === existingId)) {
                updated = prev.map(t => t.id === existingId ? newTable : t);
            } else {
                updated = [newTable, ...prev];
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });

        return newTable.id;
    };

    const deleteTable = (id: string) => {
        setTables(prev => {
            const updated = prev.filter(t => t.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        });
    };

    return { tables, saveTable, deleteTable };
}
