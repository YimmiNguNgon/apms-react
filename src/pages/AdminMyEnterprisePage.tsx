import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, CheckCircle } from 'lucide-react';
import { companyProfileApi } from '../API/companyProfileApi';
import { CompanyDetail } from './CompanyDetail';
import { CreateMyEnterpriseModal } from '../components/profile/CreateMyEnterpriseModal';
import type { ProfileResponse } from '../types/domain';

export const AdminMyEnterprisePage: React.FC<{ setActivePage: (page: string) => void }> = ({ setActivePage }) => {
  const { t } = useTranslation('company-list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<ProfileResponse | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    companyProfileApi.getAdminMyEnterprise()
      .then((data) => {
        setOwnerProfile(data || null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('errors.loadFailed', 'Không thể tải hồ sơ doanh nghiệp chủ quản.'));
      })
      .finally(() => setLoading(false));
  }, [t]);

  const handleEnterpriseCreated = (created: ProfileResponse) => {
    setOwnerProfile(created);
    setSuccessToast('Doanh nghiệp chủ quản đã được thiết lập thành công.');
    setTimeout(() => setSuccessToast(null), 5000);
  };

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
      <div style={emptyContainerStyle}>
        <div style={emptyCardStyle}>
          <div style={iconBadgeStyle}>
            <Building2 size={36} color="#2563EB" />
          </div>
          <h1 style={titleStyle}>My Enterprise</h1>
          <p style={subtitleStyle}>
            Your enterprise has not been configured yet.
          </p>
          <p style={descriptionStyle}>
            Set up your organization&apos;s profile to begin using APMS company intelligence features.
          </p>
          <button
            type="button"
            style={createButtonStyle}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} style={{ marginRight: 6 }} />
            Create My Enterprise
          </button>
        </div>

        <CreateMyEnterpriseModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleEnterpriseCreated}
        />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {successToast && (
        <div style={toastStyle}>
          <CheckCircle size={16} color="#16A34A" />
          <span>{successToast}</span>
        </div>
      )}
      <CompanyDetail
        companyId={ownerProfile.companyId || ownerProfile.id}
        setActivePage={setActivePage}
        isOwnerProfile={true}
        pageContext="admin-my-enterprise"
        initialProfile={ownerProfile}
      />
    </div>
  );
};

// Styles for empty setup state
const emptyContainerStyle: React.CSSProperties = {
  minHeight: '75vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  backgroundColor: '#F8FAFC',
};

const emptyCardStyle: React.CSSProperties = {
  maxWidth: '520px',
  width: '100%',
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
  padding: '40px 32px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const iconBadgeStyle: React.CSSProperties = {
  width: '72px',
  height: '72px',
  borderRadius: '16px',
  backgroundColor: '#EFF6FF',
  border: '1px solid #DBEAFE',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '20px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1.5rem',
  fontWeight: 700,
  color: '#0F172A',
  margin: '0 0 10px 0',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: '#334155',
  margin: '0 0 8px 0',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#64748B',
  lineHeight: 1.5,
  margin: '0 0 28px 0',
  maxWidth: '400px',
};

const createButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#2563EB',
  color: '#FFFFFF',
  fontWeight: 600,
  fontSize: '0.925rem',
  padding: '10px 24px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
};

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  top: '24px',
  right: '24px',
  zIndex: 1200,
  backgroundColor: '#F0FDF4',
  border: '1px solid #BBF7D0',
  color: '#15803D',
  borderRadius: '8px',
  padding: '12px 18px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  fontSize: '0.875rem',
  fontWeight: 600,
};
