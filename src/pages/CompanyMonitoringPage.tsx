import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AssignMonitorModal } from '../components/CompanyMonitoring/AssignMonitorModal';
import { MonitoringReviewDetailsModal } from '../components/Monitoring/MonitoringReviewDetailsModal';
import { EvidenceImagePreviewModal } from '../components/Monitoring/EvidenceImagePreviewModal';
import { AlertTriangle, CheckCircle, Plus, XCircle } from 'lucide-react';
import { api } from '../services/api';
import { useUser, ROLES } from '../context/UserContext';
import { accountApi } from '../API/accountApi';
import { companyMonitoringApi } from '../API/companyMonitoringApi';
import type {
  CompanyMonitoringAssignmentResponse,
  CompanyMonitoringReviewResponse,
  CompanyProfileUpdateProposalResponse,
  ProfileResponse,
  UserSearchResponse,
  FieldEvidence
} from '../types/domain';
import {
  formatDate,
  formatDateTime,
  statusTone,
  proposalTone,
  frequencyLabel,
  reviewResultLabel,
  reviewResultTone,
  proposalStatusLabel,
  collectProposalChanges,
  ValueDisplay,
  type ProposalBundle,
  type ChangeRow
} from '../components/Monitoring/monitoringShared';

export {
  formatDate,
  formatDateTime,
  statusTone,
  proposalTone,
  frequencyLabel,
  reviewResultLabel,
  reviewResultTone,
  proposalStatusLabel,
  collectProposalChanges,
  ValueDisplay,
  type ProposalBundle,
  type ChangeRow
};

type MonitoringTab = 'assignments' | 'pending' | 'history';
export type MonitoringStatusFilter = 'ALL' | 'UNASSIGNED' | 'NOT_ASSIGNED' | 'ACTIVE';
type MonitoringFormState = {
  companyProfileId: string;
  assignedStaffId: string;
};
type StaffCandidate = UserSearchResponse & {
  role?: string;
  roleName?: string;
  name?: string;
};
type ProposalReviewRow = {
  assignment: CompanyMonitoringAssignmentResponse;
  proposalId: string;
};
type MonitoringRow =
  | { kind: 'assignment'; assignment: CompanyMonitoringAssignmentResponse }
  | { kind: 'unassigned'; profile: ProfileResponse };
type MonitoringFieldErrors = {
  company?: string;
  staff?: string;
};

type CompanyMonitoringPageProps = {
  setActivePage?: (page: string, params?: Record<string, string>) => void;
};

const PAGE_SIZE = 10;
const PENDING_PROPOSAL_STATUSES = new Set(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'PENDING']);

const initialForm: MonitoringFormState = {
  companyProfileId: '',
  assignedStaffId: ''
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


const isPendingProposalStatus = (status?: string | null) =>
  PENDING_PROPOSAL_STATUSES.has((status || '').toUpperCase());


export const CompanyMonitoringPage: React.FC<CompanyMonitoringPageProps> = ({ setActivePage }) => {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<MonitoringTab>('assignments');
  const [assignments, setAssignments] = useState<CompanyMonitoringAssignmentResponse[]>([]);
  const [managerProfiles, setManagerProfiles] = useState<ProfileResponse[]>([]);
  const [monitoringHistory, setMonitoringHistory] = useState<CompanyMonitoringReviewResponse[]>([]);
  const [monitoringHistoryTotal, setMonitoringHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [decisionLoading, setDecisionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MonitoringStatusFilter>('ALL');
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
  const [decisionNote, setDecisionNote] = useState('');
  const [evidencePreviewImageId, setEvidencePreviewImageId] = useState<string | null>(null);
  const [proposalBundles, setProposalBundles] = useState<Record<string, ProposalBundle>>({});
  const [assignmentPendingProposalIds, setAssignmentPendingProposalIds] = useState<Record<number, string[]>>({});
  const [form, setForm] = useState<MonitoringFormState>(initialForm);

  const [staffQuery, setStaffQuery] = useState('');
  const [fieldTouched, setFieldTouched] = useState({
    company: false,
    staff: false
  });
  const [selectedCompany, setSelectedCompany] = useState<ProfileResponse | null>(null);

  const [staffSuggestions, setStaffSuggestions] = useState<StaffCandidate[]>([]);
  const [staffSuggestionsOpen, setStaffSuggestionsOpen] = useState(false);
  const [staffSearchLoading, setStaffSearchLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffCandidate | null>(null);

  const staffFieldRef = useRef<HTMLLabelElement | null>(null);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isManager = currentUser?.role === ROLES.MANAGER || (currentUser?.role as string) === 'BUSINESS_DEVELOPMENT_MANAGER';
      const [assignmentsRes, profilesRes] = await Promise.all([
        companyMonitoringApi.getAllAssignments({
          page: 0,
          size: 500,
          sort: 'updatedAt,desc'
        }),
        api.get('/profiles', {
          params: {
            excludeOwner: true,
            managedByMe: isManager ? true : undefined,
            page: 0,
            size: 500
          }
        })
      ]);
      
      setAssignments(assignmentsRes.content || []);
      
      const profileData = (profilesRes as any).data || profilesRes;
      let items: ProfileResponse[] = [];
      if (Array.isArray(profileData)) items = profileData;
      else if (profileData && Array.isArray(profileData.content)) items = profileData.content;
      else if (profileData && Array.isArray(profileData.data)) items = profileData.data;
      
      setManagerProfiles(items);
    } catch (err) {
      console.error('Failed to load monitoring assignments and profiles', err);
      setError('Unable to load monitoring assignments from backend.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

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

  // Compute unified unassigned and assigned rows
  const unassignedProfiles = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.companyProfileId));
    return managerProfiles.filter(p => {
      const isApproved = p.reviewStatus === 'APPROVED';
      const isCurrentlyResponsible = currentUser?.role === ROLES.ADMIN
        || p.isCurrentResponsibleManager === true
        || (currentUser?.id && p.responsibleManagerId === currentUser.id);
      return isApproved && isCurrentlyResponsible && !assignedIds.has(p.id) && !assignedIds.has(p.companyId || '');
    });
  }, [assignments, managerProfiles, currentUser]);

  const monitoringRows = useMemo<MonitoringRow[]>(() => {
    const rows: MonitoringRow[] = [];
    unassignedProfiles.forEach(profile => rows.push({ kind: 'unassigned', profile }));
    assignments.forEach(assignment => rows.push({ kind: 'assignment', assignment }));
    return rows;
  }, [unassignedProfiles, assignments]);

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
      const target = event.target as Node;
      if (staffFieldRef.current && !staffFieldRef.current.contains(target)) {
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
  }, [search, statusFilter]);

  useEffect(() => {
    const valid: string[] = ['ALL', 'UNASSIGNED', 'NOT_ASSIGNED', 'ACTIVE'];
    if (!valid.includes(statusFilter)) {
      setStatusFilter('ALL');
    }
  }, [statusFilter]);

  useEffect(() => {
    setProposalPage(1);
  }, [proposalSearch]);

  const resetAssignmentForm = () => {
    setForm(initialForm);
    setStaffQuery('');
    setSelectedCompany(null);
    setSelectedStaff(null);
    setStaffSuggestions([]);
    setStaffSuggestionsOpen(false);
    setFieldTouched({ company: false, staff: false });
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
    return errors;
  }, [fieldTouched, form.assignedStaffId, form.companyProfileId]);


  const selectCompany = (profile: ProfileResponse) => {
    setSelectedCompany(profile);
    setForm((current) => ({ ...current, companyProfileId: profile.id }));
    setFieldTouched((current) => ({ ...current, company: true }));
  };

  const selectStaff = (staff: StaffCandidate) => {
    setSelectedStaff(staff);
    setStaffQuery(staff.email);
    setForm((current) => ({ ...current, assignedStaffId: String(staff.id) }));
    setFieldTouched((current) => ({ ...current, staff: true }));
    setStaffSuggestionsOpen(false);
  };

  const openCreateModal = (profile: ProfileResponse) => {
    setSelectedAssignment(null);
    resetAssignmentForm();
    selectCompany(profile);
    setShowCreateModal(true);
  };

  const openProfile = (profileId: string) => {
    localStorage.setItem('apms-selected-company', profileId);
    localStorage.setItem('apms-back-page', 'company-monitoring');
    localStorage.removeItem('apms-context-project');
    setActivePage?.(`company-detail?source=monitoring&companyId=${profileId}`);
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
      assignedStaffId: String(assignment.assignedStaffId)
    });
    setSelectedCompany(company);
    setSelectedStaff(staff);
    setStaffQuery(assignment.assignedStaffEmail);
    setFieldTouched({ company: false, staff: false });
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

    if (!form.companyProfileId || !form.assignedStaffId) {
      setFormError('Please select a company and a staff member.');
      return;
    }

    try {
      setSaving(true);
      if (selectedAssignment) {
        await companyMonitoringApi.updateAssignment(selectedAssignment.id, {
          assignedStaffId: Number(form.assignedStaffId)
        });
        closeModal();
        await refreshAfterMutation('Monitoring assignment updated.');
      } else {
        await companyMonitoringApi.assignMonitor({
          companyProfileId: form.companyProfileId,
          assignedStaffId: Number(form.assignedStaffId)
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



  const handleProposalDecision = async () => {
    if (!selectedProposalId || !confirmAction) return;

    try {
      setDecisionLoading(true);
      setDecisionError(null);
      const updated =
        confirmAction === 'approve'
          ? await companyMonitoringApi.approveProfileUpdateProposal(selectedProposalId, decisionNote || undefined)
          : await companyMonitoringApi.rejectProfileUpdateProposal(selectedProposalId, decisionNote || undefined);

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
      setDecisionNote('');
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

  const filteredRows = useMemo(() => {
    return monitoringRows.filter((row) => {
      const isUnassigned = row.kind === 'unassigned';
      const companyName = isUnassigned ? profileName(row.profile) : row.assignment.companyName;
      
      if (search) {
        const term = search.toLowerCase();
        if (isUnassigned) {
          if (!companyName?.toLowerCase().includes(term)) return false;
        } else {
          if (
            !companyName?.toLowerCase().includes(term) &&
            !row.assignment.assignedStaffEmail?.toLowerCase().includes(term) &&
            !row.assignment.assignedStaffName?.toLowerCase().includes(term)
          ) return false;
        }
      }

      if (statusFilter !== 'ALL') {
        const isNotAssignedFilter = statusFilter === 'UNASSIGNED' || statusFilter === 'NOT_ASSIGNED';
        if (isUnassigned) {
          if (!isNotAssignedFilter) return false;
        } else {
          if (isNotAssignedFilter) return false;
          const matches = row.assignment.assignmentStatus === statusFilter ||
            row.assignment.displayStatus === statusFilter;
          if (!matches) return false;
        }
      }

      return true;
    });
  }, [monitoringRows, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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

  const pendingPages = Math.max(1, Math.ceil(filteredPendingRows.length / PAGE_SIZE));
  const currentPending = filteredPendingRows.slice((proposalPage - 1) * PAGE_SIZE, proposalPage * PAGE_SIZE);
  const historyPages = Math.max(1, Math.ceil(monitoringHistoryTotal / PAGE_SIZE));
  const currentHistory = monitoringHistory;

  const metrics = useMemo(() => {
    const active = assignments.filter((item) => item.assignmentStatus === 'ACTIVE').length;
    const paused = assignments.filter((item) => item.assignmentStatus === 'PAUSED').length;
    return { active, paused, unassigned: unassignedProfiles.length };
  }, [assignments, unassignedProfiles.length]);

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
    setDecisionNote('');
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
    if (!proposalId || !status) return <span className="project-status-badge neutral">No proposal</span>;

    if (isPendingProposalStatus(status)) {
      return (
        <button
          type="button"
          className={`project-status-badge ${proposalTone(status)} monitoring-proposal-badge`}
          style={{ cursor: 'pointer', borderStyle: 'dashed' }}
          onClick={() => {
            setActiveTab('pending');
            openProposalReview(proposalId);
          }}
        >
          {status}
        </button>
      );
    }

    return <span className={`project-status-badge ${proposalTone(status)}`}>{status}</span>;
  };

  const renderUnassignedRow = (profile: ProfileResponse, index: number) => {
    const profileKey = profile.id || profile.companyId;
    return (
      <tr key={profileKey}>
        <td className="col-mono">{index + 1}</td>
        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong className="project-name-primary" title={profileName(profile)}>{profileName(profile)}</strong>
        </td>
        <td><span style={{ color: 'var(--text-muted)' }}>&mdash;</span></td>
        <td>
          <span className="project-status-badge danger">Not Assigned</span>
        </td>
        <td><span style={{ color: 'var(--text-muted)' }}>&mdash;</span></td>
        <td>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button type="button" className="project-detail-btn" onClick={() => openProfile(profileKey)}>
              View Profile
            </button>
            <button
              type="button"
              className="project-detail-btn primary"
              onClick={() => openCreateModal(profile)}
            >
              Assign Monitor
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderAssignmentRow = (assignment: CompanyMonitoringAssignmentResponse, index: number) => (
    <tr key={assignment.id}>
      <td className="col-mono">{index + 1}</td>
      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <strong className="project-name-primary" title={assignment.companyName}>{assignment.companyName}</strong>
      </td>
      <td>
        {assignment.assignedStaffName && assignment.assignedStaffName !== assignment.assignedStaffEmail ? (
          <>
            <strong style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{assignment.assignedStaffName}</strong>
            <br />
            <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{assignment.assignedStaffEmail}</small>
          </>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{assignment.assignedStaffEmail}</span>
        )}
      </td>
      <td>
        <span className={`project-status-badge ${statusTone(assignment.assignmentStatus)}`}>
          {assignment.assignmentStatus}
        </span>
      </td>
      <td>{renderProposalBadge(assignment)}</td>
      <td>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button type="button" className="project-detail-btn" onClick={() => openProfile(assignment.companyProfileId)}>
            View Profile
          </button>
          <button type="button" className="project-detail-btn" onClick={() => openManageModal(assignment)}>
            Manage
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
        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong className="project-name-primary" title={assignment.companyName}>{assignment.companyName}</strong>
        </td>
        <td>
          {assignment.assignedStaffName && assignment.assignedStaffName !== assignment.assignedStaffEmail ? (
            <>
              <strong style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{assignment.assignedStaffName}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{assignment.assignedStaffEmail}</small>
            </>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{assignment.assignedStaffEmail}</span>
          )}
        </td>
        <td>
          <span className={`project-status-badge ${proposalTone(status)}`}>{status}</span>
        </td>
        <td>
          <span className="project-list-date">{bundle ? formatDate(bundle.proposal.createdAt) : '—'}</span>
          <br />
          <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{changes === null ? 'Loading...' : `${changes} changed fields`}</small>
        </td>
        <td>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button type="button" className="project-detail-btn" onClick={() => openProfile(assignment.companyProfileId)}>
              View Profile
            </button>
            <button
              type="button"
              className="project-detail-btn primary"
              onClick={() => openProposalReview(proposalId)}
            >
              Review
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const renderHistoryRow = (review: CompanyMonitoringReviewResponse) => {
    const reviewerName = review.reviewedByName || review.reviewedByEmail || '—';
    const reviewerEmail = review.reviewedByEmail;
    const proposalStatus = review.result === 'NO_CHANGE' ? null : review.proposalStatus;

    return (
      <tr key={review.id}>
        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <strong className="project-name-primary" title={review.companyName || review.companyProfileId}>{review.companyName || review.companyProfileId}</strong>
        </td>
        <td>
          {reviewerEmail && reviewerEmail !== reviewerName ? (
            <>
              <strong style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{reviewerName}</strong>
              <br />
              <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{reviewerEmail}</small>
            </>
          ) : (
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{reviewerName}</span>
          )}
        </td>
        <td>
          <span className={`project-status-badge ${reviewResultTone(review.result)}`}>
            {reviewResultLabel(review.result)}
          </span>
        </td>
        <td>
          {proposalStatus ? (
            <span className={`project-status-badge ${proposalTone(proposalStatus)}`}>
              {proposalStatusLabel(proposalStatus)}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>&mdash;</span>
          )}
        </td>
        <td>
          <span className="project-list-date">{formatDateTime(review.reviewedAt)}</span>
        </td>
        <td>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button type="button" className="project-detail-btn" onClick={() => openProfile(review.companyProfileId)}>
              View Profile
            </button>
            <button
              type="button"
              className="project-detail-btn"
              onClick={() => setSelectedHistoryReview(review)}
            >
              View Detail
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <section className="workspace-page role-dashboard role-dashboard-manager manager-page monitoring-page" id="page-monitoring-management">
      <div className="workspace-main-full">
        <div className="workspace-page-head">
          <div>
            <h1>Monitoring Management</h1>
            <p style={{ marginTop: '2px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Manage company monitoring assignments and reviews
            </p>
          </div>
        </div>

        {toast && <div className="admin-toast success">{toast}</div>}
        {error && <div className="admin-toast danger">{error}</div>}
        {proposalError && <div className="admin-toast danger">{proposalError}</div>}
        {historyError && <div className="admin-toast danger">{historyError}</div>}

        <div className="workspace-focus-card">
          <div className="workspace-focus-metrics">
            <article>
              <strong>{metrics.unassigned}</strong>
              <span>Awaiting Assignment</span>
            </article>
            <article>
              <strong>{metrics.active}</strong>
              <span>Active Monitoring</span>
            </article>
            <article>
              <strong>{pendingReviewRows.length}</strong>
              <span>Pending Reviews</span>
            </article>
          </div>
        </div>

        <div className="manager-project-container">
          <div className="monitoring-tabs">
            <button
              type="button"
              className={`monitoring-tab ${activeTab === 'assignments' ? 'active' : ''}`}
              onClick={() => setActiveTab('assignments')}
            >
              Monitoring
              <span className="monitoring-tab-count">{monitoringRows.length}</span>
            </button>
            <button
              type="button"
              className={`monitoring-tab ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Reviews
              <span className="monitoring-tab-count">{pendingReviewRows.length}</span>
            </button>
            <button
              type="button"
              className={`monitoring-tab ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Monitoring History
              <span className="monitoring-tab-count">{monitoringHistoryTotal}</span>
            </button>
          </div>

          {activeTab === 'assignments' && (
            <>
              <div className="manager-project-filters">
                <input
                  className="search-input"
                  placeholder="Search company or staff..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="search-input"
                  value={['ALL', 'UNASSIGNED', 'NOT_ASSIGNED', 'ACTIVE'].includes(statusFilter) ? statusFilter : 'ALL'}
                  onChange={(event) => {
                    const next = event.target.value as MonitoringStatusFilter;
                    if (next === 'UNASSIGNED' || next === 'NOT_ASSIGNED' || next === 'ACTIVE') {
                      setStatusFilter(next);
                    } else {
                      setStatusFilter('ALL');
                    }
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="UNASSIGNED">Not Assigned</option>
                  <option value="ACTIVE">Active</option>
                </select>
              </div>

              <div className="manager-project-table-scroll">
                <div className="manager-project-table-inner">
                  <table className="monitoring-table">
                    <thead>
                      <tr>
                        <th className="col-mono">#</th>
                        <th>Company</th>
                        <th>Assigned Staff</th>
                        <th>Status</th>
                        <th>Proposal</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="project-table-empty">
                            <p className="project-table-empty-title">Loading monitoring assignments...</p>
                          </td>
                        </tr>
                      ) : currentRows.length ? (
                        currentRows.map((row, index) =>
                          row.kind === 'unassigned' 
                            ? renderUnassignedRow(row.profile, (currentPage - 1) * PAGE_SIZE + index)
                            : renderAssignmentRow(row.assignment, (currentPage - 1) * PAGE_SIZE + index)
                        )
                      ) : (
                        <tr>
                          <td colSpan={6} className="project-table-empty">
                            <p className="project-table-empty-title">No monitoring assignments found.</p>
                            <p className="project-table-empty-desc">Try adjusting your search or filters.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="project-table-pagination">
                <span>
                  Showing {filteredRows.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–
                  {Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}
                </span>
                <div>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    First
                  </button>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`workspace-page-btn ${currentPage === index + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(index + 1)}
                      disabled={filteredRows.length === 0}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'pending' && (
            <>
              <div className="manager-project-filters" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
                <input
                  className="search-input"
                  placeholder="Search company, staff, or proposal ID..."
                  value={proposalSearch}
                  onChange={(event) => setProposalSearch(event.target.value)}
                />
                {proposalLoading && (
                  <span className="project-status-badge info" style={{ alignSelf: 'center' }}>
                    Loading proposals...
                  </span>
                )}
              </div>

              <div className="manager-project-table-scroll">
                <div className="manager-project-table-inner">
                  <table className="monitoring-table">
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
                          <td colSpan={5} className="project-table-empty">
                            <p className="project-table-empty-title">No pending monitoring proposals found.</p>
                            <p className="project-table-empty-desc">Proposals submitted by staff will appear here for review.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="project-table-pagination">
                <span>
                  Showing {filteredPendingRows.length ? (proposalPage - 1) * PAGE_SIZE + 1 : 0}–
                  {Math.min(proposalPage * PAGE_SIZE, filteredPendingRows.length)} of {filteredPendingRows.length}
                </span>
                <div>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={proposalPage === 1}
                    onClick={() => setProposalPage(1)}
                  >
                    First
                  </button>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={proposalPage === 1}
                    onClick={() => setProposalPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </button>
                  {Array.from({ length: pendingPages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`workspace-page-btn ${proposalPage === index + 1 ? 'active' : ''}`}
                      onClick={() => setProposalPage(index + 1)}
                      disabled={filteredPendingRows.length === 0}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={proposalPage >= pendingPages}
                    onClick={() => setProposalPage((page) => Math.min(pendingPages, page + 1))}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={proposalPage >= pendingPages}
                    onClick={() => setProposalPage(pendingPages)}
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              {historyLoading && (
                <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
                  <span className="project-status-badge info">Loading history...</span>
                </div>
              )}

              <div className="manager-project-table-scroll">
                <div className="manager-project-table-inner">
                  <table className="monitoring-table">
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
                          <td colSpan={6} className="project-table-empty">
                            <p className="project-table-empty-title">Loading monitoring history...</p>
                          </td>
                        </tr>
                      ) : currentHistory.length ? (
                        currentHistory.map((row) => renderHistoryRow(row))
                      ) : (
                        <tr>
                          <td colSpan={6} className="project-table-empty">
                            <p className="project-table-empty-title">No monitoring history yet.</p>
                            <p className="project-table-empty-desc">Completed monitoring reviews will appear here.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="project-table-pagination">
                <span>
                  Showing {monitoringHistoryTotal ? (historyPage - 1) * PAGE_SIZE + 1 : 0}–
                  {Math.min(historyPage * PAGE_SIZE, monitoringHistoryTotal)} of {monitoringHistoryTotal}
                </span>
                <div>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage(1)}
                  >
                    First
                  </button>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={historyPage === 1}
                    onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                  >
                    Prev
                  </button>
                  {Array.from({ length: historyPages }, (_, index) => (
                    <button
                      key={index}
                      type="button"
                      className={`workspace-page-btn ${historyPage === index + 1 ? 'active' : ''}`}
                      onClick={() => setHistoryPage(index + 1)}
                      disabled={monitoringHistoryTotal === 0}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={historyPage >= historyPages}
                    onClick={() => setHistoryPage((page) => Math.min(historyPages, page + 1))}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className="workspace-page-btn"
                    disabled={historyPage >= historyPages}
                    onClick={() => setHistoryPage(historyPages)}
                  >
                    Last
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AssignMonitorModal
        isOpen={showCreateModal}
        onClose={closeModal}
        onSuccess={loadAssignments}
        selectedCompany={selectedCompany}
        selectedAssignment={selectedAssignment}
      />

      {selectedHistoryReview && (
        <MonitoringReviewDetailsModal 
          review={selectedHistoryReview} 
          bundle={historyProposalBundle} 
          onClose={() => setSelectedHistoryReview(null)} 
        />
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
                                <React.Fragment key={change.key}>
                                  <tr style={{ borderBottom: change.evidence ? 'none' : (index < changes.length - 1 ? '1px solid var(--workspace-muted-border, #e2e8f0)' : 'none') }}>
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
                                  {change.evidence && (
                                    <tr style={{ borderBottom: index < changes.length - 1 ? '1px solid var(--workspace-muted-border, #e2e8f0)' : 'none' }}>
                                      <td colSpan={3} style={{ padding: '0 16px 16px 16px', background: 'var(--cds-layer-selected, #eff6ff)' }}>
                                        <div style={{ marginTop: '12px', padding: '12px', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #bae6fd', fontSize: '0.85rem' }}>
                                          <div style={{ fontWeight: 600, color: '#0369a1', marginBottom: '8px' }}>Supporting Evidence</div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {change.evidence.evidenceSource && (
                                              <div>
                                                <strong style={{ color: '#075985' }}>Source:</strong>{' '}
                                                <a href={change.evidence.evidenceSource} target="_blank" rel="noreferrer" style={{ color: '#0284c7' }}>
                                                  {change.evidence.evidenceSource}
                                                </a>
                                              </div>
                                            )}
                                            {change.evidence.evidenceScript && (
                                              <div>
                                                <strong style={{ color: '#075985' }}>Explanation:</strong>{' '}
                                                <span style={{ color: '#0c4a6e' }}>{change.evidence.evidenceScript}</span>
                                              </div>
                                            )}
                                            {change.evidence.evidenceImageId && (
                                               <div>
                                                 <strong style={{ color: '#075985' }}>Image Attached:</strong>{' '}
                                                 <span style={{ color: '#059669' }}>
                                                   <button
                                                     type="button"
                                                     onClick={(e) => {
                                                       e.preventDefault();
                                                       e.stopPropagation();
                                                       setEvidencePreviewImageId(change.evidence?.evidenceImageId || null);
                                                     }}
                                                     style={{
                                                       background: 'none',
                                                       border: 'none',
                                                       padding: 0,
                                                       color: '#0284c7',
                                                       textDecoration: 'underline',
                                                       cursor: 'pointer',
                                                       fontSize: 'inherit',
                                                       fontFamily: 'inherit'
                                                     }}
                                                   >
                                                     [ View Image ]
                                                   </button>
                                                 </span>
                                               </div>
                                             )}
                                            {!change.evidence?.evidenceSource && !change.evidence?.evidenceScript && !change.evidence?.evidenceImageId && (
                                              <div style={{ color: '#0c4a6e' }}>No supporting evidence provided.</div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
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
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Reason / Decision Note (optional)</label>
                        <textarea
                          value={decisionNote}
                          onChange={(e) => setDecisionNote(e.target.value)}
                          placeholder={confirmAction === 'approve' ? 'Add an optional note to this approval...' : 'Add an optional note for why this was rejected...'}
                          style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--workspace-muted-border, #e2e8f0)',
                            fontSize: '0.9rem',
                            resize: 'vertical',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
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
      <EvidenceImagePreviewModal
        imageId={evidencePreviewImageId}
        onClose={() => setEvidencePreviewImageId(null)}
      />
    </section>
  );
};