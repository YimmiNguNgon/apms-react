import React from 'react';
import DOMPurify from 'dompurify';
import { Building2 } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyListingInfo } from '../../types/listingData';
import {
  ListingTabShell,
} from './common';
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

  const info = data?.data;

  const fields: FieldDef[] = [
    { label: 'Ngành nghề kinh doanh', value: info?.businessLine },
    { label: 'Ngày giao dịch đầu tiên', value: info?.listedDate },
    { label: 'Vốn điều lệ (VNĐ)', value: info?.charterCapital ? formatCurrency(info.charterCapital) : null },
    { label: 'Đơn vị kiểm toán', value: info?.auditorCompany },
    { label: 'Tư vấn pháp lý', value: info?.legalAdvisor },
    { label: 'Website', value: info?.website },
    { label: 'Email', value: info?.email },
    { label: 'Điện thoại', value: info?.phone },
    { label: 'Địa chỉ', value: info?.address },
  ].filter((f) => f.value != null && String(f.value).trim() !== '');

  return (
    <ListingTabShell
      loading={loading}
      error={error}
      hasData={data?.hasData ?? false}
      crawledAt={data?.crawledAt}
      onRetry={reload}
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Building2 size={20} style={{ color: '#2563EB' }} />
            <h2>Thông tin cơ bản</h2>
          </div>
        </div>

        <div className={styles.fieldGrid}>
          {fields.map((f) => (
            <div key={f.label} className={styles.fieldItem}>
              <span className={styles.fieldLabel}>{f.label}</span>
              <strong
                className={`${styles.fieldValue}${f.monospace ? ' monospace' : ''}`}
                style={f.monospace ? { fontFamily: 'monospace' } : undefined}
              >
                {f.value}
              </strong>
            </div>
          ))}
        </div>

        {info?.introduction && (
          <div style={{ marginTop: '20px', borderTop: '1px solid #F1F5F9', paddingTop: '18px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
              Giới thiệu & Lịch sử doanh nghiệp
            </h3>
            <div
              className={styles.sanitized}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(info.introduction) }}
            />
          </div>
        )}
      </div>
    </ListingTabShell>
  );
};

export default ListingInfoTab;
