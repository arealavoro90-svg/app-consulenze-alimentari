import { useEffect, useRef, useState } from 'react';

export interface PromptDialogProps {
    open: boolean;
    title: string;
    label?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
}

/** Sostituisce il prompt() nativo: stesso overlay/card/bottoni di ConfirmDialog, con una casella di testo. */
export function PromptDialog({
    open,
    title,
    label,
    defaultValue = '',
    confirmLabel = 'Salva',
    cancelLabel = 'Annulla',
    onConfirm,
    onCancel,
}: PromptDialogProps) {
    const [value, setValue] = useState(defaultValue);
    const inputRef = useRef<HTMLInputElement>(null);

    // Ripristina il valore di default e mette il focus quando il dialog si apre
    useEffect(() => {
        if (open) {
            setValue(defaultValue);
            const t = setTimeout(() => inputRef.current?.focus(), 80);
            return () => clearTimeout(t);
        }
    }, [open, defaultValue]);

    // Chiudi su Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    if (!open) return null;

    const submit = () => {
        const v = value.trim();
        if (v) onConfirm(v);
    };

    return (
        <div
            className="confirm-dialog-overlay"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prompt-dialog-title"
        >
            <div className="confirm-dialog-card" onClick={e => e.stopPropagation()}>
                <h3 id="prompt-dialog-title" className="confirm-dialog-title">
                    {title}
                </h3>
                {label && (
                    <label htmlFor="prompt-dialog-input" className="confirm-dialog-message" style={{ display: 'block', textAlign: 'left' }}>
                        {label}
                    </label>
                )}
                <input
                    id="prompt-dialog-input"
                    ref={inputRef}
                    type="text"
                    className="form-input"
                    style={{ marginBottom: 22 }}
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                />
                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        className="confirm-dialog-btn confirm-dialog-btn--cancel"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className="confirm-dialog-btn confirm-dialog-btn--confirm"
                        onClick={submit}
                        disabled={!value.trim()}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
