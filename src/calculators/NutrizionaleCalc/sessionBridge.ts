/**
 * sessionBridge — persiste lo stato corrente di NutrizionaleCalc in localStorage
 * in modo che desktop e mobile possano condividere la ricetta attiva.
 *
 * Usato in due direzioni:
 *   desktop → scrive dopo loadFromArchive
 *   mobile  → legge al mount (dopo che il DB è caricato)
 */

const BRIDGE_KEY = 'nut_session_draft';

export interface SessionDraftRow {
    ingNome: string;
    grams: number;
    resa: number;
    eurKg: number;
}

export interface SessionDraftComp {
    name: string;
    pzUV: number;
    rows: SessionDraftRow[];
    additiveRows: { categoria: string; nomeSpecifico: string }[];
}

export interface SessionDraft {
    source: 'desktop' | 'mobile';
    timestamp: number;
    denominazione: string;
    pesoFinito_g: string;
    specificGravity: string;
    components: SessionDraftComp[];
    // Serving sizes (tutte stringhe per compatibilità con MobileNutForm)
    ue_porzione: string; ue_confezione: string; ue_pezzo: string;
    usa_serving: string; usa_confezione: string; usa_cup: string; usa_cucchiaio: string; usa_pezzo: string;
    ca_serving: string; ca_confezione: string; ca_cup: string; ca_cucchiaio: string; ca_pezzo: string;
    au_serving: string; au_confezione: string; au_pezzo: string;
    arabi_serving: string; arabi_confezione: string; arabi_cup: string; arabi_cucchiaio: string; arabi_pezzo: string;
}

function numStr(v: number | undefined | null): string {
    return v && v !== 0 ? String(v) : '';
}

export function writeBridge(draft: SessionDraft): void {
    try {
        localStorage.setItem(BRIDGE_KEY, JSON.stringify(draft));
    } catch { /* storage full or unavailable */ }
}

export function readBridge(): SessionDraft | null {
    try {
        const raw = localStorage.getItem(BRIDGE_KEY);
        return raw ? (JSON.parse(raw) as SessionDraft) : null;
    } catch {
        return null;
    }
}

export function clearBridge(): void {
    try { localStorage.removeItem(BRIDGE_KEY); } catch { /* ignore */ }
}

/** Costruisce un SessionDraft dal risultato di handleLoad nel desktop. */
export function buildDesktopDraft(
    archiveData: {
        nome_prodotto?: string; productName?: string;
        peso_finito_pz?: number; finishedWeight?: string;
        specificGravity?: string;
        serving_sizes?: {
            UE?: { porzione?: number; confezione?: number; pezzo?: number };
            USA?: { serving?: number; confezione?: number; cup?: number; cucchiaio?: number; pezzo?: number };
            Canada?: { serving?: number; confezione?: number; cup?: number; cucchiaio?: number; pezzo?: number };
            Australia?: { serving?: number; confezione?: number; pezzo?: number };
            Arabi?: { serving?: number; confezione?: number; cup?: number; cucchiaio?: number; pezzo?: number };
        };
    },
    loadedComps: {
        name: string; pzUV: number;
        rows: { ing: { nome: string }; grams: number; resa: number; eurKg: number }[];
        additiveRows: { categoria: string; nomeSpecifico: string }[];
    }[]
): SessionDraft {
    const serv = archiveData.serving_sizes || {};
    return {
        source: 'desktop',
        timestamp: Date.now(),
        denominazione: archiveData.nome_prodotto || archiveData.productName || '',
        pesoFinito_g: archiveData.peso_finito_pz
            ? String(archiveData.peso_finito_pz)
            : (archiveData.finishedWeight || ''),
        specificGravity: archiveData.specificGravity || '',
        components: loadedComps.map(c => ({
            name: c.name,
            pzUV: c.pzUV,
            rows: c.rows.map(r => ({
                ingNome: r.ing.nome,
                grams: r.grams,
                resa: r.resa ?? 100,
                eurKg: r.eurKg ?? 0,
            })),
            additiveRows: c.additiveRows.map(ar => ({
                categoria: ar.categoria,
                nomeSpecifico: ar.nomeSpecifico,
            })),
        })),
        ue_porzione:    numStr(serv.UE?.porzione),
        ue_confezione:  numStr(serv.UE?.confezione),
        ue_pezzo:       numStr(serv.UE?.pezzo),
        usa_serving:    numStr(serv.USA?.serving),
        usa_confezione: numStr(serv.USA?.confezione),
        usa_cup:        numStr(serv.USA?.cup),
        usa_cucchiaio:  numStr(serv.USA?.cucchiaio),
        usa_pezzo:      numStr(serv.USA?.pezzo),
        ca_serving:     numStr(serv.Canada?.serving),
        ca_confezione:  numStr(serv.Canada?.confezione),
        ca_cup:         numStr(serv.Canada?.cup),
        ca_cucchiaio:   numStr(serv.Canada?.cucchiaio),
        ca_pezzo:       numStr(serv.Canada?.pezzo),
        au_serving:     numStr(serv.Australia?.serving),
        au_confezione:  numStr(serv.Australia?.confezione),
        au_pezzo:       numStr(serv.Australia?.pezzo),
        arabi_serving:    numStr(serv.Arabi?.serving),
        arabi_confezione: numStr(serv.Arabi?.confezione),
        arabi_cup:        numStr(serv.Arabi?.cup),
        arabi_cucchiaio:  numStr(serv.Arabi?.cucchiaio),
        arabi_pezzo:      numStr(serv.Arabi?.pezzo),
    };
}
