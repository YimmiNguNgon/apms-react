import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type PageResponse } from '../services/api';
import { useUser, ROLES } from '../context/UserContext';
import type { Role } from '../context/UserContext';
import type { ProfileResponse, ProfileSourcesResponse, OwnerCompanyIntelligenceResponse, ProjectResponse } from '../types/domain';
import { CompanyRelationshipClosenessPanel } from '../components/CompanyRelationshipClosenessPanel';
import {
  ListingTabBar,
  type ListingTabId,
} from './companyDetail/ListingTabs';
import BoardMembersTab from './companyDetail/BoardMembersTab';
import FinancialsTab from './companyDetail/FinancialsTab';
import NewsTab from './companyDetail/NewsTab';
import DocumentsTab from './companyDetail/DocumentsTab';
import ConfidentialNewsTab from './companyDetail/ConfidentialNewsTab';
import { ExternalLink, HelpCircle, AlertCircle, Info, Sparkles } from 'lucide-react';

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
  const { t } = useTranslation('company-list');
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
  const [intelligence, setIntelligence] = useState<OwnerCompanyIntelligenceResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  const [projects, setProjects] = useState<ProjectResponse[]>([]);

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

        let intelRes = null;
        if (currentUser?.role === ROLES.OWNER) {
          try {
            intelRes = await api.get<OwnerCompanyIntelligenceResponse>(`/owner/company-intelligence/${resolvedId}`, { signal: controller.signal });
          } catch (err) {
            console.error('Failed to load company intelligence data:', err);
          }
        }

        let projectsRes = null;
        try {
          projectsRes = await api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 100 }, signal: controller.signal });
        } catch (err) {
          console.error('Failed to load projects:', err);
        }

        if (controller.signal.aborted) return;
        setProfile(profileRes.data ?? null);
        setSources(sourcesRes?.data ?? null);
        setIntelligence(intelRes?.data ?? null);
        setProjects(projectsRes?.data?.content ?? []);
      } catch (err) {
        if (!controller.signal.aborted) {
          setProfile(null);
          setSources(null);
          setIntelligence(null);
          setProjects([]);
          setError(err instanceof Error ? err.message : 'Không thể tải thông tin hồ sơ doanh nghiệp.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [resolvedId, currentUser?.role]);

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


  const renderOverviewTab = () => {
    const taxCode = profile?.identity?.taxCode || 'Chưa cập nhật';
    const regNo = profile?.identity?.registrationNumber || 'Chưa cập nhật';
    const empCount = profile?.companySize?.employeeCount || intelligence?.company?.employeeCount;
    const empTier = profile?.companySize?.employeeTier;
    const sizeStr = empCount ? `${empCount} nhân sự ${empTier ? `(${empTier})` : ''}` : (empTier || 'Chưa cập nhật');
    const website = profile?.contact?.website || intelligence?.company?.website || 'Chưa cập nhật';
    const email = profile?.contact?.emails?.[0] || 'Chưa cập nhật';
    const phone = profile?.contact?.phones?.[0] || 'Chưa cập nhật';
    const address = profile?.contact?.addresses?.[0]?.fullAddress || intelligence?.company?.headquarters || 'Chưa cập nhật';

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'start' }} id="company-detail-2col-grid">
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Panel 1: Legal Identity */}
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
                <strong style={{ ...(taxCode !== 'Chưa cập nhật' ? C.value : C.muted), fontFamily: 'monospace' }}>{taxCode}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Số Giấy Đăng Ký KD (Registration No)</span>
                <strong style={{ ...(regNo !== 'Chưa cập nhật' ? C.value : C.muted), fontFamily: 'monospace' }}>{regNo}</strong>
              </div>
            </div>
            
            {/* Ticker & Exchange inside Panel 1 */}
            <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h3 style={C.h3}>Thông Tin Niêm Yết</h3>
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

          {/* Panel 2: Contact & Headquarters */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Thông tin Liên hệ & Quy mô</h2>
            </div>
            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Website</span>
                {website !== 'Chưa cập nhật' ? (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                    {website}
                  </a>
                ) : (
                  <strong style={C.muted}>{website}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Email liên hệ</span>
                <strong style={email !== 'Chưa cập nhật' ? C.value : C.muted}>{email}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Điện thoại</span>
                <strong style={phone !== 'Chưa cập nhật' ? C.value : C.muted}>{phone}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Quy mô nhân sự</span>
                <strong style={sizeStr !== 'Chưa cập nhật' ? C.value : C.muted}>{sizeStr}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Địa chỉ trụ sở chính</span>
                <strong style={address !== 'Chưa cập nhật' ? C.value : C.muted}>{address}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Ngày thành lập</span>
                <strong style={C.muted}>N/A</strong>
              </div>
            </div>
          </section>

          {/* Panel 3: Description & Summary */}
          {(profile?.business?.businessModel || intelligence?.company?.businessModel) && (
            <section style={C.card}>
              <div style={C.cardHeader}>
                <h2 style={C.h2}>Giới thiệu & Mô hình kinh doanh</h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#334155', lineHeight: '1.5' }}>
                {profile?.business?.businessModel || intelligence?.company?.businessModel}
              </p>
            </section>
          )}

          {/* Panel 4: AI Extracted Facts */}
          {intelligence && (
            <section style={{ ...C.card, background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1px solid #BFDBFE' }}>
              <div style={C.cardHeader}>
                <h2 style={{ ...C.h2, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} style={{ color: '#2563EB' }} />
                  <span>Dữ liệu AI trích xuất (AI Extracted Facts)</span>
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                {intelligence.executiveBrief?.summary && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Tóm lược của AI: </span>
                    <span style={{ color: '#1E293B' }}>{intelligence.executiveBrief.summary}</span>
                  </div>
                )}
                {intelligence.metadata?.dataQuality && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Độ tin cậy dữ liệu: </span>
                    <span style={{ color: '#15803D', fontWeight: 700 }}>{intelligence.metadata.dataQuality}</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <CompanyRelationshipClosenessPanel
            companyProfileId={relationshipClosenessProfileId}
            currentUserRole={currentUser?.role}
          />

          {/* Quick Info Summary */}
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

          {/* Evidence Sources */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Nguồn Bằng Chứng</h2>
            </div>
            {!sources || (!sources.projectIds?.length && !sources.importJobIds?.length && !sources.rawDocumentIds?.length && !sources.candidateIds?.length) ? (
              <div style={{ padding: '12px 10px', textAlign: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #E2E8F0' }}>
                <p style={{ margin: '0 0 2px', fontSize: '0.72rem', fontWeight: 600, color: '#475569' }}>Chưa liên kết tài liệu</p>
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
    );
  };

  const renderSwotTab = () => {
    const swot = profile?.insights || {};
    const strengths = swot.strengths || [];
    const weaknesses = swot.weaknesses || [];
    const opportunities = swot.opportunities || [];
    const threats = swot.threats || [];

    const hasSwot = strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0 || threats.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{t('swot.headerTitle')}</h2>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>{t('swot.headerDesc')}</p>
        </div>

        {!hasSwot ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>{t('swot.noData')}</p>
          </div>
        ) : (
          <div className="company-detail-swot-grid">
            <div className="company-detail-swot-card strength">
              <strong>{t('swot.strengths')}</strong>
              {strengths.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noStrengths')}</p>}
            </div>

            <div className="company-detail-swot-card weakness">
              <strong>{t('swot.weaknesses')}</strong>
              {weaknesses.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noWeaknesses')}</p>}
            </div>

            <div className="company-detail-swot-card opportunity">
              <strong>{t('swot.opportunities')}</strong>
              {opportunities.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {opportunities.map((o, idx) => <li key={idx}>{o}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noOpportunities')}</p>}
            </div>

            <div className="company-detail-swot-card threat">
              <strong>{t('swot.threats')}</strong>
              {threats.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {threats.map((t, idx) => <li key={idx}>{t}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noThreats')}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBusinessFieldsTab = () => {
    const products = profile?.business?.products || intelligence?.products || [];
    const industries = profile?.business?.industries || intelligence?.company?.industries || [];
    const markets = profile?.business?.markets || intelligence?.company?.markets || [];
    const targetCustomers = profile?.business?.targetCustomers || [];

    const hasData = products.length > 0 || industries.length > 0 || markets.length > 0 || targetCustomers.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Lĩnh vực & Hoạt động Kinh doanh</h2>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>Thông tin chi tiết về các sản phẩm/dịch vụ cung cấp, phân khúc thị trường và đối tượng khách hàng mục tiêu.</p>
        </div>

        {!hasData ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Chưa có dữ liệu lĩnh vực kinh doanh.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
            {/* Products & Services Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <section style={C.card}>
                <div style={C.cardHeader}>
                  <h2 style={C.h2}>Sản phẩm & Dịch vụ (Products & Services)</h2>
                </div>
                {products.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {products.map((p, idx) => (
                      <div key={idx} style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '0.76rem', color: '#0F172A' }}>{p.name}</strong>
                          {p.category && (
                            <span style={{ fontSize: '0.62rem', background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {p.category}
                            </span>
                          )}
                        </div>
                        {p.description && <p style={{ margin: 0, fontSize: '0.7rem', color: '#475569', lineHeight: '1.4' }}>{p.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Chưa ghi nhận danh mục sản phẩm/dịch vụ.</p>
                )}
              </section>
            </div>

            {/* Markets & Customers Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <section style={C.card}>
                <div style={C.cardHeader}>
                  <h2 style={C.h2}>Thị trường & Khách hàng (Markets & Customers)</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Markets */}
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Thị trường hoạt động</span>
                    {markets.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {markets.map((m, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa cập nhật</span>}
                  </div>

                  {/* Customers */}
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Khách hàng mục tiêu</span>
                    {targetCustomers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {targetCustomers.map((c, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa cập nhật</span>}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRelationshipTab = () => {
    const relType = intelligence?.relationship?.type || profile?.relationshipType || 'Chưa cập nhật';
    const impact = intelligence?.relationship?.businessImpact || 'Chưa cập nhật';
    const relevance = intelligence?.relationship?.strategicRelevance || 'Chưa cập nhật';
    const trend = intelligence?.relationship?.impactTrend || 'STABLE';

    const impactColorLocal = (val: string) => {
      const u = val.toUpperCase();
      if (u === 'CRITICAL' || u === 'HIGH') return '#B91C1C';
      if (u === 'MEDIUM') return '#D97706';
      if (u === 'LOW') return '#059669';
      return '#64748B';
    };

    const displayTrendLocal = (val: string) => {
      const u = val.toUpperCase();
      if (u === 'UP' || u === 'INCREASING') return '↑ Tăng trưởng (UP)';
      if (u === 'DOWN' || u === 'DECREASING') return '↓ Suy giảm (DOWN)';
      return '→ Ổn định (STABLE)';
    };

    const viRelationshipLocal = (val: string) => {
      const u = val.toUpperCase();
      if (u.includes('PARTNER')) return 'Đối tác';
      if (u.includes('SUPPLIER')) return 'Nhà cung cấp';
      if (u.includes('CUSTOMER')) return 'Khách hàng';
      if (u.includes('COMPETITOR')) return 'Đối thủ cạnh tranh';
      return 'Quan hệ tùy chỉnh';
    };

    const activeProjects = projects.filter(p => p.targetCompanyProfileId === resolvedId || p.targetCompanyName === displayName);
    const signals = intelligence?.timeline || [];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'start' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {/* Panel 1: Relationship Details */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Đánh giá Mối quan hệ & Tác động doanh nghiệp</h2>
            </div>
            
            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Phân loại Quan hệ</span>
                <strong style={relType !== 'Chưa cập nhật' ? { ...C.value, color: '#2563EB' } : C.muted}>
                  {relType !== 'Chưa cập nhật' ? viRelationshipLocal(relType) : relType}
                </strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Tầm quan trọng chiến lược (Strategic Relevance)</span>
                <strong style={{ ...C.value, color: impactColorLocal(relevance) }}>{relevance}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Ảnh hưởng kinh doanh (Business Impact)</span>
                <strong style={{ ...C.value, color: impactColorLocal(impact) }}>{impact}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Xu hướng ảnh hưởng (Impact Trend)</span>
                <strong style={C.value}>{displayTrendLocal(trend)}</strong>
              </div>
            </div>

            {/* Why It Matters / Executive Brief */}
            {intelligence?.executiveBrief && (
              <div style={{ marginTop: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
                <h3 style={{ ...C.h3, color: '#1E293B', marginBottom: '6px' }}>Bản tóm lược tầm quan trọng</h3>
                {intelligence.executiveBrief.summary && (
                  <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: '#475569', lineHeight: '1.4' }}>
                    {intelligence.executiveBrief.summary}
                  </p>
                )}
                {intelligence.executiveBrief.whyItMatters && intelligence.executiveBrief.whyItMatters.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.7rem', color: '#475569', lineHeight: '1.5' }}>
                    {intelligence.executiveBrief.whyItMatters.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Panel 2: Linked Projects */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Dự án Hợp tác / Liên kết ({activeProjects.length})</h2>
            </div>
            {activeProjects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {activeProjects.map((p) => (
                  <div key={p.id} style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '0.74rem', color: '#0F172A' }}>{p.projectName}</strong>
                      <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginTop: '2px' }}>Loại: {p.projectType}</span>
                    </div>
                    <span style={{ fontSize: '0.65rem', background: p.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9', color: p.status === 'ACTIVE' ? '#15803D' : '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa ghi nhận liên kết dự án nào với đối tác này.</span>
              </div>
            )}
          </section>

          {/* Panel 3: Recent Signals */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Tín hiệu kinh doanh gần đây ({signals.length})</h2>
            </div>
            {signals.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {signals.slice(0, 5).map((s, idx) => (
                  <div key={idx} style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.72rem', color: '#0F172A' }}>{s.summary}</strong>
                      {s.impact && (
                        <span style={{ fontSize: '0.62rem', color: impactColorLocal(s.impact), fontWeight: 700 }}>
                          Impact: {s.impact}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748B', marginTop: '2px' }}>
                      <span>Nguồn: {s.source}</span>
                      <span>{s.date ? new Date(s.date).toLocaleDateString() : 'Chưa có ngày'}</span>
                    </div>
                    {s.sourceUrl && (
                      <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.64rem', color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '4px' }}>
                        <span>Xem nguồn</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #E2E8F0' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa ghi nhận tín hiệu kinh doanh mới.</span>
              </div>
            )}
          </section>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <CompanyRelationshipClosenessPanel
            companyProfileId={relationshipClosenessProfileId}
            currentUserRole={currentUser?.role}
          />
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'swot':
        return renderSwotTab();
      case 'business-fields':
        return renderBusinessFieldsTab();
      case 'relationship':
        return renderRelationshipTab();
      case 'board':
        return <div style={{ padding: '4px 0' }}><BoardMembersTab companyId={resolvedId} /></div>;
      case 'financials':
        return <div style={{ padding: '4px 0' }}><FinancialsTab companyId={resolvedId} /></div>;
      case 'news':
        return (
          <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <NewsTab companyId={resolvedId} />
            {currentUser?.role !== ROLES.STAFF && (
              <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '16px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '0.76rem', color: '#B91C1C', fontWeight: 800 }}>{t('detail.confidentialNews')}</h4>
                <ConfidentialNewsTab companyId={resolvedId} userRole={currentUser?.role} />
              </div>
            )}
          </div>
        );
      case 'documents':
        return <div style={{ padding: '4px 0' }}><DocumentsTab companyProfileId={relationshipClosenessProfileId} /></div>;
      default:
        return null;
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
          onClick={() => (setActivePage ? setActivePage('partner-ecosystem') : history.back())}
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
          Quay lại Ecosystem
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
              onClick={() => (setActivePage ? setActivePage('partner-ecosystem') : history.back())}
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
              id="btn-back-to-ecosystem"
            >
              &larr; Quay lại Ecosystem
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

        {renderTabContent()}
      </div>
    </div>
  );
};
