// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { DownloadTableModal } from './DownloadTableModal';
import { ToastProvider } from '../../components/ui/Toast';
import React from 'react';

afterEach(cleanup);

function wrap(ui: React.ReactElement) {
    return render(<ToastProvider>{ui}</ToastProvider>);
}

const baseProps = {
    region: 'UE' as const,
    ue: { porzione: 125, confezione: 250, pezzo: 125 },
    nation: {} as const,
    productName: 'Mozzarella',
    renderPreview: () => <div data-table-export>tabella</div>,
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
        expect(Array.from(opts.querySelectorAll('button')).find(b => b.textContent === 'Verticale')).toBeUndefined();
    });

    it('USA: unità Tazze disabilitata senza dato cup', () => {
        wrap(
            <DownloadTableModal
                {...baseProps}
                region="USA"
                nation={{ serving: 30, confezione: 250 }}
            />
        );
        const tazze = screen.getByRole('button', { name: 'Tazze' }) as HTMLButtonElement;
        expect(tazze.disabled).toBe(true);
    });

    it('USA: mostra gruppo Layout', () => {
        wrap(<DownloadTableModal {...baseProps} region="USA" nation={{ serving: 30 }} />);
        const opts = screen.getByTestId('options-col');
        expect(Array.from(opts.querySelectorAll('button')).find(b => b.textContent === 'Verticale')).toBeTruthy();
    });

    it('Australia: non mostra Layout né Colonne né Riferimento né Unità', () => {
        wrap(<DownloadTableModal {...baseProps} region="Australia" nation={{ serving: 30 }} />);
        const opts = screen.getByTestId('options-col');
        const btns = Array.from(opts.querySelectorAll('button'));
        expect(btns.find(b => b.textContent === 'Verticale')).toBeUndefined();
        expect(btns.find(b => b.textContent === 'Per 100g')).toBeUndefined();
        expect(btns.find(b => b.textContent === 'Per Serving')).toBeUndefined();
        expect(btns.find(b => b.textContent === 'g / ml')).toBeUndefined();
        expect(btns.length).toBe(0);
    });

    // fix 2: test fallback valori effettivi USA senza confezione/cup
    it('USA: renderPreview riceve servingRef=serving e measure=g come default (fallback)', () => {
        const mockRender = vi.fn().mockReturnValue(<div data-table-export />);
        wrap(
            <DownloadTableModal
                {...baseProps}
                region="USA"
                nation={{ serving: 30 }}
                renderPreview={mockRender}
            />
        );
        const lastCall = mockRender.mock.calls[mockRender.mock.calls.length - 1];
        expect(lastCall[0]).toEqual(
            expect.objectContaining({ servingRef: 'serving', measure: 'g' })
        );
    });

    // fix 2: test UE — senza porzione showColonne è false, con porzione click 'Per porzione' → euSubTab
    it('UE: click "Per porzione" aggiorna euSubTab nel renderPreview', () => {
        const mockRender = vi.fn().mockReturnValue(<div data-table-export />);
        wrap(
            <DownloadTableModal
                {...baseProps}
                ue={{ porzione: 125 }}
                renderPreview={mockRender}
            />
        );
        fireEvent.click(screen.getByRole('button', { name: 'Per porzione' }));
        const lastCall = mockRender.mock.calls[mockRender.mock.calls.length - 1];
        expect(lastCall[0]).toEqual(
            expect.objectContaining({ euSubTab: 'porzione' })
        );
    });

    // fix 1: handlers passati come secondo argomento a renderPreview
    it('renderPreview riceve handlers con setSubTab', () => {
        const mockRender = vi.fn().mockReturnValue(<div data-table-export />);
        wrap(<DownloadTableModal {...baseProps} renderPreview={mockRender} />);
        const lastCall = mockRender.mock.calls[mockRender.mock.calls.length - 1];
        expect(typeof lastCall[1]?.setSubTab).toBe('function');
    });
});
