// SVG-based chart components — no external library required

import React from 'react';

// ─────────────────────────────────────────────────────────────
// SPARKLINE (tiny inline chart for KPI cards)
// ─────────────────────────────────────────────────────────────
interface SparkLineProps {
  data: number[];
  color?: string;
  height?: number;
}

export const SparkLine: React.FC<SparkLineProps> = ({
  data, color = '#2563EB', height = 36
}) => {
  if (!data || data.length < 2) return null;
  const w = 100; const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,${h} L ${points.join(' L ')} L ${w},${h} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"
      style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// AREA CHART
// ─────────────────────────────────────────────────────────────
interface AreaChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data, color = '#2563EB', height = 160,
}) => {
  const W = 400; const H = height;
  const PAD = { top: 10, right: 8, bottom: 28, left: 32 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d.value);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.05;
  const range = max - min || 1;

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * iW;
  const toY = (v: number) => PAD.top + iH - ((v - min) / range) * iH;

  const pts = data.map((d, i) => `${toX(i)},${toY(d.value)}`);
  const pathD = `M ${pts.join(' L ')}`;
  const areaD = `M ${PAD.left},${PAD.top + iH} L ${pts.join(' L ')} L ${toX(data.length-1)},${PAD.top + iH} Z`;

  // Y-axis ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    min + (range * i) / ticks
  );

  const gradId = `ac-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height, display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((v, i) => {
        const y = toY(v);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4}
              textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.4">
              {Math.round(v)}
            </text>
          </g>
        );
      })}

      {/* Area + Line */}
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3"
          fill={color} stroke="white" strokeWidth="1.5" />
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 6} textAnchor="middle"
          fontSize="9" fill="currentColor" fillOpacity="0.5">
          {d.label}
        </text>
      ))}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// BAR CHART
// ─────────────────────────────────────────────────────────────
interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, height = 140 }) => {
  const W = 400; const H = height;
  const PAD = { top: 10, right: 8, bottom: 28, left: 32 };
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  const max = Math.max(...data.map(d => d.value)) * 1.1 || 1;
  const barW = iW / data.length * 0.55;
  const gap   = iW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height, display: 'block' }}>

      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = PAD.top + iH * (1 - f);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end"
              fontSize="9" fill="currentColor" fillOpacity="0.4">
              {Math.round(max * f)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x   = PAD.left + gap * i + (gap - barW) / 2;
        const bH  = (d.value / max) * iH;
        const y   = PAD.top + iH - bH;
        const col = d.color || '#2563EB';
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bH}
              fill={col} fillOpacity="0.85" rx="3" />
            <text x={x + barW / 2} y={H - 6} textAnchor="middle"
              fontSize="9" fill="currentColor" fillOpacity="0.5">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// DONUT CHART
// ─────────────────────────────────────────────────────────────
interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerValue?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data, size = 140, centerLabel, centerValue,
}) => {
  const r  = 44; const cx = 70; const cy = 70;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let cumulative = 0;
  const slices = data.map(d => {
    const pct    = d.value / total;
    const offset = circumference * (1 - cumulative);
    const dash   = circumference * pct;
    cumulative  += pct;
    return { ...d, offset, dash };
  });

  return (
    <svg viewBox="0 0 140 140" style={{ width: size, height: size, display: 'block', margin: '0 auto' }}>
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={s.color} strokeWidth="22"
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={s.offset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      ))}
      {/* Center */}
      {centerValue && (
        <text x={cx} y={cy - 4} textAnchor="middle"
          fontSize="16" fontWeight="700" fill="currentColor">
          {centerValue}
        </text>
      )}
      {centerLabel && (
        <text x={cx} y={cy + 14} textAnchor="middle"
          fontSize="9" fill="currentColor" fillOpacity="0.5">
          {centerLabel}
        </text>
      )}
    </svg>
  );
};
