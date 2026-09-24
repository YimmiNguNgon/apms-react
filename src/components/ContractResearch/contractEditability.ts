import type { ContractEntry } from '../../types/contractResearch';

/**
 * Single source of truth helper to check if a contract requires revisions from Manager.
 */
export function isContractChangesRequested(
  contract?: { reviewStatus?: string | null } | null
): boolean {
  if (!contract?.reviewStatus) return false;
  const status = contract.reviewStatus.toUpperCase().trim();
  return (
    status === 'CHANGES_REQUESTED' ||
    status === 'REVISION_REQUIRED' ||
    status === 'NEEDS_REVISION'
  );
}

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
    isContractChangesRequested(contract)
  );
}
