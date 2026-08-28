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

export type EditableListingTab = 'overview' | 'swot' | 'business-fields' | 'board' | 'overview_identity' | 'overview_contact' | 'overview_business';

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
  editButtonLabel?: string;
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

const TabToolbar: React.FC<{ title: string; subtitle?: string; onEdit: () => void; editButtonLabel: string }> = ({ title, subtitle, onEdit, editButtonLabel }) => (
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
      {editButtonLabel}
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
  editButtonLabel = 'Chỉnh sửa',
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
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

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
    if (tab.startsWith('overview')) {
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




  const startFieldEdit = (key: string) => {
    startEditing('overview');
    setEditingField(key);
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    cancelAll();
  };

  const saveFieldEdit = () => {
    saveOverview();
    setEditingField(null);
  };

  const renderOverview = () => {
    const tradeName = profile.identity?.tradeName;
    const legalName = profile.identity?.legalName;
    const taxCode = profile.identity?.taxCode || 'Chưa cập nhật';
    const regNo = profile.identity?.registrationNumber || 'Chưa cập nhật';
    const empCount = profile.companySize?.employeeCount || intelligence?.company?.employeeCount;
    const empTier = profile.companySize?.employeeTier;
    const sizeStr = empCount ? `${empCount} nhân sự ${empTier ? `(${empTier})` : ""}` : (empTier || "Chưa cập nhật");
    const website = profile.contact?.website || intelligence?.company?.website || 'Chưa cập nhật';
    const email = profile.contact?.emails?.[0] || 'Chưa cập nhật';
    const phone = profile.contact?.phones?.[0] || 'Chưa cập nhật';
    const address = profile.contact?.addresses?.[0]?.fullAddress || intelligence?.company?.headquarters || 'Chưa cập nhật';

    const setField = (key: keyof OverviewDraft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setOverviewDraft((prev) => (prev ? { ...prev, [key]: event.target.value } : prev));
    };

    const renderEditableField = (
      key: keyof OverviewDraft,
      label: string,
      currentValue: React.ReactNode,
      hasValue: boolean,
      renderInput: () => React.ReactNode,
      isFullWidth: boolean = false
    ) => {
      const isEditingThis = editingField === key && overviewDraft;
      return (
        <div style={{ ...C.fieldCell, position: 'relative', gridColumn: isFullWidth ? '1 / -1' : 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={C.fieldLabel}>{label}</span>
            {editable && !isEditingThis && (
              <button 
                type="button" 
                onClick={() => startFieldEdit(key)} 
                style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', padding: '2px 8px', borderRadius: '4px' }}>
                {editButtonLabel}
              </button>
            )}
          </div>
          {isEditingThis ? (
            <div style={{ marginTop: '4px' }}>
              {renderInput()}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={cancelFieldEdit} style={{ ...GHOST_BUTTON, padding: '4px 12px', fontSize: '0.75rem', height: 'auto', minHeight: '28px' }}>Hủy</button>
                <button type="button" onClick={saveFieldEdit} disabled={saving} style={{ ...PRIMARY_BUTTON, padding: '4px 12px', fontSize: '0.75rem', height: 'auto', minHeight: '28px' }}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
                {msg && <span style={{ fontSize: '0.66rem', fontWeight: 600, color: msg.ok ? '#15803D' : '#B91C1C', alignSelf: 'center' }}>{msg.text}</span>}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '2px' }}>
              {typeof currentValue === 'string' ? (
                 <strong style={{ ...(hasValue ? C.value : C.muted), whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{currentValue}</strong>
              ) : currentValue}
            </div>
          )}
        </div>
      );
    };

    return (
      <div style={{ display: 'grid', gridTemplateColumns: overviewAside ? '2fr 1fr' : '1fr', gap: '10px', alignItems: 'start' }} id="company-detail-2col-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          <section style={C.card}>
            <div style={C.cardHeader}><h2 style={C.h2}>Thông tin Pháp lý & Định danh Doanh nghiệp</h2></div>
            <div style={C.fieldGrid}>
              {renderEditableField('tradeName', 'Tên Thương Mại (Trade Name)', tradeName || 'Chưa cập nhật', !!tradeName, () => (
                <input value={overviewDraft!.tradeName} onChange={setField('tradeName')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('legalName', 'Tên Pháp Lý (Legal Name)', legalName || 'Chưa cập nhật', !!legalName, () => (
                <input value={overviewDraft!.legalName} onChange={setField('legalName')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('taxCode', 'Mã Số Thuế (Tax Code)', taxCode, taxCode !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.taxCode} onChange={setField('taxCode')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('registrationNumber', 'Số Giấy Đăng Ký KD', regNo, regNo !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.registrationNumber} onChange={setField('registrationNumber')} style={INPUT_STYLE} />
              ))}
            </div>
          </section>

          <section style={C.card}>
            <div style={C.cardHeader}><h2 style={C.h2}>Thông tin Liên hệ & Quy mô</h2></div>
            <div style={C.fieldGrid}>
              {renderEditableField('website', 'Website', website !== 'Chưa cập nhật' ? <a href={website} target="_blank" rel="noreferrer" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}>{website}</a> : <strong style={C.muted}>{website}</strong>, website !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.website} onChange={setField('website')} placeholder="https://..." style={INPUT_STYLE} />
              ))}
              {renderEditableField('email', 'Email liên hệ', email, email !== 'Chưa cập nhật', () => (
                <input type="email" value={overviewDraft!.email} onChange={setField('email')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('phone', 'Điện thoại', phone, phone !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.phone} onChange={setField('phone')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('employeeTier', 'Quy mô nhân sự (Tier)', sizeStr, sizeStr !== 'Chưa cập nhật', () => (
                <select value={overviewDraft!.employeeTier} onChange={setField('employeeTier')} style={INPUT_STYLE}>
                  <option value="">-- Chọn --</option>
                  <option value="1-10 employees">1-10 nhân sự</option>
                  <option value="11-50 employees">11-50 nhân sự</option>
                  <option value="51-200 employees">51-200 nhân sự</option>
                  <option value="201-500 employees">201-500 nhân sự</option>
                  <option value="501-1,000 employees">501-1,000 nhân sự</option>
                  <option value="1,001-5,000 employees">1,001-5,000 nhân sự</option>
                  <option value="5,001-10,000 employees">5,001-10,000 nhân sự</option>
                  <option value="10,000+ employees">10,000+ nhân sự</option>
                </select>
              ))}
              {renderEditableField('employeeCount', 'Số lượng nhân sự (Count)', empCount ? String(empCount) : 'Chưa cập nhật', !!empCount, () => (
                <input type="number" min={1} value={overviewDraft!.employeeCount} onChange={setField('employeeCount')} style={INPUT_STYLE} />
              ))}
              {renderEditableField('address', 'Địa chỉ trụ sở chính', address, address !== 'Chưa cập nhật', () => (
                <input value={overviewDraft!.address} onChange={setField('address')} style={INPUT_STYLE} />
              ), true)}
            </div>
          </section>

          <section style={C.card}>
            <div style={C.cardHeader}><h2 style={C.h2}>Giới thiệu & Mô hình kinh doanh</h2></div>
            <div style={C.fieldGrid}>
              {renderEditableField('industries', 'Ngành nghề', profile.business?.industries && profile.business.industries.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {profile.business.industries.map((ind, i) => <span key={i} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', color: '#334155', fontWeight: 500 }}>{ind}</span>)}
                </div>
              ) : 'Chưa cập nhật', !!profile.business?.industries?.length, () => (
                <input value={overviewDraft!.industries} onChange={setField('industries')} placeholder="VD: Công nghệ, Dịch vụ phần mềm" style={INPUT_STYLE} />
              ), true)}

              {renderEditableField('businessModel', 'Mô hình kinh doanh', profile.business?.businessModel || 'Chưa cập nhật', !!profile.business?.businessModel, () => (
                <textarea rows={4} value={overviewDraft!.businessModel} onChange={setField('businessModel')} style={{ ...INPUT_STYLE, resize: 'vertical', lineHeight: '1.5' }} />
              ), true)}
            </div>
          </section>
        </div>

        {overviewAside && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>{overviewAside}</div>
        )}
      </div>
    );
  };
  /* ―― SWOT ―――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――――― */
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
          editButtonLabel={editButtonLabel}
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
                    {(showAllProducts ? products : products.slice(0, 5)).map((p, idx) => (
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
                    {products.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setShowAllProducts(!showAllProducts)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1D4ED8',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          padding: '4px 0',
                          textAlign: 'left'
                        }}
                      >
                        {showAllProducts ? 'Thu gọn' : `Xem thêm ${products.length - 5} sản phẩm`}
                      </button>
                    )}
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
          editButtonLabel={editButtonLabel}
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
          editButtonLabel={editButtonLabel}
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
