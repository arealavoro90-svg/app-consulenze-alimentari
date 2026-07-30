/**
 * Engine di calcolo nutrizionale per il tool desktop (Valori Nutrizionali).
 * Pure functions — nessuna dipendenza React, nessun side effect.
 * Estratto da NutrizionaleCalc.tsx per consentire unit testing.
 */

// ─── Tipi dominio ─────────────────────────────────────────────────────────────

export interface DBIngredient {
    nome: string; etichetta: string;
    kcal: number; kj: number; acqua?: number;
    grassi: number; saturi: number; monoins?: number; polins?: number;
    trans?: number; colesterolo?: number;
    carboidrati: number; zuccheri: number; zuccheri_agg?: number;
    polioli?: number; amido?: number; fibre?: number;
    proteine: number; sodio_mg: number;
    potassio?: number; calcio?: number; fosforo?: number;
    magnesio?: number; ferro?: number; zinco?: number;
    vitA_eq?: number; vitD?: number; vitE?: number; vitC?: number;
    vitB1?: number; vitB2?: number; vitB3?: number;
    vitB6?: number; vitB9?: number; vitB12?: number;
    alcol?: number; eur_kg?: number;
    eritritolo?: number; acidi_organici?: number; glicerolo?: number;
    iodio?: number; rame?: number; manganese?: number; selenio?: number;
    betaCarotene?: number; retinolo?: number; vitA_iu?: number;
    vitK?: number; vitB5?: number;
    categoria?: string;
    fonte_dati?: string; fonte_link?: string;
    all_glutine?: string; all_grano?: string; all_crostacei?: string;
    all_uova?: string; all_pesci?: string; all_arachidi?: string;
    all_soia?: string; all_latte?: string; all_frutta_guscio?: string;
    all_anacardi?: string; all_sedano?: string; all_senape?: string; all_sesamo?: string;
    all_solfiti?: string; all_lupini?: string; all_molluschi?: string;
    cross_glutine?: string; cross_grano?: string; cross_crostacei?: string;
    cross_uova?: string; cross_pesci?: string; cross_arachidi?: string;
    cross_soia?: string; cross_latte?: string; cross_frutta_guscio?: string;
    cross_anacardi?: string; cross_sedano?: string; cross_senape?: string; cross_sesamo?: string;
    cross_solfiti?: string; cross_lupini?: string; cross_molluschi?: string;
}

export interface RecipeRow {
    id: string;
    ing: DBIngredient;
    grams: number;
    eurKg: number;
    resa: number;
    postCottura?: boolean;
    acquaAggiunta?: boolean;
}

export interface AdditiveRow {
    id: string;
    categoria: string;
    nomeSpecifico: string;
    grams: number;
    eurKg: number;
    resa: number;
}

export interface Component {
    id: string;
    name: string;
    rows: RecipeRow[];
    additiveRows: AdditiveRow[];
    pzUV: number;
}

export interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; rame: number; manganese: number; selenio: number; iodio: number;
    vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
    vitK: number; vitB5: number;
}

export const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    rame: 0, manganese: 0, selenio: 0, iodio: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0, vitB6: 0,
    vitB9: 0, vitB12: 0, vitK: 0, vitB5: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: unknown): number { const num = Number(v); return isNaN(num) ? 0 : num; }

// ─── Funzioni pure ────────────────────────────────────────────────────────────

/**
 * Calcola i valori nutrizionali per 100g di prodotto finito.
 * - Somma i nutrienti di tutti gli ingredienti in tutti i componenti
 * - Applica la resa di cottura tramite pesoFinitoVal
 * - Gestisce l'evaporazione dell'alcol (EU Reg 1169/2011: 7 kcal/g, 29 kJ/g)
 * - Deriva sale da sodio_mg (sodio × 2,5437 ≈ 2,5)
 */
export function calcNutrients(components: Component[], pesoFinitoVal: number): CalcResult {
    let peso_totale_pz = 0;
    const g_per_pz_list: { ing: DBIngredient; g: number; postCottura?: boolean; acquaAggiunta?: boolean }[] = [];

    for (const c of components) {
        const pzUV = c.pzUV || 1;
        for (const r of c.rows) {
            const g_raw = r.grams / pzUV;
            const g_cooked = g_raw * ((r.resa ?? 100) / 100); // ponytail: resa applicata solo al denominatore; nutrienti restano su g_raw (valori DB sono per 100g crudi)
            peso_totale_pz += g_cooked;
            g_per_pz_list.push({ ing: r.ing, g: g_raw, postCottura: r.postCottura, acquaAggiunta: r.acquaAggiunta });
        }
        // Additivi: contribuiscono al peso crudo ma non ai nutrienti
        for (const r of c.additiveRows) {
            peso_totale_pz += (r.grams || 0) / pzUV;
        }
    }

    const pf_pz = pesoFinitoVal > 0 ? pesoFinitoVal : peso_totale_pz;
    if (pf_pz === 0) return { ...ZERO_CALC };

    const sum = { ...ZERO_CALC };
    for (const item of g_per_pz_list) {
        const f = item.g / 100;
        sum.energyKcal += n(item.ing.kcal) * f;
        sum.energyKj   += n(item.ing.kj) * f;
        sum.grassi     += n(item.ing.grassi) * f;
        sum.saturi     += n(item.ing.saturi) * f;
        sum.monoins    += n(item.ing.monoins) * f;
        sum.polins     += n(item.ing.polins) * f;
        sum.trans      += n(item.ing.trans) * f;
        sum.colesterolo += n(item.ing.colesterolo) * f;
        sum.carboidrati += n(item.ing.carboidrati) * f;
        sum.zuccheri   += n(item.ing.zuccheri) * f;
        sum.zuccheri_agg += n(item.ing.zuccheri_agg) * f;
        sum.polioli    += n(item.ing.polioli) * f;
        sum.amido      += n(item.ing.amido) * f;
        sum.fibre      += n(item.ing.fibre) * f;
        sum.proteine   += n(item.ing.proteine) * f;
        sum.sodio_mg   += n(item.ing.sodio_mg) * f;
        sum.potassio   += n(item.ing.potassio) * f;
        sum.calcio     += n(item.ing.calcio) * f;
        sum.fosforo    += n(item.ing.fosforo) * f;
        sum.magnesio   += n(item.ing.magnesio) * f;
        sum.ferro      += n(item.ing.ferro) * f;
        sum.zinco      += n(item.ing.zinco) * f;
        sum.vitA_eq    += n(item.ing.vitA_eq) * f;
        sum.vitD       += n(item.ing.vitD) * f;
        sum.vitE       += n(item.ing.vitE) * f;
        sum.vitC       += n(item.ing.vitC) * f;
        sum.vitB1      += n(item.ing.vitB1) * f;
        sum.vitB2      += n(item.ing.vitB2) * f;
        sum.vitB3      += n(item.ing.vitB3) * f;
        sum.vitB6      += n(item.ing.vitB6) * f;
        sum.vitB9      += n(item.ing.vitB9) * f;
        sum.vitB12     += n(item.ing.vitB12) * f;
        sum.vitK       += n(item.ing.vitK) * f;
        sum.vitB5      += n(item.ing.vitB5) * f;
        sum.rame       += n(item.ing.rame) * f;
        sum.manganese  += n(item.ing.manganese) * f;
        sum.selenio    += n(item.ing.selenio) * f;
        sum.iodio      += n(item.ing.iodio) * f;
    }

    // Evaporazione alcol pre-cottura (EU Reg 1169/2011: 7 kcal/g, 29 kJ/g)
    const calo_peso = Math.max(0, peso_totale_pz - pf_pz);
    if (calo_peso > 0) {
        const alcol_pre_abs = g_per_pz_list.reduce((s, item) =>
            !item.postCottura ? s + (n(item.ing.alcol) / 100) * item.g : s, 0);
        const evaporated_alcol_abs = Math.min(calo_peso, alcol_pre_abs);
        if (evaporated_alcol_abs > 0) {
            sum.energyKcal -= evaporated_alcol_abs * 7;
            sum.energyKj   -= evaporated_alcol_abs * 29;
        }
    }

    const factor = 100 / pf_pz;
    const r: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(sum) as (keyof CalcResult)[]) {
        (r as unknown as Record<string, number>)[k] = (sum as unknown as Record<string, number>)[k] * factor;
    }
    r.sale = r.sodio_mg / 1000 * 2.5;       // sale = sodio(g) × 2,5 — EU Reg 1169/2011
    r.carboidratiTot = r.carboidrati + r.fibre;
    return r;
}

/**
 * Scala un CalcResult (per 100g) a una quantità arbitraria in grammi.
 */
export function scaleResult(r: CalcResult, grams: number): CalcResult {
    const f = grams / 100;
    const s: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(r) as (keyof CalcResult)[]) {
        (s as unknown as Record<string, number>)[k] = (r as unknown as Record<string, number>)[k] * f;
    }
    return s;
}

/**
 * Genera i claim nutrizionali EU (Reg. 2006/1924) a partire da CalcResult per 100g.
 * Usa direttamente i campi italiani di CalcResult — non dipende da nutritionalEngine.ts (dead code).
 * @param r   - CalcResult per 100g prodotto finito
 * @param isLiquid - true per liquidi (soglie zuccheri/grassi dimezzate)
 */
export function calcClaims(r: CalcResult, isLiquid = false): string[] {
    const claims: string[] = [];

    // ─── Fibre: FONTE ≥3g, RICCO ≥6g ────────────────────────────────────────
    if (r.fibre >= 6)       claims.push('RICCO DI FIBRE');
    else if (r.fibre >= 3)  claims.push('FONTE DI FIBRE');

    // ─── Proteine: % energia — FONTE ≥12%, AD ALTO CONTENUTO ≥20% ───────────
    if (r.energyKcal > 0) {
        const protPct = (r.proteine * 4 / r.energyKcal) * 100;
        if (protPct >= 20)      claims.push('AD ALTO CONTENUTO DI PROTEINE');
        else if (protPct >= 12) claims.push('FONTE DI PROTEINE');
    }

    // ─── Calcio: RI 800mg — FONTE ≥15% (120mg), RICCO ≥30% (240mg) ─────────
    if (r.calcio >= 240)       claims.push('RICCO DI CALCIO');
    else if (r.calcio >= 120)  claims.push('FONTE DI CALCIO');

    // ─── Ferro: RI 14mg — FONTE ≥15% (2.1mg), RICCO ≥30% (4.2mg) ───────────
    if (r.ferro >= 4.2)        claims.push('RICCO DI FERRO');
    else if (r.ferro >= 2.1)   claims.push('FONTE DI FERRO');

    // ─── Potassio: RI 2000mg (EU NRV) — FONTE ≥15% (300mg), RICCO ≥30% (600mg)
    if (r.potassio >= 600)     claims.push('RICCO DI POTASSIO');
    else if (r.potassio >= 300) claims.push('FONTE DI POTASSIO');

    // ─── Sodio basso: ≤120mg/100g = ≤0.12g ──────────────────────────────────
    if (r.sodio_mg <= 120)  claims.push('A BASSO CONTENUTO DI SODIO');

    // ─── Zuccheri bassi: ≤5g (solidi) o ≤2,5g (liquidi) ────────────────────
    if (r.zuccheri <= (isLiquid ? 2.5 : 5))  claims.push('A BASSO CONTENUTO DI ZUCCHERI');

    // ─── Grassi bassi: ≤3g (solidi) o ≤1,5g (liquidi) ──────────────────────
    if (r.grassi <= (isLiquid ? 1.5 : 3))    claims.push('A BASSO CONTENUTO DI GRASSI');

    return claims;
}

/**
 * QUID (Dichiarazione Quantitativa degli Ingredienti) — % di un ingrediente nel
 * prodotto finito. Se l'ingrediente è "acqua", sottrae l'acqua persa in cottura
 * (caloAcqua) dal suo peso grezzo prima di calcolare la percentuale; gli altri
 * ingredienti restano invariati. Usata sia per il valore di ogni riga sia per il
 * totale in header: stessa funzione in entrambi i punti, per costruzione la somma
 * dei QUID di riga corrisponde sempre al totale (nessuna doppia formula da tenere
 * allineata a mano).
 *
 * Calcolato a precisione piena fino al risultato finale, arrotondato solo in
 * visualizzazione — scelta intenzionale, più precisa del foglio Excel storico
 * sugli ingredienti in piccola quantità (che arrotonda un passaggio intermedio
 * a 2 decimali prima di applicare il fattore di concentrazione). Non allineare
 * il calcolo intermedio a un arrotondamento anticipato per "assomigliare" all'Excel.
 */
export function calcQuid(grammiXpzuv: number, isAcqua: boolean, caloAcqua: number, pesoFinitoPz: number): number {
    if (pesoFinitoPz <= 0) return 0;
    const grammiEffettivi = isAcqua ? Math.max(0, grammiXpzuv - caloAcqua) : grammiXpzuv;
    return (grammiEffettivi / pesoFinitoPz) * 100;
}

/**
 * Energia kcal/kJ da macro (EU Reg. 1169/2011, All. XIV) per 100g.
 * `carboidrati` include polioli ed eritritolo (convenzione form ingrediente custom);
 * eritritolo escluso dal computo (0 kcal/kJ per g).
 */
export function energyFromMacros(m: {
    grassi: number; carboidrati: number; polioli?: number; eritritolo?: number;
    fibre?: number; acidiOrganici?: number; proteine: number; alcolG?: number;
}): { kcal: number; kj: number } {
    const polioli = m.polioli ?? 0, eritritolo = m.eritritolo ?? 0;
    const fibre = m.fibre ?? 0, acidiOrg = m.acidiOrganici ?? 0, alcolG = m.alcolG ?? 0;
    const carboNetti = m.carboidrati - polioli - eritritolo;
    return {
        kcal: Math.round((m.grassi*9  + carboNetti*4  + polioli*2.4 + fibre*2 + acidiOrg*3  + m.proteine*4  + alcolG*7)  * 10) / 10,
        kj:   Math.round((m.grassi*37 + carboNetti*17 + polioli*10  + fibre*8 + acidiOrg*13 + m.proteine*17 + alcolG*29) * 10) / 10,
    };
}
