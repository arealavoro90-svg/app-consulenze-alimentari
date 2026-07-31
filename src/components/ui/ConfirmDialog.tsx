import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

export interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

// confirmBg/confirmHover: testo bianco sopra, valori scelti per garantire contrasto
// WCAG AA >=4.5:1 (icona/iconBg restano sui token originali, non sono testo-su-colore).
const VARIANT_CONFIG = {
    danger: {
        icon: Trash2,
        iconColor: 'var(--color-danger)',
        iconBg: 'var(--color-danger-bg)',
        confirmBg: '#ce3838',   // 4.94:1
        confirmHover: '#c53030', // 5.47:1
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'var(--color-warning)',
        iconBg: 'var(--color-warning-bg)',
        confirmBg: '#ae5f05',   // 4.73:1
        confirmHover: '#945104', // 6.11:1
    },
    info: {
        icon: Info,
        iconColor: 'var(--color-accent)',
        iconBg: 'var(--color-accent-bg)',
        // arancione brand pieno (scelta utente 2026-07-31: coerenza sul contrasto AA)
        confirmBg: 'var(--color-orange)',
        confirmHover: 'var(--color-orange-hover)',
    },
};

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel = 'Conferma',
    cancelLabel = 'Annulla',
    variant = 'warning',
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);
    const config = VARIANT_CONFIG[variant];
    const Icon = config.icon;

    // Focus the confirm button when the dialog opens
    useEffect(() => {
        if (open) {
            // Small delay to allow the animation to start
            const t = setTimeout(() => confirmRef.current?.focus(), 80);
            return () => clearTimeout(t);
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div
            className="confirm-dialog-overlay"
            onClick={onCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
        >
            <div
                className="confirm-dialog-card"
                onClick={e => e.stopPropagation()}
            >
                {/* Icon */}
                <div
                    className="confirm-dialog-icon"
                    style={{ background: config.iconBg }}
                >
                    <Icon size={22} color={config.iconColor} />
                </div>

                {/* Content */}
                <h3 id="confirm-dialog-title" className="confirm-dialog-title">
                    {title}
                </h3>
                <p className="confirm-dialog-message">{message}</p>

                {/* Actions */}
                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        className="confirm-dialog-btn confirm-dialog-btn--cancel"
                        onClick={onCancel}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        className="confirm-dialog-btn confirm-dialog-btn--confirm"
                        style={{
                            '--_confirm-bg': config.confirmBg,
                            '--_confirm-hover': config.confirmHover,
                        } as React.CSSProperties}
                        onClick={onConfirm}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
