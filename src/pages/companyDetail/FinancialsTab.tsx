import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyFinancial } from '../../types/listingData';
import { ListingTabShell } from './common';
import { PERIOD_LABELS, formatFinancialValue, useListingTabData } from './utils';
import styles from '../CompanyDetail.module.css';

interface FinancialItemDef {
  lever?: number;
  number?: number;
  code?: string;
  name?: string;
  static?: boolean;
}

interface FinancialPeriodValue {
  code?: string;
  value?: number | null;
  static?: boolean;
}

interface FinancialPeriod {
  time?: string;
  year?: number;
  quater?: number;
  data?: FinancialPeriodValue[];
}

interface FinancialTemplate {
  code?: string;
  name?: string;
  number?: number;
  data?: FinancialItemDef[];
}

interface FinancialDoc {
  templace?: FinancialTemplate[];
  data?: Array<{ code?: string; name?: string; data?: FinancialPeriod[] }>;
  unit?: string | null;
  name?: string;
  count?: number;
}

interface FinancialsTabProps {
  companyId: string;
}

const parseDoc = (raw?: string | null): FinancialDoc | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FinancialDoc;
  } catch {
    return null;
  }
};

const periodColumns = (periods: FinancialPeriod[] | undefined): FinancialPeriod[] => {
  if (!periods) return [];
  return [...periods].sort((a, b) => String(b.time || '').localeCompare(String(a.time || '')));
};

const AllReportTable: React.FC<{ doc: FinancialDoc }> = ({ doc }) => {
  const groups = (doc.data ?? []).filter((g) => (g.data?.length ?? 0) > 0);
  if (groups.length === 0) return null;

  return (
    <>
      {groups.map((group) => {
        const template = (doc.templace ?? []).find((t) => t.code === group.code);
        const rows = template?.data ?? [];
        const columns = periodColumns(group.data);
        return (
          <div key={group.code} className={styles.finCard}>
            <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
              {group.name || group.code || 'Báo cáo'}
            </h3>
            <div className={styles.tableWrap}>
              <table className={styles.finTable}>
                <thead>
                  <tr>
                    <th>Chỉ tiêu</th>
                    {columns.map((c) => (
                      <th key={c.time}>{c.time}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const valuesByCode = columns.map(
                      (c) => c.data?.find((v) => v.code === row.code)?.value ?? null,
                    );
                    const lever = row.lever ?? 1;
                    return (
                      <tr key={row.code}>
                        <td
                          className={`${lever === 1 ? styles.rowLever1 : styles.rowLever2}${row.static ? ` ${styles.rowStatic}` : ''}`}
                        >
                          {row.name}
                        </td>
                        {valuesByCode.map((v, i) => (
                          <td key={i}>{formatFinancialValue(v)}</td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
};

const IndicatorTable: React.FC<{ doc: FinancialDoc }> = ({ doc }) => {
  const rows = doc.templace ?? [];
  const columns = periodColumns(doc.data?.[0]?.data);
  if (rows.length === 0) return null;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.finTable}>
        <thead>
          <tr>
            <th>Chỉ tiêu</th>
            {columns.map((c) => (
              <th key={c.time}>{c.time}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <td className={styles.rowLever1}>{row.name}</td>
              {columns.map((c) => {
                const hit = c.data?.find((v) => v.code === row.code);
                return <td key={c.time}>{formatFinancialValue(hit?.value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FinancialsTab: React.FC<FinancialsTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyFinancial[]>(
    `financials:${companyId}`,
    companyId,
    listingDataApi.getFinancials,
  );

  const reports = useMemo(
    () => (data?.data ?? []).map((f) => ({ meta: f, doc: parseDoc(f.itemsJson) })),
    [data],
  );

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
            <TrendingUp size={20} style={{ color: '#2563EB' }} />
            <h2>Báo cáo tài chính</h2>
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>
            Giá trị lớn hiển thị theo tỷ / triệu (VNĐ)
          </span>
        </div>

        {reports.map(({ meta, doc }) => {
          if (!doc) return null;
          const isIndicator = meta.reportType === 'CHISO';
          const title = `${PERIOD_LABELS[meta.periodType || meta.reportType || ''] || meta.reportType || 'Báo cáo'} ${
            meta.reportYear || ''
          }`.trim();
          return (
            <div key={meta.id} className={styles.finCard}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span className={styles.finBadge}>{title}</span>
                {doc.unit ? <span className={styles.finUnit}>Đơn vị: {doc.unit}</span> : null}
              </div>
              {isIndicator ? <IndicatorTable doc={doc} /> : <AllReportTable doc={doc} />}
            </div>
          );
        })}
      </div>
    </ListingTabShell>
  );
};

export default FinancialsTab;
