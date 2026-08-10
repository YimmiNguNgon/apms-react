import React from 'react';
import type { NewsDraftStatus } from '../../../types/domain';

// Extend NewsDraftStatus with submission statuses since both might be passed to this badge
export type CombinedStatus = NewsDraftStatus | 'IN_REVIEW' | 'APPLIED' | 'REJECTED';

interface NewsStatusBadgeProps {
  status: CombinedStatus;
  className?: string;
}

export const NewsStatusBadge: React.FC<NewsStatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = (status: CombinedStatus) => {
    switch (status) {
      case 'DRAFT':
        return { label: 'Draft', color: '#3b82f6', bg: '#eff6ff' };
      case 'SUBMITTED':
        return { label: 'Submitted', color: '#f59e0b', bg: '#fffbeb' };
      case 'IN_REVIEW':
        return { label: 'In Review', color: '#8b5cf6', bg: '#f5f3ff' };
      case 'APPROVED':
        return { label: 'Approved', color: '#10b981', bg: '#ecfdf5' };
      case 'REJECTED':
        return { label: 'Rejected', color: '#ef4444', bg: '#fef2f2' };
      case 'APPLIED':
        return { label: 'Applied', color: '#14b8a6', bg: '#f0fdfa' };
      case 'DELETED':
        return { label: 'Deleted', color: '#6b7280', bg: '#f3f4f6' };
      default:
        return { label: status, color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span 
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: config.color,
        backgroundColor: config.bg,
        border: `1px solid ${config.color}33`,
        whiteSpace: 'nowrap'
      }}
    >
      {config.label}
    </span>
  );
};
