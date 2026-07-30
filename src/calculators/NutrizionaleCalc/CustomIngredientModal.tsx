import React, { useState } from 'react';
import { ChevronDown, ChevronRight, X, AlertTriangle, Save } from 'lucide-react';
import { InfoTooltip } from './NutrizionaleCalc';
import { isValidDBIngredient } from '../../utils/validation';
import { type DBIngredient, energyFromMacros } from '../../engines/nutrizionaleCalcEngine';

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

// Stili e componente NF a livello di modulo (evita ricreazione ad ogni render)
const _iS: React.CSSProperties = { width: '100%', padding: '5px 8px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 13, boxSizing: 'border-box' };
const _iSRo: React.CSSProperties = { ..._iS, background: 'var(--color-bg-secondary,#f0f4ff)', color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'default' };
const _iSErr: React.CSSProperties = { ..._iS, border: '1.5px solid #e53e3e' };
const _lS: React.CSSProperties = { fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 3, color: 'var(--color-text-muted)' };
const _ClearErrorsCtx = React.createContext<() => void>(() => {});

const NF = React.memo(function NF({ label, value, onChange, unit = 'g/100g', ro = false, err = false, tooltip }: {
    label: string; value: string; onChange?: (v: string) => void;
    unit?: string; ro?: boolean; err?: boolean; tooltip?: string;
}) {
    const clearErrors = React.useContext(_ClearErrorsCtx);
    return (
        <div>
            <label style={{ ..._lS, display: 'flex', alignItems: 'center', gap: 2 }}>
                <span>{label} <span style={{ fontWeight: 400 }}>{unit}</span></span>
                {tooltip && <InfoTooltip text={tooltip} />}
            </label>
            <input
                type="text"
                inputMode="decimal"
                style={ro ? _iSRo : err ? _iSErr : _iS}
                value={value}
                onChange={e => {
                    if (ro) return;
                    const v = e.target.value;
                    if (v === '' || v === '-' || /^-?\d*[.,]?\d*$/.test(v)) {
                        onChange?.(v.replace(',', '.'));
                        clearErrors();
                    }
                }}
                onFocus={e => { if (!ro) e.target.select(); }}
                readOnly={ro}
            />
        </div>
    );
});

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

export function CustomIngredientModal({ onClose, onSave, initialIngredient, originalNome }: {
    onClose: () => void;
    onSave: (ing: DBIngredient) => void;
    initialIngredient?: DBIngredient;
    originalNome?: string; // nome dell'ingrediente originale da rimuovere in caso di modifica
}) {
    const s = (v: number | undefined) => (v != null && v !== 0) ? String(v) : '';
    // Info base
    const [nome, setNome] = useState(initialIngredient?.nome ?? '');
    const [categoria, setCategoria] = useState('ingrediente');
    const [eurKg, setEurKg] = useState(s(initialIngredient?.eur_kg) || '0');
    const [fonteTipo, setFonteTipo] = useState<'database' | 'schede' | ''>(() => {
        if (!initialIngredient?.fonte_dati) return '';
        return initialIngredient.fonte_link ? 'database' : 'schede';
    });
    const [fonteDb, setFonteDb] = useState(initialIngredient?.fonte_dati ?? '');
    // Obbligatori
    const [grassi, setGrassi] = useState(s(initialIngredient?.grassi));
    const [saturi, setSaturi] = useState(s(initialIngredient?.saturi));
    const [carboidrati, setCarboidrati] = useState(s(initialIngredient?.carboidrati));
    const [zuccheri, setZuccheri] = useState(s(initialIngredient?.zuccheri));
    const [proteine, setProteine] = useState(s(initialIngredient?.proteine));
    const [sale, setSale] = useState(() => {
        if (!initialIngredient) return '';
        const saleG = Math.round((initialIngredient.sodio_mg / 400) * 10000) / 10000;
        return saleG > 0 ? String(saleG) : '';
    });
    // Facoltativi
    const [monoins, setMonoins] = useState(s(initialIngredient?.monoins));
    const [polins, setPolins] = useState(s(initialIngredient?.polins));
    const [eritritoloS, setEritritolo] = useState(s(initialIngredient?.eritritolo));
    const [acidoOrganico, setAcidoOrganico] = useState(s(initialIngredient?.acidi_organici));
    // Obbligatori in taluni casi — macronutrienti
    const [trans, setTrans] = useState(s(initialIngredient?.trans));
    const [zuccheriAgg, setZuccheriAgg] = useState(s(initialIngredient?.zuccheri_agg));
    const [polioliS, setPolioli] = useState(s(initialIngredient?.polioli));
    const [glicerolo, setGlicerolo] = useState(s(initialIngredient?.glicerolo));
    const [alcolS, setAlcol] = useState(() => {
        if (!initialIngredient?.alcol) return '';
        return String(Math.round((initialIngredient.alcol / 0.79) * 1000) / 1000);
    });
    const [fibre, setFibre] = useState(s(initialIngredient?.fibre));
    // Micronutrienti obbligatori in taluni casi
    const [colesterolo, setColesterolo] = useState(s(initialIngredient?.colesterolo));
    const [potassio, setPotassio] = useState(s(initialIngredient?.potassio));
    const [calcio, setCalcio] = useState(s(initialIngredient?.calcio));
    const [ferro, setFerro] = useState(s(initialIngredient?.ferro));
    // Micronutrienti facoltativi — sali minerali
    const [fosforo, setFosforo] = useState(s(initialIngredient?.fosforo));
    const [magnesio, setMagnesio] = useState(s(initialIngredient?.magnesio));
    const [iodio, setIodio] = useState(s(initialIngredient?.iodio));
    const [zinco, setZinco] = useState(s(initialIngredient?.zinco));
    const [rame, setRame] = useState(s(initialIngredient?.rame));
    const [manganese, setManganese] = useState(s(initialIngredient?.manganese));
    const [selenio, setSelenio] = useState(s(initialIngredient?.selenio));
    // Vitamine liposolubili
    const [betaCarotene, setBetaCarotene] = useState(s(initialIngredient?.betaCarotene));
    const [retinolo, setRetinolo] = useState(s(initialIngredient?.retinolo));
    const [vitD, setVitD] = useState(s(initialIngredient?.vitD));
    const [vitE, setVitE] = useState(s(initialIngredient?.vitE));
    const [vitK, setVitK] = useState(s(initialIngredient?.vitK));
    // Vitamine idrosolubili
    const [vitC, setVitC] = useState(s(initialIngredient?.vitC));
    const [vitB1, setVitB1] = useState(s(initialIngredient?.vitB1));
    const [vitB2, setVitB2] = useState(s(initialIngredient?.vitB2));
    const [vitB3, setVitB3] = useState(s(initialIngredient?.vitB3));
    const [vitB5, setVitB5] = useState(s(initialIngredient?.vitB5));
    const [vitB6, setVitB6] = useState(s(initialIngredient?.vitB6));
    const [vitB9, setVitB9] = useState(s(initialIngredient?.vitB9));
    const [vitB12, setVitB12] = useState(s(initialIngredient?.vitB12));
    // Validazione
    const [errors, setErrors] = useState<string[]>([]);
    // Allergenici presenti e tracce
    const [allergens, setAllergens] = useState<Record<string, boolean>>(() => {
        if (!initialIngredient) return {};
        return Object.fromEntries(CI_ALLERGEN_KEYS.map(k => [k, !!initialIngredient[k as keyof DBIngredient]]));
    });
    const [crossAllergens, setCrossAllergens] = useState<Record<string, boolean>>(() => {
        if (!initialIngredient) return {};
        return Object.fromEntries(CI_CROSS_KEYS.map(k => [k, !!initialIngredient[k as keyof DBIngredient]]));
    });

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
    const { kcal: kcalCalc, kj: kjCalc } = energyFromMacros({
        grassi: grassiN, carboidrati: carbN, polioli: polioliN, eritritolo: eritritoloN,
        fibre: fibreN, acidiOrganici: acidoOrgN, proteine: protN, alcolG,
    });

    const waterError = acquaCalc < 0 || residuoSecco < 0;

    // Vitamina A calcolata
    const betaCaroteneN = parseFloat(betaCarotene) || 0;  // μg/100g
    const retinolN      = parseFloat(retinolo)     || 0;  // μg/100g
    const vitA_eq       = Math.round((betaCaroteneN / 6 + retinolN) * 1000) / 1000;  // μg RE/100g
    const vitA_iu       = Math.round(vitA_eq * 3.333333333 * 10) / 10;           // UI/100g

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
        // Allergenici presenti
        CI_ALLERGEN_KEYS.forEach(k => { if (allergens[k]) (ing as unknown as Record<string, unknown>)[k] = 'SI'; });
        // Tracce (contaminazione crociata)
        CI_CROSS_KEYS.forEach(k => { if (crossAllergens[k]) (ing as unknown as Record<string, unknown>)[k] = 'SI'; });
        try {
            const rawEx = JSON.parse(localStorage.getItem('custom_ingredients') || '[]');
            let ex = (Array.isArray(rawEx) ? (rawEx as unknown[]).filter(isValidDBIngredient) : []) as DBIngredient[];
            // Se stiamo modificando un ingrediente esistente, rimuoviamo il vecchio
            if (originalNome) {
                ex = ex.filter(i => i.nome !== originalNome);
            }
            localStorage.setItem('custom_ingredients', JSON.stringify([...ex, ing]));
        } catch { /* storage pieno o non disponibile */ }
        onSave(ing);
        onClose();
    };

    // Stili locali (non ricreano NF — NF è fuori dal componente)
    const iS: React.CSSProperties = _iS;
    const lS: React.CSSProperties = _lS;
    const secS: React.CSSProperties = { marginBottom: 14, padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' };
    const secT = (color: string): React.CSSProperties => ({ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color, marginBottom: 10 });
    const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 };
    const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 };

    // Accordion state per sezioni collassabili
    const [openSec, setOpenSec] = useState({ facoltativi: false, condizionali: false, micro: false, allergenici: false });
    const toggleSec = (k: keyof typeof openSec) => setOpenSec(prev => ({ ...prev, [k]: !prev[k] }));
    const AccHead = ({ label, sKey, color = '#718096' }: { label: string; sKey: keyof typeof openSec; color?: string }) => (
        <button type="button" onClick={() => toggleSec(sKey)} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            {openSec[sKey] ? <ChevronDown size={12} style={{ flexShrink: 0, color }} /> : <ChevronRight size={12} style={{ flexShrink: 0, color }} />}
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color }}>{label}</span>
        </button>
    );

    const clearErrors = React.useCallback(() => setErrors([]), []);

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
        <_ClearErrorsCtx.Provider value={clearErrors}>
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div className="card" style={{ width: '100%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0 }}>{initialIngredient ? 'Modifica ingrediente' : 'Aggiungi ingrediente al Database'}</h3>
                    <button className="btn btn-outline" onClick={onClose} style={{ display: 'flex', alignItems: 'center' }}><X size={14} /></button>
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
                        {errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#c53030', display: 'flex', alignItems: 'center', gap: 4 }}><AlertTriangle size={11} style={{ flexShrink: 0 }} />{e}</div>)}
                    </div>
                )}

                {/* Info base */}
                <div style={secS}>
                    <div style={secT('#333')}>Informazioni base</div>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ ...lS, color: '#333' }} htmlFor="custom-ing-nome">Nome ingrediente <span style={{ color: '#c53030' }}>*</span></label>
                        <input id="custom-ing-nome" style={!nome.trim() && errors.length > 0 ? _iSErr : _iS} value={nome}
                            onChange={e => { setNome(e.target.value); clearErrors(); }}
                            placeholder="es. salsa di soia artigianale" />
                    </div>
                    <div style={grid2}>
                        <div>
                            <label style={lS} htmlFor="custom-ing-categoria">Categoria</label>
                            <select id="custom-ing-categoria" style={iS} value={categoria} onChange={e => setCategoria(e.target.value)}>
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
                        <NF
                            label="* Fibre alimentari (altamente consigliato, anche se non obbligatorio in base al Reg. UE 1169/2011)"
                            value={fibre} onChange={v => { setFibre(v); clearErrors(); }}
                        />
                        <NF label="* Proteine" value={proteine} onChange={setProteine} err={!proteine && errors.length > 0} />
                        <NF label="* Sale" value={sale} onChange={setSale} err={!sale && errors.length > 0} />
                    </div>
                </div>

                {/* 2 — Valori di macronutrienti facoltativi (collassabile) */}
                <div style={secS}>
                    <AccHead label="○ Valori di macronutrienti facoltativi" sKey="facoltativi" />
                    {openSec.facoltativi && (
                        <div style={{ marginTop: 10, ...grid3 }}>
                            <NF label="○ Acidi grassi monoinsaturi" value={monoins} onChange={setMonoins} />
                            <NF label="○ Acidi grassi polinsaturi" value={polins} onChange={setPolins} />
                            <NF label="○ Eritritolo" value={eritritoloS} onChange={setEritritolo}
                                tooltip="Poliolo con fattore energetico 0 kcal/g (EU Reg 1169/2011). Non contribuisce al calcolo dell'energia." />
                            <NF label="○ Acidi organici" value={acidoOrganico} onChange={setAcidoOrganico}
                                tooltip="Es. acido acetico (aceto), acido lattico (yogurt). Fattore energetico: 3 kcal/g — 13 kJ/g (EU Reg 1169/2011)." />
                        </div>
                    )}
                </div>

                {/* 3 — Valori di macronutrienti obbligatori in taluni casi (collassabile) */}
                <div style={secS}>
                    <AccHead label="△ Valori obbligatori in taluni casi (USA/CA/AU/Arabi)" sKey="condizionali" color="#b7791f" />
                    {openSec.condizionali && (
                        <div style={{ marginTop: 10, ...grid3 }}>
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
                    )}
                </div>

                {/* 5 — Valori di micronutrienti (collassabile) */}
                <div style={secS}>
                    <AccHead label="Micronutrienti (nessuno obbligatorio in assoluto)" sKey="micro" color="#333" />
                    {openSec.micro && (<>

                    {/* 5a — Micronutrienti obbligatori in taluni casi */}
                    <div style={{ marginBottom: 14, marginTop: 10 }}>
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
                                tooltip="Precursore della vitamina A. Usato per calcolare Vitamina A (RE) = β-carotene/6 + retinolo." />
                            <NF label="○ Retinolo" value={retinolo} onChange={setRetinolo} unit="μg/100g"
                                tooltip="Forma preformata della vitamina A. Usato per calcolare Vitamina A (RE) = β-carotene/6 + retinolo." />
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
                                tooltip="Vitamina A (retinolo equivalente) = β-carotene/6 + retinolo" />
                            <NF label="◎ Vitamina A (U.I.)" value={String(vitA_iu)} unit="UI/100g" ro
                                tooltip="Vitamina A (Unità Internazionali) = RE × 3,333333333" />
                        </div>
                    </div>
                    </>)}
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

                {/* 5 — Allergeni (Reg. UE 1169/2011) */}
                <div style={secS}>
                    <AccHead label="Allergeni (Reg. UE 1169/2011)" sKey="allergenici" color="#c53030" />
                    {openSec.allergenici && (<>
                        <div style={{ marginTop: 10, marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#c53030', marginBottom: 6 }}>Contiene:</div>
                            <AllergenRow keys={CI_ALLERGEN_KEYS} labels={CI_ALLERGEN_LABELS} state={allergens} setState={setAllergens} />
                        </div>
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#e65100', marginBottom: 6 }}>Può contenere tracce di (contaminazione crociata):</div>
                            <AllergenRow keys={CI_CROSS_KEYS} labels={CI_CROSS_LABELS} state={crossAllergens} setState={setCrossAllergens} />
                        </div>
                    </>)}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                    <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Save size={14} /> Salva nel database personale</button>
                    <button className="btn btn-outline" onClick={onClose}>Annulla</button>
                </div>
            </div>
        </div>
        </_ClearErrorsCtx.Provider>
    );
}
