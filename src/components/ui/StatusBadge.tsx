import React from 'react';
import { useTranslation } from 'react-i18next';

export type StatusValue =
  | 'VERIFIED'
  | 'PENDING_REVIEW'
  | 'PENDING'
  | 'REJECTED'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DRAFT'
  | string;

export interface StatusBadgeProps {
  status: StatusValue;
  label?: string; // override display text
}

interface BadgeTheme {
  bg: string;
  color: string;
  label: string;
}

const STATUS_THEMES: Record<string, BadgeTheme> = {
  VERIFIED:       { bg: 'var(--cds-support-success-bg)',  color: 'var(--cds-support-success)',  label: 'Verified' },
  APPROVED:       { bg: 'var(--cds-support-success-bg)',  color: 'var(--cds-support-success)',  label: 'Approved' },
  ACTIVE:         { bg: 'var(--cds-support-success-bg)',  color: 'var(--cds-support-success)',  label: 'Active' },
  COMPLETED:      { bg: 'var(--cds-support-success-bg)',  color: 'var(--cds-support-success)',  label: 'Completed' },
  PENDING_REVIEW: { bg: 'var(--cds-support-warning-bg)',  color: '#b45309',                     label: 'Pending Review' },
  PENDING:        { bg: 'var(--cds-support-warning-bg)',  color: '#b45309',                     label: 'Pending' },
  IN_PROGRESS:    { bg: 'var(--cds-support-info-bg)',     color: 'var(--cds-interactive)',      label: 'In Progress' },
  DRAFT:          { bg: 'var(--cds-layer-01)',            color: 'var(--cds-text-secondary)',    label: 'Draft' },
  REJECTED:       { bg: 'var(--cds-support-error-bg)',    color: 'var(--cds-support-error)',    label: 'Rejected' },
  INACTIVE:       { bg: 'var(--cds-layer-01)',            color: 'var(--cds-text-secondary)',   label: 'Inactive' },
  CANCELLED:      { bg: 'var(--cds-support-error-bg)',    color: 'var(--cds-support-error)',    label: 'Cancelled' },
};

const DEFAULT_THEME: BadgeTheme = {
  bg: 'var(--cds-layer-01)',
  color: 'var(--cds-text-secondary)',
  label: '',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const { t } = useTranslation('common');
  const theme = STATUS_THEMES[status] ?? DEFAULT_THEME;
  const displayLabel = label ?? (theme.label ? t(`status.${status.toLowerCase()}`, { defaultValue: theme.label }) : status);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: '16px',
        background: theme.bg,
        color: theme.color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.16px',
      }}
    >
      {displayLabel}
    </span>
  );
};
