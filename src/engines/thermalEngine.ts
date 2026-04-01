// Thermal Treatment Engine — F0 Lethality Index
// Based on Bigelow model for sterilization/pasteurization
// F0 = integral of 10^((T-Tref)/z) dt

export interface ThermalDataPoint {
    time: number;       // minutes
    temperature: number; // °C
}

export interface ThermalInput {
    dataPoints: ThermalDataPoint[];
    zValue: number;          // °C (default 10 for sterilization)
    tRef: number;            // °C (121.1°C for sterilization, 70°C for pasteurization)
    targetF0?: number;       // target F0 value (e.g., 3 for low-acid foods)
}

export interface ThermalResult {
    f0: number;              // minutes
    isAdequate: boolean;
    targetF0: number;
    maxTemperature: number;
    processTime: number;     // total time in minutes
    lethalityRate: number[]; // L values for each data point
}

// Trapezoidal numerical integration
export function calculateF0(input: ThermalInput): ThermalResult {
    const { dataPoints, zValue, tRef, targetF0 = 3 } = input;

    if (dataPoints.length < 2) {
        return {
            f0: 0,
            isAdequate: false,
            targetF0,
            maxTemperature: 0,
            processTime: 0,
            lethalityRate: [],
        };
    }

    // Calculate lethality rate L(t) = 10^((T-Tref)/z) for each point
    const lethalityRate = dataPoints.map((pt) =>
        Math.pow(10, (pt.temperature - tRef) / zValue)
    );

    // Trapezoidal integration
    let f0 = 0;
    for (let i = 1; i < dataPoints.length; i++) {
        const dt = dataPoints[i].time - dataPoints[i - 1].time; // minutes
        f0 += ((lethalityRate[i] + lethalityRate[i - 1]) / 2) * dt;
    }

    const maxTemperature = Math.max(...dataPoints.map((pt) => pt.temperature));
    const processTime = dataPoints[dataPoints.length - 1].time - dataPoints[0].time;

    return {
        f0: Math.round(f0 * 100) / 100,
        isAdequate: f0 >= targetF0,
        targetF0,
        maxTemperature,
        processTime,
        lethalityRate: lethalityRate.map((l) => Math.round(l * 10000) / 10000),
    };
}
