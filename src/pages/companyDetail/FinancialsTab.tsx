import React, { useMemo, useState } from 'react';
import { Download, Pencil, Plus, Save, Trash2, TrendingUp, X } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyFinancial } from '../../types/listingData';
import { ListingTabShell } from './common';
import { useListingTabData } from './utils';

interface FinancialValue { code?: string; value?: number | null; }
interface FinancialPeriod { time?: string; data?: FinancialValue[]; }
interface FinancialRow { code?: string; name?: string; }
interface FinancialDocument { unit?: string | null; templace?: FinancialRow[]; data?: Array<{ code?: string; name?: string; data?: FinancialPeriod[] }>; }

const REPORT_TABS = [
  { label: 'BCTC tóm tắt', type: 'SUMMARY' },
  { label: 'Cân đối kế toán', type: 'BALANCE_SHEET' },
  { label: 'Kết quả KD', type: 'INCOME_STATEMENT' },
  { label: 'Lưu chuyển tiền tệ', type: 'CASH_FLOW' },
  { label: 'Chỉ số TC', type: 'RATIOS' },
  { label: 'Chỉ tiêu kế hoạch', type: 'PLAN' },
];

const DEFAULT_TEMPLATES: Record<string, FinancialRow[]> = {
  SUMMARY: [
    { code: 'REVENUE', name: 'Doanh thu thuần' },
    { code: 'GROSS_PROFIT', name: 'Lợi nhuận gộp' },
    { code: 'OPERATING_PROFIT', name: 'Lợi nhuận thuần hoạt động kinh doanh' },
    { code: 'NET_PROFIT', name: 'Lợi nhuận sau thuế' },
    { code: 'TOTAL_ASSETS', name: 'Tổng tài sản' },
    { code: 'EQUITY', name: 'Vốn chủ sở hữu' },
  ],
  BALANCE_SHEET: [
    { code: 'CURRENT_ASSETS', name: 'Tài sản ngắn hạn' },
    { code: 'FIXED_ASSETS', name: 'Tài sản dài hạn' },
    { code: 'TOTAL_ASSETS', name: 'Tổng tài sản' },
    { code: 'LIABILITIES', name: 'Nợ phải trả' },
    { code: 'EQUITY', name: 'Vốn chủ sở hữu' },
  ],
  INCOME_STATEMENT: [
    { code: 'REVENUE', name: 'Doanh thu thuần' },
    { code: 'COGS', name: 'Giá vốn hàng bán' },
    { code: 'GROSS_PROFIT', name: 'Lợi nhuận gộp' },
    { code: 'OPERATING_PROFIT', name: 'Lợi nhuận thuần hoạt động kinh doanh' },
    { code: 'NET_PROFIT', name: 'Lợi nhuận sau thuế' },
  ],
  CASH_FLOW: [
    { code: 'CF_OPERATING', name: 'Lưu chuyển tiền từ hoạt động kinh doanh' },
    { code: 'CF_INVESTING', name: 'Lưu chuyển tiền từ hoạt động đầu tư' },
    { code: 'CF_FINANCING', name: 'Lưu chuyển tiền từ hoạt động tài chính' },
    { code: 'CF_NET', name: 'Lưu chuyển tiền thuần trong kỳ' },
  ],
  RATIOS: [
    { code: 'ROE', name: 'ROE (%)' },
    { code: 'ROA', name: 'ROA (%)' },
    { code: 'GROSS_MARGIN', name: 'Biên lợi nhuận gộp (%)' },
    { code: 'NET_MARGIN', name: 'Biên lợi nhuận ròng (%)' },
    { code: 'DEBT_RATIO', name: 'Hệ số nợ' },
    { code: 'CURRENT_RATIO', name: 'Khả năng thanh toán hiện hành' },
  ],
  PLAN: [
    { code: 'PLAN_REVENUE', name: 'Kế hoạch doanh thu' },
    { code: 'PLAN_NET_PROFIT', name: 'Kế hoạch lợi nhuận sau thuế' },
    { code: 'PLAN_DIVIDEND', name: 'Kế hoạch cổ tức' },
  ],
};
const parseDocument = (itemsJson?: string | null): FinancialDocument | null => {
  try { return itemsJson ? JSON.parse(itemsJson) as FinancialDocument : null; } catch { return null; }
};
const valueFor = (period: FinancialPeriod, code?: string) => Number(period.data?.find((item) => item.code === code)?.value ?? 0);
const formatValue = (value: number, unit: string, sourceSnapshot = false) => {
  const divisor = sourceSnapshot || Math.abs(value) < 100_000_000 ? 1 : unit === 'Tỷ đồng' ? 1_000_000_000 : unit === 'Triệu đồng' ? 1_000_000 : 1;
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / divisor);
};

const inputStyle: React.CSSProperties = {
  width: '100%', minWidth: 92, boxSizing: 'border-box',
  border: '1px solid #cbd5e1', borderRadius: 4, padding: '5px 6px', fontSize: 12, textAlign: 'right',
  background: '#fff', color: '#1e293b',
};

const FinancialsTab: React.FC<{ companyId: string; editable?: boolean }> = ({ companyId, editable }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyFinancial[]>(`financials:v2:${companyId}`, companyId, listingDataApi.getFinancials);
  const [activeReport, setActiveReport] = useState(REPORT_TABS[0].type);
  const [periodType, setPeriodType] = useState('Theo năm');
  const [unit, setUnit] = useState('Tỷ đồng');

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, string>>>({});
  const [addedYears, setAddedYears] = useState<string[]>([]);
  const [removedYears, setRemovedYears] = useState<string[]>([]);
  const [newYear, setNewYear] = useState('');

  const report = useMemo(() => {
    const selected = (data?.data ?? []).find((item) => item.reportType === activeReport) ?? data?.data?.[0];
    return parseDocument(selected?.itemsJson) ?? null;
  }, [activeReport, data]);
  const rawPeriods = useMemo(() => report?.data?.[0]?.data ?? [], [report]);
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
  const rows = report?.templace ?? (editMode ? DEFAULT_TEMPLATES[activeReport] ?? [] : []);

  const draftYears = useMemo(
    () => Object.keys(draft).sort((a, b) => Number(a) - Number(b)),
    [draft],
  );

  const startEdit = () => {
    const seed: Record<string, Record<string, string>> = {};
    rawPeriods.forEach((period) => {
      if (!period.time) return;
      const values: Record<string, string> = {};
      period.data?.forEach((item) => {
        if (item.code) values[item.code] = item.value == null ? '' : String(item.value);
      });
      seed[period.time] = values;
    });
    setDraft(seed);
    setAddedYears([]);
    setRemovedYears([]);
    setNewYear('');
    setEditMsg(null);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setDraft({});
    setAddedYears([]);
    setRemovedYears([]);
    setNewYear('');
    setEditMsg(null);
  };

  const updateValue = (year: string, code: string, value: string) => {
    setDraft((prev) => ({ ...prev, [year]: { ...prev[year], [code]: value } }));
  };

  const addYear = () => {
    const year = newYear.trim();
    if (!/^\d{4}$/.test(year)) {
      setEditMsg({ ok: false, text: 'Năm tài chính phải có 4 chữ số, ví dụ 2025.' });
      return;
    }
    const numeric = Number(year);
    if (numeric < 1900 || numeric > 2100) {
      setEditMsg({ ok: false, text: 'Năm tài chính phải nằm trong khoảng 1900-2100.' });
      return;
    }
    if (draft[year] || addedYears.includes(year)) {
      setEditMsg({ ok: false, text: `Năm ${year} đã tồn tại trong báo cáo này.` });
      return;
    }
    setDraft((prev) => ({ ...prev, [year]: {} }));
    setAddedYears((prev) => [...prev, year]);
    setRemovedYears((prev) => prev.filter((y) => y !== year));
    setNewYear('');
    setEditMsg(null);
  };

  const removeYear = (year: string) => {
    setDraft((prev) => {
      const next = { ...prev };
      delete next[year];
      return next;
    });
    if (addedYears.includes(year)) {
      setAddedYears((prev) => prev.filter((y) => y !== year));
    } else if (!removedYears.includes(year)) {
      setRemovedYears((prev) => [...prev, year]);
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    setEditMsg(null);
    try {
      const years = Object.keys(draft);
      years.forEach((year) => {
        if (!/^\d{4}$/.test(year)) throw new Error(`Năm tài chính không hợp lệ: "${year}".`);
        const numeric = Number(year);
        if (numeric < 1900 || numeric > 2100) throw new Error(`Năm tài chính ${year} nằm ngoài khoảng 1900-2100.`);
      });
      if (Object.keys(draft).length === 0) {
        throw new Error('Vui lòng thêm ít nhất một năm tài chính trước khi lưu.');
      }
      years.forEach((year) => {
        Object.entries(draft[year]).forEach(([code, raw]) => {
          if (raw.trim() !== '' && !Number.isFinite(Number(raw))) {
            const rowName = rows.find((row) => row.code === code)?.name ?? code;
            throw new Error(`Giá trị "${raw}" của chỉ tiêu "${rowName}" năm ${year} không phải là số.`);
          }
        });
      });

      const templace = rows.filter((row): row is FinancialRow & { code: string } => Boolean(row.code));
      const promises: Promise<unknown>[] = [];
      years.sort((a, b) => Number(a) - Number(b)).forEach((year) => {
        const values = templace.map((row) => ({ code: row.code, value: Number(draft[year][row.code] ?? 0) }));
        const doc: FinancialDocument = {
          unit: report?.unit ?? unit,
          templace: templace.map((row) => ({ code: row.code, name: row.name })),
          data: [{
            code: activeReport,
            name: activeReport,
            data: [{ time: year, data: values }],
          }],
        };
        promises.push(listingDataApi.upsertOwnerFinancialReport({
          reportType: activeReport,
          reportYear: Number(year),
          periodType: 'YEAR',
          reportPeriod: year,
          itemsJson: JSON.stringify(doc),
        }));
      });
      removedYears.forEach((year) => {
        promises.push(listingDataApi.deleteOwnerFinancialReport(activeReport, Number(year)));
      });

      await Promise.all(promises);
      setEditMsg({ ok: true, text: 'Đã lưu thay đổi báo cáo tài chính.' });
      setEditMode(false);
      setDraft({});
      setAddedYears([]);
      setRemovedYears([]);
      setNewYear('');
      reload();
    } catch (err) {
      setEditMsg({ ok: false, text: err instanceof Error ? err.message : 'Không thể lưu thay đổi.' });
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    const csvRows = rows.map((row) => [row.name || '', ...periods.map((period) => String(valueFor(period, row.code)))]);
    const csv = [['Chỉ tiêu', ...periods.map((period) => period.time || '')], ...csvRows]
      .map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = `${companyId}-financials.csv`; anchor.click(); URL.revokeObjectURL(href);
  };

  return <ListingTabShell loading={loading} error={error} hasData={Boolean(report) || Boolean(editable)} crawledAt={data?.crawledAt} onRetry={reload}>
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={exportExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 4, padding: '6px 10px', background: '#16803c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><Download size={14} />Xuất Excel</button>
          {editable && !editMode && (
            <button type="button" onClick={startEdit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 4, padding: '6px 10px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><Pencil size={14} />Chỉnh sửa</button>
          )}
          {editable && editMode && (
            <>
              <button type="button" onClick={cancelEdit} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #cbd5e1', borderRadius: 4, padding: '6px 10px', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }}><X size={14} />Hủy</button>
              <button type="button" onClick={() => void saveChanges()} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', borderRadius: 4, padding: '6px 10px', background: '#16803c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><Save size={14} />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </>
          )}
        </div>
      </div>
      {editMsg && (
        <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 600, background: editMsg.ok ? '#ecfdf5' : '#fef2f2', color: editMsg.ok ? '#166534' : '#b91c1c', borderBottom: '1px solid #e2e8f0' }}>
          {editMsg.text}
        </div>
      )}
      {editMode && (
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #e2e8f0', background: '#fbfdff' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Thêm năm tài chính:</span>
          <input
            value={newYear}
            onChange={(event) => setNewYear(event.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="Ví dụ: 2025"
            style={{ width: 100, border: '1px solid #cbd5e1', borderRadius: 4, padding: '5px 8px', fontSize: 12 }}
          />
          <button type="button" onClick={addYear} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', borderRadius: 4, padding: '5px 10px', background: '#2563eb', color: '#fff', fontWeight: 700, cursor: 'pointer' }}><Plus size={13} />Thêm</button>
          {removedYears.length > 0 && <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600 }}>Sẽ xóa {removedYears.length} năm khi lưu.</span>}
        </div>
      )}
      <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}><thead><tr style={{ background: '#e9f2fb', color: '#244b73' }}><th style={{ textAlign: 'left', padding: 10, minWidth: 280 }}>Chỉ tiêu</th>{editMode
        ? draftYears.map((year) => <th key={year} style={{ padding: 10, textAlign: 'right', minWidth: 110 }}><div>{year}</div><button type="button" onClick={() => removeYear(year)} disabled={saving} title="Xóa năm này" style={{ border: 'none', background: 'none', color: '#b91c1c', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}><Trash2 size={12} style={{ verticalAlign: 'middle' }} /> Xóa</button></th>)
        : periods.map((period) => <th key={period.time} style={{ padding: 10, textAlign: 'right' }}>{period.time}</th>)}<th style={{ padding: 10, minWidth: 110 }}>Tăng trưởng</th></tr></thead><tbody>{editMode
        ? rows.filter((row): row is FinancialRow & { code: string } => Boolean(row.code)).map((row) => {
          const values = draftYears.map((year) => Number(draft[year][row.code] ?? 0));
          const max = Math.max(...values.map(Math.abs), 1);
          const growth = values.length > 1 && values[0] ? ((values.at(-1)! - values[0]) / Math.abs(values[0])) * 100 : null;
          return <tr key={row.code} style={{ borderTop: '1px solid #e6edf5' }}><td style={{ padding: 10, color: '#1f3449', fontWeight: 600 }}>{row.name}</td>{draftYears.map((year) => <td key={year} style={{ padding: 6, textAlign: 'right' }}><input type="number" step="any" value={draft[year][row.code] ?? ''} onChange={(event) => updateValue(year, row.code, event.target.value)} disabled={saving} style={inputStyle} /></td>)}<td style={{ padding: 8 }}><div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 26 }}>{values.map((value, index) => <i key={index} style={{ width: 10, height: `${Math.max(3, Math.round(Math.abs(value) / max * 24))}px`, background: value >= 0 ? '#2781c7' : '#d85858', display: 'block' }} />)}</div><small style={{ color: growth != null && growth < 0 ? '#bd3030' : '#16803c' }}>{growth == null ? 'N/A' : `${growth.toFixed(1)}%`}</small></td></tr>;
        })
        : rows.map((row) => {
          const values = periods.map((period) => valueFor(period, row.code));
          const max = Math.max(...values.map(Math.abs), 1);
          const growth = values.length > 1 && values[0] ? ((values.at(-1)! - values[0]) / Math.abs(values[0])) * 100 : null;
          return <tr key={row.code} style={{ borderTop: '1px solid #e6edf5' }}><td style={{ padding: 10, color: '#1f3449', fontWeight: 600 }}>{row.name}</td>{values.map((value, index) => <td key={index} style={{ padding: 10, textAlign: 'right', color: value < 0 ? '#bd3030' : '#253f59' }}>{formatValue(value, unit)}</td>)}<td style={{ padding: 8 }}><div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 26 }}>{values.map((value, index) => <i key={index} style={{ width: 10, height: `${Math.max(3, Math.round(Math.abs(value) / max * 24))}px`, background: value >= 0 ? '#2781c7' : '#d85858', display: 'block' }} />)}</div><small style={{ color: growth != null && growth < 0 ? '#bd3030' : '#16803c' }}>{growth == null ? 'N/A' : `${growth.toFixed(1)}%`}</small></td></tr>;
        })}</tbody></table></div>
      {!report && !editMode && <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>Chưa có dữ liệu tài chính.</div>}
    </section>
  </ListingTabShell>;
};

export default FinancialsTab;
