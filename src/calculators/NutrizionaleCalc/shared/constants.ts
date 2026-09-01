// Costanti condivise tra NutrizionaleCalc (desktop) e NutrizionaleCalcMobile + CalcoloTab (mobile).
// Fonte di verità unica: modifica qui si propaga a entrambi i tree.

import type { DBIngredient } from '../../../engines/nutrizionaleCalcEngine';

export const ALLERGEN_FIELDS: { key: keyof DBIngredient; label: string }[] = [
    { key: 'all_glutine', label: 'GLUTINE' }, { key: 'all_grano', label: 'GRANO' },
    { key: 'all_crostacei', label: 'CROSTACEI' }, { key: 'all_uova', label: 'UOVA' },
    { key: 'all_pesci', label: 'PESCE' }, { key: 'all_arachidi', label: 'ARACHIDI' },
    { key: 'all_soia', label: 'SOIA' }, { key: 'all_latte', label: 'LATTE' },
    { key: 'all_frutta_guscio', label: 'FRUTTA A GUSCIO' },
    { key: 'all_anacardi', label: 'ANACARDI' },
    { key: 'all_solfiti', label: 'SOLFITI (>10 ppm)' }, { key: 'all_lupini', label: 'LUPINI' },
    { key: 'all_molluschi', label: 'MOLLUSCHI' },
    { key: 'all_sedano', label: 'SEDANO' }, { key: 'all_senape', label: 'SENAPE' },
    { key: 'all_sesamo', label: 'SESAMO' },
];

export const CROSS_FIELDS: { key: keyof DBIngredient; label: string }[] = [
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

export const ADDITIVI_CATEGORIE = [
    'addensante','agente di rivestimento','agente di trattamento della farina',
    'agente lievitante','antiagglomerante','antiossidante','conservante',
    'correttore di acidità','edulcorante','emulsionante','esaltatore di sapidità',
    'gas per confezionamento','gas propellente','lecitina di girasole bio',
    'lecitina di soia bio','lucidante','rassodante','sbiancante','schiumogeno',
    'stabilizzante del colore','stabilizzatore di schiuma','umettante',
] as const;

export const ADDITIVI_SPECIFICI: Record<string, string[]> = {
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
