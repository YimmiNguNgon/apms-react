import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md' | 'lg';
  contained?: boolean; // "contained" variant with background pill per tab
  wrap?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  size = 'md',
  contained = false,
  wrap = false,
}) => {
  const heights = { sm: '32px', md: '40px', lg: '48px' };
  const fontSizes = { sm: '12px', md: '14px', lg: '14px' };

  if (contained) {
    return (
      <div
        style={{
          display: 'inline-flex',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle-01)',
          borderRadius: 'var(--cds-border-radius)',
          padding: '3px',
          gap: '2px',
        }}
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              onClick={() => !item.disabled && onChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: `0 12px`,
                height: heights[size],
                fontSize: fontSizes[size],
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                background: isActive ? 'var(--cds-background)' : 'transparent',
                border: 'none',
                borderRadius: 'calc(var(--cds-border-radius) - 2px)',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                opacity: item.disabled ? 0.5 : 1,
                transition: 'background 0.15s, color 0.15s',
                fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
              whiteSpace: 'nowrap',
              flexShrink: 0,
              boxShadow: isActive ? 'var(--cds-shadow-sm)' : 'none',
              }}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 4px',
                    borderRadius: '9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: isActive ? 'var(--cds-interactive)' : 'var(--cds-border-subtle-01)',
                    color: isActive ? '#ffffff' : 'var(--cds-text-secondary)',
                  }}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Carbon line tabs (underline variant)
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: wrap ? 'wrap' : 'nowrap',
        borderBottom: '1px solid var(--cds-border-subtle-01)',
        gap: '0',
        overflowX: wrap ? 'visible' : 'auto',
        scrollbarWidth: wrap ? 'auto' : 'none',
      }}
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: `0 16px`,
              height: heights[size],
              fontSize: fontSizes[size],
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
              background: 'transparent',
              border: 'none',
              borderBottom: isActive
                ? '2px solid var(--cds-interactive)'
                : '2px solid transparent',
              marginBottom: '-1px',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              opacity: item.disabled ? 0.5 : 1,
              transition: 'color 0.15s, border-color 0.15s',
              fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
              whiteSpace: 'nowrap',
              flexShrink: 0,
              borderRadius: '0',
            }}
            onMouseEnter={(e) => {
              if (!item.disabled && !isActive)
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--cds-text-primary)';
            }}
            onMouseLeave={(e) => {
              if (!item.disabled && !isActive)
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--cds-text-secondary)';
            }}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  borderRadius: '9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  background: isActive ? 'var(--cds-interactive)' : 'var(--cds-border-subtle-01)',
                  color: isActive ? '#ffffff' : 'var(--cds-text-secondary)',
                }}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
