import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, Plus, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { accountApi } from '../API/accountApi';
import { companyMonitoringApi } from '../API/companyMonitoringApi';
import type {
  CompanyMonitoringAssignmentResponse,
  CompanyMonitoringReviewResponse,
  CompanyProfileUpdateProposalResponse,
  MonitoringFrequency,
  ProfileResponse,
  UserSearchResponse
} from '../types/domain';

type MonitoringTab = 'assignments' | 'pending' | 'history';
type MonitoringFormState = {
  companyProfileId: string;
  assignedStaffId: string;
  frequency: MonitoringFrequency;
};
type StaffCandidate = UserSearchResponse & {
  role?: string;
  roleName?: string;
  name?: string;
};
type ProposalBundle = {
  proposal: CompanyProfileUpdateProposalResponse;
  profile: ProfileResponse | null;
  error?: string;
};
type ProposalReviewRow = {
  assignment: CompanyMonitoringAssignmentResponse;
  proposalId: string;
};
type ChangeRow = {
  key: string;
  label: string;
  currentValue: unknown;
  proposedValue: unknown;
  source: string;
};
type MonitoringFieldErrors = {
  company?: string;
  staff?: string;
  frequency?: string;
};

type CompanyMonitoringPageProps = {
  setActivePage?: (page: string, params?: Record<string, string>) => void;
};

const PAGE_SIZE = 10;
const PENDING_PROPOSAL_STATUSES = new Set(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'PENDING']);

const initialForm: MonitoringFormState = {
  companyProfileId: '',
  assignedStaffId: '',
  frequency: 'MONTHLY'
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const profileName = (profile: ProfileResponse) =>
  profile.identity?.legalName || profile.identity?.tradeName || profile.companyId || profile.id;

const isStaffAccount = (user: StaffCandidate) => {
  const values = [
    user.role,
    user.roleName,
    ...(Array.isArray(user.roles) ? user.roles : [])
  ]
    .filter(Boolean)
    .map((value) => String(value).toUpperCase());

  return values.some((value) => value.includes('STAFF'));
};

const statusTone = (status: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'UP_TO_DATE':
      return 'success';
    case 'DUE':
      return 'warning';
    case 'OVERDUE':
      return 'danger';
    case 'PAUSED':
      return 'neutral';
    default:
      return 'info';
  }
};

const proposalTone = (status?: string | null) => {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
    case 'APPLIED':
      return 'success';
    case 'REJECTED':
    case 'CHANGES_REQUESTED':
    case 'REVISION_REQUESTED':
      return 'danger';
    case 'DRAFT':
    case 'SUBMITTED':
    case 'IN_REVIEW':
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
};

const frequencyLabel = (value: MonitoringFrequency) => {
  switch (value) {
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'SEMI_ANNUALLY':
      return 'Semi-annually';
    default:
      return value;
  }
};

const reviewResultLabel = (value?: string | null) => {
  switch (value) {
    case 'NO_CHANGE':
      return 'No Change';
    case 'UPDATE_PROPOSED':
      return 'Update Proposed';
    case 'RELATIONSHIP_CHANGE_PROPOSED':
      return 'Relationship Change Proposed';
    default:
      return value || '-';
  }
};

const reviewResultTone = (value?: string | null) => {
  switch (value) {
    case 'NO_CHANGE':
      return 'success';
    case 'UPDATE_PROPOSED':
    case 'RELATIONSHIP_CHANGE_PROPOSED':
      return 'info';
    default:
      return 'neutral';
  }
};

const proposalStatusLabel = (value?: string | null) => {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const isPendingProposalStatus = (status?: string | null) =>
  PENDING_PROPOSAL_STATUSES.has((status || '').toUpperCase());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => normalizeValue(item)));
  if (isRecord(value)) {
    const sorted = Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }
  return String(value);
};

const flattenRecord = (value: unknown, prefix = ''): Array<[string, unknown]> => {
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(item)) return flattenRecord(item, path);
    return [[path, item]];
  });
};

const getByPath = (value: unknown, path: string): unknown => {
  if (!path) return value;
  return path.split('.').reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, value);
};

const fieldLabel = (path: string) => {
  const labels: Record<string, string> = {
    legalName: 'Legal name',
    tradeName: 'Trade name',
    taxCode: 'Tax code',
    registrationNumber: 'Registration number',
    stockTicker: 'Stock ticker',
    stockExchange: 'Stock exchange',
    foundedDate: 'Founded date',
    website: 'Website',
    emails: 'Email addresses',
    phones: 'Phone numbers',
    addresses: 'Addresses',
    employeeTier: 'Employee tier',
    employeeCount: 'Employee count',
    revenueTier: 'Revenue tier',
    industries: 'Industries',
    businessModel: 'Business model',
    products: 'Products',
    markets: 'Markets',
    targetCustomers: 'Target customers',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    opportunities: 'Opportunities',
    threats: 'Threats',
    companyMembers: 'Company members',
    relationshipType: 'Relationship type',
    charterCapital: 'Charter capital'
  };
  const last = path.split('.').pop() || path;
  const mapped = labels[last] || last.replace(/([A-Z])/g, ' $1');
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
};



const collectProposalChanges = (
  proposal: CompanyProfileUpdateProposalResponse,
  profile: ProfileResponse | null
): ChangeRow[] => {
  const sections = [
    { source: 'Identity', proposed: proposal.proposedIdentity, current: profile?.identity },
    { source: 'Contact', proposed: proposal.proposedContact, current: profile?.contact },
    { source: 'Company Size', proposed: proposal.proposedCompanySize, current: profile?.companySize },
    { source: 'Business', proposed: proposal.proposedBusiness, current: profile?.business },
    { source: 'Insights', proposed: proposal.proposedInsights, current: profile?.insights },
    { source: 'Financial', proposed: proposal.proposedFinancial, current: profile?.financial ?? profile?.financials },
    { source: 'Market', proposed: proposal.proposedMarket, current: profile?.market },
    { source: 'Innovation', proposed: proposal.proposedInnovation, current: profile?.innovation },
    { source: 'Risk', proposed: proposal.proposedRisk, current: profile?.risk },
    { source: 'Compliance', proposed: proposal.proposedCompliance, current: profile?.compliance },
    {
      source: 'Leadership',
      proposed: proposal.proposedCompanyMembers ? { companyMembers: proposal.proposedCompanyMembers } : null,
      current: { companyMembers: profile?.companyMembers ?? null }
    },
    {
      source: 'Relationship',
      proposed: proposal.proposedRelationship ? { relationshipType: proposal.proposedRelationship } : null,
      current: { relationshipType: profile?.relationshipType ?? null }
    }
  ];

  return sections.flatMap((section) => {
    if (!section.proposed) return [];

    return flattenRecord(section.proposed as Record<string, unknown>).flatMap(([path, proposedValue]) => {
      const currentValue = getByPath(section.current, path);
      if (normalizeValue(currentValue) === normalizeValue(proposedValue)) return [];

      return [{
        key: `${section.source}.${path}`,
        label: fieldLabel(path),
        currentValue,
        proposedValue,
        source: section.source
      }];
    });
  });
};


const ValueDisplay = ({ value, level = 0, isProposed = false }: { value: unknown; level?: number; isProposed?: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-muted)' }}>{isProposed ? 'Removed' : 'Not provided'}</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  
  if (typeof value === 'string') {
    if (value.startsWith('http') && (value.includes('.jpg') || value.includes('.png') || value.includes('.jpeg') || value.includes('.webp'))) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <img src={value} alt="Preview" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--workspace-muted-border, #e2e8f0)' }} />
        </div>
      );
    }
    if (value.startsWith('http')) {
      return <a href={value} target="_blank" rel="noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }} title={value}>{value}</a>;
    }
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>{value}</span>;
  }
  
  if (typeof value === 'number') return <span>{value}</span>;

  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: 'var(--text-muted)' }}>{isProposed ? 'Removed' : 'Not provided'}</span>;
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {value.map((item, i) => (
            <span key={i} style={{ background: isProposed ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0, 0, 0, 0.05)', padding: '2px 8px', borderRadius: '16px', fontSize: '0.85rem', color: isProposed ? '#1e40af' : 'var(--text-primary)', border: isProposed ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)' }}>
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    
    const limit = 4;
    const isExpandable = value.length > limit;
    const itemsToShow = expanded ? value : value.slice(0, limit);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {itemsToShow.map((item, i) => (
          <div key={i} style={{ padding: '12px', border: '1px solid var(--workspace-muted-border, #e2e8f0)', borderRadius: '6px', background: isProposed ? 'var(--bg-surface, #fff)' : 'var(--cds-layer-01, #f8fafc)' }}>
            <ValueDisplay value={item} level={level + 1} isProposed={isProposed} />
          </div>
        ))}
        {isExpandable && (
          <button 
            type="button" 
            onClick={() => setExpanded(!expanded)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--role-accent, #2563eb)', 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              cursor: 'pointer', 
              textAlign: 'left', 
              padding: '4px 8px',
              marginTop: '-4px',
              alignSelf: 'flex-start',
              borderRadius: '4px'
            }}
          >
            {expanded ? 'Show less' : `Show ${value.length - limit} more...`}
          </button>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const hiddenKeys = ['notes', 'researchedAt', 'researchedBy', 'taskId'];
    const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '' && !hiddenKeys.includes(k));
    
    if (!entries.length) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              <ValueDisplay value={v} level={level + 1} isProposed={isProposed} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};

export const CompanyMonitoringPage: React.FC<CompanyMonitoringPageProps> = ({ setActivePage }) => {
  const [activeTab, setActiveTab] = useState<MonitoringTab>('assignments');
  const [assignments, setAssignments] = useState<CompanyMonitoringAssignmentResponse[]>([]);
  const [monitoringHistory, setMonitoringHistory] = useState<CompanyMonitoringReviewResponse[]>([]);
  const [monitoringHistoryTotal, setMonitoringHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState<number | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [frequencyFilter, setFrequencyFilter] = useState('ALL');
  const [proposalSearch, setProposalSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [proposalPage, setProposalPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<CompanyMonitoringAssignmentResponse | null>(null);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [proposalReadOnly, setProposalReadOnly] = useState(false);
  const [selectedHistoryReview, setSelectedHistoryReview] = useState<CompanyMonitoringReviewResponse | null>(null);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [proposalBundles, setProposalBundles] = useState<Record<string, ProposalBundle>>({});
  const [assignmentPendingProposalIds, setAssignmentPendingProposalIds] = useState<Record<number, string[]>>({});
  const [form, setForm] = useState<MonitoringFormState>(initialForm);
  const [companyQuery, setCompanyQuery] = useState('');
  const [staffQuery, setStaffQuery] = useState('');
  const [fieldTouched, setFieldTouched] = useState({
    company: false,
    staff: false,
    frequency: false
  });
  const [companySuggestions, setCompanySuggestions] = useState<ProfileResponse[]>([]);
  const [companySuggestionsOpen, setCompanySuggestionsOpen] = useState(false);
  const [companySearchLoading, setCompanySearchLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ProfileResponse | null>(null);

  const [staffSuggestions, setStaffSuggestions] = useState<StaffCandidate[]>([]);
  const [staffSuggestionsOpen, setStaffSuggestionsOpen] = useState(false);
  const [staffSearchLoading, setStaffSearchLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffCandidate | null>(null);

  const companyFieldRef = useRef<HTMLLabelElement | null>(null);
  const staffFieldRef = useRef<HTMLLabelElement | null>(null);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await companyMonitoringApi.getAllAssignments({
        page: 0,
        size: 100,
        sort: 'updatedAt,desc'
      });
      setAssignments(response.content || []);
    } catch (err) {
      console.error('Failed to load monitoring assignments', err);
      setError('Unable to load monitoring assignments from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMonitoringHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      setHistoryError(null);
      const response = await companyMonitoringApi.getMonitoringHistory({
        page: historyPage - 1,
        size: PAGE_SIZE,
        sort: 'reviewedAt,desc'
      });
      const rows = response.content || [];
      setMonitoringHistory(rows);
      setMonitoringHistoryTotal(response.totalElements ?? rows.length);
    } catch (err) {
      console.error('Failed to load monitoring history', err);
      setMonitoringHistory([]);
      setMonitoringHistoryTotal(0);
      setHistoryError('Unable to load monitoring history from backend.');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    loadMonitoringHistory();
  }, [loadMonitoringHistory]);

  useEffect(() => {
    if (!showCreateModal || selectedAssignment) return;

    const keyword = companyQuery.trim();
    if (keyword.length < 1) {
      setCompanySuggestions([]);
      setCompanySuggestionsOpen(false);
      setCompanySearchLoading(false);
      return;
    }

    let cancelled = false;
    setCompanySearchLoading(true);
    setCompanySuggestionsOpen(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await api.get('/profiles', {
          params: {
            keyword,
            page: 0,
            size: 20,
            excludeOwner: true,
            createdByMe: true
          }
        });
        const profileData = (response as any).data || response;
        if (!cancelled) {
          let items: any[] = [];
          if (Array.isArray(profileData)) items = profileData;
          else if (profileData && Array.isArray(profileData.content)) items = profileData.content;
          else if (profileData && Array.isArray(profileData.data)) items = profileData.data;
          
          setCompanySuggestions(items);
        }
      } catch (err: any) {
        console.error('Failed to search managed company profiles', err);
        if (!cancelled) {
          setCompanySuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setCompanySearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [companyQuery, selectedAssignment, showCreateModal]);

  useEffect(() => {
    if (!showCreateModal) return;

    const email = staffQuery.trim();
    if (!email) {
      setStaffSuggestions([]);
      setStaffSuggestionsOpen(false);
      setStaffSearchLoading(false);
      return;
    }

    let cancelled = false;
    setStaffSearchLoading(true);
    setStaffSuggestionsOpen(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await accountApi.searchAccountsByEmail(email);
        if (!cancelled) {
          setStaffSuggestions(
            (response.data || [])
              .filter((user) => isStaffAccount(user))
              .slice(0, 20)
          );
        }
      } catch (err) {
        console.error('Failed to search staff accounts', err);
        if (!cancelled) {
          setStaffSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setStaffSearchLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [showCreateModal, staffQuery]);

  useEffect(() => {
    if (!showCreateModal) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (companyFieldRef.current && target instanceof Node && !companyFieldRef.current.contains(target)) {
        setCompanySuggestionsOpen(false);
      }
      if (staffFieldRef.current && target instanceof Node && !staffFieldRef.current.contains(target)) {
        setStaffSuggestionsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [showCreateModal]);

  const assignmentProposalIdKey = useMemo(
    () =>
      assignments
        .map((assignment) => `${assignment.id}:${assignment.companyProfileId}:${assignment.latestProposalId || ''}`)
        .join('|'),
    [assignments]
  );

  const proposalIds = useMemo(() => {
    const ids = new Set<string>();
    assignments.forEach((assignment) => {
      if (assignment.latestProposalId) ids.add(assignment.latestProposalId);
      (assignmentPendingProposalIds[assignment.id] || []).forEach((proposalId) => ids.add(proposalId));
    });
    return Array.from(ids);
  }, [assignmentPendingProposalIds, assignments]);
  const proposalIdKey = proposalIds.join('|');

  useEffect(() => {
    if (!assignments.length) {
      setAssignmentPendingProposalIds({});
      return;
    }

    let cancelled = false;

    const loadPendingProposalIds = async () => {
      try {
        setProposalLoading(true);
        setProposalError(null);
        const entries = await Promise.all(
          assignments.map(async (assignment) => {
            try {
              const proposals = await companyMonitoringApi.getPendingProfileUpdateProposals(assignment.companyProfileId);
              return [assignment.id, proposals.map((proposal) => proposal.id)] as const;
            } catch (err) {
              console.error('Failed to load pending monitoring proposals for assignment', assignment.id, err);
              return [assignment.id, []] as const;
            }
          })
        );

        if (!cancelled) {
          setAssignmentPendingProposalIds(Object.fromEntries(entries));
        }
      } catch (err) {
        console.error('Failed to load pending monitoring proposal ids', err);
        if (!cancelled) {
          setProposalError('Unable to load pending monitoring proposals from backend.');
        }
      } finally {
        if (!cancelled) {
          setProposalLoading(false);
        }
      }
    };

    loadPendingProposalIds();

    return () => {
      cancelled = true;
    };
  }, [assignmentProposalIdKey, assignments]);

  const loadProposalBundles = useCallback(async (ids: string[]) => {
    if (!ids.length) return;
    try {
      setProposalLoading(true);
      setProposalError(null);
      const entries = await Promise.all(
        ids.map(async (id) => {
          const historyReview = monitoringHistory.find((review) => review.updateProposalId === id);
          const assignment = assignments.find(
            (item) =>
              item.latestProposalId === id ||
              item.id === historyReview?.monitoringAssignmentId ||
              (assignmentPendingProposalIds[item.id] || []).includes(id)
          );
          try {
            const proposal = await companyMonitoringApi.getProfileUpdateProposal(id);
            const profileId = proposal.companyProfileId || assignment?.companyProfileId;
            let profile: ProfileResponse | null = null;
            if (profileId) {
              const profileResponse = await api.get<ProfileResponse>(`/company-profiles/${profileId}`);
              profile = profileResponse.data;
            }
            return [id, { proposal, profile }] as const;
          } catch (err) {
            console.error('Failed to load monitoring proposal', id, err);
            return [
              id,
              {
                proposal: {
                  id,
                  companyProfileId: assignment?.companyProfileId || '',
                  status: assignment?.latestProposalStatus || 'UNKNOWN'
                },
                profile: null,
                error: 'Unable to load this proposal from backend.'
              }
            ] as const;
          }
        })
      );

      setProposalBundles((current) => ({
        ...current,
        ...Object.fromEntries(entries)
      }));
    } catch (err) {
      console.error('Failed to load monitoring proposals', err);
      setProposalError('Unable to load profile update proposals from backend.');
    } finally {
      setProposalLoading(false);
    }
  }, [assignmentPendingProposalIds, assignments, monitoringHistory]);

  useEffect(() => {
    const missingIds = proposalIds.filter((id) => !proposalBundles[id]);
    if (missingIds.length) {
      loadProposalBundles(missingIds);
    }
  }, [loadProposalBundles, proposalBundles, proposalIdKey, proposalIds]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, frequencyFilter]);

  useEffect(() => {
    setProposalPage(1);
  }, [proposalSearch]);

  const resetAssignmentForm = () => {
    setForm(initialForm);
    setCompanyQuery('');
    setStaffQuery('');
    setSelectedCompany(null);
    setSelectedStaff(null);
    setCompanySuggestions([]);
    setStaffSuggestions([]);
    setCompanySuggestionsOpen(false);
    setStaffSuggestionsOpen(false);
    setFieldTouched({ company: false, staff: false, frequency: false });
    setFormError(null);
  };

  const fieldErrors = useMemo<MonitoringFieldErrors>(() => {
    const errors: MonitoringFieldErrors = {};
    if (fieldTouched.company && !form.companyProfileId) {
      errors.company = 'Please select a valid company.';
    }
    if (fieldTouched.staff && !form.assignedStaffId) {
      errors.staff = 'Please select a valid staff member.';
    }
    if (fieldTouched.frequency && !form.frequency) {
      errors.frequency = 'Please select a review cycle.';
    }
    return errors;
  }, [fieldTouched, form.assignedStaffId, form.companyProfileId, form.frequency]);


  const selectCompany = (profile: ProfileResponse) => {
    setSelectedCompany(profile);
    setCompanyQuery(profileName(profile));
    setForm((current) => ({ ...current, companyProfileId: profile.id }));
    setFieldTouched((current) => ({ ...current, company: true }));
    setCompanySuggestionsOpen(false);
  };

  const selectStaff = (staff: StaffCandidate) => {
    setSelectedStaff(staff);
    setStaffQuery(staff.email);
    setForm((current) => ({ ...current, assignedStaffId: String(staff.id) }));
    setFieldTouched((current) => ({ ...current, staff: true }));
    setStaffSuggestionsOpen(false);
  };

  const openCreateModal = () => {
    setSelectedAssignment(null);
    resetAssignmentForm();
    setShowCreateModal(true);
  };

  const openManageModal = (assignment: CompanyMonitoringAssignmentResponse) => {
    setSelectedAssignment(assignment);
    const company = {
      id: assignment.companyProfileId,
      companyId: assignment.companyProfileId,
      identity: { tradeName: assignment.companyName }
    } satisfies ProfileResponse;
    const staff = {
      id: assignment.assignedStaffId,
      email: assignment.assignedStaffEmail,
      fullName: assignment.assignedStaffName,
      roles: ['BUSINESS_DEVELOPMENT_STAFF'],
      enabled: true,
      createdAt: null
    } satisfies StaffCandidate;
    setForm({
      companyProfileId: assignment.companyProfileId,
      assignedStaffId: String(assignment.assignedStaffId),
      frequency: assignment.frequency
    });
    setSelectedCompany(company);
    setSelectedStaff(staff);
    setCompanyQuery(assignment.companyName);
    setStaffQuery(assignment.assignedStaffEmail);
    setFieldTouched({ company: false, staff: false, frequency: false });
    setCompanySuggestionsOpen(false);
    setStaffSuggestionsOpen(false);
    setFormError(null);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    setSelectedAssignment(null);
    resetAssignmentForm();
  };

  const closeReviewModal = () => {
    if (decisionLoading) return;
    setSelectedProposalId(null);
    setProposalReadOnly(false);
    setConfirmAction(null);
    setDecisionError(null);
  };

  const refreshAfterMutation = async (message: string) => {
    setToast(message);
    await loadAssignments();
    await loadMonitoringHistory();
    window.setTimeout(() => setToast(null), 3200);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.companyProfileId || !form.assignedStaffId || !form.frequency) {
      setFormError('Please select a company, a staff member, and a monitoring frequency.');
      return;
    }

    try {
      setSaving(true);
      if (selectedAssignment) {
        await companyMonitoringApi.updateAssignment(selectedAssignment.id, {
          assignedStaffId: Number(form.assignedStaffId),
          frequency: form.frequency
        });
        closeModal();
        await refreshAfterMutation('Monitoring assignment updated.');
      } else {
        await companyMonitoringApi.assignMonitor({
          companyProfileId: form.companyProfileId,
          assignedStaffId: Number(form.assignedStaffId),
          frequency: form.frequency
        });
        closeModal();
        await refreshAfterMutation('Monitoring assignment created.');
      }
    } catch (err) {
      console.error('Failed to save monitoring assignment', err);
      setFormError('Backend rejected this monitoring assignment. Please verify the company and staff selection.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (assignment: CompanyMonitoringAssignmentResponse) => {
    try {
      setStatusActionLoading(assignment.id);
      if (assignment.assignmentStatus === 'ACTIVE') {
        await companyMonitoringApi.pauseAssignment(assignment.id);
        await refreshAfterMutation('Monitoring assignment paused.');
      } else {
        await companyMonitoringApi.resumeAssignment(assignment.id);
        await refreshAfterMutation('Monitoring assignment resumed.');
      }
    } catch (err) {
      console.error('Failed to change monitoring assignment status', err);
      setError('Unable to update monitoring assignment status.');
    } finally {
      setStatusActionLoading(null);
    }
  };

  const handleProposalDecision = async () => {
    if (!selectedProposalId || !confirmAction) return;

    try {
      setDecisionLoading(true);
      setDecisionError(null);
      const updated =
        confirmAction === 'approve'
          ? await companyMonitoringApi.approveProfileUpdateProposal(selectedProposalId)
          : await companyMonitoringApi.rejectProfileUpdateProposal(selectedProposalId);

      setProposalBundles((current) => {
        const existing = current[selectedProposalId];
        return {
          ...current,
          [selectedProposalId]: {
            proposal: updated,
            profile: existing?.profile || null
          }
        };
      });
      setConfirmAction(null);
      await refreshAfterMutation(
        confirmAction === 'approve' ? 'Profile update proposal approved.' : 'Profile update proposal rejected.'
      );
      if (confirmAction === 'approve') {
        const profileId = updated.companyProfileId;
        if (profileId) {
          const profileResponse = await api.get<ProfileResponse>(`/company-profiles/${profileId}`);
          setProposalBundles((current) => ({
            ...current,
            [selectedProposalId]: {
              proposal: updated,
              profile: profileResponse.data
            }
          }));
        }
      }
    } catch (err) {
      console.error('Failed to review monitoring proposal', err);
      setDecisionError('Backend rejected this review action. Please refresh and try again.');
    } finally {
      setDecisionLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return assignments.filter((assignment) => {
      const matchesSearch =
        !normalizedSearch ||
        assignment.companyName.toLowerCase().includes(normalizedSearch) ||
        assignment.assignedStaffName.toLowerCase().includes(normalizedSearch) ||
        assignment.assignedStaffEmail.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === 'ALL' ||
        assignment.assignmentStatus === statusFilter ||
        assignment.displayStatus === statusFilter;
      const matchesFrequency = frequencyFilter === 'ALL' || assignment.frequency === frequencyFilter;
      return matchesSearch && matchesStatus && matchesFrequency;
    });
  }, [assignments, frequencyFilter, search, statusFilter]);

  const pendingReviewRows = useMemo<ProposalReviewRow[]>(() => {
    const rows: ProposalReviewRow[] = [];
    const seen = new Set<string>();

    assignments.forEach((assignment) => {
      const pendingIds = assignmentPendingProposalIds[assignment.id] || [];
      const ids = new Set<string>(pendingIds);
      if (assignment.latestProposalId) ids.add(assignment.latestProposalId);

      ids.forEach((proposalId) => {
        const status = proposalBundles[proposalId]?.proposal.status || assignment.latestProposalStatus;
        const cameFromPendingEndpoint = pendingIds.includes(proposalId);
        if ((cameFromPendingEndpoint || isPendingProposalStatus(status)) && isPendingProposalStatus(status || 'SUBMITTED')) {
          const key = `${assignment.id}:${proposalId}`;
          if (!seen.has(key)) {
            rows.push({ assignment, proposalId });
            seen.add(key);
          }
        }
      });
    });

    return rows;
  }, [assignmentPendingProposalIds, assignments, proposalBundles]);

  const filteredPendingRows = useMemo(() => {
    const normalizedSearch = proposalSearch.trim().toLowerCase();
    return pendingReviewRows.filter(({ assignment, proposalId }) => {
      const matchesSearch =
        !normalizedSearch ||
        assignment.companyName.toLowerCase().includes(normalizedSearch) ||
        assignment.assignedStaffName.toLowerCase().includes(normalizedSearch) ||
        assignment.assignedStaffEmail.toLowerCase().includes(normalizedSearch) ||
        proposalId.toLowerCase().includes(normalizedSearch);
      return matchesSearch;
    });
  }, [pendingReviewRows, proposalSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE));
  const currentAssignments = filteredAssignments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pendingPages = Math.max(1, Math.ceil(filteredPendingRows.length / PAGE_SIZE));
  const currentPending = filteredPendingRows.slice((proposalPage - 1) * PAGE_SIZE, proposalPage * PAGE_SIZE);
  const historyPages = Math.max(1, Math.ceil(monitoringHistoryTotal / PAGE_SIZE));
  const currentHistory = monitoringHistory;

  const metrics = useMemo(() => {
    const active = assignments.filter((item) => item.assignmentStatus === 'ACTIVE').length;
    const due = assignments.filter((item) => item.displayStatus === 'DUE').length;
    const overdue = assignments.filter((item) => item.displayStatus === 'OVERDUE').length;
    const paused = assignments.filter((item) => item.assignmentStatus === 'PAUSED').length;
    return { active, due, overdue, paused };
  }, [assignments]);

  const selectedProposalBundle = selectedProposalId ? proposalBundles[selectedProposalId] : null;
  const selectedProposalHistoryReview = selectedProposalId
    ? monitoringHistory.find((review) => review.updateProposalId === selectedProposalId)
    : null;
  const selectedProposalAssignment = selectedProposalId
    ? assignments.find(
        (assignment) =>
          assignment.latestProposalId === selectedProposalId ||
          assignment.id === selectedProposalHistoryReview?.monitoringAssignmentId ||
          (assignmentPendingProposalIds[assignment.id] || []).includes(selectedProposalId)
      )
    : null;
  const selectedProposalChanges = useMemo(() => {
    return selectedProposalBundle
      ? collectProposalChanges(selectedProposalBundle.proposal, selectedProposalBundle.profile)
      : [];
  }, [selectedProposalBundle]);
    
  const groupedProposalChanges = useMemo(() => {
    const groups: Record<string, ChangeRow[]> = {};
    selectedProposalChanges.forEach(change => {
      if (!groups[change.source]) groups[change.source] = [];
      groups[change.source].push(change);
    });
    return groups;
  }, [selectedProposalChanges]);

  const historyProposalBundle = selectedHistoryReview?.updateProposalId ? proposalBundles[selectedHistoryReview.updateProposalId] : null;
  const historyProposalChanges = useMemo(() => {
    return historyProposalBundle
      ? collectProposalChanges(historyProposalBundle.proposal, historyProposalBundle.profile)
      : [];
  }, [historyProposalBundle]);
  
  const historyGroupedProposalChanges = useMemo(() => {
    const groups: Record<string, ChangeRow[]> = {};
    historyProposalChanges.forEach(change => {
      if (!groups[change.source]) groups[change.source] = [];
      groups[change.source].push(change);
    });
    return groups;
  }, [historyProposalChanges]);

  const canReviewSelected =
    selectedProposalBundle &&
    selectedProposalBundle.profile &&
    !proposalReadOnly &&
    isPendingProposalStatus(selectedProposalBundle.proposal.status);

  const openProposalReview = (proposalId: string) => {
    setProposalReadOnly(false);
    setSelectedProposalId(proposalId);
  };

  const openProposalReadOnly = (proposalId: string) => {
    setProposalReadOnly(true);
    setSelectedProposalId(proposalId);
    if (!proposalBundles[proposalId]) {
      void loadProposalBundles([proposalId]);
    }
  };

  useEffect(() => {
    if (selectedHistoryReview?.updateProposalId && !proposalBundles[selectedHistoryReview.updateProposalId]) {
      void loadProposalBundles([selectedHistoryReview.updateProposalId]);
    }
  }, [selectedHistoryReview, proposalBundles, loadProposalBundles]);

  const renderProposalBadge = (assignment: CompanyMonitoringAssignmentResponse) => {
    const proposalId = assignment.latestProposalId || assignmentPendingProposalIds[assignment.id]?.[0];
    const status = proposalId ? proposalBundles[proposalId]?.proposal.status || assignment.latestProposalStatus || 'SUBMITTED' : null;
    if (!proposalId || !status) return <span className="workspace-badge neutral">No proposal</span>;

    if (isPendingProposalStatus(status)) {
      return (
        <button
          type="button"
          className={`workspace-badge ${proposalTone(status)} monitoring-proposal-badge`}
          onClick={() => {
            setActiveTab('pending');
            openProposalReview(proposalId);
          }}
        >
          {status}
        </button>
      );
    }

    return <span className={`workspace-badge ${proposalTone(status)}`}>{status}</span>;
  };

  const renderAssignmentRow = (assignment: CompanyMonitoringAssignmentResponse, index: number) => (
    <tr key={assignment.id}>
      <td className="admin-mono">{index + 1}</td>
      <td>
        <button
          type="button"
          className="monitoring-company-link"
          onClick={() => setActivePage?.('company-detail', { id: assignment.companyProfileId })}
        >
          <strong>{assignment.companyName}</strong>
        </button>
      </td>
      <td>
        {assignment.assignedStaffName && assignment.assignedStaffName !== assignment.assignedStaffEmail ? (
          <>
            <strong>{assignment.assignedStaffName}</strong>
            <br />
            <small style={{ color: 'var(--text-secondary)' }}>{assignment.assignedStaffEmail}</small>
          </>
        ) : (
          <strong>{assignment.assignedStaffEmail}</strong>
        )}
      </td>
      <td>{frequencyLabel(assignment.frequency)}</td>
      <td>
        <strong>{formatDate(assignment.nextReviewAt)}</strong>
        <br />
        <small style={{ color: 'var(--text-secondary)' }}>Last: {formatDate(assignment.lastReviewedAt)}</small>
      </td>
      <td>
        <span className={`workspace-badge ${statusTone(assignment.assignmentStatus)}`}>
          {assignment.assignmentStatus}
        </span>
      </td>
      <td>{renderProposalBadge(assignment)}</td>
      <td>
        <div className="admin-row-actions" style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="project-detail-btn" onClick={() => openManageModal(assignment)}>
            Manage
          </button>
          <button
            type="button"
            className={assignment.assignmentStatus === 'ACTIVE' ? 'project-delete-btn' : 'project-activate-btn'}
            disabled={statusActionLoading === assignment.id}
            onClick={() => handleToggleStatus(assignment)}
          >
            {statusActionLoading === assignment.id
              ? '...'
              : assignment.assignmentStatus === 'ACTIVE'
                ? 'Pause'
                : 'Resume'}
          </button>
        </div>
      </td>
    </tr>
  );


  const renderProposalRow = ({ assignment, proposalId }: ProposalReviewRow) => {
    const bundle = proposalBundles[proposalId];
    const changes = bundle ? collectProposalChanges(bundle.proposal, bundle.profile).length : null;
    const status = bundle?.proposal.status || assignment.latestProposalStatus || 'UNKNOWN';

    return (
      <tr key={`${assignment.id}-${proposalId}`}>
        <td>
          <button
            type="button"
            className="monitoring-company-link"
            onClick={() => openProposalReview(proposalId)}
          >
            <strong>{assignment.companyName}</strong>
          </button>
        </td>
        <td>
          {assignment.assignedStaffName && assignment.assignedStaffName !== assignment.assignedStaffEmail ? (
            <>
              <strong>{assignment.assignedStaffName}</strong>
              <br />
              <small style={{ color: 'var(--text-secondary)' }}>{assignment.assignedStaffEmail}</small>
            </>
          ) : (
            <span>{assignment.assignedStaffEmail}</span>
          )}
        </td>
        <td>
          <span className={`workspace-badge ${proposalTone(status)}`}>{status}</span>
        </td>
        <td>
          <strong>{bundle ? formatDate(bundle.proposal.createdAt) : '-'}</strong>
          <br />
          <small style={{ color: 'var(--text-secondary)' }}>{changes === null ? 'Loading...' : `${changes} changed fields`}</small>
        </td>
        <td>
          <button
            type="button"
            className="project-activate-btn"
            onClick={() => openProposalReview(proposalId)}
          >
            Review
          </button>
        </td>
      </tr>
    );
  };

  const renderHistoryRow = (review: CompanyMonitoringReviewResponse) => {
    const reviewerName = review.reviewedByName || review.reviewedByEmail || '-';
    const reviewerEmail = review.reviewedByEmail;
    const proposalStatus = review.result === 'NO_CHANGE' ? null : review.proposalStatus;

    return (
      <tr key={review.id}>
        <td>
          <strong>{review.companyName || review.companyProfileId}</strong>
        </td>
        <td>
          {reviewerEmail && reviewerEmail !== reviewerName ? (
            <>
              <strong>{reviewerName}</strong>
              <br />
              <small style={{ color: 'var(--text-secondary)' }}>{reviewerEmail}</small>
            </>
          ) : (
            <span>{reviewerName}</span>
          )}
        </td>
        <td>
          <span className={`workspace-badge ${reviewResultTone(review.result)}`}>
            {reviewResultLabel(review.result)}
          </span>
        </td>
        <td>
          {proposalStatus ? (
            <span className={`workspace-badge ${proposalTone(proposalStatus)}`}>
              {proposalStatusLabel(proposalStatus)}
            </span>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>&mdash;</span>
          )}
        </td>
        <td>
          <strong>{formatDateTime(review.reviewedAt)}</strong>
        </td>
        <td>
          <button
            type="button"
            className="project-detail-btn"
            onClick={() => setSelectedHistoryReview(review)}
          >
            View
          </button>
        </td>
      </tr>
    );
  };

  return (
    <main id="page-company-monitoring" className="workspace-main-full manager-page">
      <section className="workspace-page-head">
        <div>
          <span className="workspace-chip">Company Monitoring</span>
          <h1>Monitoring Management</h1>
          <p>
            Assign staff to monitored companies, review profile update proposals, and track decisions using backend
            monitoring data.
          </p>
        </div>
        <div className="workspace-head-actions">
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={16} /> New assignment
          </button>
        </div>
      </section>

      {toast && <div className="admin-toast success">{toast}</div>}
      {error && <div className="admin-toast danger">{error}</div>}
      {proposalError && <div className="admin-toast danger">{proposalError}</div>}
      {historyError && <div className="admin-toast danger">{historyError}</div>}

      <section className="workspace-stats workspace-stats-compact">
        <article className="workspace-stat-card">
          <span className="workspace-stat-label">Active</span>
          <strong>{metrics.active}</strong>
          <p>Assignments currently monitored</p>
        </article>
        <article className="workspace-stat-card">
          <span className="workspace-stat-label">Due</span>
          <strong>{metrics.due}</strong>
          <p>Reviews waiting for staff</p>
        </article>
        <article className="workspace-stat-card">
          <span className="workspace-stat-label">Overdue</span>
          <strong>{metrics.overdue}</strong>
          <p>Past their scheduled review date</p>
        </article>
        <article className="workspace-stat-card">
          <span className="workspace-stat-label">Pending reviews</span>
          <strong>{pendingReviewRows.length}</strong>
          <p>Profile proposals awaiting manager decision</p>
        </article>
      </section>

      <div className="tabs" style={{ marginBottom: '16px' }}>
        <button
          type="button"
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments 
          <span className="stat-list-badge" style={{ marginLeft: '6px', backgroundColor: activeTab === 'assignments' ? 'var(--role-accent, #2563eb)' : 'var(--workspace-muted-border, #e2e8f0)', color: activeTab === 'assignments' ? '#fff' : 'var(--text-secondary)' }}>
            {assignments.length}
          </span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Reviews 
          <span className="stat-list-badge" style={{ marginLeft: '6px', backgroundColor: activeTab === 'pending' ? 'var(--role-accent, #2563eb)' : 'var(--workspace-muted-border, #e2e8f0)', color: activeTab === 'pending' ? '#fff' : 'var(--text-secondary)' }}>
            {pendingReviewRows.length}
          </span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Monitoring History
          <span className="stat-list-badge" style={{ marginLeft: '6px', backgroundColor: activeTab === 'history' ? 'var(--role-accent, #2563eb)' : 'var(--workspace-muted-border, #e2e8f0)', color: activeTab === 'history' ? '#fff' : 'var(--text-secondary)' }}>
            {monitoringHistoryTotal}
          </span>
        </button>
      </div>

      {activeTab === 'assignments' && (
        <section className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Monitoring Assignments</h3>
              <p>Create, reassign, pause, or resume company monitoring assignments.</p>
            </div>
          </div>

          <div className="admin-toolbar monitoring-management-filters">
            <input
              className="admin-input"
              placeholder="Search company or staff"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select className="admin-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="DUE">Due</option>
              <option value="OVERDUE">Overdue</option>
              <option value="UP_TO_DATE">Up to date</option>
            </select>
            <select
              className="admin-select"
              value={frequencyFilter}
              onChange={(event) => setFrequencyFilter(event.target.value)}
            >
              <option value="ALL">All frequencies</option>
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="SEMI_ANNUALLY">Semi-annually</option>
            </select>
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company</th>
                  <th>Assigned Staff</th>
                  <th>Review Cycle</th>
                  <th>Next Review</th>
                  <th>Status</th>
                  <th>Proposal</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="workspace-empty monitoring-management-pagination">Loading monitoring assignments...</td>
                  </tr>
                ) : currentAssignments.length ? (
                  currentAssignments.map((assignment, index) =>
                    renderAssignmentRow(assignment, (currentPage - 1) * PAGE_SIZE + index)
                  )
                ) : (
                  <tr>
                    <td colSpan={8} className="workspace-empty monitoring-management-pagination">No monitoring assignments found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="project-table-pagination monitoring-management-pagination">
            <span>
              Showing {filteredAssignments.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(currentPage * PAGE_SIZE, filteredAssignments.length)} of {filteredAssignments.length}
            </span>
            <div>
              <button
                type="button"
                className="workspace-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                className="workspace-page-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'pending' && (
        <section className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Pending Profile Update Reviews</h3>
              <p>Loaded from monitoring assignments and each company profile's pending proposal endpoint.</p>
            </div>
            {proposalLoading && <span className="workspace-badge info">Loading proposals</span>}
          </div>

          <div className="admin-toolbar monitoring-proposal-filters">
            <input
              className="admin-input"
              placeholder="Search company, staff, or proposal id"
              value={proposalSearch}
              onChange={(event) => setProposalSearch(event.target.value)}
            />
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company / Proposal</th>
                  <th>Submitted by</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentPending.length ? (
                  currentPending.map((row) => renderProposalRow(row))
                ) : (
                  <tr>
                    <td colSpan={5} className="workspace-empty">No pending monitoring proposals found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="project-table-pagination monitoring-proposal-pagination">
            <span>
              Showing {filteredPendingRows.length ? (proposalPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(proposalPage * PAGE_SIZE, filteredPendingRows.length)} of {filteredPendingRows.length}
            </span>
            <div>
              <button
                type="button"
                className="workspace-page-btn"
                disabled={proposalPage === 1}
                onClick={() => setProposalPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>
                Page {proposalPage} / {pendingPages}
              </span>
              <button
                type="button"
                className="workspace-page-btn"
                disabled={proposalPage === pendingPages}
                onClick={() => setProposalPage((page) => Math.min(pendingPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'history' && (
        <section className="workspace-panel">
          <div className="workspace-section-head">
            <div>
              <h3>Monitoring History</h3>
              <p>Completed company monitoring reviews, including no-change reviews and proposal outcomes.</p>
            </div>
            {historyLoading && <span className="workspace-badge info">Loading history</span>}
          </div>

          <div className="admin-table-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Reviewed By</th>
                  <th>Review Result</th>
                  <th>Proposal Status</th>
                  <th>Reviewed At</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan={6} className="workspace-empty">Loading monitoring history...</td>
                  </tr>
                ) : currentHistory.length ? (
                  currentHistory.map((row) => renderHistoryRow(row))
                ) : (
                  <tr>
                    <td colSpan={6} className="workspace-empty">
                      <strong>No monitoring history yet.</strong>
                      <br />
                      <span>Completed monitoring reviews will appear here.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="project-table-pagination monitoring-proposal-pagination">
            <span>
              Showing {monitoringHistoryTotal ? (historyPage - 1) * PAGE_SIZE + 1 : 0}-
              {Math.min(historyPage * PAGE_SIZE, monitoringHistoryTotal)} of {monitoringHistoryTotal}
            </span>
            <div>
              <button
                type="button"
                className="workspace-page-btn"
                disabled={historyPage === 1}
                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span>
                Page {historyPage} / {historyPages}
              </span>
              <button
                type="button"
                className="workspace-page-btn"
                disabled={historyPage === historyPages}
                onClick={() => setHistoryPage((page) => Math.min(historyPages, page + 1))}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}

      {showCreateModal && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={closeModal}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ width: '560px', maxWidth: '90vw', padding: 0 }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 20px', borderBottom: '1px solid var(--cds-border-subtle, #e0e0e0)' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {selectedAssignment ? 'Manage monitoring assignment' : 'Create monitoring assignment'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {selectedAssignment
                    ? 'Update the assigned staff member or schedule frequency.'
                    : 'Assign a company to a staff member for periodic review.'}
                </p>
              </div>
              <button
                type="button"
                className="workspace-icon-btn"
                onClick={closeModal}
                aria-label="Close assignment modal"
                style={{ marginLeft: '16px', marginTop: '-4px', fontSize: '1.5rem', lineHeight: 1, padding: '4px 8px' }}
              >
                &times;
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '24px 28px' }}>
              <form id="monitoring-assignment-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {formError && <div className="admin-form-error" style={{ marginBottom: 0 }}>{formError}</div>}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }} ref={companyFieldRef}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Company</span>
                    <input
                      className="admin-input"
                      placeholder="Search company name..."
                      value={selectedAssignment ? selectedAssignment.companyName : companyQuery}
                      onChange={(e) => {
                         if (selectedCompany) {
                           setSelectedCompany(null);
                           setForm(curr => ({ ...curr, companyProfileId: '' }));
                         }
                         setCompanyQuery(e.target.value);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                           setFieldTouched(curr => ({ ...curr, company: true }));
                        }, 200);
                      }}
                      disabled={Boolean(selectedAssignment)}
                      onFocus={() => { if (!selectedAssignment && companyQuery) setCompanySuggestionsOpen(true); }}
                    />
                    {companySuggestionsOpen && (
                      <div className="admin-suggestions-dropdown" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10, background: 'var(--cds-layer, #fff)', border: '1px solid var(--cds-border-subtle)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto' }}>
                        {companySearchLoading ? (
                          <div style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Searching...</div>
                        ) : companySuggestions.length === 0 && companyQuery.trim().length > 0 ? (
                          <div style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No companies found.</div>
                        ) : (
                          companySuggestions.map((profile) => (
                            <div
                              key={profile.id}
                              className="admin-suggestion-item"
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--cds-border-subtle)' }}
                              onClick={() => selectCompany(profile)}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cds-layer-hover, #f4f4f4)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{profileName(profile)}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{profile.business?.industries?.[0] || 'Company Profile'}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {fieldErrors.company && <div style={{ color: 'var(--cds-support-error, #da1e28)', fontSize: '0.85rem', marginTop: '2px' }}>{fieldErrors.company}</div>}
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative' }} ref={staffFieldRef}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Assigned staff</span>
                    <input
                      className="admin-input"
                      placeholder="Search staff email..."
                      value={staffQuery}
                      onChange={(e) => {
                         if (selectedStaff) {
                           setSelectedStaff(null);
                           setForm(curr => ({ ...curr, assignedStaffId: '' }));
                         }
                         setStaffQuery(e.target.value);
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                           setFieldTouched(curr => ({ ...curr, staff: true }));
                        }, 200);
                      }}
                      onFocus={() => { if (staffQuery) setStaffSuggestionsOpen(true); }}
                    />
                    {staffSuggestionsOpen && (
                      <div className="admin-suggestions-dropdown" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 10, background: 'var(--cds-layer, #fff)', border: '1px solid var(--cds-border-subtle)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: '240px', overflowY: 'auto' }}>
                        {staffSearchLoading ? (
                          <div style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Searching...</div>
                        ) : staffSuggestions.length === 0 && staffQuery.trim().length > 0 ? (
                          <div style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No staff found.</div>
                        ) : (
                          staffSuggestions.map((staff) => (
                            <div
                              key={staff.id}
                              className="admin-suggestion-item"
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--cds-border-subtle)' }}
                              onClick={() => selectStaff(staff)}
                              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--cds-layer-hover, #f4f4f4)')}
                              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{staff.email}</div>
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{staff.name || 'Staff Member'}</div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {fieldErrors.staff && <div style={{ color: 'var(--cds-support-error, #da1e28)', fontSize: '0.85rem', marginTop: '2px' }}>{fieldErrors.staff}</div>}
                  </label>

                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Review cycle</span>
                    <select
                      className="admin-select"
                      value={form.frequency}
                      onChange={(event) => {
                        setForm((current) => ({ ...current, frequency: event.target.value as MonitoringFrequency }));
                        if (!fieldTouched.frequency) setFieldTouched(curr => ({ ...curr, frequency: true }));
                      }}
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="SEMI_ANNUALLY">Semi-annually</option>
                    </select>
                    {fieldErrors.frequency && <div style={{ color: 'var(--cds-support-error, #da1e28)', fontSize: '0.85rem', marginTop: '2px' }}>{fieldErrors.frequency}</div>}
                  </label>
                </div>

                {selectedAssignment && (
                  <div className="monitoring-management-summary" style={{ marginTop: '8px', padding: '16px', background: 'var(--cds-layer-01)', borderRadius: '6px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current company</span>
                        <strong style={{ fontSize: '0.95rem' }}>{selectedAssignment.companyName}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Current staff</span>
                        <strong style={{ fontSize: '0.95rem' }}>{selectedAssignment.assignedStaffName}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Last reviewed</span>
                        <strong style={{ fontSize: '0.95rem' }}>{formatDateTime(selectedAssignment.lastReviewedAt)}</strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Next review</span>
                        <strong style={{ fontSize: '0.95rem' }}>{formatDateTime(selectedAssignment.nextReviewAt)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--cds-border-subtle, #e0e0e0)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'var(--cds-layer-01, #f4f4f4)', borderBottomLeftRadius: '8px', borderBottomRightRadius: '8px' }}>
              <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={saving} style={{ background: 'transparent', border: 'none', boxShadow: 'none', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button type="submit" form="monitoring-assignment-form" className="btn btn-primary" disabled={saving} style={{ padding: '0 24px' }}>
                {saving ? 'Saving...' : selectedAssignment ? 'Save changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedHistoryReview && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={() => setSelectedHistoryReview(null)}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ width: '85vw', maxWidth: '1200px', maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Monitoring Review
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {selectedHistoryReview.companyName || selectedHistoryReview.companyProfileId}
                  </span>
                  <span className={`workspace-badge ${reviewResultTone(selectedHistoryReview.result)}`}>
                    {reviewResultLabel(selectedHistoryReview.result)}
                  </span>
                </div>
              </div>
              <button type="button" className="workspace-icon-btn" onClick={() => setSelectedHistoryReview(null)} aria-label="Close monitoring review detail">
                <XCircle size={24} color="var(--text-secondary)" />
              </button>
            </div>

            <div style={{ padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
              
              {/* SECTION A: REVIEW SUMMARY */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Review Summary</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', background: 'var(--cds-layer-01, #f8fafc)', padding: '16px', borderRadius: '8px', border: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Reviewed by</div>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedHistoryReview.reviewedByName || selectedHistoryReview.reviewedByEmail || '-'}
                    </strong>
                    {selectedHistoryReview.reviewedByEmail && selectedHistoryReview.reviewedByEmail !== selectedHistoryReview.reviewedByName && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {selectedHistoryReview.reviewedByEmail}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Reviewed at</div>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedHistoryReview.reviewedAt)}</strong>
                  </div>
                </div>
              </div>

              {/* SECTION B: REVIEW RESULT / CHANGES */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedHistoryReview.result === 'NO_CHANGE' ? 'Review Result' : 'Changes'}
                </h4>
                
                {selectedHistoryReview.result === 'NO_CHANGE' ? (
                  <div>
                    <span className={`workspace-badge ${reviewResultTone(selectedHistoryReview.result)}`} style={{ marginBottom: '12px', display: 'inline-block' }}>
                      {reviewResultLabel(selectedHistoryReview.result)}
                    </span>
                    <p style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
                      No company information changes were found during this review.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <span className={`workspace-badge ${reviewResultTone(selectedHistoryReview.result)}`} style={{ marginRight: '12px' }}>
                        {reviewResultLabel(selectedHistoryReview.result)}
                      </span>
                      <strong style={{ color: 'var(--role-accent, #2563eb)' }}>{historyProposalChanges.length} field{historyProposalChanges.length !== 1 ? 's' : ''} changed</strong>
                    </div>
                    
                    {selectedHistoryReview.updateProposalId && !historyProposalBundle ? (
                      <div className="workspace-empty" style={{ padding: '24px', background: 'var(--cds-layer-01, #f8fafc)', borderRadius: '8px' }}>
                        Loading proposal changes...
                      </div>
                    ) : historyProposalChanges.length > 0 ? (
                      Object.entries(historyGroupedProposalChanges).map(([section, changes]) => (
                        <div key={section} style={{ marginBottom: '24px', background: 'var(--bg-surface, #fff)', border: '1px solid var(--workspace-muted-border, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
                          <div style={{ padding: '12px 16px', background: 'var(--cds-layer-01, #f8fafc)', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{section}</h5>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--cds-layer-02, #e0e0e0)', padding: '2px 8px', borderRadius: '12px' }}>
                              {changes.length} change{changes.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '25%', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>Field</th>
                                  <th style={{ width: '37.5%', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>Current Value</th>
                                  <th style={{ width: '37.5%', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--role-accent, #2563eb)', textTransform: 'uppercase', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', background: 'var(--cds-layer-selected, #eff6ff)' }}>Proposed Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {changes.map((change, index) => (
                                  <tr key={change.key} style={{ borderBottom: index < changes.length - 1 ? '1px solid var(--workspace-muted-border, #e2e8f0)' : 'none' }}>
                                    <td style={{ padding: '16px', verticalAlign: 'top', borderRight: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>
                                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{change.label}</div>
                                    </td>
                                    <td style={{ padding: '16px', verticalAlign: 'top', borderRight: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>
                                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                        <ValueDisplay value={change.currentValue} />
                                      </div>
                                    </td>
                                    <td style={{ padding: '16px', verticalAlign: 'top', background: 'var(--cds-layer-selected, #eff6ff)' }}>
                                      <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                        <ValueDisplay value={change.proposedValue} isProposed />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="workspace-empty" style={{ padding: '24px', background: 'var(--cds-layer-01, #f8fafc)', borderRadius: '8px' }}>
                        No changed fields were found.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* SECTION C: MANAGER DECISION */}
              {selectedHistoryReview.result === 'UPDATE_PROPOSED' && selectedHistoryReview.proposalStatus && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Manager Decision</h4>
                  <div style={{ background: 'var(--cds-layer-01, #f8fafc)', border: '1px solid var(--workspace-muted-border, #e2e8f0)', borderRadius: '8px', padding: '16px' }}>
                    <span className={`workspace-badge ${proposalTone(selectedHistoryReview.proposalStatus)}`}>
                      {proposalStatusLabel(selectedHistoryReview.proposalStatus)}
                    </span>
                    
                    {historyProposalBundle && historyProposalBundle.proposal.status !== 'PENDING' && (
                      <>
                        <div style={{ display: 'flex', gap: '48px', marginTop: '16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reviewed by</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{historyProposalBundle.proposal.reviewedBy || 'Manager'}</strong>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Reviewed at</span>
                            <strong style={{ color: 'var(--text-primary)' }}>{formatDate(historyProposalBundle.proposal.updatedAt)}</strong>
                          </div>
                        </div>

                        {(historyProposalBundle.proposal.reviewComment || historyProposalBundle.proposal.reviewComment) && (
                          <div style={{ marginTop: '16px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Decision Note</span>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-primary)' }}>
                              {historyProposalBundle.proposal.reviewComment || historyProposalBundle.proposal.reviewComment}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION D: SCHEDULE */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Schedule</h4>
                <div style={{ display: 'flex', gap: '48px', background: 'var(--cds-layer-01, #f8fafc)', padding: '16px', borderRadius: '8px', border: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Completed</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedHistoryReview.reviewedAt)}</strong>
                  </div>
                </div>
              </div>

            </div>

            <div style={{ padding: '18px 32px', borderTop: '1px solid var(--workspace-muted-border, #e2e8f0)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedHistoryReview(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedProposalId && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={closeReviewModal}>
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
            style={{ width: '85vw', maxWidth: '1200px', maxHeight: '90vh', padding: 0, display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {proposalReadOnly ? 'Monitoring Proposal Detail' : 'Monitoring Proposal Review'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {selectedProposalHistoryReview?.companyName || selectedProposalAssignment?.companyName || 'Company Profile'}
                  </span>
                  {selectedProposalBundle && (
                    <span className={`workspace-badge ${proposalTone(selectedProposalBundle.proposal.status)}`}>
                      {proposalStatusLabel(selectedProposalBundle.proposal.status)}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" className="workspace-icon-btn" onClick={closeReviewModal} aria-label="Close review modal" style={{ fontSize: '1.5rem', lineHeight: 1, padding: '4px 8px', marginTop: '-4px' }}>
                <XCircle size={24} color="var(--text-secondary)" />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
              {!selectedProposalBundle ? (
                <div className="workspace-empty">Loading proposal detail...</div>
              ) : (
                <>
                  {selectedProposalBundle.error && <div className="admin-form-error" style={{ marginBottom: '16px' }}>{selectedProposalBundle.error}</div>}
                  {decisionError && <div className="admin-form-error" style={{ marginBottom: '16px' }}>{decisionError}</div>}
                  
                  {!selectedProposalBundle.profile && (
                    <div className="monitoring-limit-note danger" style={{ marginBottom: '24px' }}>
                      <AlertTriangle size={18} />
                      <div>
                        <strong>Official profile unavailable</strong>
                        <p>Approval is disabled because the current profile values could not be loaded.</p>
                      </div>
                    </div>
                  )}

                  {/* Submission metadata (Summary) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', marginBottom: '24px' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Submitted by</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                        {selectedProposalHistoryReview?.reviewedByName || selectedProposalAssignment?.assignedStaffName || selectedProposalBundle.proposal.submittedBy || '-'}
                      </div>
                      {selectedProposalHistoryReview?.reviewedByEmail && selectedProposalHistoryReview.reviewedByEmail !== selectedProposalHistoryReview.reviewedByName ? (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {selectedProposalHistoryReview.reviewedByEmail}
                        </div>
                      ) : selectedProposalAssignment?.assignedStaffEmail && selectedProposalAssignment.assignedStaffEmail !== selectedProposalAssignment.assignedStaffName && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {selectedProposalAssignment.assignedStaffEmail}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: '1 1 150px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Submitted at</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{formatDate(selectedProposalBundle.proposal.createdAt)}</div>
                    </div>
                    <div style={{ flex: '1 1 120px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Review cycle</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>{selectedProposalAssignment ? frequencyLabel(selectedProposalAssignment.frequency) : '-'}</div>
                    </div>
                    <div style={{ flex: '1 1 100px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '6px' }}>Changes</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--role-accent, #2563eb)' }}>{selectedProposalChanges.length} field{selectedProposalChanges.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  {/* Proposed Changes */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Proposed Changes</h4>
                  </div>
                  
                  {selectedProposalChanges.length ? (
                    Object.entries(groupedProposalChanges).map(([section, changes]) => (
                      <div key={section} style={{ marginBottom: '32px', background: 'var(--bg-surface, #fff)', border: '1px solid var(--workspace-muted-border, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', background: 'var(--cds-layer-01, #f8fafc)', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{section}</h5>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--cds-layer-02, #e0e0e0)', padding: '2px 8px', borderRadius: '12px' }}>
                            {changes.length} change{changes.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '25%', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>Field</th>
                                <th style={{ width: '37.5%', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>Current Value</th>
                                <th style={{ width: '37.5%', padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--role-accent, #2563eb)', textTransform: 'uppercase', borderBottom: '1px solid var(--workspace-muted-border, #e2e8f0)', background: 'var(--cds-layer-selected, #eff6ff)' }}>Proposed Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changes.map((change, index) => (
                                <tr key={change.key} style={{ borderBottom: index < changes.length - 1 ? '1px solid var(--workspace-muted-border, #e2e8f0)' : 'none' }}>
                                  <td style={{ padding: '16px', verticalAlign: 'top', borderRight: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{change.label}</div>
                                  </td>
                                  <td style={{ padding: '16px', verticalAlign: 'top', borderRight: '1px solid var(--workspace-muted-border, #e2e8f0)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                      <ValueDisplay value={change.currentValue} />
                                    </div>
                                  </td>
                                  <td style={{ padding: '16px', verticalAlign: 'top', background: 'var(--cds-layer-selected, #eff6ff)' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                      <ValueDisplay value={change.proposedValue} isProposed />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="workspace-empty" style={{ padding: '48px 24px', background: 'var(--cds-layer-01, #f8fafc)', borderRadius: '12px' }}>
                      No changed fields were detected in the loaded proposal payload.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {selectedProposalBundle && (
              <div style={{ padding: '20px 32px', borderTop: '1px solid var(--workspace-muted-border, #e2e8f0)', background: 'var(--bg-surface, #fff)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', flexShrink: 0 }}>
                {!proposalReadOnly && isPendingProposalStatus(selectedProposalBundle.proposal.status) ? (
                  confirmAction ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {confirmAction === 'approve' ? <CheckCircle size={18} color="var(--cds-support-success)" /> : <XCircle size={18} color="var(--cds-support-error)" />}
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {confirmAction === 'approve' ? 'Approve monitoring proposal?' : 'Reject monitoring proposal?'}
                        </strong>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {confirmAction === 'approve'
                          ? 'The proposed values will update the official company profile.'
                          : 'This proposal will be rejected.'}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setConfirmAction(null)} disabled={decisionLoading}>Cancel</button>
                        <button type="button" className={confirmAction === 'approve' ? 'btn btn-primary' : 'btn btn-danger'} onClick={handleProposalDecision} disabled={decisionLoading}>
                          {decisionLoading ? 'Submitting...' : confirmAction === 'approve' ? 'Approve' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button type="button" className="btn btn-danger" onClick={() => setConfirmAction('reject')} disabled={decisionLoading} style={{ background: 'transparent', border: '1px solid var(--cds-support-error)', color: 'var(--cds-support-error)' }}>Reject Proposal</button>
                      <button type="button" className="btn btn-primary" onClick={() => setConfirmAction('approve')} disabled={!canReviewSelected || decisionLoading}>Approve Proposal</button>
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
                      <strong style={{ color: selectedProposalBundle.proposal.status === 'APPROVED' ? 'var(--cds-support-success)' : 'var(--cds-support-error)' }}>
                        {proposalStatusLabel(selectedProposalBundle.proposal.status)}
                      </strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reviewed at</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{formatDate(selectedProposalBundle.proposal.updatedAt)}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Reviewed by</span>
                      <strong style={{ color: 'var(--text-primary)' }}>{selectedProposalBundle.proposal.reviewedBy || 'Manager'}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
};
