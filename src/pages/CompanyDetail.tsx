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
import { ExternalLink } from 'lucide-react';
import { C, formatCompanyName } from './companyDetail/tokens';
import { CompanyProfileTabs } from './companyDetail/CompanyProfileTabs';
import { CompanyProfileHeader, PageShell } from './companyDetail/CompanyProfileHeader';
import { OWNER_COMPANY_ID } from '../API/listingDataApi';

interface CompanyDetailProps {
  companyId?: string;
  setActivePage?: (page: string) => void;
}

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
  const [projects, setProjects] = useState<ProjectResponse[]>([]);

  const canEditListing =
    !!currentUser &&
    ([ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER] as Role[]).includes(currentUser.role);

  const resolvedId = companyId ?? localStorage.getItem('apms-selected-company') ?? '';

  const isOwnerCompany =
    resolvedId.toLowerCase() === OWNER_COMPANY_ID.toLowerCase() ||
    profile?.id?.toLowerCase() === OWNER_COMPANY_ID.toLowerCase() ||
    profile?.companyId?.toLowerCase() === OWNER_COMPANY_ID.toLowerCase();
  const showFinancialEditor = currentUser?.role === ROLES.ADMIN && isOwnerCompany;

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

  const renderOverviewAside = () => (
    <>
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
              {profile?.business?.industries?.[0] || 'Chung'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Trạng thái xác minh</span>
            <span style={{ fontWeight: 600, color: '#15803D', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
              {profile?.reviewStatus || 'VERIFIED'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Cập nhật lần cuối</span>
            <span style={{ fontWeight: 600, color: '#334155' }}>
              {profile?.metadata?.updatedAt ? new Date(profile.metadata.updatedAt).toLocaleDateString() : 'Vừa xong'}
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
    </>
  );

  const listingControl = {
    editing: listingEditing,
    saving: listingSaving,
    tickerDraft,
    exchangeDraft,
    msg: listingMsg,
    onStartEdit: startListingEdit,
    onSave: () => void handleSaveListing(),
    onCancel: () => setListingEditing(false),
    onTickerChange: (value: string) => setTickerDraft(value),
    onExchangeChange: (value: string) => setExchangeDraft(value),
  };

  const renderRelationshipTab = () => {
    const relType = intelligence?.relationship?.type || 'Chưa cập nhật';
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
            <div style={{ ...C.cardHeader }}>
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
      case 'swot':
      case 'business-fields':
      case 'board':
        return (
          <CompanyProfileTabs
            profile={profile!}
            intelligence={intelligence}
            activeTab={activeTab}
            overviewAside={activeTab === 'overview' ? renderOverviewAside() : undefined}
            canEditListing={canEditListing}
            listing={listingControl}
            boardOverride={activeTab === 'board' ? <BoardMembersTab companyId={resolvedId} /> : undefined}
          />
        );
      case 'relationship':
        return renderRelationshipTab();
      case 'financials':
        return <div style={{ padding: '4px 0' }}><FinancialsTab companyId={showFinancialEditor ? OWNER_COMPANY_ID : resolvedId} editable={showFinancialEditor} /></div>;
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
    <PageShell id="page-company-detail-light">
      <CompanyProfileHeader
        displayName={displayName}
        initials={initials}
        industry={profile.business?.industries?.[0]}
        reviewStatus={profile.reviewStatus || 'VERIFIED'}
        topRow={
          <>
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
          </>
        }
      />

      {/* Tab Navigation */}
      <ListingTabBar activeTab={activeTab} onTabChange={setActiveTab} companyId={resolvedId} />

      {renderTabContent()}
    </PageShell>
  );
};
