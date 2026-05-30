import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useArchive } from '../../hooks/useArchive';
import { CalcoloTab } from './mobile/CalcoloTab';
import { TabellaTab } from './mobile/TabellaTab';
import { ArchivioTab } from './mobile/ArchivioTab';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Shared types ─────────────────────────────────────────────────────────────
export interface CalcResult {
    energyKcal: number; energyKj: number;
    grassi: number; saturi: number; monoins: number; polins: number;
    trans: number; colesterolo: number;
    carboidrati: number; carboidratiTot: number; zuccheri: number;
    zuccheri_agg: number; polioli: number; amido: number; fibre: number;
    proteine: number; sodio_mg: number; sale: number;
    potassio: number; calcio: number; fosforo: number; magnesio: number;
    ferro: number; zinco: number;
    vitA_eq: number; vitD: number; vitE: number; vitC: number;
    vitB1: number; vitB2: number; vitB3: number; vitB6: number;
    vitB9: number; vitB12: number;
}

export const ZERO_CALC: CalcResult = {
    energyKcal: 0, energyKj: 0, grassi: 0, saturi: 0, monoins: 0, polins: 0,
    trans: 0, colesterolo: 0, carboidrati: 0, carboidratiTot: 0, zuccheri: 0,
    zuccheri_agg: 0, polioli: 0, amido: 0, fibre: 0, proteine: 0, sodio_mg: 0,
    sale: 0, potassio: 0, calcio: 0, fosforo: 0, magnesio: 0, ferro: 0, zinco: 0,
    vitA_eq: 0, vitD: 0, vitE: 0, vitC: 0, vitB1: 0, vitB2: 0, vitB3: 0,
    vitB6: 0, vitB9: 0, vitB12: 0,
};

// Form fields (stringhe per gestire input decimale senza perdere "0.")
export interface MobileNutForm {
    denominazione: string;
    porzione_g: string;
    kcal: string; kj: string;
    grassi: string; saturi: string;
    carboidrati: string; zuccheri: string;
    proteine: string; sodio_mg: string;
    fibre: string;
    // serving sizes per tabella
    ue_porzione: string; ue_confezione: string;
    usa_serving: string;
}

export const EMPTY_FORM: MobileNutForm = {
    denominazione: '', porzione_g: '100',
    kcal: '', kj: '',
    grassi: '', saturi: '',
    carboidrati: '', zuccheri: '',
    proteine: '', sodio_mg: '',
    fibre: '',
    ue_porzione: '', ue_confezione: '',
    usa_serving: '',
};

// Convert form → CalcResult (valori per 100g)
export function formToCalcResult(f: MobileNutForm): CalcResult {
    const n = (v: string) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
    const sodio = n(f.sodio_mg);
    const kcal  = n(f.kcal);
    return {
        ...ZERO_CALC,
        energyKcal:     kcal,
        energyKj:       n(f.kj) || Math.round(kcal * 4.184),
        grassi:         n(f.grassi),
        saturi:         n(f.saturi),
        carboidrati:    n(f.carboidrati),
        carboidratiTot: n(f.carboidrati),
        zuccheri:       n(f.zuccheri),
        fibre:          n(f.fibre),
        proteine:       n(f.proteine),
        sodio_mg:       sodio,
        sale:           parseFloat((sodio * 2.5 / 1000).toFixed(3)),
    };
}

export interface MobileArchiveEntry {
    denominazione: string;
    porzione_g: number;
    region: 'UE' | 'USA' | 'Canada' | 'Australia' | 'Arabi';
    calcResult: CalcResult;
    form: MobileNutForm;
}

export type MobileTab = 'calcolo' | 'tabella' | 'archivio' | 'tools';

// ─── Component ────────────────────────────────────────────────────────────────
export function NutrizionaleCalcMobile() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const archive = useArchive<MobileArchiveEntry>('nut_mobile_v1');

    const [activeTab, setActiveTab] = useState<MobileTab>('calcolo');
    const [form, setForm] = useState<MobileNutForm>(EMPTY_FORM);

    const updateForm = (patch: Partial<MobileNutForm>) =>
        setForm(prev => ({ ...prev, ...patch }));

    const loadFromArchive = (entry: MobileArchiveEntry) => {
        setForm(entry.form);
        setActiveTab('calcolo');
    };

    const calcResult = formToCalcResult(form);

    const tabs: { id: MobileTab; label: string }[] = [
        { id: 'calcolo',  label: 'Calcolo'  },
        { id: 'tabella',  label: 'Tabella'  },
        { id: 'archivio', label: 'Archivio' },
        { id: 'tools',    label: 'Tools'    },
    ];

    const handleExportPDF = async (_region: string) => {
        const previewEl = document.querySelector('.m-table-preview') as HTMLElement | null;
        if (!previewEl) return;
        try {
            const canvas = await html2canvas(previewEl, { scale: 2, useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const w = pdf.internal.pageSize.getWidth();
            const ratio = canvas.height / canvas.width;
            pdf.addImage(imgData, 'PNG', 10, 10, w - 20, (w - 20) * ratio);
            pdf.save(`${form.denominazione || 'tabella'}_${_region}.pdf`);
        } catch (e) {
            console.error('PDF export failed', e);
        }
    };

    const renderTab = () => {
        switch (activeTab) {
            case 'calcolo':
                return (
                    <CalcoloTab
                        form={form}
                        onChange={updateForm}
                        onGoToTabella={() => setActiveTab('tabella')}
                    />
                );
            case 'tabella':
                return (
                    <TabellaTab
                        calcResult={calcResult}
                        form={form}
                        onChange={updateForm}
                        onSave={(region) => {
                            archive.saveItem(
                                form.denominazione || 'Senza nome',
                                {
                                    denominazione: form.denominazione,
                                    porzione_g: parseFloat(form.porzione_g) || 100,
                                    region,
                                    calcResult,
                                    form,
                                }
                            );
                        }}
                        onExportPDF={handleExportPDF}
                    />
                );
            case 'archivio':
                return (
                    <ArchivioTab
                        items={archive.items}
                        onLoad={(entry) => {
                            loadFromArchive(entry);
                        }}
                        onDelete={(id) => archive.deleteItem(id)}
                    />
                );
            default:
                return <div style={{ padding: 16, color: '#999' }}>{activeTab} — in arrivo</div>;
        }
    };

    return (
        <div style={{ minHeight: '100%', background: 'var(--m-bg)' }}>
            {renderTab()}

            {/* Bottom Tab Bar */}
            <nav className="m-tabbar" aria-label="Navigazione principale">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        className="m-tabbar__item"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        <span className={`m-tabbar__dot${activeTab === tab.id ? ' m-tabbar__dot--active' : ''}`} />
                        <span className={`m-tabbar__label${activeTab === tab.id ? ' m-tabbar__label--active' : ''}`}>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
}
