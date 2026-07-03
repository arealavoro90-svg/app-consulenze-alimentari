import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────────── */
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
    id: number;
    message: string;
    variant: ToastVariant;
    exiting?: boolean;
}

interface ToastContextValue {
    toast: (message: string, variant?: ToastVariant) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

/* ── Context ───────────────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
    return ctx;
}

/* ── Variant config ────────────────────────────────────────────────────────── */
const VARIANT = {
    success: { icon: CheckCircle2, className: 'toast-item--success' },
    error:   { icon: XCircle,      className: 'toast-item--error' },
    warning: { icon: AlertTriangle, className: 'toast-item--warning' },
    info:    { icon: Info,          className: 'toast-item--info' },
} as const;

const AUTO_DISMISS_MS = 4000;
const EXIT_ANIMATION_MS = 200;

/* ── Provider ──────────────────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const idRef = useRef(0);

    const dismiss = useCallback((id: number) => {
        // Start exit animation
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        // Remove from DOM after animation
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, EXIT_ANIMATION_MS);
    }, []);

    const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
        const id = ++idRef.current;
        setToasts(prev => [...prev, { id, message, variant }]);
        // Auto-dismiss
        setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    }, [dismiss]);

    const value: ToastContextValue = {
        toast: addToast,
        success: useCallback((msg: string) => addToast(msg, 'success'), [addToast]),
        error: useCallback((msg: string) => addToast(msg, 'error'), [addToast]),
        warning: useCallback((msg: string) => addToast(msg, 'warning'), [addToast]),
        info: useCallback((msg: string) => addToast(msg, 'info'), [addToast]),
    };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Toast container — fixed bottom-right */}
            {toasts.length > 0 && (
                <div className="toast-container" aria-live="polite" aria-relevant="additions">
                    {toasts.map(t => {
                        const cfg = VARIANT[t.variant];
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={t.id}
                                className={`toast-item ${cfg.className}${t.exiting ? ' toast-item--exit' : ''}`}
                                role="status"
                            >
                                <Icon size={16} className="toast-item-icon" />
                                <span className="toast-item-message">{t.message}</span>
                                <button
                                    type="button"
                                    className="toast-item-close"
                                    onClick={() => dismiss(t.id)}
                                    aria-label="Chiudi notifica"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </ToastContext.Provider>
    );
}
