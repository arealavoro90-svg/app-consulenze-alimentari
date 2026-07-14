// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { DownloadTableModal } from './DownloadTableModal';
import { DEFAULT_OPTIONALS } from './TabUE';
import { ToastProvider } from '../../components/ui/Toast';
import React from 'react';

afterEach(cleanup);

function wrap(ui: React.ReactElement) {
    return render(<ToastProvider>{ui}</ToastProvider>);
}

// Valori nutrizionali realistici per una mozzarella di bufala /100g
const BASE_RESULT = {
    energyKcal: 254, energyKj: 1063,
    grassi: 19.5, saturi: 13.2, monoins: 5.1, polins: 0.8, trans: 0,
    colesterolo: 64,
    carboidrati: 2.1, carboidratiTot: 2.1, zuccheri: 2.1,
    zuccheri_agg: 0, polioli: 0, amido: 0,
    fibre: 0,
    proteine: 18.3,
    sodio_mg: 330, sale: 0.84,
    potassio: 120, calcio: 210, fosforo: 190, magnesio: 18,
    ferro: 0.2, zinco: 1.4, rame: 0.02, manganese: 0.01,
    selenio: 4, iodio: 8,
    vitA_eq: 135, vitD: 0.2, vitE: 0.4, vitK: 2,
    vitC: 0, vitB1: 0.03, vitB2: 0.18, vitB3: 0.1, vitB5: 0.4,
    vitB6: 0.05, vitB9: 10, vitB12: 1.2,
};

const baseProps = {
    region: 'UE' as const,
    p: BASE_RESULT,
    ue: { porzione: 125, confezione: 250, pezzo: 125 },
    usa: {}, ca: {}, au: {}, arabi: {},
    specificGravity: 0,
    selectedOptionals: DEFAULT_OPTIONALS,
    showOptionals: false,
    productName: 'Mozzarella',
    onClose: vi.fn(),
};

describe('DownloadTableModal', () => {
    it('mostra dialog con pulsante Scarica PNG', () => {
        wrap(<DownloadTableModal {...baseProps} />);
        expect(screen.getByRole('dialog')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Scarica PNG/ })).toBeTruthy();
    });

    it('UE: mostra gruppo Colonne, non mostra Layout', () => {
        wrap(<DownloadTableModal {...baseProps} />);
        const opts = screen.getByTestId('options-col');
        // UE ha controllo colonne (euSubTab) nel pannello opzioni
        expect(opts.querySelector('button[class*="btn-accent"]')?.textContent).toBe('Per 100g');
        // UE non ha Layout (verticale/orizzontale/lineare)
        expect(opts.querySelector('button')?.textContent).not.toBe('Verticale');
        expect(Array.from(opts.querySelectorAll('button')).find(b => b.textContent === 'Verticale')).toBeUndefined();
    });

    it('USA: unità Tazze disabilitata senza dato cup', () => {
        wrap(
            <DownloadTableModal
                {...baseProps}
                region="USA"
                usa={{ serving: 30, confezione: 250 }}
            />
        );
        const tazze = screen.getByRole('button', { name: 'Tazze' }) as HTMLButtonElement;
        expect(tazze.disabled).toBe(true);
    });

    it('USA: mostra gruppo Layout', () => {
        wrap(<DownloadTableModal {...baseProps} region="USA" usa={{ serving: 30 }} />);
        const opts = screen.getByTestId('options-col');
        expect(Array.from(opts.querySelectorAll('button')).find(b => b.textContent === 'Verticale')).toBeTruthy();
    });

    it('Australia: non mostra Layout né Colonne né Riferimento né Unità', () => {
        wrap(<DownloadTableModal {...baseProps} region="Australia" au={{ serving: 30 }} />);
        const opts = screen.getByTestId('options-col');
        const btns = Array.from(opts.querySelectorAll('button'));
        expect(btns.find(b => b.textContent === 'Verticale')).toBeUndefined();
        expect(btns.find(b => b.textContent === 'Per 100g')).toBeUndefined();
        expect(btns.find(b => b.textContent === 'Per Serving')).toBeUndefined();
        expect(btns.find(b => b.textContent === 'g / ml')).toBeUndefined();
        // options column empty
        expect(btns.length).toBe(0);
    });
});
