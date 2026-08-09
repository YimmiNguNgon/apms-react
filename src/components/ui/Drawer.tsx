import React, { useEffect } from 'react';

export interface DrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  footerActions?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  footerActions,
  children,
  width = 780,
}) => {
  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(22,22,22,0.45)',
          zIndex: 8000,
          animation: 'cds-fade-in 0.15s ease forwards',
        }}
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '95vw',
          height: '100vh',
          background: 'var(--cds-background)',
          zIndex: 8001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'cds-slide-in-right 0.2s cubic-bezier(0.2,0,0.38,0.9) forwards',
          borderLeft: '1px solid var(--cds-border-subtle-01)',
          boxShadow: '-8px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header — 48px fixed height, Carbon standard */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            height: '56px',
            borderBottom: '1px solid var(--cds-border-subtle-01)',
            flexShrink: 0,
            background: 'var(--cds-layer-01)',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 600,
                lineHeight: '22px',
                color: 'var(--cds-text-primary)',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--cds-text-secondary)',
                  lineHeight: '16px',
                }}
              >
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              border: 'none',
              background: 'none',
              borderRadius: 'var(--cds-border-radius)',
              color: 'var(--cds-text-secondary)',
              fontSize: '22px',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--cds-background-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {children}
        </div>

        {/* Sticky footer */}
        {footerActions && (
          <div
            style={{
              padding: '12px 24px',
              borderTop: '1px solid var(--cds-border-subtle-01)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'space-between',
              flexShrink: 0,
              background: 'var(--cds-layer-01)',
            }}
          >
            {footerActions}
          </div>
        )}
      </div>

      <style>{`
        @keyframes cds-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cds-slide-in-right {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};
