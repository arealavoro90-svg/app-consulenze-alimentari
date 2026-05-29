// src/components/ModeToggle.tsx
import { useLocalStorage } from '../hooks/useLocalStorage';

export type UIMode = 'guided' | 'expert';

export function useModeToggle() {
    return useLocalStorage<UIMode>('aea_ui_mode', 'guided');
}

interface ModeToggleProps {
    mode: UIMode;
    onChange: (mode: UIMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
    return (
        <div className="mode-toggle" role="group" aria-label="Modalità inserimento">
            <button
                className={mode === 'guided' ? 'active-guidato' : ''}
                onClick={() => onChange('guided')}
                aria-pressed={mode === 'guided'}
            >
                Guidato
            </button>
            <button
                className={mode === 'expert' ? 'active-esperto' : ''}
                onClick={() => onChange('expert')}
                aria-pressed={mode === 'expert'}
            >
                Esperto
            </button>
        </div>
    );
}
