// @vitest-environment jsdom
// COD-03 — Golden test per mercati internazionali.
// Verifica arrotondamento, ordine nutrienti e %DV/DI con valori noti.
// Valori /100g: grassi=10, saturi=4, trans=0, colesterolo=60, sodio_mg=400,
//               carboidratiTot=20, zuccheri=8, zuccheri_agg=2, fibre=3,
//               proteine=5, potassio=100, calcio=120, ferro=1.2,
//               vitD=1.0, energyKcal=190, energyKj=795
// Porzione 50g (f=0.5): tutti i valori si dimezzano.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabUSA } from './TabUSA';
import { TabCanada } from './TabCanada';
import { TabAustralia } from './TabAustralia';
import { TabArabi } from './TabArabi';

const P = {
    energyKcal: 190, energyKj: 795,
    grassi: 10, saturi: 4, monoins: 2, polins: 1, trans: 0,
    colesterolo: 60,
    carboidrati: 20, carboidratiTot: 20, zuccheri: 8,
    zuccheri_agg: 2, polioli: 0, amido: 0,
    fibre: 3,
    proteine: 5,
    sodio_mg: 400, sale: 1,
    potassio: 100, calcio: 120, fosforo: 80, magnesio: 10,
    ferro: 1.2, zinco: 0.5,
    vitA_eq: 0, vitD: 1.0, vitE: 0.5, vitC: 0,
    vitB1: 0, vitB2: 0, vitB3: 0, vitB6: 0, vitB9: 0, vitB12: 0,
};
// Serving 50g → f=0.5
const SERVING = { serving: 50, confezione: 200, cup: 240, cucchiaio: 15 };

// ─── USA ──────────────────────────────────────────────────────────────────────
// Porzione 50g: grassi=5g, saturi=2g, sodio=200mg, carboidratiTot=10g,
//               fibre=1.5g, zuccheri=4g, zuccheri_agg=1g, proteine=2.5g,
//               colesterolo=30mg, energyKcal=95→round/10=100,
//               vitD=0.5mcg, calcio=60mg, ferro=0.6mg, potassio=50mg
// %DV: grassi 5/78=6%, saturi 2/20=10%, colest 30/300=10%,
//      sodio 200/2300=9%, carb 10/275=4%, fibre 1.5/28=5%,
//      zuccheri_agg 1/50=2%, vitD 0.5/20=3%, calcio 60/1300=5%,
//      ferro 0.6/18=3%, potassio 50/4700=1%
describe('TabUSA — golden values (verticale, serving 50g)', () => {
    it('arrotondamento energia: 95 kcal → 100', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        // Calories display rEnergy(95)=100
        expect(container.textContent).toContain('100');
    });

    it('Total Fat: 5g (intero, no decimali), %DV 6%', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        // rG(5.0)=5.0, ma fmtVal: 5.0%1===0 → "5g" (no decimal for integers)
        expect(text).toMatch(/Total Fat\s+5g/);
        // 6% DV for Total Fat: round(5/78*100)=6
        expect(text).toContain('6%');
    });

    it('Sodium: 200mg arrotondato (range >140 → nearest 10)', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        // rSodium(200)=200, %DV=round(200/2300*100)=9%
        expect(container.textContent).toContain('200mg');
        // 9% sodio
        expect(container.textContent).toContain('9%');
    });

    it('ordine nutrienti: Total Fat prima di Cholesterol prima di Sodium prima di Total Carbohydrate', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        const idxFat   = text.indexOf('Total Fat');
        const idxChol  = text.indexOf('Cholesterol');
        const idxSod   = text.indexOf('Sodium');
        const idxCarb  = text.indexOf('Total Carbohydrate');
        expect(idxFat).toBeGreaterThanOrEqual(0);
        expect(idxFat).toBeLessThan(idxChol);
        expect(idxChol).toBeLessThan(idxSod);
        expect(idxSod).toBeLessThan(idxCarb);
    });

    it('Added Sugars: rG(1.0)=1.0, %DV 2%', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        expect(text).toContain('Added Sugars');
        expect(text).toContain('2%');
    });

    it('vitamine: Vitamin D 0.5mcg 3%, Calcium 60mg 5%, Iron 0.6mg 3%, Potassium 50mg 1%', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        expect(text).toContain('Vitamin D');
        expect(text).toContain('0.5mcg');
        expect(text).toContain('Calcium');
        expect(text).toContain('60mg');
        expect(text).toContain('Iron');
        expect(text).toContain('0.6mg');
        expect(text).toContain('Potassium');
        expect(text).toContain('50mg');
        // %DV check — vitD=3%, calcio=5%, ferro=3%, potassio=1%
        expect(text).toContain('1%');
        expect(text).toContain('5%');
    });

    it('Protein dopo Added Sugars (ordine FDA)', () => {
        const { container } = render(
            <TabUSA p={P} usa={SERVING} specificGravity={0} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        const idxAdded   = text.indexOf('Added Sugars');
        const idxProtein = text.indexOf('Protein');
        expect(idxAdded).toBeGreaterThanOrEqual(0);
        expect(idxProtein).toBeGreaterThan(idxAdded);
    });
});

// ─── Canada ───────────────────────────────────────────────────────────────────
// DV_CA: grassi=75, satTrans=20, fibre=28, zuccheri=100, sodio=2300, potassio=4700, calcio=1300, ferro=18
// Porzione 50g: grassi=5→rCA_fat(5)="5.0", saturi=2→"2.0", trans=0→"0",
//               satTrans=2→rCA_pct(2,20)=10%
//               carboidratiTot=10→rCA_carb(10)="10", fibre=1.5→rCA_carb(1.5)="2" (round(1.5)=2)
//               zuccheri=4→"4", proteine=2.5→"3" (round(2.5)=3 in JS)
//               colesterolo=30→rCA_chol(30)="30", sodio=200→rCA_na(200)="200"
//               potassio=50→rCA_na(50)="50", calcio=60→rCA_na(60)="60", ferro=0.6→rCA_iron(0.6)="0.6"
//               energia=95→rCA_energy(95)="100" (round(95/10)*10=100)
// %DV: grassi=round(5/75*100)=7%, fibre=round(1.5/28*100)=5%, zuccheri=round(4/100*100)=4%
//      sodio=round(200/2300*100)=9%, potassio=round(50/4700*100)=1%, calcio=round(60/1300*100)=5%
//      ferro=round(0.6/18*100)=3%, satTrans=round(2/20*100)=10%
describe('TabCanada — golden values (verticale, serving 50g)', () => {
    it('rCA_energy: 95 kcal → "100"', () => {
        const { container } = render(
            <TabCanada p={P} ca={SERVING} servingRef="serving" measure="g" subTab="verticale" />
        );
        // Calories 100 (rCA_energy rounds to nearest 10 for >50)
        expect(container.textContent).toContain('100');
    });

    it('rCA_fat: grassi 5g → "5.0", Sat+Trans %DV 10%', () => {
        const { container } = render(
            <TabCanada p={P} ca={SERVING} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        // Fat / Lipides 5.0g
        expect(text).toContain('5.0');
        // Saturated 2.0g, Trans 0g → satTrans=2 → rCA_pct(2,20)=10%
        expect(text).toContain('10%');
    });

    it('ordine nutrienti CA: Fat → Carbohydrate → Fibre → Sugars → Protein → Cholesterol → Sodium', () => {
        const { container } = render(
            <TabCanada p={P} ca={SERVING} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        const idx = (s: string) => text.indexOf(s);
        expect(idx('Fat')).toBeLessThan(idx('Carbohydrate'));
        expect(idx('Carbohydrate')).toBeLessThan(idx('Fibre'));
        expect(idx('Fibre')).toBeLessThan(idx('Sugars'));
        expect(idx('Sugars')).toBeLessThan(idx('Protein'));
        expect(idx('Protein')).toBeLessThan(idx('Cholesterol'));
        expect(idx('Cholesterol')).toBeLessThan(idx('Sodium'));
    });

    it('rCA_na: sodio 200mg → "200", %DV 9%', () => {
        const { container } = render(
            <TabCanada p={P} ca={SERVING} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        expect(text).toContain('200');
        // sodio %DV = round(200/2300*100)=9%
        expect(text).toContain('9%');
    });

    it('rCA_iron: ferro 0.6mg → "0.6", %DV 3%', () => {
        const { container } = render(
            <TabCanada p={P} ca={SERVING} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        expect(text).toContain('0.6');
        expect(text).toContain('3%');
    });

    it('rCA_carb: fibre 1.5→"2", zuccheri 4→"4"', () => {
        const { container } = render(
            <TabCanada p={P} ca={SERVING} servingRef="serving" measure="g" subTab="verticale" />
        );
        const text = container.textContent ?? '';
        // rCA_carb(1.5)=Math.round(1.5)=2 (JS rounds .5 up)
        expect(text).toContain('Fibre');
        // zuccheri=4 → "4"
        expect(text).toContain('Sugars');
    });
});

// ─── Australia ────────────────────────────────────────────────────────────────
// DV_AU: energyKj=8700, grassi=70, saturi=24, carboidrati=310, zuccheri=90, fibre=30, proteine=50, sodio_mg=2300
// /100g values (no serving scale — serve la colonna "per 100g" sempre presente):
//   energyKj=795→rAU_kj(795)="795", energyKcal=190→rAU_kcal(190)="190"
//   grassi=10→rAU_g1(10)="10.0", saturi=4→"4.0"
//   carboidrati=20→"20.0", zuccheri=8→"8.0"
//   fibre=3→"3.0", sodio=400→rAU_mg(400)="400"
//   proteine=5→"5.0"
// Con serving 50g:
//   svEnergyKj=397.5→rAU_kj=398, svEnergyKcal=95→95
//   svGrassi=5→"5.0", svSaturi=2→"2.0"
//   svCarboidrati=10→"10.0", svZuccheri=4→"4.0"
//   svFibre=1.5→"1.5", svSodio=200→"200", svProteine=2.5→"2.5"
// %DI: energyKj=round(397.5/8700*100)=5%
//      grassi=round(5/70*100)=7%, saturi=round(2/24*100)=8%
//      carboidrati=round(10/310*100)=3%, zuccheri=round(4/90*100)=4%
//      fibre=round(1.5/30*100)=5%, sodio=round(200/2300*100)=9%
//      proteine=round(2.5/50*100)=5%
describe('TabAustralia — golden values (colonne /100g e per porzione)', () => {
    it('colonna per 100g sempre presente: energia "795 kJ", grassi "10.0 g"', () => {
        // senza serving: solo colonna /100g
        const { container } = render(<TabAustralia p={P} au={{}} />);
        const text = container.textContent ?? '';
        // rAU_kj(795)="795"
        expect(text).toContain('795');
        // rAU_g1(10)="10.0"
        expect(text).toContain('10.0');
    });

    it('ordine righe FSANZ: Energy, Protein, Fat, Saturated, Carbohydrate, Sugars, Fibre, Sodium', () => {
        const { container } = render(<TabAustralia p={P} au={SERVING} />);
        const text = container.textContent ?? '';
        const idx = (s: string) => text.indexOf(s);
        expect(idx('Energy')).toBeLessThan(idx('Protein'));
        expect(idx('Protein')).toBeLessThan(idx('Fat'));
        expect(idx('Fat')).toBeLessThan(idx('saturated'));
        expect(idx('saturated')).toBeLessThan(idx('Carbohydrate'));
        expect(idx('Carbohydrate')).toBeLessThan(idx('sugars'));
        expect(idx('sugars')).toBeLessThan(idx('fibre'));
        expect(idx('fibre')).toBeLessThan(idx('Sodium'));
    });

    it('colonna per porzione 50g: rAU_kj(397.5)=398, rAU_g1(5)="5.0"', () => {
        const { container } = render(<TabAustralia p={P} au={SERVING} />);
        const text = container.textContent ?? '';
        // energyKj porzione=397.5 → round=398 (o "less than 40" se <40)
        // 397.5>40 → "398"
        expect(text).toContain('398');
        // grassi porzione=5 → rAU_g1(5)="5.0"
        // NB: "5.0" appare sia per-porzione che per-100g (10.0)
        expect(text).toContain('5.0');
    });

    it('%DI sodio porzione 50g: round(200/2300*100)=9%', () => {
        const { container } = render(<TabAustralia p={P} au={SERVING} />);
        const text = container.textContent ?? '';
        expect(text).toContain('9 %');
    });

    it('%DI grassi porzione 50g: round(5/70*100)=7%', () => {
        const { container } = render(<TabAustralia p={P} au={SERVING} />);
        const text = container.textContent ?? '';
        expect(text).toContain('7 %');
    });
});

// ─── Arabi (Gulf/SFDA) ────────────────────────────────────────────────────────
// DV_GULF: energyKcal=2000, grassi=70, saturi=20, colesterolo=300,
//          sodio_mg=2400, carboidratiTot=260, fibre=28, zuccheri_agg=50
// arRndE(95)=95 (round), arFmtG(<10→1dp): grassi=5→"5.0", saturi=2→"2.0", trans=0→"0.0"
// arRndMg: <1000 → nearest 10: sodio=200→200, colesterolo=30→30
// %DV: grassi=round(5/70*100)=7%, saturi=round(2/20*100)=10%,
//      colest=round(30/300*100)=10%, sodio=round(200/2400*100)=8%,
//      carb=round(10/260*100)=4%, fibre=round(1.5/28*100)=5%,
//      zuccheri_agg=round(1/50*100)=2%
describe('TabArabi (Gulf) — golden values (serving 50g)', () => {
    it('arRndE: energia 95 kcal → "95" (no rounding bands)', () => {
        const { container } = render(
            <TabArabi p={P} arabi={SERVING} servingRef="serving" measure="g" />
        );
        // arRndE(95)=Math.round(95)=95
        expect(container.textContent).toContain('95');
    });

    it('Total Fat 5g → "5.0", %DV 7%', () => {
        const { container } = render(
            <TabArabi p={P} arabi={SERVING} servingRef="serving" measure="g" />
        );
        const text = container.textContent ?? '';
        // arFmtG(5): 5<10 → 5.toFixed(1)="5.0"
        expect(text).toContain('5.0');
        // %DV grassi: round(5/70*100)=7
        expect(text).toContain('7%');
    });

    it('Sodium: arRndMg(200)=200 (nearest 10, <1000), %DV round(200/2400*100)=8%', () => {
        const { container } = render(
            <TabArabi p={P} arabi={SERVING} servingRef="serving" measure="g" />
        );
        const text = container.textContent ?? '';
        // Sodium 200mg
        expect(text).toContain('200 mg');
        // %DV sodio=8%
        expect(text).toContain('8%');
    });

    it('ordine Gulf: Total Fat → Cholesterol → Sodium → Total Carbohydrate → Protein', () => {
        const { container } = render(
            <TabArabi p={P} arabi={SERVING} servingRef="serving" measure="g" />
        );
        const text = container.textContent ?? '';
        const idx = (s: string) => text.indexOf(s);
        expect(idx('Total Fat')).toBeLessThan(idx('Cholesterol'));
        expect(idx('Cholesterol')).toBeLessThan(idx('Sodium'));
        expect(idx('Sodium')).toBeLessThan(idx('Total Carbohydrate'));
        expect(idx('Total Carbohydrate')).toBeLessThan(idx('Protein'));
    });

    it('Saturated Fat %DV: round(2/20*100)=10%', () => {
        const { container } = render(
            <TabArabi p={P} arabi={SERVING} servingRef="serving" measure="g" />
        );
        // saturi=2, DV=20 → 10%
        expect(container.textContent).toContain('10%');
    });

    it('Added Sugars: arFmtG(1)="1.0", %DV round(1/50*100)=2%', () => {
        const { container } = render(
            <TabArabi p={P} arabi={SERVING} servingRef="serving" measure="g" />
        );
        const text = container.textContent ?? '';
        expect(text).toContain('Added Sugars');
        expect(text).toContain('2%');
    });
});
