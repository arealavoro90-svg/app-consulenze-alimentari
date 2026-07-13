// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TabUE, DEFAULT_OPTIONALS } from './TabUE';

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

const UE_SERVING = { porzione: 125, confezione: 250, pezzo: 125 };
const ALL_OPTIONALS = Object.fromEntries(
    Object.keys(DEFAULT_OPTIONALS).map(k => [k, true])
) as typeof DEFAULT_OPTIONALS;

describe('TabUE — snapshot rendering', () => {
    it('100g — solo obbligatori', () => {
        const { container } = render(
            <TabUE
                p={BASE_RESULT}
                ue={UE_SERVING}
                selectedOptionals={DEFAULT_OPTIONALS}
                showOptionals={false}
                activeSubTab="100g"
            />
        );
        expect(container).toMatchSnapshot();
    });

    it('100g — tutti gli opzionali', () => {
        const { container } = render(
            <TabUE
                p={BASE_RESULT}
                ue={UE_SERVING}
                selectedOptionals={ALL_OPTIONALS}
                showOptionals={true}
                activeSubTab="100g"
            />
        );
        expect(container).toMatchSnapshot();
    });

    it('per porzione (125g)', () => {
        const { container } = render(
            <TabUE
                p={BASE_RESULT}
                ue={UE_SERVING}
                selectedOptionals={DEFAULT_OPTIONALS}
                showOptionals={false}
                activeSubTab="porzione"
            />
        );
        expect(container).toMatchSnapshot();
    });

    it('per unità di vendita (250g)', () => {
        const { container } = render(
            <TabUE
                p={BASE_RESULT}
                ue={UE_SERVING}
                selectedOptionals={DEFAULT_OPTIONALS}
                showOptionals={false}
                activeSubTab="uv"
            />
        );
        expect(container).toMatchSnapshot();
    });

    it('prodotto liquido (peso specifico 1.02)', () => {
        const { container } = render(
            <TabUE
                p={BASE_RESULT}
                ue={UE_SERVING}
                specificGravity={1.02}
                selectedOptionals={DEFAULT_OPTIONALS}
                showOptionals={false}
                activeSubTab="100g"
            />
        );
        expect(container).toMatchSnapshot();
    });

    it('valori a zero — nessun crash', () => {
        const ZERO = Object.fromEntries(Object.keys(BASE_RESULT).map(k => [k, 0])) as typeof BASE_RESULT;
        const { container } = render(
            <TabUE
                p={ZERO}
                ue={{}}
                selectedOptionals={DEFAULT_OPTIONALS}
                showOptionals={false}
                activeSubTab="100g"
            />
        );
        expect(container).toMatchSnapshot();
    });
});
