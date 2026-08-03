import type { RoleEvaluationStatus, ScoreRole } from '../types/domain';

export const roleEvaluationReadOnlyStatuses: RoleEvaluationStatus[] = [
  'IN_REVIEW',
  'APPROVAL_PROCESSING',
  'APPROVED',
  'APPROVAL_FAILED',
  'REJECTED',
];

export const roleEvaluationEditableStatuses: RoleEvaluationStatus[] = [
  'DRAFT',
  'REVISION_REQUIRED',
];

export const isNumericEvaluationRole = (role?: ScoreRole | null) =>
  Boolean(role);

export const canStaffEditEvaluation = (
  status?: RoleEvaluationStatus | null,
  canEdit = false,
) => Boolean(canEdit && status && roleEvaluationEditableStatuses.includes(status));

export const canManagerReviewEvaluation = (status?: RoleEvaluationStatus | null) =>
  status === 'IN_REVIEW';

export const shouldPollEvaluation = (status?: RoleEvaluationStatus | null) =>
  status === 'APPROVAL_PROCESSING';

export const roleEvaluationStatusLabel = (status?: RoleEvaluationStatus | null) => {
  switch (status) {
    case 'DRAFT':
      return 'Draft';
    case 'IN_REVIEW':
      return 'Waiting for Manager review';
    case 'REVISION_REQUIRED':
      return 'Revision requested';
    case 'APPROVAL_PROCESSING':
      return 'Approval processing';
    case 'APPROVED':
      return 'Approved';
    case 'APPROVAL_FAILED':
      return 'Approval failed';
    case 'REJECTED':
      return 'Rejected';
    default:
      return 'No draft';
  }
};

export const roleEvaluationRoleLabel = (role?: ScoreRole | null) =>
  role
    ? role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Role Evaluation';
