export interface ContractDateErrors {
  effectiveDate?: string;
  expiryDate?: string;
}

/**
 * Validates contract date relationships:
 * 1. Effective Date >= Signing Date
 * 2. Expiry Date > Effective Date (strictly greater)
 *
 * Preserves field optionality: only validates when both dates being compared are present.
 * Uses ISO date-only strings (YYYY-MM-DD) avoiding timezone conversion shifts.
 */
export function validateContractDates(dates: {
  signingDate?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}): ContractDateErrors {
  const errors: ContractDateErrors = {};

  const sign = dates.signingDate ? String(dates.signingDate).trim().substring(0, 10) : '';
  const eff = dates.effectiveDate ? String(dates.effectiveDate).trim().substring(0, 10) : '';
  const exp = dates.expiryDate ? String(dates.expiryDate).trim().substring(0, 10) : '';

  // Rule 1: Effective Date >= Signing Date
  if (sign && eff) {
    if (eff < sign) {
      errors.effectiveDate = 'Ngày hiệu lực phải bằng hoặc sau ngày ký.';
    }
  }

  // Rule 2: Expiry Date > Effective Date (Strictly greater)
  if (eff && exp) {
    if (exp <= eff) {
      errors.expiryDate = 'Ngày hết hạn phải sau ngày hiệu lực.';
    }
  }

  return errors;
}
