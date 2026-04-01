import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { ToolId } from '../data/mockUsers';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredTool?: ToolId;
}

export function ProtectedRoute({ children, requiredTool }: ProtectedRouteProps) {
    const { isAuthenticated, hasTool } = useAuth();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredTool && !hasTool(requiredTool)) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
}
