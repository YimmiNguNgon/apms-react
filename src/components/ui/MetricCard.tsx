import React from 'react';

export interface MetricCardProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: number;        // positive = up, negative = down
  trendLabel?: string;   // e.g. "vs last week"
  valueColor?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  description,
  icon,
  trend,
  trendLabel,
  valueColor,
  onClick,
}) => {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const trendNeutral  = trend !== undefined && trend === 0;

  const trendColor = trendPositive
    ? 'var(--cds-support-success)'
    : trendNegative
    ? 'var(--cds-support-error)'
    : 'var(--cds-text-helper)';

  const trendBg = trendPositive
    ? 'var(--cds-support-success-bg)'
    : trendNegative
    ? 'var(--cds-support-error-bg)'
    : 'var(--cds-layer-01)';

  const trendSymbol = trendPositive ? '↑' : trendNegative ? '↓' : '→';
  const trendText = trend !== undefined
    ? `${trendSymbol} ${Math.abs(trend)}${trendLabel ? ` ${trendLabel}` : ''}`
    : null;

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--cds-background)',
        border: '1px solid var(--cds-border-color)',
        borderRadius: 'var(--cds-border-radius)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        boxShadow: 'none',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--cds-border-strong-01)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--cds-shadow-sm)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--cds-border-color)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }
      }}
    >
      {/* Header row: label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            lineHeight: '16px',
            letterSpacing: '0.32px',
            color: 'var(--cds-text-secondary)',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
        {icon && <div style={{ color: 'var(--cds-icon-secondary)' }}>{icon}</div>}
      </div>

      {/* Metric value */}
      <div
        style={{
          fontSize: '22px',
          fontWeight: 600,
          lineHeight: '28px',
          color: valueColor ?? 'var(--cds-text-primary)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>

      {/* Bottom row: description + trend */}
      {(description || trendText) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {description && (
            <span
              style={{
                fontSize: '11px',
                lineHeight: '14px',
                color: 'var(--cds-text-helper)',
                flex: 1,
              }}
            >
              {description}
            </span>
          )}
          {trendText && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: trendColor,
                background: trendBg,
                padding: '2px 6px',
                borderRadius: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {trendText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
