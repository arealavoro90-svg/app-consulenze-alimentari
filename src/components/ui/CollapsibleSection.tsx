import { useState, type ReactNode } from 'react';
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

    const toggle = () => {
        setOpen(v => {
            const next = !v;
            try { localStorage.setItem(`et_sec_${storageKey}`, next ? '1' : '0'); } catch { /* storage non disponibile, stato solo in memoria */ }
            return next;
        });
    };

    return (
        <div className="card" style={{ marginBottom: 16 }}>
            <button
                type="button"
                onClick={toggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', background: 'none', border: 'none', padding: 0,
                    cursor: 'pointer', textAlign: 'left',
                    marginBottom: open ? 16 : 0,
                }}
            >
                <div>
                    <h3 style={{ fontWeight: 700, margin: 0 }}>{title}</h3>
                    {subtitle && <p className="hint" style={{ margin: '2px 0 0', fontSize: 11 }}>{subtitle}</p>}
                </div>
                <ChevronDown
                    size={16}
                    style={{
                        flexShrink: 0, marginLeft: 8,
                        transform: open ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                    }}
                />
            </button>
            {open && <div>{children}</div>}
        </div>
    );
}
