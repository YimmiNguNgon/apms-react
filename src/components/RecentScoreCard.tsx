import React from 'react';
import type { ScoreSnapshot } from '../pages/EcosystemOverview';
import { riskTone, scoreTone } from './scoreTone';

const ROLE_STYLE: Record<string, { fg: string; bg: string }> = {
  PARTNER: { fg: '#16A34A', bg: 'rgba(22,163,74,0.12)' },
  SUPPLIER: { fg: '#2563EB', bg: 'rgba(37,99,235,0.12)' },
  CUSTOMER: { fg: '#D97706', bg: 'rgba(245,158,11,0.14)' },
  POTENTIAL_PARTNER: { fg: '#7C3AED', bg: 'rgba(139,92,246,0.14)' },
  COMPETITOR: { fg: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  GENERAL: { fg: '#64748B', bg: '#F1F5F9' },
};

const ROLE_LABEL: Record<string, string> = {
  PARTNER: 'Đối tác',
  SUPPLIER: 'Nhà cung cấp',
  CUSTOMER: 'Khách hàng',
  POTENTIAL_PARTNER: 'Đối tác tiềm năng',
  COMPETITOR: 'Đối thủ cạnh tranh',
  GENERAL: 'Đánh giá chung',
};

const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return 'Chưa có tên công ty';
};

// eslint-disable-next-line react-refresh/only-export-components
export const formatRelativeTime = (value?: string | null): string => {
  if (!value) return 'Không rõ thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

// eslint-disable-next-line react-refresh/only-export-components
export const formatEngineName = (generatedBy?: string | null): string => {
  if (!generatedBy || generatedBy === 'SYSTEM' || /^\d+$/.test(generatedBy)) return 'AI Engine';
  return generatedBy;
};

// Legacy snapshots store totalScore as a sum of 4 sub-metrics (max 400);
// canonical snapshots use overallScore on a 0-100 scale. Normalize to 0-100.
// eslint-disable-next-line react-refresh/only-export-components
export const normalizeScore = (score?: number | null): number => {
  if (score == null || Number.isNaN(score)) return 0;
  if (score <= 100) return score;
  return Math.round(score / 4);
};

interface DonutProps {
  score: number;
  color: string;
  size?: number;
}

const ScoreDonut: React.FC<DonutProps> = ({ score, color, size = 92 }) => {
  const strokeWidth = 10;
  const r = 40;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const filled = (clamped / 100) * c;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label={`Điểm tổng ${Math.round(clamped)} trên 100`}
    >
      <circle cx="50" cy="50" r={r} fill="none" stroke="#EEF2F7" strokeWidth={strokeWidth} />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      <text x="50" y="49" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0F172A">
        {Math.round(clamped)}
      </text>
      <text x="50" y="66" textAnchor="middle" fontSize="10" fill="#94A3B8">
        /100
      </text>
    </svg>
  );
};

interface ProgressRowProps {
  label: string;
  value?: number | null;
  color: string;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ label, value, color }) => {
  const clamped = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748B', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontSize: 'var(--text-body)', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
          {typeof value === 'number' ? value : '—'}
        </span>
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ width: `${clamped}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

interface RecentScoreCardProps {
  score: ScoreSnapshot;
  onClick?: (score: ScoreSnapshot) => void;
}

export const RecentScoreCard: React.FC<RecentScoreCardProps> = ({ score, onClick }) => {
  const roleKey = score.evaluatedRole || 'GENERAL';
  const roleStyle = ROLE_STYLE[roleKey] || ROLE_STYLE.GENERAL;
  const name = formatCompanyName(score.companyName);
  const displayScore = normalizeScore(score.totalScore ?? score.overallScore ?? 0);
  const totalTone = scoreTone(displayScore);
  const fitTone = scoreTone(score.partnerFitScore);
  const risk = riskTone(score.riskLevel);

  return (
    <article
      className="eco-score-card"
      onClick={() => onClick?.(score)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(score);
        }
      }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        cursor: 'pointer',
        transition: 'border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span
          style={{
            fontSize: 'var(--text-h2)',
            fontWeight: 600,
            lineHeight: 1.3,
            color: '#0F172A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
          title={name}
        >
          {name}
        </span>
        <span
          style={{
            flexShrink: 0,
            fontSize: 'var(--text-caption)',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            padding: '3px 9px',
            borderRadius: '999px',
            color: roleStyle.fg,
            background: roleStyle.bg,
            whiteSpace: 'nowrap',
          }}
        >
          {ROLE_LABEL[roleKey] || 'Đánh giá chung'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
        <ScoreDonut score={displayScore} color={totalTone.color} />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ProgressRow label="Fit Score" value={score.partnerFitScore} color={fitTone.color} />
          <ProgressRow label="Risk Level" value={score.riskLevel} color={risk.color} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '5px', color: '#94A3B8', fontSize: 'var(--text-caption)', borderTop: '1px dashed #E2E8F0', paddingTop: '10px' }}>
        <span>{formatRelativeTime(score.createdAt)}</span>
        <span>·</span>
        <span>{formatEngineName(score.generatedBy)}</span>
      </div>
    </article>
  );
};

export const ScoreCardSkeleton: React.FC = () => {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div className="eco-skeleton" style={{ height: '18px', width: '55%' }} />
        <div className="eco-skeleton" style={{ height: '20px', width: '64px', borderRadius: '999px' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="eco-skeleton" style={{ width: '92px', height: '92px', borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="eco-skeleton" style={{ height: '10px', width: '100%' }} />
          <div className="eco-skeleton" style={{ height: '10px', width: '80%' }} />
        </div>
      </div>
      <div className="eco-skeleton" style={{ height: '10px', width: '45%', alignSelf: 'flex-end' }} />
    </div>
  );
};
