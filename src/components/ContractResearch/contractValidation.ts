export interface ContractDateErrors {
  signingDate?: string;
  effectiveDate?: string;
  expiryDate?: string;
}

/**
 * Validates contract date relationships:
 * 1. Signing Date >= Document Date
 * 2. Effective Date >= Signing Date
 * 3. Expiry Date > Effective Date (strictly greater)
 *
 * Preserves field optionality: only validates when both dates being compared are present.
 * Uses ISO date-only strings (YYYY-MM-DD) avoiding timezone conversion shifts.
 */
export function validateContractDates(dates: {
  documentDate?: string | null;
  signingDate?: string | null;
  effectiveDate?: string | null;
  expiryDate?: string | null;
}): ContractDateErrors {
  const errors: ContractDateErrors = {};

  const doc = dates.documentDate ? String(dates.documentDate).trim().substring(0, 10) : '';
  const sign = dates.signingDate ? String(dates.signingDate).trim().substring(0, 10) : '';
  const eff = dates.effectiveDate ? String(dates.effectiveDate).trim().substring(0, 10) : '';
  const exp = dates.expiryDate ? String(dates.expiryDate).trim().substring(0, 10) : '';

  // Rule 0: Signing Date >= Document Date
  if (doc && sign) {
    if (sign < doc) {
      errors.signingDate = 'Ngày ký không được trước ngày tài liệu/văn bản.';
    }
  }

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

export type PartyTaxCodeErrors = Record<number, string>;

/**
 * Validates Tax Codes for contracting parties:
 * 1. Optional field: empty tax codes are allowed and not considered duplicates.
 * 2. Digits only: if non-empty, must contain only digits 0-9. Leading zeros are preserved.
 * 3. Uniqueness: non-empty normalized (trimmed) tax codes must be unique among parties of the contract.
 *
 * Returns a map of party index to error message.
 */
export function validatePartiesTaxCodes(parties: { taxCode?: string | null }[]): PartyTaxCodeErrors {
  const errors: PartyTaxCodeErrors = {};
  if (!parties || parties.length === 0) return errors;

  const normalizedTaxCodes: { index: number; taxCode: string }[] = [];

  parties.forEach((p, idx) => {
    const raw = p.taxCode;
    if (raw !== null && raw !== undefined) {
      const trimmed = String(raw).trim();
      if (trimmed.length > 0) {
        if (!/^\d+$/.test(trimmed)) {
          errors[idx] = 'Mã số thuế chỉ được chứa chữ số.';
        } else {
          normalizedTaxCodes.push({ index: idx, taxCode: trimmed });
        }
      }
    }
  });

  const taxCodeCounts = new Map<string, number[]>();
  normalizedTaxCodes.forEach(({ index, taxCode }) => {
    const indices = taxCodeCounts.get(taxCode) || [];
    indices.push(index);
    taxCodeCounts.set(taxCode, indices);
  });

  taxCodeCounts.forEach((indices) => {
    if (indices.length > 1) {
      indices.forEach((idx) => {
        if (!errors[idx]) {
          errors[idx] = 'Mã số thuế không được trùng với bên tham gia khác.';
        }
      });
    }
  });

  return errors;
}
