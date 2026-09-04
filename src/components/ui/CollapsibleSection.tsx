import { useState, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function CollapsibleSection({
    title,
    defaultOpen = true,
    storageKey,
    children,
    subtitle,
}: {
    title: string | ReactNode;
    defaultOpen?: boolean;
    storageKey: string;
    children: ReactNode;
    subtitle?: string;
}) {
    const [open, setOpen] = useState(() => {
        try {
            const stored = localStorage.getItem(`et_sec_${storageKey}`);
            return stored !== null ? stored === '1' : defaultOpen;
        } catch { return defaultOpen; }
    });

    useEffect(() => {
        const handler = (e: Event) => {
            if ((e as CustomEvent<{ storageKey: string }>).detail?.storageKey === storageKey) {
                setOpen(true);
                try { localStorage.setItem(`et_sec_${storageKey}`, '1'); } catch { /* noop */ }
            }
        };
        document.addEventListener('openEtichetteSection', handler);
        return () => document.removeEventListener('openEtichetteSection', handler);
    }, [storageKey]);

    const toggle = () => {
        setOpen(v => {
            const next = !v;
            try { localStorage.setItem(`et_sec_${storageKey}`, next ? '1' : '0'); } catch { /* noop */ }
            return next;
        });
    };

    return (
        <div className="comp-card" style={{ marginBottom: 10 }}>
            <div className="comp-card-header" onClick={toggle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="comp-card-title" style={{ margin: 0 }}>{title}</h3>
                    {subtitle && <p className="hint" style={{ margin: '2px 0 0', fontSize: 11 }}>{subtitle}</p>}
                </div>
                <ChevronDown size={14} style={{ flexShrink: 0, marginLeft: 8, transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            </div>
            {open && <div className="comp-card-body">{children}</div>}
        </div>
    );
}
