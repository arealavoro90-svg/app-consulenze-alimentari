import { useState } from 'react';
import { Archive, X, Search, Calendar, Trash2, Copy } from 'lucide-react';
import type { ArchiveItem } from '../hooks/useArchive';
import { ConfirmDialog } from './ui/ConfirmDialog';

export function ArchiveModal<T>({
    items,
    currentId,
    onClose,
    onLoad,
    onDelete,
    onDuplicate,
    renderItemDetails,
    searchData,
}: {
    items: ArchiveItem<T>[];
    currentId?: string;
    onClose: () => void;
    onLoad: (item: ArchiveItem<T>) => void;
    onDelete: (id: string) => void;
    onDuplicate?: (item: ArchiveItem<T>) => void;
    renderItemDetails?: (data: T) => React.ReactNode;
    /** Restituisce una stringa ricercabile dai campi dati del documento. */
    searchData?: (data: T) => string;
}) {
    const [search, setSearch] = useState('');
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

    const q = search.toLowerCase();
    const filtered = items.filter(t => {
        if (!q) return true;
        const nameMatch = (t.name || 'Senza Nome').toLowerCase().includes(q);
        if (nameMatch) return true;
        if (searchData) return searchData(t.data).toLowerCase().includes(q);
        return false;
    });

    return (
        <>
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
            }}>
                <div className="card" style={{ width: '100%', maxWidth: 'min(600px, calc(100vw - 32px))', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Archive size={20} /> Archivio
                        </h2>
                        <button className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <X size={14} /> Chiudi
                        </button>
                    </div>

                    <div className="form-field" style={{ marginBottom: 20, position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                        <input
                            type="text"
                            placeholder="Cerca per nome o contenuto…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 32 }}
                        />
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                                {items.length === 0 ? (
                                    <>
                                        <Archive size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                                        <p style={{ fontWeight: 600, marginBottom: 4 }}>Archivio vuoto</p>
                                        <p style={{ fontSize: 12 }}>Salva il tuo primo documento per vederlo qui.</p>
                                    </>
                                ) : (
                                    <>
                                        <Search size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                                        <p style={{ fontWeight: 600, marginBottom: 4 }}>Nessun risultato</p>
                                        <p style={{ fontSize: 12 }}>Nessun documento corrisponde a "{search}".</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {filtered.map(item => (
                                    <div key={item.id} style={{
                                        border: currentId === item.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                        borderRadius: 8, padding: 16,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        flexWrap: 'wrap', gap: 10,
                                        background: currentId === item.id ? 'rgba(0,163,108,0.05)' : 'var(--color-surface)',
                                    }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 16 }}>
                                                {item.name || 'Senza Nome'}
                                                {currentId === item.id && (
                                                    <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--color-accent)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>ATTUALE</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, marginBottom: renderItemDetails ? 8 : 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Calendar size={11} />
                                                {new Date(item.date).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                            {renderItemDetails && (
                                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                                    {renderItemDetails(item.data)}
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8, paddingLeft: 16 }}>
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: 12 }}
                                                onClick={() => onLoad(item)}
                                            >
                                                Carica
                                            </button>
                                            {onDuplicate && (
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center' }}
                                                    title="Duplica"
                                                    onClick={() => onDuplicate(item)}
                                                >
                                                    <Copy size={14} />
                                                </button>
                                            )}
                                            <button
                                                className="btn btn-danger"
                                                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center' }}
                                                onClick={() => setPendingDelete({ id: item.id, name: item.name || 'Senza Nome' })}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {pendingDelete && (
                <ConfirmDialog
                    open
                    title="Eliminare elemento"
                    message={`Vuoi eliminare "${pendingDelete.name}"? L'azione è irreversibile.`}
                    variant="danger"
                    confirmLabel="Elimina"
                    onConfirm={() => { onDelete(pendingDelete.id); setPendingDelete(null); }}
                    onCancel={() => setPendingDelete(null)}
                />
            )}
        </>
    );
}
