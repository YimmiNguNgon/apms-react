import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Download,
  FileText,
  FolderKanban,
  ShieldCheck,
  Users,
  Award,
  Hash,
  Database,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../services/api';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';

export interface ScoreSnapshot {
  scoreSnapshotId: number;
  companyId: string;
  companyName?: string;
  projectId: string;
  candidateId: string;
  partnerFitScore: number;
  competitionLevel: number;
  riskLevel: number;
  relationshipStrength: number;
  totalScore: number;
  factorsJson: string;
  ruleVersion: string;
  generatedBy: string;
  createdAt: string;
}

interface CompanyDetailProps {
  companyId?: string;
  setActivePage?: (page: string) => void;
}

const displayReviewStatus = (status?: string | null) => {
  if (status === 'VERIFIED') return 'APPROVED';
  return status || 'APPROVED';
};

const formatCompanyName = (name?: string | null, rawId?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  if (rawId && rawId.trim()) {
    if (/^[0-9a-fA-F]{24}$/.test(rawId.trim())) {
      return `Công ty (ID: ${rawId.trim().substring(0, 8)}...)`;
    }
    return rawId.trim();
  }
  return 'Chưa có tên công ty';
};

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId, setActivePage }) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sources, setSources] = useState<ProfileSourcesResponse | null>(null);
  const [recentScore, setRecentScore] = useState<ScoreSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resolvedId = companyId ?? localStorage.getItem('apms-selected-company') ?? '';

  useEffect(() => {
    if (!resolvedId) {
      setLoading(false);
      setError('Chưa chọn hồ sơ doanh nghiệp.');
      return;
    }

    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, sourcesRes, scoreRes] = await Promise.all([
          api.get<ProfileResponse>(`/profiles/${resolvedId}`, { signal: controller.signal }),
          api.get<ProfileSourcesResponse>(`/profiles/${resolvedId}/sources`, { signal: controller.signal }).catch(() => null),
          api.get<ScoreSnapshot[]>('/dashboard/recent-scores', { signal: controller.signal }).catch(() => null),
        ]);

        if (controller.signal.aborted) return;
        setProfile(profileRes.data ?? null);
        setSources(sourcesRes?.data ?? null);

        if (scoreRes?.data && Array.isArray(scoreRes.data)) {
          const match = scoreRes.data.find((s) => s.companyId === resolvedId);
          setRecentScore(match || null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setProfile(null);
          setSources(null);
          setError(err instanceof Error ? err.message : 'Không thể tải thông tin hồ sơ doanh nghiệp.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [resolvedId]);

  const tradeName = profile?.identity?.tradeName;
  const legalName = profile?.identity?.legalName;
  const displayName = formatCompanyName(tradeName || legalName, resolvedId);
  const initials = displayName.substring(0, 2).toUpperCase();

  const handleExportPdf = () => {
    alert(`Đang khởi tạo tải báo cáo PDF hồ sơ doanh nghiệp [${displayName}]...`);
  };

  if (loading) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '32px 40px', color: '#0F172A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#64748B' }}>
          <div className="spinner" />
          <span>Đang tải thông tin chi tiết hồ sơ doanh nghiệp...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '32px 40px', color: '#0F172A' }}>
        <button
          onClick={() => (setActivePage ? setActivePage('partner-ecosystem') : history.back())}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#334155',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          <ArrowLeft size={16} /> Quay lại Partner Ecosystem
        </button>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <ShieldAlert size={48} style={{ color: '#EF4444', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px' }}>
            {error || 'Không tìm thấy hồ sơ doanh nghiệp'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '14px', margin: 0 }}>
            Hồ sơ có thể chưa được tạo hoặc bạn không có quyền truy cập.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#F8FAFC',
        minHeight: '100vh',
        padding: '24px 36px 48px',
        color: '#0F172A',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      id="page-company-detail-light"
    >
      {/* Top Navigation & Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>APMS</span>
            <span>/</span>
            <span>Partner Ecosystem</span>
            <span>/</span>
            <strong style={{ color: '#1E293B' }}>{displayName}</strong>
          </div>
          <button
            onClick={() => (setActivePage ? setActivePage('partner-ecosystem') : history.back())}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              color: '#2563EB',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              padding: 0,
              marginTop: '4px',
            }}
            id="btn-back-to-ecosystem"
          >
            <ArrowLeft size={16} /> ← Quay lại Ecosystem
          </button>
        </div>

        <div>
          <button
            onClick={handleExportPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '9px 16px',
              color: '#1E293B',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            id="btn-export-company-pdf"
          >
            <Download size={16} style={{ color: '#2563EB' }} /> Export PDF Hồ sơ
          </button>
        </div>
      </div>

      {/* Main Header Hero Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          padding: '28px 32px',
          marginBottom: '28px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap',
        }}
      >
        {/* Logo Avatar */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '24px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' }}>
              {displayName}
            </h1>
            <span
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '12px',
                fontWeight: '700',
                padding: '4px 12px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              PARTNER ECOSYSTEM
            </span>
            {profile.business?.industries?.[0] && (
              <span
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  borderRadius: '20px',
                }}
              >
                {profile.business.industries[0]}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Hash size={14} style={{ color: '#94A3B8' }} /> Company ID:{' '}
              <strong style={{ color: '#334155', fontFamily: 'monospace' }}>{resolvedId}</strong>
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} style={{ color: '#16A34A' }} /> Status:{' '}
              <strong style={{ color: '#15803D' }}>{displayReviewStatus(profile.reviewStatus)}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column CRM Dashboard Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '28px',
          alignItems: 'start',
        }}
        id="company-detail-2col-grid"
      >
        {/* Left Column (Primary Details) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Card 1: Identity & Registration */}
          <section
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '14px',
              }}
            >
              <Building2 size={20} style={{ color: '#2563EB' }} />
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                Thông tin Pháp lý & Định danh Doanh nghiệp
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Tên Thương Mại (Trade Name)
                </span>
                <strong style={{ fontSize: '15px', color: tradeName ? '#0F172A' : '#94A3B8', fontWeight: '700' }}>
                  {tradeName || 'Chưa cập nhật'}
                </strong>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Tên Pháp Lý (Legal Name)
                </span>
                <strong style={{ fontSize: '15px', color: legalName ? '#0F172A' : '#94A3B8', fontWeight: '700' }}>
                  {legalName || 'Chưa cập nhật'}
                </strong>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Mã Số Thuế (Tax Code)
                </span>
                <strong style={{ fontSize: '15px', color: profile.identity?.taxCode ? '#0F172A' : '#94A3B8', fontFamily: 'monospace', fontWeight: '700' }}>
                  {profile.identity?.taxCode || 'Chưa cập nhật'}
                </strong>
              </div>

              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748B', fontWeight: '700', display: 'block', marginBottom: '6px' }}>
                  Số Giấy Đăng Ký KD (Registration No)
                </span>
                <strong style={{ fontSize: '15px', color: profile.identity?.registrationNumber ? '#0F172A' : '#94A3B8', fontFamily: 'monospace', fontWeight: '700' }}>
                  {profile.identity?.registrationNumber || 'Chưa cập nhật'}
                </strong>
              </div>
            </div>
          </section>

          {/* Card 2: AI Strategic & Risk Assessment */}
          <section
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px 28px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '20px',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '14px',
              }}
            >
              <Award size={20} style={{ color: '#16A34A' }} />
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#0F172A' }}>
                Đánh giá Chiến lược & Rủi ro (AI Assessment)
              </h2>
            </div>

            {recentScore ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Fit Score Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>Điểm Phù Hợp Đối Tác (Partner Fit Score)</span>
                    <strong style={{ color: '#16A34A', fontWeight: '800' }}>{recentScore.partnerFitScore} / 100</strong>
                  </div>
                  <div style={{ height: '10px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${recentScore.partnerFitScore}%`,
                        height: '100%',
                        background: recentScore.partnerFitScore >= 70 ? '#16A34A' : '#D97706',
                        borderRadius: '6px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Risk Level Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>Mức Độ Rủi Ro (Risk Level)</span>
                    <strong style={{ color: recentScore.riskLevel <= 30 ? '#16A34A' : '#D97706', fontWeight: '800' }}>
                      {recentScore.riskLevel} / 100 (Thấp)
                    </strong>
                  </div>
                  <div style={{ height: '10px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${recentScore.riskLevel}%`,
                        height: '100%',
                        background: recentScore.riskLevel <= 30 ? '#16A34A' : recentScore.riskLevel <= 60 ? '#D97706' : '#DC2626',
                        borderRadius: '6px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Competition Level */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>Mức Độ Cạnh Tranh (Competition Level)</span>
                    <strong style={{ color: '#2563EB', fontWeight: '800' }}>{recentScore.competitionLevel} / 100</strong>
                  </div>
                  <div style={{ height: '10px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${recentScore.competitionLevel}%`,
                        height: '100%',
                        background: '#2563EB',
                        borderRadius: '6px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Light theme empty state */
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <Award size={36} style={{ color: '#94A3B8', marginBottom: '10px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: '700', color: '#334155' }}>
                  Chưa có kết quả chấm điểm AI
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748B', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  Doanh nghiệp này chưa thực hiện quy trình đánh giá điểm số rủi ro & phù hợp tự động.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Sidebar Summary Cards) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Card 3: Quick Info Summary */}
          <section
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '12px',
              }}
            >
              <Info size={18} style={{ color: '#2563EB' }} />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Tóm tắt Nhanh</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Ngành nghề:</span>
                <span style={{ fontWeight: '700', color: '#1E293B', background: '#F1F5F9', padding: '2px 8px', borderRadius: '6px' }}>
                  {profile.business?.industries?.[0] || 'Chung'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Trạng thái xác minh:</span>
                <span style={{ fontWeight: '700', color: '#15803D', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                  {displayReviewStatus(profile.reviewStatus)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Cập nhật lần cuối:</span>
                <span style={{ fontWeight: '600', color: '#334155' }}>
                  {profile.metadata?.updatedAt ? new Date(profile.metadata.updatedAt).toLocaleDateString() : 'Vừa xong'}
                </span>
              </div>
            </div>
          </section>

          {/* Card 4: Evidence Sources & Linked Artifacts */}
          <section
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '12px',
              }}
            >
              <Database size={18} style={{ color: '#7C3AED' }} />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>Nguồn Bằng Chứng</h2>
            </div>

            {!sources || (!sources.projectIds?.length && !sources.importJobIds?.length && !sources.rawDocumentIds?.length && !sources.candidateIds?.length) ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px dashed #E2E8F0',
                }}
              >
                <FileText size={28} style={{ color: '#94A3B8', marginBottom: '8px' }} />
                <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '600', color: '#475569' }}>
                  Chưa liên kết tài liệu
                </p>
                <span style={{ fontSize: '12px', color: '#64748B' }}>Không tìm thấy dự án hoặc bản ghi crawling liên quan.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9' }}>
                  <FolderKanban size={16} style={{ color: '#2563EB' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Dự án nghiên cứu</span>
                    <strong style={{ fontSize: '14px', color: '#0F172A' }}>{sources.projectIds?.length || 0} dự án</strong>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9' }}>
                  <Users size={16} style={{ color: '#16A34A' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Hồ sơ Candidate</span>
                    <strong style={{ fontSize: '14px', color: '#0F172A' }}>{sources.candidateIds?.length || 0} ứng viên</strong>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9' }}>
                  <FileText size={16} style={{ color: '#D97706' }} />
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Tài liệu thô</span>
                    <strong style={{ fontSize: '14px', color: '#0F172A' }}>{sources.rawDocumentIds?.length || 0} tài liệu</strong>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
