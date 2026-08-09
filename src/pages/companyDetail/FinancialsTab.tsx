import React, { useMemo, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
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
      <div style={{ padding: '14px 16px 0', borderBottom: '1px solid #dbe3ee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#163b68', marginBottom: 12 }}><TrendingUp size={18} /><strong>Thông tin tài chính</strong></div>
        <div style={{ display: 'flex', gap: 18, overflowX: 'auto' }}>{REPORT_TABS.map((tab) => <button key={tab.type} type="button" onClick={() => setActiveReport(tab.type)} style={{ whiteSpace: 'nowrap', padding: '0 0 9px', border: 'none', borderBottom: activeReport === tab.type ? '2px solid #1677c8' : '2px solid transparent', background: 'none', color: activeReport === tab.type ? '#1264a3' : '#526579', fontWeight: activeReport === tab.type ? 700 : 500, cursor: 'pointer' }}>{tab.label}</button>)}</div>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', background: '#f7f9fc' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={periodType} onChange={(event) => setPeriodType(event.target.value)}><option>Theo quý</option><option>Theo năm</option></select>
          <select value={unit} onChange={(event) => setUnit(event.target.value)}><option>Tỷ đồng</option><option>Triệu đồng</option><option>Đồng</option></select>
        </div>
        <button type="button" onClick={exportExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 4, padding: '6px 10px', background: '#16803c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><Download size={14} />Xuất Excel</button>
      </div>
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#e9f2fb', color: '#244b73' }}><th style={{ textAlign: 'left', padding: 10, minWidth: 280 }}>Chỉ tiêu</th>{periods.map((period) => <th key={period.time} style={{ padding: 10, textAlign: 'right' }}>{period.time}</th>)}<th style={{ padding: 10, minWidth: 110 }}>Tăng trưởng</th></tr></thead><tbody>{rows.map((row) => { const values = periods.map((period) => valueFor(period, row.code)); const max = Math.max(...values.map(Math.abs), 1); const growth = values.length > 1 && values[0] ? ((values.at(-1)! - values[0]) / Math.abs(values[0])) * 100 : null; return <tr key={row.code} style={{ borderTop: '1px solid #e6edf5' }}><td style={{ padding: 10, color: '#1f3449', fontWeight: 600 }}>{row.name}</td>{values.map((value, index) => <td key={index} style={{ padding: 10, textAlign: 'right', color: value < 0 ? '#bd3030' : '#253f59' }}>{formatValue(value, unit)}</td>)}<td style={{ padding: 8 }}><div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 26 }}>{values.map((value, index) => <i key={index} style={{ width: 10, height: `${Math.max(3, Math.round(Math.abs(value) / max * 24))}px`, background: value >= 0 ? '#2781c7' : '#d85858', display: 'block' }} />)}</div><small style={{ color: growth != null && growth < 0 ? '#bd3030' : '#16803c' }}>{growth == null ? 'N/A' : `${growth.toFixed(1)}%`}</small></td></tr>; })}</tbody></table></div>
      {!report && <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Chưa có báo cáo tài chính đã được lưu cho doanh nghiệp này.</div>}
    </section>
  </ListingTabShell>;
};

export default FinancialsTab;
