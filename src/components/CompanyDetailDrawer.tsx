import React, { useEffect } from 'react';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';

export interface ScoreSnapshot {
  scoreSnapshotId: number;
  companyId: string;
  companyName?: string;
  targetCompanyProfileId?: string;
  projectId: string;
  candidateId: string;
  partnerFitScore?: number | null;
  competitionLevel?: number | null;
  riskLevel?: number | null;
  relationshipStrength?: number | null;
  totalScore?: number | null;
  overallScore?: number | null;
  factorsJson: string;
  ruleVersion: string;
  generatedBy: string;
  evaluatedRole?: string | null;
  createdAt: string;
}

interface CompanyDetailDrawerProps {
  companyId: string | null;
  relationshipType?: string;
  profile: ProfileResponse | null;
  sources: ProfileSourcesResponse | null;
  recentScore?: ScoreSnapshot | null;
  loading: boolean;
  onClose: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return 'Chưa có tên công ty';
};

export const CompanyDetailDrawer: React.FC<CompanyDetailDrawerProps> = ({
  companyId,
  relationshipType,
  profile,
  sources,
  recentScore,
  loading,
  onClose,
}) => {
  // Bind ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!companyId) return null;

  const tradeName = profile?.identity?.tradeName;
  const legalName = profile?.identity?.legalName;
  const displayName = formatCompanyName(tradeName || legalName);
  const initials = displayName.substring(0, 2).toUpperCase();

  const taxCode = profile?.identity?.taxCode;
  const regNo = profile?.identity?.registrationNumber;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={onClose}
      id="company-detail-drawer-backdrop"
    >
      <div
        style={{
          width: '580px',
          maxWidth: '92vw',
          height: '100vh',
          background: '#0F172A',
          color: '#F8FAFC',
          borderLeft: '1px solid #1E293B',
          boxShadow: '-12px 0 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        id="company-detail-drawer-panel"
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '24px 28px 20px',
            borderBottom: '1px solid #1E293B',
            background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px 12px',
              fontSize: 'var(--text-caption)',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            title="Close Drawer (ESC)"
            id="btn-close-company-drawer"
          >
            Đóng
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {/* Company Logo Avatar */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: '700',
                fontSize: 'var(--text-h1)',
                letterSpacing: '0.5px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>

            <div style={{ flex: 1, paddingRight: '36px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 'var(--text-h1)',
                    fontWeight: '600',
                    color: '#F8FAFC',
                    lineHeight: '1.25',
                  }}
                  id="drawer-company-name"
                >
                  {displayName}
                </h2>
                {relationshipType && (
                  <span
                    style={{
                      background: 'rgba(37, 99, 235, 0.15)',
                      border: '1px solid rgba(37, 99, 235, 0.3)',
                      color: '#60A5FA',
                      fontSize: 'var(--text-caption)',
                      fontWeight: '600',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {(() => {
                      const t = relationshipType.toLowerCase();
                      if (t.includes('competitor')) return 'Competitor';
                      if (t.includes('supplier')) return 'Supplier';
                      if (t.includes('customer')) return 'Customer';
                      if (t.includes('potential')) return 'Potential Partner';
                      if (t.includes('partner')) return 'Partner';
                      return relationshipType.replace(/_/g, ' ');
                    })()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-body)', color: '#94A3B8' }}>
                <span>
                  {relationshipType ? (() => {
                    const t = relationshipType.toLowerCase();
                    if (t.includes('competitor')) return 'Competitor';
                    if (t.includes('supplier')) return 'Supplier';
                    if (t.includes('customer')) return 'Customer';
                    if (t.includes('potential')) return 'Potential Partner';
                    if (t.includes('partner')) return 'Partner';
                    return relationshipType.replace(/_/g, ' ');
                  })() : 'Doanh nghiệp'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#94A3B8' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              Loading company intelligence profile...
            </div>
          ) : (
            <>
              {/* Section 1: Identity Information */}
              <section style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: '600', color: '#F1F5F9' }}>Identity & Legal Registration</h3>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#94A3B8', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                      Trade Name
                    </span>
                    <strong style={{ fontSize: 'var(--text-body)', color: tradeName ? '#F8FAFC' : '#64748B' }}>
                      {tradeName || 'Chưa cập nhật'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#94A3B8', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                      Legal Name
                    </span>
                    <strong style={{ fontSize: 'var(--text-body)', color: legalName ? '#F8FAFC' : '#64748B' }}>
                      {legalName || 'Chưa cập nhật'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#94A3B8', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                      Tax Code
                    </span>
                    <strong style={{ fontSize: 'var(--text-body)', color: taxCode ? '#F8FAFC' : '#64748B', fontFamily: 'monospace' }}>
                      {taxCode || 'Chưa cập nhật'}
                    </strong>
                  </div>

                  <div>
                    <span style={{ fontSize: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.03em', color: '#94A3B8', fontWeight: '500', display: 'block', marginBottom: '4px' }}>
                      Registration No.
                    </span>
                    <strong style={{ fontSize: 'var(--text-body)', color: regNo ? '#F8FAFC' : '#64748B', fontFamily: 'monospace' }}>
                      {regNo || 'Chưa cập nhật'}
                    </strong>
                  </div>
                </div>
              </section>

              {/* Section 2: AI Strategic Evaluation & Scores */}
              <section style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: '600', color: '#F1F5F9' }}>Strategic Assessment & Risk Posture</h3>
                </div>

                {recentScore ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    <div style={{ background: '#0F172A', padding: '14px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                      <span style={{ fontSize: 'var(--text-label)', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Overall Score</span>
                      <span style={{ fontSize: 'var(--text-metric)', fontWeight: '700', color: (recentScore.totalScore ?? recentScore.overallScore ?? 0) >= 70 ? '#22C55E' : '#F59E0B' }}>
                        {recentScore.totalScore ?? recentScore.overallScore ?? '—'} <span style={{ fontSize: 'var(--text-body)', color: '#64748B', fontWeight: 'normal' }}>/100</span>
                      </span>
                    </div>

                    <div style={{ background: '#0F172A', padding: '14px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                      <span style={{ fontSize: 'var(--text-label)', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Partner Fit</span>
                      <span style={{ fontSize: 'var(--text-metric)', fontWeight: '700', color: '#3B82F6' }}>
                        {recentScore.partnerFitScore ?? '—'}
                      </span>
                    </div>

                    <div style={{ background: '#0F172A', padding: '14px', borderRadius: '8px', border: '1px solid #334155', textAlign: 'center' }}>
                      <span style={{ fontSize: 'var(--text-label)', color: '#94A3B8', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>Risk Level</span>
                      <span style={{ fontSize: 'var(--text-metric)', fontWeight: '700', color: (recentScore.riskLevel ?? 0) <= 30 ? '#22C55E' : (recentScore.riskLevel ?? 0) <= 60 ? '#F59E0B' : '#EF4444' }}>
                        {recentScore.riskLevel ?? '—'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '24px 16px', textAlign: 'center', background: '#0F172A', borderRadius: '8px', border: '1px dashed #334155' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 'var(--text-body)', fontWeight: '600', color: '#CBD5E1' }}>Chưa có điểm đánh giá AI</p>
                    <span style={{ fontSize: 'var(--text-caption)', color: '#64748B' }}>Thực thể chưa chạy quy trình chấm điểm đối tác gần đây.</span>
                  </div>
                )}
              </section>

              {/* Section 3: Evidence Sources & Linked Artifacts */}
              <section style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: '600', color: '#F1F5F9' }}>Evidence Sources & Linked Artifacts</h3>
                </div>

                {!sources || (!sources.projectIds?.length && !sources.importJobIds?.length && !sources.rawDocumentIds?.length && !sources.candidateIds?.length) ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', background: '#0F172A', borderRadius: '8px', border: '1px dashed #334155' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 'var(--text-body)', fontWeight: '600', color: '#CBD5E1' }}>Chưa có nguồn dữ liệu đối chiếu</p>
                    <span style={{ fontSize: 'var(--text-caption)', color: '#64748B' }}>Không tìm thấy dự án hoặc tài liệu crawling liên quan trực tiếp.</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ background: '#0F172A', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #334155' }}>
                      <div>
                        <span style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', display: 'block' }}>Associated Projects</span>
                        <strong style={{ fontSize: 'var(--text-h2)', color: '#F8FAFC' }}>{sources.projectIds?.length || 0} projects</strong>
                      </div>
                    </div>

                    <div style={{ background: '#0F172A', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #334155' }}>
                      <div>
                        <span style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', display: 'block' }}>Candidate Profiles</span>
                        <strong style={{ fontSize: 'var(--text-h2)', color: '#F8FAFC' }}>{sources.candidateIds?.length || 0} candidates</strong>
                      </div>
                    </div>

                    <div style={{ background: '#0F172A', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #334155' }}>
                      <div>
                        <span style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', display: 'block' }}>Raw Evidence Docs</span>
                        <strong style={{ fontSize: 'var(--text-h2)', color: '#F8FAFC' }}>{sources.rawDocumentIds?.length || 0} documents</strong>
                      </div>
                    </div>

                    <div style={{ background: '#0F172A', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #334155' }}>
                      <div>
                        <span style={{ fontSize: 'var(--text-caption)', color: '#94A3B8', display: 'block' }}>Import Ingestion Jobs</span>
                        <strong style={{ fontSize: 'var(--text-h2)', color: '#F8FAFC' }}>{sources.importJobIds?.length || 0} jobs</strong>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
