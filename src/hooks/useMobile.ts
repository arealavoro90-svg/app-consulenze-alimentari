import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;

// Debounce sul cambio breakpoint: passare da desktop a mobile (e viceversa) smonta/rimonta
// l'intero componente (vedi App.tsx), perdendo modali aperti e stato locale. Trascinando il
// bordo della finestra attorno a 768px questo scattava ad ogni frame — il debounce lo riduce
// a un solo switch quando l'utente si ferma oltre la soglia.
const RESIZE_DEBOUNCE_MS = 400;

export function useMobile(): boolean {
    const [isMobile, setIsMobile] = useState<boolean>(
        () => window.innerWidth < MOBILE_BREAKPOINT
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
        let timer: ReturnType<typeof setTimeout> | undefined;

        const handler = (e: MediaQueryListEvent) => {
            clearTimeout(timer);
            timer = setTimeout(() => setIsMobile(e.matches), RESIZE_DEBOUNCE_MS);
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync on mount to avoid flicker
        setIsMobile(mq.matches);

        mq.addEventListener('change', handler);
        return () => { clearTimeout(timer); mq.removeEventListener('change', handler); };
    }, []);

    return isMobile;
}
