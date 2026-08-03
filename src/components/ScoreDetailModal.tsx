import React, { useEffect } from 'react';
import type { ScoreSnapshot } from '../pages/EcosystemOverview';
import { formatRelativeTime, formatEngineName, normalizeScore } from './RecentScoreCard';
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

interface ScoreDetailModalProps {
  score: ScoreSnapshot | null;
  onClose: () => void;
}

export const ScoreDetailModal: React.FC<ScoreDetailModalProps> = ({ score, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!score) return null;

  const name = formatCompanyName(score.companyName);
  const roleKey = score.evaluatedRole || 'GENERAL';
  const roleStyle = ROLE_STYLE[roleKey] || ROLE_STYLE.GENERAL;
  const roleLabel = ROLE_LABEL[roleKey] || 'Đánh giá chung';
  const displayScore = normalizeScore(score.totalScore ?? score.overallScore ?? 0);
  const totalTone = scoreTone(displayScore);

  let factors: Record<string, string> | null = null;
  try {
    if (score.factorsJson) factors = JSON.parse(score.factorsJson);
  } catch {
    factors = null;
  }

  const r = 40;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, displayScore));
  const filled = (clamped / 100) * c;

  const primaryMetrics: Array<{ label: string; value: string; tone: { color: string; bg: string; label: string } }> = [
    { label: 'Fit Score', value: score.partnerFitScore != null ? String(score.partnerFitScore) : '—', tone: scoreTone(score.partnerFitScore) },
    { label: 'Competition Level', value: score.competitionLevel != null ? String(score.competitionLevel) : '—', tone: riskTone(score.competitionLevel) },
    { label: 'Risk Level', value: score.riskLevel != null ? String(score.riskLevel) : '—', tone: riskTone(score.riskLevel) },
    { label: 'Relationship Strength', value: score.relationshipStrength != null ? String(score.relationshipStrength) : '—', tone: scoreTone(score.relationshipStrength) },
  ];

  const metaItems: Array<{ label: string; value: string }> = [
    { label: 'Rule Version', value: score.ruleVersion || '—' },
    { label: 'Evaluated By', value: formatEngineName(score.generatedBy) },
    { label: 'Thời điểm chấm', value: score.createdAt ? new Date(score.createdAt).toLocaleString('vi-VN') : '—' },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1150,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          color: '#0F172A',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          width: 'min(600px, 100%)',
          maxHeight: '88vh',
          overflow: 'auto',
          boxShadow: '0 24px 60px rgba(15,23,42,0.25)',
          animation: 'modalPop 0.25s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết đánh giá ${name}`}
      >
        {/* Header */}
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 600, lineHeight: 1.3, color: '#0F172A' }}>{name}</h2>
              <span style={{ fontSize: 'var(--text-caption)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: '999px', color: roleStyle.fg, background: roleStyle.bg, whiteSpace: 'nowrap' }}>
                {roleLabel}
              </span>
            </div>
            <span style={{ fontSize: 'var(--text-caption)', color: '#94A3B8' }}>
              {formatRelativeTime(score.createdAt)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              color: '#64748B',
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            Đóng
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Overall score hero */}
          <section style={{
            display: 'flex',
            alignItems: 'center',
            gap: '22px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '18px 20px',
          }}>
            <div style={{ width: '104px', flexShrink: 0 }}>
              <svg viewBox="0 0 100 100" width="104" height="104" style={{ display: 'block' }} aria-hidden="true">
                <circle cx="50" cy="50" r={r} fill="none" stroke="#E2E8F0" strokeWidth="11" />
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke={totalTone.color}
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={`${filled} ${c - filled}`}
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
                <text x="50" y="48" textAnchor="middle" fontSize="28" fontWeight="800" fill="#0F172A">
                  {Math.round(displayScore)}
                </text>
                <text x="50" y="64" textAnchor="middle" fontSize="10" fill="#94A3B8">/100</text>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748B', fontWeight: 500, marginBottom: '4px' }}>
                Điểm tổng
              </div>
              <div style={{ fontSize: 'var(--text-h2)', fontWeight: 700, color: totalTone.color, lineHeight: 1.25 }}>
                {totalTone.label}
              </div>
              <div style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', marginTop: '4px' }}>
                Trên thang 0-100 · Cập nhật {formatRelativeTime(score.createdAt)}
              </div>
            </div>
          </section>

          {/* Primary business metrics */}
          <section>
            <div style={{ fontSize: 'var(--text-label)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', marginBottom: '10px' }}>
              Chỉ số đánh giá
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {primaryMetrics.map((row) => (
                <div key={row.label} style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 'var(--text-caption)', color: '#64748B', marginBottom: '4px' }}>{row.label}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: 'var(--text-metric)', fontWeight: 700, color: row.tone.color, fontVariantNumeric: 'tabular-nums' }}>
                      {row.value}
                    </span>
                    {row.value !== '—' && (
                      <span style={{ fontSize: 'var(--text-caption)', color: row.tone.color, opacity: 0.8, fontWeight: 500 }}>
                        {row.tone.label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Factors */}
          {factors && Object.keys(factors).length > 0 && (
            <section>
              <div style={{ fontSize: 'var(--text-label)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: '#64748B' }}>
                Yếu tố đánh giá
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(factors).map(([k, v]) => (
                  <span key={k} style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: 'var(--text-caption)',
                    color: '#334155',
                  }}>
                    <strong style={{ color: '#64748B', marginRight: '6px', fontWeight: 600 }}>{k}</strong>
                    {v}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Metadata */}
          <section style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px 16px' }}>
            {metaItems.map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: 'var(--text-caption)', color: '#64748B', fontWeight: 500 }}>{item.value}</div>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', marginBottom: '2px' }}>Snapshot</div>
              <div style={{ fontSize: 'var(--text-caption)', color: '#64748B', fontWeight: 500 }}>#{score.scoreSnapshotId}</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
