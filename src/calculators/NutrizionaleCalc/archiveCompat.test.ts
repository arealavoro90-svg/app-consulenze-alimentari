import { describe, it, expect, beforeEach } from 'vitest';
import { mobileEntryToArchiveData, migrateMobileArchive } from './archiveCompat';
import type { MobileArchiveEntry, MobileNutForm } from './NutrizionaleCalcMobile';
import type { DBIngredient } from '../../engines/nutrizionaleCalcEngine';

// Polyfill localStorage (bug noto jsdom 29 + Node 25, stesso pattern di AuthContext.test.tsx)
const store = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, String(v)); },
        removeItem: (k: string) => { store.delete(k); },
        clear: () => { store.clear(); },
    },
});

const FORM: MobileNutForm = {
    denominazione: 'Lasagna', porzione_g: '100', pesoFinito_g: '400',
    ue_porzione: '125', ue_confezione: '500', ue_pezzo: '',
    usa_serving: '55', usa_confezione: '', usa_cup: '', usa_cucchiaio: '', usa_pezzo: '',
    ca_serving: '', ca_confezione: '', ca_cup: '', ca_cucchiaio: '', ca_pezzo: '',
    au_serving: '', au_confezione: '', au_pezzo: '',
    arabi_serving: '', arabi_confezione: '', arabi_cup: '', arabi_cucchiaio: '', arabi_pezzo: '',
    specificGravity: '',
};

const ING = { nome: 'farina di grano tenero tipo 00', kcal: 340 } as unknown as DBIngredient;

const ENTRY: MobileArchiveEntry = {
    denominazione: 'Lasagna',
    porzione_g: 100,
    region: 'UE',
    calcResult: { energyKcal: 215.4 } as MobileArchiveEntry['calcResult'],
    form: FORM,
    components: [{
        id: 'c1', name: 'Base', pzUV: 2,
        rows: [{ id: 'r1', ing: ING, grams: 250, resa: 90, eurKg: 1.2 }],
        additiveRows: [{ id: 'a1', categoria: 'Conservanti', nomeSpecifico: 'E200', grams: 5, eurKg: 12, resa: 100 }],
    }],
};

describe('mobileEntryToArchiveData', () => {
    it('converte lo schema mobile nello schema unificato desktop', () => {
        const d = mobileEntryToArchiveData(ENTRY);
        expect(d.nome_prodotto).toBe('Lasagna');
        expect(d.peso_finito_pz).toBe(400);
        expect(d.kcal_100g).toBeCloseTo(215.4);
        expect(d.region).toBe('UE');
        expect(d.componenti).toHaveLength(1);
        expect(d.componenti[0].pz_uv).toBe(2);
        expect(d.componenti[0].ingredienti[0]).toEqual({ nome: ING.nome, grammi: 250, resa: 90, eurKg: 1.2 });
        expect(d.componenti[0].additiveRows).toEqual([{ categoria: 'Conservanti', nomeSpecifico: 'E200', grams: 5, eurKg: 12, resa: 100 }]);
        expect(d.serving_sizes.UE).toEqual({ porzione: 125, confezione: 500, pezzo: undefined });
        expect(d.serving_sizes.USA.serving).toBe(55);
        // campi vuoti non serializzati come 0
        expect(d.serving_sizes.Canada.serving).toBeUndefined();
    });
});

describe('migrateMobileArchive', () => {
    beforeEach(() => store.clear());

    const oldRaw = JSON.stringify([{ id: 'id1', name: 'Lasagna', date: '2026-07-01T00:00:00.000Z', data: ENTRY }]);

    it('migra le ricette in nutrizionale-v3, crea backup e rimuove la vecchia chiave', () => {
        store.set('nut_mobile_v2', oldRaw);
        migrateMobileArchive();
        const dest = JSON.parse(store.get('nutrizionale-v3')!);
        expect(dest).toHaveLength(1);
        expect(dest[0].id).toBe('id1');
        expect(dest[0].data.nome_prodotto).toBe('Lasagna');
        expect(store.get('nut_mobile_v2_backup')).toBe(oldRaw);
        expect(store.has('nut_mobile_v2')).toBe(false);
    });

    it('è idempotente e non duplica su run ripetute', () => {
        store.set('nut_mobile_v2', oldRaw);
        migrateMobileArchive();
        migrateMobileArchive();
        expect(JSON.parse(store.get('nutrizionale-v3')!)).toHaveLength(1);
    });

    it('preserva le ricette desktop già presenti in nutrizionale-v3', () => {
        store.set('nutrizionale-v3', JSON.stringify([{ id: 'desk1', name: 'Pane', date: '2026-06-01T00:00:00.000Z', data: { nome_prodotto: 'Pane' } }]));
        store.set('nut_mobile_v2', oldRaw);
        migrateMobileArchive();
        const dest = JSON.parse(store.get('nutrizionale-v3')!);
        expect(dest).toHaveLength(2);
        expect(dest.map((i: { id: string }) => i.id).sort()).toEqual(['desk1', 'id1']);
    });
});
