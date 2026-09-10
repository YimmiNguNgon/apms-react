import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api, type PageResponse } from '../services/api';
import { companyProfileApi } from '../API/companyProfileApi';
import { useUser, ROLES } from '../context/UserContext';
import type { Role } from '../context/UserContext';
import type { ProfileResponse, ProfileSourcesResponse, OwnerCompanyIntelligenceResponse, ProjectResponse, UpdateCompanyProfileRequest, CompanyProfileMember } from '../types/domain';
import { CompanyRelationshipClosenessPanel } from '../components/CompanyRelationshipClosenessPanel';
import {
  ListingTabBar,
  type ListingTabId,
} from './companyDetail/ListingTabs';
import BoardMembersTab from './companyDetail/BoardMembersTab';
import FinancialsTab from './companyDetail/FinancialsTab';
import NewsTab from './companyDetail/NewsTab';
import DocumentsTab from './companyDetail/DocumentsTab';
import ConfidentialNewsTab from './companyDetail/ConfidentialNewsTab';
import { ExternalLink, HelpCircle, AlertCircle, Info, Sparkles, ArrowLeft, History, Edit3, Plus, Trash2 } from 'lucide-react';
import { ProfileVersionHistoryModal } from '../components/profile/ProfileVersionHistoryModal';

interface CompanyDetailProps {
  companyId?: string;
  setActivePage?: (page: string) => void;
  isOwnerProfile?: boolean;
  isDrawerMode?: boolean;
}

const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return 'Chưa có tên công ty';
};

/* ── Compact layout & design-token helpers (Overview tab) ────────── */
const C = {
  page: {
    background: '#F8FAFC',
    minHeight: '100vh',
    padding: '8px 16px 16px',
    color: '#0F172A',
    fontFamily: 'Inter, system-ui, sans-serif',
  } as const,
  container: { maxWidth: '1440px', margin: '0 auto' } as const,
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '8px 12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
  } as const,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    marginBottom: '6px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '4px',
  } as const,
  h2: { margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' } as const,
  h3: { margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' } as const,
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' } as const,
  fieldCell: {
    background: '#F8FAFC',
    padding: '5px 8px',
    borderRadius: '6px',
    border: '1px solid #F1F5F9',
    minWidth: 0,
  } as const,
  fieldLabel: {
    fontSize: '0.62rem',
    color: '#64748B',
    fontWeight: 500,
    display: 'block',
    marginBottom: '2px',
  } as const,
  value: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#0F172A',
    wordBreak: 'break-word' as const,
  } as const,
  muted: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#94A3B8',
    wordBreak: 'break-word' as const,
  } as const,
};

const inlineInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.72rem',
  color: '#0F172A',
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

const normalizeString = (val: string | null | undefined): string => {
  if (val == null) return '';
  return val.trim();
};

const normalizeNumber = (val: number | string | null | undefined): number | null => {
  if (val == null) return null;
  if (typeof val === 'number') {
    return isNaN(val) ? null : val;
  }
  const trimmed = val.trim();
  if (trimmed === '') return null;
  const parsed = parseInt(trimmed, 10);
  return isNaN(parsed) ? null : parsed;
};

const areStringListsEqual = (a: string[], b: string[]): boolean => {
  const normA = (a || []).map((s) => (s ?? '').trim()).filter(Boolean);
  const normB = (b || []).map((s) => (s ?? '').trim()).filter(Boolean);
  if (normA.length !== normB.length) return false;
  for (let i = 0; i < normA.length; i++) {
    if (normA[i] !== normB[i]) return false;
  }
  return true;
};

const areProductsEqual = (
  a: Array<{ name?: string; category?: string; description?: string }>,
  b: Array<{ name?: string; category?: string; description?: string }>
): boolean => {
  const normA = (a || [])
    .map((p) => ({
      name: normalizeString(p.name),
      category: normalizeString(p.category),
      description: normalizeString(p.description),
    }))
    .filter((p) => p.name || p.category || p.description);

  const normB = (b || [])
    .map((p) => ({
      name: normalizeString(p.name),
      category: normalizeString(p.category),
      description: normalizeString(p.description),
    }))
    .filter((p) => p.name || p.category || p.description);

  if (normA.length !== normB.length) return false;
  for (let i = 0; i < normA.length; i++) {
    if (
      normA[i].name !== normB[i].name ||
      normA[i].category !== normB[i].category ||
      normA[i].description !== normB[i].description
    ) {
      return false;
    }
  }
  return true;
};

const areMembersEqual = (
  a: CompanyProfileMember[],
  b: CompanyProfileMember[]
): boolean => {
  const normA = (a || [])
    .map((m) => ({
      fullName: normalizeString(m.fullName),
      position: normalizeString(m.position),
      imageUrl: normalizeString(m.imageUrl),
      sourceUrl: normalizeString(m.sourceUrl),
    }))
    .filter((m) => m.fullName || m.position || m.imageUrl || m.sourceUrl);

  const normB = (b || [])
    .map((m) => ({
      fullName: normalizeString(m.fullName),
      position: normalizeString(m.position),
      imageUrl: normalizeString(m.imageUrl),
      sourceUrl: normalizeString(m.sourceUrl),
    }))
    .filter((m) => m.fullName || m.position || m.imageUrl || m.sourceUrl);

  if (normA.length !== normB.length) return false;
  for (let i = 0; i < normA.length; i++) {
    if (
      normA[i].fullName !== normB[i].fullName ||
      normA[i].position !== normB[i].position ||
      normA[i].imageUrl !== normB[i].imageUrl ||
      normA[i].sourceUrl !== normB[i].sourceUrl
    ) {
      return false;
    }
  }
  return true;
};

interface FullProfileBaseline {
  // Overview
  tradeName: string;
  legalName: string;
  taxCode: string;
  website: string;
  email: string;
  phone: string;
  employeeCount: number | null;
  employeeTier: string;
  address: string;
  // Business
  industries: string[];
  markets: string[];
  targetCustomers: string[];
  products: Array<{ name: string; category?: string; description?: string }>;
  businessModel: string;
  // Leadership
  members: CompanyProfileMember[];
  // Concurrency
  majorVersion: number;
  revision: number;
}

const CompactTagEditor: React.FC<{
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  tagBg: string;
  tagColor: string;
  disabled?: boolean;
}> = ({ tags, onChange, placeholder = 'Add new...', tagBg, tagColor, disabled }) => {
  const [inputVal, setInputVal] = useState('');

  const handleAdd = () => {
    const val = inputVal.trim();
    if (!val) return;
    onChange([...tags, val]);
    setInputVal('');
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
        {tags.map((tag, idx) => (
          <span
            key={idx}
            style={{
              fontSize: '0.7rem',
              background: tagBg,
              color: tagColor,
              padding: '2px 6px 2px 8px',
              borderRadius: '4px',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: tagColor,
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '0.75rem',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: 0.7,
                }}
                title="Remove"
              >
                ✕
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div style={{ display: 'flex', gap: '4px', maxWidth: '320px', marginTop: tags.length > 0 ? '4px' : '0' }}>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder={placeholder}
            style={{
              flex: 1,
              padding: '3px 8px',
              fontSize: '0.7rem',
              border: '1px solid #CBD5E1',
              borderRadius: '4px',
              outline: 'none',
              background: '#FFFFFF',
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inputVal.trim()}
            style={{
              background: inputVal.trim() ? '#2563EB' : '#E2E8F0',
              color: inputVal.trim() ? '#FFFFFF' : '#94A3B8',
              border: 'none',
              borderRadius: '4px',
              padding: '3px 8px',
              fontSize: '0.68rem',
              fontWeight: 600,
              cursor: inputVal.trim() ? 'pointer' : 'default',
            }}
          >
            + Add
          </button>
        </div>
      )}
    </div>
  );
};

export type CompanyDetailSource =
  | 'project'
  | 'company-profiles'
  | 'monitoring'
  | 'my-companies'
  | 'staff-monitoring';

interface NavContext {
  source: CompanyDetailSource;
  projectId: number | null;
  companyId: string | null;
}

const parseNavContext = (propCompanyId?: string): NavContext => {
  let sourceParam: string | null = null;
  let projectIdParam: string | null = null;
  let companyIdParam: string | null = null;

  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    const qIndex = hash.indexOf('?');
    const searchStr = qIndex !== -1 ? hash.slice(qIndex) : window.location.search;
    if (searchStr) {
      const params = new URLSearchParams(searchStr);
      sourceParam = params.get('source');
      projectIdParam = params.get('projectId');
      companyIdParam = params.get('companyId') || params.get('profileId');
    }
  }

  let source: CompanyDetailSource = 'company-profiles';
  let projectId: number | null = null;

  if (sourceParam === 'project' && projectIdParam) {
    const parsedPid = parseInt(projectIdParam, 10);
    if (!Number.isNaN(parsedPid) && parsedPid > 0) {
      source = 'project';
      projectId = parsedPid;
    }
  } else if (sourceParam === 'monitoring' || sourceParam === 'company-monitoring') {
    source = 'monitoring';
  } else if (sourceParam === 'staff-monitoring') {
    source = 'staff-monitoring';
  } else if (sourceParam === 'my-companies') {
    source = 'my-companies';
  } else {
    source = 'company-profiles';
  }

  const effectiveCompanyId = propCompanyId || companyIdParam || (typeof window !== 'undefined' ? localStorage.getItem('apms-selected-company') : null) || null;

  return {
    source,
    projectId,
    companyId: effectiveCompanyId,
  };
};

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ companyId, setActivePage, isOwnerProfile, isDrawerMode }) => {
  const { t } = useTranslation('company-list');
  const { currentUser } = useUser();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [sources, setSources] = useState<ProfileSourcesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [listingEditing, setListingEditing] = useState(false);
  const [tickerDraft, setTickerDraft] = useState('');
  const [exchangeDraft, setExchangeDraft] = useState('NONE');
  const [listingSaving, setListingSaving] = useState(false);
  const [listingMsg, setListingMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');
  const [intelligence, setIntelligence] = useState<OwnerCompanyIntelligenceResponse | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false);

  // Inline editing states across Overview, Business Fields, and Leadership
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  // Overview draft
  const [draftTradeName, setDraftTradeName] = useState('');
  const [draftLegalName, setDraftLegalName] = useState('');
  const [draftTaxCode, setDraftTaxCode] = useState('');
  const [draftWebsite, setDraftWebsite] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [draftEmployeeCount, setDraftEmployeeCount] = useState('');
  const [draftEmployeeTier, setDraftEmployeeTier] = useState('');
  const [draftAddress, setDraftAddress] = useState('');
  // Business Fields draft
  const [draftIndustries, setDraftIndustries] = useState<string[]>([]);
  const [draftMarkets, setDraftMarkets] = useState<string[]>([]);
  const [draftTargetCustomers, setDraftTargetCustomers] = useState<string[]>([]);
  const [draftProducts, setDraftProducts] = useState<Array<{ name: string; category?: string; description?: string }>>([]);
  const [draftBusinessModel, setDraftBusinessModel] = useState('');
  // Leadership draft
  const [draftMembers, setDraftMembers] = useState<CompanyProfileMember[]>([]);
  // Baseline & concurrency
  const [editBaseline, setEditBaseline] = useState<FullProfileBaseline | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);

  const handleAddProduct = () => {
    setDraftProducts((prev) => [...prev, { name: '', category: '', description: '' }]);
  };

  const handleProductChange = (index: number, field: 'name' | 'category' | 'description', value: string) => {
    setDraftProducts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteProduct = (index: number) => {
    setDraftProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddMember = () => {
    setDraftMembers((prev) => [...prev, { fullName: '', position: '', imageUrl: '', sourceUrl: '' }]);
  };

  const handleUpdateMember = (index: number, field: keyof CompanyProfileMember, value: string) => {
    setDraftMembers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleDeleteMember = (index: number) => {
    setDraftMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const [navContext, setNavContext] = useState<NavContext>(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apms-context-project');
    }
    return parseNavContext(companyId);
  });

  useEffect(() => {
    const handleNavChange = () => {
      setNavContext(parseNavContext(companyId));
    };
    handleNavChange();
    window.addEventListener('hashchange', handleNavChange);
    window.addEventListener('popstate', handleNavChange);
    return () => {
      window.removeEventListener('hashchange', handleNavChange);
      window.removeEventListener('popstate', handleNavChange);
    };
  }, [companyId]);

  const contextProjectId = navContext.source === 'project' ? navContext.projectId : null;

  const canEditListing =
    !!currentUser &&
    ([ROLES.OWNER, ROLES.ADMIN, ROLES.MANAGER] as Role[]).includes(currentUser.role);

  const [localStorageId, setLocalStorageId] = useState(() => localStorage.getItem('apms-selected-company') ?? '');
  const resolvedId = companyId ?? navContext.companyId ?? localStorageId;

  useEffect(() => {
    const handleCompanyChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ companyProfileId: string }>;
      if (customEvent.detail?.companyProfileId) {
        setLocalStorageId(customEvent.detail.companyProfileId);
      }
    };
    
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'apms-selected-company' && event.newValue) {
        setLocalStorageId(event.newValue);
      }
    };

    const handleProfileUpdated = () => {
      // Force re-fetch by triggering some state change, or we can just fetch it here.
      // But we can also just toggle a reload trigger state. Let's create one.
      setReloadTrigger(prev => prev + 1);
    };

    window.addEventListener('apms-company-selection-changed', handleCompanyChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('apms-profile-updated', handleProfileUpdated);
    
    return () => {
      window.removeEventListener('apms-company-selection-changed', handleCompanyChange);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apms-profile-updated', handleProfileUpdated);
    };
  }, []);

  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [showAllProducts, setShowAllProducts] = useState(false);

  useEffect(() => {
    if (!resolvedId) {
      setLoading(false);
      setError('Chưa chọn hồ sơ doanh nghiệp.');
      return;
    }

    const controller = new AbortController();

    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const [profileRes, sourcesRes] = await Promise.all([
          api.get<ProfileResponse>(`/profiles/${resolvedId}`, { signal: controller.signal }),
          api.get<ProfileSourcesResponse>(`/profiles/${resolvedId}/sources`, { signal: controller.signal }).catch(() => null),
        ]);

        let intelRes = null;
        if (currentUser?.role === ROLES.OWNER) {
          try {
            intelRes = await api.get<OwnerCompanyIntelligenceResponse>(`/owner/company-intelligence/${resolvedId}`, { signal: controller.signal });
          } catch (err) {
            console.error('Failed to load company intelligence data:', err);
          }
        }

        let projectsRes = null;
        let singleContextProject: ProjectResponse | null = null;
        try {
          const promises: [Promise<any>, Promise<any>?] = [
            api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 100 }, signal: controller.signal }),
          ];
          if (contextProjectId) {
            promises.push(
              api.get<ProjectResponse>(`/projects/${contextProjectId}`, { signal: controller.signal }).catch(() => null)
            );
          }
          const [pListRes, pSingleRes] = await Promise.all(promises);
          projectsRes = pListRes;
          if (pSingleRes?.data) {
            singleContextProject = pSingleRes.data;
          }
        } catch (err) {
          console.error('Failed to load projects:', err);
        }

        if (controller.signal.aborted) return;
        setProfile(profileRes.data ?? null);
        setSources(sourcesRes?.data ?? null);
        setIntelligence(intelRes?.data ?? null);
        const listProjects = projectsRes?.data?.content ?? [];
        if (singleContextProject && !listProjects.some((p: ProjectResponse) => p.id === singleContextProject?.id)) {
          setProjects([singleContextProject, ...listProjects]);
        } else {
          setProjects(listProjects);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setProfile(null);
          setSources(null);
          setIntelligence(null);
          setProjects([]);
          setError(err instanceof Error ? err.message : 'Không thể tải thông tin hồ sơ doanh nghiệp.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => {
      controller.abort();
    };
  }, [resolvedId, currentUser, reloadTrigger]);

  const tradeName = profile?.identity?.tradeName;
  const legalName = profile?.identity?.legalName;
  const displayName = formatCompanyName(tradeName || legalName);
  const initials = displayName.substring(0, 2).toUpperCase();

  const handleExportPdf = () => {
    alert(`Đang khởi tạo tải báo cáo PDF hồ sơ doanh nghiệp [${displayName}]...`);
  };

  const ticker = profile?.stockTicker?.trim() || '';
  const exchange = profile?.stockExchange || 'NONE';
  const exchangeLabel = (ex?: string) => (ex && ex !== 'NONE' ? ex : 'Chưa niêm yết');
  const relationshipClosenessProfileId = profile?.id || resolvedId;

  const startListingEdit = () => {
    setTickerDraft(ticker);
    setExchangeDraft(exchange);
    setListingMsg(null);
    setListingEditing(true);
  };

  const handleSaveListing = async () => {
    setListingSaving(true);
    setListingMsg(null);
    try {
      const res = await api.patch<ProfileResponse>(
        `/company-profiles/${resolvedId}/listing-info`,
        {
          stockTicker: tickerDraft.trim().toUpperCase(),
          stockExchange: exchangeDraft,
        },
      );
      if (res?.data) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                stockTicker: res.data!.stockTicker,
                stockExchange: res.data!.stockExchange,
              }
            : prev,
        );
        setListingEditing(false);
        setListingMsg({ ok: true, text: 'Đã lưu thông tin niêm yết thành công.' });
      }
    } catch (err) {
      setListingMsg({
        ok: false,
        text: err instanceof Error ? err.message : 'Lưu thông tin niêm yết thất bại.',
      });
    } finally {
      setListingSaving(false);
    }
  };


  const canManageVisibility = Boolean(
    profile?.canManageVisibility ??
    (currentUser && (
      currentUser.role === ROLES.ADMIN ||
      (currentUser.role === ROLES.MANAGER && profile?.responsibleManagerId != null && profile.responsibleManagerId === currentUser.id)
    ))
  );

  const handleToggleVisibility = async () => {
    const targetId = profile?.companyId || profile?.id;
    if (!targetId) return;
    setTogglingVisibility(true);
    const isCurrentlyHidden = profile.isHidden === true || (profile.isHidden === undefined && profile.visibility === 'HIDDEN');
    const newVisibility = isCurrentlyHidden ? 'PUBLISHED' : 'HIDDEN';
    try {
      const response = await companyProfileApi.updateProfileVisibility(targetId, newVisibility);
      const data = (response as any)?.data ?? response;
      const updatedIsHidden = typeof data?.isHidden === 'boolean'
        ? data.isHidden
        : (data?.visibility ? data.visibility === 'HIDDEN' : (newVisibility === 'HIDDEN'));
      setProfile(current => current ? { 
        ...current, 
        isHidden: updatedIsHidden,
        visibility: updatedIsHidden ? 'HIDDEN' : 'PUBLISHED' 
      } : current);
    } catch (err) {
      console.error('Failed to toggle visibility', err);
      alert(err instanceof Error ? err.message : 'Failed to toggle visibility');
    } finally {
      setTogglingVisibility(false);
    }
  };

  const handleStartEdit = () => {
    if (!profile) return;
    // Stay on current tab if already on an editable tab, else default to overview
    if (activeTab !== 'overview' && activeTab !== 'business-fields' && activeTab !== 'board') {
      setActiveTab('overview');
    }

    const major = profile.majorVersion ?? (profile.version ? parseInt(profile.version.split('.')[0].replace(/\D/g, ''), 10) || 1 : 1);
    const rev = profile.revision ?? (profile.version && profile.version.includes('.') ? parseInt(profile.version.split('.')[1], 10) || 0 : 0);

    const initialTradeName = profile.identity?.tradeName || '';
    const initialLegalName = profile.identity?.legalName || '';
    const initialTaxCode = profile.identity?.taxCode || '';
    const initialWebsite = profile.contact?.website || '';
    const initialEmail = profile.contact?.emails?.[0] || '';
    const initialPhone = profile.contact?.phones?.[0] || '';
    const initialEmpCount = profile.companySize?.employeeCount != null ? profile.companySize.employeeCount : null;
    const initialEmpTier = profile.companySize?.employeeTier || '';
    const initialAddress = profile.contact?.addresses?.[0]?.fullAddress || '';

    const initialIndustries = [...(profile.business?.industries || intelligence?.company?.industries || [])];
    const initialMarkets = [...(profile.business?.markets || intelligence?.company?.markets || [])];
    const initialTargetCustomers = [...(profile.business?.targetCustomers || [])];
    const initialProducts: Array<{ name: string; category?: string; description?: string }> = (
      profile.business?.products || intelligence?.products || []
    ).map((p: any) => ({
      name: typeof p === 'string' ? p : (p.name || ''),
      category: typeof p === 'object' && p.category ? p.category : '',
      description: typeof p === 'object' && p.description ? p.description : '',
    }));
    const initialBusinessModel = profile.business?.businessModel || intelligence?.company?.businessModel || '';

    const initialMembers: CompanyProfileMember[] = (profile.companyMembers || []).map(m => ({
      fullName: m.fullName || m.name || '',
      position: m.position || '',
      imageUrl: m.imageUrl || '',
      sourceUrl: m.sourceUrl || '',
    }));

    setDraftTradeName(initialTradeName);
    setDraftLegalName(initialLegalName);
    setDraftTaxCode(initialTaxCode);
    setDraftWebsite(initialWebsite);
    setDraftEmail(initialEmail);
    setDraftPhone(initialPhone);
    setDraftEmployeeCount(initialEmpCount != null ? String(initialEmpCount) : '');
    setDraftEmployeeTier(initialEmpTier);
    setDraftAddress(initialAddress);

    setDraftIndustries(initialIndustries);
    setDraftMarkets(initialMarkets);
    setDraftTargetCustomers(initialTargetCustomers);
    setDraftProducts(initialProducts);
    setDraftBusinessModel(initialBusinessModel);

    setDraftMembers(initialMembers);

    setEditBaseline({
      tradeName: initialTradeName,
      legalName: initialLegalName,
      taxCode: initialTaxCode,
      website: initialWebsite,
      email: initialEmail,
      phone: initialPhone,
      employeeCount: initialEmpCount,
      employeeTier: initialEmpTier,
      address: initialAddress,
      industries: initialIndustries,
      markets: initialMarkets,
      targetCustomers: initialTargetCustomers,
      products: initialProducts,
      businessModel: initialBusinessModel,
      members: initialMembers,
      majorVersion: major,
      revision: rev,
    });

    setSaveProfileError(null);
    setIsInlineEditing(true);
  };

  const handleCancelEdit = () => {
    setIsInlineEditing(false);
    setEditBaseline(null);
    setSaveProfileError(null);
  };

  const hasSemanticChanges = useMemo(() => {
    if (!isInlineEditing || !editBaseline) return false;
    return (
      normalizeString(draftTradeName) !== normalizeString(editBaseline.tradeName) ||
      normalizeString(draftLegalName) !== normalizeString(editBaseline.legalName) ||
      normalizeString(draftTaxCode) !== normalizeString(editBaseline.taxCode) ||
      normalizeString(draftWebsite) !== normalizeString(editBaseline.website) ||
      normalizeString(draftEmail) !== normalizeString(editBaseline.email) ||
      normalizeString(draftPhone) !== normalizeString(editBaseline.phone) ||
      normalizeNumber(draftEmployeeCount) !== normalizeNumber(editBaseline.employeeCount) ||
      normalizeString(draftEmployeeTier) !== normalizeString(editBaseline.employeeTier) ||
      normalizeString(draftAddress) !== normalizeString(editBaseline.address) ||
      normalizeString(draftBusinessModel) !== normalizeString(editBaseline.businessModel) ||
      !areStringListsEqual(draftIndustries, editBaseline.industries) ||
      !areStringListsEqual(draftMarkets, editBaseline.markets) ||
      !areStringListsEqual(draftTargetCustomers, editBaseline.targetCustomers) ||
      !areProductsEqual(draftProducts, editBaseline.products) ||
      !areMembersEqual(draftMembers, editBaseline.members)
    );
  }, [
    isInlineEditing,
    editBaseline,
    draftTradeName,
    draftLegalName,
    draftTaxCode,
    draftWebsite,
    draftEmail,
    draftPhone,
    draftEmployeeCount,
    draftEmployeeTier,
    draftAddress,
    draftBusinessModel,
    draftIndustries,
    draftMarkets,
    draftTargetCustomers,
    draftProducts,
    draftMembers,
  ]);

  const handleSaveProfile = async () => {
    if (!profile || !editBaseline) return;
    setIsSavingProfile(true);
    setSaveProfileError(null);

    const targetId = profile.companyId || profile.id;
    const parsedCount = normalizeNumber(draftEmployeeCount);

    const validProducts = draftProducts
      .map(p => ({
        name: normalizeString(p.name),
        category: normalizeString(p.category) || undefined,
        description: normalizeString(p.description) || undefined,
      }))
      .filter(p => p.name);

    const validMembers: CompanyProfileMember[] = draftMembers
      .map(m => ({
        fullName: normalizeString(m.fullName),
        position: normalizeString(m.position) || undefined,
        imageUrl: normalizeString(m.imageUrl) || undefined,
        sourceUrl: normalizeString(m.sourceUrl) || undefined,
      }))
      .filter(m => m.fullName);

    const payload: UpdateCompanyProfileRequest = {
      tradeName: normalizeString(draftTradeName),
      legalName: normalizeString(draftLegalName),
      taxCode: normalizeString(draftTaxCode),
      website: normalizeString(draftWebsite),
      emails: normalizeString(draftEmail)
        ? [normalizeString(draftEmail), ...(profile.contact?.emails?.slice(1) || [])]
        : ((profile.contact?.emails?.length ?? 0) > 1 ? profile.contact!.emails!.slice(1) : []),
      phones: normalizeString(draftPhone)
        ? [normalizeString(draftPhone), ...(profile.contact?.phones?.slice(1) || [])]
        : ((profile.contact?.phones?.length ?? 0) > 1 ? profile.contact!.phones!.slice(1) : []),
      headOfficeAddress: normalizeString(draftAddress),
      employeeCount: parsedCount !== null ? parsedCount : undefined,
      employeeTier: normalizeString(draftEmployeeTier) || undefined,
      industries: draftIndustries.map(s => s.trim()).filter(Boolean),
      markets: draftMarkets.map(s => s.trim()).filter(Boolean),
      targetCustomers: draftTargetCustomers.map(s => s.trim()).filter(Boolean),
      productsServices: validProducts.map(p => p.name),
      products: validProducts,
      businessModel: normalizeString(draftBusinessModel) || undefined,
      companyMembers: validMembers,
      expectedMajorVersion: editBaseline.majorVersion,
      expectedRevision: editBaseline.revision,
      changeNote: 'Inline edit of company profile',
    };

    try {
      const updated = await companyProfileApi.updateCompanyProfile(targetId, payload);
      if (updated) {
        setProfile(updated);
      }
      setReloadTrigger(prev => prev + 1);
      setIsInlineEditing(false);
      setEditBaseline(null);
    } catch (err: any) {
      console.error('Failed to update company profile inline:', err);
      if (err.status === 409 || err.message?.includes('changed since you opened it')) {
        setSaveProfileError('The company profile has changed since you opened it. Please refresh before saving.');
      } else if (err.status === 403 || err.message?.includes('responsible') || err.message?.includes('permission')) {
        setSaveProfileError(err.message || 'You are not responsible for this company profile.');
      } else {
        setSaveProfileError(err.message || 'Failed to update company profile. Please try again.');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };


  const renderOverviewTab = () => {
    const taxCode = profile?.identity?.taxCode || 'Not updated';
    const regNo = profile?.identity?.registrationNumber || 'Not updated';
    const empCount = profile?.companySize?.employeeCount || intelligence?.company?.employeeCount;
    const empTier = profile?.companySize?.employeeTier;
    const sizeStr = empCount ? `${empCount} personnel ${empTier ? `(${empTier})` : ''}` : (empTier || 'Not updated');
    const website = profile?.contact?.website || intelligence?.company?.website || 'Not updated';
    const email = profile?.contact?.emails?.[0] || 'Not updated';
    const phone = profile?.contact?.phones?.[0] || 'Not updated';
    const address = profile?.contact?.addresses?.[0]?.fullAddress || intelligence?.company?.headquarters || 'Not updated';

    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', alignItems: 'start' }} id="company-detail-2col-grid">
        {/* Main Profile Details Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
          {saveProfileError && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '6px',
              color: '#991B1B',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>{saveProfileError}</span>
              <button
                type="button"
                onClick={() => setSaveProfileError(null)}
                style={{ background: 'none', border: 'none', color: '#991B1B', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                title="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Panel 1: Legal Identity */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Legal & Identity Information</h2>
            </div>
            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Trade Name</span>
                {isInlineEditing ? (
                  <input
                    type="text"
                    style={inlineInputStyle}
                    value={draftTradeName}
                    onChange={(e) => setDraftTradeName(e.target.value)}
                    placeholder="Trade Name"
                    disabled={isSavingProfile}
                  />
                ) : (
                  <strong style={tradeName ? C.value : C.muted}>{tradeName || 'Not updated'}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Legal Name</span>
                {isInlineEditing ? (
                  <input
                    type="text"
                    style={inlineInputStyle}
                    value={draftLegalName}
                    onChange={(e) => setDraftLegalName(e.target.value)}
                    placeholder="Legal Name"
                    disabled={isSavingProfile}
                  />
                ) : (
                  <strong style={legalName ? C.value : C.muted}>{legalName || 'Not updated'}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Tax Code</span>
                {isInlineEditing ? (
                  <input
                    type="text"
                    style={{ ...inlineInputStyle, fontFamily: 'monospace' }}
                    value={draftTaxCode}
                    onChange={(e) => setDraftTaxCode(e.target.value)}
                    placeholder="Tax Code"
                    disabled={isSavingProfile}
                  />
                ) : (
                  <strong style={{ ...(taxCode !== 'Not updated' ? C.value : C.muted), fontFamily: 'monospace' }}>{taxCode}</strong>
                )}
              </div>
            </div>
            
            {/* Ticker & Exchange inside Panel 1 */}

            {/* <div style={{ marginTop: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <h3 style={C.h3}>Thông Tin Niêm Yết</h3>
                {canEditListing && !listingEditing && (
                  <button
                    type="button"
                    onClick={startListingEdit}
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
              {!listingEditing ? (
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
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                  <div>
                    <span style={C.fieldLabel}>Mã Cổ Phiếu</span>
                    <input
                      type="text"
                      value={tickerDraft}
                      disabled={exchangeDraft === 'NONE'}
                      onChange={(event) => setTickerDraft(event.target.value.toUpperCase())}
                      placeholder="VD: FPT"
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontFamily: 'monospace',
                        textTransform: 'uppercase',
                        background: exchangeDraft === 'NONE' ? '#F1F5F9' : '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <span style={C.fieldLabel}>Sàn Giao Dịch</span>
                    <select
                      value={exchangeDraft}
                      onChange={(event) => {
                        const next = event.target.value;
                        setExchangeDraft(next);
                        if (next === 'NONE') setTickerDraft('');
                      }}
                      style={{
                        width: '100%',
                        padding: '4px 8px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        background: '#FFFFFF',
                        color: '#0F172A',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
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
                      onClick={() => void handleSaveListing()}
                      disabled={listingSaving || (exchangeDraft !== 'NONE' && !tickerDraft.trim())}
                      style={{
                        background: '#2563EB',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        opacity: listingSaving || (exchangeDraft !== 'NONE' && !tickerDraft.trim()) ? 0.5 : 1,
                      }}
                    >
                      {listingSaving ? 'Đang lưu...' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setListingEditing(false)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        color: '#334155',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}
              {listingMsg && (
                <div style={{ marginTop: '6px', fontSize: '0.62rem', fontWeight: 500, color: listingMsg.ok ? '#15803D' : '#B91C1C' }}>
                  {listingMsg.text}
                </div>
              )}
            </div> */}
          </section>

          {/* Panel 2: Contact & Headquarters */}
          <section style={C.card}>
            <div style={C.cardHeader}>
              <h2 style={C.h2}>Contact & Size Information</h2>
            </div>
            <div style={C.fieldGrid}>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Website</span>
                {isInlineEditing ? (
                  <input
                    type="text"
                    style={inlineInputStyle}
                    value={draftWebsite}
                    onChange={(e) => setDraftWebsite(e.target.value)}
                    placeholder="Website"
                    disabled={isSavingProfile}
                  />
                ) : (
                  website !== 'Not updated' ? (
                    <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                      {website}
                    </a>
                  ) : (
                    <strong style={C.muted}>{website}</strong>
                  )
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Contact Email</span>
                {isInlineEditing ? (
                  <input
                    type="email"
                    style={inlineInputStyle}
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    placeholder="Contact Email"
                    disabled={isSavingProfile}
                  />
                ) : (
                  <strong style={email !== 'Not updated' ? C.value : C.muted}>{email}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Phone</span>
                {isInlineEditing ? (
                  <input
                    type="text"
                    style={inlineInputStyle}
                    value={draftPhone}
                    onChange={(e) => setDraftPhone(e.target.value)}
                    placeholder="Phone"
                    disabled={isSavingProfile}
                  />
                ) : (
                  <strong style={phone !== 'Not updated' ? C.value : C.muted}>{phone}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Company Size</span>
                {isInlineEditing ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <input
                      type="number"
                      style={inlineInputStyle}
                      value={draftEmployeeCount}
                      onChange={(e) => setDraftEmployeeCount(e.target.value)}
                      placeholder="Count (e.g. 150)"
                      disabled={isSavingProfile}
                      min={0}
                    />
                    <input
                      type="text"
                      style={inlineInputStyle}
                      value={draftEmployeeTier}
                      onChange={(e) => setDraftEmployeeTier(e.target.value)}
                      placeholder="Tier (e.g. 100-500)"
                      disabled={isSavingProfile}
                    />
                  </div>
                ) : (
                  <strong style={sizeStr !== 'Not updated' ? C.value : C.muted}>{sizeStr}</strong>
                )}
              </div>
              <div style={C.fieldCell}>
                <span style={C.fieldLabel}>Head Office Address</span>
                {isInlineEditing ? (
                  <input
                    type="text"
                    style={inlineInputStyle}
                    value={draftAddress}
                    onChange={(e) => setDraftAddress(e.target.value)}
                    placeholder="Head Office Address"
                    disabled={isSavingProfile}
                  />
                ) : (
                  <strong style={address !== 'Not updated' ? C.value : C.muted}>{address}</strong>
                )}
              </div>
            </div>
          </section>

          {/* Panel 3: Description & Summary */}
          {(isInlineEditing || profile?.business?.businessModel || intelligence?.company?.businessModel) && (
            <section style={C.card}>
              <div style={C.cardHeader}>
                <h2 style={C.h2}>Introduction & Business Model</h2>
              </div>
              {isInlineEditing ? (
                <textarea
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '6px 8px',
                    fontSize: '0.74rem',
                    color: '#334155',
                    lineHeight: '1.5',
                    border: '1px solid #CBD5E1',
                    borderRadius: '4px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                  value={draftBusinessModel}
                  onChange={(e) => setDraftBusinessModel(e.target.value)}
                  placeholder="Enter business introduction and model..."
                  disabled={isSavingProfile}
                />
              ) : (
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#334155', lineHeight: '1.5' }}>
                  {profile?.business?.businessModel || intelligence?.company?.businessModel}
                </p>
              )}
            </section>
          )}

          {/* Panel 4: AI Extracted Facts */}
          {intelligence && (
            <section style={{ ...C.card, background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)', border: '1px solid #BFDBFE' }}>
              <div style={C.cardHeader}>
                <h2 style={{ ...C.h2, color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={13} style={{ color: '#2563EB' }} />
                  <span>AI Extracted Facts</span>
                </h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.72rem' }}>
                {intelligence.executiveBrief?.summary && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>AI Summary: </span>
                    <span style={{ color: '#1E293B' }}>{intelligence.executiveBrief.summary}</span>
                  </div>
                )}
                {intelligence.metadata?.dataQuality && (
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Data Reliability: </span>
                    <span style={{ color: '#15803D', fontWeight: 700 }}>{intelligence.metadata.dataQuality}</span>
                  </div>
                )}
              </div>
            </section>
          )}
          {/* Partner Relationship Closeness Panel */}
          {!isOwnerProfile && profile?.relationshipType?.toUpperCase() === 'PARTNER' && (
            <CompanyRelationshipClosenessPanel
              companyProfileId={relationshipClosenessProfileId}
              currentUserRole={currentUser?.role}
            />
          )}
        </div>
      </div>
    );
  };

  const renderSwotTab = () => {
    const swot = profile?.insights || {};
    const strengths = swot.strengths || [];
    const weaknesses = swot.weaknesses || [];
    const opportunities = swot.opportunities || [];
    const threats = swot.threats || [];

    const hasSwot = strengths.length > 0 || weaknesses.length > 0 || opportunities.length > 0 || threats.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  {threats.map((t, idx) => <li key={idx}>{t}</li>)}
                </ul>
              ) : <p style={{ margin: 0, fontSize: '0.74rem' }}>{t('swot.noThreats')}</p>}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBusinessFieldsTab = () => {
    const products = profile?.business?.products || intelligence?.products || [];
    const industries = profile?.business?.industries || intelligence?.company?.industries || [];
    const markets = profile?.business?.markets || intelligence?.company?.markets || [];
    const targetCustomers = profile?.business?.targetCustomers || [];

    const hasData = products.length > 0 || industries.length > 0 || markets.length > 0 || targetCustomers.length > 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!isInlineEditing && !hasData ? (
          <div style={{ padding: '32px', textAlign: 'center', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px' }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>No business field data available.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'start' }}>
            {/* Products & Services Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <section style={C.card}>
                <div style={{ ...C.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={C.h2}>Products & Services</h2>
                  {isInlineEditing && (
                    <button
                      type="button"
                      onClick={handleAddProduct}
                      disabled={isSavingProfile}
                      style={{
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={11} />
                      Add Product / Service
                    </button>
                  )}
                </div>

                {isInlineEditing ? (
                  draftProducts.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {draftProducts.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            background: '#F8FAFC',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                              Product #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(idx)}
                              disabled={isSavingProfile}
                              title="Delete Product"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.68rem',
                              }}
                            >
                              <Trash2 size={12} />
                              <span>Delete</span>
                            </button>
                          </div>

                          <div>
                            <label style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                              Name *
                            </label>
                            <input
                              type="text"
                              style={inlineInputStyle}
                              value={p.name}
                              onChange={(e) => handleProductChange(idx, 'name', e.target.value)}
                              placeholder="Product or service name..."
                              disabled={isSavingProfile}
                            />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px' }}>
                            <div>
                              <label style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                Category
                              </label>
                              <input
                                type="text"
                                style={inlineInputStyle}
                                value={p.category || ''}
                                onChange={(e) => handleProductChange(idx, 'category', e.target.value)}
                                placeholder="Category (e.g. Memory / Semiconductor)..."
                                disabled={isSavingProfile}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.64rem', color: '#64748B', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                                Description
                              </label>
                              <textarea
                                style={{
                                  ...inlineInputStyle,
                                  minHeight: '44px',
                                  fontFamily: 'inherit',
                                  resize: 'vertical',
                                }}
                                value={p.description || ''}
                                onChange={(e) => handleProductChange(idx, 'description', e.target.value)}
                                placeholder="Short description..."
                                disabled={isSavingProfile}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '16px', textAlign: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>
                        No product/service recorded. Click <strong>+ Add Product / Service</strong> above to add one.
                      </p>
                    </div>
                  )
                ) : products.length > 0 ? (
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
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748B' }}>No product/service categories recorded.</p>
                )}
              </section>
            </div>

            {/* Industry & Markets Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <section style={C.card}>
                <div style={C.cardHeader}>
                  <h2 style={C.h2}>Industry</h2>
                </div>
                <div>
                  {isInlineEditing ? (
                    <CompactTagEditor
                      tags={draftIndustries}
                      onChange={setDraftIndustries}
                      placeholder="Add industry (e.g. Semiconductor)..."
                      tagBg="#E0E7FF"
                      tagColor="#3730A3"
                      disabled={isSavingProfile}
                    />
                  ) : industries.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {industries.map((ind, idx) => (
                        <span key={idx} style={{ fontSize: '0.7rem', background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                          {ind}
                        </span>
                      ))}
                    </div>
                  ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Not yet updated</span>}
                </div>
              </section>

              <section style={C.card}>
                <div style={C.cardHeader}>
                  <h2 style={C.h2}>Markets & Customers</h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Markets */}
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Active market</span>
                    {isInlineEditing ? (
                      <CompactTagEditor
                        tags={draftMarkets}
                        onChange={setDraftMarkets}
                        placeholder="Add market (e.g. South Korea)..."
                        tagBg="#F1F5F9"
                        tagColor="#334155"
                        disabled={isSavingProfile}
                      />
                    ) : markets.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {markets.map((m, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#F1F5F9', color: '#334155', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {m}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Not yet updated</span>}
                  </div>

                  {/* Customers */}
                  <div>
                    <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '6px' }}>Target customers</span>
                    {isInlineEditing ? (
                      <CompactTagEditor
                        tags={draftTargetCustomers}
                        onChange={setDraftTargetCustomers}
                        placeholder="Add customer group (e.g. AI Server Providers)..."
                        tagBg="#ECFDF5"
                        tagColor="#065F46"
                        disabled={isSavingProfile}
                      />
                    ) : targetCustomers.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {targetCustomers.map((c, idx) => (
                          <span key={idx} style={{ fontSize: '0.7rem', background: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Not yet updated</span>}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    );
  };

  // const renderRelationshipTab = () => {
  //   const relType = intelligence?.relationship?.type || 'Chưa cập nhật';
  //   const impact = intelligence?.relationship?.businessImpact || 'Chưa cập nhật';
  //   const relevance = intelligence?.relationship?.strategicRelevance || 'Chưa cập nhật';
  //   const trend = intelligence?.relationship?.impactTrend || 'STABLE';

  //   const impactColorLocal = (val: string) => {
  //     const u = val.toUpperCase();
  //     if (u === 'CRITICAL' || u === 'HIGH') return '#B91C1C';
  //     if (u === 'MEDIUM') return '#D97706';
  //     if (u === 'LOW') return '#059669';
  //     return '#64748B';
  //   };

  //   const displayTrendLocal = (val: string) => {
  //     const u = val.toUpperCase();
  //     if (u === 'UP' || u === 'INCREASING') return '↑ Tăng trưởng (UP)';
  //     if (u === 'DOWN' || u === 'DECREASING') return '↓ Suy giảm (DOWN)';
  //     return '→ Ổn định (STABLE)';
  //   };

  //   const viRelationshipLocal = (val: string) => {
  //     const u = val.toUpperCase();
  //     if (u.includes('PARTNER')) return 'Đối tác';
  //     if (u.includes('SUPPLIER')) return 'Nhà cung cấp';
  //     if (u.includes('CUSTOMER')) return 'Khách hàng';
  //     if (u.includes('COMPETITOR')) return 'Đối thủ cạnh tranh';
  //     return 'Quan hệ tùy chỉnh';
  //   };

  //   const activeProjects = projects.filter(p => p.targetCompanyProfileId === resolvedId || p.targetCompanyName === displayName);
  //   const signals = intelligence?.timeline || [];

  //   return (
  //     <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', alignItems: 'start' }}>
  //       {/* Left Column */}
  //       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          
  //         {/* Panel 1: Relationship Details */}
  //         <section style={C.card}>
  //           <div style={C.cardHeader}>
  //             <h2 style={C.h2}>Đánh giá Mối quan hệ & Tác động doanh nghiệp</h2>
  //           </div>
            
  //           <div style={C.fieldGrid}>
  //             <div style={C.fieldCell}>
  //               <span style={C.fieldLabel}>Phân loại Quan hệ</span>
  //               <strong style={relType !== 'Chưa cập nhật' ? { ...C.value, color: '#2563EB' } : C.muted}>
  //                 {relType !== 'Chưa cập nhật' ? viRelationshipLocal(relType) : relType}
  //               </strong>
  //             </div>
  //             <div style={C.fieldCell}>
  //               <span style={C.fieldLabel}>Tầm quan trọng chiến lược (Strategic Relevance)</span>
  //               <strong style={{ ...C.value, color: impactColorLocal(relevance) }}>{relevance}</strong>
  //             </div>
  //             <div style={C.fieldCell}>
  //               <span style={C.fieldLabel}>Ảnh hưởng kinh doanh (Business Impact)</span>
  //               <strong style={{ ...C.value, color: impactColorLocal(impact) }}>{impact}</strong>
  //             </div>
  //             <div style={C.fieldCell}>
  //               <span style={C.fieldLabel}>Xu hướng ảnh hưởng (Impact Trend)</span>
  //               <strong style={C.value}>{displayTrendLocal(trend)}</strong>
  //             </div>
  //           </div>

  //           {/* Why It Matters / Executive Brief */}
  //           {intelligence?.executiveBrief && (
  //             <div style={{ marginTop: '10px', borderTop: '1px solid #F1F5F9', paddingTop: '8px' }}>
  //               <h3 style={{ ...C.h3, color: '#1E293B', marginBottom: '6px' }}>Bản tóm lược tầm quan trọng</h3>
  //               {intelligence.executiveBrief.summary && (
  //                 <p style={{ margin: '0 0 6px', fontSize: '0.72rem', color: '#475569', lineHeight: '1.4' }}>
  //                   {intelligence.executiveBrief.summary}
  //                 </p>
  //               )}
  //               {intelligence.executiveBrief.whyItMatters && intelligence.executiveBrief.whyItMatters.length > 0 && (
  //                 <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '0.7rem', color: '#475569', lineHeight: '1.5' }}>
  //                   {intelligence.executiveBrief.whyItMatters.map((item, idx) => (
  //                     <li key={idx}>{item}</li>
  //                   ))}
  //                 </ul>
  //               )}
  //             </div>
  //           )}
  //         </section>

  //         {/* Panel 2: Linked Projects */}
  //         <section style={C.card}>
  //           <div style={C.cardHeader}>
  //             <h2 style={C.h2}>Dự án Hợp tác / Liên kết ({activeProjects.length})</h2>
  //           </div>
  //           {activeProjects.length > 0 ? (
  //             <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
  //               {activeProjects.map((p) => (
  //                 <div key={p.id} style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  //                   <div>
  //                     <strong style={{ fontSize: '0.74rem', color: '#0F172A' }}>{p.projectName}</strong>
  //                     <span style={{ fontSize: '0.62rem', color: '#64748B', display: 'block', marginTop: '2px' }}>Loại: {p.projectType}</span>
  //                   </div>
  //                   <span style={{ fontSize: '0.65rem', background: p.status === 'ACTIVE' ? '#DCFCE7' : '#F1F5F9', color: p.status === 'ACTIVE' ? '#15803D' : '#475569', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
  //                     {p.status}
  //                   </span>
  //                 </div>
  //               ))}
  //             </div>
  //           ) : (
  //             <div style={{ padding: '12px', textAlign: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #E2E8F0' }}>
  //               <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa ghi nhận liên kết dự án nào với đối tác này.</span>
  //             </div>
  //           )}
  //         </section>

  //         {/* Panel 3: Recent Signals */}
  //         <section style={C.card}>
  //           <div style={C.cardHeader}>
  //             <h2 style={C.h2}>Tín hiệu kinh doanh gần đây ({signals.length})</h2>
  //           </div>
  //           {signals.length > 0 ? (
  //             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
  //               {signals.slice(0, 5).map((s, idx) => (
  //                 <div key={idx} style={{ background: '#F8FAFC', padding: '8px 10px', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
  //                   <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
  //                     <strong style={{ fontSize: '0.72rem', color: '#0F172A' }}>{s.summary}</strong>
  //                     {s.impact && (
  //                       <span style={{ fontSize: '0.62rem', color: impactColorLocal(s.impact), fontWeight: 700 }}>
  //                         Impact: {s.impact}
  //                       </span>
  //                     )}
  //                   </div>
  //                   <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.64rem', color: '#64748B', marginTop: '2px' }}>
  //                     <span>Nguồn: {s.source}</span>
  //                     <span>{s.date ? new Date(s.date).toLocaleDateString() : 'Chưa có ngày'}</span>
  //                   </div>
  //                   {s.sourceUrl && (
  //                     <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.64rem', color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '4px' }}>
  //                       <span>Xem nguồn</span>
  //                       <ExternalLink size={10} />
  //                     </a>
  //                   )}
  //                 </div>
  //               ))}
  //             </div>
  //           ) : (
  //             <div style={{ padding: '12px', textAlign: 'center', background: '#F8FAFC', borderRadius: '6px', border: '1px dashed #E2E8F0' }}>
  //               <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Chưa ghi nhận tín hiệu kinh doanh mới.</span>
  //             </div>
  //           )}
  //         </section>
  //       </div>

  //       {/* Right Column */}
  //       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
  //         <CompanyRelationshipClosenessPanel
  //           companyProfileId={relationshipClosenessProfileId}
  //           currentUserRole={currentUser?.role}
  //         />
  //       </div>
  //     </div>
  //   );
  // };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'swot':
        return renderSwotTab();
      case 'business-fields':
        return renderBusinessFieldsTab();
      case 'board':
        return (
          <div style={{ padding: '4px 0' }}>
            <BoardMembersTab
              companyId={resolvedId}
              isInlineEditing={isInlineEditing}
              members={isInlineEditing ? draftMembers : (profile?.companyMembers?.length ? profile.companyMembers : undefined)}
              onAddMember={handleAddMember}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteMember}
              disabled={isSavingProfile}
            />
          </div>
        );
      case 'financials':
        return <div style={{ padding: '4px 0' }}><FinancialsTab companyId={resolvedId} /></div>;
      case 'news':
        return (
          <div style={{ padding: '4px 0' }}>
            <NewsTab companyId={resolvedId} />
          </div>
        );
      case 'internal-news':
        if (currentUser?.role === ROLES.STAFF) return null;
        return (
          <div style={{ padding: '4px 0' }}>
            <ConfidentialNewsTab companyId={resolvedId} userRole={currentUser?.role} currentUserId={currentUser?.id} />
          </div>
        );
      case 'documents':
        if (currentUser?.role === ROLES.STAFF) return null;
        return (
          <div style={{ padding: '4px 0' }}>
            <DocumentsTab companyProfileId={relationshipClosenessProfileId} userRole={currentUser?.role} currentUserId={currentUser?.id} />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#64748B', fontSize: '0.78rem' }}>
          <span>Đang tải thông tin chi tiết hồ sơ doanh nghiệp...</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh', padding: '24px', color: '#0F172A' }}>
        <button
          onClick={() => (setActivePage ? setActivePage('companies') : history.back())}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '6px',
            padding: '4px 10px',
            color: '#334155',
            fontSize: '0.72rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '16px',
          }}
        >
          &larr; Quay lại danh sách doanh nghiệp
        </button>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '24px',
            textAlign: 'center',
            maxWidth: '480px',
            margin: '0 auto',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h2 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', margin: '0 0 6px' }}>
            {error || 'Không tìm thấy hồ sơ doanh nghiệp'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.72rem', margin: 0 }}>
            Hồ sơ có thể chưa được tạo hoặc bạn không có quyền truy cập.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={isDrawerMode ? { fontFamily: 'Inter, system-ui, sans-serif' } : C.page} id="page-company-detail-light">
      <div style={isDrawerMode ? {} : C.container}>
        {!isDrawerMode && (
          <>
            {/* Top Navigation & Breadcrumb */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isOwnerProfile && (
              <>
                <button
                  onClick={() => {
                    if (!setActivePage) {
                      history.back();
                      return;
                    }
                    if (navContext.source === 'project') {
                      setActivePage('project-detail');
                    } else if (navContext.source === 'monitoring') {
                      setActivePage('company-monitoring');
                    } else if (navContext.source === 'staff-monitoring') {
                      setActivePage('staff-monitoring');
                    } else if (navContext.source === 'my-companies') {
                      setActivePage('my-companies');
                    } else if (currentUser?.role === ROLES.STAFF && localStorage.getItem('apms-back-page') !== 'staff-monitoring') {
                      setActivePage('staff-dashboard');
                    } else {
                      setActivePage('companies');
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    color: '#1E293B',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 10px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  }}
                  id="btn-back-to-company-list"
                >
                  <ArrowLeft size={14} />
                  {navContext.source === 'project' 
                    ? 'Back to Project'
                    : navContext.source === 'monitoring'
                      ? 'Back to Monitoring Management'
                      : navContext.source === 'staff-monitoring'
                        ? 'Back to Staff Monitoring'
                        : navContext.source === 'my-companies'
                          ? 'Back to My Companies'
                          : (currentUser?.role === ROLES.STAFF && localStorage.getItem('apms-back-page') !== 'staff-monitoring') 
                            ? 'Back to Dashboard' 
                            : 'Back to Company Profiles'}
                </button>
                <span style={{ color: '#CBD5E1', fontSize: '0.72rem' }}>|</span>
              </>
            )}
            <div style={{ fontSize: '0.68rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {isOwnerProfile ? (
                <>
                  <span>My Enterprise</span>
                  <span>/</span>
                  <strong style={{ color: '#1E293B', fontWeight: 600 }}>{displayName}</strong>
                </>
              ) : (
                <>
                  <span>APMS</span>
                  <span>/</span>
                  <span>
                    {navContext.source === 'project' 
                      ? 'Project' 
                      : 'Company Detail'}
                  </span>
                  <span>/</span>
                  <strong style={{ color: '#1E293B', fontWeight: 600 }}>{displayName}</strong>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main Header Hero Card */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '8px 12px',
            marginBottom: '8px',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          {/* Logo Avatar */}
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '0.85rem',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.18)',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
                {displayName}
              </h1>
              {!isOwnerProfile && (
                <span
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    color: '#1D4ED8',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                >
                  {(() => {
                    const type = profile.relationshipType;
                    if (!type) return 'ENTERPRISE';
                    switch (type.toUpperCase()) {
                      case 'PARTNER_WITH': return 'Partner';
                      case 'COMPETITOR_OF': return 'Competitor';
                      case 'SUPPLIER_OF': return 'Supplier';
                      case 'CUSTOMER_OF': return 'Customer';
                      case 'POTENTIAL_PARTNER_OF': return 'Potential Partner';
                      default: return type.replace(/_/g, ' ');
                    }
                  })()}
                </span>
              )}
              {navContext.source === 'project' && profile.reviewStatus && (
                <span
                  style={{
                    background: profile.reviewStatus === 'UNVERIFIED' ? '#FEF3C7' : '#DCFCE7',
                    border: profile.reviewStatus === 'UNVERIFIED' ? '1px solid #FDE68A' : '1px solid #BBF7D0',
                    color: profile.reviewStatus === 'UNVERIFIED' ? '#B45309' : '#15803D',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.3px',
                  }}
                  title="Verification / Review Status"
                >
                  {profile.reviewStatus}
                </span>
              )}
              {profile && (
                <span
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: '999px',
                    fontFamily: 'monospace',
                  }}
                  title="Official Company Profile Version"
                >
                  {profile.versionLabel || (profile.majorVersion ? `v${profile.majorVersion}.${String(profile.revision ?? 0).padStart(2, '0')}` : (profile.version ? `v${profile.version}` : 'v1.00'))}
                </span>
              )}
              <span style={{ fontSize: '0.65rem', color: '#64748B', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                
                {/* Version History Button */}
                {profile && (
                  <button
                    type="button"
                    onClick={() => setIsVersionHistoryModalOpen(true)}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#334155',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                    title="View Profile Version History"
                  >
                    <History size={12} />
                    Version History
                  </button>
                )}

                {/* Direct Edit / Inline Edit Button for authorized Manager / Admin */}
                {profile && Boolean(profile.canEditProfile) && (
                  !isInlineEditing ? (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      style={{
                        background: '#2563EB',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                      }}
                      title="Directly Edit Official Company Profile"
                    >
                      <Edit3 size={12} />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSavingProfile}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          color: '#475569',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: isSavingProfile ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                        title="Cancel Inline Editing"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile()}
                        disabled={!hasSemanticChanges || isSavingProfile}
                        style={{
                          background: (!hasSemanticChanges || isSavingProfile) ? '#94A3B8' : '#2563EB',
                          border: 'none',
                          color: '#FFFFFF',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: (!hasSemanticChanges || isSavingProfile) ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: (!hasSemanticChanges || isSavingProfile) ? 'none' : '0 1px 2px rgba(37, 99, 235, 0.2)',
                        }}
                        title={!hasSemanticChanges ? 'No changes to save' : 'Save Changes'}
                      >
                        {isSavingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )
                )}

                {(() => {
                  const isHidden = profile.isHidden === true 
                    ? true 
                    : (profile.isHidden === false 
                        ? false 
                        : (profile.isHidden === null 
                            ? false 
                            : (profile.visibility === 'HIDDEN')));
                  const canPublish = profile.canPublish ?? false;
                  const isPublishInteractive = canManageVisibility && canPublish && !togglingVisibility;
                  const isHideInteractive = canManageVisibility && !togglingVisibility;

                  // Render visibility controls only if the current user has management authorization
                  if (!canManageVisibility) {
                    return null;
                  }

                  return (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: togglingVisibility ? 0.6 : 1,
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', color: isHidden ? '#EF4444' : '#16A34A', fontWeight: 600 }}>
                        Visibility: {isHidden ? 'Hidden' : 'Published'}
                      </span>

                      {isHidden ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={isPublishInteractive ? handleToggleVisibility : undefined}
                            disabled={!isPublishInteractive}
                            style={{
                              background: isPublishInteractive ? '#16A34A' : '#E2E8F0',
                              border: 'none',
                              color: isPublishInteractive ? '#FFFFFF' : '#94A3B8',
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              padding: '4px 10px',
                              borderRadius: '6px',
                              cursor: isPublishInteractive ? 'pointer' : 'not-allowed',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: isPublishInteractive ? '0 1px 2px rgba(22, 163, 74, 0.2)' : 'none',
                            }}
                            title={!canPublish ? 'Profile requires Legal Name and Tax Code before it can be published.' : 'Publish Profile'}
                          >
                            Publish Profile
                          </button>
                          {!canPublish && (
                            <span style={{ fontSize: '0.65rem', color: '#64748B', fontStyle: 'italic' }}>
                              (Profile requires Legal Name and Tax Code before it can be published.)
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={isHideInteractive ? handleToggleVisibility : undefined}
                          disabled={!isHideInteractive}
                          style={{
                            background: '#EF4444',
                            border: 'none',
                            color: '#FFFFFF',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '4px 10px',
                            borderRadius: '6px',
                            cursor: isHideInteractive ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(239, 68, 68, 0.2)',
                          }}
                          title="Hide Profile"
                        >
                          Hide Profile
                        </button>
                      )}
                    </div>
                  );
                })()}

                {(() => {
                  const staffAssignmentIdStr = localStorage.getItem('apms-staff-assignment-id');
                  const isFromStaffMonitoring = localStorage.getItem('apms-back-page') === 'staff-monitoring';
                  const showStaffProposeButton = currentUser?.role === ROLES.STAFF && isFromStaffMonitoring && staffAssignmentIdStr;

                  if (!showStaffProposeButton) return null;

                  return (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ marginLeft: '12px' }}
                      onClick={() => {
                        localStorage.setItem('apms-open-review-assignment', staffAssignmentIdStr!);
                        if (setActivePage) {
                          setActivePage('staff-monitoring');
                        }
                      }}
                    >
                      Edit / Propose Update
                    </button>
                  );
                })()}
              </span>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Navigation Tabs */}
      <ListingTabBar activeTab={activeTab} onTabChange={setActiveTab} companyId={resolvedId} userRole={currentUser?.role} isOwnerProfile={isOwnerProfile} isDrawerMode={isDrawerMode} />

        {renderTabContent()}

        {profile && (
          <ProfileVersionHistoryModal
            profile={profile}
            isOpen={isVersionHistoryModalOpen}
            onClose={() => setIsVersionHistoryModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};
