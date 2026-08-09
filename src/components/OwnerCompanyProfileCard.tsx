import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProfileResponse } from '../types/domain';

interface Props {
  profile: ProfileResponse | null;
  loading?: boolean;
  error?: string | null;
}

const profileName = (profile: ProfileResponse) => {
  const tradeName = profile.identity?.tradeName?.trim();
  const legalName = profile.identity?.legalName?.trim();

  if (tradeName && legalName && tradeName !== legalName) {
    return `${tradeName} - ${legalName}`;
  }

  return tradeName || legalName || profile.companyId;
};

export const OwnerCompanyProfileCard: React.FC<Props> = ({ profile, loading = false, error }) => {
  const { t } = useTranslation('owner-dashboard');
  return (
  <section className="workspace-panel" aria-label={t('profile.ariaLabel')}>
    <div className="workspace-section-head">
      <div>
        <span className="workspace-side-eyebrow">{t('profile.eyebrow')}</span>
        <h3>{loading ? t('profile.loading') : profile ? profileName(profile) : t('profile.unavailable')}</h3>
        <p>{error || (profile ? t('profile.description') : t('profile.loadFailed'))}</p>
      </div>
      {profile && <span className="workspace-badge success">{profile.reviewStatus || 'APPROVED'}</span>}
    </div>
    {profile && (
      <div className="workspace-detail-list">
        <div><strong>{t('profile.taxCode')}</strong><span>{profile.identity?.taxCode || t('notAvailable')}</span></div>
        <div><strong>{t('profile.stockTicker')}</strong><span>{profile.identity?.stockTicker || t('notAvailable')}</span></div>
        <div><strong>{t('profile.industry')}</strong><span>{profile.business?.industries?.slice(0, 2).join(', ') || t('notAvailable')}</span></div>
        <div><strong>{t('profile.size')}</strong><span>{profile.companySize?.employeeTier || t('notAvailable')}</span></div>
        <div><strong>{t('profile.markets')}</strong><span>{profile.business?.markets?.slice(0, 3).join(', ') || t('notAvailable')}</span></div>
        <div><strong>{t('profile.website')}</strong><span>{profile.contact?.website || t('notAvailable')}</span></div>
      </div>
    )}
  </section>
  );
};
