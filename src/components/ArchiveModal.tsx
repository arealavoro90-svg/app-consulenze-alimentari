import { useState } from 'react';
import type { ArchiveItem } from '../hooks/useArchive';

// Use a generic function declaration to support <T>
export function ArchiveModal<T>({
    items,
    currentId,
    onClose,
    onLoad,
    onDelete,
    renderItemDetails
}: {
    items: ArchiveItem<T>[];
    currentId?: string;
    onClose: () => void;
    onLoad: (item: ArchiveItem<T>) => void;
    onDelete: (id: string) => void;
    renderItemDetails?: (data: T) => React.ReactNode;
}) {
    const [search, setSearch] = useState('');

    const filtered = items.filter(t => (t.name || 'Senza Nome').toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
            <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>📂 Archivio Dati</h2>
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px' }}>✕ Chiudi</button>
                </div>

                <div className="form-field" style={{ marginBottom: 20 }}>
                    <input
                        type="text"
                        placeholder="🔍 Cerca per nome..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                            <p>Nessun elemento trovato nell'archivio.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filtered.map(item => (
                                <div key={item.id} style={{
                                    border: currentId === item.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    borderRadius: 8, padding: 16,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: currentId === item.id ? 'rgba(0,163,108,0.05)' : 'var(--color-surface)',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>
                                            {item.name || 'Senza Nome'}
                                            {currentId === item.id && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--color-accent)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>ATTUALE</span>}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: renderItemDetails ? 8 : 0 }}>
                                            🗓️ {new Date(item.date).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        {renderItemDetails && (
                                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                {renderItemDetails(item.data)}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, paddingLeft: 16 }}>
                                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onLoad(item)}>Carica</button>
                                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
                                            onClick={() => {
                                                if (confirm(`Sei sicuro di voler eliminare "${item.name || 'Senza Nome'}"?`)) onDelete(item.id);
                                            }}
                                        >🗑️</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
