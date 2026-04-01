import { useState } from 'react';
import type { SavedTableData } from '../../hooks/useSavedTables';

interface Props {
    tables: SavedTableData[];
    currentTableId?: string;
    onClose: () => void;
    onLoad: (table: SavedTableData) => void;
    onDelete: (id: string) => void;
}

export function SavedTablesModal({ tables, currentTableId, onClose, onLoad, onDelete }: Props) {
    const [search, setSearch] = useState('');

    const filtered = tables.filter(t => (t.name || 'Senza Nome').toLowerCase().includes(search.toLowerCase()));

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
        }}>
            <div className="card" style={{ width: '100%', maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0 }}>📂 Archivio Tabelle</h2>
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '6px 12px' }}>✕ Chiudi</button>
                </div>

                <div className="form-field" style={{ marginBottom: 20 }}>
                    <input
                        type="text"
                        placeholder="🔍 Cerca per nome prodotto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div style={{ overflowY: 'auto', flex: 1, paddingRight: 8 }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>
                            <p>Nessuna tabella trovata nell'archivio.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {filtered.map(table => (
                                <div key={table.id} style={{
                                    border: currentTableId === table.id ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                                    borderRadius: 8, padding: 16,
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: currentTableId === table.id ? 'rgba(0,163,108,0.05)' : 'var(--color-surface)',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>
                                            {table.name || 'Senza Nome'}
                                            {currentTableId === table.id && <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--color-accent)', color: 'white', padding: '2px 6px', borderRadius: 4 }}>ATTUALE</span>}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                            🗓️ {new Date(table.date).toLocaleDateString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                                            <span style={{ margin: '0 8px' }}>•</span>
                                            {table.mode === 'recipe' ? '🧑‍🍳 Da Ricetta' : '✏️ Manuale'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => onLoad(table)}>Carica</button>
                                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
                                            onClick={() => {
                                                if (confirm(`Sei sicuro di voler eliminare la tabella "${table.name || 'Senza Nome'}"?`)) onDelete(table.id);
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
