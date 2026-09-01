import { apiFetch } from './client';

export interface BackendArchiveItem {
    id: number;
    tool: string;
    name: string;
    data: unknown;
    created_at: string;
    updated_at: string;
}

export function listArchive(tool: string): Promise<BackendArchiveItem[]> {
    return apiFetch<BackendArchiveItem[]>(`/api/calc/archive/?tool=${encodeURIComponent(tool)}`);
}

export function createArchive(tool: string, name: string, data: unknown): Promise<BackendArchiveItem> {
    return apiFetch<BackendArchiveItem>('/api/calc/archive/', {
        method: 'POST',
        body: JSON.stringify({ tool, name, data }),
    });
}

export function updateArchive(id: number, name: string, data: unknown): Promise<BackendArchiveItem> {
    return apiFetch<BackendArchiveItem>(`/api/calc/archive/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ name, data }),
    });
}

export function deleteArchive(id: number): Promise<void> {
    return apiFetch<void>(`/api/calc/archive/${id}/`, { method: 'DELETE' });
}
