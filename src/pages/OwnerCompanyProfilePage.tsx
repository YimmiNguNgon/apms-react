import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ProfileResponse } from '../types/domain';
import { Building2, FileText, LayoutGrid, Shield, TrendingUp } from 'lucide-react';
import { formatCompanyName } from './companyDetail/tokens';
import { CompanyProfileHeader, PageShell } from './companyDetail/CompanyProfileHeader';
import { ListingTabBar, type ListingTabId } from './companyDetail/ListingTabs';
import type { ListingTabDef } from './companyDetail/utils';
import FinancialsTab from './companyDetail/FinancialsTab';
import { OWNER_COMPANY_ID } from '../API/listingDataApi';
import {
  CompanyProfileTabs,
  type BoardPayload,
  type BusinessFieldsPayload,
  type OverviewPayload,
  type SwotPayload,
} from './companyDetail/CompanyProfileTabs';

const ADMIN_TABS: ListingTabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { id: 'swot', label: 'SWOT', icon: <TrendingUp size={14} /> },
  { id: 'business-fields', label: 'Business Fields', icon: <Building2 size={14} /> },
  { id: 'board', label: 'Ban lãnh đạo', icon: <Shield size={14} /> },
  { id: 'financials', label: 'Tài chính', icon: <FileText size={14} /> },
];

/**
 * Admin "Hồ sơ công ty chủ quản" page.
 * Uses the exact same UI as the Owner's Company Profile (CompanyDetail):
 * hero header + tab bar + shared CompanyProfileTabs, but with editable=true.
 * All mutations go through PATCH /admin/owner-company-profile (SYSTEM_ADMIN only).
 */
export const OwnerCompanyProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get<ProfileResponse>('/admin/owner-company-profile');
      if (res?.success && res.data) {
        setProfile(res.data);
      } else {
        throw new Error('Không thể tải hồ sơ công ty chủ quản.');
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Không thể tải hồ sơ công ty chủ quản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const patchProfile = async <T extends object>(payload: T): Promise<ProfileResponse> => {
    const res = await api.patch<ProfileResponse>('/admin/owner-company-profile', payload);
    if (res?.success && res.data) {
      setProfile(res.data);
      return res.data;
    }
    throw new Error('Không thể lưu thay đổi.');
  };

  const handleSaveOverview = async (payload: OverviewPayload) => {
    await patchProfile(payload);
  };

  const handleSaveSwot = async (payload: SwotPayload) => {
    await patchProfile(payload);
  };

  const handleSaveBusinessFields = async (payload: BusinessFieldsPayload) => {
    await patchProfile(payload);
  };

  const handleSaveBoard = async (payload: BoardPayload) => {
    await patchProfile(payload);
  };

  const displayName = profile
    ? formatCompanyName(profile.identity?.tradeName || profile.identity?.legalName)
    : 'Chưa có tên công ty';
  const initials = displayName.substring(0, 2).toUpperCase();

  if (loading) {
    return (
      <section className="page active admin-system-page role-dashboard role-dashboard-admin" id="page-owner-company-profile">
        <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
          <span style={{ color: '#64748B', fontSize: '0.78rem' }}>Đang tải hồ sơ công ty chủ quản...</span>
        </div>
      </section>
    );
  }

  if (loadError || !profile) {
    return (
      <section className="page active admin-system-page role-dashboard role-dashboard-admin" id="page-owner-company-profile">
        <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
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
              {loadError || 'Không tìm thấy hồ sơ doanh nghiệp'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.72rem', margin: '0 0 12px' }}>
              Hồ sơ có thể chưa được tạo hoặc bạn không có quyền truy cập.
            </p>
            <button
              type="button"
              onClick={() => void loadProfile()}
              style={{
                background: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page active admin-system-page role-dashboard role-dashboard-admin" id="page-owner-company-profile">
      <PageShell>
        <CompanyProfileHeader
          displayName={displayName}
          initials={initials}
          industry={profile.business?.industries?.[0]}
          reviewStatus={profile.reviewStatus || 'APPROVED'}
          version={profile.version}
          topRow={
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>APMS</span>
                  <span>/</span>
                  <span>Admin</span>
                  <span>/</span>
                  <span>Hồ sơ công ty chủ quản</span>
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

        <ListingTabBar activeTab={activeTab} onTabChange={setActiveTab} companyId="" tabs={ADMIN_TABS} />

        {activeTab === 'financials' ? (
          <FinancialsTab companyId={OWNER_COMPANY_ID} editable />
        ) : (
          <CompanyProfileTabs
            profile={profile}
            activeTab={activeTab}
            editable
            onSaveOverview={handleSaveOverview}
            onSaveSwot={handleSaveSwot}
            onSaveBusinessFields={handleSaveBusinessFields}
            onSaveBoard={handleSaveBoard}
          />
        )}
      </PageShell>
    </section>
  );
};
