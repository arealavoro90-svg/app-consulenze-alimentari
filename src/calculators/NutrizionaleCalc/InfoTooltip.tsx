import React, { useState, useRef, useEffect } from 'react';

const TOOLTIP_W = 230;
const TOOLTIP_MARGIN = 8; // min distanza dal bordo viewport

export function InfoTooltip({ text }: { text: string }) {
    const [visible, setVisible] = useState(false);
    const [pinned, setPinned] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const computePos = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        const vw = window.innerWidth;

        // Posizione orizzontale: centrata sul bottone, clamped nel viewport
        let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        left = Math.max(TOOLTIP_MARGIN, Math.min(left, vw - TOOLTIP_W - TOOLTIP_MARGIN));

        // Verticale: sopra di default, sotto se non c'è spazio (stima 110px di altezza)
        const below = rect.top < 120;
        const top = below ? rect.bottom + 6 : rect.top - 8;

        setPos({ top, left, below });
    };

    const handleMouseEnter = () => { computePos(); setVisible(true); };
    const handleMouseLeave = () => { if (!pinned) setVisible(false); };
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (pinned) {
            setPinned(false);
            setVisible(false);
        } else {
            computePos();
            setPinned(true);
            setVisible(true);
        }
    };

    // Chiude su click ovunque quando pinnato
    useEffect(() => {
        if (!pinned) return;
        const close = () => { setPinned(false); setVisible(false); };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [pinned]);

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
            <button
                ref={btnRef}
                type="button"
                title={text}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                style={{
                    background: 'none', border: '2px solid var(--color-orange)', cursor: 'pointer', padding: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}
            >i</button>
            {visible && pos && (
                <span style={{
                    position: 'fixed',
                    top: pos.top,
                    left: pos.left,
                    transform: pos.below ? 'none' : 'translateY(-100%)',
                    background: 'var(--color-navy)', color: '#fff', fontSize: 11.5, lineHeight: 1.5,
                    padding: '7px 11px', borderRadius: 'var(--radius-sm)', whiteSpace: 'normal',
                    width: TOOLTIP_W, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                }}>
                    {text}
                </span>
            )}
        </span>
    );
}
