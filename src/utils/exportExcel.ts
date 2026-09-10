/**
 * Esporta la tabella nutrizionale (per 100g + eventuale porzione) in formato .xlsx.
 * Usa dynamic import per non caricare xlsx nel bundle principale.
 */
import type { CalcResult } from '../engines/nutrizionaleCalcEngine';

// VNR EU Reg 1169/2011 Allegato XIII — µg/mg/g come da tabella ufficiale
const VNR: Partial<Record<keyof CalcResult, { value: number; unit: string }>> = {
    energyKcal: { value: 8400,  unit: 'kcal' },  // kJ: 8400 kcal / 2000 kcal = stessa riga
    energyKj:   { value: 35000, unit: 'kJ'   },
    grassi:     { value: 70,    unit: 'g'     },
    saturi:     { value: 20,    unit: 'g'     },
    carboidrati:{ value: 260,   unit: 'g'     },
    zuccheri:   { value: 90,    unit: 'g'     },
    fibre:      { value: 25,    unit: 'g'     },
    proteine:   { value: 50,    unit: 'g'     },
    sale:       { value: 6,     unit: 'g'     },
    potassio:   { value: 2000,  unit: 'mg'    },
    calcio:     { value: 800,   unit: 'mg'    },
    fosforo:    { value: 700,   unit: 'mg'    },
    magnesio:   { value: 375,   unit: 'mg'    },
    ferro:      { value: 14,    unit: 'mg'    },
    zinco:      { value: 10,    unit: 'mg'    },
    rame:       { value: 1,     unit: 'mg'    },
    manganese:  { value: 2,     unit: 'mg'    },
    selenio:    { value: 55,    unit: 'µg'    },
    iodio:      { value: 150,   unit: 'µg'    },
    vitA_eq:    { value: 800,   unit: 'µg'    },
    vitD:       { value: 5,     unit: 'µg'    },
    vitE:       { value: 12,    unit: 'mg'    },
    vitC:       { value: 80,    unit: 'mg'    },
    vitB1:      { value: 1.1,   unit: 'mg'    },
    vitB2:      { value: 1.4,   unit: 'mg'    },
    vitB3:      { value: 16,    unit: 'mg'    },
    vitB6:      { value: 1.4,   unit: 'mg'    },
    vitB9:      { value: 200,   unit: 'µg'    },
    vitB12:     { value: 2.5,   unit: 'µg'    },
    vitK:       { value: 75,    unit: 'µg'    },
    vitB5:      { value: 6,     unit: 'mg'    },
};

interface NutrientRow {
    label: string;
    key: keyof CalcResult;
    decimals: number;
    unit: string;
}

const ROWS: NutrientRow[] = [
    { label: 'Energia (kcal)',           key: 'energyKcal',  decimals: 0, unit: 'kcal' },
    { label: 'Energia (kJ)',             key: 'energyKj',    decimals: 0, unit: 'kJ'   },
    { label: 'Grassi',                   key: 'grassi',      decimals: 1, unit: 'g'    },
    { label: '  di cui acidi grassi saturi', key: 'saturi',  decimals: 1, unit: 'g'    },
    { label: '  di cui monoinsaturi',    key: 'monoins',     decimals: 1, unit: 'g'    },
    { label: '  di cui polinsaturi',     key: 'polins',      decimals: 1, unit: 'g'    },
    { label: 'Carboidrati',              key: 'carboidrati', decimals: 1, unit: 'g'    },
    { label: '  di cui zuccheri',        key: 'zuccheri',    decimals: 1, unit: 'g'    },
    { label: '  di cui polioli',         key: 'polioli',     decimals: 1, unit: 'g'    },
    { label: '  di cui amido',           key: 'amido',       decimals: 1, unit: 'g'    },
    { label: 'Fibre alimentari',         key: 'fibre',       decimals: 1, unit: 'g'    },
    { label: 'Proteine',                 key: 'proteine',    decimals: 1, unit: 'g'    },
    { label: 'Sale',                     key: 'sale',        decimals: 2, unit: 'g'    },
    { label: 'Potassio',                 key: 'potassio',    decimals: 0, unit: 'mg'   },
    { label: 'Calcio',                   key: 'calcio',      decimals: 0, unit: 'mg'   },
    { label: 'Fosforo',                  key: 'fosforo',     decimals: 0, unit: 'mg'   },
    { label: 'Magnesio',                 key: 'magnesio',    decimals: 0, unit: 'mg'   },
    { label: 'Ferro',                    key: 'ferro',       decimals: 1, unit: 'mg'   },
    { label: 'Zinco',                    key: 'zinco',       decimals: 1, unit: 'mg'   },
    { label: 'Rame',                     key: 'rame',        decimals: 2, unit: 'mg'   },
    { label: 'Manganese',                key: 'manganese',   decimals: 1, unit: 'mg'   },
    { label: 'Selenio',                  key: 'selenio',     decimals: 0, unit: 'µg'   },
    { label: 'Iodio',                    key: 'iodio',       decimals: 0, unit: 'µg'   },
    { label: 'Vitamina A',               key: 'vitA_eq',     decimals: 0, unit: 'µg'   },
    { label: 'Vitamina D',               key: 'vitD',        decimals: 1, unit: 'µg'   },
    { label: 'Vitamina E',               key: 'vitE',        decimals: 1, unit: 'mg'   },
    { label: 'Vitamina C',               key: 'vitC',        decimals: 0, unit: 'mg'   },
    { label: 'Vitamina B1 (Tiamina)',    key: 'vitB1',       decimals: 2, unit: 'mg'   },
    { label: 'Vitamina B2 (Riboflavina)',key: 'vitB2',       decimals: 2, unit: 'mg'   },
    { label: 'Vitamina B3 (Niacina)',    key: 'vitB3',       decimals: 1, unit: 'mg'   },
    { label: 'Vitamina B5 (Ac. pantotenico)', key: 'vitB5', decimals: 1, unit: 'mg'   },
    { label: 'Vitamina B6',             key: 'vitB6',       decimals: 2, unit: 'mg'   },
    { label: 'Vitamina B9 (Folati)',     key: 'vitB9',       decimals: 0, unit: 'µg'   },
    { label: 'Vitamina B12',            key: 'vitB12',      decimals: 1, unit: 'µg'   },
    { label: 'Vitamina K',              key: 'vitK',        decimals: 1, unit: 'µg'   },
];

function fmt(value: number, decimals: number): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
}

function vnrPct(key: keyof CalcResult, value: number): string {
    const ref = VNR[key];
    if (!ref || ref.value === 0) return '';
    return (value / ref.value * 100).toFixed(0) + '%';
}

export async function exportNutrizionaleExcel(
    result: CalcResult,
    productName: string,
    servingG?: number,
): Promise<void> {
    const XLSX = await import('xlsx');

    const hasServing = servingG != null && servingG > 0;

    // Header row
    const header = hasServing
        ? ['Nutriente', 'Unità', 'Per 100 g', `Per porzione (${servingG} g)`, '%VNR (100 g)']
        : ['Nutriente', 'Unità', 'Per 100 g', '%VNR'];

    const data: (string | number)[][] = [header];

    for (const row of ROWS) {
        const v100 = result[row.key] as number;
        const v100fmt = fmt(v100, row.decimals);
        const pct = vnrPct(row.key, v100);

        if (hasServing && servingG != null) {
            const vServ = fmt(v100 * servingG / 100, row.decimals);
            data.push([row.label, row.unit, v100fmt, vServ, pct]);
        } else {
            data.push([row.label, row.unit, v100fmt, pct]);
        }
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Larghezze colonne
    ws['!cols'] = hasServing
        ? [{ wch: 32 }, { wch: 7 }, { wch: 14 }, { wch: 18 }, { wch: 12 }]
        : [{ wch: 32 }, { wch: 7 }, { wch: 14 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Valori Nutrizionali');

    const safeName = productName.replace(/[/\\?%*:|"<>]/g, '_').trim() || 'prodotto';
    XLSX.writeFile(wb, `${safeName}_nutrizionale.xlsx`);
}
