import React, { useCallback, useEffect, useState } from 'react';
import { Building2, FileText, LayoutGrid, Newspaper, Shield, TrendingUp } from 'lucide-react';
import { api, ApiError } from '../services/api';
import type { ProfileResponse, ProfileSourcesResponse } from '../types/domain';
import { formatCompanyName, C } from './companyDetail/tokens';
import { CompanyProfileHeader, PageShell } from './companyDetail/CompanyProfileHeader';
import { ListingTabBar, type ListingTabId } from './companyDetail/ListingTabs';
import type { ListingTabDef } from './companyDetail/utils';
import { CompanyProfileTabs, type OverviewPayload, type SwotPayload, type BusinessFieldsPayload, type BoardPayload } from './companyDetail/CompanyProfileTabs';
import BoardMembersTab from './companyDetail/BoardMembersTab';
import FinancialsTab from './companyDetail/FinancialsTab';
import NewsTab from './companyDetail/NewsTab';

interface AdminCompanyProfileDetailProps {
  setActivePage?: (page: string) => void;
}

const ADMIN_TABS: ListingTabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { id: 'swot', label: 'SWOT', icon: <TrendingUp size={14} /> },
  { id: 'business-fields', label: 'Business Fields', icon: <Building2 size={14} /> },
  { id: 'board', label: 'Ban lãnh đạo', icon: <Shield size={14} /> },
  { id: 'financials', label: 'Tài chính', icon: <FileText size={14} /> },
  { id: 'news', label: 'Tin tức', icon: <Newspaper size={14} /> },
];

const backButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  borderRadius: '6px',
  padding: '4px 10px',
  color: '#334155',
  fontSize: '0.72rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const retryButtonStyle: React.CSSProperties = {
  background: '#2563EB',
  border: 'none',
  color: '#FFFFFF',
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '6px 14px',
  borderRadius: '6px',
  cursor: 'pointer',
};

export const AdminCompanyProfileDetail: React.FC<AdminCompanyProfileDetailProps> = ({ setActivePage }) => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sources, setSources] = useState<ProfileSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');

  const companyId = localStorage.getItem('apms-selected-company') ?? '';

  useEffect(() => {
    if (!companyId) {
      setProfile(null);
      setSources(null);
      setLoading(false);
      setError('Company profile not found');
      return;
    }

    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      setProfile(null);
      setSources(null);
      setError(null);

      try {
        const [profileRes, sourcesRes] = await Promise.all([
          api.get<ProfileResponse>(`/profiles/${companyId}`, { signal: controller.signal }),
          api.get<ProfileSourcesResponse>(`/profiles/${companyId}/sources`, { signal: controller.signal }).catch(() => null),
        ]);

        if (controller.signal.aborted) return;
        setProfile(profileRes.data ?? null);
        setSources(sourcesRes?.data ?? null);
      } catch (err) {
        if (!controller.signal.aborted) {
          setProfile(null);
          setSources(null);
          const status = err instanceof ApiError ? err.status : 0;
          setError(status === 404 ? 'Company profile not found' : 'Unable to load company profile. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [companyId, reloadKey]);

  const goBack = useCallback(() => setActivePage?.('admin-company-profiles'), [setActivePage]);

  const renderOverviewAside = () => {
    const industry = profile?.business?.industries?.[0] || 'Chung';
    const updatedAt = profile?.metadata?.updatedAt;
    return (
      <>
        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Tóm tắt Nhanh</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Ngành nghề</span>
              <span style={{ fontWeight: 600, color: '#1E293B', background: '#F1F5F9', padding: '1px 6px', borderRadius: '4px' }}>{industry}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Trạng thái xác minh</span>
              <span style={{ fontWeight: 600, color: '#15803D', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px' }}>
                {profile?.reviewStatus || 'VERIFIED'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Trạng thái hệ thống</span>
              <span style={{
                fontWeight: 700,
                color: profile?.isHidden ? '#92400E' : '#15803D',
                background: profile?.isHidden ? '#FEF3C7' : '#DCFCE7',
                padding: '1px 6px',
                borderRadius: '4px',
              }}>
                {profile?.isHidden ? 'HIDDEN' : 'ACTIVE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>Cập nhật lần cuối</span>
              <span style={{ fontWeight: 600, color: '#334155' }}>
                {updatedAt ? new Date(updatedAt).toLocaleDateString() : 'Vừa xong'}
              </span>
            </div>
          </div>
        </section>

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
  };

  const handleSaveOverview = async (payload: OverviewPayload) => {
    try {
      const res = await api.patch<ProfileResponse>(`/company-profiles/${companyId}`, payload);
      if (res?.data) {
        setProfile(res.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu Overview thất bại.');
      throw err;
    }
  };

  const handleSaveSwot = async (payload: SwotPayload) => {
    try {
      const res = await api.patch<ProfileResponse>(`/company-profiles/${companyId}`, payload);
      if (res?.data) {
        setProfile(res.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu SWOT thất bại.');
      throw err;
    }
  };

  const handleSaveBusinessFields = async (payload: BusinessFieldsPayload) => {
    try {
      const res = await api.patch<ProfileResponse>(`/company-profiles/${companyId}`, payload);
      if (res?.data) {
        setProfile(res.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu Lĩnh vực hoạt động thất bại.');
      throw err;
    }
  };

  const handleSaveBoard = async (payload: BoardPayload) => {
    try {
      const res = await api.patch<ProfileResponse>(`/company-profiles/${companyId}`, payload);
      if (res?.data) {
        setProfile(res.data);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lưu Ban lãnh đạo thất bại.');
      throw err;
    }
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
            activeTab={activeTab}
            editable={true}
            onSaveOverview={handleSaveOverview}
            onSaveSwot={handleSaveSwot}
            onSaveBusinessFields={handleSaveBusinessFields}
            onSaveBoard={handleSaveBoard}
            overviewAside={activeTab === 'overview' ? renderOverviewAside() : undefined}
            boardOverride={activeTab === 'board' ? <BoardMembersTab companyId={companyId} /> : undefined}
          />
        );
      case 'financials':
        return (
          <div style={{ padding: '4px 0' }}>
            <FinancialsTab companyId={companyId} />
          </div>
        );
      case 'news':
        return (
          <div style={{ padding: '4px 0' }}>
            <NewsTab companyId={companyId} />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <section className="page active admin-system-page role-dashboard role-dashboard-admin" id="page-admin-company-profile-detail">
        <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
          <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Loading company profile...</span>
        </div>
      </section>
    );
  }

  if (error || !profile) {
    return (
      <section className="page active admin-system-page role-dashboard role-dashboard-admin" id="page-admin-company-profile-detail">
        <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
          <button onClick={goBack} style={backButtonStyle}>
            &larr; Quay lại
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
              {error || 'Company profile not found'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.72rem', margin: '0 0 12px' }}>
              Unable to load company profile. Please try again.
            </p>
            <button type="button" onClick={() => setReloadKey((key) => key + 1)} style={retryButtonStyle}>
              Retry
            </button>
          </div>
        </div>
      </section>
    );
  }

  const displayName = formatCompanyName(profile.identity?.tradeName || profile.identity?.legalName);
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <section className="page active admin-system-page role-dashboard role-dashboard-admin" id="page-admin-company-profile-detail">
      <PageShell>
        <CompanyProfileHeader
          displayName={displayName}
          initials={initials}
          industry={profile.business?.industries?.[0]}
          reviewStatus={profile.reviewStatus || 'VERIFIED'}
          topRow={
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={goBack} style={backButtonStyle} id="btn-back-admin-company-profiles">
                  &larr; Quay lại
                </button>
                <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>|</span>
                <div style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <span>APMS</span>
                  <span>/</span>
                  <button
                    onClick={goBack}
                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: '#2563EB', fontWeight: 600, fontSize: '0.68rem' }}
                  >
                    Company Profile Management
                  </button>
                  <span>/</span>
                  <strong style={{ color: '#1E293B', fontWeight: 600 }}>{displayName}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748B' }}>
                  Version: <strong style={{ color: '#1E293B', fontWeight: 700 }}>{profile.version ?? 1}</strong>
                </span>
              </div>
            </>
          }
        />

        <ListingTabBar activeTab={activeTab} onTabChange={setActiveTab} companyId={companyId} tabs={ADMIN_TABS} />

        {renderTabContent()}
      </PageShell>
    </section>
  );
};
