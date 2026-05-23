import { ExternalLink } from 'lucide-react';

// ─── Static data hoisted outside component ────────────────────────────────────

const DATABASE_NUTRIZIONALI = [
    { nome: 'C.R.E.A. (M.I.P.A.A.F.)', url: 'https://www.alimentinutrizione.it/sezioni/tabelle-nutrizionali' },
    { nome: 'U.S.D.A. (United States Department of Agriculture)', url: 'https://fdc.nal.usda.gov/' },
    { nome: 'Banca Dati Svizzera', url: 'https://www.valorinutritivi.ch/it/' },
    { nome: 'Banca Dati Istituto Europeo di Oncologia', url: 'https://bda.ieo.it/' },
    { nome: 'A.N.S.E.S. (Agenzia per la Sicurezza Alimentare Francese)', url: 'https://ciqual.anses.fr/' },
];

const SERVING_SIZE = [
    { nome: 'Per tabella canadese', url: 'https://www.canada.ca/en/health-canada/services/technical-documents-labelling-requirements/table-reference-amounts-food/nutrition-labelling.html' },
    { nome: 'Per tabella USA', url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-A/section-101.12' },
    { nome: 'Per tabella dei Paesi Arabi', url: 'https://www.sfda.gov.sa/sites/default/files/2020-09/ServingSizeReferenceAmountGiude-en.pdf' },
];

const NORME_PAESI: {
    paese: string;
    etichettatura?: string;
    approntamento?: { label: string; url: string };
}[] = [
    {
        paese: 'Europa',
        etichettatura: 'https://aeaconsulenzealimentari.it/wp-content/uploads/2015/07/regolamento_ue_1169-2011_del_25-10-2011.pdf',
    },
    {
        paese: 'Canada',
        etichettatura: 'https://www.canada.ca/en/services/health/food-labels.html',
        approntamento: {
            label: 'Esempi di tabelle CANADESI',
            url: 'https://www.canada.ca/en/health-canada/services/technical-documents-labelling-requirements/directory-nutrition-facts-table-formats/nutrition-labelling.html',
        },
    },
    {
        paese: 'Australia',
        etichettatura: 'https://www.foodstandards.gov.au/code/Pages/default.aspx',
        approntamento: {
            label: 'Regole per l\'approntamento della tabella dei valori nutrizionali AUSTRALIANA',
            url: 'https://www.legislation.gov.au/Details/F2015C00968',
        },
    },
    {
        paese: 'U.S.A.',
        etichettatura: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?CFRPart=101',
    },
    {
        paese: 'Paesi Arabi',
        etichettatura: 'https://members.wto.org/crnattachments/2018/TBT/SAU/18_5864_00_e.pdf',
    },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
    background: 'var(--color-bg-card, #fff)',
    border: '1px solid var(--color-border, #e2e8f0)',
    borderRadius: 10,
    padding: '20px 24px',
    marginBottom: 20,
};

const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#b7791f',
    borderBottom: '2px solid #f6e05e',
    paddingBottom: 6,
    marginBottom: 14,
};

const linkStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 6,
    color: '#2b6cb0',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    transition: 'background 0.15s',
    cursor: 'pointer',
};

const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
};

const thStyle: React.CSSProperties = {
    background: '#f7fafc',
    border: '1px solid var(--color-border, #e2e8f0)',
    padding: '8px 12px',
    textAlign: 'left',
    fontWeight: 700,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#4a5568',
};

const tdStyle: React.CSSProperties = {
    border: '1px solid var(--color-border, #e2e8f0)',
    padding: '9px 12px',
    verticalAlign: 'middle',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
            onMouseEnter={e => (e.currentTarget.style.background = '#ebf8ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
            <ExternalLink size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
            {children}
        </a>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RisorseLinks() {
    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>

            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text, #1a202c)', marginBottom: 4 }}>
                    Pagina iniziale — Links e Risorse
                </h1>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted, #718096)', margin: 0 }}>
                    Links ai database istituzionali ed alla normativa nutrizionale dei vari Paesi
                </p>
            </div>

            {/* Row: database + serving size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 0 }}>

                {/* Database nutrizionali */}
                <div style={cardStyle}>
                    <div style={sectionTitleStyle}>Database per cercare i valori nutrizionali</div>
                    <div>
                        {DATABASE_NUTRIZIONALI.map(db => (
                            <ExtLink key={db.nome} href={db.url}>{db.nome}</ExtLink>
                        ))}
                    </div>
                </div>

                {/* Serving size */}
                <div style={cardStyle}>
                    <div style={sectionTitleStyle}>Valori dei Serving Size</div>
                    <div>
                        {SERVING_SIZE.map(s => (
                            <ExtLink key={s.nome} href={s.url}>{s.nome}</ExtLink>
                        ))}
                    </div>
                </div>
            </div>

            {/* Norme per paese */}
            <div style={cardStyle}>
                <div style={sectionTitleStyle}>Normativa per Paese</div>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={{ ...thStyle, width: '12%' }}>Paese</th>
                            <th style={thStyle}>Norme sull'etichettatura nutrizionale</th>
                            <th style={thStyle}>Norme sull'approntamento delle tabelle dei valori nutrizionali</th>
                        </tr>
                    </thead>
                    <tbody>
                        {NORME_PAESI.map(row => (
                            <tr key={row.paese}>
                                <td style={{ ...tdStyle, fontWeight: 700, color: '#2d3748' }}>{row.paese}</td>
                                <td style={tdStyle}>
                                    {row.etichettatura
                                        ? <ExtLink href={row.etichettatura}>Normativa etichettatura — {row.paese}</ExtLink>
                                        : <span style={{ color: '#a0aec0', fontSize: 12 }}>—</span>
                                    }
                                </td>
                                <td style={tdStyle}>
                                    {row.approntamento
                                        ? <ExtLink href={row.approntamento.url}>{row.approntamento.label}</ExtLink>
                                        : <span style={{ color: '#a0aec0', fontSize: 12 }}>—</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Contatti */}
            <div style={{ ...cardStyle, borderLeft: '4px solid #e07b22' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#4a5568', marginBottom: 10 }}>
                    Contatti — per qualsiasi chiarimento riguardante questo prodotto digitale
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#e07b22', fontWeight: 600 }}>
                    Gelsomino Panico
                    &nbsp;&ndash;&nbsp; Cell. 347-8323703
                    &nbsp;&ndash;&nbsp;{' '}
                    <a href="mailto:gelsomino.panico@gmail.com" style={{ color: '#e07b22' }}>
                        gelsomino.panico@gmail.com
                    </a>
                    &nbsp;&ndash;&nbsp;{' '}
                    <a href="https://aeaconsulenzealimentari.it" target="_blank" rel="noopener noreferrer" style={{ color: '#e07b22' }}>
                        aeaconsulenzealimentari.it
                    </a>
                </p>
            </div>

        </div>
    );
}
