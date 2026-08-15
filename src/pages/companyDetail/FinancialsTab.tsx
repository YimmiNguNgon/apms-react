import React, { useMemo, useState } from 'react';
import { Download, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyFinancial } from '../../types/listingData';
import { ListingTabShell } from './common';
import { useListingTabData } from './utils';

interface FinancialValue { code?: string; value?: number | null; }
interface FinancialPeriod { time?: string; data?: FinancialValue[]; }
interface FinancialRow { code?: string; name?: string; }
interface FinancialDocument { unit?: string | null; templace?: FinancialRow[]; data?: Array<{ data?: FinancialPeriod[] }>; }

const REPORT_TABS = [
  { label: 'BCTC tóm tắt', type: 'SUMMARY' },
  { label: 'Cân đối kế toán', type: 'BALANCE_SHEET' },
  { label: 'Kết quả KD', type: 'INCOME_STATEMENT' },
  { label: 'Lưu chuyển tiền tệ', type: 'CASH_FLOW' },
  { label: 'Chỉ số TC', type: 'RATIOS' },
  { label: 'Chỉ tiêu kế hoạch', type: 'PLAN' },
];
const parseDocument = (itemsJson?: string | null): FinancialDocument | null => {
  try { return itemsJson ? JSON.parse(itemsJson) as FinancialDocument : null; } catch { return null; }
};
const valueFor = (period: FinancialPeriod, code?: string) => Number(period.data?.find((item) => item.code === code)?.value ?? 0);
const formatValue = (value: number, unit: string, sourceSnapshot = false) => {
  const divisor = sourceSnapshot || Math.abs(value) < 100_000_000 ? 1 : unit === 'Tỷ đồng' ? 1_000_000_000 : unit === 'Triệu đồng' ? 1_000_000 : 1;
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / divisor);
};

const FinancialsTab: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyFinancial[]>(`financials:v2:${companyId}`, companyId, listingDataApi.getFinancials);
  const [activeReport, setActiveReport] = useState(REPORT_TABS[0].type);
  const [periodType, setPeriodType] = useState('Theo năm');
  const [unit, setUnit] = useState('Tỷ đồng');
  const report = useMemo(() => {
    const selected = (data?.data ?? []).find((item) => item.reportType === activeReport) ?? data?.data?.[0];
    return parseDocument(selected?.itemsJson) ?? null;
  }, [activeReport, data]);
  const rawPeriods = report?.data?.[0]?.data ?? [];
  const periods = useMemo(() => {
    if (periodType === 'Theo quý') return rawPeriods;

    const byYear = new Map<string, Map<string, number>>();
    rawPeriods.forEach((period) => {
      const year = period.time?.match(/(\d{4})$/)?.[1] ?? period.time ?? 'Năm khác';
      const values = byYear.get(year) ?? new Map<string, number>();
      period.data?.forEach((item) => {
        if (!item.code) return;
        values.set(item.code, (values.get(item.code) ?? 0) + Number(item.value ?? 0));
      });
      byYear.set(year, values);
    });

    return [...byYear.entries()].map(([year, values]) => ({
      time: year,
      data: [...values.entries()].map(([code, value]) => ({ code, value })),
    }));
  }, [periodType, rawPeriods]);
  const rows = report?.templace ?? [];

  const exportExcel = () => {
    const csvRows = rows.map((row) => [row.name || '', ...periods.map((period) => String(valueFor(period, row.code)))]);
    const csv = [['Chỉ tiêu', ...periods.map((period) => period.time || '')], ...csvRows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${companyId}-financials.csv`; anchor.click(); URL.revokeObjectURL(href);
  };

  return <ListingTabShell loading={loading} error={error} hasData={Boolean(report)} crawledAt={data?.crawledAt} onRetry={reload}>
    <section style={{ background: '#fff', border: '1px solid #dbe3ee', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #dbe3ee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#163b68' }}><TrendingUp size={18} /><strong>Financial Information</strong></div>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: '#f7f9fc' }}>
      </div>
      <div style={{ overflowX: 'auto', background: '#fff' }}>
        <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '16px', color: '#b91c1c', fontSize: '18px', fontWeight: 600, minWidth: '300px', textTransform: 'uppercase' }}>
                INCOME STATEMENT
              </th>
              <th style={{ width: '36px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', padding: 0 }}>
                <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0f172a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={16} color="#0284c7" />
                </button>
              </th>
              {periods.map(period => (
                <th key={period.time} style={{ padding: '10px 16px', textAlign: 'right', minWidth: '120px', borderLeft: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#0284c7', fontSize: '14px', fontWeight: 600 }}>{period.time}</div>
                  <div style={{ color: '#b91c1c', fontSize: '9px', fontWeight: 400, marginTop: '2px', textTransform: 'uppercase' }}>Audited</div>
                </th>
              ))}
              <th style={{ width: '36px', textAlign: 'center', borderLeft: '1px solid #e2e8f0', background: '#f8fafc', padding: 0 }}>
                <button type="button" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#0f172a', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={16} color="#94a3b8" />
                </button>
              </th>
              <th style={{ textAlign: 'center', padding: '10px', color: '#475569', fontSize: '13px', fontWeight: 500, minWidth: '100px', borderLeft: '1px solid #e2e8f0' }}>
                GROWTH
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const values = periods.map((period) => valueFor(period, row.code));
              const max = Math.max(...values.map(Math.abs), 1);
              // Simple heuristic to bold some rows like the screenshot
              const isBold = row.name?.toLowerCase().includes('lợi nhuận') || row.name?.toLowerCase().includes('tổng');
              
              return (
                <tr key={row.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', color: '#0f172a', fontSize: '13px', fontWeight: isBold ? 600 : 400 }}>
                    {row.name}
                  </td>
                  <td style={{ borderLeft: '1px solid #f1f5f9', background: '#fafaf9' }}></td>
                  {values.map((v, i) => (
                    <td key={i} style={{ padding: '12px 16px', textAlign: 'right', color: '#0f172a', fontSize: '13px', fontWeight: isBold ? 600 : 400, borderLeft: '1px solid #f1f5f9' }}>
                      {formatValue(v, unit)}
                    </td>
                  ))}
                  <td style={{ borderLeft: '1px solid #f1f5f9', background: '#f8fafc' }}></td>
                  <td style={{ padding: '12px', borderLeft: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '18px', justifyContent: 'center' }}>
                      {values.map((v, i) => (
                        <div 
                          key={i} 
                          title={`${periods[i].time}: ${formatValue(v, unit)}`}
                          style={{ 
                            width: '6px', 
                            height: `${Math.max(3, Math.round((Math.abs(v) / max) * 18))}px`, 
                            background: '#0284c7', 
                            opacity: v < 0 ? 0.5 : 1
                          }} 
                        />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!report && <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No financial reports saved for this company yet.</div>}
    </section>
  </ListingTabShell>;
};

export default FinancialsTab;
