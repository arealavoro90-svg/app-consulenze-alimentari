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

export function AuthProvider({ children }: { children: ReactNode }) {
    /**
     * Restore istantaneo dalla cache localStorage per evitare flash bianco.
     * Il token viene verificato in background nell'useEffect.
     */
    const [user, setUser] = useState<User | null>(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            try { return JSON.parse(cached) as User; } catch { /* cache corrotta */ }
        }
        return null;
    });

    /**
     * Verifica la sessione al mount chiamando /api/auth/me/ — il token vive solo nel
     * cookie httpOnly (S5), mai in localStorage, quindi va sempre verificato via rete,
     * mai dedotto da uno storage locale che dal login via cookie non viene più scritto.
     * Se apiMe() fallisce (cookie assente/scaduto) → logout silenzioso.
     */
    useEffect(() => {
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

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
