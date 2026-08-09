import React from 'react';

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumb?: { label: string; onClick?: () => void }[];
  actions?: React.ReactNode;
  noBorder?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    paddingBottom: '24px',
    marginBottom: '24px',
  },
  rootBordered: {
    paddingBottom: '24px',
    marginBottom: '24px',
    borderBottom: '1px solid var(--cds-border-subtle-01)',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '8px',
  },
  breadcrumbItem: {
    fontSize: '12px',
    color: 'var(--cds-text-helper)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'default',
    fontFamily: 'inherit',
  },
  breadcrumbItemClickable: {
    fontSize: '12px',
    color: 'var(--cds-link-primary)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textDecoration: 'none',
  },
  breadcrumbSep: {
    fontSize: '12px',
    color: 'var(--cds-text-helper)',
    userSelect: 'none',
  },
  inner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--cds-interactive)',
    marginBottom: '4px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 600,
    lineHeight: '40px',
    color: 'var(--cds-text-primary)',
    margin: 0,
    fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
  },
  description: {
    marginTop: '6px',
    fontSize: '14px',
    lineHeight: '20px',
    color: 'var(--cds-text-secondary)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
    paddingTop: '4px',
  },
};

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  eyebrow,
  description,
  breadcrumb,
  actions,
  noBorder = false,
}) => {
  return (
    <header style={noBorder ? styles.root : styles.rootBordered}>
      {breadcrumb && breadcrumb.length > 0 && (
        <nav style={styles.breadcrumb} aria-label="breadcrumb">
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span style={styles.breadcrumbSep}>/</span>}
              {item.onClick ? (
                <button
                  style={styles.breadcrumbItemClickable}
                  onClick={item.onClick}
                  type="button"
                >
                  {item.label}
                </button>
              ) : (
                <span style={styles.breadcrumbItem}>{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div style={styles.inner}>
        <div style={styles.left}>
          {eyebrow && <span style={styles.eyebrow}>{eyebrow}</span>}
          <h1 style={styles.title}>{title}</h1>
          {description && <p style={styles.description}>{description}</p>}
        </div>
        {actions && <div style={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
};
