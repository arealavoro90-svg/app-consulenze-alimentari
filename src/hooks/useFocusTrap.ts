import { useEffect, useRef } from 'react';

const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Trap keyboard focus inside `ref` element while `active` is true.
 * Also restores focus to the previously focused element on deactivation.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
    const ref = useRef<T>(null);

    useEffect(() => {
        if (!active || !ref.current) return;

        const container = ref.current;
        const previouslyFocused = document.activeElement as HTMLElement | null;

        const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;
            const focusable = getFocusable();
            if (!focusable.length) { e.preventDefault(); return; }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) { e.preventDefault(); last.focus(); }
            } else {
                if (document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        // Move focus inside modal on open
        const focusable = getFocusable();
        if (focusable.length) focusable[0].focus();

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previouslyFocused?.focus();
        };
    }, [active]);

    return ref;
}
