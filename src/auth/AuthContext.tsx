import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { MOCK_USERS } from '../data/mockUsers';
import type { User, ToolId } from '../data/mockUsers';

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isAuthenticated: boolean;
    hasTool: (toolId: ToolId) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('aea_user');
        if (saved) {
            try {
                setUser(JSON.parse(saved));
            } catch {
                localStorage.removeItem('aea_user');
            }
        }
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        const found = MOCK_USERS.find(
            (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );
        if (found) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _p, ...safeUser } = found;
            const userToStore = { ...safeUser, password: '' };
            setUser(userToStore as User);
            localStorage.setItem('aea_user', JSON.stringify(userToStore));
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('aea_user');
    };

    const hasTool = (toolId: ToolId): boolean => {
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
