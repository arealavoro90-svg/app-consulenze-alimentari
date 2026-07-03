import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import type {
    MobileNutForm, DBIngredient, MobileComponent, RecipeRow, AdditiveRow,
} from '../NutrizionaleCalcMobile';

// ─── Additivi: categorie e specifici (allineati con desktop) ──────────────────
const ADDITIVI_CATEGORIE = [
    'addensante','agente di rivestimento','agente di trattamento della farina',
    'agente lievitante','antiagglomerante','antiossidante','conservante',
    'correttore di acidità','edulcorante','emulsionante','esaltatore di sapidità',
    'gas per confezionamento','gas propellente','lecitina di girasole bio',
    'lecitina di soia bio','lucidante','rassodante','sbiancante','schiumogeno',
    'stabilizzante del colore','stabilizzatore di schiuma','umettante',
];

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

interface Props {
    form: MobileNutForm;
    onChange: (patch: Partial<MobileNutForm>) => void;
    onGoToTabella: () => void;
    db: DBIngredient[];
    loadingDB: boolean;
    dbError: string | null;
    components: MobileComponent[];
    onAddComponent: () => void;
    onRemoveComponent: (id: string) => void;
    onUpdateComponentName: (id: string, name: string) => void;
    onUpdateComponentPzUV: (id: string, pzUV: number) => void;
    onAddRow: (compId: string, ing: DBIngredient) => void;
    onRemoveRow: (compId: string, rowId: string) => void;
    onUpdateRow: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
    onAddAdditiveRow: (compId: string) => void;
    onRemoveAdditiveRow: (compId: string, rowId: string) => void;
    onUpdateAdditiveRow: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}

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
            const nA = (a.nome || '').trim().toLowerCase();
            const nB = (b.nome || '').trim().toLowerCase();
            if (nA === query && nB !== query) return -1;
            if (nB === query && nA !== query) return 1;
            if (nA.startsWith(query) && !nB.startsWith(query)) return -1;
            if (nB.startsWith(query) && !nA.startsWith(query)) return 1;
            return nA.localeCompare(nB, 'it');
        })
        .slice(0, 30);
}

function nv(v: unknown): number { const x = Number(v); return isNaN(x) ? 0 : x; }

// ─── Modale picker ingredienti ────────────────────────────────────────────────
function IngredientPickerModal({ db, compId, onAdd, onClose }: {
    db: DBIngredient[];
    compId: string;
    onAdd: (compId: string, ing: DBIngredient) => void;
    onClose: () => void;
}) {
    const [q, setQ] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Autofocus con piccolo ritardo per garantire il mount dell'overlay
        const t = setTimeout(() => inputRef.current?.focus(), 80);
        return () => clearTimeout(t);
    }, []);

    // Chiudi con Escape
    useEffect(() => {
        const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', h);
        return () => document.removeEventListener('keydown', h);
    }, [onClose]);

    const results: DBIngredient[] = q.trim().length >= 2
        ? searchDB(q, db)
        : db.slice(0, 30).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'it'));

    return (
        <div
            style={{
                position: 'fixed', inset: 0, zIndex: 1200,
                background: 'rgba(12,19,38,0.55)',
                display: 'flex', flexDirection: 'column',
            }}
            onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Panel */}
            <div style={{
                position: 'absolute', left: 0, right: 0, bottom: 0,
                maxHeight: '85dvh',
                background: 'var(--m-bg)',
                borderRadius: '16px 16px 0 0',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                {/* Handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--m-border)' }} />
                </div>

                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 16px 10px',
                }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)' }}>
                        Aggiungi ingrediente
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--m-text-muted)' }}
                        aria-label="Chiudi"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Barra di ricerca */}
                <div style={{ padding: '0 16px 10px', position: 'relative' }}>
                    <Search size={14} style={{
                        position: 'absolute', left: 28, top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--m-text-muted)', pointerEvents: 'none',
                    }} />
                    <input
                        ref={inputRef}
                        className="m-input"
                        type="text"
                        placeholder="Cerca ingrediente…"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        style={{ paddingLeft: 34, fontSize: 14 }}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                </div>

                {/* Lista */}
                <div style={{ overflowY: 'auto', flex: 1, paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}>
                    {results.length === 0 && q.trim().length >= 2 && (
                        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--m-text-muted)', padding: '20px 16px' }}>
                            Nessun risultato per "{q}"
                        </p>
                    )}
                    {results.map((ing, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => { onAdd(compId, ing); onClose(); }}
                            style={{
                                display: 'block', width: '100%', background: 'transparent',
                                border: 'none', borderBottom: '1px solid var(--m-border-light)',
                                padding: '10px 16px', textAlign: 'left', cursor: 'pointer',
                            }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-text)' }}>
                                {(ing.nome || '').trim()}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--m-text-muted)', marginTop: 2 }}>
                                {Math.round(nv(ing.kcal))} kcal · {nv(ing.grassi).toFixed(1)}g G · {nv(ing.carboidrati).toFixed(1)}g C
                            </div>
                        </button>
                    ))}
                    {q.trim().length < 2 && (
                        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--m-text-faint)', padding: '8px 16px 16px' }}>
                            Digita almeno 2 caratteri per cercare nel database completo
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-component: single recipe row ────────────────────────────────────────
function RecipeRowItem({ row, compId, onRemove, onUpdate }: {
    row: RecipeRow;
    compId: string;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
}) {
    const [gramsRaw, setGramsRaw] = useState(String(row.grams));
    const [resaRaw, setResaRaw] = useState(String(row.resa));
    const [eurRaw, setEurRaw] = useState(String(row.eurKg));
    const [expanded, setExpanded] = useState(false);

    const handleGrams = (v: string) => {
        setGramsRaw(v);
        const num = parseFloat(v);
        if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { grams: num });
    };
    const handleResa = (v: string) => {
        setResaRaw(v);
        const num = parseFloat(v);
        if (!isNaN(num) && num >= 0 && num <= 100) onUpdate(compId, row.id, { resa: num });
    };
    const handleEur = (v: string) => {
        setEurRaw(v);
        const num = parseFloat(v);
        if (!isNaN(num) && num >= 0) onUpdate(compId, row.id, { eurKg: num });
    };

    return (
        <div className="m-ing-row" style={{ marginBottom: 5 }}>
            {/* Main row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px' }}>
                <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--m-text-muted)', flexShrink: 0 }}
                    aria-label="Espandi dettagli"
                >
                    {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <div className="m-ing-row__name">
                    <div className="m-ing-row__title">
                        {(row.ing.nome || '').trim()}
                    </div>
                    <div className="m-ing-row__sub">
                        {Math.round(nv(row.ing.kcal))} kcal/100g
                    </div>
                </div>
                <input
                    className="m-input m-input--num m-ing-row__input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={gramsRaw}
                    onChange={e => handleGrams(e.target.value)}
                    style={{ width: 58, textAlign: 'right', flexShrink: 0, fontSize: 13 }}
                    aria-label={`Grammi di ${(row.ing.nome || '').trim()}`}
                />
                <span className="m-ing-row__unit">g</span>
                <button
                    type="button"
                    onClick={() => onRemove(compId, row.id)}
                    className="m-ing-row__remove"
                    aria-label={`Rimuovi ${(row.ing.nome || '').trim()}`}
                >
                    <Trash2 size={13} />
                </button>
            </div>

            {/* Expanded: resa + eurKg */}
            {expanded && (
                <div style={{
                    display: 'flex', gap: 8, padding: '6px 10px 8px 34px',
                    borderTop: '1px solid var(--m-border, #eee)',
                    background: 'rgba(0,0,0,0.02)',
                }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: 'var(--m-text-muted)', display: 'block', marginBottom: 2 }}>
                            Resa %
                        </label>
                        <input
                            className="m-input m-input--num"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="100"
                            step="1"
                            value={resaRaw}
                            onChange={e => handleResa(e.target.value)}
                            style={{ width: '100%', textAlign: 'right', fontSize: 12 }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: 'var(--m-text-muted)', display: 'block', marginBottom: 2 }}>
                            €/kg
                        </label>
                        <input
                            className="m-input m-input--num"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.01"
                            value={eurRaw}
                            onChange={e => handleEur(e.target.value)}
                            style={{ width: '100%', textAlign: 'right', fontSize: 12 }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: additive section ─────────────────────────────────────────
function AdditiveSection({ comp, onAdd, onRemove, onUpdate }: {
    comp: MobileComponent;
    onAdd: (compId: string) => void;
    onRemove: (compId: string, rowId: string) => void;
    onUpdate: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div style={{ marginTop: 8, borderTop: '1px dashed var(--m-border, #ddd)', paddingTop: 6 }}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--m-text-muted)', padding: '2px 0',
                }}
            >
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                Additivi {comp.additiveRows.length > 0 ? `(${comp.additiveRows.length})` : ''}
            </button>

            {open && (
                <div style={{ marginTop: 6 }}>
                    {comp.additiveRows.map(row => (
                        <div key={row.id} style={{
                            display: 'flex', gap: 6, alignItems: 'flex-start',
                            marginBottom: 8,
                        }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {/* Categoria */}
                                <select
                                    className="m-input"
                                    value={row.categoria}
                                    onChange={e => onUpdate(comp.id, row.id, {
                                        categoria: e.target.value,
                                        nomeSpecifico: '',
                                    })}
                                    style={{ fontSize: 12 }}
                                >
                                    <option value="">— Categoria —</option>
                                    {ADDITIVI_CATEGORIE.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                                {/* Nome specifico: select filtrato per categoria */}
                                <select
                                    className="m-input"
                                    value={row.nomeSpecifico}
                                    onChange={e => onUpdate(comp.id, row.id, { nomeSpecifico: e.target.value })}
                                    disabled={!row.categoria}
                                    style={{ fontSize: 12, color: row.nomeSpecifico ? 'var(--m-text)' : 'var(--m-text-muted)' }}
                                >
                                    <option value="">
                                        {row.categoria ? '— Seleziona additivo —' : '— Prima seleziona categoria —'}
                                    </option>
                                    {(ADDITIVI_SPECIFICI[row.categoria] || []).map(n => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                type="button"
                                onClick={() => onRemove(comp.id, row.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 4, marginTop: 2 }}
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => onAdd(comp.id)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            background: 'none', border: '1px dashed var(--m-orange, #ff7e2e)',
                            borderRadius: 6, padding: '4px 10px',
                            fontSize: 12, color: 'var(--m-orange, #ff7e2e)', cursor: 'pointer',
                        }}
                    >
                        <Plus size={12} /> Aggiungi additivo
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Sub-component: single component card ────────────────────────────────────
function ComponentCard({
    comp, index, isOnly, db,
    onRemoveComponent,
    onUpdateName,
    onUpdatePzUV,
    onAddRow,
    onRemoveRow,
    onUpdateRow,
    onAddAdditiveRow,
    onRemoveAdditiveRow,
    onUpdateAdditiveRow,
}: {
    comp: MobileComponent;
    index: number;
    isOnly: boolean;
    db: DBIngredient[];
    onRemoveComponent: (id: string) => void;
    onUpdateName: (id: string, name: string) => void;
    onUpdatePzUV: (id: string, pzUV: number) => void;
    onAddRow: (compId: string, ing: DBIngredient) => void;
    onRemoveRow: (compId: string, rowId: string) => void;
    onUpdateRow: (compId: string, rowId: string, patch: Partial<RecipeRow>) => void;
    onAddAdditiveRow: (compId: string) => void;
    onRemoveAdditiveRow: (compId: string, rowId: string) => void;
    onUpdateAdditiveRow: (compId: string, rowId: string, patch: Partial<AdditiveRow>) => void;
}) {
    const [pzRaw, setPzRaw] = useState(String(comp.pzUV));
    const [pickerOpen, setPickerOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const totalGrams = comp.rows.reduce((s, r) => s + r.grams, 0);

    const handlePzUV = (v: string) => {
        setPzRaw(v);
        const num = parseFloat(v);
        if (!isNaN(num) && num > 0) onUpdatePzUV(comp.id, num);
    };

    return (
        <>
            {pickerOpen && (
                <IngredientPickerModal
                    db={db}
                    compId={comp.id}
                    onAdd={onAddRow}
                    onClose={() => setPickerOpen(false)}
                />
            )}

            <div className="m-comp-card">
                {/* Card header — tappabile per collassare */}
                <div
                    className="m-comp-card__header"
                    style={{
                        borderBottom: collapsed ? 'none' : '1px solid var(--m-border, #e0e0e0)',
                        cursor: 'pointer',
                        userSelect: 'none',
                    }}
                    onClick={() => setCollapsed(c => !c)}
                >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--m-orange, #ff7e2e)', flexShrink: 0 }}>
                        C{index + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {comp.name || `Componente ${index + 1}`}
                        </div>
                        {collapsed && comp.rows.length > 0 && (
                            <div style={{ fontSize: 10, color: 'var(--m-text-muted)' }}>
                                {comp.rows.length} ingredienti · {totalGrams.toFixed(0)} g
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}
                    >
                        {!isOnly && (
                            <button
                                type="button"
                                onClick={() => onRemoveComponent(comp.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', padding: 2 }}
                                aria-label="Rimuovi componente"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <ChevronDown size={14} style={{
                            color: 'var(--m-text-muted)',
                            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                            transition: 'transform 0.2s',
                        }} />
                    </div>
                </div>

                {/* Card body — collassabile */}
                {!collapsed && <div className="m-comp-card__body">
                    {/* Nome e pz/UV — mostrati nel body quando espanso */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <input
                            className="m-input"
                            type="text"
                            placeholder={`Nome componente ${index + 1}`}
                            value={comp.name}
                            onChange={e => onUpdateName(comp.id, e.target.value)}
                            style={{ flex: 1, fontSize: 13, fontWeight: 600 }}
                            autoComplete="off"
                            onClick={e => e.stopPropagation()}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, color: 'var(--m-text-muted)' }}>pz/UV</span>
                            <input
                                className="m-input m-input--num"
                                type="number"
                                inputMode="decimal"
                                min="1"
                                step="1"
                                value={pzRaw}
                                onChange={e => handlePzUV(e.target.value)}
                                style={{ width: 46, textAlign: 'right', fontSize: 12 }}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    {/* Pulsante apri picker */}
                    <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            width: '100%', padding: '8px 12px', marginBottom: 6,
                            background: 'var(--m-surface)',
                            border: '1.5px dashed var(--m-orange, #ff7e2e)',
                            borderRadius: 8, cursor: 'pointer',
                            fontSize: 13, color: 'var(--m-orange, #ff7e2e)',
                        }}
                    >
                        <Search size={13} />
                        Cerca e aggiungi ingrediente…
                    </button>

                    {comp.rows.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--m-text-muted)', textAlign: 'center', margin: '8px 0 4px' }}>
                            Nessun ingrediente aggiunto
                        </p>
                    ) : (
                        <>
                            {comp.rows.map(row => (
                                <RecipeRowItem
                                    key={row.id}
                                    row={row}
                                    compId={comp.id}
                                    onRemove={onRemoveRow}
                                    onUpdate={onUpdateRow}
                                />
                            ))}
                            <div style={{ fontSize: 10, color: 'var(--m-text-muted)', textAlign: 'right', marginTop: 2, marginBottom: 4 }}>
                                Totale: {totalGrams.toFixed(1)} g (normalizzato a 100g)
                            </div>
                        </>
                    )}

                    <AdditiveSection
                        comp={comp}
                        onAdd={onAddAdditiveRow}
                        onRemove={onRemoveAdditiveRow}
                        onUpdate={onUpdateAdditiveRow}
                    />
                </div>}
            </div>
        </>
    );
}

// ─── Main CalcoloTab ──────────────────────────────────────────────────────────
export function CalcoloTab({
    form, onChange, onGoToTabella,
    db, loadingDB, dbError,
    components,
    onAddComponent, onRemoveComponent,
    onUpdateComponentName, onUpdateComponentPzUV,
    onAddRow, onRemoveRow, onUpdateRow,
    onAddAdditiveRow, onRemoveAdditiveRow, onUpdateAdditiveRow,
}: Props) {
    const hasIngredients = components.some(c => c.rows.length > 0);

    return (
        <div style={{ paddingTop: 12 }}>

            {/* Sezione: Prodotto */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Prodotto</span>
                    <div className="m-section__line" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="m-field">
                        <label className="m-label">Denominazione</label>
                        <input
                            className="m-input"
                            type="text"
                            placeholder="Es. Mozzarella di Bufala"
                            value={form.denominazione}
                            onChange={e => onChange({ denominazione: e.target.value })}
                            autoComplete="off"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <div className="m-field" style={{ flex: 1 }}>
                            <label className="m-label">Porzione (g)</label>
                            <input
                                className="m-input m-input--num"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                placeholder="100"
                                value={form.porzione_g}
                                onChange={e => onChange({ porzione_g: e.target.value })}
                            />
                        </div>
                        <div className="m-field" style={{ flex: 1 }}>
                            <label className="m-label">Peso finito (g) <span style={{ fontWeight: 400, opacity: 0.6 }}>opz.</span></label>
                            <input
                                className="m-input m-input--num"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.1"
                                placeholder="—"
                                value={form.pesoFinito_g}
                                onChange={e => onChange({ pesoFinito_g: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="m-field">
                        <label className="m-label">
                            Peso specifico (g/ml) <span style={{ fontWeight: 400, opacity: 0.6 }}>solo per liquidi</span>
                        </label>
                        <input
                            className="m-input m-input--num"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="0.001"
                            placeholder="es. 1.030"
                            value={form.specificGravity}
                            onChange={e => onChange({ specificGravity: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            {/* Sezione: Componenti + Ingredienti */}
            <div className="m-section">
                <div className="m-section__header" style={{ cursor: 'default' }}>
                    <div className="m-section__line" />
                    <span className="m-section__title">Ingredienti</span>
                    <div className="m-section__line" />
                </div>

                {dbError ? (
                    <div style={{
                        padding: '8px 12px', background: '#fff3f3', borderRadius: 6,
                        border: '1px solid #e53935', fontSize: 12, color: '#c62828', marginBottom: 8,
                    }}>
                        {dbError}
                    </div>
                ) : loadingDB ? (
                    <div style={{
                        padding: '8px 12px', background: '#f5f5f5', borderRadius: 6,
                        fontSize: 12, color: 'var(--m-text-muted)', marginBottom: 8,
                    }}>
                        Caricamento database ingredienti…
                    </div>
                ) : (
                    <>
                        {!hasIngredients && !form.denominazione && (
                            <div style={{ margin: '0 14px 16px', padding: '20px 16px', border: '1.5px dashed var(--m-border)', borderRadius: 10, textAlign: 'center' }}>
                                <div style={{ fontSize: 28, marginBottom: 8 }}>🍳</div>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-text)', marginBottom: 4 }}>Inizia la ricetta</div>
                                <div style={{ fontSize: 13, color: 'var(--m-text-muted)' }}>Inserisci il nome del prodotto e aggiungi gli ingredienti</div>
                            </div>
                        )}
                        {components.map((comp, idx) => (
                            <ComponentCard
                                key={comp.id}
                                comp={comp}
                                index={idx}
                                isOnly={components.length === 1}
                                db={db}
                                onRemoveComponent={onRemoveComponent}
                                onUpdateName={onUpdateComponentName}
                                onUpdatePzUV={onUpdateComponentPzUV}
                                onAddRow={onAddRow}
                                onRemoveRow={onRemoveRow}
                                onUpdateRow={onUpdateRow}
                                onAddAdditiveRow={onAddAdditiveRow}
                                onRemoveAdditiveRow={onRemoveAdditiveRow}
                                onUpdateAdditiveRow={onUpdateAdditiveRow}
                            />
                        ))}

                        <button
                            type="button"
                            onClick={onAddComponent}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                width: '100%', padding: '9px 0',
                                background: 'none',
                                border: '1.5px dashed var(--m-orange, #ff7e2e)',
                                borderRadius: 8, fontSize: 13,
                                color: 'var(--m-orange, #ff7e2e)', cursor: 'pointer',
                            }}
                        >
                            <Plus size={14} /> Aggiungi componente
                        </button>
                    </>
                )}
            </div>

            {/* CTA */}
            <div className="m-btn-row" style={{ marginTop: 8, marginBottom: 16 }}>
                <button
                    type="button"
                    className="m-btn m-btn--primary m-btn--full"
                    onClick={onGoToTabella}
                    disabled={!hasIngredients}
                >
                    Vai a Mercati →
                </button>
            </div>
        </div>
    );
}
