import type { ContractEntry } from '../../types/contractResearch';

/**
 * Authoritative helper to determine whether a contract entry is editable by Staff.
 *
 * Canonical editable statuses:
 * - DRAFT: Initial authoring state.
 * - CHANGES_REQUESTED: Manager revision state returned to Staff for corrections.
 *
 * Read-only statuses:
 * - PENDING_REVIEW: Currently under Manager review.
 * - APPROVED: Finalized and frozen.
 * - null / undefined: Unspecified, not editable.
 */
export function isContractEditableByStaff(
  contract?: ContractEntry | null
): boolean {
  if (!contract) return false;
  return (
    contract.reviewStatus === 'DRAFT' ||
    contract.reviewStatus === 'CHANGES_REQUESTED'
  );
}
