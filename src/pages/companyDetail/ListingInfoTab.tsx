import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { listingDataApi } from '../../API/listingDataApi';
import { api } from '../../services/api';
import type { ProfileResponse } from '../../types/domain';
import type { CompanyListingInfo } from '../../types/listingData';
import { ListingTabShell } from './common';
import { formatCurrency, useListingTabData } from './utils';
import styles from '../CompanyDetail.module.css';

interface FieldDef {
  label: string;
  value?: string | number | null;
  monospace?: boolean;
}

interface ListingInfoTabProps {
  companyId: string;
}

const sanitizeHtml = (html: string): string => DOMPurify.sanitize(html);

const ListingInfoTab: React.FC<ListingInfoTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyListingInfo>(
    `listing-info:${companyId}`,
    companyId,
    listingDataApi.getListingInfo,
  );
  const [profileFallback, setProfileFallback] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const info = data?.data;

  useEffect(() => {
    if (!data?.hasData && companyId) {
      setProfileLoading(true);
      api.get<ProfileResponse>(`/profiles/${companyId}`)
        .then((res) => setProfileFallback(res.data ?? null))
        .catch(() => setProfileFallback(null))
        .finally(() => setProfileLoading(false));
    }
  }, [data?.hasData, companyId]);

  const fields: FieldDef[] = [
    { label: 'Tên Thương Mại', value: profileFallback?.identity?.tradeName },
    { label: 'Tên Pháp Lý', value: profileFallback?.identity?.legalName },
    { label: 'Ngành nghề kinh doanh', value: info?.businessLine || profileFallback?.business?.industries?.join(', ') },
    { label: 'Mã Số Thuế', value: profileFallback?.identity?.taxCode, monospace: true },
    { label: 'Số ĐKKD', value: profileFallback?.identity?.registrationNumber, monospace: true },
    { label: 'Mã Cổ Phiếu', value: profileFallback?.stockTicker, monospace: true },
    { label: 'Sàn Giao Dịch', value: profileFallback?.stockExchange !== 'NONE' ? profileFallback?.stockExchange : null },
    { label: 'Ngày giao dịch đầu tiên', value: info?.listedDate },
    { label: 'Vốn điều lệ (VNĐ)', value: info?.charterCapital ? formatCurrency(info.charterCapital) : null },
    { label: 'Đơn vị kiểm toán', value: info?.auditorCompany },
    { label: 'Tư vấn pháp lý', value: info?.legalAdvisor },
    { label: 'Website', value: info?.website || profileFallback?.contact?.website },
    { label: 'Email', value: info?.email || profileFallback?.contact?.emails?.[0] },
    { label: 'Điện thoại', value: info?.phone || profileFallback?.contact?.phones?.[0] },
    { label: 'Địa chỉ', value: info?.address || profileFallback?.contact?.addresses?.[0]?.fullAddress },
  ].filter((f) => f.value != null && String(f.value).trim() !== '');

  const hasContent = (data?.hasData ?? false) || fields.length > 0;

  return (
    <ListingTabShell
      loading={loading || profileLoading}
      error={error}
      hasData={hasContent}
      crawledAt={data?.crawledAt}
      onRetry={reload}
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Thông tin cơ bản</h2>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          {fields.map((f) => (
            <div key={f.label} className={styles.fieldItem} style={{ background: '#F8FAFC', padding: '5px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
              <span className={styles.fieldLabel} style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginBottom: '2px' }}>{f.label}</span>
              <strong
                className={`${styles.fieldValue}${f.monospace ? ' monospace' : ''}`}
                style={{ fontSize: '0.75rem', color: '#0F172A', fontFamily: f.monospace ? 'monospace' : 'inherit' }}
              >
                {f.value}
              </strong>
            </div>
          ))}
        </div>

        {info?.introduction && (
          <div style={{ marginTop: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '0.78rem', fontWeight: '700', color: '#1E293B' }}>
              Giới thiệu & Lịch sử doanh nghiệp
            </h3>
            <div
              className={styles.sanitized}
              style={{ fontSize: '0.72rem', color: '#334155', lineHeight: '1.4' }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(info.introduction) }}
            />
          </div>
        )}
      </div>
    </ListingTabShell>
  );
};

export default ListingInfoTab;
