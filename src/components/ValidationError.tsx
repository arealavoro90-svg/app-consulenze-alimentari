import React from 'react';

export interface ValidationErrorProps {
    message?: string;
    visible?: boolean;
    type?: 'error' | 'warning' | 'info';
    fieldName?: string;
}

/**
 * ValidationError component - displays validation errors inline next to form fields
 * Shows when user input validation fails
 */
export function ValidationError({
    message,
    visible = true,
    type = 'error',
    fieldName
}: ValidationErrorProps) {
    if (!visible || !message) return null;

    const iconMap = {
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    const colorMap = {
        error: '#e53e3e',
        warning: '#f6ad55',
        info: '#4299e1',
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginTop: 6,
                padding: '8px 12px',
                background: type === 'error' ? 'rgba(229, 62, 62, 0.08)' :
                           type === 'warning' ? 'rgba(246, 173, 85, 0.08)' :
                           'rgba(66, 153, 225, 0.08)',
                border: `1px solid ${colorMap[type]}`,
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.4,
                color: colorMap[type],
            }}
            role="alert"
            aria-live="polite"
        >
            <span style={{ flexShrink: 0, fontSize: 14 }}>
                {iconMap[type]}
            </span>
            <span>
                {fieldName ? `<strong>${fieldName}:</strong> ` : ''}{message}
            </span>
        </div>
    );
}

/**
 * ValidationErrorList component - displays multiple errors
 * Useful for form-level validation
 */
export function ValidationErrorList({
    errors,
    visible = true
}: {
    errors: {message: string; fieldName?: string}[];
    visible?: boolean;
}) {
    if (!visible || errors.length === 0) return null;

    return (
        <div
            style={{
                background: 'rgba(229, 62, 62, 0.08)',
                border: '1px solid #e53e3e',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
            }}
        >
            <div style={{ fontSize: 13, fontWeight: 600, color: '#e53e3e', marginBottom: 8 }}>
                ❌ Errori di validazione ({errors.length}):
            </div>
            <ul
                style={{
                    margin: 0,
                    paddingLeft: 20,
                    color: '#e53e3e',
                    fontSize: 12,
                }}
            >
                {errors.map((err, i) => (
                    <li key={i} style={{ marginBottom: i < errors.length - 1 ? 4 : 0 }}>
                        {err.fieldName ? <strong>{err.fieldName}:</strong> : ''} {err.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Toast notification for validation feedback - appears at top of screen
 * Useful for non-blocking user feedback
 */
export function ValidationToast({
    message,
    visible = false,
    autoHide = true,
    onDismiss
}: {
    message?: string;
    visible?: boolean;
    autoHide?: boolean;
    onDismiss?: () => void;
}) {
    React.useEffect(() => {
        if (visible && autoHide) {
            const timer = setTimeout(() => onDismiss?.(), 4000);
            return () => clearTimeout(timer);
        }
    }, [visible, autoHide, onDismiss]);

    if (!visible || !message) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 20,
                right: 20,
                background: '#e53e3e',
                color: 'white',
                padding: '14px 18px',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(229, 62, 62, 0.25)',
                fontSize: 13,
                fontWeight: 500,
                zIndex: 10000,
                animation: 'slideInRight 0.3s ease',
                maxWidth: 320,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
            }}
        >
            <span>❌</span>
            <span>{message}</span>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: 18,
                        lineHeight: 1,
                        marginLeft: 'auto',
                    }}
                >
                    ✕
                </button>
            )}
        </div>
    );
}
