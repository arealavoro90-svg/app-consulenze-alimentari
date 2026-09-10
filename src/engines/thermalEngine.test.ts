import { describe, it, expect } from 'vitest';
import { calculateF0 } from './thermalEngine';
import type { ThermalInput } from './thermalEngine';

describe('calculateF0', () => {
    it('returns zero F0 with less than 2 data points', () => {
        const input: ThermalInput = {
            dataPoints: [{ time: 0, temperature: 121.1 }],
            zValue: 10,
            tRef: 121.1,
        };
        const result = calculateF0(input);
        expect(result.f0).toBe(0);
        expect(result.isAdequate).toBe(false);
        expect(result.lethalityRate).toEqual([]);
    });

    it('returns zero F0 with empty data points', () => {
        const input: ThermalInput = { dataPoints: [], zValue: 10, tRef: 121.1 };
        const result = calculateF0(input);
        expect(result.f0).toBe(0);
        expect(result.isAdequate).toBe(false);
    });

    it('calculates F0 correctly at constant Tref (L=1 always)', () => {
        // At T=Tref, L=10^0=1 at every point. Trapezoidal over 3 min = 3.
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 121.1 },
                { time: 1, temperature: 121.1 },
                { time: 2, temperature: 121.1 },
                { time: 3, temperature: 121.1 },
            ],
            zValue: 10,
            tRef: 121.1,
            targetF0: 3,
        };
        const result = calculateF0(input);
        expect(result.f0).toBe(3);
        expect(result.isAdequate).toBe(true);
        expect(result.maxTemperature).toBe(121.1);
        expect(result.processTime).toBe(3);
    });

    it('isAdequate false when F0 < targetF0', () => {
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 121.1 },
                { time: 1, temperature: 121.1 },
            ],
            zValue: 10,
            tRef: 121.1,
            targetF0: 3,
        };
        const result = calculateF0(input);
        expect(result.f0).toBe(1);
        expect(result.isAdequate).toBe(false);
    });

    it('uses default targetF0=3 when not specified', () => {
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 121.1 },
                { time: 5, temperature: 121.1 },
            ],
            zValue: 10,
            tRef: 121.1,
        };
        const result = calculateF0(input);
        expect(result.targetF0).toBe(3);
        expect(result.isAdequate).toBe(true); // F0=5 >= 3
    });

    it('lethality rate is lower below Tref', () => {
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 111.1 },  // T = Tref - 10 → L = 10^(-1) = 0.1
                { time: 1, temperature: 111.1 },
            ],
            zValue: 10,
            tRef: 121.1,
        };
        const result = calculateF0(input);
        expect(result.lethalityRate[0]).toBeCloseTo(0.1, 4);
        expect(result.f0).toBeCloseTo(0.1, 2);
    });

    it('lethality rate is higher above Tref', () => {
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 131.1 },  // T = Tref + 10 → L = 10^1 = 10
                { time: 1, temperature: 131.1 },
            ],
            zValue: 10,
            tRef: 121.1,
        };
        const result = calculateF0(input);
        expect(result.lethalityRate[0]).toBeCloseTo(10, 4);
        expect(result.f0).toBeCloseTo(10, 2);
    });

    it('trapezoidal integration handles non-uniform time steps', () => {
        // L=1 everywhere, steps 0→2→3. Area = 1*2 + 1*1 = 3.
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 121.1 },
                { time: 2, temperature: 121.1 },
                { time: 3, temperature: 121.1 },
            ],
            zValue: 10,
            tRef: 121.1,
        };
        const result = calculateF0(input);
        expect(result.f0).toBe(3);
        expect(result.processTime).toBe(3);
    });

    it('maxTemperature returns peak across all points', () => {
        const input: ThermalInput = {
            dataPoints: [
                { time: 0, temperature: 100 },
                { time: 1, temperature: 135 },
                { time: 2, temperature: 110 },
            ],
            zValue: 10,
            tRef: 121.1,
        };
        const result = calculateF0(input);
        expect(result.maxTemperature).toBe(135);
    });
});
