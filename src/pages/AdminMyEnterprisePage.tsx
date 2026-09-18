import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { companyProfileApi } from '../API/companyProfileApi';
import { CompanyDetail } from './CompanyDetail';
import type { ProfileResponse } from '../types/domain';

export const AdminMyEnterprisePage: React.FC<{ setActivePage: (page: string) => void }> = ({ setActivePage }) => {
  const { t } = useTranslation('company-list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    companyProfileApi.getAdminMyEnterprise()
      .then((data) => {
        if (data) {
          setOwnerProfile(data);
        } else {
          setError(t('errors.loadFailed', 'Không thể tải hồ sơ doanh nghiệp chủ quản.'));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('errors.loadFailed', 'Không thể tải hồ sơ doanh nghiệp chủ quản.'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) {
    return (
      <div style={{ padding: 24, minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
        Đang tải thông tin hồ sơ doanh nghiệp...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: '#EF4444' }}>
        Lỗi: {error}
      </div>
    );
  }

  if (!ownerProfile) {
    return (
      <div style={{ padding: 24, color: '#64748B' }}>
        Chưa có thông tin hồ sơ doanh nghiệp chủ quản trong hệ thống.
      </div>
    );
  }

  return (
    <CompanyDetail
      companyId={ownerProfile.companyId || ownerProfile.id}
      setActivePage={setActivePage}
      isOwnerProfile={true}
      pageContext="admin-my-enterprise"
      initialProfile={ownerProfile}
    />
  );
};
