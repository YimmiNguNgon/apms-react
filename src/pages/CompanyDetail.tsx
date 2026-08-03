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
  Database,
  Info,
  ShieldAlert,
  Pencil,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api';
import { useUser, ROLES } from '../context/UserContext';
import type { Role } from '../context/UserContext';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';
import {
  ListingTabBar,
  ListingTabContent,
  type ListingTabId,
} from './companyDetail/ListingTabs';

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

const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return 'Chưa có tên công ty';
};

/* ── Compact layout & design-token helpers (Overview tab) ────────── */
const C = {
  page: {
    background: '#F8FAFC',
    minHeight: '100vh',
    padding: '14px 28px 32px',
    color: '#0F172A',
    fontFamily: 'Inter, system-ui, sans-serif',
  } as const,
  container: { maxWidth: '1440px', margin: '0 auto' } as const,
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    padding: '14px 16px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  } as const,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '8px',
  } as const,
  h2: { margin: 0, fontSize: 'var(--text-h2)', fontWeight: 600, color: '#0F172A' } as const,
  h3: { margin: 0, fontSize: 'var(--text-body)', fontWeight: 700, color: '#0F172A' } as const,
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' } as const,
  fieldCell: {
    background: '#F8FAFC',
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid #F1F5F9',
    minWidth: 0,
  } as const,
  fieldLabel: {
    fontSize: 'var(--text-label)',
    color: '#64748B',
    fontWeight: 500,
    display: 'block',
    marginBottom: '4px',
  } as const,
  value: {
    fontSize: 'var(--text-body)',
    fontWeight: 700,
    color: '#0F172A',
    wordBreak: 'break-word' as const,
  } as const,
  muted: {
    fontSize: 'var(--text-body)',
    fontWeight: 700,
    color: '#94A3B8',
    wordBreak: 'break-word' as const,
  } as const,
};

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId, setActivePage }) => {
  const { currentUser } = useUser();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sources, setSources] = useState<ProfileSourcesResponse | null>(null);
  const [recentScore, setRecentScore] = useState<ScoreSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingEditing, setListingEditing] = useState(false);
  const [tickerDraft, setTickerDraft] = useState('');
  const [exchangeDraft, setExchangeDraft] = useState('NONE');
  const [listingSaving, setListingSaving] = useState(false);
  const [listingMsg, setListingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');

  const canEditListing =
    !!currentUser &&
    ([ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER] as Role[]).includes(currentUser.role);

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
  const displayName = formatCompanyName(tradeName || legalName);
  const initials = displayName.substring(0, 2).toUpperCase();

  const handleExportPdf = () => {
    alert(`Đang khởi tạo tải báo cáo PDF hồ sơ doanh nghiệp [${displayName}]...`);
  };

  const ticker = profile?.stockTicker?.trim() || '';
  const exchange = profile?.stockExchange || 'NONE';
  const exchangeLabel = (ex?: string) => (ex && ex !== 'NONE' ? ex : 'Chưa niêm yết');

  const startListingEdit = () => {
    setTickerDraft(ticker);
    setExchangeDraft(exchange);
    setListingMsg(null);
    setListingEditing(true);
  };

  const handleSaveListing = async () => {
    setListingSaving(true);
    setListingMsg(null);
    try {
      const res = await api.patch<ProfileResponse>(
        `/company-profiles/${resolvedId}/listing-info`,
        {
          stockTicker: tickerDraft.trim().toUpperCase(),
          stockExchange: exchangeDraft,
        },
      );
      if (res?.data) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                stockTicker: res.data!.stockTicker,
                stockExchange: res.data!.stockExchange,
              }
            : prev,
        );
        setListingEditing(false);
        setListingMsg({ ok: true, text: 'Đã lưu thông tin niêm yết thành công.' });
      }
    } catch (err) {
      setListingMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Lưu thông tin niêm yết thất bại.',
      });
    } finally {
      setListingSaving(false);
    }
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
      style={C.page}
      id="page-company-detail-light"
    >
      <div style={C.container}>
      {/* Top Navigation & Breadcrumb */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: 'var(--text-caption)', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>APMS</span>
            <span>/</span>
            <span>Partner Ecosystem</span>
            <span>/</span>
            <strong style={{ color: '#1E293B', fontWeight: 600 }}>{displayName}</strong>
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
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              marginTop: '2px',
            }}
            id="btn-back-to-ecosystem"
          >
            <ArrowLeft size={15} /> ← Quay lại Ecosystem
          </button>
        </div>

        <div>
          <button
            onClick={handleExportPdf}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '7px 14px',
              color: '#1E293B',
              fontSize: 'var(--text-body)',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'all 0.15s ease',
            }}
            id="btn-export-company-pdf"
          >
            <Download size={15} style={{ color: '#2563EB' }} /> Export PDF Hồ sơ
          </button>
        </div>
      </div>

      {/* Main Header Hero Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '14px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Logo Avatar */}
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '18px',
            boxShadow: '0 3px 10px rgba(37, 99, 235, 0.22)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.3px' }}>
              {displayName}
            </h1>
            <span
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: 'var(--text-caption)',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
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
                  fontSize: 'var(--text-caption)',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '999px',
                }}
              >
                {profile.business.industries[0]}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: 'var(--text-body)', color: '#64748B' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={13} style={{ color: '#16A34A' }} /> Status:{' '}
              <strong style={{ color: '#15803D', fontWeight: 600 }}>{profile.reviewStatus || 'VERIFIED'}</strong>
            </span>
          </div>
        </div>
      </div>

      <ListingTabBar activeTab={activeTab} onTabChange={setActiveTab} companyId={resolvedId} />

      {activeTab === 'overview' ? (
        <>
          {/* 2-Column CRM Dashboard Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '16px',
              alignItems: 'start',
            }}
            id="company-detail-2col-grid"
          >
        {/* Left Column (Primary Details) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 1: Identity & Registration */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <Building2 size={17} style={{ color: '#2563EB' }} />
              <h2 style={C.h2}>Thông tin Pháp lý & Định danh Doanh nghiệp</h2>
            </div>

            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Tên Thương Mại (Trade Name)</span>
                <strong style={tradeName ? C.value : C.muted}>{tradeName || 'Chưa cập nhật'}</strong>
              </div>

              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Tên Pháp Lý (Legal Name)</span>
                <strong style={legalName ? C.value : C.muted}>{legalName || 'Chưa cập nhật'}</strong>
              </div>

              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Mã Số Thuế (Tax Code)</span>
                <strong style={{ ...(profile.identity?.taxCode ? C.value : C.muted), fontFamily: 'monospace' }}>
                  {profile.identity?.taxCode || 'Chưa cập nhật'}
                </strong>
              </div>

              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Số Giấy Đăng Ký KD (Registration No)</span>
                <strong style={{ ...(profile.identity?.registrationNumber ? C.value : C.muted), fontFamily: 'monospace' }}>
                  {profile.identity?.registrationNumber || 'Chưa cập nhật'}
                </strong>
              </div>
            </div>

            <div style={{ marginTop: '14px', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={15} style={{ color: '#0EA5E9' }} />
                  <h3 style={C.h3}>Thông Tin Niêm Yết (Mã Cổ Phiếu)</h3>
                </div>
                {canEditListing && !listingEditing && (
                  <button
                    type="button"
                    onClick={startListingEdit}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      fontSize: 'var(--text-caption)',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '7px',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={12} /> Cập nhật mã CK
                  </button>
                )}
              </div>

              {!listingEditing ? (
                <div style={C.fieldGrid}>
                  <div style={C.fieldCell}>
                    <span style={C.fieldLabel}>Mã Cổ Phiếu (Ticker)</span>
                    <strong style={{ ...(ticker ? C.value : C.muted), color: ticker ? '#1E40AF' : '#94A3B8', fontFamily: 'monospace' }}>
                      {ticker || 'Chưa niêm yết'}
                    </strong>
                  </div>
                  <div style={C.fieldCell}>
                    <span style={C.fieldLabel}>Sàn Giao Dịch (Exchange)</span>
                    <strong style={exchange !== 'NONE' ? C.value : C.muted}>{exchangeLabel(exchange)}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                  <div>
                    <span style={C.fieldLabel}>Mã Cổ Phiếu</span>
                    <input
                      type="text"
                      value={tickerDraft}
                      disabled={exchangeDraft === 'NONE'}
                      onChange={(event) => setTickerDraft(event.target.value.toUpperCase())}
                      placeholder="VD: FPT"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '7px',
                        fontSize: 'var(--text-body)',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        background: exchangeDraft === 'NONE' ? '#F1F5F9' : '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <span style={C.fieldLabel}>Sàn Giao Dịch</span>
                    <select
                      value={exchangeDraft}
                      onChange={(event) => {
                        const next = event.target.value;
                        setExchangeDraft(next);
                        if (next === 'NONE') setTickerDraft('');
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '7px',
                        fontSize: 'var(--text-body)',
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="HOSE">HOSE</option>
                      <option value="HNX">HNX</option>
                      <option value="UPCOM">UPCOM</option>
                      <option value="NONE">Chưa niêm yết</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => void handleSaveListing()}
                      disabled={listingSaving || (exchangeDraft !== 'NONE' && !tickerDraft.trim())}
                      style={{
                        background: '#2563EB',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: 'var(--text-body)',
                        fontWeight: 600,
                        padding: '7px 14px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                        opacity: listingSaving || (exchangeDraft !== 'NONE' && !tickerDraft.trim()) ? 0.5 : 1,
                      }}
                    >
                      {listingSaving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setListingEditing(false)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        fontSize: 'var(--text-body)',
                        fontWeight: 600,
                        padding: '7px 14px',
                        borderRadius: '7px',
                        cursor: 'pointer',
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {listingMsg && (
                <div style={{ marginTop: '8px', fontSize: 'var(--text-caption)', fontWeight: 500, color: listingMsg.ok ? '#15803D' : '#B91C1C' }}>
                  {listingMsg.text}
                </div>
              )}
            </div>
          </section>

          {/* Card 2: AI Strategic & Risk Assessment */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <Award size={17} style={{ color: '#16A34A' }} />
              <h2 style={C.h2}>Đánh giá Chiến lược & Rủi ro (AI Assessment)</h2>
            </div>

            {recentScore ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Fit Score Progress Bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--text-body)' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Điểm Phù Hợp Đối Tác (Partner Fit Score)</span>
                    <strong style={{ color: '#16A34A', fontWeight: 700 }}>{recentScore.partnerFitScore} / 100</strong>
                  </div>
                  <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--text-body)' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Mức Độ Rủi Ro (Risk Level)</span>
                    <strong style={{ color: recentScore.riskLevel <= 30 ? '#16A34A' : '#D97706', fontWeight: 700 }}>
                      {recentScore.riskLevel} / 100 (Thấp)
                    </strong>
                  </div>
                  <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: 'var(--text-body)' }}>
                    <span style={{ fontWeight: 600, color: '#334155' }}>Mức Độ Cạnh Tranh (Competition Level)</span>
                    <strong style={{ color: '#2563EB', fontWeight: 700 }}>{recentScore.competitionLevel} / 100</strong>
                  </div>
                  <div style={{ height: '8px', background: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
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
                  padding: '20px 16px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px dashed #CBD5E1',
                }}
              >
                <Award size={28} style={{ color: '#94A3B8', marginBottom: '6px' }} />
                <h3 style={{ margin: '0 0 4px', fontSize: 'var(--text-body)', fontWeight: 700, color: '#334155' }}>
                  Chưa có kết quả chấm điểm AI
                </h3>
                <p style={{ margin: 0, fontSize: 'var(--text-caption)', color: '#64748B', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
                  Doanh nghiệp này chưa thực hiện quy trình đánh giá điểm số rủi ro & phù hợp tự động.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right Column (Sidebar Summary Cards) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Card 3: Quick Info Summary */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <Info size={16} style={{ color: '#2563EB' }} />
              <h2 style={C.h2}>Tóm tắt Nhanh</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: 'var(--text-body)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-label)', color: '#64748B' }}>Ngành nghề</span>
                <span style={{ fontWeight: 600, color: '#1E293B', background: '#F1F5F9', padding: '1px 8px', borderRadius: '6px' }}>
                  {profile.business?.industries?.[0] || 'Chung'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-label)', color: '#64748B' }}>Trạng thái xác minh</span>
                <span style={{ fontWeight: 600, color: '#15803D', background: '#DCFCE7', padding: '1px 8px', borderRadius: '6px' }}>
                  {profile.reviewStatus || 'VERIFIED'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-label)', color: '#64748B' }}>Cập nhật lần cuối</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {profile.metadata?.updatedAt ? new Date(profile.metadata.updatedAt).toLocaleDateString() : 'Vừa xong'}
                </span>
              </div>
            </div>
          </section>

          {/* Card 4: Evidence Sources & Linked Artifacts */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <Database size={16} style={{ color: '#7C3AED' }} />
              <h2 style={C.h2}>Nguồn Bằng Chứng</h2>
            </div>

            {!sources || (!sources.projectIds?.length && !sources.importJobIds?.length && !sources.rawDocumentIds?.length && !sources.candidateIds?.length) ? (
              <div
                style={{
                  padding: '18px 14px',
                  textAlign: 'center',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                  border: '1px dashed #E2E8F0',
                }}
              >
                <FileText size={24} style={{ color: '#94A3B8', marginBottom: '6px' }} />
                <p style={{ margin: '0 0 2px', fontSize: 'var(--text-body)', fontWeight: 600, color: '#475569' }}>
                  Chưa liên kết tài liệu
                </p>
                <span style={{ fontSize: 'var(--text-caption)', color: '#64748B' }}>Không tìm thấy dự án hoặc bản ghi crawling liên quan.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ background: '#F8FAFC', padding: '9px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '9px', border: '1px solid #F1F5F9' }}>
                  <FolderKanban size={15} style={{ color: '#2563EB' }} />
                  <div>
                    <span style={{ fontSize: 'var(--text-caption)', color: '#64748B', display: 'block' }}>Dự án nghiên cứu</span>
                    <strong style={{ fontSize: 'var(--text-body)', color: '#0F172A' }}>{sources.projectIds?.length || 0} dự án</strong>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '9px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '9px', border: '1px solid #F1F5F9' }}>
                  <Users size={15} style={{ color: '#16A34A' }} />
                  <div>
                    <span style={{ fontSize: 'var(--text-caption)', color: '#64748B', display: 'block' }}>Hồ sơ Candidate</span>
                    <strong style={{ fontSize: 'var(--text-body)', color: '#0F172A' }}>{sources.candidateIds?.length || 0} ứng viên</strong>
                  </div>
                </div>

                <div style={{ background: '#F8FAFC', padding: '9px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '9px', border: '1px solid #F1F5F9' }}>
                  <FileText size={15} style={{ color: '#D97706' }} />
                  <div>
                    <span style={{ fontSize: 'var(--text-caption)', color: '#64748B', display: 'block' }}>Tài liệu thô</span>
                    <strong style={{ fontSize: 'var(--text-body)', color: '#0F172A' }}>{sources.rawDocumentIds?.length || 0} tài liệu</strong>
                  </div>
                </div>
              </div>
            )}
          </section>
          </div>
        </div>
        </>
      ) : (
        <ListingTabContent companyId={resolvedId} activeTab={activeTab} />
      )}
      </div>
    </div>
  );
};
