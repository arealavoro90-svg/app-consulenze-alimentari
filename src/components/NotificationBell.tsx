import { useState, useEffect, useRef } from 'react';
import { Bell, X } from 'lucide-react';

interface NormativeUpdate {
    id: string;
    date: string;
    category: string;
    title: string;
    summary: string;
    reference: string;
}

const STORAGE_KEY = 'aea_notif_read';

function getReadIds(): Set<string> {
    try {
        return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as string[]);
    } catch {
        return new Set();
    }
}

function saveReadIds(ids: Set<string>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function NotificationBell() {
    const [updates, setUpdates] = useState<NormativeUpdate[]>([]);
    const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
    const [open, setOpen] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/data/normative_updates.json')
            .then(r => r.json())
            .then((data: unknown) => {
                if (Array.isArray(data)) setUpdates(data as NormativeUpdate[]);
            })
            .catch(() => { /* rete assente o file mancante — ignora */ });
    }, []);

    // Chiudi pannello clic fuori
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const unread = updates.filter(u => !readIds.has(u.id)).length;

    function markAllRead() {
        const all = new Set(updates.map(u => u.id));
        setReadIds(all);
        saveReadIds(all);
    }

    function markRead(id: string) {
        const next = new Set(readIds);
        next.add(id);
        setReadIds(next);
        saveReadIds(next);
    }

    if (updates.length === 0) return null;

    return (
        <div style={{ position: 'relative' }} ref={panelRef}>
            <button
                type="button"
                aria-label={`Aggiornamenti normativi${unread > 0 ? ` — ${unread} non letti` : ''}`}
                onClick={() => setOpen(o => !o)}
                style={{
                    position: 'relative', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 6, color: 'var(--color-text-muted)',
                    display: 'flex', alignItems: 'center',
                }}
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'var(--color-accent)', color: '#fff',
                        borderRadius: '50%', width: 16, height: 16,
                        fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: 340, maxHeight: 420, overflowY: 'auto',
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                    zIndex: 2000,
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 14px 8px', borderBottom: '1px solid var(--color-border)',
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>Aggiornamenti normativi</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            {unread > 0 && (
                                <button
                                    type="button"
                                    onClick={markAllRead}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--color-accent)' }}
                                >
                                    Segna tutti letti
                                </button>
                            )}
                            <button
                                type="button"
                                aria-label="Chiudi notifiche"
                                onClick={() => setOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
                            >
                                <X size={14} />
                            </button>
                        </div>
                    </div>

                    <div style={{ padding: '6px 0' }}>
                        {updates.map(u => {
                            const isRead = readIds.has(u.id);
                            return (
                                <div
                                    key={u.id}
                                    onClick={() => markRead(u.id)}
                                    role={isRead ? undefined : 'button'}
                                    tabIndex={isRead ? undefined : 0}
                                    onKeyDown={isRead ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') markRead(u.id); }}
                                    aria-label={isRead ? undefined : `Segna come letto: ${u.title ?? ''}`}
                                    style={{
                                        padding: '10px 14px',
                                        borderBottom: '1px solid var(--color-border)',
                                        cursor: isRead ? 'default' : 'pointer',
                                        background: isRead ? 'transparent' : 'rgba(0,163,108,0.04)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                                        <span style={{
                                            fontSize: 10, fontWeight: 600,
                                            background: 'var(--color-accent)', color: '#fff',
                                            borderRadius: 4, padding: '1px 6px',
                                            flexShrink: 0,
                                        }}>
                                            {u.category}
                                        </span>
                                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                            {new Date(u.date).toLocaleDateString('it-IT')}
                                        </span>
                                    </div>
                                    <div style={{ fontWeight: isRead ? 400 : 700, fontSize: 12, marginBottom: 4, lineHeight: 1.4 }}>
                                        {u.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                        {u.summary}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                                        {u.reference}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
