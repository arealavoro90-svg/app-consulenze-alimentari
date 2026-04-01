/**
 * Input validation utilities for nutritional app
 * Ensures data integrity before calculations
 */

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validates numeric input for quantity/weight fields
 * @param value - The numeric value to validate
 * @param fieldName - Name of field for error message
 * @param options - Min/max bounds, allow zero
 */
export function validatePositiveNumber(
    value: unknown,
    fieldName: string = 'Value',
    options: { min?: number; max?: number; allowZero?: boolean } = {}
): ValidationResult {
    const { min = 0, max = 1_000_000, allowZero = false } = options;

    const num = Number(value);

    // Check if valid number
    if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, error: `${fieldName} deve essere un numero valido` };
    }

    // Check zero constraint
    if (!allowZero && num === 0) {
        return { isValid: false, error: `${fieldName} non può essere 0` };
    }

    // Check min
    if (num < min) {
        return { isValid: false, error: `${fieldName} non può essere minore di ${min}` };
    }

    // Check max
    if (num > max) {
        return { isValid: false, error: `${fieldName} non può superare ${max}` };
    }

    return { isValid: true };
}

/**
 * Validates percentage values (0-100)
 */
export function validatePercentage(
    value: unknown,
    fieldName: string = 'Percentuale'
): ValidationResult {
    const num = Number(value);

    if (isNaN(num) || !isFinite(num)) {
        return { isValid: false, error: `${fieldName} deve essere un numero valido` };
    }

    if (num < 0 || num > 100) {
        return { isValid: false, error: `${fieldName} deve essere tra 0 e 100` };
    }

    return { isValid: true };
}

/**
 * Validates text/string input
 */
export function validateString(
    value: unknown,
    fieldName: string = 'Testo',
    options: { minLength?: number; maxLength?: number; required?: boolean } = {}
): ValidationResult {
    const { minLength = 1, maxLength = 500, required = true } = options;

    const str = String(value || '').trim();

    if (required && str.length === 0) {
        return { isValid: false, error: `${fieldName} è obbligatorio` };
    }

    if (str.length > 0 && str.length < minLength) {
        return { isValid: false, error: `${fieldName} deve avere almeno ${minLength} caratteri` };
    }

    if (str.length > maxLength) {
        return { isValid: false, error: `${fieldName} non può superare ${maxLength} caratteri` };
    }

    return { isValid: true };
}

/**
 * Validates cooking loss percentage (realistic range)
 */
export function validateCookingLoss(value: unknown): ValidationResult {
    return validatePercentage(value, 'Perdita cottura');
}

/**
 * Validates ingredient quantity in grams
 */
export function validateIngredientQuantity(value: unknown, ingredientName: string = 'Ingrediente'): ValidationResult {
    return validatePositiveNumber(value, `Quantità ${ingredientName}`, {
        min: 0.1,
        max: 100_000,
        allowZero: false,
    });
}

/**
 * Validates number of pieces/units
 */
export function validatePieces(value: unknown, fieldName: string = 'Pezzi'): ValidationResult {
    return validatePositiveNumber(value, fieldName, { min: 1, max: 10_000 });
}

/**
 * Validates finished product weight (peso finito)
 */
export function validateFinishedWeight(value: unknown): ValidationResult {
    return validatePositiveNumber(value, 'Peso finito', {
        min: 0,
        max: 100_000,
        allowZero: true,
    });
}

/**
 * Validates serving size
 */
export function validateServingSize(value: unknown, fieldName: string = 'Porzione'): ValidationResult {
    return validatePositiveNumber(value, fieldName, {
        min: 0.1,
        max: 1000,
        allowZero: false,
    });
}

/**
 * Validates cost value (€, $, etc)
 */
export function validateCost(value: unknown, currency: string = '€'): ValidationResult {
    return validatePositiveNumber(value, `Costo (${currency})`, {
        min: 0,
        max: 1_000_000,
        allowZero: true,
    });
}

/**
 * Validates temperature value (°C)
 */
export function validateTemperature(value: unknown): ValidationResult {
    return validatePositiveNumber(value, 'Temperatura (°C)', {
        min: -50,
        max: 200,
    });
}

/**
 * Validates time duration in minutes
 */
export function validateDuration(value: unknown, fieldName: string = 'Durata (min)'): ValidationResult {
    return validatePositiveNumber(value, fieldName, {
        min: 0,
        max: 10_000,
        allowZero: false,
    });
}

/**
 * Batch validation for multiple fields
 */
export function validateBatch(
    validations: Array<[unknown, (v: unknown) => ValidationResult]>
): ValidationResult {
    for (const [value, validator] of validations) {
        const result = validator(value);
        if (!result.isValid) {
            return result;
        }
    }
    return { isValid: true };
}
