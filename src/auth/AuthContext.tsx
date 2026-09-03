import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, ToolId } from '../data/mockUsers';
import { apiLogin, apiLogout, apiMe } from '../api/auth';
import { clearTokens } from '../api/client';

interface AuthContextType {
    user:            User | null;
    login:           (email: string, password: string) => Promise<boolean>;
    logout:          () => void;
    isAuthenticated: boolean;
    hasTool:         (toolId: ToolId) => boolean;
}

const CACHE_KEY  = 'aea_user';
const AuthContext = createContext<AuthContextType | null>(null);

// Dev-only mock — attivo solo quando VITE_DEV_MOCK_AUTH=true in .env.local
// Non viene mai incluso nei bundle di produzione (import.meta.env.DEV = false in build).
const DEV_MOCK_ENABLED =
    import.meta.env.DEV && import.meta.env.VITE_DEV_MOCK_AUTH === 'true';

const DEV_MOCK_USER: User = {
    id: 'dev-1',
    email: 'dev@aea.local',
    password: '',
    name: 'Dev Admin',
    company: 'AEA Dev',
    role: 'admin',
    purchasedTools: [
        'nutrizionale', 'etichette', 'etichette-vini',
        'rintracciabilita', 'trattamento-termico',
        'schede-complete', 'scheda-processo', 'excel-import',
    ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        // In mock mode: sempre loggato, nessuna chiamata backend
        if (DEV_MOCK_ENABLED) return DEV_MOCK_USER;
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try { return JSON.parse(cached) as User; } catch { /* cache corrotta */ }
        }
        return null;
    });

    useEffect(() => {
        // In mock mode: skip verifica backend
        if (DEV_MOCK_ENABLED) return;
        apiMe()
            .then((freshUser) => {
                setUser(freshUser);
                localStorage.setItem(CACHE_KEY, JSON.stringify(freshUser));
            })
            .catch(() => {
                setUser(null);
                localStorage.removeItem(CACHE_KEY);
                clearTokens();
            });
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        if (DEV_MOCK_ENABLED) {
            // Qualsiasi credenziale funziona in dev mock
            void email; void password;
            setUser(DEV_MOCK_USER);
            return true;
        }
        try {
            const loggedUser = await apiLogin(email, password);
            setUser(loggedUser);
            localStorage.setItem(CACHE_KEY, JSON.stringify(loggedUser));
            return true;
        } catch {
            return false;
        }
    };

    const logout = (): void => {
        setUser(null);
        localStorage.removeItem(CACHE_KEY);
        void apiLogout(); // fire-and-forget: blacklist refresh token sul server
    };

    /**
     * Admin ha accesso a tutti gli strumenti (role === 'admin').
     * Client e demo controllano purchasedTools.
     */
    const hasTool = (toolId: ToolId): boolean => {
        if (user?.role === 'admin') return true;
        return user?.purchasedTools.includes(toolId) ?? false;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, hasTool }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
