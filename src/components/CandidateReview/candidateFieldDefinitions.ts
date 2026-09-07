export type CandidateCategoryTab = 'Identity' | 'Business' | 'Markets' | 'Products';

export interface CandidateFieldDefinition {
  key: string;
  label: string;
  section: CandidateCategoryTab;
  staffEditable: boolean;
  managerReviewable: boolean;
}

export const CANONICAL_FIELD_DEFINITIONS: CandidateFieldDefinition[] = [
  // Identity (Legal Name and Tax Code are project-target controlled, not staff/manager research fields)
  { key: 'identity.legalName', label: 'Legal Name', section: 'Identity', staffEditable: false, managerReviewable: false },
  { key: 'identity.tradeName', label: 'Trade Name', section: 'Identity', staffEditable: true, managerReviewable: true },
  { key: 'identity.taxCode', label: 'Tax Code', section: 'Identity', staffEditable: false, managerReviewable: false },
  { key: 'contact.website', label: 'Website', section: 'Identity', staffEditable: true, managerReviewable: true },
  { key: 'contact.address', label: 'Address', section: 'Identity', staffEditable: true, managerReviewable: true },
  { key: 'contact.emails', label: 'Emails', section: 'Identity', staffEditable: true, managerReviewable: true },
  { key: 'contact.phones', label: 'Phones', section: 'Identity', staffEditable: true, managerReviewable: true },

  // Business
  { key: 'business.businessModel', label: 'Business Model', section: 'Business', staffEditable: true, managerReviewable: true },
  { key: 'business.industries', label: 'Industries', section: 'Business', staffEditable: true, managerReviewable: true },
  { key: 'companySize.employeeTier', label: 'Employee Tier', section: 'Business', staffEditable: true, managerReviewable: true },
  { key: 'companySize.employeeCount', label: 'Employee Count', section: 'Business', staffEditable: true, managerReviewable: true },
  { key: 'companySize.revenueTier', label: 'Revenue Tier', section: 'Business', staffEditable: true, managerReviewable: true },

  // Markets
  { key: 'business.markets', label: 'Markets (Regions)', section: 'Markets', staffEditable: true, managerReviewable: true },
  { key: 'business.targetCustomers', label: 'Target Customers', section: 'Markets', staffEditable: true, managerReviewable: true },

  // Products
  { key: 'business.products', label: 'Products & Services', section: 'Products', staffEditable: true, managerReviewable: true },
];

export const CANDIDATE_FIELD_GROUPS: Record<CandidateCategoryTab, CandidateFieldDefinition[]> = {
  Identity: CANONICAL_FIELD_DEFINITIONS.filter(f => f.section === 'Identity' && (f.staffEditable || f.managerReviewable)),
  Business: CANONICAL_FIELD_DEFINITIONS.filter(f => f.section === 'Business' && (f.staffEditable || f.managerReviewable)),
  Markets: CANONICAL_FIELD_DEFINITIONS.filter(f => f.section === 'Markets' && (f.staffEditable || f.managerReviewable)),
  Products: CANONICAL_FIELD_DEFINITIONS.filter(f => f.section === 'Products' && (f.staffEditable || f.managerReviewable)),
};

export const CANDIDATE_TABS: CandidateCategoryTab[] = ['Identity', 'Business', 'Markets', 'Products'];

/**
 * Normalizes a candidate field value for semantic comparison.
 * Returns null if the value is semantically empty.
 */
export function normalizeCandidateFieldValue(val: unknown): unknown {
  if (val === null || val === undefined) {
    return null;
  }

  // String
  if (typeof val === 'string') {
    const trimmed = val.trim();
    return trimmed === '' ? null : trimmed;
  }

  // Number
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }

  // Boolean
  if (typeof val === 'boolean') {
    return val;
  }

  // Array
  if (Array.isArray(val)) {
    const normalizedItems = val
      .map((item) => normalizeCandidateFieldValue(item))
      .filter((item) => item !== null);

    return normalizedItems.length === 0 ? null : normalizedItems;
  }

  // Object
  if (typeof val === 'object') {
    const normalizedObj: Record<string, unknown> = {};
    let hasMeaningfulProp = false;

    for (const [k, v] of Object.entries(val)) {
      const normV = normalizeCandidateFieldValue(v);
      if (normV !== null) {
        normalizedObj[k] = normV;
        hasMeaningfulProp = true;
      }
    }

    return hasMeaningfulProp ? normalizedObj : null;
  }

  return val;
}

/**
 * Deeply compares two candidate field values after semantic normalization.
 * Returns true if both values are semantically equal.
 */
export function areCandidateFieldValuesEqual(a: unknown, b: unknown): boolean {
  const normA = normalizeCandidateFieldValue(a);
  const normB = normalizeCandidateFieldValue(b);

  if (normA === null && normB === null) {
    return true;
  }
  if (normA === null || normB === null) {
    return false;
  }

  if (typeof normA !== typeof normB) {
    return false;
  }

  if (Array.isArray(normA) && Array.isArray(normB)) {
    if (normA.length !== normB.length) return false;
    const isPrimitiveArray = normA.every((item) => typeof item === 'string' || typeof item === 'number');
    if (isPrimitiveArray && normB.every((item) => typeof item === 'string' || typeof item === 'number')) {
      const sortedA = [...normA].sort();
      const sortedB = [...normB].sort();
      return sortedA.every((val, idx) => val === sortedB[idx]);
    }

    for (let i = 0; i < normA.length; i++) {
      if (!areCandidateFieldValuesEqual(normA[i], normB[i])) {
        return false;
      }
    }
    return true;
  }

  if (typeof normA === 'object' && typeof normB === 'object') {
    const keysA = Object.keys(normA as Record<string, unknown>).sort();
    const keysB = Object.keys(normB as Record<string, unknown>).sort();
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (key !== keysB[i]) return false;
      if (!areCandidateFieldValuesEqual(
        (normA as Record<string, unknown>)[key],
        (normB as Record<string, unknown>)[key]
      )) {
        return false;
      }
    }
    return true;
  }

  return normA === normB;
}

/**
 * Determines if a field was edited by staff based purely on value difference.
 * Returns true ONLY when the submitted semantic value differs from the original.
 */
export function isCandidateFieldEdited(originalValue: unknown, submittedValue: unknown): boolean {
  return !areCandidateFieldValuesEqual(originalValue, submittedValue);
}
