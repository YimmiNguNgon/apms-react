import type {
  KeyResultReferenceResponse,
  ProfileResponse,
  ProjectType,
  RelationshipType,
  RelationshipTypeOption,
} from '../types/domain';

/**
 * Standard Project Deliverable types in deterministic display order
 */
export const DELIVERABLE_DISPLAY_ORDER = [
  'BASIC_COMPANY_INFORMATION',
  'FINANCIAL_INFORMATION',
  'MANAGEMENT_MEMBERS',
  'CONTRACT_INFORMATION',
];

/**
 * Deliverables available for Existing Company Update projects
 */
export const EXISTING_COMPANY_DELIVERABLE_TYPES = [
  'FINANCIAL_INFORMATION',
  'CONTRACT_INFORMATION',
];

/**
 * Standard Relationship Type Options with display labels
 */
export const RELATIONSHIP_OPTIONS: RelationshipTypeOption[] = [
  { value: 'PARTNER_WITH', label: 'Partner' },
  { value: 'COMPETITOR_OF', label: 'Competitor' },
  { value: 'SUPPLIER_OF', label: 'Supplier' },
  { value: 'CUSTOMER_OF', label: 'Customer' },
  { value: 'POTENTIAL_PARTNER_OF', label: 'Potential partner' },
];

/**
 * Relationship types that support Contract Information
 */
export const CONTRACT_ELIGIBLE_RELATIONSHIPS: RelationshipType[] = [
  'PARTNER_WITH',
  'CUSTOMER_OF',
  'SUPPLIER_OF',
];

export const isRelationshipContractEligible = (rel: RelationshipType | null | undefined): boolean => {
  return !!rel && CONTRACT_ELIGIBLE_RELATIONSHIPS.includes(rel);
};

export const normalizeRelationshipInput = (input?: string | null): RelationshipType | null => {
  if (!input) return null;
  const normalized = input.trim().toLowerCase().replace(/_/g, ' ');
  if (!normalized) return null;

  const aliases: Record<string, RelationshipType> = {
    partner: 'PARTNER_WITH',
    'partner with': 'PARTNER_WITH',
    competitor: 'COMPETITOR_OF',
    'competitor of': 'COMPETITOR_OF',
    supplier: 'SUPPLIER_OF',
    'supplier of': 'SUPPLIER_OF',
    customer: 'CUSTOMER_OF',
    'customer of': 'CUSTOMER_OF',
    'potential partner': 'POTENTIAL_PARTNER_OF',
    'potential partner of': 'POTENTIAL_PARTNER_OF',
    investor: 'POTENTIAL_PARTNER_OF',
  };
  if (aliases[normalized]) return aliases[normalized];

  const matched = RELATIONSHIP_OPTIONS.find((option) =>
    option.label.toLowerCase() === normalized ||
    option.value.toLowerCase() === normalized ||
    option.value.toLowerCase().replace(/_/g, ' ') === normalized
  );

  return matched?.value ?? null;
};

export const getProfileCanonicalRelationship = (profile?: ProfileResponse | null): RelationshipType | null => {
  if (!profile) return null;
  const raw = (profile as unknown as Record<string, unknown>).relationshipType ||
              (profile as unknown as Record<string, unknown>).relationship ||
              (profile as unknown as Record<string, unknown>).suggestedRelationshipType;
  if (!raw) return null;

  const relStr = String(raw).trim().toUpperCase();
  switch (relStr) {
    case 'COMPETITOR':
    case 'COMPETITOR_OF':
      return 'COMPETITOR_OF';
    case 'PARTNER':
    case 'PARTNER_WITH':
      return 'PARTNER_WITH';
    case 'SUPPLIER':
    case 'SUPPLIER_OF':
      return 'SUPPLIER_OF';
    case 'CUSTOMER':
    case 'CUSTOMER_OF':
      return 'CUSTOMER_OF';
    case 'POTENTIAL_PARTNER':
    case 'POTENTIAL_PARTNER_OF':
    case 'POTENTIAL PARTNER':
    case 'POTENTIAL PARTNER OF':
    case 'INVESTOR':
      return 'POTENTIAL_PARTNER_OF';
    default:
      return normalizeRelationshipInput(String(raw));
  }
};

export const profileName = (profile?: ProfileResponse | null): string => {
  if (!profile) return '';
  return profile.identity?.tradeName || profile.identity?.legalName || profile.companyId || '';
};

export const findCompanyProfile = (options: ProfileResponse[], targetId?: string | null): ProfileResponse | null => {
  if (!targetId) return null;
  return options.find((item) => (item.companyId && item.companyId === targetId) || (item.id && item.id === targetId)) || null;
};

export const isContractRequired = (
  currentRel: RelationshipType | null | undefined,
  targetRel: RelationshipType | null | undefined
): boolean => {
  if (!currentRel || !targetRel) return false;
  return currentRel !== targetRel && isRelationshipContractEligible(targetRel);
};

export const isDeliverableMandatory = (
  type: string,
  projectType: ProjectType = 'RESEARCH_NEW_COMPANY',
  isContractMandatory: boolean = false,
): boolean => {
  if (projectType === 'RESEARCH_NEW_COMPANY' && type === 'BASIC_COMPANY_INFORMATION') {
    return true;
  }
  if (type === 'CONTRACT_INFORMATION' && isContractMandatory) {
    return true;
  }
  return false;
};

export const getDeliverableMandatoryReason = (
  type: string,
  projectType: ProjectType = 'RESEARCH_NEW_COMPANY',
  isContractMandatory: boolean = false,
  currentRelLabel?: string,
  targetRelLabel?: string,
): string | null => {
  if (projectType === 'RESEARCH_NEW_COMPANY' && type === 'BASIC_COMPANY_INFORMATION') {
    return 'Required for New Company Research projects';
  }
  if (type === 'CONTRACT_INFORMATION' && isContractMandatory) {
    return `Required for relationship change: ${currentRelLabel || ''} \u2192 ${targetRelLabel || ''}`;
  }
  return null;
};

export const filterAndRebalanceDeliverables = (
  currentKrs: Array<{ type: string; weight: number }>,
  targetRel: RelationshipType | null,
  krRefs: KeyResultReferenceResponse[] = [],
  projectType: ProjectType = 'RESEARCH_NEW_COMPANY',
  isContractMandatory: boolean = false,
): Array<{ type: string; weight: number }> => {
  let filtered = currentKrs.filter((kr) => {
    if (projectType === 'UPDATE_EXISTING_COMPANY') {
      return EXISTING_COMPANY_DELIVERABLE_TYPES.includes(kr.type);
    }
    return true;
  });

  filtered = filtered.filter((kr) => {
    if (kr.type === 'CONTRACT_INFORMATION') {
      if (!isRelationshipContractEligible(targetRel)) return false;
      if (isContractMandatory) return true;
    }
    if (!targetRel) return true;
    const ref = krRefs.find((r) => r.type === kr.type);
    return !ref || ref.supportedRelationshipTypes.length === 0 || ref.supportedRelationshipTypes.includes(targetRel);
  });

  if (projectType === 'RESEARCH_NEW_COMPANY' && !filtered.some((kr) => kr.type === 'BASIC_COMPANY_INFORMATION')) {
    filtered.push({ type: 'BASIC_COMPANY_INFORMATION', weight: 0 });
  }

  if (isContractMandatory && isRelationshipContractEligible(targetRel) && !filtered.some((kr) => kr.type === 'CONTRACT_INFORMATION')) {
    filtered.push({ type: 'CONTRACT_INFORMATION', weight: 0 });
  }

  return balanceDeliverableWeights(filtered);
};

/**
 * Automatically distribute total 100% weight equally across selected deliverables.
 * Uses deterministic integer balancing:
 * base = floor(100 / N)
 * remainder = 100 % N
 * The remainder is assigned to the LAST item in the deterministic display order.
 */
export function balanceDeliverableWeights<T extends { type: string; weight: number }>(
  items: T[],
  orderedTypes: string[] = DELIVERABLE_DISPLAY_ORDER
): T[] {
  if (!items || items.length === 0) {
    return [];
  }

  const n = items.length;
  const base = Math.floor(100 / n);
  const remainder = 100 % n;

  // Sort according to deterministic display order
  const sorted = [...items].sort((a, b) => {
    const idxA = orderedTypes.indexOf(a.type);
    const idxB = orderedTypes.indexOf(b.type);
    const orderA = idxA === -1 ? 999 : idxA;
    const orderB = idxB === -1 ? 999 : idxB;
    return orderA - orderB;
  });

  return sorted.map((item, index) => {
    // Assign remainder to the last selected item
    const isLast = index === n - 1;
    return {
      ...item,
      weight: base + (isLast ? remainder : 0),
    };
  });
}

/**
 * Returns today's local date formatted as YYYY-MM-DD (avoiding UTC shift).
 */
export const getLocalTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Normalizes date string (ISO YYYY-MM-DD or DD/MM/YYYY) to YYYY-MM-DD.
 */
export const normalizeToIsoDate = (value?: string | null): string => {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      // DD/MM/YYYY -> YYYY-MM-DD
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
  }
  return trimmed.substring(0, 10);
};

/**
 * Validates whether a project due date is today or in the future.
 * Returns null if valid (or empty), or an error message if earlier than today.
 */
export const validateProjectDueDate = (dueDate?: string | null): string | null => {
  if (!dueDate || !dueDate.trim()) return null;
  const isoDate = normalizeToIsoDate(dueDate);
  const todayStr = getLocalTodayDateString();
  if (isoDate && isoDate < todayStr) {
    return 'Due Date cannot be earlier than today.';
  }
  return null;
};


