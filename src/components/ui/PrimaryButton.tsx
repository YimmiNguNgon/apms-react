import React from 'react';

export interface PrimaryButtonProps {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

const Spinner: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      animation: 'cds-spin 0.8s linear infinite',
    }}
  >
    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <style>{`@keyframes cds-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </svg>
);

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  children,
  onClick,
  type = 'button',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  danger = false,
  size = 'md',
  fullWidth = false,
  id,
  style,
}) => {
  const heights = { sm: '32px', md: '40px', lg: '48px' };
  const fontSizes = { sm: '12px', md: '14px', lg: '16px' };
  const paddings = { sm: '0 12px', md: '0 16px', lg: '0 20px' };

  const isDisabled = disabled || loading;

  const bg = danger ? 'var(--cds-support-error)' : 'var(--cds-interactive)';
  const bgHover = danger ? '#b31217' : 'var(--cds-interactive-hover)';
  const bgActive = danger ? '#921018' : 'var(--cds-interactive-active)';

  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={isDisabled}
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
        background: isDisabled ? 'var(--cds-text-disabled)' : bg,
        color: isDisabled ? 'var(--cds-background)' : '#ffffff',
        border: 'none',
        borderRadius: 'var(--cds-border-radius)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: "'IBM Plex Sans', 'Inter', sans-serif",
        transition: `background ${`var(--cds-motion-fast)`} ${`var(--cds-motion-easing)`}`,
        whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : undefined,
        opacity: isDisabled ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = bgHover;
      }}
      onMouseLeave={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = bg;
      }}
      onMouseDown={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = bgActive;
      }}
      onMouseUp={(e) => {
        if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = bgHover;
      }}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
};
