import { useEffect, useCallback } from 'react';

export function useAutosave<T>(
    key: string,
    data: T,
    enabled: boolean,
    intervalMs = 30000,
): {
    hasDraft: boolean;
    loadDraft: () => T | null;
    clearDraft: () => void;
} {
    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(() => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
            } catch (e) {
                console.warn('[useAutosave] Failed to save draft:', e);
            }
        }, intervalMs);
        return () => clearInterval(id);
    }, [key, data, enabled, intervalMs]);

    const hasDraft = localStorage.getItem(key) !== null;

    const loadDraft = useCallback((): T | null => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? (JSON.parse(raw) as T) : null;
        } catch {
            return null;
        }
    }, [key]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(key);
    }, [key]);

    return { hasDraft, loadDraft, clearDraft };
}
