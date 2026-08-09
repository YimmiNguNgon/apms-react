import React, { useEffect } from 'react';

export interface SidePanelProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  actions?: React.ReactNode;
  children: React.ReactNode;
  width?: number | string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  open,
  title,
  description,
  onClose,
  actions,
  children,
  width = 400,
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Close on Escape
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
          background: 'rgba(22,22,22,0.35)',
          zIndex: 'var(--cds-z-overlay)' as any,
          animation: 'cds-fade-in 0.2s ease forwards',
        }}
      />

      {/* Panel */}
      <div
        role="complementary"
        aria-label={title}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: typeof width === 'number' ? `${width}px` : width,
          maxWidth: '95vw',
          height: '100vh',
          background: 'var(--cds-background)',
          borderLeft: '1px solid var(--cds-border-subtle-01)',
          zIndex: 'calc(var(--cds-z-overlay) + 1)' as any,
          display: 'flex',
          flexDirection: 'column',
          animation: 'cds-slide-in-right 0.2s var(--cds-motion-easing) forwards',
          boxShadow: '-4px 0 12px rgba(0,0,0,0.12)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--cds-border-subtle-01)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 600,
                lineHeight: '28px',
                color: 'var(--cds-text-primary)',
              }}
            >
              {title}
            </h2>
            {description && (
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: 'var(--cds-text-secondary)',
                }}
              >
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--cds-border-radius)',
              border: 'none',
              background: 'none',
              color: 'var(--cds-text-secondary)',
              fontSize: '20px',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--cds-background-hover)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          {children}
        </div>

        {/* Footer actions */}
        {actions && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--cds-border-subtle-01)',
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              flexShrink: 0,
              background: 'var(--cds-layer-01)',
            }}
          >
            {actions}
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
