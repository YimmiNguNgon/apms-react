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
