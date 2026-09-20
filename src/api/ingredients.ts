import { apiFetch } from './client';
import type { DBIngredient } from '../engines/nutrizionaleCalcEngine';

export async function listUserIngredients(): Promise<DBIngredient[]> {
    return apiFetch<DBIngredient[]>('/api/v1/ingredients/user/');
}

export async function createUserIngredient(ing: DBIngredient): Promise<DBIngredient> {
    return apiFetch<DBIngredient>('/api/v1/ingredients/user/', {
        method: 'POST',
        body: JSON.stringify(ing),
    });
}

export async function updateUserIngredient(uid: string, ing: DBIngredient): Promise<DBIngredient> {
    return apiFetch<DBIngredient>(`/api/v1/ingredients/user/${uid}/`, {
        method: 'PATCH',
        body: JSON.stringify(ing),
    });
}

export async function deleteUserIngredient(uid: string): Promise<void> {
    return apiFetch<void>(`/api/v1/ingredients/user/${uid}/`, { method: 'DELETE' });
}

export async function promoteUserIngredient(uid: string): Promise<DBIngredient> {
    return apiFetch<DBIngredient>(`/api/v1/ingredients/user/${uid}/promote/`, { method: 'POST' });
}

export async function createOfficialIngredient(ing: DBIngredient): Promise<DBIngredient> {
    return apiFetch<DBIngredient>('/api/v1/ingredients/', {
        method: 'POST',
        body: JSON.stringify(ing),
    });
}

export async function updateOfficialIngredient(id: number, ing: DBIngredient): Promise<DBIngredient> {
    return apiFetch<DBIngredient>(`/api/v1/ingredients/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(ing),
    });
}
