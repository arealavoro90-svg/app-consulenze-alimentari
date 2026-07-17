// @vitest-environment jsdom
// Snapshot di guardia per le tabelle unificate Canada/Australia/Arabi (TAB-UNIFY).
// Sorgente normativa: versione desktop. Ogni modifica al markup deve essere intenzionale.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TabCanada } from './TabCanada';
import { TabAustralia } from './TabAustralia';
import { TabArabi } from './TabArabi';

// Stessi valori realistici usati in TabUE.test.tsx (mozzarella di bufala /100g)
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
    ferro: 0.2, zinco: 1.4,
    vitA_eq: 135, vitD: 0.2, vitE: 0.4,
    vitC: 0, vitB1: 0.03, vitB2: 0.18, vitB3: 0.1,
    vitB6: 0.05, vitB9: 10, vitB12: 1.2,
};

const SERVING = { serving: 30, confezione: 250, cup: 240, cucchiaio: 15, pezzo: 125 };

describe('TabCanada — snapshot rendering', () => {
    (['verticale', 'orizzontale', 'lineare'] as const).forEach(layout => {
        it(`layout ${layout}`, () => {
            const { container } = render(
                <TabCanada p={BASE_RESULT} ca={SERVING} servingRef="serving" measure="g" subTab={layout} />
            );
            expect(container).toMatchSnapshot();
        });
    });

    it('riferimento confezione, misura tazze', () => {
        const { container } = render(
            <TabCanada p={BASE_RESULT} ca={SERVING} servingRef="confezione" measure="tazze" subTab="verticale" />
        );
        expect(container).toMatchSnapshot();
    });

    it('valori a zero — nessun crash', () => {
        const zero = Object.fromEntries(Object.keys(BASE_RESULT).map(k => [k, 0])) as typeof BASE_RESULT;
        const { container } = render(
            <TabCanada p={zero} ca={{}} servingRef="serving" measure="g" subTab="verticale" />
        );
        expect(container).toMatchSnapshot();
    });
});

describe('TabAustralia — snapshot rendering', () => {
    it('con serving e confezione', () => {
        const { container } = render(<TabAustralia p={BASE_RESULT} au={SERVING} />);
        expect(container).toMatchSnapshot();
    });

    it('senza serving — messaggio placeholder', () => {
        const { container } = render(<TabAustralia p={BASE_RESULT} au={{}} />);
        expect(container).toMatchSnapshot();
    });
});

describe('TabArabi — snapshot rendering', () => {
    it('serving in grammi', () => {
        const { container } = render(
            <TabArabi p={BASE_RESULT} arabi={SERVING} servingRef="serving" measure="g" />
        );
        expect(container).toMatchSnapshot();
    });

    it('confezione in tazze, liquido (ml)', () => {
        const { container } = render(
            <TabArabi p={BASE_RESULT} arabi={SERVING} servingRef="confezione" measure="tazze" specificGravity={1.03} />
        );
        expect(container).toMatchSnapshot();
    });
});
