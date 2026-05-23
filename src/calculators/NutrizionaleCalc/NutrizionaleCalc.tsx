import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    Save, FolderOpen, Plus, PlusCircle, Search, Database,
    ClipboardList, Scale, Layers, FlaskConical, Table2, Euro,
    AlertTriangle, Compass, SlidersHorizontal, ChevronRight, ChevronLeft,
    Trash2, X, BookOpen, CheckCircle, ChevronDown,
    Salad, Flame, Globe, Check, Package, ImageDown,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useArchive } from '../../hooks/useArchive';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ValidationError } from '../../components/ValidationError';
import { generateEtichettaPDF } from '../../utils/pdfGenerator';
import {
    validatePositiveNumber,
    validatePercentage,
    validateFinishedWeight,
    validateIngredientQuantity,
    validatePieces,
} from '../../utils/validation';
// import DB_RAW from '../../data/ingredientsDB.json'; // Removed static import for Part 5d
import { TabUE, DEFAULT_OPTIONALS } from './TabUE';
import { NutrientSelectModal } from './NutrientSelectModal';
import type { EUSubTab, SelectedOptionals } from './TabUE';


// ─── DB Types ─────────────────────────────────────────────────────────────────
interface DBIngredient {
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
// const DB = DB_RAW as unknown as DBIngredient[]; // Replaced with fetch state


// ─── Allergen config ──────────────────────────────────────────────────────────
const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' }, { key: 'all_grano', label: 'GRANO' },
    { key: 'all_crostacei', label: 'CROSTACEI' }, { key: 'all_uova', label: 'UOVA' },
    { key: 'all_pesci', label: 'PESCE' }, { key: 'all_arachidi', label: 'ARACHIDI' },
    { key: 'all_soia', label: 'SOIA' }, { key: 'all_latte', label: 'LATTE' },
    { key: 'all_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'all_anacardi', label: 'ANACARDI' },
    { key: 'all_solfiti', label: 'SOLFITI (>10 ppm)' }, { key: 'all_lupini', label: 'LUPINI' },
    { key: 'all_molluschi', label: 'MOLLUSCHI' },
];
const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'cross_glutine', label: 'GLUTINE' }, { key: 'cross_grano', label: 'GRANO' },
    { key: 'cross_crostacei', label: 'CROSTACEI' }, { key: 'cross_uova', label: 'UOVA' },
    { key: 'cross_pesci', label: 'PESCE' }, { key: 'cross_arachidi', label: 'ARACHIDI' },
    { key: 'cross_soia', label: 'SOIA' }, { key: 'cross_latte', label: 'LATTE' },
    { key: 'cross_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'cross_anacardi', label: 'ANACARDI' },
    { key: 'cross_sedano', label: 'SEDANO' }, { key: 'cross_senape', label: 'SENAPE' },
    { key: 'cross_sesamo', label: 'SESAMO' }, { key: 'cross_solfiti', label: 'SOLFITI' },
    { key: 'cross_lupini', label: 'LUPINI' }, { key: 'cross_molluschi', label: 'MOLLUSCHI' },
];

// ─── DV / AR References ───────────────────────────────────────────────────────
const DV_USA = {
    energyKcal: 2000, grassi: 78, saturi: 20, carboidratiTot: 275, fibre: 28,
    zuccheri_agg: 50, proteine: 50, sodio_mg: 2300, colesterolo: 300,
    potassio: 4700, calcio: 1300, ferro: 18, vitD: 20,
};
const DV_CA = {
    energyKcal: 2000, grassi: 78, satTrans: 20, carboidratiTot: 275, fibre: 25,
    zuccheri: 100, proteine: 50, sodio_mg: 2300, potassio: 4700, calcio: 1300, ferro: 18,
};
const DV_AU = {
    energyKj: 8700, energyKcal: 2049, grassi: 70, saturi: 24, carboidrati: 310,
    zuccheri: 90, fibre: 30, proteine: 50, sodio_mg: 2300,
};
const AR_ARABI = {
    energyKj: 8400, energyKcal: 2000, grassi: 70, saturi: 20, carboidrati: 260,
    fibre: 28, proteine: 50, sodio_mg: 2400, potassio: 2000, calcio: 1000,
    fosforo: 700, magnesio: 310, ferro: 22, zinco: 14, vitC: 100, vitB1: 1.2,
    vitB2: 1.2, vitB3: 15, vitB6: 1.3, vitB9: 400, vitB12: 2.4, vitA_eq: 800,
};

// ─── Calc result ──────────────────────────────────────────────────────────────
interface CalcResult {
    energyKcal: number; energyKj: number; grassi: number; saturi: number;
    monoins: number; polins: number; trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number; potassio: number;
    calcio: number; fosforo: number; magnesio: number; ferro: number;
    zinco: number; vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number; vitB9: number; vitB12: number;
}
const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0, vitB6: 0,
    vitB9: 0, vitB12: 0,
};

// ─── State types ──────────────────────────────────────────────────────────────
interface RecipeRow { id: string; ing: DBIngredient; grams: number; eurKg: number; resa: number; }
interface AdditiveRow { id: string; categoria: string; nomeSpecifico: string; grams: number; eurKg: number; resa: number; }
interface Component {
    id: string; name: string; rows: RecipeRow[]; additiveRows: AdditiveRow[]; pzUV: number;
}
interface ServingSizesNation {
    cup?: number; cucchiaio?: number; serving?: number; confezione?: number; pezzo?: number;
}
interface UEServing { porzione?: number; confezione?: number; pezzo?: number; }
interface ArchiveData {
    nome_prodotto: string;
    componenti: { nome: string; pz_uv: number; ingredienti: { nome: string; grammi: number }[] }[];
    additivi: string[];
    peso_finito_pz: number;
    serving_sizes: {
        UE: UEServing;
        USA: ServingSizesNation;
        Canada: ServingSizesNation;
        Australia: ServingSizesNation;
        Arabi: ServingSizesNation;
    };
}

type NationTab = 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
type SubTab = 'verticale' | 'orizzontale' | 'lineare';

// ─── Rounding helpers ─────────────────────────────────────────────────────────
// USA
function rUSA_energy(v: number): number {
    if (v < 5) return 0;
    if (v <= 50) return Math.round(v / 5) * 5;
    return Math.round(v / 10) * 10;
}
function rUSA_g(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
function rUSA_mg5(v: number): string { return v < 5 ? '0' : (Math.round(v / 5) * 5).toString(); }
function rUSA_pct(v: number, dv: number): string { return Math.round(v / dv * 100).toString(); }

// Canada
function rCA_energy(v: number): string { return v < 5 ? '0' : Math.round(v).toString(); }
function rCA_fat(v: number): string {
    if (v < 0.5) return '0';
    if (v <= 5) return v.toFixed(1);
    return Math.round(v).toString();
}
function rCA_carb(v: number): string { return v < 0.5 ? '0' : Math.round(v).toString(); }
function rCA_chol(v: number): string { return v < 2 ? '0' : Math.round(v).toString(); }
function rCA_na(v: number): string { return v < 5 ? '0' : Math.round(v).toString(); }
function rCA_iron(v: number): string { return v < 0.05 ? '0' : v.toFixed(1); }
function rCA_pct(v: number, dv: number): string { return Math.round(v / dv * 100).toString(); }

// Australia
function rAU_kj(v: number): string { return v < 40 ? 'less than 40' : Math.round(v).toString(); }
function rAU_kcal(v: number): string { return v < 9.5 ? 'less than 9.5' : Math.round(v).toString(); }
function rAU_g1(v: number): string { return v < 1 ? 'less than 1' : v.toFixed(1); }
function rAU_mg(v: number): string { return v < 5 ? 'less than 5' : Math.round(v).toString(); }

// Arabi
function rArabi_energy(v: number): string { return Math.round(v).toString(); }
function rArabi_g(v: number): string { return v < 0.1 ? '0' : v.toFixed(1); }
function rArabi_mg(v: number): string { return Math.round(v).toString(); }

// ─── Calculation engine ───────────────────────────────────────────────────────
function n(v: unknown): number { const num = Number(v); return isNaN(num) ? 0 : num; }

function calcNutrients(components: Component[], pesoFinitoVal: number): CalcResult {
    let peso_totale_pz = 0;
    const g_per_pz_list: { ing: DBIngredient; g: number }[] = [];

    for (const c of components) {
        const pzUV = c.pzUV || 1;
        for (const r of c.rows) {
            const g = r.grams / pzUV;
            peso_totale_pz += g;
            g_per_pz_list.push({ ing: r.ing, g });
        }
    }

    const pf_pz = pesoFinitoVal > 0 ? pesoFinitoVal : peso_totale_pz;
    if (pf_pz === 0) return { ...ZERO_CALC };

    const sum = { ...ZERO_CALC };
    for (const item of g_per_pz_list) {
        const f = item.g / 100;
        sum.energyKcal += n(item.ing.kcal) * f;
        sum.energyKj += n(item.ing.kj) * f;
        sum.grassi += n(item.ing.grassi) * f;
        sum.saturi += n(item.ing.saturi) * f;
        sum.monoins += n(item.ing.monoins) * f;
        sum.polins += n(item.ing.polins) * f;
        sum.trans += n(item.ing.trans) * f;
        sum.colesterolo += n(item.ing.colesterolo) * f;
        sum.carboidrati += n(item.ing.carboidrati) * f;
        sum.zuccheri += n(item.ing.zuccheri) * f;
        sum.zuccheri_agg += n(item.ing.zuccheri_agg) * f;
        sum.polioli += n(item.ing.polioli) * f;
        sum.amido += n(item.ing.amido) * f;
        sum.fibre += n(item.ing.fibre) * f;
        sum.proteine += n(item.ing.proteine) * f;
        sum.sodio_mg += n(item.ing.sodio_mg) * f;
        sum.potassio += n(item.ing.potassio) * f;
        sum.calcio += n(item.ing.calcio) * f;
        sum.fosforo += n(item.ing.fosforo) * f;
        sum.magnesio += n(item.ing.magnesio) * f;
        sum.ferro += n(item.ing.ferro) * f;
        sum.zinco += n(item.ing.zinco) * f;
        sum.vitA_eq += n(item.ing.vitA_eq) * f;
        sum.vitD += n(item.ing.vitD) * f;
        sum.vitE += n(item.ing.vitE) * f;
        sum.vitC += n(item.ing.vitC) * f;
        sum.vitB1 += n(item.ing.vitB1) * f;
        sum.vitB2 += n(item.ing.vitB2) * f;
        sum.vitB3 += n(item.ing.vitB3) * f;
        sum.vitB6 += n(item.ing.vitB6) * f;
        sum.vitB9 += n(item.ing.vitB9) * f;
        sum.vitB12 += n(item.ing.vitB12) * f;
    }

    const factor = 100 / pf_pz;
    const r: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(sum) as (keyof CalcResult)[]) {
        (r as unknown as Record<string, number>)[k] = (sum as unknown as Record<string, number>)[k] * factor;
    }
    r.sale = r.sodio_mg / 1000 * 2.5;
    r.carboidratiTot = r.carboidrati + r.fibre;
    return r;
}

function scaleResult(r: CalcResult, grams: number): CalcResult {
    const f = grams / 100;
    const s: CalcResult = { ...ZERO_CALC };
    for (const k of Object.keys(r) as (keyof CalcResult)[]) {
        (s as unknown as Record<string, number>)[k] = (r as unknown as Record<string, number>)[k] * f;
    }
    return s;
}

// ─── Search ───────────────────────────────────────────────────────────────────
function searchDB(q: string, db: DBIngredient[]): DBIngredient[] {
    if (!q || q.trim().length < 2) return [];
    const query = q.toLowerCase().trim();
    return db
        .filter(ing => {
            const nome = (ing.nome || '').trim().toLowerCase();
            const etichetta = (ing.etichetta || '').toLowerCase();
            return nome.includes(query) || etichetta.includes(query);
        })
        .sort((a, b) => {
            const nomeA = (a.nome || '').trim().toLowerCase();
            const nomeB = (b.nome || '').trim().toLowerCase();
            if (nomeA === query && nomeB !== query) return -1;
            if (nomeB === query && nomeA !== query) return 1;
            if (nomeA.startsWith(query) && !nomeB.startsWith(query)) return -1;
            if (nomeB.startsWith(query) && !nomeA.startsWith(query)) return 1;
            return nomeA.localeCompare(nomeB, 'it');
        })
        .slice(0, 20);
}

function searchAdditiviDB(q: string, db: DBIngredient[]): DBIngredient[] {
    if (!q || q.trim().length < 1) return [];
    const query = q.toLowerCase().trim();
    return db
        .filter(ing => ing.categoria === 'additivo' && ((ing.nome || '').toLowerCase().includes(query) || (ing.etichetta || '').toLowerCase().includes(query)))
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'))
        .slice(0, 15);
}

const ADDITIVI_CATEGORIE = [
    'addensante','agente di rivestimento','agente di trattamento della farina',
    'agente lievitante','antiagglomerante','antiossidante','conservante',
    'correttore di acidità','edulcorante','emulsionante','esaltatore di sapidità',
    'gas per confezionamento','gas propellente','lecitina di girasole bio',
    'lecitina di soia bio','lucidante','rassodante','sbiancante','schiumogeno',
    'stabilizzante del colore','stabilizzatore di schiuma','umettante',
] as const;

const ADDITIVI_SPECIFICI: Record<string, string[]> = {
    'addensante': [
        'Agar (E406)','Alginato di calcio (E404)','Alginato di potassio (E402)',
        'Alginato di sodio (E401)','Amido modificato (E1400-E1451)','Carragenina (E407)',
        'Cellulosa (E460)','Farina di semi di carrube (E410)','Gelatina',
        'Gomma arabica (E414)','Gomma di guar (E412)','Gomma di tara (E417)',
        'Gomma gellano (E418)','Gomma konjac (E425)','Gomma xantano (E415)',
        'Idrossipropilcellulosa (E463)','Idrossipropilmetilcellulosa (E464)',
        'Metilcellulosa (E461)','Pectine (E440)',
    ],
    'agente di rivestimento': [
        'Cera carnauba (E903)','Cera d\'api bianca (E901i)','Cera d\'api gialla (E901ii)',
        'Cera di candelilla (E902)','Cera microcristallina (E905)','Gomma lacca (E904)',
        'Paraffina (E905)','Polietilenglicole (E1521)','Shellac (E904)',
    ],
    'agente di trattamento della farina': [
        'Acido ascorbico (E300)','Azodicarbonamide (E927a)','Carbonato di magnesio (E504)',
        'Cloruro di ammonio (E510)','L-cisteina (E920)','Perossido di benzoile (E928)',
    ],
    'agente lievitante': [
        'Bicarbonato di ammonio (E503)','Bicarbonato di potassio (E501)',
        'Bicarbonato di sodio (E500)','Cremor tartaro (E336)','Difosfati (E450)',
        'Glucono-delta-lattone (E575)','Monofosfato di calcio (E341)','Trifosfati (E451)',
    ],
    'antiagglomerante': [
        'Carbonato di calcio (E170)','Carbonato di magnesio (E504)',
        'Diossido di silicio (E551)','Ferrocianuro di potassio (E536)',
        'Ferrocianuro di sodio (E535)','Fosfato tricalcico (E341iii)',
        'Silicato di alluminio e sodio (E554)','Silicato di calcio (E552)',
        'Silicato di magnesio (E553a)','Stearato di magnesio (E572)','Talco (E553b)',
    ],
    'antiossidante': [
        'Acido ascorbico (E300)','Acido eritorbico (E315)','Alfa-tocoferolo (E307)',
        'Ascorbato di calcio (E302)','Ascorbato di sodio (E301)',
        'BHA - butidrossianisolo (E320)','BHT - butidrossitoluene (E321)',
        'Delta-tocoferolo (E309)','Eritorbato di sodio (E316)',
        'Estratti di rosmarino (E392)','Estratti ricchi di tocoferoli (E306)',
        'Gamma-tocoferolo (E308)','Gallato di dodecile (E312)','Gallato di ottile (E311)',
        'Gallato di propile (E310)','Lecitina (E322)','Palmitato di ascorbile (E304)',
        'TBHQ - terzbutilidrochinone (E319)',
    ],
    'conservante': [
        'Acido benzoico (E210)','Acido propionico (E280)','Acido sorbico (E200)',
        'Anidride solforosa (E220)','Benzoato di calcio (E213)','Benzoato di potassio (E212)',
        'Benzoato di sodio (E211)','Bisolfito di calcio (E227)','Bisolfito di sodio (E222)',
        'Esametilentetrammina (E239)','Etile p-idrossibenzoato (E214)',
        'Lisozima (E1105)','Metabisolfito di potassio (E224)','Metabisolfito di sodio (E223)',
        'Metile p-idrossibenzoato (E218)','Natamicina (E235)','Nisina (E234)',
        'Nitrato di potassio (E252)','Nitrato di sodio (E251)',
        'Nitrito di potassio (E249)','Nitrito di sodio (E250)',
        'Propionato di calcio (E282)','Propionato di potassio (E283)',
        'Propionato di sodio (E281)','Solfito di calcio (E226)',
        'Solfito di sodio (E221)','Sorbato di calcio (E203)','Sorbato di potassio (E202)',
    ],
    'correttore di acidità': [
        'Acido acetico (E260)','Acido citrico (E330)','Acido fumarico (E297)',
        'Acido lattico (E270)','Acido L-malico (E296)','Acido ortofosforico (E338)',
        'Acido succinico (E363)','Acido tartarico (E334)','Bicarbonato di sodio (E500)',
        'Carbonato di calcio (E170)','Citrato di calcio (E333)','Citrato di potassio (E332)',
        'Citrato di sodio (E331)','Fumarato di sodio (E365)','Idrossido di calcio (E526)',
        'Idrossido di sodio (E524)','Lattato di calcio (E327)','Lattato di potassio (E326)',
        'Lattato di sodio (E325)','Malato di calcio (E352)','Malato di sodio (E350)',
        'Tartrato di potassio (E336)','Tartrato di sodio (E335)',
    ],
    'edulcorante': [
        'Acesulfame K (E950)','Advantame (E969)','Aspartame (E951)',
        'Ciclamato di calcio (E952)','Ciclamato di sodio (E952ii)',
        'Eritritolo (E968)','Isomalto (E953)','Lattitolo (E966)',
        'Maltitolo (E965)','Mannitolo (E421)','Neoesperidina DC (E959)',
        'Saccarina (E954)','Sorbitolo (E420)','Steviolo glicoside (E960)',
        'Sucralosio (E955)','Taumatina (E957)','Xilitolo (E967)',
    ],
    'emulsionante': [
        'Esteri citrici di mono e digliceridi (E472c)',
        'Esteri diacetiltartarici di mono e digliceridi (E472e)',
        'Esteri lattici di mono e digliceridi (E472b)',
        'Esteri monoacetiltartarici di mono e digliceridi (E472a)',
        'Lecitine (E322)','Mono e digliceridi degli acidi grassi (E471)',
        'Poliglicerolo estere degli acidi grassi (E475)',
        'Polisorbato 20 (E432)','Polisorbato 60 (E435)','Polisorbato 80 (E433)',
        'Stearoil-2-lattilato di calcio (E482)','Stearoil-2-lattilato di sodio (E481)',
        'Sucroesteri (E473)','Sucrostere (E474)',
    ],
    'esaltatore di sapidità': [
        "5'-guanilato di disodio (E627)","5'-inosinato di disodio (E631)",
        "5'-ribonucleotidi di disodio (E635)",
        'Acido glutammico (E620)','Glutammato di ammonio (E624)',
        'Glutammato di calcio (E623)','Glutammato di magnesio (E625)',
        'Glutammato di potassio (E622)','Glutammato monossodico - MSG (E621)',
        'Maltolo (E636)','Etilmaltolo (E637)',
    ],
    'gas per confezionamento': [
        'Anidride carbonica (E290)','Argon (E938)','Azoto (E941)',
        'Elio (E939)','Idrogeno (E949)','Ossigeno (E948)',
    ],
    'gas propellente': [
        'Anidride carbonica (E290)','Azoto (E941)','Butano (E943a)',
        'Isobutano (E943b)','Ossido di azoto (E942)','Propano (E944)',
    ],
    'lecitina di girasole bio': ['Lecitina di girasole bio'],
    'lecitina di soia bio': ['Lecitina di soia bio'],
    'lucidante': [
        'Cera carnauba (E903)','Cera d\'api bianca (E901i)','Cera d\'api gialla (E901ii)',
        'Cera di candelilla (E902)','Cera microcristallina (E905)',
        'Gomma lacca (E904)','Paraffina (E905)','Polietilenglicole (E1521)','Shellac (E904)',
    ],
    'rassodante': [
        'Calcio cloruro (E509)','Carbonato di calcio (E170)','Citrato di calcio (E333)',
        'Fosfato monocalcico (E341i)','Gluconato di calcio (E578)',
        'Idrossido di calcio (E526)','Lattato di calcio (E327)','Solfato di calcio (E516)',
    ],
    'sbiancante': [
        'Biossido di titanio (E171)','Diossido di cloro (E926)',
        'Perossido di benzoile (E928)','Perossido di calcio (E930)',
    ],
    'schiumogeno': [
        'Estratto di quillaia (E999)','Alcool stearilico (E430)',
    ],
    'stabilizzante del colore': [
        'Acido ascorbico (E300)','Acido citrico (E330)','Ascorbato di sodio (E301)',
        'Eritorbato di sodio (E316)','Nitrato di potassio (E252)','Nitrato di sodio (E251)',
        'Nitrito di potassio (E249)','Nitrito di sodio (E250)',
    ],
    'stabilizzatore di schiuma': [
        'Albumina d\'uovo','Estratto di quillaia (E999)','Gomma arabica (E414)',
        'Lecitina (E322)','Metilcellulosa (E461)',
    ],
    'umettante': [
        'Glicerolo (E422)','Isomalto (E953)','Lattitolo (E966)',
        'Maltitolo (E965)','Mannitolo (E421)','Propilen glicole (E1520)',
        'Sorbitolo (E420)','Xilitolo (E967)',
    ],
};

// ─── Tooltip component ────────────────────────────────────────────────────────
function InfoTooltip({ text }: { text: string }) {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    const handleClick = () => {
        if (!visible && btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 });
        }
        setVisible(v => !v);
    };

    useEffect(() => {
        if (!visible) return;
        const close = () => setVisible(false);
        window.addEventListener('scroll', close, true);
        return () => window.removeEventListener('scroll', close, true);
    }, [visible]);

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 5 }}>
            <button
                ref={btnRef}
                type="button"
                title={text}
                onClick={handleClick}
                style={{
                    background: 'none', border: '2px solid var(--color-orange)', cursor: 'pointer', padding: 0,
                    width: 18, height: 18, borderRadius: '50%',
                    fontSize: 11, fontWeight: 700, color: 'var(--color-orange)', lineHeight: 1,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                }}
            >i</button>
            {visible && pos && (
                <span style={{
                    position: 'fixed', top: pos.top, left: pos.left,
                    transform: 'translate(-50%, -100%)',
                    background: '#1a1a2e', color: '#fff', fontSize: 11.5, lineHeight: 1.5,
                    padding: '7px 11px', borderRadius: 7, whiteSpace: 'normal',
                    width: 230, zIndex: 99999, boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                }}>
                    {text}
                </span>
            )}
        </span>
    );
}

// ─── IngSearch sub-component ──────────────────────────────────────────────────
function IngSearch({ onAdd, db, loading, error }: { onAdd: (ing: DBIngredient) => void; db: DBIngredient[]; loading: boolean; error: string | null }) {
    const [q, setQ] = useState('');
    const [res, setRes] = useState<DBIngredient[]>([]);
    const [open, setOpen] = useState(false);
    const [dropPos, setDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const found = searchDB(q, db);
        setRes(found);
        const shouldOpen = found.length > 0 && q.trim().length >= 2;
        if (shouldOpen && wrapRef.current) {
            const rect = wrapRef.current.getBoundingClientRect();
            setDropPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
        }
        setOpen(shouldOpen);
    }, [q, db]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    useEffect(() => {
        if (!open) return;
        const updatePos = () => {
            if (wrapRef.current) {
                const rect = wrapRef.current.getBoundingClientRect();
                setDropPos({ top: rect.bottom + 2, left: rect.left, width: rect.width });
            }
        };
        window.addEventListener('scroll', updatePos, true);
        return () => window.removeEventListener('scroll', updatePos, true);
    }, [open]);
    return (
        <div ref={ref} style={{ position: 'relative', marginBottom: 12 }}>
            <div className="form-field" style={{ marginBottom: 0 }}>
                {error ? (
                    <div style={{ padding: '10px 14px', background: '#fff3f3', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #e53935' }}>
                        <span style={{ fontSize: 13, color: '#c62828' }}>{error}</span>
                    </div>
                ) : loading ? (
                    <div style={{ padding: '10px 14px', background: '#f5f5f5', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid var(--color-border)' }}>
                        <div className="spinner" style={{ width: 14, height: 14, border: '2px solid #ccc', borderTopColor: 'var(--color-orange)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Caricamento database ingredienti...</span>
                    </div>
                ) : (
                    <div ref={wrapRef} className="ing-search-wrap">
                        <span className="ing-search-icon"><Search size={14} /></span>
                        <input type="text" value={q} onChange={e => setQ(e.target.value)}
                            placeholder="Cerca ingrediente (es. olio extravergine, farina 00...)"
                            className="ing-search-input"
                            style={{ width: '100%' }} />
                    </div>
                )}
            </div>
            {open && dropPos && (
                <div style={{
                    position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width,
                    background: 'var(--color-bg-card)', border: '1.5px solid var(--color-orange)',
                    borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                    zIndex: 9999, maxHeight: 320, overflowY: 'auto',
                }}>
                    <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--color-text-dim)', borderBottom: '1px solid var(--color-border)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {res.length} risultati
                    </div>
                    {res.map((ing, i) => (
                        <button key={i} type="button"
                            onClick={() => { onAdd(ing); setQ(''); setOpen(false); }}
                            style={{
                                display: 'block', width: '100%', background: 'transparent',
                                border: 'none', borderBottom: '1px solid var(--color-border)',
                                padding: '9px 14px', textAlign: 'left', cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-bg)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {(ing.nome || '').trim()}
                                {ing.categoria === '_custom' && (
                                    <span style={{ fontSize: 10, background: 'var(--color-orange)', color: 'white', borderRadius: 4, padding: '1px 6px', fontWeight: 700, flexShrink: 0 }}>Personale</span>
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                {Math.round(n(ing.kcal))} kcal · {Math.round(n(ing.grassi) * 10) / 10}g grassi · {Math.round(n(ing.carboidrati) * 10) / 10}g carbo{ing.categoria && ing.categoria !== '_custom' ? ` · ${ing.categoria}` : ''}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── AdditiveSearch sub-component ─────────────────────────────────────────────
function AdditiveSearch({ chips, onAdd, onRemove, db }: {
    chips: DBIngredient[]; onAdd: (ing: DBIngredient) => void;
    onRemove: (i: number) => void; db: DBIngredient[];
}) {
    const [q, setQ] = useState('');
    const [res, setRes] = useState<DBIngredient[]>([]);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const found = searchAdditiviDB(q, db);
        setRes(found); setOpen(found.length > 0 && q.trim().length >= 1);
    }, [q, db]);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);
    return (
        <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: chips.length > 0 ? 8 : 0 }}>
                {chips.map((c, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,126,46,0.1)', border: '1px solid var(--color-orange)', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                        {(c.nome || '').trim()}
                        <button type="button" onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </span>
                ))}
            </div>
            <div ref={ref} style={{ position: 'relative' }}>
                <input type="text" value={q} onChange={e => setQ(e.target.value)}
                    placeholder="🔍 Cerca additivo dal database (es. acido citrico, pectina...)"
                    className="form-input" style={{ width: '100%' }} />
                {open && (
                    <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: 'var(--color-bg-card)', border: '1.5px solid var(--color-orange)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 500, maxHeight: 260, overflowY: 'auto' }}>
                        {res.map((ing, i) => (
                            <button key={i} type="button"
                                onClick={() => { onAdd(ing); setQ(''); setOpen(false); }}
                                style={{ display: 'block', width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid var(--color-border)', padding: '8px 14px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-accent-bg)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{(ing.nome || '').trim()}</div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{ing.etichetta || ''}</div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── CustomIngredientModal ─────────────────────────────────────────────────────
const CI_ALLERGEN_KEYS = [
    'all_glutine','all_crostacei','all_uova','all_pesci','all_arachidi','all_soia',
    'all_latte','all_frutta_guscio','all_anacardi','all_sedano','all_senape',
    'all_sesamo','all_solfiti','all_lupini','all_molluschi',
] as const;
const CI_ALLERGEN_LABELS: Record<string, string> = {
    all_glutine:'GLUTINE', all_crostacei:'CROSTACEI', all_uova:'UOVA', all_pesci:'PESCE',
    all_arachidi:'ARACHIDI', all_soia:'SOIA', all_latte:'LATTE',
    all_frutta_guscio:'FRUTTA A GUSCIO', all_anacardi:'ANACARDI',
    all_sedano:'SEDANO', all_senape:'SENAPE', all_sesamo:'SESAMO',
    all_solfiti:'SOLFITI (>10 ppm)', all_lupini:'LUPINI', all_molluschi:'MOLLUSCHI',
};
const CI_CROSS_KEYS = [
    'cross_glutine','cross_crostacei','cross_uova','cross_pesci','cross_arachidi','cross_soia',
    'cross_latte','cross_frutta_guscio','cross_anacardi','cross_sedano','cross_senape',
    'cross_sesamo','cross_solfiti','cross_lupini','cross_molluschi',
] as const;
const CI_CROSS_LABELS: Record<string, string> = {
    cross_glutine:'GLUTINE', cross_crostacei:'CROSTACEI', cross_uova:'UOVA', cross_pesci:'PESCE',
    cross_arachidi:'ARACHIDI', cross_soia:'SOIA', cross_latte:'LATTE',
    cross_frutta_guscio:'FRUTTA A GUSCIO', cross_anacardi:'ANACARDI',
    cross_sedano:'SEDANO', cross_senape:'SENAPE', cross_sesamo:'SESAMO',
    cross_solfiti:'SOLFITI (>10 ppm)', cross_lupini:'LUPINI', cross_molluschi:'MOLLUSCHI',
};

const DB_ACCREDITATI: { nome: string; url: string }[] = [
    { nome: 'CREA (Italia)', url: 'https://www.alimentinutrizione.it/tabelle-nutrizionali' },
    { nome: 'ANSES / Ciqual (Francia)', url: 'https://ciqual.anses.fr/' },
    { nome: 'USDA FoodData Central (USA)', url: 'https://fdc.nal.usda.gov/' },
    { nome: 'EFSA Comprehensive Database', url: 'https://www.efsa.europa.eu/en/data/data-on-food-composition' },
    { nome: 'BLS – Bundeslebensmittelschlüssel (Germania)', url: 'https://blsdb.de/' },
    { nome: 'McCance & Widdowson\'s (UK)', url: 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid' },
    { nome: 'INSA / PortFIR (Portogallo)', url: 'https://portfir.insa.pt/' },
    { nome: 'Rivm NEVO (Paesi Bassi)', url: 'https://nevo-online.rivm.nl/' },
];

function CustomIngredientModal({ onClose, onSave }: { onClose: () => void; onSave: (ing: DBIngredient) => void }) {
    // Info base
    const [nome, setNome] = useState('');
    const [categoria, setCategoria] = useState('ingrediente');
    const [eurKg, setEurKg] = useState('0');
    const [fonteTipo, setFonteTipo] = useState<'database' | 'schede' | ''>('');
    const [fonteDb, setFonteDb] = useState('');
    // Obbligatori
    const [grassi, setGrassi] = useState('');
    const [saturi, setSaturi] = useState('');
    const [carboidrati, setCarboidrati] = useState('');
    const [zuccheri, setZuccheri] = useState('');
    const [proteine, setProteine] = useState('');
    const [sale, setSale] = useState('');
    // Facoltativi
    const [monoins, setMonoins] = useState('');
    const [polins, setPolins] = useState('');
    const [eritritoloS, setEritritolo] = useState('');
    const [acidoOrganico, setAcidoOrganico] = useState('');
    // Obbligatori in taluni casi — macronutrienti
    const [trans, setTrans] = useState('');
    const [zuccheriAgg, setZuccheriAgg] = useState('');
    const [polioliS, setPolioli] = useState('');
    const [glicerolo, setGlicerolo] = useState('');
    const [alcolS, setAlcol] = useState('');
    const [fibre, setFibre] = useState('');
    // Micronutrienti obbligatori in taluni casi
    const [colesterolo, setColesterolo] = useState('');
    const [potassio, setPotassio] = useState('');
    const [calcio, setCalcio] = useState('');
    const [ferro, setFerro] = useState('');
    // Micronutrienti facoltativi — sali minerali
    const [fosforo, setFosforo] = useState('');
    const [magnesio, setMagnesio] = useState('');
    const [iodio, setIodio] = useState('');
    const [zinco, setZinco] = useState('');
    const [rame, setRame] = useState('');
    const [manganese, setManganese] = useState('');
    const [selenio, setSelenio] = useState('');
    // Vitamine liposolubili
    const [betaCarotene, setBetaCarotene] = useState('');
    const [retinolo, setRetinolo] = useState('');
    const [vitD, setVitD] = useState('');
    const [vitE, setVitE] = useState('');
    const [vitK, setVitK] = useState('');
    // Vitamine idrosolubili
    const [vitC, setVitC] = useState('');
    const [vitB1, setVitB1] = useState('');
    const [vitB2, setVitB2] = useState('');
    const [vitB3, setVitB3] = useState('');
    const [vitB5, setVitB5] = useState('');
    const [vitB6, setVitB6] = useState('');
    const [vitB9, setVitB9] = useState('');
    const [vitB12, setVitB12] = useState('');
    // Validazione
    const [errors, setErrors] = useState<string[]>([]);

    // Valori calcolati automaticamente (EU Reg 1169/2011)
    const grassiN      = parseFloat(grassi)        || 0;
    const satN         = parseFloat(saturi)         || 0;
    const carbN        = parseFloat(carboidrati)    || 0;   // carboidrati ESCLUSO fibre (input utente)
    const protN        = parseFloat(proteine)       || 0;
    const saleN        = parseFloat(sale)           || 0;
    const fibreN       = parseFloat(fibre)          || 0;
    const polioliN     = parseFloat(polioliS)       || 0;   // polioli escluso eritritolo e glicerolo
    const alcolMl      = parseFloat(alcolS)         || 0;   // input utente in ml/100g
    const gliceroloN   = parseFloat(glicerolo)      || 0;
    const acidoOrgN    = parseFloat(acidoOrganico)  || 0;
    const eritritoloN  = parseFloat(eritritoloS)    || 0;   // 0 kcal/g
    const zuccheriN    = parseFloat(zuccheri)       || 0;
    const colestN      = parseFloat(colesterolo)    || 0;   // mg/100g
    const potassioN    = parseFloat(potassio)       || 0;   // mg/100g
    const calcioN      = parseFloat(calcio)         || 0;   // mg/100g
    const fosforoN     = parseFloat(fosforo)        || 0;   // mg/100g
    const magnesioN    = parseFloat(magnesio)       || 0;   // mg/100g
    const ferroN       = parseFloat(ferro)          || 0;   // mg/100g
    const zincoN       = parseFloat(zinco)          || 0;   // mg/100g
    const iodioN       = parseFloat(iodio)          || 0;   // μg/100g
    const rameN        = parseFloat(rame)           || 0;   // mg/100g
    const manganeseN   = parseFloat(manganese)      || 0;   // mg/100g
    const selenioN     = parseFloat(selenio)        || 0;   // μg/100g
    const zuccheriAggN = parseFloat(zuccheriAgg)    || 0;

    // Alcol: converti ml/100g → g/100g (densità etanolo 0,79)
    const alcolG = Math.round(alcolMl * 0.79 * 1000) / 1000;

    // Carboidrati totali compreso fibre
    const carboConFibre = Math.round((carbN + fibreN) * 1000) / 1000;

    // Amido, glicogeno e destrine = carbo (excl. fibre) – (zuccheri + polioli + eritritolo)
    const amidoCalc = Math.max(0, Math.round((carbN - zuccheriN - polioliN - eritritoloN) * 1000) / 1000);

    // Sodio (mg/100g)
    const sodioCalc = Math.round(saleN * 400 * 10) / 10;

    // Acqua = 100 − (grassi + carboConFibre + acidi_org + proteine + sale + alcolG + minerali_g)
    // Minerali in mg/100g → /1000 = g; iodio e selenio in μg/100g → /1000000 = g
    const minerali_g = (potassioN + calcioN + fosforoN + magnesioN + ferroN + zincoN + rameN + manganeseN + colestN) / 1000
                     + (iodioN + selenioN) / 1000000;
    const acquaCalc = Math.round((100 - (grassiN + carboConFibre + acidoOrgN + protN + saleN + alcolG + minerali_g)) * 1000) / 1000;

    // Residuo secco = 100 − (alcol_g + acqua)
    const residuoSecco = Math.round((100 - (alcolG + acquaCalc)) * 1000) / 1000;

    // Energia (EU Reg 1169/2011): (carboConFibre − fibre − polioli) × 4 + polioli × 2,4 + fibre × 2
    // = (carbN − polioliN) × 4 + polioliN × 2,4 + fibreN × 2
    const carboNettiKcal = carbN - polioliN; // carbo disponibili (excl. fibre e polioli)
    const kcalCalc = Math.round((grassiN*9 + carboNettiKcal*4 + polioliN*2.4 + fibreN*2 + acidoOrgN*3 + protN*4 + alcolG*7) * 10) / 10;
    const kjCalc   = Math.round((grassiN*37 + carboNettiKcal*17 + polioliN*10 + fibreN*8 + acidoOrgN*13 + protN*17 + alcolG*29) * 10) / 10;

    const waterError = acquaCalc < 0 || residuoSecco < 0;

    // Vitamina A calcolata
    const betaCaroteneN = parseFloat(betaCarotene) || 0;  // μg/100g
    const retinolN      = parseFloat(retinolo)     || 0;  // μg/100g
    const vitA_eq       = Math.round((betaCaroteneN + retinolN) * 1000) / 1000;  // μg RE/100g
    const vitA_iu       = Math.round(vitA_eq * 3.333333333 * 10) / 10;           // UI/100g

    const clearErrors = () => setErrors([]);

    const handleSave = () => {
        const errs: string[] = [];
        if (!nome.trim())    errs.push('Nome ingrediente obbligatorio');
        if (!grassi)         errs.push('Grassi totali *');
        if (!saturi)         errs.push('Acidi grassi saturi *');
        if (!carboidrati)    errs.push('Carboidrati totali *');
        if (!zuccheri)       errs.push('Zuccheri *');
        if (!proteine)       errs.push('Proteine *');
        if (!sale)           errs.push('Sale *');
        if (waterError)      errs.push(`Residuo secco (${residuoSecco}g) supera 100g o acqua negativa (${acquaCalc}g): rivedere i valori`);
        if (errs.length)     { setErrors(errs); return; }

        const fonteDbEntry = DB_ACCREDITATI.find(d => d.nome === fonteDb);
        const ing: DBIngredient = {
            nome: nome.trim(),
            etichetta: nome.trim(),
            categoria: '_custom',
            fonte_dati: fonteTipo === 'database' ? fonteDb : fonteTipo === 'schede' ? 'Schede tecniche / Analisi di laboratorio / Web' : undefined,
            fonte_link: fonteTipo === 'database' && fonteDbEntry ? fonteDbEntry.url : undefined,
            kcal: kcalCalc,
            kj: kjCalc,
            acqua: acquaCalc >= 0 ? acquaCalc : 0,
            grassi: grassiN, saturi: satN,
            monoins:    monoins    ? parseFloat(monoins)    : undefined,
            polins:     polins     ? parseFloat(polins)     : undefined,
            trans:          trans          ? parseFloat(trans)          : undefined,
            carboidrati: carbN,
            zuccheri: parseFloat(zuccheri) || 0,
            zuccheri_agg:   zuccheriAgg    ? parseFloat(zuccheriAgg)    : undefined,
            fibre:          fibre          ? fibreN                     : undefined,
            polioli:        polioliS       ? polioliN                   : undefined,
            eritritolo:     eritritoloS    ? parseFloat(eritritoloS)    : undefined,
            glicerolo:      glicerolo      ? gliceroloN                 : undefined,
            acidi_organici: acidoOrganico  ? acidoOrgN                  : undefined,
            proteine: protN,
            sodio_mg: sodioCalc,
            alcol:          alcolS         ? alcolG                     : undefined,
            eur_kg:     eurKg      ? parseFloat(eurKg)      : undefined,
            colesterolo: colesterolo ? parseFloat(colesterolo) : undefined,
            potassio:    potassio   ? parseFloat(potassio)   : undefined,
            calcio:      calcio     ? parseFloat(calcio)     : undefined,
            ferro:       ferro      ? parseFloat(ferro)      : undefined,
            fosforo:     fosforo    ? parseFloat(fosforo)    : undefined,
            magnesio:    magnesio   ? parseFloat(magnesio)   : undefined,
            iodio:       iodio      ? parseFloat(iodio)      : undefined,
            zinco:       zinco      ? parseFloat(zinco)      : undefined,
            rame:        rame       ? parseFloat(rame)       : undefined,
            manganese:   manganese  ? parseFloat(manganese)  : undefined,
            selenio:     selenio    ? parseFloat(selenio)    : undefined,
            betaCarotene: betaCarotene ? betaCaroteneN : undefined,
            retinolo:     retinolo    ? retinolN      : undefined,
            vitA_eq:      vitA_eq > 0 ? vitA_eq       : undefined,
            vitA_iu:      vitA_iu > 0 ? vitA_iu       : undefined,
            vitD:         vitD        ? parseFloat(vitD)  : undefined,
            vitE:         vitE        ? parseFloat(vitE)  : undefined,
            vitK:         vitK        ? parseFloat(vitK)  : undefined,
            vitC:         vitC        ? parseFloat(vitC)  : undefined,
            vitB1:        vitB1       ? parseFloat(vitB1) : undefined,
            vitB2:        vitB2       ? parseFloat(vitB2) : undefined,
            vitB3:        vitB3       ? parseFloat(vitB3) : undefined,
            vitB5:        vitB5       ? parseFloat(vitB5) : undefined,
            vitB6:        vitB6       ? parseFloat(vitB6) : undefined,
            vitB9:        vitB9       ? parseFloat(vitB9) : undefined,
            vitB12:       vitB12      ? parseFloat(vitB12): undefined,
        };
        try {
            const ex = JSON.parse(localStorage.getItem('custom_ingredients') || '[]');
            localStorage.setItem('custom_ingredients', JSON.stringify([...ex, ing]));
        } catch {}
        onSave(ing);
        onClose();
    };

    // Stili riutilizzabili
    const iS: React.CSSProperties = { width: '100%', padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 5, fontSize: 13, boxSizing: 'border-box' };
    const iSRo: React.CSSProperties = { ...iS, background: 'var(--color-bg-secondary,#f0f4ff)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'default' };
    const iSErr: React.CSSProperties = { ...iS, border: '1.5px solid #e53e3e' };
    const lS: React.CSSProperties = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--color-text-muted)' };
    const secS: React.CSSProperties = { marginBottom: 14, padding: '12px 14px', borderRadius: 8, border: '1px solid var(--color-border)' };
    const secT = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color, marginBottom: 10 });
    const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 };
    const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 };

    const NF = ({ label, value, onChange, unit = 'g/100g', ro = false, err = false, tooltip }: {
        label: string; value: string; onChange?: (v: string) => void;
        unit?: string; ro?: boolean; err?: boolean; tooltip?: string;
    }) => (
        <div>
            <label style={{ ...lS, display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>{label} <span style={{ fontWeight: 400 }}>{unit}</span></span>
                {tooltip && <InfoTooltip text={tooltip} />}
            </label>
            <input type="number" min={0} step={0.01}
                style={ro ? iSRo : err ? iSErr : iS}
                value={value}
                onChange={e => { onChange?.(e.target.value); clearErrors(); }}
                readOnly={ro}
            />
        </div>
    );

    const AllergenRow = ({ keys, labels, state, setState }: {
        keys: readonly string[]; labels: Record<string, string>;
        state: Record<string, boolean>; setState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    }) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {keys.map(k => (
                <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!state[k]} onChange={e => setState(prev => ({ ...prev, [k]: e.target.checked }))} />
                    {labels[k]}
                </label>
            ))}
        </div>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>➕ Aggiungi ingrediente nel Data Base</h3>
                    <button className="btn btn-outline" onClick={onClose}>✕</button>
                </div>

                {/* Legenda */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14, fontSize: 11, padding: '8px 12px', background: 'var(--color-bg-secondary,#f8f9fb)', borderRadius: 6 }}>
                    <span><strong style={{ color: '#c53030' }}>*</strong> Obbligatorio</span>
                    <span><strong style={{ color: '#2b6cb0' }}>◎</strong> Calcolato automaticamente</span>
                    <span><strong style={{ color: '#718096' }}>○</strong> Facoltativo</span>
                    <span><strong style={{ color: '#b7791f' }}>△</strong> Obbligatorio in certi casi</span>
                </div>

                {/* Errori */}
                {errors.length > 0 && (
                    <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 6, padding: '10px 12px', marginBottom: 12 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#c53030', marginBottom: 4 }}>Campi mancanti o errori:</div>
                        {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#c53030' }}>⚠ {e}</div>)}
                    </div>
                )}

                {/* Info base */}
                <div style={secS}>
                    <div style={secT('#333')}>Informazioni base</div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ ...lS, color: '#333' }}>Nome ingrediente <span style={{ color: '#c53030' }}>*</span></label>
                        <input style={!nome.trim() && errors.length > 0 ? iSErr : iS} value={nome}
                            onChange={e => { setNome(e.target.value); clearErrors(); }}
                            placeholder="es. salsa di soia artigianale" />
                    </div>
                    <div style={grid2}>
                        <div>
                            <label style={lS}>Categoria</label>
                            <select style={iS} value={categoria} onChange={e => setCategoria(e.target.value)}>
                                {['ingrediente','semilavorato','prodotto','additivo','aroma'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <NF label="○ Costo" value={eurKg} onChange={setEurKg} unit="€/kg" tooltip="Inserire il costo dell'ingrediente per kg. Di default è riportato 0." />
                    </div>
                    {/* Fonte dei dati */}
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--color-bg-secondary,#f8f9fb)', borderRadius: 6, border: '1px solid var(--color-border)' }}>
                        <label style={{ ...lS, color: '#333', marginBottom: 8 }}>Fonte dei dati</label>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: fonteTipo ? 10 : 0 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="radio" name="fonte-tipo" value="database" checked={fonteTipo === 'database'}
                                    onChange={() => { setFonteTipo('database'); setFonteDb(''); }} />
                                Database accreditati
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                                <input type="radio" name="fonte-tipo" value="schede" checked={fonteTipo === 'schede'}
                                    onChange={() => { setFonteTipo('schede'); setFonteDb(''); }} />
                                Schede tecniche / Analisi di laboratorio / Web
                            </label>
                        </div>
                        {fonteTipo === 'database' && (
                            <div>
                                <select style={{ ...iS, marginBottom: 6 }} value={fonteDb} onChange={e => setFonteDb(e.target.value)}>
                                    <option value="">— Seleziona database —</option>
                                    {DB_ACCREDITATI.map(d => <option key={d.nome} value={d.nome}>{d.nome}</option>)}
                                </select>
                                {fonteDb && (() => {
                                    const entry = DB_ACCREDITATI.find(d => d.nome === fonteDb);
                                    return entry ? (
                                        <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Link:</span>
                                            <a href={entry.url} target="_blank" rel="noopener noreferrer"
                                                style={{ color: 'var(--color-orange)', fontWeight: 600, wordBreak: 'break-all' }}>
                                                {entry.url}
                                            </a>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* 1 — Valori di macronutrienti obbligatori */}
                <div style={secS}>
                    <div style={secT('#c53030')}>* Valori di macronutrienti obbligatori</div>
                    <div style={grid3}>
                        <NF label="* Grassi totali" value={grassi} onChange={setGrassi} err={!grassi && errors.length > 0} />
                        <NF label="* Acidi grassi saturi" value={saturi} onChange={setSaturi} err={!saturi && errors.length > 0} />
                        <NF label="* Carboidrati totali" value={carboidrati} onChange={setCarboidrati} err={!carboidrati && errors.length > 0} />
                        <NF label="* Zuccheri" value={zuccheri} onChange={setZuccheri} err={!zuccheri && errors.length > 0} />
                        <NF label="* Proteine" value={proteine} onChange={setProteine} err={!proteine && errors.length > 0} />
                        <NF label="* Sale" value={sale} onChange={setSale} err={!sale && errors.length > 0} />
                        <NF
                            label="* Fibre alimentari (altamente consigliato, anche se non obbligatorio in base al Reg. UE 1169/2011)"
                            value={fibre} onChange={v => { setFibre(v); clearErrors(); }}
                        />
                    </div>
                </div>

                {/* 2 — Valori di macronutrienti facoltativi */}
                <div style={secS}>
                    <div style={secT('#718096')}>○ Valori di macronutrienti facoltativi</div>
                    <div style={grid3}>
                        <NF label="○ Acidi grassi monoinsaturi" value={monoins} onChange={setMonoins} />
                        <NF label="○ Acidi grassi polinsaturi" value={polins} onChange={setPolins} />
                        <NF label="○ Eritritolo" value={eritritoloS} onChange={setEritritolo}
                            tooltip="Poliolo con fattore energetico 0 kcal/g (EU Reg 1169/2011). Non contribuisce al calcolo dell'energia." />
                        <NF label="○ Acidi organici" value={acidoOrganico} onChange={setAcidoOrganico}
                            tooltip="Es. acido acetico (aceto), acido lattico (yogurt). Fattore energetico: 3 kcal/g — 13 kJ/g (EU Reg 1169/2011)." />
                    </div>
                </div>

                {/* 3 — Valori di macronutrienti obbligatori in taluni casi */}
                <div style={secS}>
                    <div style={secT('#b7791f')}>△ Valori di macronutrienti obbligatori in taluni casi</div>
                    <div style={grid3}>
                        <NF label="△ Acidi grassi trans" value={trans} onChange={setTrans}
                            tooltip="Obbligatorio per tabelle nutrizionali USA, Canada e Paesi Arabi." />
                        <NF label="△ Zuccheri aggiunti" value={zuccheriAgg} onChange={setZuccheriAgg}
                            tooltip="Obbligatorio per tabelle nutrizionali USA e Paesi Arabi." />
                        <NF label="△ Polioli (escluso eritritolo e glicerolo)" value={polioliS} onChange={v => { setPolioli(v); clearErrors(); }}
                            tooltip="Obbligatorio per tabella Australia se aggiunti in ricetta. Fattore energetico: 2,4 kcal/g — 10 kJ/g." />
                        <NF label="△ Glicerolo" value={glicerolo} onChange={v => { setGlicerolo(v); clearErrors(); }}
                            tooltip="Obbligatorio per tabella Australia se aggiunto in ricetta. Fattore energetico: 4,1 kcal/g — 17 kJ/g (EU Reg 1169/2011)." />
                        <NF label="△ Alcol etilico" value={alcolS} onChange={v => { setAlcol(v); clearErrors(); }}
                            unit="ml/100g"
                            tooltip="Obbligatorio se l'ingrediente contiene alcol (es. vino, birra, rum, liquori). Inserire ml/100g: il sistema calcola automaticamente i g/100g (× 0,79). Fattore energetico: 7 kcal/g — 29 kJ/g." />
                    </div>
                </div>

                {/* 5 — Valori di micronutrienti */}
                <div style={secS}>
                    <div style={secT('#333')}>Valori di micronutrienti <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(nessun micronutriente è obbligatorio in assoluto)</span></div>

                    {/* 5a — Micronutrienti obbligatori in taluni casi */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#b7791f', marginBottom: 8 }}>△ Obbligatori in taluni casi</div>
                        <div style={grid3}>
                            <NF label="△ Colesterolo" value={colesterolo} onChange={setColesterolo} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA, Canada e Paesi Arabi." />
                            <NF label="△ Potassio" value={potassio} onChange={setPotassio} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Canada." />
                            <NF label="△ Calcio" value={calcio} onChange={setCalcio} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Canada." />
                            <NF label="△ Ferro" value={ferro} onChange={setFerro} unit="mg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA e Canada." />
                            <NF label="△ Vitamina D (D2 + D3)" value={vitD} onChange={setVitD} unit="μg/100g"
                                tooltip="Obbligatorio per tabelle nutrizionali USA." />
                        </div>
                    </div>

                    {/* 5b — Micronutrienti facoltativi — altri sali minerali */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', marginBottom: 8 }}>○ Altri sali minerali (facoltativi)</div>
                        <div style={grid3}>
                            <NF label="○ Fosforo" value={fosforo} onChange={setFosforo} unit="mg/100g" />
                            <NF label="○ Magnesio" value={magnesio} onChange={setMagnesio} unit="mg/100g" />
                            <NF label="○ Iodio" value={iodio} onChange={setIodio} unit="μg/100g" />
                            <NF label="○ Zinco" value={zinco} onChange={setZinco} unit="mg/100g" />
                            <NF label="○ Rame" value={rame} onChange={setRame} unit="mg/100g" />
                            <NF label="○ Manganese" value={manganese} onChange={setManganese} unit="mg/100g" />
                            <NF label="○ Selenio" value={selenio} onChange={setSelenio} unit="μg/100g" />
                        </div>
                    </div>

                    {/* 5c — Vitamine liposolubili */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', marginBottom: 8 }}>○ Vitamine liposolubili (facoltative)</div>
                        <div style={grid3}>
                            <NF label="○ β-Carotene" value={betaCarotene} onChange={setBetaCarotene} unit="μg/100g"
                                tooltip="Precursore della vitamina A. Usato per calcolare Vitamina A (RE) = β-carotene + retinolo." />
                            <NF label="○ Retinolo" value={retinolo} onChange={setRetinolo} unit="μg/100g"
                                tooltip="Forma preformata della vitamina A. Usato per calcolare Vitamina A (RE) = β-carotene + retinolo." />
                            <NF label="○ Vitamina E (tocoferoli)" value={vitE} onChange={setVitE} unit="mg/100g" />
                            <NF label="○ Vitamina K (fillochinone)" value={vitK} onChange={setVitK} unit="μg/100g" />
                        </div>
                    </div>

                    {/* 5d — Vitamine idrosolubili */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#718096', marginBottom: 8 }}>○ Vitamine idrosolubili (facoltative)</div>
                        <div style={grid3}>
                            <NF label="○ Vitamina C" value={vitC} onChange={setVitC} unit="mg/100g" />
                            <NF label="○ Vitamina B1 (Tiamina)" value={vitB1} onChange={setVitB1} unit="mg/100g" />
                            <NF label="○ Vitamina B2 (Riboflavina)" value={vitB2} onChange={setVitB2} unit="mg/100g" />
                            <NF label="○ Vitamina B3 (Niacina)" value={vitB3} onChange={setVitB3} unit="mg/100g" />
                            <NF label="○ Vitamina B5 (Acido pantotenico)" value={vitB5} onChange={setVitB5} unit="mg/100g" />
                            <NF label="○ Vitamina B6" value={vitB6} onChange={setVitB6} unit="mg/100g" />
                            <NF label="○ Vitamina B9 (Folati)" value={vitB9} onChange={setVitB9} unit="μg/100g" />
                            <NF label="○ Vitamina B12" value={vitB12} onChange={setVitB12} unit="μg/100g" />
                        </div>
                    </div>

                    {/* 5e — Micronutrienti calcolati */}
                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10, background: 'var(--color-bg-secondary,#ebf8ff)', borderRadius: 6, padding: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#2b6cb0', marginBottom: 8 }}>◎ Micronutrienti calcolati automaticamente</div>
                        <div style={grid3}>
                            <NF label="◎ Vitamina A (RE)" value={String(vitA_eq)} unit="μg/100g" ro
                                tooltip="Vitamina A (retinolo equivalente) = β-carotene + retinolo" />
                            <NF label="◎ Vitamina A (U.I.)" value={String(vitA_iu)} unit="UI/100g" ro
                                tooltip="Vitamina A (Unità Internazionali) = RE × 3,333333333" />
                        </div>
                    </div>
                </div>

                {/* 4 — Valori calcolati automaticamente */}
                <div style={{ ...secS, background: 'var(--color-bg-secondary,#ebf8ff)', borderColor: waterError ? '#fc8181' : '#bee3f8' }}>
                    <div style={secT('#2b6cb0')}>◎ Valori calcolati automaticamente (EU Reg 1169/2011)</div>
                    {waterError && (
                        <div style={{ background: '#fff5f5', border: '1px solid #fc8181', borderRadius: 6, padding: '8px 10px', marginBottom: 10, fontSize: 12, color: '#c53030' }}>
                            ⚠ Acqua ({acquaCalc} g/100g) o residuo secco ({residuoSecco} g/100g) risulta negativo: rivedere i valori inseriti.
                        </div>
                    )}
                    <div style={grid3}>
                        <NF label="◎ Carboidrati totali (compreso fibre)" value={String(carboConFibre)} unit="g/100g" ro
                            tooltip="Carboidrati totali + fibre" />
                        <NF label="◎ Amido, glicogeno e destrine" value={String(amidoCalc)} unit="g/100g" ro
                            tooltip="Carboidrati (excl. fibre) − (zuccheri + polioli + eritritolo)" />
                        <NF label="◎ Sodio" value={String(sodioCalc)} unit="mg/100g" ro
                            tooltip="Sale × 400" />
                        <NF label="◎ Alcol etilico" value={String(alcolG)} unit="g/100g" ro
                            tooltip="Alcol etilico (ml/100g) × 0,79 (densità etanolo)" />
                        <NF label="◎ Acqua" value={String(acquaCalc)} unit="g/100g" ro err={waterError}
                            tooltip="100 − (grassi + carboConFibre + acidi organici + proteine + sale + alcol g/100g + minerali g/100g)" />
                        <NF label="◎ Residuo secco" value={String(residuoSecco)} unit="g/100g" ro err={waterError}
                            tooltip="100 − (alcol g/100g + acqua)" />
                        <NF label="◎ Energia" value={String(kcalCalc)} unit="kcal/100g" ro
                            tooltip="(grassi×9) + (carbo disponibili×4) + (polioli×2,4) + (fibre×2) + (acidi org×3) + (proteine×4) + (alcol g×7)" />
                        <NF label="◎ Energia" value={String(kjCalc)} unit="kJ/100g" ro
                            tooltip="(grassi×37) + (carbo disponibili×17) + (polioli×10) + (fibre×8) + (acidi org×13) + (proteine×17) + (alcol g×29)" />
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Salva nel database personale</button>
                    <button className="btn btn-outline" onClick={onClose}>Annulla</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const makeComp = (): Component => ({ id: String(Date.now() + Math.random()), name: '', rows: [], additiveRows: [], pzUV: 1 });

export function NutrizionaleCalc() {

    const [productName, setProductName] = useState('');
    const [components, setComponents] = useState<Component[]>([makeComp()]);
    const [additives, setAdditives] = useState<string[]>(['']);
    const [additiveChips, setAdditiveChips] = useState<DBIngredient[]>([]);
    const [finishedWeight, setFinishedWeight] = useState('');
    const [specificGravity, setSpecificGravity] = useState('');
    const [fwWarning, setFwWarning] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({}); // Track validation errors
    // const [fwErrorMsg, setFwErrorMsg] = useState('');
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [showCustomModal, setShowCustomModal] = useState(false);
    // const [toolTab, setToolTab] = useState<'tabelle' | 'lista'>('tabelle');
    const [servingOpen, setServingOpen] = useState<Record<string, boolean>>({
        '🇪🇺 UE': false, '🇺🇸 USA (CUP=240ml)': false, '🇨🇦 Canada (CUP=250ml)': false, '🇦🇺 Australia': false, '🌍 Paesi Arabi (CUP=240ml)': false
    });
    const [activeTab, setActiveTab] = useState<NationTab>('UE');
    const [subTab, setSubTab] = useState<SubTab>('verticale');
    const [auShowDI, setAuShowDI] = useState(true);
    const [showOptionals, setShowOptionals] = useState(false);
    const [euSubTab, setEuSubTab] = useState<EUSubTab>('100g');
    const [selectedOptionals, setSelectedOptionals] = useState<SelectedOptionals>({ ...DEFAULT_OPTIONALS });
    const [nutrModalOpen, setNutrModalOpen] = useState(false);
    const [pesoCardOpen, setPesoCardOpen] = useState(true);
    const [compOpen, setCompOpen] = useState<Record<string, boolean>>({});
    const [pzUVRaw, setPzUVRaw] = useState<Record<string, string>>({});
    const [gramsRaw, setGramsRaw] = useState<Record<string, string>>({});
    const [additiveOpen, setAdditiveOpen] = useState(true);
    const [riepilogoOpen, setRiepilogoOpen] = useState(true);
    const [riepilogoTab, setRiepilogoTab] = useState<'q' | 'c'>('q');
    const [ricettaOpen, setRicettaOpen] = useLocalStorage<boolean>('nutri_ricetta_open', true);

    // Quick-guide state — using useLocalStorage hook for persistence
    const [guideOpen, setGuideOpen] = useLocalStorage<boolean>('nutri_guide_open', true);
    const toggleGuide = () => setGuideOpen(prev => !prev);

    // Wizard mode state
    const [wizardMode, setWizardMode] = useLocalStorage<boolean>('nutri_wizard_mode', true);
    const [wizardStep, setWizardStep] = useState<0 | 1 | 2 | 3>(0);
    const toggleWizardMode = (mode: boolean) => { setWizardMode(mode); setWizardStep(0); };

    // Database state — fetched + merged with personal custom ingredients
    const [db, setDb] = useState<DBIngredient[]>([]);
    const [loadingDB, setLoadingDB] = useState(true);
    const [dbError, setDbError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/data/ingredientsDB.json')
            .then(r => r.json())
            .then(data => {
                let base = data as DBIngredient[];
                try {
                    const custom = JSON.parse(localStorage.getItem('custom_ingredients') || '[]') as DBIngredient[];
                    if (custom.length) base = [...base, ...custom];
                } catch {}
                setDb(base);
                setLoadingDB(false);
            })
            .catch(err => { console.error('Error loading DB:', err); setLoadingDB(false); setDbError('Impossibile caricare il database ingredienti. Ricarica la pagina.'); });
    }, []);

    const addCustomIngredient = (ing: DBIngredient) => setDb(prev => [...prev, ing]);

    const [usa, setUSA] = useState<ServingSizesNation>({});
    const [ca, setCA] = useState<ServingSizesNation>({});
    const [au, setAU] = useState<ServingSizesNation>({});
    const [arabi, setArabi] = useState<ServingSizesNation>({});
    const [ue, setUE] = useState<UEServing>({});
    useEffect(() => {
      if (euSubTab === 'uv' && ue.confezione == null) setEuSubTab('100g');
      if (euSubTab === 'porzione' && ue.porzione == null) setEuSubTab('100g');
      if (euSubTab === 'pezzo' && ue.pezzo == null) setEuSubTab('100g');
    }, [euSubTab, ue.confezione, ue.porzione, ue.pezzo]);
    const tableRef = useRef<HTMLDivElement>(null);

    const { items: archiveItems, saveItem, deleteItem } = useArchive<ArchiveData>('nutrizionale-v3');
    const [currentId, setCurrentId] = useState<string | undefined>(undefined);
    const [, setCurrentName] = useState('');

    // Weight totals
    const totalGramsRaw = components.reduce((s, c) => s + c.rows.reduce((rs, r) => rs + r.grams, 0), 0);
    const fw = parseFloat(finishedWeight) || 0;
    const pesoTotale = fw > 0 ? fw : totalGramsRaw;

    // All rows combined for rendering
    const allRows = useMemo(() => components.flatMap(c => c.rows.map(r => ({ ing: r.ing, grams: r.grams, eurKg: r.eurKg, resa: r.resa }))), [components]);

    // Ingredienti aggregati per nome (deduplicati tra componenti)
    const mergedIngredients = useMemo(() => {
        const map = new Map<string, { ing: DBIngredient; grammiTotali: number; grammiXpzuv: number; eurKg: number; resa: number; }>();
        for (const comp of components) {
            const pzUV = comp.pzUV || 1;
            for (const row of comp.rows) {
                const key = row.ing.nome;
                const ex = map.get(key);
                if (ex) {
                    ex.grammiTotali += row.grams;
                    ex.grammiXpzuv += row.grams / pzUV;
                    if (ex.eurKg === 0 && row.eurKg > 0) ex.eurKg = row.eurKg;
                } else {
                    map.set(key, { ing: row.ing, grammiTotali: row.grams, grammiXpzuv: row.grams / pzUV, eurKg: row.eurKg, resa: row.resa });
                }
            }
        }
        return [...map.values()].sort((a, b) => a.ing.nome.localeCompare(b.ing.nome, 'it'));
    }, [components]);

    const totGrammiXpzuv = useMemo(() => mergedIngredients.reduce((s, r) => s + r.grammiXpzuv, 0), [mergedIngredients]);

    // Calculation
    const per100g = useMemo(() => calcNutrients(components, fw), [components, fw]);

    // Se peso specifico inserito, i valori per 100ml = valori per 100g × densità
    const per100display = useMemo(() => {
        const sgVal = parseFloat(specificGravity) || 0;
        return sgVal > 0 ? scaleResult(per100g, sgVal * 100) : per100g;
    }, [per100g, specificGravity]);

    // Allergens
    const presentAllergens = useMemo(() => {
        const set = new Set<string>();
        allRows.forEach(({ ing }) => ALLERGEN_FIELDS.forEach(({ key, label }) => { if (ing[key]) set.add(label); }));
        return [...set];
    }, [allRows]);
    const crossAllergens = useMemo(() => {
        const set = new Set<string>();
        allRows.forEach(({ ing }) => CROSS_FIELDS.forEach(({ key, label }) => {
            if (ing[key] && !presentAllergens.includes(label)) set.add(label);
        }));
        return [...set];
    }, [allRows, presentAllergens]);


    // Component modifiers
    const addComp = () => { setComponents(prev => [...prev, makeComp()]); };
    const removeComp = (id: string) => setComponents(prev => prev.filter(c => c.id !== id));
    const updateCompName = (id: string, name: string) => setComponents(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    const updateCompPzUV = (id: string, pzUV: number) => {
        const errorKey = `${id}-pzuv`;
        const validation = validatePieces(pzUV, 'Pezzi per UV');
        if (!validation.isValid) {
            setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
            return;
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id === id ? { ...c, pzUV } : c));
    };
    const addRowToComp = useCallback((compId: string, ing: DBIngredient) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: [...c.rows, { id: String(Date.now() + Math.random()), ing, grams: 100, eurKg: 0, resa: 100 }]
        }));
    }, []);
    const updateGrams = (compId: string, rowId: string, g: number) => {
        const errorKey = `${compId}-${rowId}-grams`;
        const validation = validateIngredientQuantity(g);
        if (!validation.isValid) {
            setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
            return;
        }
        // Clear error and update
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, grams: g } : r)
        }));
    };
    const updateEurKg = (compId: string, rowId: string, v: number) => {
        const errorKey = `${compId}-${rowId}-eurkgs`;
        // Allow zero, but validate if non-zero
        if (v !== 0) {
            const validation = validatePositiveNumber(v, 'Costo €/kg', { min: 0.01, max: 1000 });
            if (!validation.isValid) {
                setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
                return;
            }
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, eurKg: v } : r)
        }));
    };
    const updateResa = (compId: string, rowId: string, v: number) => {
        const errorKey = `${compId}-${rowId}-resa`;
        const validation = validatePercentage(v, 'Resa');
        if (!validation.isValid) {
            setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
            return;
        }
        setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, rows: c.rows.map(r => r.id === rowId ? { ...r, resa: v } : r)
        }));
    };
    const removeRow = (compId: string, rowId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : { ...c, rows: c.rows.filter(r => r.id !== rowId) }));
    };

    const addAdditiveRow = (compId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, additiveRows: [...c.additiveRows, { id: String(Date.now() + Math.random()), categoria: '', nomeSpecifico: '', grams: 0, eurKg: 0, resa: 100 }]
        }));
    };
    const removeAdditiveRow = (compId: string, rowId: string) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : { ...c, additiveRows: c.additiveRows.filter(r => r.id !== rowId) }));
    };
    const updateAdditiveRow = (compId: string, rowId: string, field: keyof AdditiveRow, value: string | number) => {
        setComponents(prev => prev.map(c => c.id !== compId ? c : {
            ...c, additiveRows: c.additiveRows.map(r => r.id !== rowId ? r : { ...r, [field]: value })
        }));
    };

    // Finished weight validation with input validation
    const handleFW = (val: string) => {
        const errorKey = 'finished-weight';
        const parsed = parseFloat(val) || 0;

        if (val !== '' && val !== '0') {
            const validation = validateFinishedWeight(parsed);
            if (!validation.isValid) {
                setFieldErrors(prev => ({...prev, [errorKey]: validation.error!}));
                setFinishedWeight(val);
                return;
            }
        }

        if (parsed > 0 && totGrammiXpzuv > 0 && parsed > totGrammiXpzuv) {
            setFwWarning(true);
            setFieldErrors(prev => ({...prev, [errorKey]: `VALORE NON VALIDO! Hai inserito un valore superiore al peso del prodotto crudo per pezzo (${totGrammiXpzuv.toFixed(0)}g). Inserisci un valore uguale o inferiore.`}));
        } else {
            setFwWarning(false);
            setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        }
        setFinishedWeight(val);
    };

    // Re-valida peso finito ogni volta che cambia totGrammiXpzuv (es. si aggiungono ingredienti)
    useEffect(() => {
        const errorKey = 'finished-weight';
        const parsed = parseFloat(finishedWeight) || 0;
        if (parsed <= 0 || totGrammiXpzuv <= 0) { setFwWarning(false); setFieldErrors(prev => ({...prev, [errorKey]: ''})); return; }
        if (parsed > totGrammiXpzuv) {
            setFwWarning(true);
            setFieldErrors(prev => ({...prev, [errorKey]: `VALORE NON VALIDO! Hai inserito un valore superiore al peso del prodotto crudo per pezzo (${totGrammiXpzuv.toFixed(0)}g). Inserisci un valore uguale o inferiore.`}));
        } else {
            setFwWarning(false);
            setFieldErrors(prev => ({...prev, [errorKey]: ''}));
        }
    }, [totGrammiXpzuv]);

    // Archive save/load
    const handleSave = () => {
        const name = productName || prompt('Nome ricetta:') || 'Ricetta';
        saveItem(name, {
            nome_prodotto: productName,
            componenti: components.map(c => ({
                nome: c.name,
                pz_uv: c.pzUV,
                ingredienti: c.rows.map(r => ({ nome: r.ing.nome, grammi: r.grams })),
                additiveRows: c.additiveRows,
            })),
            additivi: additiveChips.map(a => a.nome),
            peso_finito_pz: fw,
            serving_sizes: { UE: ue, USA: usa, Canada: ca, Australia: au, Arabi: arabi }
        });
        alert('Ricetta salvata in archivio!');
    };

    const handleLoad = (item: typeof archiveItems[0]) => {
        const d = item.data as any; // Allow legacy fallback
        setProductName(d.nome_prodotto || d.productName || '');
        setFinishedWeight(d.peso_finito_pz ? String(d.peso_finito_pz) : (d.finishedWeight || ''));
        setSpecificGravity(d.specificGravity || '');
        setAdditives(d.additivi?.length ? d.additivi : (d.additives?.length ? d.additives : ['']));

        const serv = d.serving_sizes || {};
        setUE(serv.UE || d.ue || {});
        setUSA(serv.USA || d.usa || {});
        setCA(serv.Canada || d.ca || {});
        setAU(serv.Australia || d.au || {});
        setArabi(serv.Arabi || d.arabi || {});

        const rawComps = d.componenti || d.components || [];
        const loadedComps: Component[] = rawComps.map((sc: any) => {
            const rowData = sc.ingredienti || sc.rows || [];
            return {
                id: String(Date.now() + Math.random()),
                name: sc.nome || sc.name || '',
                pzUV: sc.pz_uv || sc.pzUV || 1,
                rows: rowData.flatMap((sr: any) => {
                    const ingName = sr.nome || sr.name;
                    const grams = typeof sr.grammi === 'number' ? sr.grammi : (sr.grams || 0);
                    const found = db.find(dbi => dbi.nome === ingName);
                    return found ? [{ id: String(Date.now() + Math.random()), ing: found, grams, eurKg: 0, resa: 100 }] : [];
                }),
                additiveRows: (sc.additiveRows || []).map((ar: any) => ({
                    id: String(Date.now() + Math.random()),
                    categoria: ar.categoria || '',
                    nomeSpecifico: ar.nomeSpecifico || '',
                    grams: ar.grams || 0,
                    eurKg: ar.eurKg || 0,
                    resa: ar.resa || 100,
                })),
            };
        });
        const compsToSet = loadedComps.length ? loadedComps : [makeComp()];
        setComponents(compsToSet);
        // Ripristina pzUVRaw con i valori caricati (i nuovi ID non combacerebbero altrimenti)
        const restoredPzUVRaw: Record<string, string> = {};
        compsToSet.forEach(c => { restoredPzUVRaw[c.id] = String(c.pzUV); });
        setPzUVRaw(restoredPzUVRaw);
        setCurrentId(item.id);
        setCurrentName(item.name);
        setArchiveOpen(false);
    };

    const handleNew = () => {
        if (allRows.length > 0 && !window.confirm('Vuoi davvero creare una nuova ricetta? Perderai i dati non salvati.')) return;
        setProductName('');
        setComponents([makeComp()]);
        setAdditives(['']);
        setAdditiveChips([]);
        setFinishedWeight('');
        setSpecificGravity('');
        setFwWarning(false); // setFwErrorMsg('');
        setUE({}); setUSA({}); setCA({}); setAU({}); setArabi({});
        setCurrentId(undefined);
        setCurrentName('');
        setWizardStep(0);
    };

    const handleDownloadPNG = async () => {
        if (!tableRef.current) { alert('Errore: tabella non trovata.'); return; }
        try {
            const target = (tableRef.current.querySelector('[data-table-export]') as HTMLElement) ?? tableRef.current;
            const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.download = `${productName || 'tabella'}_nutrizionale.png`;
            a.href = url;
            a.click();
        } catch (e) {
            console.error('PNG Export error:', e);
            alert('Errore durante l\'esportazione della tabella in PNG.');
        }
    };

    const handleDownloadEtichettaPDF = async () => {
        try {
            // Find the TabUE container in the DOM
            const etichettaElement = document.querySelector('[data-testid="tab-ue"]') as HTMLElement ||
                                   document.querySelector('div[style*="maxWidth: 480"]') as HTMLElement;

            if (!etichettaElement) {
                alert('Errore: tabella etichetta non trovata. Assicurati di essere sulla tab UE.');
                return;
            }

            const fileName = `${productName || 'etichetta'}_${new Date().toLocaleDateString('it-IT').replace(/\//g, '-')}.pdf`;
            await generateEtichettaPDF(etichettaElement, fileName);
        } catch (error) {
            console.error('Etichetta PDF export error:', error);
            alert('Errore durante l\'esportazione della scheda etichetta in PDF.');
        }
    };

    const handlePDF = async () => {
        if (allRows.length === 0 || !productName) { alert('Inserisci almeno il nome del prodotto e un ingrediente prima di scaricare.'); return; }
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const W = 210;
            const M = 15;
            const CW = W - M * 2;
            let y = 0;

            // ── Header navy ──
            doc.setFillColor(12, 19, 38);
            doc.rect(0, 0, W, 20, 'F');
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
            doc.text('AEA Consulenze Alimentari — Scheda Nutrizionale', M, 13);
            y = 28;

            // ── Nome prodotto ──
            doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text(productName, M, y); y += 7;
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
            doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}   |   Regione: ${activeTab}   |   Peso finito: ${finishedWeight || '—'} g`, M, y); y += 6;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 6;

            // ── Tabella visiva (html2canvas) ──
            if (tableRef.current) {
                const exportTarget = (tableRef.current.querySelector('[data-table-export]') as HTMLElement) ?? tableRef.current;
                const canvas = await html2canvas(exportTarget, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
                const imgData = canvas.toDataURL('image/png');
                const imgH = (canvas.height / canvas.width) * CW;
                const clampH = Math.min(imgH, 257 - y);
                if (y + clampH > 277) { doc.addPage(); y = 15; }
                doc.addImage(imgData, 'PNG', M, y, CW, clampH);
                y += clampH + 8;
            }

            // ── Lista ingredienti (raggruppata per componente) ──
            if (y > 255) { doc.addPage(); y = 15; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            doc.text('Lista Ingredienti', M, y); y += 5;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
            const totGrams = components.reduce((s, c) => s + c.rows.reduce((rs, r) => rs + r.grams, 0), 0);
            const multiComp = components.length > 1;
            components.forEach(comp => {
                if (multiComp) {
                    if (y > 272) { doc.addPage(); y = 15; }
                    const compLabel = comp.name ? `Componente: ${comp.name}  (${comp.pzUV} pz/UV)` : `Componente senza nome  (${comp.pzUV} pz/UV)`;
                    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
                    doc.text(compLabel, M + 2, y); y += 5;
                }
                comp.rows.forEach(({ ing, grams, eurKg: ek, resa }) => {
                    if (y > 272) { doc.addPage(); y = 15; }
                    const pctStr = totGrams > 0 ? ` (${((grams / totGrams) * 100).toFixed(1)}%)` : '';
                    const costStr = ek > 0 ? `  €${ek.toFixed(2)}/kg` : '';
                    const label = ing.etichetta || ing.nome;
                    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
                    doc.text(`• ${label}   ${grams} g${pctStr}   resa ${resa}%${costStr}`, M + (multiComp ? 6 : 2), y); y += 5;
                });
            });
            y += 3;

            // ── Valori nutrizionali dettagliati ──
            if (y > 245) { doc.addPage(); y = 15; }
            doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
            const p = per100display;
            const sgVal = parseFloat(specificGravity) || 0;
            const pdfLabel = sgVal > 0 ? `Valori Nutrizionali per 100ml (peso specifico: ${sgVal})` : 'Valori Nutrizionali per 100g';
            doc.text(pdfLabel + ' (tutti i dati calcolati)', M, y); y += 5;
            doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
            const rows: [string, string][] = [
                ['Energia', `${p.energyKj.toFixed(0)} kJ / ${p.energyKcal.toFixed(0)} kcal`],
                ['Grassi totali', `${p.grassi.toFixed(1)} g`],
                ['  di cui acidi grassi saturi', `${p.saturi.toFixed(1)} g`],
                ['  di cui monoinsaturi', p.monoins > 0 ? `${p.monoins.toFixed(1)} g` : '—'],
                ['  di cui polinsaturi', p.polins > 0 ? `${p.polins.toFixed(1)} g` : '—'],
                ['  di cui trans', p.trans > 0 ? `${p.trans.toFixed(1)} g` : '—'],
                ['Colesterolo', p.colesterolo > 0 ? `${p.colesterolo.toFixed(0)} mg` : '—'],
                ['Carboidrati totali', `${p.carboidrati.toFixed(1)} g`],
                ['  di cui zuccheri', `${p.zuccheri.toFixed(1)} g`],
                ['  di cui zuccheri aggiunti', p.zuccheri_agg > 0 ? `${p.zuccheri_agg.toFixed(1)} g` : '—'],
                ['  di cui polioli', p.polioli > 0 ? `${p.polioli.toFixed(1)} g` : '—'],
                ['  di cui amido', p.amido > 0 ? `${p.amido.toFixed(1)} g` : '—'],
                ['Fibre alimentari', p.fibre > 0 ? `${p.fibre.toFixed(1)} g` : '—'],
                ['Proteine', `${p.proteine.toFixed(1)} g`],
                ['Sale', `${p.sale.toFixed(2)} g`],
                ['Sodio', `${p.sodio_mg.toFixed(0)} mg`],
                ['Potassio', p.potassio > 0 ? `${p.potassio.toFixed(0)} mg` : '—'],
                ['Calcio', p.calcio > 0 ? `${p.calcio.toFixed(0)} mg` : '—'],
                ['Fosforo', p.fosforo > 0 ? `${p.fosforo.toFixed(0)} mg` : '—'],
                ['Magnesio', p.magnesio > 0 ? `${p.magnesio.toFixed(0)} mg` : '—'],
                ['Ferro', p.ferro > 0 ? `${p.ferro.toFixed(1)} mg` : '—'],
                ['Zinco', p.zinco > 0 ? `${p.zinco.toFixed(1)} mg` : '—'],
                ['Vitamina C', p.vitC > 0 ? `${p.vitC.toFixed(1)} mg` : '—'],
                ['Vitamina B1', p.vitB1 > 0 ? `${p.vitB1.toFixed(2)} mg` : '—'],
                ['Vitamina B2', p.vitB2 > 0 ? `${p.vitB2.toFixed(2)} mg` : '—'],
                ['Vitamina B3 (Niacina)', p.vitB3 > 0 ? `${p.vitB3.toFixed(1)} mg` : '—'],
                ['Vitamina B6', p.vitB6 > 0 ? `${p.vitB6.toFixed(2)} mg` : '—'],
                ['Vitamina B9 (Folati)', p.vitB9 > 0 ? `${p.vitB9.toFixed(0)} μg` : '—'],
                ['Vitamina B12', p.vitB12 > 0 ? `${p.vitB12.toFixed(1)} μg` : '—'],
                ['Vitamina A', p.vitA_eq > 0 ? `${p.vitA_eq.toFixed(0)} μg` : '—'],
                ['Vitamina D', p.vitD > 0 ? `${p.vitD.toFixed(1)} μg` : '—'],
                ['Vitamina E', p.vitE > 0 ? `${p.vitE.toFixed(1)} mg` : '—'],
            ];
            rows.forEach(([label, val]) => {
                if (y > 272) { doc.addPage(); y = 15; }
                const isSub = label.startsWith('  ');
                doc.setFontSize(8);
                doc.setFont('helvetica', isSub ? 'normal' : 'bold');
                doc.setTextColor(isSub ? 80 : 30, isSub ? 80 : 30, isSub ? 80 : 30);
                doc.text(label, M + (isSub ? 4 : 0), y);
                doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 30, 30);
                doc.text(val, M + 100, y);
                y += 5;
            });
            y += 3;

            // ── Allergeni ──
            if (presentAllergens.length > 0 || crossAllergens.length > 0) {
                if (y > 255) { doc.addPage(); y = 15; }
                doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(12, 19, 38);
                doc.text('Allergeni', M, y); y += 5;
                doc.setDrawColor(220, 220, 220); doc.line(M, y, W - M, y); y += 5;
                if (presentAllergens.length > 0) {
                    if (y > 272) { doc.addPage(); y = 15; }
                    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(197, 48, 48);
                    doc.text('Contiene:', M + 2, y);
                    doc.setFont('helvetica', 'normal');
                    const lines = doc.splitTextToSize(presentAllergens.join(', '), CW - 24);
                    doc.text(lines, M + 22, y); y += lines.length * 5;
                }
                if (crossAllergens.length > 0) {
                    if (y > 272) { doc.addPage(); y = 15; }
                    doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(183, 121, 31);
                    doc.text('Può contenere:', M + 2, y);
                    doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 60, 0);
                    const lines = doc.splitTextToSize(crossAllergens.join(', '), CW - 30);
                    doc.text(lines, M + 30, y); y += lines.length * 5;
                }
            }

            // ── Footer ──
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(160, 160, 160);
                doc.text(`AEA Consulenze Alimentari — pag. ${i}/${pageCount}`, M, 292);
            }

            doc.save(`${productName || 'ricetta'}_scheda_${activeTab}.pdf`);
        } catch (e) {
            console.error('PDF export error:', e);
            alert('Errore durante la generazione del PDF.');
        }
    };

    // ─── Wizard renderer ──────────────────────────────────────────────────────
    const WIZ_STEPS: { label: string }[] = [
        { label: 'Prodotto' },
        { label: 'Ingredienti' },
        { label: 'Mercati' },
        { label: 'Export' },
    ];

    const wizNav = (dir: -1 | 1) => {
        if (dir === 1) {
            if (wizardStep === 0 && !productName.trim()) {
                setFieldErrors(prev => ({ ...prev, wizardNome: 'Inserisci il nome del prodotto per continuare.' }));
                return;
            }
            if (wizardStep === 1 && allRows.length === 0) {
                setFieldErrors(prev => ({ ...prev, wizardIng: 'Aggiungi almeno un ingrediente per continuare.' }));
                return;
            }
            if (wizardStep === 1) {
                for (const comp of components) {
                    const raw = pzUVRaw[comp.id] ?? '';
                    const v = parseFloat(raw.replace(',', '.'));
                    if (!raw.trim() || isNaN(v) || v < 0.001) {
                        setFieldErrors(prev => ({ ...prev, [`pzuv-${comp.id}`]: 'Inserisci il numero di pezzi per UV per continuare.' }));
                        return;
                    }
                }
                if (fwWarning) {
                    const firstPzUV = components.length > 0 ? (components[0].pzUV || 1) : 1;
                    const pesoCrudoPerPz = (totalGramsRaw / firstPzUV).toFixed(0);
                    setFieldErrors(prev => ({ ...prev, wizardFW: `VALORE NON VALIDO! Il peso prodotto finito (${finishedWeight}g) supera il peso del prodotto crudo per pezzo (${totGrammiXpzuv.toFixed(0)}g). Torna al Passo 1 e inserisci un valore uguale o inferiore.` }));
                    return;
                }
            }
        }
        setFieldErrors({});
        setWizardStep(prev => Math.max(0, Math.min(3, prev + dir)) as 0 | 1 | 2 | 3);
    };

    const renderWizard = (): React.ReactNode => {
        const pct = ((wizardStep + 1) / 4 * 100).toFixed(0) + '%';

        return (
            <div className="card" style={{ overflow: 'hidden', padding: 0 }}>

                {/* ── Progress bar ── */}
                <div style={{ padding: '22px 28px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                        {WIZ_STEPS.map((s, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && (
                                    <div style={{
                                        flex: 1, height: 2, margin: '0 6px',
                                        background: i <= wizardStep ? 'var(--color-green)' : 'var(--color-border)',
                                        transition: 'background .3s',
                                    }} />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 30, height: 30, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                                        transition: 'all .3s',
                                        background: i < wizardStep ? 'var(--color-green)'
                                            : i === wizardStep ? 'linear-gradient(135deg, var(--color-orange), var(--color-orange-hover))'
                                            : 'var(--color-surface)',
                                        border: `2px solid ${i < wizardStep ? 'var(--color-green)' : i === wizardStep ? 'var(--color-orange)' : 'var(--color-border)'}`,
                                        color: i <= wizardStep ? 'white' : 'var(--color-text-dim)',
                                        boxShadow: i === wizardStep ? '0 0 0 4px rgba(255,126,46,.18)' : 'none',
                                    }}>
                                        {i < wizardStep ? <Check size={12} /> : i + 1}
                                    </div>
                                    <span className="wizard-step-label" style={{
                                        fontSize: 12, fontWeight: 700,
                                        color: i < wizardStep ? 'var(--color-green)' : i === wizardStep ? 'var(--color-navy)' : 'var(--color-text-dim)',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {s.label}
                                    </span>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 14 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--color-surface)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', borderRadius: 2,
                                background: 'linear-gradient(90deg, var(--color-orange), var(--color-orange-hover))',
                                width: pct, transition: 'width .45s cubic-bezier(.4,0,.2,1)',
                            }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                            Passo {wizardStep + 1} di 4
                        </span>
                    </div>
                </div>

                {/* ── Step content ── */}
                <div className="wizard-content" style={{ padding: 28, minHeight: 340 }}>

                    {/* Step 0 — Prodotto */}
                    {wizardStep === 0 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Package size={18} /> Il tuo prodotto
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
                                Inserisci le informazioni base. Il nome apparirà nella testata di ogni tabella nutrizionale generata.
                            </p>
                            <div className="prodotto-card">
                                <div className="prodotto-card-label">
                                    <Package size={13} /> PRODOTTO <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </div>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Nome prodotto (es. Torta di mele, Salsa al pomodoro…)"
                                    value={productName}
                                    onChange={e => { setProductName(e.target.value); setFieldErrors({}); }}
                                    style={{ fontSize: 15, fontWeight: 600, borderColor: fieldErrors.wizardNome ? 'var(--color-danger)' : undefined }}
                                />
                                {fieldErrors.wizardNome && (
                                    <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <AlertTriangle size={12} /> {fieldErrors.wizardNome}
                                    </span>
                                )}
                            </div>
                            <div className="wizard-field-grid">
                                <div className="form-field" style={{ marginBottom: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Peso prodotto finito (g/pz)</label>
                                        <InfoTooltip text="Peso del prodotto dopo cottura, disidratazione o evaporazione di acqua. Deve essere uguale o inferiore al peso del prodotto processato." />
                                    </div>
                                    <input
                                        type="number" min={0} className="form-input"
                                        placeholder="es. 120"
                                        value={finishedWeight}
                                        onChange={e => handleFW(e.target.value)}
                                        style={fwWarning ? { borderColor: '#e53e3e' } : {}}
                                    />
                                    <ValidationError message={fieldErrors['finished-weight']} visible={!!fieldErrors['finished-weight']} />
                                    {!fwWarning && !fieldErrors['finished-weight'] && <span className="hint">Peso netto dopo lavorazione/cottura.</span>}
                                </div>
                                <div className="form-field" style={{ marginBottom: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Peso specifico (g/ml)</label>
                                        <InfoTooltip text="Inserisci il peso specifico SOLO per alimenti liquidi (bevande, vino, birra, succhi, latte, ecc.). Quando compilato, i valori nutrizionali verranno espressi su 100 ml anziché 100 g, e apparirà: 'Valori nutrizionali medi in 100 ml di prodotto'." />
                                    </div>
                                    <input
                                        type="number" min={0} step={0.01} className="form-input"
                                        placeholder="opzionale"
                                        value={specificGravity}
                                        onChange={e => setSpecificGravity(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1 — Ingredienti */}
                    {wizardStep === 1 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Salad size={18} /> Ingredienti della ricetta
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
                                Cerca ogni ingrediente nel database e inserisci i grammi per l'intera ricetta. Puoi aggiungere più componenti separati.
                            </p>
                            {fieldErrors.wizardIng && (
                                <div style={{ background: 'rgba(229,62,62,.07)', border: '1px solid rgba(229,62,62,.22)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertTriangle size={13} /> {fieldErrors.wizardIng}
                                </div>
                            )}
                            {(fwWarning || fieldErrors.wizardFW) && (
                                <div style={{ background: 'rgba(229,62,62,.10)', border: '2px solid #e53e3e', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#c53030', fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{fieldErrors.wizardFW || `VALORE NON VALIDO! Il peso prodotto finito (${finishedWeight}g) supera il peso del prodotto crudo per pezzo (${totGrammiXpzuv.toFixed(0)}g). Torna al Passo 1 e inserisci un valore uguale o inferiore.`}</span>
                                </div>
                            )}
                            <div
                                onClick={() => setRicettaOpen(v => !v)}
                                style={{ background: 'var(--color-navy)', color: 'white', borderRadius: ricettaOpen ? '10px 10px 0 0' : 10, padding: '10px 20px', fontWeight: 800, fontSize: 14, letterSpacing: '0.06em', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={15} /> INSERIMENTO RICETTA</span>
                                <ChevronRight size={15} style={{ transform: ricettaOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.7 }} />
                            </div>
                            <div style={{ maxHeight: ricettaOpen ? '10000px' : '0', overflow: 'hidden', transition: 'max-height 0.45s ease' }}>
                            <div style={{ border: '2px solid var(--color-navy)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '16px 16px 4px', marginBottom: 16 }}>
                                {components.map((comp, ci) => {
                                    const isCompOpen = compOpen[comp.id] !== false;
                                    return (
                                        <div key={comp.id} className="comp-card card" style={{ marginBottom: 12 }}>
                                            <div
                                                className="comp-card-header"
                                                onClick={() => setCompOpen(prev => ({ ...prev, [comp.id]: !isCompOpen }))}
                                            >
                                                <h3 className="comp-card-title">
                                                    <span className="comp-number-badge">{ci + 1}</span>
                                                    {comp.name || `Componente ${ci + 1}`}
                                                </h3>
                                                <ChevronRight size={14} style={{ transform: isCompOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
                                            </div>
                                            {isCompOpen && (
                                                <div className="comp-card-body">
                                                    <div className="form-field">
                                                        <label className="form-label">Nome componente (facoltativo)</label>
                                                        <input className="form-input" placeholder="es. Pasta frolla, Farcitura…" value={comp.name} onChange={e => updateCompName(comp.id, e.target.value)} />
                                                    </div>
                                                    <div className="form-field">
                                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                                            <label className="form-label" style={{ marginBottom: 0 }}>PER N° PZ /U.V.</label>
                                                            <InfoTooltip text="Digitare il numero di PZ o di Unità di Vendita che si possono realizzare con la quantità di componente che scaturisce dalla ricetta." />
                                                        </div>
                                                        <input
                                                            type="text"
                                                            inputMode="decimal"
                                                            placeholder="Obbligatorio per procedere"
                                                            className="form-input"
                                                            value={pzUVRaw[comp.id] ?? ''}
                                                            onChange={e => {
                                                                const raw = e.target.value;
                                                                setPzUVRaw(prev => ({ ...prev, [comp.id]: raw }));
                                                                const v = parseFloat(raw.replace(',', '.'));
                                                                if (!isNaN(v) && v >= 0.001) {
                                                                    updateCompPzUV(comp.id, v);
                                                                    setFieldErrors(prev => ({ ...prev, [`pzuv-${comp.id}`]: '' }));
                                                                }
                                                            }}
                                                            onBlur={e => {
                                                                const raw = e.target.value.trim();
                                                                const v = parseFloat(raw.replace(',', '.'));
                                                                if (!raw || isNaN(v) || v < 0.001) {
                                                                    setFieldErrors(prev => ({ ...prev, [`pzuv-${comp.id}`]: 'Inserisci il numero di pezzi per UV per continuare.' }));
                                                                } else {
                                                                    updateCompPzUV(comp.id, v);
                                                                    setFieldErrors(prev => ({ ...prev, [`pzuv-${comp.id}`]: '' }));
                                                                }
                                                            }}
                                                        />
                                                        {fieldErrors[`pzuv-${comp.id}`] && (
                                                            <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4, fontWeight: 600 }}>⚠ {fieldErrors[`pzuv-${comp.id}`]}</div>
                                                        )}
                                                    </div>
                                                    <IngSearch onAdd={(ing) => addRowToComp(comp.id, ing)} db={db} loading={loadingDB} error={dbError} />
                                                    {comp.rows.length > 0 && (
                                                        <div style={{ marginTop: 8 }}>
                                                            {comp.rows.map(row => {
                                                                const _displayGramsWiz = (() => { const raw = gramsRaw[`${comp.id}-${row.id}`]; if (raw === undefined) return row.grams; const v = parseFloat(raw.replace(',', '.')); return isNaN(v) ? row.grams : v; })();
                                                                const gramsPerPiece = comp.pzUV > 0 && _displayGramsWiz > 0 ? _displayGramsWiz / comp.pzUV : null;
                                                                const fabbReale = row.grams / ((row.resa || 100) / 100);
                                                                const costoIng = (fabbReale / 1000) * row.eurKg;
                                                                return (
                                                                    <div key={row.id} className="ing-card">
                                                                        <div className="ing-card-header">
                                                                            <div className="ing-name-area">
                                                                                <span className="ing-name">{row.ing.etichetta || row.ing.nome}</span>
                                                                            </div>
                                                                            <button className="ing-delete-btn" onClick={() => removeRow(comp.id, row.id)} title="Rimuovi ingrediente"><Trash2 size={13} /></button>
                                                                        </div>
                                                                        <div className="ing-card-body">
                                                                            <div className="ing-field-group">
                                                                                <div className="ing-field-header">
                                                                                    <span className="ing-field-label">Grammi</span>
                                                                                </div>
                                                                                <div className="ing-field-input-wrap">
                                                                                    <input type="text" inputMode="decimal"
                                                                                        className="form-input ing-input"
                                                                                        value={gramsRaw[`${comp.id}-${row.id}`] ?? String(row.grams)}
                                                                                        onChange={e => {
                                                                                            const raw = e.target.value;
                                                                                            setGramsRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: raw }));
                                                                                            const v = parseFloat(raw.replace(',', '.'));
                                                                                            if (!isNaN(v) && v >= 0) updateGrams(comp.id, row.id, v);
                                                                                        }}
                                                                                        onBlur={e => {
                                                                                            const raw = e.target.value.trim();
                                                                                            const v = parseFloat(raw.replace(',', '.'));
                                                                                            const val = (!raw || isNaN(v) || v < 0) ? 0 : v;
                                                                                            setGramsRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: String(val) }));
                                                                                            updateGrams(comp.id, row.id, val);
                                                                                        }}
                                                                                    />
                                                                                    <span className="ing-unit">g</span>
                                                                                </div>
                                                                                {gramsPerPiece !== null && <span className="ing-per-pz">{gramsPerPiece.toFixed(1)} g/pz</span>}
                                                                                <ValidationError message={fieldErrors[`${comp.id}-${row.id}-grams`]} visible={!!fieldErrors[`${comp.id}-${row.id}-grams`]} />
                                                                            </div>
                                                                            <div className="ing-field-group">
                                                                                <div className="ing-field-header">
                                                                                    <span className="ing-field-label">€/kg</span>
                                                                                    <InfoTooltip text="Costo dell'ingrediente per kg, IVA esclusa. Non è obbligatorio: se non inserisci nulla, il valore predefinito è 0 e il costo non verrà calcolato." />
                                                                                </div>
                                                                                <input type="number" min={0} step={0.01}
                                                                                    placeholder="0"
                                                                                    value={row.eurKg === 0 || row.eurKg ? row.eurKg : ''}
                                                                                    onChange={e => updateEurKg(comp.id, row.id, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                                                                    className="form-input ing-input" />
                                                                            </div>
                                                                            <div className="ing-field-group">
                                                                                <div className="ing-field-header">
                                                                                    <span className="ing-field-label">Resa %</span>
                                                                                    <InfoTooltip text="Percentuale di prodotto effettivamente utilizzabile dopo pulizia o lavorazione. Es: 70 per verdure con scarti (foglie, bucce). Default: 100" />
                                                                                </div>
                                                                                <input type="number" min={1} max={100} step={1}
                                                                                    value={row.resa || 100}
                                                                                    onChange={e => updateResa(comp.id, row.id, parseFloat(e.target.value) || 100)}
                                                                                    className="form-input ing-input" />
                                                                            </div>
                                                                        </div>
                                                                        {(row.eurKg > 0) && (
                                                                            <div className="ing-cost-line">
                                                                                <span>Grammi reali: <strong>{fabbReale.toFixed(1)}g</strong></span>
                                                                                <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoIng.toFixed(4)} €</strong></span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {comp.rows.length > 0 && (
                                                                <div className="ing-total-bar">
                                                                    <span>Totale: <strong>{comp.rows.reduce((s, r) => s + r.grams, 0).toFixed(0)} g</strong></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {/* Additivi per componente */}
                                                    <div style={{ marginTop: 12 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><FlaskConical size={13} /> Additivi</label>
                                                            <button type="button" className="btn btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => addAdditiveRow(comp.id)}>
                                                                <Plus size={11} /> Aggiungi additivo
                                                            </button>
                                                        </div>
                                                        {comp.additiveRows.map(arow => {
                                                            const fabbA = arow.grams / ((arow.resa || 100) / 100);
                                                            const costoA = (fabbA / 1000) * arow.eurKg;
                                                            return (
                                                                <div key={arow.id} className="ing-card" style={{ marginBottom: 8 }}>
                                                                    <div className="ing-card-header">
                                                                        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                                                                            <select className="form-input" style={{ flex: '1 1 160px', fontSize: 12 }} value={arow.categoria} onChange={e => { updateAdditiveRow(comp.id, arow.id, 'categoria', e.target.value); updateAdditiveRow(comp.id, arow.id, 'nomeSpecifico', ''); }}>
                                                                                <option value="">— Categoria —</option>
                                                                                {ADDITIVI_CATEGORIE.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                                            </select>
                                                                            <select className="form-input" style={{ flex: '1 1 160px', fontSize: 12 }} value={arow.nomeSpecifico} onChange={e => updateAdditiveRow(comp.id, arow.id, 'nomeSpecifico', e.target.value)} disabled={!arow.categoria}>
                                                                                <option value="">{arow.categoria ? '— Seleziona additivo —' : '— Prima seleziona categoria —'}</option>
                                                                                {(ADDITIVI_SPECIFICI[arow.categoria] || []).map(n => <option key={n} value={n}>{n}</option>)}
                                                                            </select>
                                                                        </div>
                                                                        <button className="ing-delete-btn" onClick={() => removeAdditiveRow(comp.id, arow.id)} title="Rimuovi additivo"><Trash2 size={13} /></button>
                                                                    </div>
                                                                    <div className="ing-card-body">
                                                                        <div className="ing-field-group">
                                                                            <div className="ing-field-header"><span className="ing-field-label">Grammi</span></div>
                                                                            <div className="ing-field-input-wrap">
                                                                                <input type="number" min={0} step={0.1} className="form-input ing-input" value={arow.grams || ''} placeholder="0" onChange={e => updateAdditiveRow(comp.id, arow.id, 'grams', parseFloat(e.target.value) || 0)} />
                                                                                <span className="ing-unit">g</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="ing-field-group">
                                                                            <div className="ing-field-header"><span className="ing-field-label">€/kg</span></div>
                                                                            <input type="number" min={0} step={0.01} placeholder="0" className="form-input ing-input" value={arow.eurKg || ''} onChange={e => updateAdditiveRow(comp.id, arow.id, 'eurKg', parseFloat(e.target.value) || 0)} />
                                                                        </div>
                                                                        <div className="ing-field-group">
                                                                            <div className="ing-field-header"><span className="ing-field-label">Resa %</span></div>
                                                                            <input type="number" min={1} max={100} step={1} className="form-input ing-input" value={arow.resa || 100} onChange={e => updateAdditiveRow(comp.id, arow.id, 'resa', parseFloat(e.target.value) || 100)} />
                                                                        </div>
                                                                    </div>
                                                                    {arow.eurKg > 0 && (
                                                                        <div className="ing-cost-line">
                                                                            <span>Grammi reali: <strong>{fabbA.toFixed(1)}g</strong></span>
                                                                            <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoA.toFixed(4)} €</strong></span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                    {components.length > 1 && (
                                                        <button className="btn btn-danger" style={{ fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => removeComp(comp.id)}><Trash2 size={13} /> Rimuovi componente</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {(
                                    <button className="btn btn-outline add-comp-btn" onClick={addComp} style={{ marginBottom: 12 }}>
                                        <Plus size={14} /> Aggiungi componente
                                    </button>
                                )}
                            </div>
                            </div>{/* end collapsible wrapper wizard */}

                            {/* Riepilogo ingredienti — identico alla modalità avanzata */}
                            {allRows.length > 0 && (() => {
                                const pesoFinitoPzCalc = fw > 0 ? fw : totGrammiXpzuv;
                                const caloAcqua = totGrammiXpzuv > pesoFinitoPzCalc ? totGrammiXpzuv - pesoFinitoPzCalc : 0;
                                const isAcqua = (nome: string) => (nome || '').trim().toLowerCase() === 'acqua';
                                const totGrammiTotali = mergedIngredients.reduce((s, r) => s + r.grammiTotali, 0);
                                const totQuid = pesoFinitoPzCalc > 0 ? (totGrammiXpzuv / pesoFinitoPzCalc * 100) : 0;
                                let totCostoUV = 0;
                                for (const r of mergedIngredients) {
                                    if (r.eurKg > 0) {
                                        const fabb = r.grammiXpzuv / ((r.resa || 100) / 100);
                                        totCostoUV += (fabb / 1000) * r.eurKg;
                                    }
                                }
                                const totCostoKg = pesoFinitoPzCalc > 0 && totCostoUV > 0 ? totCostoUV / (pesoFinitoPzCalc / 1000) : 0;
                                const fmt3 = (v: number) => v.toFixed(3).replace('.', ',');
                                const fmt2 = (v: number) => v.toFixed(2).replace('.', ',');
                                const fmtC = (v: number) => v > 0 ? v.toFixed(3).replace('.', ',') : '—';
                                return (
                                    <div className="card" style={{ marginBottom: 20 }}>
                                        <div
                                            onClick={() => setRiepilogoOpen(v => !v)}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><Table2 size={15} /> Riepilogo ingredienti <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>({mergedIngredients.length})</span></h3>
                                            <ChevronRight size={14} style={{ transform: riepilogoOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
                                        </div>
                                        {riepilogoOpen && (<>
                                            <div className="ri-tab-bar" style={{ display: 'flex', gap: 0, marginTop: 12, marginBottom: 4, borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--color-border)', alignSelf: 'flex-start' }}>
                                                <button onClick={() => setRiepilogoTab('q')} title="Visualizza quantità e grammature" style={{ padding: '4px 11px', border: 'none', borderRight: '1.5px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, background: riepilogoTab === 'q' ? 'var(--color-navy)' : 'transparent', color: riepilogoTab === 'q' ? 'white' : 'var(--color-text-muted)' }}><Scale size={12} />Quantità</button>
                                                <button onClick={() => setRiepilogoTab('c')} title="Visualizza costi e rese" style={{ padding: '4px 11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, background: riepilogoTab === 'c' ? 'var(--color-navy)' : 'transparent', color: riepilogoTab === 'c' ? 'white' : 'var(--color-text-muted)' }}><Euro size={12} />Costi</button>
                                            </div>
                                            <div className="riepilogo-wrapper" data-riepilogo-tab={riepilogoTab} style={{ marginTop: 0, overflowX: 'auto', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}>
                                                <table className="riepilogo-table" style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 860 }}>
                                                    <thead>
                                                        <tr style={{ background: 'var(--color-orange)', color: 'white' }}>
                                                            <td style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{mergedIngredients.length}</td>
                                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totGrammiTotali)}</td>
                                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totGrammiXpzuv)}</td>
                                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>100,000</td>
                                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totQuid)}</td>
                                                            <td className="ri-c" style={{ padding: '6px 8px' }} />
                                                            <td className="ri-c" style={{ padding: '6px 8px' }} />
                                                            <td className="ri-c" style={{ padding: '6px 8px' }} />
                                                            <td style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)' }}>{totCostoUV > 0 ? fmt3(totCostoUV) : '—'}</td>
                                                            <td style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)' }}>{totCostoKg > 0 ? fmt3(totCostoKg) : '—'}</td>
                                                        </tr>
                                                        <tr style={{ background: '#f0f0f0', borderBottom: '2px solid var(--color-border)' }}>
                                                            <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', minWidth: 130 }}>INGREDIENTI</th>
                                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>grammi<br />totali</th>
                                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>grammi X<br />PZ / U.V.</th>
                                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>% in<br />ricetta</th>
                                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', color: 'var(--color-orange)' }}>QUID</th>
                                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>COSTO/KG<br />ingr. grezzo</th>
                                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>RESA<br />lavoraz. %</th>
                                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>COSTO/KG<br />ingr. pulito</th>
                                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', background: 'rgba(255,126,46,0.12)' }}>COSTO/<br />U.V.</th>
                                                            <th style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', background: 'rgba(255,126,46,0.12)' }}>COSTO/<br />KG</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {mergedIngredients.map((row, i) => {
                                                            const pctRicetta = totGrammiXpzuv > 0 ? (row.grammiXpzuv / totGrammiXpzuv * 100) : 0;
                                                            const grammiEffettivi = isAcqua(row.ing.nome) ? Math.max(0, row.grammiXpzuv - caloAcqua) : row.grammiXpzuv;
                                                            const quid = pesoFinitoPzCalc > 0 ? (grammiEffettivi / pesoFinitoPzCalc * 100) : 0;
                                                            const costoKgPulito = row.eurKg > 0 ? row.eurKg / ((row.resa || 100) / 100) : 0;
                                                            const fabbXpzuv = row.grammiXpzuv / ((row.resa || 100) / 100);
                                                            const costoUV = row.eurKg > 0 ? (fabbXpzuv / 1000) * row.eurKg : 0;
                                                            const costoKg = pesoFinitoPzCalc > 0 && costoUV > 0 ? costoUV / (pesoFinitoPzCalc / 1000) : 0;
                                                            const bg = i % 2 === 0 ? 'white' : '#fafafa';
                                                            return (
                                                                <tr key={row.ing.nome} style={{ background: bg, borderBottom: '1px solid var(--color-border)' }}>
                                                                    <td style={{ padding: '6px 10px', fontWeight: 500, minWidth: 130 }}>{(row.ing.nome || '').trim()}</td>
                                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmt3(row.grammiTotali)}</td>
                                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmt3(row.grammiXpzuv)}</td>
                                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(pctRicetta)}</td>
                                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-orange)' }}>{fmt3(quid)}</td>
                                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.eurKg > 0 ? fmt2(row.eurKg) : '—'}</td>
                                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt2(row.resa || 100)}</td>
                                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{costoKgPulito > 0 ? fmt2(costoKgPulito) : '—'}</td>
                                                                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, background: 'rgba(255,126,46,0.04)' }}>{fmtC(costoUV)}</td>
                                                                    <td style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, background: 'rgba(255,126,46,0.04)' }}>{fmtC(costoKg)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>)}
                                    </div>
                                );
                            })()}

                            {/* Cost summary card */}
                            {allRows.length > 0 && (() => {
                                let costoTotale = 0;
                                let fabbRealeTotale = 0;
                                for (const c of components) {
                                    for (const r of c.rows) {
                                        const fabb = r.grams / ((r.resa || 100) / 100);
                                        costoTotale += (r.eurKg / 1000) * fabb;
                                        fabbRealeTotale += fabb;
                                    }
                                }
                                const costPerKg = pesoTotale > 0 ? (costoTotale / pesoTotale) * 1000 : 0;
                                if (costoTotale === 0) return null;
                                return (
                                    <div style={{ marginBottom: 20, background: 'linear-gradient(135deg,rgba(255,126,46,0.06),rgba(12,19,38,0.02))', border: '1.5px solid var(--color-orange)', borderRadius: 12, padding: '14px 20px' }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}><Euro size={15} /> Riepilogo Costi Ingredienti</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per pezzo</div>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-orange)', marginTop: 4 }}>{costoTotale.toFixed(3)} €</div>
                                            </div>
                                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per kg</div>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-navy)', marginTop: 4 }}>{costPerKg.toFixed(3)} €</div>
                                            </div>
                                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fabbisogno reale totale</div>
                                                <div style={{ fontSize: 22, fontWeight: 800, color: '#555', marginTop: 4 }}>{fabbRealeTotale.toFixed(1)} g</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Step 2 — Mercati & Serving size */}
                    {wizardStep === 2 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                                <Globe size={18} /> Mercati & Serving size
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 22, lineHeight: 1.55 }}>
                                Seleziona il mercato di destinazione e configura le porzioni di riferimento (facoltativo).
                            </p>
                            <div className="nation-tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
                                {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                                    const codes: Record<NationTab, string> = { UE: 'EU', USA: 'US', Canada: 'CA', Australia: 'AU', Arabi: 'AR' };
                                    const names: Record<NationTab, string> = { UE: 'UE', USA: 'USA', Canada: 'Canada', Australia: 'Australia', Arabi: 'Arabi' };
                                    return (
                                        <button key={t}
                                            className={`btn nation-tab-btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ fontWeight: 600, flex: 1, textAlign: 'center', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            onClick={() => setActiveTab(t)}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '1px 4px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: 0.3, border: '1px solid currentColor', opacity: 0.7, lineHeight: 1.4 }}>{codes[t]}</span>
                                            {names[t]}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px', marginBottom: 16 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}>
                                    {activeTab === 'UE' && (
                                        <>
                                            {(['porzione', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['Porzione (g/ml)', 'U.V. / Confezione (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={ue[k] || ''}
                                                            onChange={e => setUE(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'USA' && (
                                        <>
                                            {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={usa[k] || ''}
                                                            onChange={e => setUSA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'Canada' && (
                                        <>
                                            {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['CUP 250ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={ca[k] || ''}
                                                            onChange={e => setCA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'Australia' && (
                                        <>
                                            {(['serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={au[k] || ''}
                                                            onChange={e => setAU(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                    {activeTab === 'Arabi' && (
                                        <>
                                            {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                                const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                                return (
                                                    <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{labels[i]}</label>
                                                        <input type="number" min={0} placeholder="—" value={arabi[k] || ''}
                                                            onChange={e => setArabi(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                            className="form-input" />
                                                    </div>
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            </div>
                            <div style={{ background: 'rgba(67,130,28,.06)', border: '1px solid rgba(67,130,28,.18)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 12, color: 'var(--color-green)', fontWeight: 600 }}>
                                ✅ Serving size facoltativo — se non specificato la tabella mostrerà solo i valori per 100 g.
                            </div>
                        </div>
                    )}

                    {/* Step 3 — Anteprima & Export */}
                    {wizardStep === 3 && (
                        <div>
                            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: 'var(--color-navy)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                                <CheckCircle size={18} /> Tabella pronta!
                            </h2>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18, lineHeight: 1.55 }}>
                                Anteprima calcolata · Normativa <strong>{activeTab}</strong>
                            </p>
                            {allRows.length === 0 && (
                                <div style={{ background: 'rgba(217,119,6,.08)', border: '1px solid rgba(217,119,6,.25)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--color-warning)', fontWeight: 600, marginBottom: 16 }}>
                                    ⚠ Nessun ingrediente inserito. Torna al passo precedente e aggiungi almeno un ingrediente.
                                </div>
                            )}
                            <div className="nation-tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
                                {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                                    const codes: Record<NationTab, string> = { UE: 'EU', USA: 'US', Canada: 'CA', Australia: 'AU', Arabi: 'AR' };
                                    const names: Record<NationTab, string> = { UE: 'UE', USA: 'USA', Canada: 'Canada', Australia: 'Australia', Arabi: 'Arabi' };
                                    return (
                                        <button key={t}
                                            className={`btn nation-tab-btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                                            style={{ fontWeight: 600, flex: 1, textAlign: 'center', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                            onClick={() => setActiveTab(t)}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '1px 4px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: 0.3, border: '1px solid currentColor', opacity: 0.7, lineHeight: 1.4 }}>{codes[t]}</span>
                                            {names[t]}
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="nutri-results-wrapper" style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px', marginBottom: 16 }}>
                                <div ref={tableRef}>
                                    {activeTab === 'UE' && (
                                        <>
                                            {(ue.porzione != null || ue.confezione != null || ue.pezzo != null) ? (
                                                <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                                                    {([
                                                        { key: '100g' as EUSubTab, label: 'Per 100g', disabled: false },
                                                        { key: 'uv' as EUSubTab, label: 'Per U.V.', disabled: ue.confezione == null },
                                                        { key: 'porzione' as EUSubTab, label: 'Per porzione', disabled: ue.porzione == null },
                                                        { key: 'pezzo' as EUSubTab, label: 'Per pezzo', disabled: ue.pezzo == null },
                                                    ] as { key: EUSubTab; label: string; disabled: boolean }[]).map(t => (
                                                        <button
                                                            key={t.key}
                                                            disabled={t.disabled}
                                                            onClick={() => setEuSubTab(t.key)}
                                                            className={`btn ${euSubTab === t.key ? 'btn-accent' : 'btn-outline'}`}
                                                            style={{ fontSize: 11, padding: '4px 10px', opacity: t.disabled ? 0.4 : 1 }}
                                                        >
                                                            {t.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                            <TabUE
                                                p={per100display}
                                                ue={ue}
                                                specificGravity={parseFloat(specificGravity) || 0}
                                                selectedOptionals={selectedOptionals}
                                                showOptionals={showOptionals}
                                                activeSubTab={euSubTab}
                                            />
                                        </>
                                    )}
                                    {activeTab === 'USA' && <TabUSA p={per100display} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}
                                    {activeTab === 'Canada' && <TabCanada p={per100display} ca={ca} subTab={subTab} setSubTab={setSubTab} full={false} />}
                                    {activeTab === 'Australia' && <TabAustralia p={per100display} au={au} showDI={auShowDI} setShowDI={setAuShowDI} full={false} />}
                                    {activeTab === 'Arabi' && <TabArabi p={per100display} arabi={arabi} full={false} />}
                                </div>
                                {activeTab === 'UE' && (
                                    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                            <input
                                                type="checkbox"
                                                checked={showOptionals}
                                                onChange={e => setShowOptionals(e.target.checked)}
                                                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-orange)' }}
                                            />
                                            Mostra valori facoltativi
                                        </label>
                                        {showOptionals && (
                                            <button
                                                onClick={() => setNutrModalOpen(true)}
                                                className="btn btn-outline"
                                                style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                                            >
                                                ⚙ Configura nutrienti
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button className="btn btn-outline" onClick={handleDownloadPNG} title="Esporta la tabella nutrizionale come immagine PNG" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ImageDown size={14} /> Scarica PNG</button>
                                <button className="btn btn-primary" onClick={handleSave} title="Salva la ricetta nell'archivio locale" style={{ background: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Salva in archivio</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer navigazione ── */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 28px', borderTop: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                }}>
                    <button
                        className="btn btn-outline"
                        onClick={() => wizNav(-1)}
                        disabled={wizardStep === 0}
                        style={{ opacity: wizardStep === 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ChevronLeft size={14} /> Indietro
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {fieldErrors.wizardNome && wizardStep === 0 && (
                            <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> {fieldErrors.wizardNome}
                            </span>
                        )}
                        {fieldErrors.wizardIng && wizardStep === 1 && (
                            <span style={{ fontSize: 12, color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <AlertTriangle size={12} /> {fieldErrors.wizardIng}
                            </span>
                        )}
                        <button
                            className="btn btn-accent"
                            onClick={() => wizardStep === 3 ? toggleWizardMode(false) : wizNav(1)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {wizardStep === 3 ? <><SlidersHorizontal size={14} /> Apri modalità Avanzata</> : <>Avanti <ChevronRight size={14} /></>}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ fontSize: 15 }}>
            {/* Custom ingredient modal */}
            {showCustomModal && (
                <CustomIngredientModal
                    onClose={() => setShowCustomModal(false)}
                    onSave={(ing) => { addCustomIngredient(ing); }}
                />
            )}
            <NutrientSelectModal
                open={nutrModalOpen}
                onClose={() => setNutrModalOpen(false)}
                selected={selectedOptionals}
                onChange={setSelectedOptionals}
            />
            {/* Archive modal */}
            {archiveOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="card" style={{ width: '90%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><FolderOpen size={16} /> Archivio Ricette</h3>
                            <button className="btn btn-outline" onClick={() => setArchiveOpen(false)} title="Chiudi" style={{ display: 'flex', alignItems: 'center', padding: '4px 8px' }}><X size={14} /></button>
                        </div>
                        {archiveItems.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>Nessuna ricetta salvata. Compila una ricetta e clicca 'Salva in archivio'.</p>}
                        {archiveItems.map(item => {
                            const d = item.data as any;
                            const title = d.nome_prodotto || d.productName || item.name || 'Ricetta Senza Nome';
                            const ingCount = (d.componenti || d.components || []).reduce((s: number, c: any) => s + (c.ingredienti || c.rows || []).length, 0);
                            return (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{title}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{new Date(item.date).toLocaleDateString('it-IT')} · {ingCount} ingredienti</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary" style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => handleLoad(item)}>Carica</button>
                                        <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: '#e53e3e' }} onClick={() => { if (window.confirm(`Eliminare "${title}"?`)) deleteItem(item.id); }}>🗑 Elimina</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Header — mod 1 */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Salad size={22} /> Creazione tabelle valori nutrizionali</h1>
                    <p>Etichettatura internazionale (UE, USA, Canada, Australia, Arabi) &amp; Costi Ingredienti</p>
                </div>
                <div className="header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Toggle Guidata / Avanzata */}
                    <div style={{ display: 'flex', background: 'var(--color-surface)', border: '1.5px solid var(--color-border)', borderRadius: 8, padding: 3, gap: 2 }}>
                        <button
                            onClick={() => toggleWizardMode(true)}
                            style={{
                                padding: '6px 15px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .2s',
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: wizardMode ? 'linear-gradient(135deg, var(--color-orange), var(--color-orange-hover))' : 'transparent',
                                color: wizardMode ? 'white' : 'var(--color-text-muted)',
                                boxShadow: wizardMode ? '0 1px 6px rgba(255,126,46,.30)' : 'none',
                            }}>
                            <Compass size={13} /> Guidata
                        </button>
                        <button
                            onClick={() => toggleWizardMode(false)}
                            style={{
                                padding: '6px 15px', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: 12, fontWeight: 700, transition: 'all .2s',
                                display: 'flex', alignItems: 'center', gap: 5,
                                background: !wizardMode ? 'linear-gradient(135deg, var(--color-orange), var(--color-orange-hover))' : 'transparent',
                                color: !wizardMode ? 'white' : 'var(--color-text-muted)',
                                boxShadow: !wizardMode ? '0 1px 6px rgba(255,126,46,.30)' : 'none',
                            }}>
                            <SlidersHorizontal size={13} /> Avanzata
                        </button>
                    </div>
                    <button className="btn btn-outline" onClick={() => setShowCustomModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Database size={14} /> Aggiungi ingrediente al DB</button>
                    <button className="btn btn-outline" onClick={handleNew} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={14} /> Nuovo</button>
                    <button className="btn btn-outline" onClick={() => setArchiveOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FolderOpen size={14} /> Archivio ({archiveItems.length})</button>
                    <button className="btn btn-accent" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> {currentId ? 'Aggiorna' : 'Salva'}</button>
                </div>
            </div>

            {!wizardMode && (<>
            {/* Quick Guide — mod 1 (Step 3 text updated) */}
            <div style={{ marginBottom: 20, border: '1.5px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: 'var(--color-bg-secondary, #f8f9fb)', borderBottom: guideOpen ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}><BookOpen size={15} /> Come usare il Calcolatore — guida rapida</span>
                    <button className="btn btn-outline" style={{ fontSize: 12, padding: '4px 12px' }} onClick={toggleGuide}>{guideOpen ? 'Nascondi guida' : 'Mostra guida'}</button>
                </div>
                <div style={{ maxHeight: guideOpen ? '900px' : '0', overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
                    <div style={{ padding: '18px 18px 6px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
                            {([
                                { step: 'STEP 1', icon: <Search size={20} />, title: 'Cerca Ingredienti', desc: "Digita nel campo ricerca e seleziona l'ingrediente dal database AEA." },
                                { step: 'STEP 2', icon: <Scale size={20} />, title: 'Inserisci Pesi', desc: 'Specifica i grammi per ogni ingrediente. I calcoli si aggiornano in tempo reale.' },
                                { step: 'STEP 3', icon: <Flame size={20} />, title: 'Calo Peso', desc: 'Peso del prodotto finito (dopo eventuale calo peso dovuto ad evaporazione di acqua).' },
                                { step: 'STEP 4', icon: <Euro size={20} />, title: 'Analisi Costi', desc: 'Aggiungi €/kg e Resa% per vedere il costo del piatto e il breakdown economico.' },
                                { step: 'STEP 5', icon: <Globe size={20} />, title: 'Export Labelling', desc: 'Scegli il paese di destinazione e scarica le tabelle PDF conformi ai regolamenti.' },
                            ] as { step: string; icon: React.ReactNode; title: string; desc: string }[]).map(({ step, icon, title, desc }) => (
                                <div key={step} className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>{step}</div>
                                    <div style={{ color: 'var(--color-accent-light)' }}>{icon}</div>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Product name — fuori dal blocco INSERIMENTO RICETTA */}
            <div className="prodotto-card">
                <div className="prodotto-card-label">
                    <Package size={13} /> PRODOTTO
                    <InfoTooltip text="Il nome del prodotto come comparirà nella scheda etichetta" />
                </div>
                <input type="text" placeholder="Nome prodotto (es. Torta di mele, Salsa al pomodoro...)" value={productName}
                    onChange={e => setProductName(e.target.value)} className="form-input" style={{ fontSize: 15, fontWeight: 600 }} />
            </div>

            {/* Weight card — collapsible, fuori dal blocco INSERIMENTO RICETTA */}
            <div className="section-card" style={{ marginBottom: 20 }}>
                <div
                    className="section-card-header"
                    onClick={() => setPesoCardOpen(v => !v)}
                >
                    <h3 className="section-card-title"><Scale size={15} /> Peso prodotto</h3>
                    <ChevronRight size={14} style={{ transform: pesoCardOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
                </div>
                <div style={{ maxHeight: pesoCardOpen ? '400px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease' }}>
                    <div className="section-card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                        <div className="form-field" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Peso prodotto finito (g)</label>
                                <InfoTooltip text="Peso del prodotto dopo cottura, disidratazione o evaporazione di acqua. Deve essere uguale o inferiore al peso del prodotto processato." />
                            </div>
                            <input type="number" min={0} placeholder={`max ${totalGramsRaw.toFixed(0)}g`} value={finishedWeight}
                                onChange={e => handleFW(e.target.value)}
                                className="form-input" style={fwWarning ? { borderColor: '#e53e3e', background: 'rgba(229,62,62,.05)' } : {}} />
                            {fwWarning && (
                                <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(229,62,62,.10)', border: '2px solid #e53e3e', borderRadius: 7, fontSize: 12, color: '#c53030', fontWeight: 700, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span>{fieldErrors['finished-weight'] || `Valore superiore al peso del prodotto crudo. Inserire un valore uguale o inferiore a ${(totalGramsRaw / ((components[0]?.pzUV || 1))).toFixed(0)}g.`}</span>
                                </div>
                            )}
                        </div>
                        <div className="form-field" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Peso specifico (g/ml)</label>
                                <InfoTooltip text="Inserisci il peso specifico SOLO per alimenti liquidi (bevande, vino, birra, succhi, latte, ecc.). Quando compilato, i valori nutrizionali verranno espressi su 100 ml anziché 100 g, e apparirà: 'Valori nutrizionali medi in 100 ml di prodotto'." />
                            </div>
                            <input type="number" min={0} step={0.01} placeholder="opzionale" value={specificGravity}
                                onChange={e => setSpecificGravity(e.target.value)}
                                className="form-input" />
                        </div>
                    </div>
                </div>
            </div>

            {/* INSERIMENTO RICETTA section header — mod 1 */}
            <div
                onClick={() => setRicettaOpen(v => !v)}
                style={{ background: 'var(--color-navy, #1a1a2e)', color: 'white', borderRadius: ricettaOpen ? '10px 10px 0 0' : 10, padding: '10px 20px', marginBottom: 0, fontWeight: 800, fontSize: 15, letterSpacing: '0.08em', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ClipboardList size={16} /> INSERIMENTO RICETTA</span>
                <ChevronRight size={16} style={{ transform: ricettaOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: 0.7 }} />
            </div>
            <div style={{ maxHeight: ricettaOpen ? '10000px' : '0', overflow: 'hidden', transition: 'max-height 0.45s ease' }}>
            <div style={{ border: '2px solid var(--color-navy, #1a1a2e)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '20px 20px 4px', marginBottom: 20 }}>

            {/* Components — mod 3, 4, 5, 6: PZ/UV decimals, tooltips, €/kg zero fix, wider fields */}
            {components.map((comp, ci) => {
                const isCompOpen = compOpen[comp.id] !== false;
                return (
                <div key={comp.id} className="comp-card card" style={{ marginBottom: 16 }}>
                    <div
                        className="comp-card-header"
                        onClick={() => setCompOpen(prev => ({ ...prev, [comp.id]: !isCompOpen }))}
                    >
                        <h3 className="comp-card-title">
                            <span className="comp-number-badge">{ci + 1}</span>
                            {comp.name || `Componente ${ci + 1}`}
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {components.length > 1 && (
                                <button onClick={(e) => { e.stopPropagation(); removeComp(comp.id); }} className="comp-action-btn" title="Rimuovi questo componente">
                                    <Trash2 size={14} />
                                </button>
                            )}
                            <ChevronRight size={14} style={{ transform: isCompOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
                        </div>
                    </div>
                    {isCompOpen && (<div className="comp-card-body">
                    <div className="comp-header-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 12 }}>
                        <div className="form-field" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                <label className="form-label" style={{ marginBottom: 0 }}>Nome componente</label>
                                <InfoTooltip text="Inserisci il nome del componente (es: pasta, farcitura, ricopertura)." />
                            </div>
                            <input type="text" placeholder="Nome componente opzionale (es. impasto, crema)" value={comp.name}
                                onChange={e => updateCompName(comp.id, e.target.value)} className="form-input" />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                    <label className="form-label" style={{ whiteSpace: 'nowrap', marginBottom: 0, fontSize: 13 }}>PER N° PZ /U.V.</label>
                                    <InfoTooltip text="Digitare il numero di PZ o di Unità di Vendita che si possono realizzare con la quantità di componente che scaturisce dalla ricetta." />
                                </div>
                                <div style={{ width: 120 }}>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        placeholder="Obbligatorio"
                                        value={pzUVRaw[comp.id] ?? ''}
                                        onChange={e => {
                                            const raw = e.target.value;
                                            setPzUVRaw(prev => ({ ...prev, [comp.id]: raw }));
                                            const v = parseFloat(raw.replace(',', '.'));
                                            if (!isNaN(v) && v >= 0.001) {
                                                updateCompPzUV(comp.id, v);
                                                setFieldErrors(prev => ({ ...prev, [`${comp.id}-pzuv`]: '' }));
                                            }
                                        }}
                                        onBlur={e => {
                                            const raw = e.target.value.trim();
                                            const v = parseFloat(raw.replace(',', '.'));
                                            if (!raw || isNaN(v) || v < 0.001) {
                                                setFieldErrors(prev => ({ ...prev, [`${comp.id}-pzuv`]: 'Inserisci il numero di pezzi per UV.' }));
                                            } else {
                                                updateCompPzUV(comp.id, v);
                                                setFieldErrors(prev => ({ ...prev, [`${comp.id}-pzuv`]: '' }));
                                            }
                                        }}
                                        className="form-input"
                                    />
                                </div>
                                <ValidationError message={fieldErrors[`${comp.id}-pzuv`]} visible={!!fieldErrors[`${comp.id}-pzuv`]} />
                            </div>
                        </div>
                    </div>
                    <IngSearch onAdd={(ing) => addRowToComp(comp.id, ing)} db={db} loading={loadingDB} error={dbError} />
                    {comp.rows.map(row => {
                        const _displayGramsAdv = (() => { const raw = gramsRaw[`${comp.id}-${row.id}`]; if (raw === undefined) return row.grams; const v = parseFloat(raw.replace(',', '.')); return isNaN(v) ? row.grams : v; })();
                        const gramsPerPiece = comp.pzUV > 0 && _displayGramsAdv > 0 ? _displayGramsAdv / comp.pzUV : null;
                        const fabbReale = row.grams / ((row.resa || 100) / 100);
                        const costoIng = (row.eurKg / 1000) * fabbReale;
                        return (
                            <div key={row.id} className="ing-card">
                                <div className="ing-card-header">
                                    <div className="ing-name-area">
                                        <span className="ing-name">{row.ing.nome}</span>
                                        <InfoTooltip text="Grammi dell'ingrediente nella ricetta totale, per tutti i pezzi" />
                                    </div>
                                    <button onClick={() => removeRow(comp.id, row.id)} className="ing-delete-btn" title="Rimuovi ingrediente">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                <div className="ing-card-body">
                                    <div className="ing-field-group">
                                        <div className="ing-field-header">
                                            <span className="ing-field-label">Grammi</span>
                                        </div>
                                        <div className="ing-field-input-wrap">
                                            <input type="text" inputMode="decimal"
                                                className="form-input ing-input"
                                                value={gramsRaw[`${comp.id}-${row.id}`] ?? String(row.grams)}
                                                onChange={e => {
                                                    const raw = e.target.value;
                                                    setGramsRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: raw }));
                                                    const v = parseFloat(raw.replace(',', '.'));
                                                    if (!isNaN(v) && v >= 0) updateGrams(comp.id, row.id, v);
                                                }}
                                                onBlur={e => {
                                                    const raw = e.target.value.trim();
                                                    const v = parseFloat(raw.replace(',', '.'));
                                                    const val = (!raw || isNaN(v) || v < 0) ? 0 : v;
                                                    setGramsRaw(prev => ({ ...prev, [`${comp.id}-${row.id}`]: String(val) }));
                                                    updateGrams(comp.id, row.id, val);
                                                }}
                                            />
                                            <span className="ing-unit">g</span>
                                        </div>
                                        {gramsPerPiece !== null && <span className="ing-per-pz">{gramsPerPiece.toFixed(1)} g/pz</span>}
                                        <ValidationError message={fieldErrors[`${comp.id}-${row.id}-grams`]} visible={!!fieldErrors[`${comp.id}-${row.id}-grams`]} />
                                    </div>
                                    <div className="ing-field-group">
                                        <div className="ing-field-header">
                                            <span className="ing-field-label">€/kg</span>
                                            <InfoTooltip text="Costo dell'ingrediente per kg, IVA esclusa. Non è obbligatorio: se non inserisci nulla, il valore predefinito è 0 e il costo non verrà calcolato." />
                                        </div>
                                        <input type="number" min={0} step={0.01}
                                            placeholder="0"
                                            value={row.eurKg === 0 || row.eurKg ? row.eurKg : ''}
                                            onChange={e => updateEurKg(comp.id, row.id, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                                            className="form-input ing-input" />
                                        <ValidationError message={fieldErrors[`${comp.id}-${row.id}-eurkgs`]} visible={!!fieldErrors[`${comp.id}-${row.id}-eurkgs`]} />
                                    </div>
                                    <div className="ing-field-group">
                                        <div className="ing-field-header">
                                            <span className="ing-field-label">Resa %</span>
                                            <InfoTooltip text="Percentuale di prodotto effettivamente utilizzabile dopo pulizia o lavorazione. Es: 70 per verdure con scarti (foglie, bucce). Default: 100" />
                                        </div>
                                        <input type="number" min={1} max={100} step={1} value={row.resa || 100}
                                            onChange={e => updateResa(comp.id, row.id, parseFloat(e.target.value) || 100)}
                                            className="form-input ing-input" />
                                        <ValidationError message={fieldErrors[`${comp.id}-${row.id}-resa`]} visible={!!fieldErrors[`${comp.id}-${row.id}-resa`]} />
                                    </div>
                                </div>
                                {(row.eurKg > 0) && (
                                    <div className="ing-cost-line">
                                        <span>Grammi reali: <strong>{fabbReale.toFixed(1)}g</strong></span>
                                        <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoIng.toFixed(4)} €</strong></span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {comp.rows.length > 0 && (
                        <div className="ing-total-bar">
                            <span>Totale: <strong>{comp.rows.reduce((s, r) => s + r.grams, 0).toFixed(0)} g</strong></span>
                        </div>
                    )}
                    {/* Additivi per componente — Vista Avanzata */}
                    {isCompOpen && (
                    <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}><FlaskConical size={13} /> Additivi</label>
                            <button type="button" className="btn btn-outline" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => addAdditiveRow(comp.id)}>
                                <Plus size={11} /> Aggiungi additivo
                            </button>
                        </div>
                        {comp.additiveRows.map(arow => {
                            const fabbA = arow.grams / ((arow.resa || 100) / 100);
                            const costoA = (fabbA / 1000) * arow.eurKg;
                            return (
                                <div key={arow.id} className="ing-card" style={{ marginBottom: 8 }}>
                                    <div className="ing-card-header">
                                        <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
                                            <select className="form-input" style={{ flex: '1 1 160px', fontSize: 12 }} value={arow.categoria} onChange={e => { updateAdditiveRow(comp.id, arow.id, 'categoria', e.target.value); updateAdditiveRow(comp.id, arow.id, 'nomeSpecifico', ''); }}>
                                                <option value="">— Categoria —</option>
                                                {ADDITIVI_CATEGORIE.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                            <select className="form-input" style={{ flex: '1 1 160px', fontSize: 12 }} value={arow.nomeSpecifico} onChange={e => updateAdditiveRow(comp.id, arow.id, 'nomeSpecifico', e.target.value)} disabled={!arow.categoria}>
                                                <option value="">{arow.categoria ? '— Seleziona additivo —' : '— Prima seleziona categoria —'}</option>
                                                {(ADDITIVI_SPECIFICI[arow.categoria] || []).map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </div>
                                        <button className="ing-delete-btn" onClick={() => removeAdditiveRow(comp.id, arow.id)} title="Rimuovi additivo"><Trash2 size={13} /></button>
                                    </div>
                                    <div className="ing-card-body">
                                        <div className="ing-field-group">
                                            <div className="ing-field-header"><span className="ing-field-label">Grammi</span></div>
                                            <div className="ing-field-input-wrap">
                                                <input type="number" min={0} step={0.1} className="form-input ing-input" value={arow.grams || ''} placeholder="0" onChange={e => updateAdditiveRow(comp.id, arow.id, 'grams', parseFloat(e.target.value) || 0)} />
                                                <span className="ing-unit">g</span>
                                            </div>
                                        </div>
                                        <div className="ing-field-group">
                                            <div className="ing-field-header"><span className="ing-field-label">€/kg</span></div>
                                            <input type="number" min={0} step={0.01} placeholder="0" className="form-input ing-input" value={arow.eurKg || ''} onChange={e => updateAdditiveRow(comp.id, arow.id, 'eurKg', parseFloat(e.target.value) || 0)} />
                                        </div>
                                        <div className="ing-field-group">
                                            <div className="ing-field-header"><span className="ing-field-label">Resa %</span></div>
                                            <input type="number" min={1} max={100} step={1} className="form-input ing-input" value={arow.resa || 100} onChange={e => updateAdditiveRow(comp.id, arow.id, 'resa', parseFloat(e.target.value) || 100)} />
                                        </div>
                                    </div>
                                    {arow.eurKg > 0 && (
                                        <div className="ing-cost-line">
                                            <span>Grammi reali: <strong>{fabbA.toFixed(1)}g</strong></span>
                                            <span>Costo: <strong style={{ color: 'var(--color-orange)' }}>{costoA.toFixed(4)} €</strong></span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    )}
                    </div>)}
                </div>
                );
            })}

            <button className="btn btn-outline add-comp-btn" onClick={addComp}><Plus size={14} /> Aggiungi componente</button>

            </div>{/* end INSERIMENTO RICETTA wrapper */}
            </div>{/* end collapsible wrapper */}

            {/* Riepilogo ingredienti — Excel-style */}
            {allRows.length > 0 && (() => {
                const pesoFinitoPzCalc = fw > 0 ? fw : totGrammiXpzuv;
                const caloAcqua = totGrammiXpzuv > pesoFinitoPzCalc ? totGrammiXpzuv - pesoFinitoPzCalc : 0;
                const isAcqua = (nome: string) => (nome || '').trim().toLowerCase() === 'acqua';
                const totGrammiTotali = mergedIngredients.reduce((s, r) => s + r.grammiTotali, 0);
                const totQuid = pesoFinitoPzCalc > 0 ? (totGrammiXpzuv / pesoFinitoPzCalc * 100) : 0;
                let totCostoUV = 0;
                for (const r of mergedIngredients) {
                    if (r.eurKg > 0) {
                        const fabb = r.grammiXpzuv / ((r.resa || 100) / 100);
                        totCostoUV += (fabb / 1000) * r.eurKg;
                    }
                }
                const totCostoKg = pesoFinitoPzCalc > 0 && totCostoUV > 0 ? totCostoUV / (pesoFinitoPzCalc / 1000) : 0;
                const fmt3 = (v: number) => v.toFixed(3).replace('.', ',');
                const fmt2 = (v: number) => v.toFixed(2).replace('.', ',');
                const fmtC = (v: number) => v > 0 ? v.toFixed(3).replace('.', ',') : '—';
                return (
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div
                            onClick={() => setRiepilogoOpen(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                        >
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}><Table2 size={15} /> Riepilogo ingredienti <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--color-text-muted)' }}>({mergedIngredients.length})</span></h3>
                            <ChevronRight size={14} style={{ transform: riepilogoOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--color-text-muted)' }} />
                        </div>
                        {riepilogoOpen && (<>
                            <div className="ri-tab-bar" style={{ display: 'flex', gap: 0, marginTop: 12, marginBottom: 4, borderRadius: 8, overflow: 'hidden', border: '1.5px solid var(--color-border)', alignSelf: 'flex-start' }}>
                                <button onClick={() => setRiepilogoTab('q')} title="Visualizza quantità e grammature" style={{ padding: '4px 11px', border: 'none', borderRight: '1.5px solid var(--color-border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, background: riepilogoTab === 'q' ? 'var(--color-navy)' : 'transparent', color: riepilogoTab === 'q' ? 'white' : 'var(--color-text-muted)' }}><Scale size={12} />Quantità</button>
                                <button onClick={() => setRiepilogoTab('c')} title="Visualizza costi e rese" style={{ padding: '4px 11px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, background: riepilogoTab === 'c' ? 'var(--color-navy)' : 'transparent', color: riepilogoTab === 'c' ? 'white' : 'var(--color-text-muted)' }}><Euro size={12} />Costi</button>
                            </div>
                            <div className="riepilogo-wrapper" data-riepilogo-tab={riepilogoTab} style={{ marginTop: 0, overflowX: 'auto', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}>
                                <table className="riepilogo-table" style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: 860 }}>
                                    <thead>
                                        <tr style={{ background: 'var(--color-orange)', color: 'white' }}>
                                            <td style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>{mergedIngredients.length}</td>
                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totGrammiTotali)}</td>
                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totGrammiXpzuv)}</td>
                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>100,000</td>
                                            <td className="ri-q" style={{ padding: '6px 10px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(totQuid)}</td>
                                            <td className="ri-c" style={{ padding: '6px 8px' }} />
                                            <td className="ri-c" style={{ padding: '6px 8px' }} />
                                            <td className="ri-c" style={{ padding: '6px 8px' }} />
                                            <td className="ri-c" style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)' }}>{totCostoUV > 0 ? fmt3(totCostoUV) : '—'}</td>
                                            <td className="ri-c" style={{ padding: '6px 8px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap', background: 'rgba(0,0,0,0.15)' }}>{totCostoKg > 0 ? fmt3(totCostoKg) : '—'}</td>
                                        </tr>
                                        <tr style={{ background: '#f0f0f0', borderBottom: '2px solid var(--color-border)' }}>
                                            <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', minWidth: 130 }}>INGREDIENTI</th>
                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>grammi<br />totali</th>
                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>grammi X<br />PZ / U.V.</th>
                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>% in<br />ricetta</th>
                                            <th className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', color: 'var(--color-orange)' }}>QUID</th>
                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>COSTO/KG<br />ingr. grezzo</th>
                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>RESA<br />lavoraz. %</th>
                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap' }}>COSTO/KG<br />ingr. pulito</th>
                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', background: 'rgba(255,126,46,0.08)' }}>COSTO/<br />U.V.</th>
                                            <th className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, fontSize: 11, whiteSpace: 'nowrap', background: 'rgba(255,126,46,0.08)' }}>COSTO/<br />KG</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mergedIngredients.map((row, i) => {
                                            const pctRicetta = totGrammiXpzuv > 0 ? (row.grammiXpzuv / totGrammiXpzuv * 100) : 0;
                                            const grammiEffettivi = isAcqua(row.ing.nome) ? Math.max(0, row.grammiXpzuv - caloAcqua) : row.grammiXpzuv;
                                            const quid = pesoFinitoPzCalc > 0 ? (grammiEffettivi / pesoFinitoPzCalc * 100) : 0;
                                            const costoKgPulito = row.eurKg > 0 ? row.eurKg / ((row.resa || 100) / 100) : 0;
                                            const fabbXpzuv = row.grammiXpzuv / ((row.resa || 100) / 100);
                                            const costoUV = row.eurKg > 0 ? (fabbXpzuv / 1000) * row.eurKg : 0;
                                            const costoKg = pesoFinitoPzCalc > 0 && costoUV > 0 ? costoUV / (pesoFinitoPzCalc / 1000) : 0;
                                            const bg = i % 2 === 0 ? 'white' : '#fafafa';
                                            return (
                                                <tr key={row.ing.nome} style={{ background: bg, borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '6px 10px', fontWeight: 500, minWidth: 130 }}>{(row.ing.nome || '').trim()}</td>
                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmt3(row.grammiTotali)}</td>
                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>{fmt3(row.grammiXpzuv)}</td>
                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt3(pctRicetta)}</td>
                                                    <td className="ri-q" style={{ padding: '6px 10px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--color-orange)' }}>{fmt3(quid)}</td>
                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{row.eurKg > 0 ? fmt2(row.eurKg) : '—'}</td>
                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt2(row.resa || 100)}</td>
                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>{costoKgPulito > 0 ? fmt2(costoKgPulito) : '—'}</td>
                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, background: 'rgba(255,126,46,0.04)' }}>{fmtC(costoUV)}</td>
                                                    <td className="ri-c" style={{ padding: '6px 8px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600, background: 'rgba(255,126,46,0.04)' }}>{fmtC(costoKg)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>)}
                    </div>
                );
            })()}


            {/* Allergens */}
            <div style={{ marginBottom: 20 }}>
                <AllergenSection present={presentAllergens} cross={crossAllergens} />
            </div>

            {/* Cost summary card */}
            {allRows.length > 0 && (() => {
                let costoTotale = 0;
                let fabbRealeTotale = 0;
                for (const c of components) {
                    for (const r of c.rows) {
                        const fabb = r.grams / ((r.resa || 100) / 100);
                        costoTotale += (r.eurKg / 1000) * fabb;
                        fabbRealeTotale += fabb;
                    }
                }
                const costPerKg = pesoTotale > 0 ? (costoTotale / pesoTotale) * 1000 : 0;
                if (costoTotale === 0) return null;
                return (
                    <div style={{ marginBottom: 20, background: 'linear-gradient(135deg,rgba(255,126,46,0.06),rgba(12,19,38,0.02))', border: '1.5px solid var(--color-orange)', borderRadius: 12, padding: '14px 20px' }}>
                        <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}><Euro size={15} /> Riepilogo Costi Ingredienti</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12 }}>
                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per pezzo</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-orange)', marginTop: 4 }}>{costoTotale.toFixed(3)} €</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Costo ingredienti per kg</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-navy)', marginTop: 4 }}>{costPerKg.toFixed(3)} €</div>
                            </div>
                            <div style={{ background: 'white', borderRadius: 10, padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Fabbisogno reale totale</div>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#555', marginTop: 4 }}>{fabbRealeTotale.toFixed(1)} g</div>
                            </div>
                        </div>
                    </div>
                );
            })()}


            {allRows.length > 0 && (
                <div style={{ marginTop: 0 }}>
                    {/* Nation Tabs */}
                    <div className="nation-tab-bar" style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', overflowX: 'auto', paddingBottom: 4 }}>
                        {(['UE', 'USA', 'Canada', 'Australia', 'Arabi'] as NationTab[]).map(t => {
                            const codes: Record<NationTab, string> = { UE: 'EU', USA: 'US', Canada: 'CA', Australia: 'AU', Arabi: 'AR' };
                            const names: Record<NationTab, string> = { UE: 'UE', USA: 'USA', Canada: 'Canada', Australia: 'Australia', Arabi: 'Arabi' };
                            return (
                                <button key={t}
                                    className={`btn nation-tab-btn ${activeTab === t ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ fontWeight: 600, flex: 1, textAlign: 'center', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                    onClick={() => setActiveTab(t)}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '1px 4px', borderRadius: 3, fontSize: 9, fontWeight: 800, letterSpacing: 0.3, border: '1px solid currentColor', opacity: 0.7, lineHeight: 1.4 }}>{codes[t]}</span>
                                    {names[t]}
                                </button>
                            );
                        })}
                    </div>

                    <div className="nutri-results-wrapper" style={{ background: 'white', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '16px 20px' }}>
                        {/* Serving inputs for the active nation */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 16 }}>
                            {activeTab === 'UE' && (
                                <>
                                    {(['porzione', 'confezione', 'pezzo'] as const).map((k, i) => {
                                        const labels = ['Porzione (g/ml)', 'U.V. / Confezione (g/ml)', 'Pezzo (g/ml)'];
                                        return (
                                            <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                <label className="form-label">{labels[i]}</label>
                                                <input type="number" min={0} placeholder="—" value={ue[k] || ''}
                                                    onChange={e => setUE(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                    className="form-input" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {activeTab === 'USA' && (
                                <>
                                    {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                        const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                        return (
                                            <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                <label className="form-label">{labels[i]}</label>
                                                <input type="number" min={0} placeholder="—" value={usa[k] || ''}
                                                    onChange={e => setUSA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                    className="form-input" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {activeTab === 'Canada' && (
                                <>
                                    {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                        const labels = ['CUP 250ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                        return (
                                            <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                <label className="form-label">{labels[i]}</label>
                                                <input type="number" min={0} placeholder="—" value={ca[k] || ''}
                                                    onChange={e => setCA(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                    className="form-input" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {activeTab === 'Australia' && (
                                <>
                                    {(['serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                        const labels = ['Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                        return (
                                            <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                <label className="form-label">{labels[i]}</label>
                                                <input type="number" min={0} placeholder="—" value={au[k] || ''}
                                                    onChange={e => setAU(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                    className="form-input" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                            {activeTab === 'Arabi' && (
                                <>
                                    {(['cup', 'cucchiaio', 'serving', 'confezione', 'pezzo'] as const).map((k, i) => {
                                        const labels = ['CUP 240ml (g)', 'Cucchiaio 15ml (g)', 'Serving Size (g/ml)', 'Confezione/UV (g/ml)', 'Pezzo (g/ml)'];
                                        return (
                                            <div key={k} className="form-field" style={{ marginBottom: 0 }}>
                                                <label className="form-label">{labels[i]}</label>
                                                <input type="number" min={0} placeholder="—" value={arabi[k] || ''}
                                                    onChange={e => setArabi(prev => ({ ...prev, [k]: parseFloat(e.target.value) || undefined }))}
                                                    className="form-input" />
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', marginBottom: 16 }} />
                        <div ref={tableRef}>
                            {activeTab === 'UE' && (
                                <>
                                    {(ue.porzione != null || ue.confezione != null || ue.pezzo != null) ? (
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                                            {([
                                                { key: '100g' as EUSubTab, label: 'Per 100g', disabled: false },
                                                { key: 'uv' as EUSubTab, label: 'Per U.V.', disabled: ue.confezione == null },
                                                { key: 'porzione' as EUSubTab, label: 'Per porzione', disabled: ue.porzione == null },
                                                { key: 'pezzo' as EUSubTab, label: 'Per pezzo', disabled: ue.pezzo == null },
                                            ] as { key: EUSubTab; label: string; disabled: boolean }[]).map(t => (
                                                <button
                                                    key={t.key}
                                                    disabled={t.disabled}
                                                    onClick={() => setEuSubTab(t.key)}
                                                    className={`btn ${euSubTab === t.key ? 'btn-accent' : 'btn-outline'}`}
                                                    style={{ fontSize: 11, padding: '4px 10px', opacity: t.disabled ? 0.4 : 1 }}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                    <TabUE
                                        p={per100display}
                                        ue={ue}
                                        specificGravity={parseFloat(specificGravity) || 0}
                                        selectedOptionals={selectedOptionals}
                                        showOptionals={showOptionals}
                                        activeSubTab={euSubTab}
                                    />
                                </>
                            )}
                            {activeTab === 'USA' && <TabUSA p={per100display} usa={usa} subTab={subTab} setSubTab={setSubTab} full={false} />}
                            {activeTab === 'Canada' && <TabCanada p={per100display} ca={ca} subTab={subTab} setSubTab={setSubTab} full={false} />}
                            {activeTab === 'Australia' && <TabAustralia p={per100display} au={au} showDI={auShowDI} setShowDI={setAuShowDI} full={false} />}
                            {activeTab === 'Arabi' && <TabArabi p={per100display} arabi={arabi} full={false} />}
                        </div>
                        {activeTab === 'UE' && (
                            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                    <input
                                        type="checkbox"
                                        checked={showOptionals}
                                        onChange={e => setShowOptionals(e.target.checked)}
                                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-orange)' }}
                                    />
                                    Mostra valori facoltativi
                                </label>
                                {showOptionals && (
                                    <button
                                        onClick={() => setNutrModalOpen(true)}
                                        className="btn btn-outline"
                                        style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}
                                    >
                                        ⚙ Configura nutrienti
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {allRows.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <button className="btn btn-outline" onClick={handleDownloadPNG} title="Esporta la tabella nutrizionale come immagine PNG" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ImageDown size={14} /> Scarica PNG</button>
                    <button className="btn btn-primary" onClick={handleSave} title="Salva la ricetta nell'archivio locale" style={{ background: 'var(--color-navy)', display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Salva in archivio</button>
                </div>
            )}
            </>)}
            {wizardMode && renderWizard()}
        </div>
    );
}

// ─── Allergen & Ingredient sections ──────────────────────────────────────────
function AllergenSection({ present, cross }: { present: string[]; cross: string[] }) {
    if (present.length === 0 && cross.length === 0) return <div />;
    return (
        <div className="card">
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 7 }}><AlertTriangle size={15} /> Allergeni</h3>
            {present.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#c53030', marginBottom: 4 }}>CONTIENE:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {present.map(a => <span key={a} style={{ background: 'rgba(229,62,62,0.1)', color: '#c53030', fontWeight: 700, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{a}</span>)}
                    </div>
                </div>
            )}
            {cross.length > 0 && (
                <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#dd6b20', marginBottom: 4 }}>PUÒ CONTENERE TRACCE DI:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {cross.map(a => <span key={a} style={{ background: 'rgba(221,107,32,0.1)', color: '#dd6b20', fontWeight: 600, padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{a}</span>)}
                    </div>
                </div>
            )}
        </div>
    );
}
// ─── Shared table styling ───────────────────────────────────────────────────
const TS = {
    table: { borderCollapse: 'collapse' as const, width: '100%', fontSize: 12 },
    th: { background: '#000', color: 'white', padding: '5px 8px', textAlign: 'left' as const, fontSize: 11, fontWeight: 600 as const },
    thR: { background: '#000', color: 'white', padding: '5px 8px', textAlign: 'right' as const, fontSize: 11, fontWeight: 600 as const },
    td: { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: 12 },
    tdR: { padding: '4px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12 },
    tdB: { padding: '4px 8px', borderBottom: '1px solid #ddd', fontSize: 12, fontWeight: 700 as const },
    tdBR: { padding: '4px 8px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12, fontWeight: 700 as const },
    tdSub: { padding: '4px 8px 4px 20px', borderBottom: '1px solid #ddd', fontSize: 12, color: '#666' },
    tdSubR: { padding: '4px 8px 4px 20px', borderBottom: '1px solid #ddd', textAlign: 'right' as const, fontSize: 12, color: '#666' },
};

// ─── TabUSA ─────────────────────────────────────────────────────────────────
function TabUSA({ p, usa, subTab, setSubTab, full }: { p: CalcResult; usa: ServingSizesNation; subTab: SubTab; setSubTab: (t: SubTab) => void; full?: boolean }) {
    const svG = usa.serving || 0;
    // Always scale to serving size when available (FDA compliance: label shows per-serving values)
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const d = sv || p; // data source: serving if available, else per-100g
    const row = (label: string, val: number, dv: number, unit: string, sub?: boolean, bold?: boolean, isOptional?: boolean) => ({ label, val, dv, unit, sub, bold, isOptional });
    const usaRows = [
        row('Total Fat', d.grassi, DV_USA.grassi, 'g', false, true),
        row('Saturated Fat', d.saturi, DV_USA.saturi, 'g', true),
        row('Trans Fat', d.trans, 0, 'g', true),
        row('Polyunsaturated Fat', d.polins, 0, 'g', true, false, true),
        row('Monounsaturated Fat', d.monoins, 0, 'g', true, false, true),
        row('Cholesterol', d.colesterolo, DV_USA.colesterolo, 'mg', false, true),
        row('Sodium', d.sodio_mg, DV_USA.sodio_mg, 'mg', false, true),
        row('Total Carbohydrate', d.carboidratiTot, DV_USA.carboidratiTot, 'g', false, true),
        row('Dietary Fiber', d.fibre, DV_USA.fibre, 'g', true),
        row('Total Sugars', d.zuccheri, 0, 'g', true),
        row('Includes Added Sugars', d.zuccheri_agg, DV_USA.zuccheri_agg, 'g', true),
        row('Protein', d.proteine, DV_USA.proteine, 'g', false, true),
    ].filter(r => full || !r.isOptional);

    const vitamins = full ? [
        { label: 'Vitamin D', val: d.vitD, dv: DV_USA.vitD, unit: 'mcg' },
        { label: 'Calcium', val: d.calcio, dv: DV_USA.calcio, unit: 'mg' },
        { label: 'Iron', val: d.ferro, dv: DV_USA.ferro, unit: 'mg' },
        { label: 'Potassium', val: d.potassio, dv: DV_USA.potassio, unit: 'mg' },
    ] : [];

    return (
        <div style={{ background: 'white' }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (USA)</h3>
                    <div className="subtab-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                            <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                        ))}
                    </div>
                </>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0 }}>
            {/* Vertical layout (default) */}
            {subTab === 'verticale' && (
                <div style={{ maxWidth: 400, border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, borderBottom: '1px solid #000', paddingBottom: 4 }}>Nutrition Facts</div>
                    {svG > 0 && <div style={{ fontSize: 13 }}>{Math.round(100 / svG)} servings per container</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '10px solid #000', paddingBottom: 4 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>Serving size</div>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>{svG > 0 ? `${svG} g` : '(—)'}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, borderBottom: '1px solid #000', paddingBottom: 2 }}>Amount per serving</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '5px solid #000' }}>
                        <div style={{ fontSize: 28, fontWeight: 900 }}>Calories</div>
                        <div style={{ fontSize: 36, fontWeight: 900 }}>{rUSA_energy(d.energyKcal)}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 10, borderBottom: '1px solid #000', paddingBottom: 2 }}>% Daily Value*</div>
                    {usaRows.map((r, i) => {
                        const pct = r.dv > 0 ? rUSA_pct(r.val, r.dv) : null;
                        const fmtd = r.unit === 'mg' ? `${rUSA_mg5(r.val)} mg` : `${rUSA_g(r.val)} g`;
                        return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', paddingLeft: r.sub ? 16 : 0, fontSize: r.bold ? 13 : 12, fontWeight: r.bold ? 700 : 400 }}>
                                <span>{r.label} {!r.bold || r.sub ? fmtd : ''}</span>
                                <span>{pct !== null ? `${pct}%` : ''}</span>
                            </div>
                        );
                    })}
                    {vitamins.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ccc', fontSize: 12 }}>
                            <span>{m.label} {m.val.toFixed(1)} {m.unit}</span>
                            <span>{rUSA_pct(m.val, m.dv)}%</span>
                        </div>
                    ))}
                    <div style={{ fontSize: 9, borderTop: '3px solid #000', paddingTop: 4, marginTop: 4 }}>
                        * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
                    </div>
                </div>
            )}

            {/* Horizontal layout */}
            {subTab === 'orizzontale' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ fontSize: 24, fontWeight: 900, borderBottom: '3px solid #000', paddingBottom: 4, marginBottom: 8 }}>Nutrition Facts</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '0 0 auto' }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Serving size: {svG > 0 ? `${svG} g` : '—'}</div>
                            <div style={{ fontSize: 28, fontWeight: 900 }}>Calories {rUSA_energy(d.energyKcal)}</div>
                        </div>
                        <div style={{ flex: 1, borderLeft: '1px solid #000', paddingLeft: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                                {usaRows.filter(r => r.dv > 0).map((r, i) => (
                                    <div key={i} style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 12, fontWeight: 700 }}>{r.dv > 0 ? `${rUSA_pct(r.val, r.dv)}%` : ''}</div>
                                        <div style={{ fontSize: 10 }}>{r.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Linear layout */}
            {subTab === 'lineare' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
                    <span style={{ fontWeight: 900, fontSize: 14 }}>Nutrition Facts </span>
                    {svG > 0 && <span>Serving size {svG} g | </span>}
                    <span>Calories {rUSA_energy(d.energyKcal)} | </span>
                    {usaRows.filter(r => r.unit !== undefined).map((r, i) => (
                        <span key={i}><span style={{ fontWeight: 700 }}>{r.label}</span> {r.unit === 'mg' ? `${rUSA_mg5(r.val)} mg` : `${rUSA_g(r.val)} g`}{r.dv > 0 ? ` (${rUSA_pct(r.val, r.dv)}% DV)` : ''} | </span>
                    ))}
                </div>
            )}
            </div>
        </div>
    );
}

// ─── TabCanada ──────────────────────────────────────────────────────────────
function TabCanada({ p, ca, subTab, setSubTab, full }: { p: CalcResult; ca: ServingSizesNation; subTab: SubTab; setSubTab: (t: SubTab) => void; full?: boolean }) {
    const svG = ca.serving || 0;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const d = sv || p;
    const satTrans = d.saturi + d.trans;

    return (
        <div style={{ background: 'white' }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Canada)</h3>
                    <div className="subtab-bar" style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                        {(['verticale', 'orizzontale', 'lineare'] as SubTab[]).map(t => (
                            <button key={t} onClick={() => setSubTab(t)} className={`btn ${subTab === t ? 'btn-accent' : 'btn-outline'}`} style={{ fontSize: 11, padding: '5px 10px' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
                        ))}
                    </div>
                </>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0 }}>
            {subTab === 'verticale' && (
                <div style={{ maxWidth: 420, border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* English */}
                        <div>
                            <div style={{ fontSize: 24, fontWeight: 900 }}>Nutrition Facts</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '6px solid #000' }}>
                                <div><span style={{ fontWeight: 700 }}>Serving Size</span> {svG > 0 ? `${svG} g` : '—'}</div>
                            </div>
                            <div style={{ borderBottom: '4px solid #000' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900 }}>
                                    <span>Calories</span><span>{rCA_energy(d.energyKcal)}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 10 }}>% Daily Value*</div>
                            {[
                                { label: 'Fat', val: d.grassi, dv: DV_CA.grassi, fmt: rCA_fat, unit: 'g', bold: true },
                                { label: 'Saturated + Trans', val: satTrans, dv: DV_CA.satTrans, fmt: rCA_fat, unit: 'g', sub: true },
                                { label: 'Carbohydrate', val: d.carboidratiTot, dv: DV_CA.carboidratiTot, fmt: rCA_carb, unit: 'g', bold: true },
                                { label: 'Fibre', val: d.fibre, dv: DV_CA.fibre, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Sugars', val: d.zuccheri, dv: DV_CA.zuccheri, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Cholesterol', val: d.colesterolo, dv: 300, fmt: rCA_chol, unit: 'mg', bold: true },
                                { label: 'Sodium', val: d.sodio_mg, dv: DV_CA.sodio_mg, fmt: rCA_na, unit: 'mg', bold: true },
                                { label: 'Potassium', val: d.potassio, dv: DV_CA.potassio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Calcium', val: d.calcio, dv: DV_CA.calcio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Iron', val: d.ferro, dv: DV_CA.ferro, fmt: rCA_iron, unit: 'mg', bold: true, isOptional: true },
                            ].filter(r => full || !r.isOptional).map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #999', paddingLeft: r.sub ? 12 : 0, fontSize: r.bold ? 13 : 11, fontWeight: r.bold ? 700 : 400 }}>
                                    <span>{r.label} {r.fmt(r.val)} {r.unit}</span>
                                    <span>{rCA_pct(r.val, r.dv)}%</span>
                                </div>
                            ))}
                        </div>
                        {/* French */}
                        <div style={{ borderLeft: '1px solid #000', paddingLeft: 8 }}>
                            <div style={{ fontSize: 24, fontWeight: 900 }}>Valeur nutritive</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '6px solid #000' }}>
                                <div><span style={{ fontWeight: 700 }}>Portion</span> {svG > 0 ? `${svG} g` : '—'}</div>
                            </div>
                            <div style={{ borderBottom: '4px solid #000' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900 }}>
                                    <span>Calories</span><span>{rCA_energy(d.energyKcal)}</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', fontSize: 10 }}>% valeur quotidienne*</div>
                            {[
                                { label: 'Lipides', val: d.grassi, dv: DV_CA.grassi, fmt: rCA_fat, unit: 'g', bold: true },
                                { label: 'Saturés + Trans', val: satTrans, dv: DV_CA.satTrans, fmt: rCA_fat, unit: 'g', sub: true },
                                { label: 'Glucides', val: d.carboidratiTot, dv: DV_CA.carboidratiTot, fmt: rCA_carb, unit: 'g', bold: true },
                                { label: 'Fibres', val: d.fibre, dv: DV_CA.fibre, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Sucres', val: d.zuccheri, dv: DV_CA.zuccheri, fmt: rCA_carb, unit: 'g', sub: true },
                                { label: 'Cholestérol', val: d.colesterolo, dv: 300, fmt: rCA_chol, unit: 'mg', bold: true },
                                { label: 'Sodium', val: d.sodio_mg, dv: DV_CA.sodio_mg, fmt: rCA_na, unit: 'mg', bold: true },
                                { label: 'Potassium', val: d.potassio, dv: DV_CA.potassio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Calcium', val: d.calcio, dv: DV_CA.calcio, fmt: rCA_na, unit: 'mg', bold: true, isOptional: true },
                                { label: 'Fer', val: d.ferro, dv: DV_CA.ferro, fmt: rCA_iron, unit: 'mg', bold: true, isOptional: true },
                            ].filter(r => full || !r.isOptional).map((r, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #999', paddingLeft: r.sub ? 12 : 0, fontSize: r.bold ? 13 : 11, fontWeight: r.bold ? 700 : 400 }}>
                                    <span>{r.label} {r.fmt(r.val)} {r.unit}</span>
                                    <span>{rCA_pct(r.val, r.dv)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={{ fontSize: 9, borderTop: '1px solid #000', marginTop: 6, paddingTop: 4 }}>
                        * 5% or less is a little, 15% or more is a lot / 5% ou moins c'est peu, 15% ou plus c'est beaucoup
                    </div>
                </div>
            )}

            {subTab === 'orizzontale' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif' }}>
                    <div style={{ display: 'flex', gap: 16, borderBottom: '3px solid #000', paddingBottom: 8, marginBottom: 8 }}>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 900 }}>Nutrition Facts / Valeur nutritive</div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>Serving / Portion: {svG > 0 ? `${svG} g` : '—'}</div>
                            <div style={{ fontSize: 22, fontWeight: 900 }}>Calories {rCA_energy(d.energyKcal)}</div>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, fontSize: 12 }}>
                        {[
                            { en: 'Fat', fr: 'Lipides', val: d.grassi, dv: DV_CA.grassi, fmt: rCA_fat, unit: 'g' },
                            { en: 'Carbs', fr: 'Glucides', val: d.carboidratiTot, dv: DV_CA.carboidratiTot, fmt: rCA_carb, unit: 'g' },
                            { en: 'Sodium', fr: 'Sodium', val: d.sodio_mg, dv: DV_CA.sodio_mg, fmt: rCA_na, unit: 'mg' },
                            { en: 'Calcium', fr: 'Calcium', val: d.calcio, dv: DV_CA.calcio, fmt: rCA_na, unit: 'mg' },
                            { en: 'Iron', fr: 'Fer', val: d.ferro, dv: DV_CA.ferro, fmt: rCA_iron, unit: 'mg' },
                        ].map((m, i) => (
                            <div key={i} style={{ textAlign: 'center', borderLeft: '1px solid #ccc', paddingLeft: 8 }}>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>{rCA_pct(m.val, m.dv)}%</div>
                                <div style={{ fontSize: 11 }}>{m.en} / {m.fr}</div>
                                <div style={{ fontSize: 11 }}>{m.fmt(m.val)} {m.unit}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {subTab === 'lineare' && (
                <div style={{ border: '1px solid #000', padding: 8, fontFamily: 'Arial, sans-serif', fontSize: 11 }}>
                    <span style={{ fontWeight: 900, fontSize: 14 }}>Nutrition Facts / Valeur nutritive | </span>
                    {svG > 0 && <span>Serving / Portion {svG} g | </span>}
                    <span>Calories {rCA_energy(d.energyKcal)} | </span>
                    <span><b>Fat / Lipides</b> {rCA_fat(d.grassi)} g ({rCA_pct(d.grassi, DV_CA.grassi)}% DV) | </span>
                    <span><b>Carbs / Glucides</b> {rCA_carb(d.carboidratiTot)} g ({rCA_pct(d.carboidratiTot, DV_CA.carboidratiTot)}% DV) | </span>
                    <span><b>Sodium</b> {rCA_na(d.sodio_mg)} mg ({rCA_pct(d.sodio_mg, DV_CA.sodio_mg)}% DV)</span>
                </div>
            )}
            </div>
        </div>
    );
}

// ─── TabAustralia ─────────────────────────────────────────────────────────────
function TabAustralia({ p, au, showDI, setShowDI, full }: { p: CalcResult; au: ServingSizesNation; showDI: boolean; setShowDI: (v: boolean) => void; full?: boolean }) {
    const svG = au.serving || 0;
    const sv = (svG > 0 && (full || true)) ? scaleResult(p, svG) : null; // Australia always shows per serving if possible
    const auRows: { label: string; per100kj?: string; per100kcal?: string; svKj?: string; svKcal?: string; di?: string; g100?: string; gSv?: string; isCal?: boolean; isOptional?: boolean }[] = [];

    if (sv) {
        const diPct = (val: number, ref: number) => `${Math.round(val / ref * 100)}%`;
        auRows.push({ label: 'Energy', svKj: rAU_kj(sv.energyKj), svKcal: rAU_kcal(sv.energyKcal), di: diPct(sv.energyKj, DV_AU.energyKj), g100: `${rAU_kj(p.energyKj)} kJ`, isCal: true });
        [
            { label: 'Protein', svVal: sv.proteine, p100: p.proteine, ref: DV_AU.proteine },
            { label: 'Fat — total', svVal: sv.grassi, p100: p.grassi, ref: DV_AU.grassi },
            { label: '— saturated', svVal: sv.saturi, p100: p.saturi, ref: DV_AU.saturi },
            { label: 'Protein', svVal: sv.proteine, p100: p.proteine, ref: DV_AU.proteine, isOptional: false },
            { label: 'Fat — total', svVal: sv.grassi, p100: p.grassi, ref: DV_AU.grassi, isOptional: false },
            { label: '— saturated', svVal: sv.saturi, p100: p.saturi, ref: DV_AU.saturi, isOptional: false },
            { label: 'Carbohydrate — total', svVal: sv.carboidrati, p100: p.carboidrati, ref: DV_AU.carboidrati, isOptional: false },
            { label: '— sugars', svVal: sv.zuccheri, p100: p.zuccheri, ref: DV_AU.zuccheri, isOptional: false },
            { label: 'Dietary Fibre', svVal: sv.fibre, p100: p.fibre, ref: DV_AU.fibre },
            { label: 'Sodium', svVal: sv.sodio_mg, p100: p.sodio_mg, ref: DV_AU.sodio_mg },
        ].forEach(r => {
            const unit = r.label.includes('Sodium') ? 'mg' : 'g';
            const fmtSv = unit === 'mg' ? rAU_mg(r.svVal) : rAU_g1(r.svVal);
            const fmt100 = unit === 'mg' ? rAU_mg(r.p100) : rAU_g1(r.p100);
            auRows.push({ label: r.label, gSv: `${fmtSv} ${unit}`, g100: `${fmt100} ${unit}`, di: diPct(r.svVal, r.ref) });
        });
    }

    return (
        <div style={{ background: 'white' }}>
            {!full && (
                <>
                    <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Australia)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type="checkbox" checked={showDI} onChange={e => setShowDI(e.target.checked)} />
                            Show % Daily Intake
                        </label>
                    </div>
                </>
            )}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0 }}>
            <h3 style={{ marginTop: 0 }}>Nutrition Information</h3>
            <div style={{ overflowX: 'auto' }}>
                <table style={TS.table}>
                    <thead>
                        <tr>
                            <th style={TS.th}>Nutrient</th>
                            <th style={TS.thR}>Servings per package: —</th>
                            <th style={TS.thR}>Average Quantity per Serving {svG > 0 ? `(${svG}g)` : ''}</th>
                            {showDI && <th style={TS.thR}>% Daily Intake per Serving†</th>}
                            <th style={TS.thR}>Average Quantity per 100 g</th>
                        </tr>
                    </thead>
                    <tbody>
                        {svG > 0 && sv ? auRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 0 ? { background: '#f8f9fa' } : {}}>
                                <td style={r.label.startsWith('—') ? TS.tdSub : TS.tdB}>{r.label}</td>
                                <td style={TS.tdR}></td>
                                <td style={TS.tdR}>{r.isCal ? `${r.svKj} kJ (${r.svKcal} Cal)` : r.gSv}</td>
                                {showDI && <td style={TS.tdR}>{r.di}</td>}
                                <td style={TS.tdR}>{r.g100}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan={4} style={{ ...TS.td, color: '#888' }}>Inserire il valore serving size sopra per calcolare le quantità per porzione.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {showDI && <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>† % Daily Intake based on an average adult diet of 8700 kJ. Your daily intake may be higher or lower depending on your energy needs.</p>}
            </div>
        </div>
    );
}

// ─── TabArabi ────────────────────────────────────────────────────────────────
function TabArabi({ p, arabi, full }: { p: CalcResult; arabi: ServingSizesNation; full?: boolean }) {
    const svG = arabi.serving || 0;
    const sv = svG > 0 ? scaleResult(p, svG) : null;
    const hasExtra = full && sv;

    interface ARow { label: string; p100: string; pSv?: string; dv: string; indent?: boolean; bold?: boolean; }

    const arRows: ARow[] = [
        { label: 'Calories / السعرات الحرارية', bold: true, p100: rArabi_energy(p.energyKcal), pSv: sv ? rArabi_energy(sv.energyKcal) : undefined, dv: `${Math.round(p.energyKcal / AR_ARABI.energyKcal * 100)}%` },
        { label: 'Total Fat / إجمالي الدهون', bold: true, p100: `${rArabi_g(p.grassi)} g`, pSv: sv ? `${rArabi_g(sv.grassi)} g` : undefined, dv: `${Math.round(p.grassi / AR_ARABI.grassi * 100)}%` },
        { label: 'Saturated Fat / الدهون المشبعة', indent: true, p100: `${rArabi_g(p.saturi)} g`, pSv: sv ? `${rArabi_g(sv.saturi)} g` : undefined, dv: `${Math.round(p.saturi / AR_ARABI.saturi * 100)}%` },
        { label: 'Trans Fat / الدهون المتحولة', indent: true, p100: `${rArabi_g(p.trans)} g`, pSv: sv ? `${rArabi_g(sv.trans)} g` : undefined, dv: '—' },
        { label: 'Cholesterol / الكوليسترول', bold: true, p100: `${rArabi_mg(p.colesterolo)} mg`, pSv: sv ? `${rArabi_mg(sv.colesterolo)} mg` : undefined, dv: `${Math.round(p.colesterolo / 300 * 100)}%` },
        { label: 'Sodium / الصوديوم', bold: true, p100: `${rArabi_mg(p.sodio_mg)} mg`, pSv: sv ? `${rArabi_mg(sv.sodio_mg)} mg` : undefined, dv: `${Math.round(p.sodio_mg / AR_ARABI.sodio_mg * 100)}%` },
        { label: 'Total Carbohydrate / إجمالي الكربوهيدرات', bold: true, p100: `${rArabi_g(p.carboidratiTot)} g`, pSv: sv ? `${rArabi_g(sv.carboidratiTot)} g` : undefined, dv: `${Math.round(p.carboidratiTot / AR_ARABI.carboidrati * 100)}%` },
        { label: 'Dietary Fiber / الألياف الغذائية', indent: true, p100: `${rArabi_g(p.fibre)} g`, pSv: sv ? `${rArabi_g(sv.fibre)} g` : undefined, dv: `${Math.round(p.fibre / AR_ARABI.fibre * 100)}%` },
        { label: 'Total Sugars / إجمالي السكريات', indent: true, p100: `${rArabi_g(p.zuccheri)} g`, pSv: sv ? `${rArabi_g(sv.zuccheri)} g` : undefined, dv: '—' },
        { label: 'Includes Added Sugars / سكريات مضافة', indent: true, p100: `${rArabi_g(p.zuccheri_agg)} g`, pSv: sv ? `${rArabi_g(sv.zuccheri_agg)} g` : undefined, dv: `${Math.round(p.zuccheri_agg / 50 * 100)}%` },
        { label: 'Protein / البروتين', bold: true, p100: `${rArabi_g(p.proteine)} g`, pSv: sv ? `${rArabi_g(sv.proteine)} g` : undefined, dv: '—' },
    ];

    return (
        <div style={{ background: 'white' }}>
            {!full && <h3 style={{ marginTop: 0, fontSize: 16, color: 'var(--color-navy)', borderBottom: '2px solid var(--color-orange)', paddingBottom: 8, marginBottom: 16 }}>Etichetta Nutrizionale (Gulf/Arabi)</h3>}
            <div data-table-export style={{ background: 'white', padding: 12, borderRadius: 0 }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ ...TS.table, border: full ? '1px solid #000' : 'none' }}>
                    <thead>
                        <tr style={{ background: 'var(--color-navy)', color: 'white' }}>
                            <th style={{ ...TS.th, background: 'inherit' }}>Nutrients / العناصر الغذائية</th>
                            <th style={{ ...TS.thR, background: 'inherit' }}>per 100 g</th>
                            {hasExtra && sv && <th style={{ ...TS.thR, background: 'inherit' }}>Serving ({svG}g)</th>}
                            <th style={{ ...TS.thR, background: 'inherit' }}>%DV*</th>
                        </tr>
                    </thead>
                    <tbody>
                        {arRows.map((r, i) => (
                            <tr key={i} style={i % 2 === 0 ? { background: '#f8f9fa' } : {}}>
                                <td style={r.indent ? TS.tdSub : r.bold ? TS.tdB : TS.td}>{r.label}</td>
                                <td style={r.bold ? TS.tdBR : TS.tdR}>{r.p100}</td>
                                {hasExtra && sv && <td style={TS.tdR}>{r.pSv || '—'}</td>}
                                <td style={TS.tdR}>{r.dv}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p style={{ fontSize: 10, color: '#666', marginTop: 6 }}>* % DV based on a 2,000 calorie diet.</p>
            </div>
        </div>
    );
}
