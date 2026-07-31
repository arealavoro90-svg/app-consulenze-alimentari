/**
 * archiveCompat — archivio unificato desktop+mobile.
 *
 * Schema canonico: ArchiveData (desktop, chiave localStorage 'nutrizionale-v3').
 * Qui vivono la conversione dal vecchio schema mobile (MobileArchiveEntry,
 * chiave 'nut_mobile_v2') e la migrazione one-time dei dati salvati.
 *
 * Solo import di tipi: nessuna dipendenza runtime, testabile in isolamento.
 */
import type { ArchiveData } from './NutrizionaleCalc';
import type { MobileArchiveEntry } from './NutrizionaleCalcMobile';
import type { ArchiveItem } from '../../hooks/useArchive';

const OLD_KEY = 'nut_mobile_v2';
const NEW_KEY = 'nutrizionale-v3';
const BACKUP_KEY = 'nut_mobile_v2_backup';

/** '' / non numerico / 0 → undefined (i serving vuoti non vanno serializzati come 0) */
function num(s: string | undefined): number | undefined {
    const v = parseFloat(s ?? '');
    return v > 0 ? v : undefined;
}

export function mobileEntryToArchiveData(e: MobileArchiveEntry): ArchiveData {
    const f = e.form;
    return {
        nome_prodotto: e.denominazione || f?.denominazione || '',
        componenti: (e.components ?? []).map(c => ({
            nome: c.name,
            pz_uv: c.pzUV,
            ingredienti: c.rows.map(r => ({ nome: r.ing.nome, grammi: r.grams, resa: r.resa, eurKg: r.eurKg })),
            additiveRows: c.additiveRows.map(({ categoria, nomeSpecifico, grams, eurKg, resa }) =>
                ({ categoria, nomeSpecifico, grams, eurKg, resa })),
        })),
        additivi: [],
        peso_finito_pz: parseFloat(f?.pesoFinito_g ?? '') || 0,
        specificGravity: f?.specificGravity || undefined,
        kcal_100g: e.calcResult?.energyKcal,
        region: e.region,
        serving_sizes: {
            UE:        { porzione: num(f?.ue_porzione) ?? num(f?.porzione_g), confezione: num(f?.ue_confezione), pezzo: num(f?.ue_pezzo) },
            USA:       { serving: num(f?.usa_serving), confezione: num(f?.usa_confezione), cup: num(f?.usa_cup), cucchiaio: num(f?.usa_cucchiaio), pezzo: num(f?.usa_pezzo) },
            Canada:    { serving: num(f?.ca_serving), confezione: num(f?.ca_confezione), cup: num(f?.ca_cup), cucchiaio: num(f?.ca_cucchiaio), pezzo: num(f?.ca_pezzo) },
            Australia: { serving: num(f?.au_serving), confezione: num(f?.au_confezione), pezzo: num(f?.au_pezzo) },
            Arabi:     { serving: num(f?.arabi_serving), confezione: num(f?.arabi_confezione), cup: num(f?.arabi_cup), cucchiaio: num(f?.arabi_cucchiaio), pezzo: num(f?.arabi_pezzo) },
        },
    };
}

/**
 * Migrazione one-time: sposta le ricette da 'nut_mobile_v2' a 'nutrizionale-v3'
 * convertendole nello schema unificato. Idempotente: la vecchia chiave viene
 * rinominata in backup (mai cancellata) e le run successive sono no-op.
 */
export function migrateMobileArchive(): void {
    try {
        const raw = localStorage.getItem(OLD_KEY);
        if (!raw) return;
        const oldItems = JSON.parse(raw) as ArchiveItem<MobileArchiveEntry>[];
        const destRaw = localStorage.getItem(NEW_KEY);
        const dest = destRaw ? (JSON.parse(destRaw) as ArchiveItem<ArchiveData>[]) : [];
        const existingIds = new Set(dest.map(d => d.id));
        const migrated = oldItems
            .filter(it => !existingIds.has(it.id))
            .map(it => ({ id: it.id, name: it.name, date: it.date, data: mobileEntryToArchiveData(it.data) }));
        localStorage.setItem(NEW_KEY, JSON.stringify([...migrated, ...dest]));
        localStorage.setItem(BACKUP_KEY, raw);
        localStorage.removeItem(OLD_KEY);
    } catch (err) {
        // Migrazione fallita: i dati vecchi restano intatti sotto OLD_KEY, l'archivio unificato parte vuoto.
        console.error('Migrazione archivio mobile → nutrizionale-v3 fallita', err);
    }
}
