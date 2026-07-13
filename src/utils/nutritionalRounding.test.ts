import { describe, it, expect } from 'vitest';
import {
    rCA_energy, rCA_fat, rCA_carb, rCA_chol, rCA_na, rCA_iron, rCA_pct,
    rAU_kj, rAU_kcal, rAU_g1, rAU_mg,
    rArabi_energy, rArabi_g, rArabi_mg,
} from './nutritionalRounding';

describe('Canada — rCA_energy', () => {
    it('< 5 → 0', () => expect(rCA_energy(4.9)).toBe('0'));
    it('5 exactly → 5', () => expect(rCA_energy(5)).toBe('5'));
    it('≤ 50: rounds to nearest 5', () => expect(rCA_energy(23)).toBe('25'));
    it('> 50: rounds to nearest 10', () => expect(rCA_energy(53)).toBe('50'));
    it('boundary 50 → 50', () => expect(rCA_energy(50)).toBe('50'));
});

describe('Canada — rCA_fat', () => {
    it('< 0.5 → 0', () => expect(rCA_fat(0.4)).toBe('0'));
    it('≤ 5: rounds to nearest 0.5', () => expect(rCA_fat(2.3)).toBe('2.5'));
    it('> 5: rounds to nearest 1', () => expect(rCA_fat(6.4)).toBe('6'));
});

describe('Canada — rCA_carb', () => {
    it('< 0.5 → 0', () => expect(rCA_carb(0.4)).toBe('0'));
    it('≥ 0.5 → rounded', () => expect(rCA_carb(3.7)).toBe('4'));
});

describe('Canada — rCA_chol', () => {
    it('< 2 → 0', () => expect(rCA_chol(1.9)).toBe('0'));
    it('2–5 → less than 5', () => expect(rCA_chol(3)).toBe('less than 5'));
    it('> 5 → rounded', () => expect(rCA_chol(12)).toBe('12'));
});

describe('Canada — rCA_na', () => {
    it('< 5 → 0', () => expect(rCA_na(4)).toBe('0'));
    it('5–140: rounds to nearest 5', () => expect(rCA_na(83)).toBe('85'));
    it('> 140: rounds to nearest 10', () => expect(rCA_na(155)).toBe('160'));
});

describe('Canada — rCA_iron', () => {
    it('< 0.05 → 0', () => expect(rCA_iron(0.04)).toBe('0'));
    it('≥ 0.05 → 1 decimal', () => expect(rCA_iron(1.23)).toBe('1.2'));
});

describe('Canada — rCA_pct', () => {
    it('calculates %DV', () => expect(rCA_pct(10, 100)).toBe('10'));
    it('rounds to nearest integer', () => expect(rCA_pct(5, 78)).toBe('6'));
});

describe('Australia — rAU_kj', () => {
    it('< 40 → less than 40', () => expect(rAU_kj(39)).toBe('less than 40'));
    it('≥ 40 → rounded', () => expect(rAU_kj(420)).toBe('420'));
});

describe('Australia — rAU_kcal', () => {
    it('< 9.5 → less than 9.5', () => expect(rAU_kcal(9)).toBe('less than 9.5'));
    it('≥ 9.5 → rounded', () => expect(rAU_kcal(100)).toBe('100'));
});

describe('Australia — rAU_g1', () => {
    it('< 1 → less than 1', () => expect(rAU_g1(0.5)).toBe('less than 1'));
    it('≥ 1 → 1 decimal', () => expect(rAU_g1(3.75)).toBe('3.8'));
});

describe('Australia — rAU_mg', () => {
    it('< 5 → less than 5', () => expect(rAU_mg(4)).toBe('less than 5'));
    it('≥ 5 → rounded', () => expect(rAU_mg(120)).toBe('120'));
});

describe('Arabi — rounding', () => {
    it('rArabi_energy rounds integer', () => expect(rArabi_energy(250.6)).toBe('251'));
    it('rArabi_g < 0.1 → 0', () => expect(rArabi_g(0.09)).toBe('0'));
    it('rArabi_g ≥ 0.1 → 1 decimal', () => expect(rArabi_g(1.25)).toBe('1.3'));
    it('rArabi_mg rounds integer', () => expect(rArabi_mg(45.8)).toBe('46'));
});
