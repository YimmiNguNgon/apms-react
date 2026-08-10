import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}

const DataEmptyIcon: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="12" width="48" height="40" rx="4" stroke="var(--cds-border-strong-01)" strokeWidth="1.5" fill="none" />
    <line x1="8" y1="22" x2="56" y2="22" stroke="var(--cds-border-subtle-01)" strokeWidth="1.5" />
    <line x1="16" y1="30" x2="40" y2="30" stroke="var(--cds-border-subtle-00)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16" y1="38" x2="34" y2="38" stroke="var(--cds-border-subtle-00)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="16" y1="46" x2="28" y2="46" stroke="var(--cds-border-subtle-00)" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="48" cy="46" r="10" fill="var(--cds-layer-01)" stroke="var(--cds-border-strong-01)" strokeWidth="1.5" />
    <line x1="44" y1="46" x2="52" y2="46" stroke="var(--cds-border-strong-01)" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="48" y1="42" x2="48" y2="50" stroke="var(--cds-border-strong-01)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, body, action }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
        gap: '12px',
      }}
    >
      <div
        style={{
          color: 'var(--cds-text-helper)',
          marginBottom: '4px',
        }}
      >
        {icon ?? <DataEmptyIcon />}
      </div>
      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          lineHeight: '22px',
          color: 'var(--cds-text-primary)',
        }}
      >
        {title}
      </h3>
      {body && (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '20px',
            color: 'var(--cds-text-secondary)',
            maxWidth: '400px',
          }}
        >
          {body}
        </p>
      )}
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
};
