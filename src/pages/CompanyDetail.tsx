import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useUser, ROLES } from '../context/UserContext';
import type { Role } from '../context/UserContext';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';
import { CompanyRelationshipClosenessPanel } from '../components/CompanyRelationshipClosenessPanel';
import {
  ListingTabBar,
  ListingTabContent,
  type ListingTabId,
} from './companyDetail/ListingTabs';

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
    padding: '8px 16px 16px',
    color: '#0F172A',
    fontFamily: 'Inter, system-ui, sans-serif',
  } as const,
  container: { maxWidth: '1440px', margin: '0 auto' } as const,
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '8px 12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
  } as const,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    marginBottom: '6px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '4px',
  } as const,
  h2: { margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' } as const,
  h3: { margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' } as const,
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } as const,
  fieldCell: {
    background: '#F8FAFC',
    padding: '5px 8px',
    borderRadius: '6px',
    border: '1px solid #F1F5F9',
    minWidth: 0,
  } as const,
  fieldLabel: {
    fontSize: '0.62rem',
    color: '#64748B',
    fontWeight: 500,
    display: 'block',
    marginBottom: '2px',
  } as const,
  value: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#0F172A',
    wordBreak: 'break-word' as const,
  } as const,
  muted: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#94A3B8',
    wordBreak: 'break-word' as const,
  } as const,
};

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId, setActivePage }) => {
  const { currentUser } = useUser();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sources, setSources] = useState<ProfileSourcesResponse | null>(null);
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
        const [profileRes, sourcesRes] = await Promise.all([
          api.get<ProfileResponse>(`/profiles/${resolvedId}`, { signal: controller.signal }),
          api.get<ProfileSourcesResponse>(`/profiles/${resolvedId}/sources`, { signal: controller.signal }).catch(() => null),
        ]);

        if (controller.signal.aborted) return;
        setProfile(profileRes.data ?? null);
        setSources(sourcesRes?.data ?? null);
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
  const relationshipClosenessProfileId = profile?.id || resolvedId;

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
      <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '0.78rem' }}>
          <span>Đang tải thông tin chi tiết hồ sơ doanh nghiệp...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
        <button
          onClick={() => (setActivePage ? setActivePage('company-profiles') : history.back())}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#334155',
            fontSize: '0.72rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          &larr; Quay lại danh sách doanh nghiệp
        </button>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            maxWidth: '480px',
            margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', margin: '0 0 6px' }}>
            {error || 'Không tìm thấy hồ sơ doanh nghiệp'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.72rem', margin: 0 }}>
            Hồ sơ có thể chưa được tạo hoặc bạn không có quyền truy cập.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={C.page} id="page-company-detail-light">
      <div style={C.container}>
        {/* Top Navigation & Breadcrumb */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => (setActivePage ? setActivePage('company-profiles') : history.back())}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
              id="btn-back-to-company-list"
            >
              &larr; Quay lại danh sách doanh nghiệp
            </button>
            <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>|</span>
            <div style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>APMS</span>
              <span>/</span>
              <span>Company Detail</span>
              <span>/</span>
              <strong style={{ color: '#1E293B', fontWeight: 600 }}>{displayName}</strong>
            </div>
          </div>

          <div>
            <button
              onClick={handleExportPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '3px 9px',
                color: '#1E293B',
                fontSize: '0.68rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              }}
              id="btn-export-company-pdf"
            >
              Export PDF Hồ sơ
            </button>
          </div>
        </div>

        {/* Main Header Hero Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '8px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '0.85rem',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.18)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
                {displayName}
              </h1>
              <span
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
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
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: '999px',
                  }}
                >
                  {profile.business.industries[0]}
                </span>
              )}
              <span style={{ fontSize: '0.65rem', color: '#64748B', marginLeft: 'auto' }}>
                Trạng thái: <strong style={{ color: '#15803D', fontWeight: 700 }}>{profile.reviewStatus || 'VERIFIED'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <ListingTabBar activeTab={activeTab} onTabChange={setActiveTab} companyId={resolvedId} />

        {activeTab === 'overview' ? (
          <>
            {/* 2-Column Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: '10px',
                alignItems: 'start',
              }}
              id="company-detail-2col-grid"
            >
              {/* Left Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Panel 1: Identity & Registration */}
                <section style={C.card}>
                  <div style={C.cardHeader}>
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

                  {/* Panel 2: Listing Info inside Panel 1 footer */}
                  <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '6px',
                      }}
                    >
                      <h3 style={C.h3}>Thông Tin Niêm Yết (Mã Cổ Phiếu)</h3>
                      {canEditListing && !listingEditing && (
                        <button
                          type="button"
                          onClick={startListingEdit}
                          style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.62rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          Cập nhật mã CK
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
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
                              padding: '4px 8px',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
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
                              padding: '4px 8px',
                              border: '1px solid #CBD5E1',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
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
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => void handleSaveListing()}
                            disabled={listingSaving || (exchangeDraft !== 'NONE' && !tickerDraft.trim())}
                            style={{
                              background: '#2563EB',
                              border: 'none',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '6px',
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
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    )}

                    {listingMsg && (
                      <div style={{ marginTop: '6px', fontSize: '0.62rem', fontWeight: 500, color: listingMsg.ok ? '#15803D' : '#B91C1C' }}>
                        {listingMsg.text}
                      </div>
                    )}
                  </div>
                </section>

                {/* Panel 3: AI Strategic & Risk Assessment */}
              </div>

              {/* Right Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <CompanyRelationshipClosenessPanel
                  companyProfileId={relationshipClosenessProfileId}
                  currentUserRole={currentUser?.role}
                />

                {/* Card 3: Quick Info Summary */}
                <section style={C.card}>
                  <div style={C.cardHeader}>
                    <h2 style={C.h2}>Tóm tắt Nhanh</h2>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Ngành nghề</span>
                      <span style={{ fontWeight: 600, color: '#1E293B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>
                        {profile.business?.industries?.[0] || 'Chung'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Trạng thái xác minh</span>
                      <span style={{ fontWeight: 600, color: '#15803D', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                        {profile.reviewStatus || 'VERIFIED'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Cập nhật lần cuối</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        {profile.metadata?.updatedAt ? new Date(profile.metadata.updatedAt).toLocaleDateString() : 'Vừa xong'}
                      </span>
                    </div>
                  </div>
                </section>

                {/* Card 4: Evidence Sources */}
                <section style={C.card}>
                  <div style={C.cardHeader}>
                    <h2 style={C.h2}>Nguồn Bằng Chứng</h2>
                  </div>

                  {!sources || (!sources.projectIds?.length && !sources.importJobIds?.length && !sources.rawDocumentIds?.length && !sources.candidateIds?.length) ? (
                    <div
                      style={{
                        padding: '12px 10px',
                        textAlign: 'center',
                        background: '#F8FAFC',
                        borderRadius: '6px',
                        border: '1px dashed #E2E8F0',
                      }}
                    >
                      <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>
                        Chưa liên kết tài liệu
                      </p>
                      <span style={{ fontSize: '0.62rem', color: '#64748B' }}>Không tìm thấy dự án hoặc bản ghi crawling liên quan.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ background: '#F8FAFC', padding: '5px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Dự án nghiên cứu</span>
                        <strong style={{ fontSize: '0.72rem', color: '#0F172A' }}>{sources.projectIds?.length || 0} dự án</strong>
                      </div>

                      <div style={{ background: '#F8FAFC', padding: '5px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Hồ sơ Candidate</span>
                        <strong style={{ fontSize: '0.72rem', color: '#0F172A' }}>{sources.candidateIds?.length || 0} ứng viên</strong>
                      </div>

                      <div style={{ background: '#F8FAFC', padding: '5px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #F1F5F9' }}>
                        <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Tài liệu thô</span>
                        <strong style={{ fontSize: '0.72rem', color: '#0F172A' }}>{sources.rawDocumentIds?.length || 0} tài liệu</strong>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        ) : (
          <ListingTabContent
            companyId={resolvedId}
            companyProfileId={relationshipClosenessProfileId}
            activeTab={activeTab}
            userRole={currentUser?.role}
          />
        )}
      </div>
    </div>
  );
};
