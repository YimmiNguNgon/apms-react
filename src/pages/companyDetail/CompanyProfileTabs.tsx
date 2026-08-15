import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CompanyProfileInsights, CompanyProfileMember, OwnerCompanyIntelligenceResponse, ProfileResponse } from '../../types/domain';
import type { ListingTabId } from './utils';
import { C, GHOST_BUTTON, INPUT_STYLE, PRIMARY_BUTTON } from './tokens';

export interface OverviewPayload {
  legalName: string;
  tradeName: string;
  taxCode: string;
  registrationNumber: string;
  stockTicker: string;
  stockExchange: string;
  website: string;
  email: string;
  phone: string;
  employeeTier: string;
  employeeCount?: number;
  address: string;
  businessModel: string;
  industries: string[];
}

export interface SwotPayload {
  insights: CompanyProfileInsights;
}

export interface BusinessFieldsPayload {
  products: Array<{ name: string; category: string; description: string }>;
  markets: string[];
  targetCustomers: string[];
}

export interface BoardPayload {
  companyMembers: CompanyProfileMember[];
}

export type EditableListingTab = 'overview' | 'swot' | 'business-fields' | 'board';

export interface ListingEditState {
  editing: boolean;
  saving: boolean;
  tickerDraft: string;
  exchangeDraft: string;
  msg: { ok: boolean; text: string } | null;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onTickerChange: (value: string) => void;
  onExchangeChange: (value: string) => void;
}

interface CompanyProfileTabsProps {
  profile: ProfileResponse;
  intelligence?: OwnerCompanyIntelligenceResponse | null;
  activeTab: ListingTabId;
  editable?: boolean;
  overviewAside?: React.ReactNode;
  canEditListing?: boolean;
  listing?: ListingEditState;
  boardOverride?: React.ReactNode;
  onSaveOverview?: (payload: OverviewPayload) => Promise<unknown>;
  onSaveSwot?: (payload: SwotPayload) => Promise<unknown>;
  onSaveBusinessFields?: (payload: BusinessFieldsPayload) => Promise<unknown>;
  onSaveBoard?: (payload: BoardPayload) => Promise<unknown>;
}

interface OverviewDraft {
  legalName: string;
  tradeName: string;
  taxCode: string;
  registrationNumber: string;
  stockTicker: string;
  stockExchange: string;
  website: string;
  email: string;
  phone: string;
  employeeTier: string;
  employeeCount: string;
  address: string;
  businessModel: string;
  industries: string;
}

interface SwotDraft {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface BfDraft {
  products: Array<{ name: string; category: string; description: string }>;
  markets: string[];
  targetCustomers: string[];
}

interface BoardDraftMember {
  fullName: string;
  position: string;
  imageUrl: string;
  notes: string;
}

const splitCsv = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const joinCsv = (items?: string[]): string => (items && items.length > 0 ? items.join(', ') : '');

const EMPLOYEE_TIERS = ['', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'];

const Avatar: React.FC<{ name?: string; imageUrl?: string | null; size?: number }> = ({ name, imageUrl, size = 32 }) => {
  const clean = (name || '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : clean.substring(0, 2).toUpperCase();

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name || 'Avatar'}
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', background: '#F1F5F9', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: `${Math.max(10, Math.round(size * 0.38))}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
};

const ChipListEditor: React.FC<{
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}> = ({ items, onChange, placeholder }) => {
  const [text, setText] = useState('');
  const add = () => {
    const value = text.trim();
    if (value && !items.includes(value)) onChange([...items, value]);
    setText('');
  };
  return (
    <div>
      <div style={{ display: 'flex', gap: '4px' }}>
        <input
          value={text}
          style={INPUT_STYLE}
          placeholder={placeholder || 'Thêm và nhấn Enter...'}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              add();
            }
          }}
        />
        <button type="button" onClick={add} style={{ ...PRIMARY_BUTTON, whiteSpace: 'nowrap' }}>
          Thêm
        </button>
      </div>
      {items.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
          {items.map((item, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                background: '#F1F5F9',
                color: '#334155',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600,
              }}
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '0.72rem', lineHeight: 1, padding: 0 }}
                aria-label={`Xóa ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ background: '#F8FAFC', padding: '5px 8px', borderRadius: '6px', border: '1px solid #F1F5F9', minWidth: 0 }}>
    <span style={C.fieldLabel}>{label}</span>
    {children}
  </div>
);

const TabToolbar: React.FC<{ title: string; subtitle?: string; onEdit: () => void }> = ({ title, subtitle, onEdit }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
    <div>
      <h2 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>{title}</h2>
      {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.68rem', color: '#64748B' }}>{subtitle}</p>}
    </div>
    <button
      type="button"
      onClick={onEdit}
      style={{
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        color: '#1D4ED8',
        fontSize: '0.68rem',
        fontWeight: 600,
        padding: '3px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
    >
      Chỉnh sửa
    </button>
  </div>
);

const SaveBar: React.FC<{
  saving: boolean;
  msg: { ok: boolean; text: string } | null;
  onCancel: () => void;
  onSave: () => void;
}> = ({ saving, msg, onCancel, onSave }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
    <button type="button" onClick={onCancel} style={GHOST_BUTTON} disabled={saving}>
      Hủy
    </button>
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      style={{ ...PRIMARY_BUTTON, opacity: saving ? 0.5 : 1, whiteSpace: 'nowrap' }}
    >
      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
    </button>
    {msg && (
      <span style={{ fontSize: '0.66rem', fontWeight: 600, color: msg.ok ? '#15803D' : '#B91C1C' }}>{msg.text}</span>
    )}
  </div>
);

/**
 * Shared content of the 4 Owner Company Profile tabs (Overview, SWOT,
 * Business Fields, Ban lãnh đạo). Used by:
 *  - CompanyDetail (Owner view) with editable=false
 *  - Admin OwnerCompanyProfilePage with editable=true
 * Both pages read the same backend document (company_profiles), so an admin
 * edit is immediately visible to the Owner.
 */
export const CompanyProfileTabs: React.FC<CompanyProfileTabsProps> = ({
  profile,
  intelligence,
  activeTab,
  editable = false,
  overviewAside,
  canEditListing = false,
  listing,
  boardOverride,
  onSaveOverview,
  onSaveSwot,
  onSaveBusinessFields,
  onSaveBoard,
}) => {
  const { t } = useTranslation('company-list');

  const [editing, setEditing] = useState<EditableListingTab | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [overviewDraft, setOverviewDraft] = useState<OverviewDraft | null>(null);
  const [swotDraft, setSwotDraft] = useState<SwotDraft | null>(null);
  const [bfDraft, setBfDraft] = useState<BfDraft | null>(null);
  const [boardDraft, setBoardDraft] = useState<BoardDraftMember[] | null>(null);
  const [editingMember, setEditingMember] = useState<number | null>(null);

  const cancelAll = () => {
    setEditing(null);
    setSaving(false);
    setMsg(null);
    setOverviewDraft(null);
    setSwotDraft(null);
    setBfDraft(null);
    setBoardDraft(null);
    setEditingMember(null);
  };

  const startEditing = (tab: EditableListingTab) => {
    setMsg(null);
    setEditingMember(null);
    if (tab === 'overview') {
      setOverviewDraft({
        legalName: profile.identity?.legalName ?? '',
        tradeName: profile.identity?.tradeName ?? '',
        taxCode: profile.identity?.taxCode ?? '',
        registrationNumber: profile.identity?.registrationNumber ?? '',
        stockTicker: profile.identity?.stockTicker ?? profile.stockTicker ?? '',
        stockExchange: profile.identity?.stockExchange ?? profile.stockExchange ?? 'NONE',
        website: profile.contact?.website ?? '',
        email: profile.contact?.emails?.[0] ?? '',
        phone: profile.contact?.phones?.[0] ?? '',
        employeeTier: profile.companySize?.employeeTier ?? '',
        employeeCount: profile.companySize?.employeeCount != null ? String(profile.companySize.employeeCount) : '',
        address: profile.contact?.addresses?.find((a) => a.type === 'HEADQUARTERS')?.fullAddress
          ?? profile.contact?.addresses?.[0]?.fullAddress
          ?? '',
        businessModel: profile.business?.businessModel ?? '',
        industries: joinCsv(profile.business?.industries),
      });
    } else if (tab === 'swot') {
      const insights = profile.insights || {};
      setSwotDraft({
        strengths: [...(insights.strengths || [])],
        weaknesses: [...(insights.weaknesses || [])],
        opportunities: [...(insights.opportunities || [])],
        threats: [...(insights.threats || [])],
      });
    } else if (tab === 'business-fields') {
      setBfDraft({
        products: (profile.business?.products || []).map((p) => ({
          name: p.name ?? '',
          category: p.category ?? '',
          description: p.description ?? '',
        })),
        markets: [...(profile.business?.markets || [])],
        targetCustomers: [...(profile.business?.targetCustomers || [])],
      });
    } else {
      setBoardDraft(
        (profile.companyMembers || []).map((m) => ({
          fullName: m.fullName ?? m.name ?? '',
          position: m.position ?? m.role ?? '',
          imageUrl: m.imageUrl ?? '',
          notes: m.notes ?? '',
        })),
      );
    }
    setEditing(tab);
  };

  const runSave = async (action: () => Promise<unknown> | void) => {
    setSaving(true);
    setMsg(null);
    try {
      await action();
      setMsg({ ok: true, text: 'Đã lưu thay đổi thành công.' });
      setEditing(null);
      setOverviewDraft(null);
      setSwotDraft(null);
      setBfDraft(null);
      setBoardDraft(null);
      setEditingMember(null);
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Lưu thay đổi thất bại.' });
    } finally {
      setSaving(false);
    }
  };

  const saveOverview = () => {
    if (!overviewDraft) return;
    void runSave(() =>
      onSaveOverview?.({
        legalName: overviewDraft.legalName.trim(),
        tradeName: overviewDraft.tradeName.trim(),
        taxCode: overviewDraft.taxCode.trim(),
        registrationNumber: overviewDraft.registrationNumber.trim(),
        stockTicker: overviewDraft.stockTicker.trim().toUpperCase(),
        stockExchange: overviewDraft.stockExchange,
        website: overviewDraft.website.trim(),
        email: overviewDraft.email.trim(),
        phone: overviewDraft.phone.trim(),
        employeeTier: overviewDraft.employeeTier.trim(),
        employeeCount: overviewDraft.employeeCount.trim() ? Number(overviewDraft.employeeCount.trim()) : undefined,
        address: overviewDraft.address.trim(),
        businessModel: overviewDraft.businessModel.trim(),
        industries: splitCsv(overviewDraft.industries),
      }),
    );
  };

  const saveSwot = () => {
    if (!swotDraft) return;
    void runSave(() => onSaveSwot?.({ insights: swotDraft }));
  };

  const saveBusinessFields = () => {
    if (!bfDraft) return;
    void runSave(() =>
      onSaveBusinessFields?.({
        products: bfDraft.products.map((p) => ({
          name: p.name.trim(),
          category: p.category.trim(),
          description: p.description.trim(),
        })),
        markets: bfDraft.markets,
        targetCustomers: bfDraft.targetCustomers,
      }),
    );
  };

  const saveBoard = () => {
    if (!boardDraft) return;
    void runSave(() =>
      onSaveBoard?.({
        companyMembers: boardDraft.map((m) => ({
          fullName: m.fullName.trim(),
          position: m.position.trim(),
          imageUrl: m.imageUrl.trim() || undefined,
          notes: m.notes.trim() || undefined,
        })),
      }),
    );
  };

  /* ── Overview ─────────────────────────────────────────────────── */
  const renderOverviewView = () => {
    const tradeName = profile.identity?.tradeName;
    const legalName = profile.identity?.legalName;
    const taxCode = profile.identity?.taxCode || 'Chưa cập nhật';
    const regNo = profile.identity?.registrationNumber || 'Chưa cập nhật';
    const empCount = profile.companySize?.employeeCount || intelligence?.company?.employeeCount;
    const empTier = profile.companySize?.employeeTier;
    const sizeStr = empCount ? `${empCount} nhân sự ${empTier ? `(${empTier})` : ''}` : (empTier || 'Chưa cập nhật');
    const website = profile.contact?.website || intelligence?.company?.website || 'Chưa cập nhật';
    const email = profile.contact?.emails?.[0] || 'Chưa cập nhật';
    const phone = profile.contact?.phones?.[0] || 'Chưa cập nhật';
    const address = profile.contact?.addresses?.[0]?.fullAddress || intelligence?.company?.headquarters || 'Chưa cập nhật';
    const ticker = profile.identity?.stockTicker ?? profile.stockTicker?.trim() ?? '';
    const exchange = profile.identity?.stockExchange ?? profile.stockExchange ?? 'NONE';
    const exchangeLabel = (ex?: string) => (ex && ex !== 'NONE' ? ex : 'Chưa niêm yết');

    return (
      <div style={{ display: 'grid', gridTemplateColumns: overviewAside ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'start' }} id="company-detail-2col-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Thông tin Pháp lý & Định danh Doanh nghiệp</h2>
            </div>
            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Tên Thương Mại (Trade Name)</span>
                <strong style={tradeName ? C.value : C.muted}>{tradeName || 'Chưa cập nhật'}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Tên Pháp Lý (Legal Name)</span>
                <strong style={legalName ? C.value : C.muted}>{legalName || 'Chưa cập nhật'}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Mã Số Thuế (Tax Code)</span>
                <strong style={{ ...(taxCode !== 'Chưa cập nhật' ? C.value : C.muted), fontFamily: 'monospace' }}>{taxCode}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Số Giấy Đăng Ký KD (Registration No)</span>
                <strong style={{ ...(regNo !== 'Chưa cập nhật' ? C.value : C.muted), fontFamily: 'monospace' }}>{regNo}</strong>
              </div>
            </div>

            <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h3 style={C.h3}>Thông Tin Niêm Yết</h3>
                {canEditListing && !editable && listing && !listing.editing && (
                  <button
                    type="button"
                    onClick={listing.onStartEdit}
                    style={{
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      color: '#1D4ED8',
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Cập nhật mã CK
                  </button>
                )}
              </div>
              {canEditListing && !editable && listing && listing.editing ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <span style={C.fieldLabel}>Mã Cổ Phiếu</span>
                    <input
                      type="text"
                      value={listing.tickerDraft}
                      disabled={listing.exchangeDraft === 'NONE'}
                      onChange={(event) => listing.onTickerChange(event.target.value.toUpperCase())}
                      placeholder="VD: FPT"
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        background: listing.exchangeDraft === 'NONE' ? '#F1F5F9' : '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <span style={C.fieldLabel}>Sàn Giao Dịch</span>
                    <select
                      value={listing.exchangeDraft}
                      onChange={(event) => listing.onExchangeChange(event.target.value)}
                      style={INPUT_STYLE}
                    >
                      <option value="HOSE">HOSE</option>
                      <option value="HNX">HNX</option>
                      <option value="UPCOM">UPCOM</option>
                      <option value="NONE">Chưa niêm yết</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={listing.onSave}
                      disabled={listing.saving || (listing.exchangeDraft !== 'NONE' && !listing.tickerDraft.trim())}
                      style={{
                        ...PRIMARY_BUTTON,
                        opacity: listing.saving || (listing.exchangeDraft !== 'NONE' && !listing.tickerDraft.trim()) ? 0.5 : 1,
                      }}
                    >
                      {listing.saving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button type="button" onClick={listing.onCancel} style={GHOST_BUTTON}>
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <div style={C.fieldGrid}>
                  <div style={C.fieldCell}>
                    <span style={C.fieldLabel}>Mã Cổ Phiếu (Ticker)</span>
                    <strong style={{ ...(ticker ? C.value : C.muted), color: ticker ? '#1E40AF' : '#94A3B8', fontFamily: 'monospace' }}>
                      {ticker || 'Chưa niêm yết'}
                    </strong>
                  </div>
                  <div style={C.fieldCell}>
                    <span style={C.fieldLabel}>Sàn Giao Dịch (Exchange)</span>
                    <strong style={exchange !== 'NONE' ? C.value : C.muted}>{exchangeLabel(exchange)}</strong>
                  </div>
                </div>
              )}
              {listing?.msg && (
                <div style={{ marginTop: '6px', fontSize: '0.62rem', fontWeight: 500, color: listing.msg.ok ? '#15803D' : '#B91C1C' }}>
                  {listing.msg.text}
                </div>
              )}
            </div>
          </section>

          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Thông tin Liên hệ & Quy mô</h2>
            </div>
            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Website</span>
                {website !== 'Chưa cập nhật' ? (
                  <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                    {website}
                  </a>
                ) : (
                  <strong style={C.muted}>{website}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Email liên hệ</span>
                <strong style={email !== 'Chưa cập nhật' ? C.value : C.muted}>{email}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Điện thoại</span>
                <strong style={phone !== 'Chưa cập nhật' ? C.value : C.muted}>{phone}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Quy mô nhân sự</span>
                <strong style={sizeStr !== 'Chưa cập nhật' ? C.value : C.muted}>{sizeStr}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Địa chỉ trụ sở chính</span>
                <strong style={address !== 'Chưa cập nhật' ? C.value : C.muted}>{address}</strong>
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Ngày thành lập</span>
                <strong style={C.muted}>N/A</strong>
              </div>
            </div>
          </section>

          {(profile.business?.businessModel || intelligence?.company?.businessModel) && (
            <section style={C.card}>
              <div style={C.cardHeader}>
                <h2 style={C.h2}>Giới thiệu & Mô hình kinh doanh</h2>
              </div>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#334155', lineHeight: '1.5' }}>
                {profile.business?.businessModel || intelligence?.company?.businessModel}
              </p>
            </section>
          )}
        </div>

        {overviewAside && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{overviewAside}</div>
        )}
      </div>
    );
  };

  const renderOverviewForm = () => {
    if (!overviewDraft) return null;
    const setField = (key: keyof OverviewDraft) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setOverviewDraft((prev) => (prev ? { ...prev, [key]: event.target.value } : prev));
      };
    const setExchange = (value: string) => {
      setOverviewDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev, stockExchange: value };
        if (value === 'NONE') next.stockTicker = '';
        return next;
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Thông tin Pháp lý & Định danh Doanh nghiệp</h2>
          </div>
          <div style={C.fieldGrid}>
            <FormField label="Tên Thương Mại (Trade Name)">
              <input value={overviewDraft.tradeName} onChange={setField('tradeName')} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Tên Pháp Lý (Legal Name)">
              <input value={overviewDraft.legalName} onChange={setField('legalName')} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Mã Số Thuế (Tax Code)">
              <input value={overviewDraft.taxCode} onChange={setField('taxCode')} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Số Giấy Đăng Ký KD (Registration No)">
              <input value={overviewDraft.registrationNumber} onChange={setField('registrationNumber')} style={INPUT_STYLE} />
            </FormField>
          </div>
        </section>

        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Thông Tin Niêm Yết</h2>
          </div>
          <div style={C.fieldGrid}>
            <FormField label="Mã Cổ Phiếu (Ticker)">
              <input
                value={overviewDraft.stockTicker}
                disabled={overviewDraft.stockExchange === 'NONE'}
                onChange={(event) => setField('stockTicker')(event)}
                placeholder="VD: FPT"
                style={{
                  ...INPUT_STYLE,
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  background: overviewDraft.stockExchange === 'NONE' ? '#F1F5F9' : '#FFFFFF',
                }}
              />
            </FormField>
            <FormField label="Sàn Giao Dịch (Exchange)">
              <select
                value={overviewDraft.stockExchange}
                onChange={(event) => setExchange(event.target.value)}
                style={INPUT_STYLE}
              >
                <option value="HOSE">HOSE</option>
                <option value="HNX">HNX</option>
                <option value="UPCOM">UPCOM</option>
                <option value="NONE">Chưa niêm yết</option>
              </select>
            </FormField>
          </div>
        </section>

        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Thông tin Liên hệ & Quy mô</h2>
          </div>
          <div style={C.fieldGrid}>
            <FormField label="Website">
              <input value={overviewDraft.website} onChange={setField('website')} placeholder="https://..." style={INPUT_STYLE} />
            </FormField>
            <FormField label="Email liên hệ">
              <input type="email" value={overviewDraft.email} onChange={setField('email')} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Điện thoại">
              <input value={overviewDraft.phone} onChange={setField('phone')} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Quy mô nhân sự (Employee Tier)">
              <select
                value={overviewDraft.employeeTier}
                onChange={(event) =>
                  setOverviewDraft((prev) => (prev ? { ...prev, employeeTier: event.target.value } : prev))
                }
                style={INPUT_STYLE}
              >
                {EMPLOYEE_TIERS.map((tier) => (
                  <option key={tier} value={tier}>{tier ? tier : 'Chưa cập nhật'}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Số lượng nhân sự (Employee Count)">
              <input type="number" min={1} value={overviewDraft.employeeCount} onChange={setField('employeeCount')} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Địa chỉ trụ sở chính">
              <input value={overviewDraft.address} onChange={setField('address')} style={INPUT_STYLE} />
            </FormField>
          </div>
        </section>

        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Giới thiệu & Mô hình kinh doanh</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <FormField label="Ngành nghề (phân cách bằng dấu phẩy)">
              <input value={overviewDraft.industries} onChange={setField('industries')} placeholder="VD: Công nghệ, Dịch vụ phần mềm" style={INPUT_STYLE} />
            </FormField>
            <FormField label="Mô hình kinh doanh">
              <textarea rows={3} value={overviewDraft.businessModel} onChange={setField('businessModel')} style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.4' }} />
            </FormField>
          </div>
        </section>

        <SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveOverview} />
      </div>
    );
  };

  const renderOverview = () => {
    const editingThis = editable && editing === 'overview' && overviewDraft;
    const toolbar = editable && !editingThis
      ? (
        <TabToolbar
          title="Hồ sơ công ty chủ quản"
          subtitle="Thông tin pháp lý, niêm yết, liên hệ, quy mô và mô hình kinh doanh của công ty chủ quản."
          onEdit={() => startEditing('overview')}
        />
      )
      : null;
    return (
      <div>
        {toolbar}
        {editingThis ? renderOverviewForm() : renderOverviewView()}
      </div>
    );
  };

  /* ── SWOT ─────────────────────────────────────────────────────── */
  const renderSwotView = () => {
    const swot = profile.insights || {};
    const strengths = swot.strengths || [];
    const weaknesses = swot.weaknesses || [];
    const opportunities = swot.opportunities || [];
    const threats = swot.threats || [];
    const hasSwot = strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0 || threats.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>{t('swot.headerTitle')}</h2>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>{t('swot.headerDesc')}</p>
        </div>

        {!hasSwot ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>{t('swot.noData')}</p>
          </div>
        ) : (
          <div className="company-detail-swot-grid">
            <div className="company-detail-swot-card strength">
              <strong>{t('swot.strengths')}</strong>
              {strengths.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noStrengths')}</p>}
            </div>
            <div className="company-detail-swot-card weakness">
              <strong>{t('swot.weaknesses')}</strong>
              {weaknesses.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {weaknesses.map((w, idx) => <li key={idx}>{w}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noWeaknesses')}</p>}
            </div>
            <div className="company-detail-swot-card opportunity">
              <strong>{t('swot.opportunities')}</strong>
              {opportunities.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {opportunities.map((o, idx) => <li key={idx}>{o}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noOpportunities')}</p>}
            </div>
            <div className="company-detail-swot-card threat">
              <strong>{t('swot.threats')}</strong>
              {threats.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.74rem', lineHeight: '1.6' }}>
                  {threats.map((th, idx) => <li key={idx}>{th}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noThreats')}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSwotForm = () => {
    if (!swotDraft) return null;
    const sections: Array<{ key: keyof SwotDraft; label: string }> = [
      { key: 'strengths', label: t('swot.strengths') },
      { key: 'weaknesses', label: t('swot.weaknesses') },
      { key: 'opportunities', label: t('swot.opportunities') },
      { key: 'threats', label: t('swot.threats') },
    ];
    const updateItem = (key: keyof SwotDraft, idx: number, value: string) => {
      setSwotDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: prev[key].map((item, i) => (i === idx ? value : item)) };
      });
    };
    const removeItem = (key: keyof SwotDraft, idx: number) => {
      setSwotDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: prev[key].filter((_, i) => i !== idx) };
      });
    };
    const addItem = (key: keyof SwotDraft) => {
      setSwotDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, [key]: [...prev[key], ''] };
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sections.map((section) => (
          <section key={section.key} style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>{section.label}</h2>
              <button
                type="button"
                onClick={() => addItem(section.key)}
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', cursor: 'pointer' }}
              >
                + Thêm mục
              </button>
            </div>
            {swotDraft[section.key].length === 0 ? (
              <p style={{ margin: '0 0 4px', fontSize: '0.72rem', color: '#94A3B8' }}>Chưa có mục nào.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {swotDraft[section.key].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={item}
                      onChange={(event) => updateItem(section.key, idx, event.target.value)}
                      placeholder="Nhập nội dung phân tích..."
                      style={INPUT_STYLE}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(section.key, idx)}
                      style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.72rem', fontWeight: 600, padding: '0 10px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Xóa
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
        <SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveSwot} />
      </div>
    );
  };

  const renderSwot = () => {
    const editingThis = editable && editing === 'swot' && swotDraft;
    const toolbar = editable && !editingThis
      ? (
        <TabToolbar
          title="Phân tích SWOT"
          subtitle="Admin chỉnh sửa thủ công; AI chỉ cung cấp gợi ý phân tích."
          onEdit={() => startEditing('swot')}
        />
      )
      : null;
    return (
      <div>
        {toolbar}
        {editingThis ? renderSwotForm() : renderSwotView()}
      </div>
    );
  };

  /* ── Business Fields ──────────────────────────────────────────── */
  const renderBusinessFieldsView = () => {
    const products = profile.business?.products || intelligence?.products || [];
    const industries = profile.business?.industries || intelligence?.company?.industries || [];
    const markets = profile.business?.markets || intelligence?.company?.markets || [];
    const targetCustomers = profile.business?.targetCustomers || [];
    const hasData = products.length > 0 || industries.length > 0 || markets.length > 0 || targetCustomers.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>Lĩnh vực & Hoạt động Kinh doanh</h2>
          <p style={{ fontSize: '0.72rem', color: '#64748B', margin: 0 }}>Thông tin chi tiết về các sản phẩm/dịch vụ cung cấp, phân khúc thị trường và đối tượng khách hàng mục tiêu.</p>
        </div>

        {!hasData ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Chưa có dữ liệu lĩnh vực kinh doanh.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <section style={C.card}>
                <div style={C.cardHeader}>
                  <h2 style={C.h2}>Sản phẩm & Dịch vụ (Products & Services)</h2>
                </div>
                {products.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {products.map((p, idx) => (
                      <div key={idx} style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '0.76rem', color: '#0F172A' }}>{p.name}</strong>
                          {p.category && (
                            <span style={{ fontSize: '0.62rem', background: '#EFF6FF', color: '#1D4ED8', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {p.category}
                            </span>
                          )}
                        </div>
                        {p.description && <p style={{ margin: 0, fontSize: '0.7rem', color: '#475569', lineHeight: '1.4' }}>{p.description}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>Chưa ghi nhận danh mục sản phẩm/dịch vụ.</p>
                )}
              </section>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <section style={C.card}>
                <div style={C.cardHeader}>
                  <h2 style={C.h2}>Thị trường & Khách hàng (Markets & Customers)</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Thị trường hoạt động</span>
                    {markets.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {markets.map((m, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa cập nhật</span>}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Khách hàng mục tiêu</span>
                    {targetCustomers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {targetCustomers.map((c, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa cập nhật</span>}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBusinessFieldsForm = () => {
    if (!bfDraft) return null;
    const updateProduct = (idx: number, field: 'name' | 'category' | 'description', value: string) => {
      setBfDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          products: prev.products.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
        };
      });
    };
    const removeProduct = (idx: number) => {
      setBfDraft((prev) => {
        if (!prev) return prev;
        return { ...prev, products: prev.products.filter((_, i) => i !== idx) };
      });
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Sản phẩm & Dịch vụ (Products & Services)</h2>
            <button
              type="button"
              onClick={() => setBfDraft((prev) => (prev ? { ...prev, products: [...prev.products, { name: '', category: '', description: '' }] } : prev))}
              style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', cursor: 'pointer' }}
            >
              + Thêm sản phẩm/dịch vụ
            </button>
          </div>
          {bfDraft.products.length === 0 ? (
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8' }}>Chưa có sản phẩm/dịch vụ nào.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {bfDraft.products.map((p, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr auto', gap: '6px', alignItems: 'center', background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                  <input placeholder="Tên sản phẩm" value={p.name} onChange={(e) => updateProduct(idx, 'name', e.target.value)} style={INPUT_STYLE} />
                  <input placeholder="Phân loại" value={p.category} onChange={(e) => updateProduct(idx, 'category', e.target.value)} style={INPUT_STYLE} />
                  <input placeholder="Mô tả" value={p.description} onChange={(e) => updateProduct(idx, 'description', e.target.value)} style={INPUT_STYLE} />
                  <button
                    type="button"
                    onClick={() => removeProduct(idx)}
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={C.card}>
          <div style={C.cardHeader}>
            <h2 style={C.h2}>Thị trường & Khách hàng (Markets & Customers)</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Thị trường hoạt động</span>
              <ChipListEditor
                items={bfDraft.markets}
                onChange={(next) => setBfDraft((prev) => (prev ? { ...prev, markets: next } : prev))}
                placeholder="VD: Việt Nam, Singapore..."
              />
            </div>
            <div>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Khách hàng mục tiêu</span>
              <ChipListEditor
                items={bfDraft.targetCustomers}
                onChange={(next) => setBfDraft((prev) => (prev ? { ...prev, targetCustomers: next } : prev))}
                placeholder="VD: Ngân hàng, Bảo hiểm..."
              />
            </div>
          </div>
        </section>

        <SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveBusinessFields} />
      </div>
    );
  };

  const renderBusinessFields = () => {
    const editingThis = editable && editing === 'business-fields' && bfDraft;
    const toolbar = editable && !editingThis
      ? (
        <TabToolbar
          title="Lĩnh vực & Hoạt động Kinh doanh"
          subtitle="Sản phẩm & dịch vụ, thị trường hoạt động và khách hàng mục tiêu."
          onEdit={() => startEditing('business-fields')}
        />
      )
      : null;
    return (
      <div>
        {toolbar}
        {editingThis ? renderBusinessFieldsForm() : renderBusinessFieldsView()}
      </div>
    );
  };

  /* ── Ban lãnh đạo (Board / Leadership) ────────────────────────── */
  const renderBoardView = () => {
    const members = profile.companyMembers || [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {members.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Backend chưa có dữ liệu cho mục này.</p>
          </div>
        ) : (
          members.map((member, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
              <Avatar name={member.fullName ?? member.name} imageUrl={member.imageUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ fontSize: '0.76rem', color: '#0F172A', display: 'block' }}>
                  {member.fullName || member.name || 'Chưa có tên'}
                </strong>
                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{member.position || member.role || 'Chưa có chức vụ'}</span>
              </div>
              {member.notes && <span style={{ fontSize: '0.64rem', color: '#94A3B8', textAlign: 'right' }}>{member.notes}</span>}
            </div>
          ))
        )}
      </div>
    );
  };

  const renderBoardForm = () => {
    if (!boardDraft) return null;
    const updateMember = (idx: number, field: keyof BoardDraftMember, value: string) => {
      setBoardDraft((prev) => (prev ? prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)) : prev));
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {boardDraft.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#94A3B8' }}>Chưa có thành viên ban lãnh đạo. Nhấn "+ Thêm lãnh đạo" để bắt đầu.</p>
          </div>
        )}
        {boardDraft.map((member, idx) => (
          <div key={idx} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px' }}>
            {editingMember === idx ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={C.fieldGrid}>
                  <FormField label="Họ tên (Full Name)">
                    <input value={member.fullName} onChange={(e) => updateMember(idx, 'fullName', e.target.value)} style={INPUT_STYLE} />
                  </FormField>
                  <FormField label="Chức vụ (Position)">
                    <input value={member.position} onChange={(e) => updateMember(idx, 'position', e.target.value)} style={INPUT_STYLE} />
                  </FormField>
                </div>
                <FormField label="URL Ảnh đại diện (Avatar)">
                  <input value={member.imageUrl} onChange={(e) => updateMember(idx, 'imageUrl', e.target.value)} placeholder="https://..." style={INPUT_STYLE} />
                </FormField>
                <FormField label="Ghi chú (Notes)">
                  <input value={member.notes} onChange={(e) => updateMember(idx, 'notes', e.target.value)} style={INPUT_STYLE} />
                </FormField>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                  <button type="button" onClick={() => setEditingMember(null)} style={GHOST_BUTTON}>Hủy</button>
                  <button type="button" onClick={() => setEditingMember(null)} style={PRIMARY_BUTTON}>Lưu thành viên</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Avatar name={member.fullName} imageUrl={member.imageUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: '0.76rem', color: '#0F172A', display: 'block' }}>{member.fullName || 'Chưa có tên'}</strong>
                  <span style={{ fontSize: '0.68rem', color: '#64748B' }}>{member.position || 'Chưa có chức vụ'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingMember(idx)}
                  style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Sửa
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBoardDraft((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
                    setEditingMember(null);
                  }}
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.68rem', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
        <div>
          <button
            type="button"
            onClick={() => {
              setBoardDraft((prev) => (prev ? [...prev, { fullName: '', position: '', imageUrl: '', notes: '' }] : [{ fullName: '', position: '', imageUrl: '', notes: '' }]));
              setEditingMember(boardDraft.length);
            }}
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.68rem', fontWeight: 600, padding: '4px 12px', borderRadius: '6px', cursor: 'pointer' }}
          >
            + Thêm lãnh đạo
          </button>
        </div>
        <SaveBar saving={saving} msg={msg} onCancel={cancelAll} onSave={saveBoard} />
      </div>
    );
  };

  const renderBoard = () => {
    if (boardOverride) {
      return <div style={{ padding: '4px 0' }}>{boardOverride}</div>;
    }
    const editingThis = editable && editing === 'board' && boardDraft;
    const toolbar = editable && !editingThis
      ? (
        <TabToolbar
          title="Ban lãnh đạo"
          subtitle="Họ tên, chức vụ và vai trò của ban lãnh đạo công ty chủ quản."
          onEdit={() => startEditing('board')}
        />
      )
      : null;
    return (
      <div>
        {toolbar}
        {editingThis ? renderBoardForm() : renderBoardView()}
      </div>
    );
  };

  switch (activeTab) {
    case 'overview':
      return renderOverview();
    case 'swot':
      return renderSwot();
    case 'business-fields':
      return renderBusinessFields();
    case 'board':
      return renderBoard();
    default:
      return null;
  }
};
