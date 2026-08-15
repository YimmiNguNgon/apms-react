import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { CompanyDetail } from './CompanyDetail';
import type { ProfileResponse } from '../types/domain';

export const OwnerProfilePage: React.FC<{ setActivePage: (page: string) => void }> = ({ setActivePage }) => {
  const { t } = useTranslation('company-list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ProfileResponse | null>(null);

  useEffect(() => {
    api.get<ProfileResponse>('/owner/company-profile')
      .then((res) => {
        if (res.data) {
          setOwnerProfile(res.data);
        } else {
          setError(t('errors.loadFailed'));
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('errors.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <div style={{ padding: 24, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải thông tin hồ sơ chủ quản...</div>;
  if (error) return <div style={{ padding: 24, color: 'red' }}>Lỗi: {error}</div>;
  if (!ownerProfile) return <div style={{ padding: 24 }}>Chưa có thông tin hồ sơ chủ quản trong hệ thống.</div>;

  return <CompanyDetail companyId={ownerProfile.companyId || ownerProfile.id} setActivePage={setActivePage} isOwnerProfile={true} />;
};
