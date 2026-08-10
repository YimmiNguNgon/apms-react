import React from 'react';

export interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  id?: string;
  style?: React.CSSProperties;
  ghost?: boolean; // ghost = no border, just text
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  children,
  onClick,
  type = 'button',
  icon,
  iconPosition = 'left',
  disabled = false,
  size = 'md',
  fullWidth = false,
  id,
  style,
  ghost = false,
}) => {
  const heights = { sm: '32px', md: '40px', lg: '48px' };
  const fontSizes = { sm: '12px', md: '14px', lg: '16px' };
  const paddings = { sm: '0 12px', md: '0 16px', lg: '0 20px' };

  const base: React.CSSProperties = ghost
    ? {
        background: 'transparent',
        border: 'none',
        color: 'var(--cds-interactive)',
      }
    : {
        background: 'var(--cds-background)',
        border: '1px solid var(--cds-interactive)',
        color: 'var(--cds-interactive)',
      };

  const hoverBg = ghost ? 'var(--cds-layer-01)' : 'var(--cds-layer-01)';

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        flexDirection: iconPosition === 'right' ? 'row-reverse' : 'row',
        height: heights[size],
        padding: paddings[size],
        fontSize: fontSizes[size],
        fontWeight: 600,
        lineHeight: 1,
        borderRadius: 'var(--cds-border-radius)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
        transition: 'background 0.1s',
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        opacity: disabled ? 0.5 : 1,
        ...base,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        if (!disabled)
          (e.currentTarget as HTMLButtonElement).style.background =
            ghost ? 'transparent' : 'var(--cds-background)';
      }}
    >
      {icon}
      {children}
    </button>
  );
};
