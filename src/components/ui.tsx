import React from 'react';

// ─── 1. PAGE HEADER ────────────────────────────────────────────────────────
interface BreadcrumbItem {
  label: string;
}

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  eyebrow,
  description,
  breadcrumb,
  actions,
}) => {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      flexWrap: 'wrap',
      gap: '16px',
      padding: '16px 20px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '12px',
      color: '#ffffff',
      marginBottom: '20px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    }}>
      <div style={{ flex: '1 1 500px' }}>
        {breadcrumb && (
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {breadcrumb.map((b, i) => (
              <span key={i}>
                {i > 0 && <span style={{ margin: '0 6px' }}>/</span>}
                {b.label}
              </span>
            ))}
          </div>
        )}
        {eyebrow && (
          <span style={{
            display: 'inline-block',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#3b82f6',
            background: 'rgba(59, 130, 246, 0.12)',
            padding: '2px 8px',
            borderRadius: '4px',
            marginBottom: '6px',
          }}>{eyebrow}</span>
        )}
        <h1 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{title}</h1>
        {description && <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>{description}</p>}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {actions}
        </div>
      )}
    </div>
  );
};

// ─── 2. METRIC CARD ────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: number | string;
  description?: string;
  valueColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  description,
  valueColor,
}) => {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '12px 14px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    }}>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{label}</span>
      <strong style={{ fontSize: '20px', fontWeight: 700, color: valueColor || '#0f172a' }}>{value}</strong>
      {description && <span style={{ fontSize: '11px', color: '#94a3b8' }}>{description}</span>}
    </div>
  );
};

// ─── 3. RISK BADGE ─────────────────────────────────────────────────────────
interface RiskBadgeProps {
  level: string;
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, showDot }) => {
  const lvl = (level || '').toUpperCase();
  const theme = lvl.includes('CRITICAL') || lvl.includes('HIGH')
    ? { bg: 'rgba(239, 68, 68, 0.08)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.2)' }
    : lvl.includes('MEDIUM') || lvl.includes('WARNING')
      ? { bg: 'rgba(245, 158, 11, 0.08)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.2)' }
      : { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981', border: 'rgba(16, 185, 129, 0.2)' };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '11px',
      fontWeight: 600,
      background: theme.bg,
      color: theme.text,
      border: `1px solid ${theme.border}`,
      padding: '2px 8px',
      borderRadius: '4px',
      textTransform: 'uppercase',
    }}>
      {showDot && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: theme.text }} />}
      {level}
    </span>
  );
};

// ─── 4. STATUS BADGE ───────────────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const s = (status || '').toUpperCase();
  const theme = s.includes('ACTIVE') || s.includes('COMPLETED') || s.includes('UP') || s.includes('DONE')
    ? { bg: 'rgba(16, 185, 129, 0.08)', text: '#10b981' }
    : s.includes('PROGRESS') || s.includes('PENDING')
      ? { bg: 'rgba(59, 130, 246, 0.08)', text: '#3b82f6' }
      : { bg: 'rgba(100, 116, 139, 0.08)', text: '#64748b' };

  return (
    <span style={{
      display: 'inline-block',
      fontSize: '11px',
      fontWeight: 600,
      background: theme.bg,
      color: theme.text,
      padding: '2px 6px',
      borderRadius: '4px',
      textTransform: 'uppercase',
    }}>
      {status}
    </span>
  );
};

// ─── 5. BUTTONS ───────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const PrimaryButton: React.FC<ButtonProps> = ({
  size = 'md',
  loading,
  children,
  style,
  ...props
}) => {
  const pad = size === 'sm' ? '4px 10px' : size === 'lg' ? '10px 18px' : '7px 14px';
  const fsz = size === 'sm' ? '12px' : '13px';
  return (
    <button
      style={{
        background: '#2563eb',
        border: '1px solid #2563eb',
        color: '#ffffff',
        padding: pad,
        fontSize: fsz,
        fontWeight: 600,
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
        opacity: props.disabled || loading ? 0.7 : 1,
        ...style,
      }}
      {...props}
    >
      {loading && <span className="btn-spinner" />}
      {children}
    </button>
  );
};

export const SecondaryButton: React.FC<ButtonProps> = ({
  size = 'md',
  loading,
  children,
  style,
  ...props
}) => {
  const pad = size === 'sm' ? '4px 10px' : size === 'lg' ? '10px 18px' : '7px 14px';
  const fsz = size === 'sm' ? '12px' : '13px';
  return (
    <button
      style={{
        background: '#ffffff',
        border: '1px solid #cbd5e1',
        color: '#334155',
        padding: pad,
        fontSize: fsz,
        fontWeight: 600,
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
        opacity: props.disabled || loading ? 0.7 : 1,
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};

// ─── 6. DRAWER ────────────────────────────────────────────────────────────
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  footerActions?: React.ReactNode;
  children?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  width = 600,
  footerActions,
  children,
}) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      justifyContent: 'flex-end',
      zIndex: 9999,
    }} onClick={onClose}>
      <div style={{
        width: '100%',
        maxWidth: `${width}px`,
        height: '100vh',
        background: '#ffffff',
        boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideIn 0.2s ease-out',
      }} onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
            {subtitle && <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{subtitle}</p>}
          </div>
          <button style={{
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#64748b',
          }} onClick={onClose}>×</button>
        </div>

        {/* Drawer Body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}>
          {children}
        </div>

        {/* Drawer Footer */}
        {footerActions && (
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}>
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── 7. TABS ──────────────────────────────────────────────────────────────
interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ items, activeId, onChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      borderBottom: '1px solid #e2e8f0',
      paddingBottom: '2px',
      marginBottom: '16px',
    }}>
      {items.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
              color: active ? '#2563eb' : '#64748b',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: active ? 600 : 500,
              cursor: 'pointer',
              marginBottom: '-3px',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
