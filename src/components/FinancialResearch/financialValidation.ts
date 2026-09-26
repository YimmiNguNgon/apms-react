/**
 * Shared financial numeric validation and parsing utilities for Financial Manual Entry.
 *
 * Strict format rules:
 * - Allows optional negative sign (-)
 * - Allows plain digits or formatted thousands separators:
 *   e.g. 100, -100, 1000, 1,000, 1,000,000
 * - Requires leading digit before decimal point (0.5 is valid, .5 is rejected)
 * - Allows optional decimal point and decimal digits:
 *   e.g. 12.5, -12.5, 1,234.56, -1,234.56
 * - Rejects malformed comma placement: 1,2,3 / 12,,34 / 1,00,000 / ,100 / 100,
 * - Rejects alphabetic text, mixed currency, scientific notation, and non-finite numbers
 */

export const FINANCIAL_NUMBER_REGEX = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;

export const FINANCIAL_NUMERIC_ERROR_MESSAGE = 'Value must be a valid number.';

export interface ParsedFinancialValue {
  entered: boolean;
  valid: boolean;
  normalizedString?: string;
  error?: string | null;
}

/**
 * Parses and validates a user-entered financial metric value.
 *
 * Semantic behavior:
 * - null / undefined / "" -> entered: false, valid: true (sparse, unentered)
 * - 0 / "0" -> entered: true, valid: true, normalizedString: "0" (valid explicit zero)
 * - "1,250.50" -> entered: true, valid: true, normalizedString: "1250.50"
 * - "12 million" -> entered: true, valid: false, error: "Value must be a valid number."
 */
export function parseFinancialValue(value: string | number | null | undefined): ParsedFinancialValue {
  if (value === null || value === undefined || typeof value === 'boolean') {
    return {
      entered: false,
      valid: true,
      error: null,
    };
  }

  const rawStr = String(value).trim();
  if (rawStr === '') {
    return {
      entered: false,
      valid: true,
      error: null,
    };
  }

  // Value is entered (non-empty string)
  if (!FINANCIAL_NUMBER_REGEX.test(rawStr)) {
    return {
      entered: true,
      valid: false,
      error: FINANCIAL_NUMERIC_ERROR_MESSAGE,
    };
  }

  // Normalized decimal string without thousands separators
  const normalizedString = rawStr.replace(/,/g, '');

  return {
    entered: true,
    valid: true,
    normalizedString,
    error: null,
  };
}

/**
 * Convenience helper to check if a financial value has been entered (non-blank).
 * Explicit 0 or "0" returns true.
 */
export function isFinancialValueEntered(value: string | number | null | undefined): boolean {
  return parseFinancialValue(value).entered;
}

/**
 * Convenience helper to check if a financial value is valid.
 * Blank/unentered returns true; entered non-numeric returns false.
 */
export function isValidFinancialValue(value: string | number | null | undefined): boolean {
  return parseFinancialValue(value).valid;
}
