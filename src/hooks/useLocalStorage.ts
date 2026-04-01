import { useState, useCallback } from 'react';

/**
 * Custom hook for safer localStorage usage with error handling
 * Supports any JSON-serializable type
 *
 * Usage:
 * const [value, setValue] = useLocalStorage<T>('key', initialValue);
 *
 * setValue automatically:
 * - Serializes to JSON
 * - Handles quota exceeded errors
 * - Logs errors in development
 * - Returns boolean success status
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`[useLocalStorage] Failed to read key "${key}":`, error);
            return initialValue;
        }
    });

    // Update localStorage when storedValue changes
    const setValue = useCallback((value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            localStorage.setItem(key, JSON.stringify(valueToStore));
            return true;
        } catch (error) {
            if (error instanceof Error) {
                // Check if quota exceeded
                if (
                    error.name === 'QuotaExceededError' ||
                    error.message.includes('QuotaExceeded')
                ) {
                    console.error(`[useLocalStorage] Quota exceeded for key "${key}". Storage is full.`);
                } else {
                    console.error(`[useLocalStorage] Failed to set key "${key}":`, error);
                }
            }
            return false;
        }
    }, [key, storedValue]);

    // Function to remove item
    const removeValue = useCallback(() => {
        try {
            localStorage.removeItem(key);
            setStoredValue(initialValue);
            return true;
        } catch (error) {
            console.error(`[useLocalStorage] Failed to remove key "${key}":`, error);
            return false;
        }
    }, [key, initialValue]);

    return [storedValue, setValue, removeValue] as const;
}

/**
 * Alternative: useLocalStorageSync - synchronous version
 * Use when you need immediate feedback on success/failure
 *
 * const { value, setValue, removeValue, isError } = useLocalStorageSync<T>(key, initialValue);
 */
export function useLocalStorageSync<T>(key: string, initialValue: T) {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`[useLocalStorageSync] Failed to read key "${key}":`, error);
            return initialValue;
        }
    });

    const [isError, setIsError] = useState(false);

    const setValue = useCallback((value: T | ((val: T) => T)): boolean => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            localStorage.setItem(key, JSON.stringify(valueToStore));
            setIsError(false);
            return true;
        } catch (error) {
            setIsError(true);
            console.error(`[useLocalStorageSync] Failed to set key "${key}":`, error);
            return false;
        }
    }, [key, storedValue]);

    const removeValue = useCallback((): boolean => {
        try {
            localStorage.removeItem(key);
            setStoredValue(initialValue);
            setIsError(false);
            return true;
        } catch (error) {
            setIsError(true);
            console.error(`[useLocalStorageSync] Failed to remove key "${key}":`, error);
            return false;
        }
    }, [key, initialValue]);

    return { value: storedValue, setValue, removeValue, isError };
}

/**
 * useLocalStorageJSON - For simple JSON data without custom hooks
 * Useful for storing UI state, preferences, etc.
 *
 * Usage:
 * useLocalStorageJSON('preferences', { theme: 'dark', language: 'it' });
 */
export function useLocalStorageJSON<T extends Record<string, any>>(
    key: string,
    initialValue: T
): [T, (update: Partial<T>) => void] {
    const [value, setValue] = useLocalStorage<T>(key, initialValue);

    const updateValue = useCallback((update: Partial<T>) => {
        setValue(prev => ({ ...prev, ...update }));
    }, [setValue]);

    return [value, updateValue];
}
