import React from 'react';
import { useTranslation } from 'react-i18next';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface RiskBadgeProps {
  level: RiskLevel | string;
  label?: string;
  showDot?: boolean;
}

const RISK_THEMES: Record<string, { bg: string; color: string; label: string }> = {
  CRITICAL: {
    bg: 'var(--cds-risk-critical-bg)',
    color: 'var(--cds-risk-critical)',
    label: 'Critical',
  },
  HIGH: {
    bg: 'var(--cds-risk-high-bg)',
    color: 'var(--cds-risk-high)',
    label: 'High',
  },
  MEDIUM: {
    bg: 'var(--cds-risk-medium-bg)',
    color: '#92400e',
    label: 'Medium',
  },
  LOW: {
    bg: 'var(--cds-risk-low-bg)',
    color: 'var(--cds-risk-low)',
    label: 'Low',
  },
};

const DEFAULT: { bg: string; color: string; label: string } = {
  bg: 'var(--cds-layer-01)',
  color: 'var(--cds-text-secondary)',
  label: '',
};

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, label, showDot = false }) => {
  const { t } = useTranslation('common');
  const theme = RISK_THEMES[level?.toUpperCase()] ?? DEFAULT;
  const translated = theme.label ? t(`risk.${level?.toLowerCase()}`, { defaultValue: theme.label }) : level;
  const displayLabel = label ?? translated;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: '16px',
        background: theme.bg,
        color: theme.color,
        whiteSpace: 'nowrap',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      {showDot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: theme.color,
            flexShrink: 0,
          }}
        />
      )}
      {displayLabel}
    </span>
  );
};
