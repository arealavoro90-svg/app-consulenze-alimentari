/**
 * Template per categoria merceologica — pre-compilano i campi più comuni
 * dell'etichetta in modo da ridurre il tempo di avvio per l'utente.
 *
 * audience:
 *   'base'     → visibile a tutti (PMI, clienti standard)
 *   'advanced' → visibile solo ad admin / futura flag tecnologo
 *
 * Per aggiungere una nuova categoria: aggiungi un oggetto all'array PRODUCT_TEMPLATES.
 * Nessun altro file da modificare.
 */
import type { LabelData } from '../calculators/EtichetteCalc/EtichetteCalc';

export interface ProductTemplate {
    id: string;
    label: string;
    description: string;
    audience: 'base' | 'advanced';
    icon: string;
    fields: Partial<LabelData>;
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
    {
        id: 'pasta_fresca',
        label: 'Pasta fresca',
        description: 'Tagliatelle, lasagne, ravioli, gnocchi',
        audience: 'base',
        icon: '🍝',
        fields: {
            legalDenomination: 'PASTA FRESCA ALL\'UOVO',
            ingredients: 'FARINA di GRANO TENERO tipo "00", UOVA fresche pastorizzate 20%.',
            allergens: 'GLUTINE, UOVA.',
            includeAllergenNote: true,
            storageConditions: 'Conservare in frigorifero tra +2°C e +4°C.',
            imballi: [
                { descrizione: 'Vaschetta', codice: 'PP 5', raccolta: 'Plastica' },
                { descrizione: 'Film', codice: 'PP 5', raccolta: 'Plastica' },
            ],
        },
    },
    {
        id: 'conserva_pomodoro',
        label: 'Conserva / Passata',
        description: 'Passata, polpa, pelati, sughi pronti',
        audience: 'base',
        icon: '🍅',
        fields: {
            legalDenomination: 'PASSATA DI POMODORO',
            ingredients: 'Pomodori 100%.',
            allergens: '',
            includeAllergenNote: false,
            storageConditions: 'Conservare in luogo fresco e asciutto. Dopo l\'apertura conservare in frigorifero e consumare entro 3 giorni.',
            imballi: [
                { descrizione: 'Bottiglia in vetro', codice: 'GL 71', raccolta: 'Vetro' },
                { descrizione: 'Tappo in metallo', codice: 'FE 40', raccolta: 'Metallo' },
            ],
        },
    },
    {
        id: 'bevanda_succo',
        label: 'Bevanda / Succo',
        description: 'Succhi di frutta, nettari, bevande vegetali',
        audience: 'base',
        icon: '🥤',
        fields: {
            legalDenomination: 'SUCCO DI FRUTTA',
            ingredients: 'Succo di mela da concentrato 50%, acqua.',
            allergens: '',
            includeAllergenNote: false,
            storageConditions: 'Conservare in luogo fresco e asciutto. Dopo l\'apertura conservare in frigorifero e consumare entro 3 giorni.',
            imballi: [
                { descrizione: 'Bottiglia PET', codice: 'PET 1', raccolta: 'Plastica' },
                { descrizione: 'Tappo', codice: 'HDPE 2', raccolta: 'Plastica' },
            ],
        },
    },
    {
        id: 'surgelato_verdure',
        label: 'Surgelato',
        description: 'Verdure, piatti pronti, pesce surgelato',
        audience: 'base',
        icon: '❄️',
        fields: {
            legalDenomination: 'VERDURE SURGELATE',
            ingredients: 'Piselli 100%.',
            allergens: '',
            includeAllergenNote: false,
            storageConditions: 'Conservare a -18°C. Non ricongelare dopo lo scongelamento.',
            consumptionInstructions: 'Cuocere direttamente da surgelato senza scongelare.',
            imballi: [
                { descrizione: 'Sacchetto', codice: 'PP 5', raccolta: 'Plastica' },
                { descrizione: 'Scatola in cartone', codice: 'PAP 21', raccolta: 'Carta e cartone' },
            ],
        },
    },
    {
        id: 'latticino_yogurt',
        label: 'Latticino / Yogurt',
        description: 'Yogurt, formaggi freschi, ricotta, panna',
        audience: 'base',
        icon: '🥛',
        fields: {
            legalDenomination: 'YOGURT INTERO',
            ingredients: 'LATTE intero pastorizzato, fermenti lattici vivi.',
            allergens: 'LATTE.',
            includeAllergenNote: true,
            storageConditions: 'Conservare in frigorifero tra +2°C e +6°C.',
            imballi: [
                { descrizione: 'Vasetto in plastica', codice: 'PS 6', raccolta: 'Plastica' },
                { descrizione: 'Coperchio in alluminio', codice: 'ALU 41', raccolta: 'Metallo' },
            ],
        },
    },
    {
        id: 'snack_crackers',
        label: 'Snack / Cracker',
        description: 'Biscotti, crackers, grissini, torte da forno',
        audience: 'advanced',
        icon: '🍪',
        fields: {
            legalDenomination: 'CRACKER SALATI',
            ingredients: 'FARINA di GRANO TENERO tipo "0" 60%, olio di girasole, sale, agenti lievitanti (bicarbonato di sodio, difosfato disodico), LATTE scremato in polvere, malto d\'ORZO.',
            allergens: 'GLUTINE, LATTE, ORZO.',
            includeAllergenNote: true,
            storageConditions: 'Conservare in luogo fresco e asciutto, lontano da fonti di calore.',
            imballi: [
                { descrizione: 'Confezione in plastica', codice: 'PP 5', raccolta: 'Plastica' },
                { descrizione: 'Scatola in cartone', codice: 'PAP 21', raccolta: 'Carta e cartone' },
            ],
        },
    },
    {
        id: 'salume_insaccato',
        label: 'Salume / Insaccato',
        description: 'Prosciutto, mortadella, salami, bresaola',
        audience: 'advanced',
        icon: '🥩',
        fields: {
            legalDenomination: 'MORTADELLA',
            ingredients: 'Carne di suino 65%, grasso di suino, sale, spezie, aromi, destrosio, antiossidante: ascorbato di sodio (E301); conservante: nitrito di sodio (E250).',
            allergens: '',
            includeAllergenNote: false,
            otherWarnings: 'Contiene nitriti.',
            storageConditions: 'Conservare in frigorifero tra 0°C e +4°C.',
            imballi: [
                { descrizione: 'Vaschetta in plastica', codice: 'PET 1', raccolta: 'Plastica' },
                { descrizione: 'Film', codice: 'PP 5', raccolta: 'Plastica' },
            ],
        },
    },
];
