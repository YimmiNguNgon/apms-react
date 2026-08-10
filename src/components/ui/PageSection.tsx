import React, { useState } from 'react';

export interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  noPadding?: boolean;
  noCard?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const PageSection: React.FC<PageSectionProps> = ({
  title,
  description,
  actions,
  collapsible = false,
  defaultCollapsed = false,
  noPadding = false,
  noCard = false,
  children,
  style,
}) => {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const rootStyle: React.CSSProperties = noCard
    ? { marginBottom: '16px', ...style }
    : {
        background: 'var(--cds-background)',
        border: '1px solid var(--cds-border-color)',
        borderRadius: 'var(--cds-border-radius)',
        marginBottom: '16px',
        overflow: 'hidden',
        ...style,
      };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: title || actions ? '12px 16px' : '0',
    borderBottom:
      title && !collapsed && !noCard ? '1px solid var(--cds-border-subtle-00)' : 'none',
    gap: '12px',
  };

  const bodyStyle: React.CSSProperties = {
    padding: noPadding ? '0' : '16px',
    display: collapsed ? 'none' : 'block',
  };

  const collapseIconStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: '4px',
    color: 'var(--cds-text-secondary)',
    fontSize: '14px',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
  };

  return (
    <section style={rootStyle}>
      {(title || actions) && (
        <div style={headerStyle}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {title && (
              <h2
                style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 600,
                  lineHeight: '18px',
                  color: 'var(--cds-text-primary)',
                }}
              >
                {title}
              </h2>
            )}
            {description && !collapsed && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '12px',
                  color: 'var(--cds-text-secondary)',
                  lineHeight: '16px',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actions}
            {collapsible && (
              <button
                type="button"
                style={collapseIconStyle}
                onClick={() => setCollapsed((c) => !c)}
                aria-label={collapsed ? 'Expand section' : 'Collapse section'}
              >
                ▼
              </button>
            )}
          </div>
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
    </section>
  );
};
