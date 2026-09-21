import { useEffect, useState } from 'react';
import { X, Clock, RotateCcw } from 'lucide-react';
import { getRevisions, restoreRevision, type BackendRevision } from '../api/archive';
import { useToast } from './ui/Toast';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function RevisionHistoryModal({
    itemId,
    itemName,
    onClose,
    onRestored,
}: {
    itemId: number;
    itemName: string;
    onClose: () => void;
    onRestored: () => void;
}) {
    const [revisions, setRevisions] = useState<BackendRevision[]>([]);
    const [loading, setLoading] = useState(true);
    const [restoring, setRestoring] = useState<number | null>(null);
    const { success, error } = useToast();
    const trapRef = useFocusTrap<HTMLDivElement>(true);

    useEffect(() => {
        getRevisions(itemId)
            .then(setRevisions)
            .catch(() => error('Impossibile caricare la cronologia.'))
            .finally(() => setLoading(false));
    }, [itemId, error]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    async function handleRestore(rev: BackendRevision) {
        setRestoring(rev.id);
        try {
            await restoreRevision(itemId, rev.id);
            success(`Versione del ${new Date(rev.saved_at).toLocaleString('it-IT')} ripristinata.`);
            onRestored();
            onClose();
        } catch {
            error('Ripristino fallito. Riprova.');
        } finally {
            setRestoring(null);
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rev-modal-title"
            style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div ref={trapRef} className="card" style={{ width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <h2 id="rev-modal-title" style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Clock size={18} /> Cronologia revisioni
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {itemName}
                        </p>
                    </div>
                    <button className="btn btn-outline" onClick={onClose} aria-label="Chiudi cronologia" style={{ padding: '6px 10px' }}>
                        <X size={14} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loading && (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 32 }}>
                            Caricamento…
                        </p>
                    )}
                    {!loading && revisions.length === 0 && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                            <Clock size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p style={{ fontWeight: 600, marginBottom: 4 }}>Nessuna revisione</p>
                            <p style={{ fontSize: 12 }}>Le revisioni vengono create automaticamente ad ogni salvataggio.</p>
                        </div>
                    )}
                    {!loading && revisions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {revisions.map(rev => (
                                <div key={rev.id} style={{
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 8, padding: '10px 14px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                                    background: 'var(--color-surface)',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{rev.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            {new Date(rev.saved_at).toLocaleString('it-IT', {
                                                day: '2-digit', month: '2-digit', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit',
                                            })}
                                        </div>
                                    </div>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                                        disabled={restoring !== null}
                                        aria-label={`Ripristina versione del ${new Date(rev.saved_at).toLocaleString('it-IT')}`}
                                        onClick={() => handleRestore(rev)}
                                    >
                                        <RotateCcw size={13} />
                                        {restoring === rev.id ? 'Ripristino…' : 'Ripristina'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                    Massimo 20 revisioni per documento. Il ripristino salva automaticamente la versione corrente.
                </div>
            </div>
        </div>
    );
}
