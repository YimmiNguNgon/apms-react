import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  ChevronDown,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Gauge,
  Globe2,
  Info,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RotateCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  XCircle,
} from 'lucide-react';
import { roleEvaluationApi } from '../API/roleEvaluationApi';
import { API_BASE_URL, api } from '../services/api';
import {
  canManagerReviewEvaluation,
  canStaffEditEvaluation,
  isNumericEvaluationRole,
  roleEvaluationRoleLabel,
  roleEvaluationStatusLabel,
  shouldPollEvaluation,
} from '../utils/roleEvaluationStatus';
import type {
  ProjectResponse,
  ProjectTaskResponse,
  ProfileResponse,
  RoleAutomaticSuggestion,
  RoleEvaluationDraftResponse,
  RoleEvaluationPreviewResponse,
  RoleEvaluationReadinessResponse,
  RoleScoreCriterionRule,
  RoleScoreRuleSetResponse,
  RoleScoreSnapshotResponse,
  ScoreRole,
  WorkbenchDocumentResponse,
} from '../types/domain';
import styles from './RoleEvaluationWorkspace.module.css';

type Mode = 'staff' | 'manager';

interface RoleEvaluationWorkspaceProps {
  mode: Mode;
  project: ProjectResponse | null;
  task: ProjectTaskResponse;
  documents?: WorkbenchDocumentResponse[];
  canEdit?: boolean;
  documentsLoading?: boolean;
  uploadingEvidence?: boolean;
  onUploadEvidence?: (file: File | null) => void | Promise<void>;
  managerComment?: string;
  onManagerCommentChange?: (value: string) => void;
  onSubmitted?: () => void | Promise<void>;
  onReviewed?: () => void | Promise<void>;
}

type CriterionDraft = {
  rawScore: string;
  explanation: string;
  evidenceIds: string[];
};

type EvaluationStep = 'overview' | 'profile' | 'criteria' | 'preview' | 'decision';

const roleFromRelationship = (value?: string | null): ScoreRole | null => {
  switch (value) {
    case 'COMPETITOR_OF':
      return 'COMPETITOR';
    case 'PARTNER_WITH':
      return 'PARTNER';
    case 'POTENTIAL_PARTNER_OF':
      return 'POTENTIAL_PARTNER';
    case 'CUSTOMER_OF':
      return 'CUSTOMER';
    case 'SUPPLIER_OF':
      return 'SUPPLIER';
    default:
      return null;
  }
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const clampScore = (value: unknown) => {
  const numeric = toNumber(value);
  if (numeric === null) return null;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const percent = (value: unknown) => {
  const numeric = toNumber(value);
  if (numeric === null) return 'N/A';
  return `${Math.round(numeric)}%`;
};

const readinessTone = (value?: string | null) => {
  if (value === 'COMPLETE' || value === 'SUFFICIENT') return styles.good;
  if (value === 'PARTIAL' || value === 'PARTIALLY_SUFFICIENT') return styles.warn;
  if (value === 'INCOMPLETE' || value === 'INSUFFICIENT') return styles.bad;
  return styles.neutral;
};

const statusTone = (value?: string | null) => {
  if (value === 'APPROVED' || value === 'DONE') return styles.good;
  if (value === 'REJECTED' || value === 'APPROVAL_FAILED') return styles.bad;
  if (value === 'REVISION_REQUIRED' || value === 'APPROVAL_PROCESSING') return styles.warn;
  return styles.neutral;
};

const sortCriteria = (criteria: RoleScoreCriterionRule[]) =>
  [...criteria].sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

const suggestionText = (suggestion?: RoleAutomaticSuggestion) =>
  suggestion?.explanation || suggestion?.suggestionRationale || 'No AI rationale generated yet.';

const cleanList = (items?: Array<string | null | undefined>) =>
  (items || []).filter((item): item is string => Boolean(item?.trim()));

const websiteHref = (value?: string | null) => {
  const website = value?.trim();
  if (!website) return null;
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return 'Size N/A';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const documentTypeLabel = (document: WorkbenchDocumentResponse) => {
  const type = document.mimeType || document.sourceType || document.inputType || 'Document';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('word') || type.includes('doc')) return 'DOC';
  if (type.includes('sheet') || type.includes('excel')) return 'XLS';
  if (type.includes('image')) return 'IMG';
  return String(type).replace(/^.*\//, '').toUpperCase();
};

const aiProgressLabel = (progress: number) => {
  if (progress >= 100) return 'AI suggestion completed.';
  if (progress >= 76) return 'Preparing score suggestion and explanation...';
  if (progress >= 52) return 'Comparing evidence with scoring criteria...';
  if (progress >= 28) return 'Reading selected evidence documents...';
  return 'Starting AI analysis...';
};

const aiOutcomeMessage = (outcome?: string) => {
  switch (outcome) {
    case 'GENERATED':
      return 'AI suggestion generated.';
    case 'ALREADY_GENERATED':
      return 'AI suggestion already exists for this evidence set.';
    case 'STALE_GENERATION':
      return 'AI suggestion was generated, but the draft changed during processing. Please refresh and analyze again.';
    case 'NEEDS_MORE_DATA':
      return 'AI needs more data for this criterion. Tick more relevant documents, then analyze again.';
    case 'NO_EVIDENCE_SELECTED':
    case 'NO_SOURCES_PINNED':
      return 'Please tick at least one evidence document before using AI.';
    default:
      return outcome ? `AI finished with status: ${outcome}.` : 'AI suggestion generated.';
  }
};

const profileName = (profile?: ProfileResponse | null, fallback?: string | null) =>
  profile?.identity?.tradeName || profile?.identity?.legalName || fallback || 'Target company';

const buildCriterionDrafts = (draft: RoleEvaluationDraftResponse | null, rules: RoleScoreCriterionRule[]) => {
  const keys = new Set([
    ...rules.map((rule) => rule.criterionKey),
    ...Object.keys(draft?.criterionInputs || {}),
    ...Object.keys(draft?.automaticSuggestions || {}),
  ]);

  return Array.from(keys).reduce<Record<string, CriterionDraft>>((acc, key) => {
    const input = draft?.criterionInputs?.[key];
    const linkedEvidenceIds = draft?.criterionEvidence?.[key]?.map((item) => item.evidenceId).filter(Boolean) || [];
    acc[key] = {
      rawScore: input?.rawScore !== null && input?.rawScore !== undefined ? String(input.rawScore) : '',
      explanation: input?.explanation || '',
      evidenceIds: Array.from(new Set([...(input?.evidenceIds || []), ...linkedEvidenceIds])),
    };
    return acc;
  }, {});
};

export const RoleEvaluationWorkspace: React.FC<RoleEvaluationWorkspaceProps> = ({
  mode,
  project,
  task,
  documents = [],
  canEdit = false,
  documentsLoading = false,
  uploadingEvidence = false,
  onUploadEvidence,
  managerComment = '',
  onManagerCommentChange,
  onSubmitted,
  onReviewed,
}) => {
  const [drafts, setDrafts] = useState<RoleEvaluationDraftResponse[]>([]);
  const [draft, setDraft] = useState<RoleEvaluationDraftResponse | null>(null);
  const [ruleSets, setRuleSets] = useState<RoleScoreRuleSetResponse[]>([]);
  const [readiness, setReadiness] = useState<RoleEvaluationReadinessResponse | null>(null);
  const [preview, setPreview] = useState<RoleEvaluationPreviewResponse | null>(null);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [officialScores, setOfficialScores] = useState<RoleScoreSnapshotResponse[]>([]);
  const [criterionDrafts, setCriterionDrafts] = useState<Record<string, CriterionDraft>>({});
  const [activeCriterion, setActiveCriterion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState('');
  const [activeStep, setActiveStep] = useState<EvaluationStep>('overview');
  const [evidenceSearch, setEvidenceSearch] = useState('');
  const [evidenceType, setEvidenceType] = useState('ALL');
  const [openCriteria, setOpenCriteria] = useState<Set<string>>(new Set());
  const [aiProgress, setAiProgress] = useState<Record<string, number>>({});

  const expectedRole = roleFromRelationship(project?.targetRelationshipType);
  const activeRole = draft?.evaluatedRole || expectedRole;
  const ruleSet = useMemo(() => {
    const exact = ruleSets.find((item) => item.evaluatedRole === activeRole && item.active !== false);
    return exact || ruleSets.find((item) => item.evaluatedRole === activeRole) || ruleSets[0] || null;
  }, [activeRole, ruleSets]);
  const criteria = useMemo(() => sortCriteria(ruleSet?.criteria || []), [ruleSet?.criteria]);
  const effectiveCriteria = useMemo(() => {
    if (criteria.length > 0) return criteria;
    const keys = new Set([
      ...Object.keys(draft?.criterionInputs || {}),
      ...Object.keys(draft?.automaticSuggestions || {}),
      ...Object.keys(draft?.criterionEvidence || {}),
    ]);
    return Array.from(keys).map((key, index) => ({
      criterionKey: key,
      criterionName: key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      displayOrder: index + 1,
      weight: null,
      direction: null,
      required: true,
    }));
  }, [criteria, draft]);
  const selectedCriterion = effectiveCriteria.find((item) => item.criterionKey === activeCriterion) || effectiveCriteria[0] || null;
  const selectedKey = selectedCriterion?.criterionKey;
  const numericRole = isNumericEvaluationRole(activeRole);
  const editable = mode === 'staff' && canStaffEditEvaluation(draft?.status, canEdit);
  const managerCanReview = mode === 'manager' && canManagerReviewEvaluation(draft?.status);

  const steps = useMemo<Array<{ key: EvaluationStep; label: string; note: string }>>(() => {
    if (mode === 'manager') {
      return [
        { key: 'overview', label: 'Overview', note: 'Task and submission context' },
        { key: 'profile', label: 'Profile', note: 'Official company profile' },
        { key: 'criteria', label: 'Criteria', note: 'Staff score and evidence' },
        { key: 'decision', label: 'Decision', note: 'Approve, revise, or reject' },
      ];
    }
    return [
      { key: 'profile', label: 'Profile', note: 'Review official company data' },
      { key: 'criteria', label: 'Evidence', note: 'Score, explain, attach evidence, use AI' },
      { key: 'preview', label: 'Submit', note: 'Review and send to Manager' },
    ];
  }, [mode]);

  const attachedEvidenceCount = useMemo(
    () => Object.values(draft?.criterionEvidence || {}).reduce((total, items) => total + items.length, 0),
    [draft?.criterionEvidence]
  );
  const readinessBlockingCriteria = useMemo(
    () => effectiveCriteria.filter((criterion) => {
      const status = readiness?.criterionResults?.[criterion.criterionKey]?.sufficiencyStatus;
      return status === 'INCOMPLETE';
    }),
    [effectiveCriteria, readiness?.criterionResults]
  );
  const staffSubmissionMissingCriteria = useMemo(
    () => effectiveCriteria.filter((criterion) => {
      const input = draft?.criterionInputs?.[criterion.criterionKey];
      const evidenceCount = draft?.criterionEvidence?.[criterion.criterionKey]?.length || 0;
      const hasScore = numericRole ? input?.rawScore !== null && input?.rawScore !== undefined : Boolean(input?.explanation);
      return !hasScore || !input?.explanation || evidenceCount === 0;
    }),
    [draft?.criterionEvidence, draft?.criterionInputs, effectiveCriteria, numericRole]
  );
  const staffReadyToSubmit = staffSubmissionMissingCriteria.length === 0 && effectiveCriteria.length > 0;

  const completion = useMemo(() => {
    if (effectiveCriteria.length === 0) return 0;
    const done = effectiveCriteria.filter((criterion) => {
      const input = draft?.criterionInputs?.[criterion.criterionKey];
      if (numericRole) return input?.rawScore !== null && input?.rawScore !== undefined && Boolean(input?.explanation);
      return Boolean(input?.explanation || draft?.automaticSuggestions?.[criterion.criterionKey]?.explanation);
    }).length;
    return Math.round((done / effectiveCriteria.length) * 100);
  }, [draft, effectiveCriteria, numericRole]);

  const currentStepIndex = Math.max(0, steps.findIndex((step) => step.key === activeStep));

  useEffect(() => {
    if (steps.some((step) => step.key === activeStep)) return;
    setActiveStep(steps[0]?.key || 'overview');
  }, [activeStep, steps]);

  useEffect(() => {
    if (activeStep !== 'criteria' || openCriteria.size > 0 || effectiveCriteria.length === 0) return;
    setOpenCriteria(new Set([effectiveCriteria[0].criterionKey]));
  }, [activeStep, effectiveCriteria, openCriteria.size]);

  useEffect(() => {
    if (!actionLoading?.startsWith('suggest-')) return;
    const key = actionLoading.replace('suggest-', '');
    setAiProgress((current) => ({ ...current, [key]: Math.max(current[key] || 0, 8) }));
    const interval = window.setInterval(() => {
      setAiProgress((current) => {
        const value = current[key] || 8;
        if (value >= 92) return current;
        const next = Math.min(92, value + (value < 45 ? 9 : value < 75 ? 5 : 2));
        return { ...current, [key]: next };
      });
    }, 650);
    return () => window.clearInterval(interval);
  }, [actionLoading]);

  const stepDone = (step: EvaluationStep) => {
    if (!draft) return step === 'overview';
    if (step === 'overview') return true;
    if (step === 'profile') return Boolean(project?.targetCompanyProfileId || draft.targetProfileDocumentId || draft.targetCompanyId);
    if (step === 'criteria') return completion === 100 && attachedEvidenceCount > 0;
    if (step === 'preview') return draft.status !== 'DRAFT' || Boolean(preview);
    if (step === 'decision') return draft.status === 'APPROVED' || draft.status === 'REJECTED' || draft.status === 'REVISION_REQUIRED';
    return false;
  };

  const goToAdjacentStep = (direction: 1 | -1) => {
    const next = steps[currentStepIndex + direction];
    if (next) setActiveStep(next.key);
  };

  const loadAll = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const role = roleFromRelationship(project?.targetRelationshipType) || undefined;
      const [draftPayload, rulePayload] = await Promise.all([
        roleEvaluationApi.getTaskDrafts(task.projectId, task.id),
        roleEvaluationApi.getRuleSets(role),
      ]);
      const taskDrafts = draftPayload.data || [];
      const latest = taskDrafts[0] || null;
      setDrafts(taskDrafts);
      setDraft(latest);
      setRuleSets(rulePayload.data || []);

      if (latest) {
        await loadDerived(latest);
      } else {
        setReadiness(null);
        setPreview(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot load role evaluation workspace.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadDerived = async (currentDraft: RoleEvaluationDraftResponse) => {
    setCriterionDrafts(buildCriterionDrafts(currentDraft, ruleSet?.criteria || []));
    setActiveCriterion((current) => current || Object.keys(currentDraft.criterionInputs || currentDraft.automaticSuggestions || {})[0] || null);
    setOfficialScores([]);
    setProfile(null);

    const calls: Array<Promise<void>> = [
      roleEvaluationApi.calculatePreview(currentDraft.id)
        .then((payload) => setPreview(payload.data))
        .catch(() => setPreview(null)),
    ];

    calls.push(
      roleEvaluationApi.getReadiness(currentDraft.id)
        .then((payload) => setReadiness(payload.data))
        .catch((err) => {
          setReadiness(null);
          if (currentDraft.evaluatedRole === 'PARTNER' || currentDraft.evaluatedRole === 'POTENTIAL_PARTNER') {
            setError(err instanceof Error ? err.message : 'Cannot check readiness.');
          }
        })
    );

    const targetProfileLookupId = currentDraft.targetProfileDocumentId || currentDraft.targetCompanyId || project?.targetCompanyProfileId;
    if (targetProfileLookupId) {
      calls.push(
        api.get<ProfileResponse>(`/profiles/${targetProfileLookupId}`)
          .then((payload) => setProfile(payload.data))
          .catch(() => setProfile(null))
      );
    }

    const targetScoreProfileId = currentDraft.targetProfileDocumentId || project?.targetCompanyProfileId || currentDraft.targetCompanyId;
    if (currentDraft.status === 'APPROVED' && currentDraft.evaluatedRole !== 'PARTNER' && targetScoreProfileId) {
      calls.push(
        roleEvaluationApi.getOfficialScores(targetScoreProfileId, currentDraft.evaluatedRole)
          .then((payload) => setOfficialScores(payload.data || []))
          .catch(() => setOfficialScores([]))
      );
    }

    await Promise.all(calls);
  };

  useEffect(() => {
    void loadAll();
  }, [task.id, project?.targetRelationshipType]);

  useEffect(() => {
    setCriterionDrafts(buildCriterionDrafts(draft, effectiveCriteria));
    if (!activeCriterion && effectiveCriteria[0]) setActiveCriterion(effectiveCriteria[0].criterionKey);
  }, [draft?.id, effectiveCriteria.length]);

  useEffect(() => {
    if (!shouldPollEvaluation(draft?.status)) return;
    const interval = window.setInterval(() => void loadAll(true), 3000);
    return () => window.clearInterval(interval);
  }, [draft?.status, task.id]);

  const createDraft = async () => {
    setActionLoading('create');
    setError(null);
    setMessage(null);
    try {
      const payload = await roleEvaluationApi.createDraft(task.projectId, task.id, submitNote);
      setDraft(payload.data);
      setDrafts([payload.data, ...drafts]);
      setMessage('Evaluation draft created.');
      await loadAll(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot create role evaluation draft.');
    } finally {
      setActionLoading(null);
    }
  };

  const saveCriterion = async (criterionKey: string) => {
    if (!draft) return;
    const input = criterionDrafts[criterionKey];
    const score = input?.rawScore === '' ? null : Number(input?.rawScore);
    if (numericRole && (score === null || !Number.isFinite(score) || score < 0 || score > 100)) {
      setError('Score must be between 0 and 100.');
      return;
    }
    if (!input?.explanation?.trim()) {
      setError('Please add an explanation before saving this criterion.');
      return;
    }

    setActionLoading(`save-${criterionKey}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.updateCriterion(draft.id, criterionKey, {
        rawScore: numericRole ? score : null,
        explanation: input.explanation.trim(),
        evidenceIds: input.evidenceIds,
        inputMethod: 'MANUAL_REVIEWED',
      });
      setDraft(payload.data);
      setMessage('Criterion saved.');
      await loadDerived(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot save criterion.');
    } finally {
      setActionLoading(null);
    }
  };

  const addDocumentEvidence = async (criterionKey: string, document: WorkbenchDocumentResponse) => {
    if (!draft || !document.rawDocumentId) return;
    setActionLoading(`evidence-${criterionKey}-${document.id}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.addEvidence(draft.id, {
        criterionKey,
        sourceType: 'EXTERNAL_EVIDENCE',
        rawDocumentId: document.rawDocumentId,
        reliability: 'MEDIUM',
        evidenceCategory: document.mimeType || 'Uploaded document',
        note: document.fileName || `Import job #${document.id}`,
      });
      setDraft(payload.data);
      const evidenceRows = payload.data.criterionEvidence?.[criterionKey] || [];
      const latestEvidence = evidenceRows[evidenceRows.length - 1];
      if (latestEvidence?.evidenceId) {
        setCriterionDrafts((current) => ({
          ...current,
          [criterionKey]: {
            ...(current[criterionKey] || { rawScore: '', explanation: '', evidenceIds: [] }),
            evidenceIds: Array.from(new Set([...(current[criterionKey]?.evidenceIds || []), latestEvidence.evidenceId])),
          },
        }));
      }
      setMessage('Evidence linked to criterion.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot add evidence.');
    } finally {
      setActionLoading(null);
    }
  };

  const removeDocumentEvidence = async (criterionKey: string, evidenceId: string) => {
    if (!draft) return;
    setActionLoading(`remove-evidence-${criterionKey}-${evidenceId}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.removeEvidence(draft.id, evidenceId);
      setDraft(payload.data);
      setCriterionDrafts((current) => ({
        ...current,
        [criterionKey]: {
          ...(current[criterionKey] || { rawScore: '', explanation: '', evidenceIds: [] }),
          evidenceIds: (current[criterionKey]?.evidenceIds || []).filter((id) => id !== evidenceId),
        },
      }));
      setMessage('Evidence unselected.');
      await loadDerived(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot remove evidence.');
    } finally {
      setActionLoading(null);
    }
  };

  const openDocument = (document: WorkbenchDocumentResponse, download = false) => {
    if (!document.rawDocumentId || !document.projectId) return;
    const url = `${API_BASE_URL}/projects/${document.projectId}/documents/${encodeURIComponent(document.rawDocumentId)}/download?download=${download}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const generateSuggestion = async (criterionKey?: string) => {
    if (!draft) return;
    const key = criterionKey || 'all';
    setActionLoading(`suggest-${key}`);
    setAiProgress((current) => ({ ...current, [key]: 8 }));
    setError(null);
    try {
      let draftForSuggestion = draft;
      if (criterionKey) {
        const input = criterionDrafts[criterionKey];
        const score = input?.rawScore === '' ? null : Number(input?.rawScore);
        if (numericRole && score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
          setError('Staff score must be between 0 and 100.');
          return;
        }
        if (input?.explanation?.trim() && (!numericRole || score !== null)) {
          const saved = await roleEvaluationApi.updateCriterion(draft.id, criterionKey, {
            rawScore: numericRole ? score : null,
            explanation: input.explanation.trim(),
            evidenceIds: input.evidenceIds,
            inputMethod: 'MANUAL_REVIEWED',
          });
          draftForSuggestion = saved.data;
          setDraft(saved.data);
        }
      }
      if (criterionKey) {
        const payload = await roleEvaluationApi.generateSuggestion(draftForSuggestion.id, criterionKey);
        const generated = ['GENERATED', 'ALREADY_GENERATED', 'STALE_GENERATION'].includes(payload.data.outcome || '');
        setAiProgress((current) => ({ ...current, [key]: 100 }));
        setDraft(payload.data.draft);
        if (generated) {
          setMessage(aiOutcomeMessage(payload.data.outcome));
        } else {
          setError(aiOutcomeMessage(payload.data.outcome));
        }
        await loadDerived(payload.data.draft);
      } else {
        const payload = await roleEvaluationApi.generateSuggestions(draftForSuggestion.id);
        const generated = Object.values(payload.data.outcomes || {}).some((item) =>
          ['GENERATED', 'ALREADY_GENERATED', 'STALE_GENERATION'].includes(item)
        );
        setAiProgress((current) => ({ ...current, [key]: 100 }));
        setDraft(payload.data.draft);
        if (generated) {
          setMessage('AI suggestions generated.');
        } else {
          setError('No AI suggestions were generated. Tick evidence documents for each criterion and try again.');
        }
        await loadDerived(payload.data.draft);
      }
    } catch (err) {
      setAiProgress((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      setError(err instanceof Error ? err.message : 'Cannot generate AI suggestion.');
    } finally {
      setActionLoading(null);
    }
  };

  const acceptSuggestion = async (criterionKey: string) => {
    if (!draft) return;
    setActionLoading(`accept-${criterionKey}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.acceptSuggestion(draft.id, criterionKey);
      setDraft(payload.data);
      const suggestion = payload.data.automaticSuggestions?.[criterionKey];
      setCriterionDrafts((current) => ({
        ...current,
        [criterionKey]: {
          ...(current[criterionKey] || { rawScore: '', explanation: '', evidenceIds: [] }),
          rawScore: suggestion?.suggestedRawScore !== null && suggestion?.suggestedRawScore !== undefined ? String(suggestion.suggestedRawScore) : current[criterionKey]?.rawScore || '',
          explanation: suggestionText(suggestion),
          evidenceIds: suggestion?.evidenceIds || current[criterionKey]?.evidenceIds || [],
        },
      }));
      setMessage('AI suggestion accepted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot accept suggestion.');
    } finally {
      setActionLoading(null);
    }
  };

  const editSuggestion = async (criterionKey: string) => {
    if (!draft) return;
    const input = criterionDrafts[criterionKey];
    const score = input?.rawScore === '' ? null : Number(input?.rawScore);
    if (numericRole && (score === null || !Number.isFinite(score) || score < 0 || score > 100)) {
      setError('Enter a Staff score between 0 and 100 before editing the AI suggestion.');
      return;
    }
    if (!input?.explanation?.trim()) {
      setError('Add an override reason in the explanation box before editing the AI suggestion.');
      return;
    }
    setActionLoading(`edit-${criterionKey}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.editSuggestion(draft.id, criterionKey, {
        rawScore: numericRole ? score : null,
        overrideReason: input.explanation.trim(),
      });
      setDraft(payload.data);
      setMessage('AI suggestion edited and reviewed by Staff.');
      await loadDerived(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot edit AI suggestion.');
    } finally {
      setActionLoading(null);
    }
  };

  const rejectSuggestion = async (criterionKey: string) => {
    if (!draft) return;
    setActionLoading(`reject-${criterionKey}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.rejectSuggestion(draft.id, criterionKey, 'Rejected by staff.');
      setDraft(payload.data);
      setMessage('AI suggestion rejected.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot reject suggestion.');
    } finally {
      setActionLoading(null);
    }
  };

  const markNeedsMoreData = async (criterionKey: string) => {
    if (!draft) return;
    const suggestion = draft.automaticSuggestions?.[criterionKey];
    setActionLoading(`needs-data-${criterionKey}`);
    setError(null);
    try {
      const payload = await roleEvaluationApi.markNeedsMoreData(
        draft.id,
        criterionKey,
        'More supporting data is required.',
        suggestion?.missingData || []
      );
      setDraft(payload.data);
      setMessage('Marked as needs more data.');
      await loadDerived(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot mark this criterion as needs more data.');
    } finally {
      setActionLoading(null);
    }
  };

  const submitEvaluation = async () => {
    if (!draft) return;
    if (!staffReadyToSubmit) {
      setError('Please complete Staff score, reason, and evidence for every criterion before submitting.');
      setActiveStep('criteria');
      return;
    }
    setActionLoading('submit');
    setError(null);
    setMessage(null);
    try {
      await roleEvaluationApi.submit(draft.id, submitNote);
      setMessage('Evaluation submitted for manager review.');
      await loadAll(true);
      await onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot submit evaluation.');
    } finally {
      setActionLoading(null);
    }
  };

  const reviewEvaluation = async (decision: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION') => {
    if (!draft) return;
    if ((decision === 'REJECT' || decision === 'REQUEST_REVISION' || readiness?.aggregateCompletenessStatus === 'PARTIAL') && !managerComment.trim()) {
      setError('Please add a review justification before saving this decision.');
      return;
    }
    setActionLoading(`review-${decision}`);
    setError(null);
    try {
      await roleEvaluationApi.review(draft.id, {
        decision,
        comment: managerComment.trim() || (decision === 'APPROVE' ? 'Approved by manager.' : 'Needs revision.'),
        acknowledgeStaleVersions: true,
      }, `${draft.id}-${decision}-${Date.now()}`);
      setMessage(decision === 'APPROVE' ? 'Approval started.' : 'Review decision saved.');
      await loadAll(true);
      await onReviewed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot review evaluation.');
    } finally {
      setActionLoading(null);
    }
  };

  const selectedSuggestion = selectedKey ? draft?.automaticSuggestions?.[selectedKey] : undefined;
  const selectedInput = selectedKey ? draft?.criterionInputs?.[selectedKey] : undefined;
  const selectedReadiness = selectedKey ? readiness?.criterionResults?.[selectedKey] : undefined;
  const selectedEvidence = selectedKey ? draft?.criterionEvidence?.[selectedKey] || [] : [];
  const selectedLocalInput = selectedKey ? criterionDrafts[selectedKey] : undefined;
  const previewScore = clampScore(preview?.previewOverallScore);
  const showEvidencePanel = activeStep === 'criteria' || activeStep === 'decision';
  const showAiPanel = activeStep === 'decision';
  const showStaffInputPanel = activeStep === 'decision' && mode === 'staff';
  const showPreviewPanel = activeStep === 'preview';
  const officialScore = officialScores[0] || null;
  const officialOverallScore = clampScore(officialScore?.overallScore);
  const isApprovalProcessing = draft?.status === 'APPROVAL_PROCESSING';
  const isApprovalFailed = draft?.status === 'APPROVAL_FAILED';
  const isApproved = draft?.status === 'APPROVED';
  const evidenceDocumentTypes = useMemo(
    () => ['ALL', ...Array.from(new Set(documents.map(documentTypeLabel).filter(Boolean)))],
    [documents]
  );
  const filteredEvidenceDocuments = useMemo(() => {
    const keyword = evidenceSearch.trim().toLowerCase();
    return documents.filter((document) => {
      const type = documentTypeLabel(document);
      const matchType = evidenceType === 'ALL' || type === evidenceType;
      const haystack = [
        document.fileName,
        document.uploadedByName,
        document.status,
        document.mimeType,
        document.rawDocumentId,
      ].filter(Boolean).join(' ').toLowerCase();
      return matchType && (!keyword || haystack.includes(keyword));
    });
  }, [documents, evidenceSearch, evidenceType]);
  const completedCriteriaCount = useMemo(
    () => effectiveCriteria.filter((criterion) => {
      const input = draft?.criterionInputs?.[criterion.criterionKey];
      return numericRole
        ? input?.rawScore !== null && input?.rawScore !== undefined && Boolean(input?.explanation)
        : Boolean(input?.explanation || draft?.automaticSuggestions?.[criterion.criterionKey]?.explanation);
    }).length,
    [draft, effectiveCriteria, numericRole]
  );
  const averageStaffScore = useMemo(() => {
    const scores = effectiveCriteria
      .map((criterion) => toNumber(draft?.criterionInputs?.[criterion.criterionKey]?.rawScore))
      .filter((score): score is number => score !== null);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [draft?.criterionInputs, effectiveCriteria]);
  const totalAttachedEvidence = useMemo(
    () => Object.values(draft?.criterionEvidence || {}).reduce((sum, items) => sum + (items?.length || 0), 0),
    [draft?.criterionEvidence]
  );
  const aiSuggestionCount = useMemo(
    () => Object.keys(draft?.automaticSuggestions || {}).length,
    [draft?.automaticSuggestions]
  );
  const missingStaffCriteriaCount = Math.max(effectiveCriteria.length - completedCriteriaCount, 0);
  const displayedPreviewScore = previewScore ?? averageStaffScore;

  const toggleCriterionOpen = (criterionKey: string) => {
    setOpenCriteria((current) => {
      const next = new Set(current);
      if (next.has(criterionKey)) next.delete(criterionKey);
      else next.add(criterionKey);
      return next;
    });
  };

  return (
    <section className={styles.workspace}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <span className={styles.eyebrow}>Role evaluation</span>
          <h3>{project?.targetCompanyName || draft?.targetCompanyId || task.title}</h3>
          <p>
            {mode === 'staff'
              ? 'Review the company profile, score each criterion with evidence, use AI as a reference, then submit to manager.'
              : 'Review Staff scores, AI rationale, evidence, and approve or request revisions.'}
          </p>
          <div className={styles.metaStrip}>
            <span><strong>Project</strong>{project?.projectName || `#${task.projectId}`}</span>
            <span><strong>Role</strong>{roleEvaluationRoleLabel(activeRole)}</span>
            <span><strong>Task</strong>{task.title}</span>
            <span><strong>Due</strong>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.badge} ${statusTone(draft?.status)}`}>{roleEvaluationStatusLabel(draft?.status)}</span>
          <button className={styles.secondaryButton} type="button" onClick={() => void loadAll()} disabled={loading}>
            <RotateCw size={15} /> Refresh
          </button>
          {mode === 'staff' && !draft && (
            <button className={styles.primaryButton} type="button" onClick={() => void createDraft()} disabled={!canEdit || actionLoading === 'create'}>
              {actionLoading === 'create' ? <Loader2 size={15} className={styles.spin} /> : <Plus size={15} />} Create draft
            </button>
          )}
        </div>
      </div>

      {error && <div className={styles.error}><AlertTriangle size={16} />{error}</div>}
      {message && <div className={styles.success}><CheckCircle2 size={16} />{message}</div>}

      <nav className={styles.stepper} aria-label="Role evaluation workflow">
        {steps.map((step, index) => {
          const disabled = !draft && step.key !== 'overview';
          const done = stepDone(step.key);
          return (
            <button
              key={step.key}
              type="button"
              className={`${styles.stepButton} ${activeStep === step.key ? styles.activeStep : ''} ${done ? styles.doneStep : ''}`}
              disabled={disabled}
              onClick={() => setActiveStep(step.key)}
            >
              <span>{done ? <CheckCircle2 size={16} /> : index + 1}</span>
              <strong>{step.label}</strong>
              <small>{step.note}</small>
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className={styles.empty}><Loader2 className={styles.spin} /> Loading evaluation workspace...</div>
      ) : !draft ? (
        <div className={styles.overviewGrid}>
          <div className={styles.overviewCard}>
            <span className={styles.eyebrow}>Task overview</span>
            <h4>{task.title}</h4>
            <div className={styles.factGrid}>
              <div><span>Project</span><strong>{project?.projectName || `Project #${task.projectId}`}</strong></div>
              <div><span>Company</span><strong>{project?.targetCompanyName || 'No target company'}</strong></div>
              <div><span>Relationship</span><strong>{project?.targetRelationshipType || 'Not configured'}</strong></div>
              <div><span>Evaluation role</span><strong>{roleEvaluationRoleLabel(expectedRole)}</strong></div>
              <div><span>Assignee</span><strong>{task.assignedToName || task.assignedToUserId || 'Unassigned'}</strong></div>
              <div><span>Deadline</span><strong>{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No due date'}</strong></div>
            </div>
          </div>
          <div className={styles.empty}>
            <ClipboardCheck size={26} />
            <strong>No role evaluation draft yet</strong>
            <span>Click Start evaluation after the task is in progress. The backend derives the role from the project relationship.</span>
            {mode === 'staff' && (
              <button className={styles.primaryButton} type="button" onClick={() => void createDraft()} disabled={!canEdit || actionLoading === 'create'}>
                {actionLoading === 'create' ? <Loader2 size={15} className={styles.spin} /> : <Plus size={15} />} Start evaluation
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.summaryGrid}>
            <div className={styles.metricCard}>
              <Gauge size={20} />
              <span>Progress</span>
              <strong>{completion}%</strong>
              <i><b style={{ width: `${completion}%` }} /></i>
            </div>
            <div className={styles.metricCard}>
              <ShieldCheck size={20} />
              <span>Readiness</span>
              <strong className={readinessTone(readiness?.aggregateCompletenessStatus)}>
                {readiness?.aggregateCompletenessStatus || 'Not checked'}
              </strong>
              <small>{readiness?.staffMaySubmit ? 'Staff may submit' : 'Backend readiness controls submission'}</small>
            </div>
            <div className={styles.metricCard}>
              <Sparkles size={20} />
              <span>{numericRole ? 'Preview score' : 'Qualitative mode'}</span>
              <strong>{numericRole ? (displayedPreviewScore !== null ? `${displayedPreviewScore}/100` : 'N/A') : 'No overall score'}</strong>
              <small>{ruleSet?.ruleSetVersion ? `Rules ${ruleSet.ruleSetVersion}` : 'Rule set not available'}</small>
            </div>
          </div>

          {(readiness?.blockingReasons?.length || readiness?.warnings?.length || preview?.warnings?.length) ? (
            <div className={styles.warningPanel}>
              {[...(readiness?.blockingReasons || []), ...(readiness?.warnings || []), ...(preview?.warnings || [])].map((item) => (
                <span key={item}><AlertTriangle size={14} />{item}</span>
              ))}
            </div>
          ) : null}

          {isApprovalProcessing && (
            <div className={styles.processingPanel}>
              <Loader2 className={styles.spin} size={18} />
              <div>
                <strong>Approval is being finalized</strong>
                <span>The backend is creating the approved evaluation result. This page refreshes automatically until the final status is available.</span>
              </div>
            </div>
          )}

          {isApprovalFailed && (
            <div className={styles.failurePanel}>
              <AlertTriangle size={18} />
              <div>
                <strong>Approval failed</strong>
                <span>Evaluation ID {draft.id}. There is no retry endpoint exposed yet, so the safest action is to review backend logs or request technical support.</span>
              </div>
            </div>
          )}

          {isApproved && (
            <div className={styles.approvedPanel}>
              <ShieldCheck size={18} />
              <div>
                <strong>{numericRole ? 'Official approved score' : 'Approved qualitative evaluation'}</strong>
                <span>
                  {numericRole
                    ? (officialScore ? `Saved official result: ${officialOverallScore ?? 'N/A'}/100` : 'Approved, but no ScoreSnapshot was returned by the official score API yet.')
                    : 'PARTNER evaluations are approved as qualitative findings without an official numeric score.'}
                </span>
              </div>
            </div>
          )}

          {activeStep === 'overview' && (
            <div className={styles.overviewGrid}>
              <div className={styles.overviewCard}>
                <span className={styles.eyebrow}>Task overview</span>
                <h4>{task.title}</h4>
                <p>{task.description || 'No task instructions were provided.'}</p>
                <div className={styles.factGrid}>
                  <div><span>Project</span><strong>{project?.projectName || `Project #${task.projectId}`}</strong></div>
                  <div><span>Target company</span><strong>{project?.targetCompanyName || draft.targetCompanyId || 'No target company'}</strong></div>
                  <div><span>Official profile</span><strong>{project?.targetCompanyProfileId || draft.targetProfileDocumentId || 'Not available'}</strong></div>
                  <div><span>Evaluated role</span><strong>{roleEvaluationRoleLabel(draft.evaluatedRole)}</strong></div>
                  <div><span>Draft status</span><strong>{roleEvaluationStatusLabel(draft.status)}</strong></div>
                  <div><span>Rule set</span><strong>{draft.ruleSetVersion || ruleSet?.ruleSetVersion || 'Not resolved'}</strong></div>
                </div>
              </div>
              <div className={styles.guidanceCard}>
                <Info size={18} />
                <strong>Workflow guide</strong>
                <span>Review the official profile, then use Evidence to enter Staff scores, attach documents, ask AI for a reference suggestion, and submit the final draft for Manager review.</span>
              </div>
            </div>
          )}

          {activeStep === 'profile' && (
            <div className={styles.profileWorkspace}>
              <div className={styles.profileHero}>
                <span className={styles.eyebrow}>Official company profile</span>
                <h4>{profileName(profile, project?.targetCompanyName || draft.targetCompanyId)}</h4>
                <p>This is the approved CompanyProfile used for scoring. Staff should read these fields before adding evidence or confirming scores.</p>
                <div className={styles.profileMeta}>
                  <span>{profile?.reviewStatus || 'APPROVED'}</span>
                  <span>{profile?.version ? `v${profile.version}` : draft.targetProfileVersion ? `v${draft.targetProfileVersion}` : 'Version N/A'}</span>
                  <span>{project?.targetRelationshipType || 'Relationship N/A'}</span>
                </div>
              </div>
              <div className={styles.guidanceCard}>
                <Info size={18} />
                <strong>Profile is read-only here</strong>
                <span>This workspace evaluates an approved CompanyProfile. Profile edits should use the existing profile flow, not the scoring task.</span>
              </div>
              <div className={styles.profileSection}>
                <div className={styles.sectionHead}>
                  <strong>Identity</strong>
                  <span>Company name and registration data</span>
                </div>
                <div className={styles.profileFieldGrid}>
                  <div><span>Legal name</span><strong>{profile?.identity?.legalName || 'No data'}</strong></div>
                  <div><span>Trade name</span><strong>{profile?.identity?.tradeName || project?.targetCompanyName || 'No data'}</strong></div>
                  <div><span>Tax code</span><strong>{profile?.identity?.taxCode || 'No data'}</strong></div>
                  <div><span>Registration no.</span><strong>{profile?.identity?.registrationNumber || 'No data'}</strong></div>
                </div>
              </div>

              <div className={styles.profileSection}>
                <div className={styles.sectionHead}>
                  <strong>Business</strong>
                  <span>Industries, products, markets, and customer focus</span>
                </div>
                <div className={styles.chipBlock}>
                  <span>Industries</span>
                  <div className={styles.chipList}>
                    {cleanList(profile?.business?.industries).length > 0
                      ? cleanList(profile?.business?.industries).map((item) => <strong key={item}>{item}</strong>)
                      : <em>No data</em>}
                  </div>
                </div>
                <div className={styles.chipBlock}>
                  <span>Markets</span>
                  <div className={styles.chipList}>
                    {cleanList(profile?.business?.markets).length > 0
                      ? cleanList(profile?.business?.markets).map((item) => <strong key={item}>{item}</strong>)
                      : <em>No data</em>}
                  </div>
                </div>
                <div className={styles.chipBlock}>
                  <span>Target customers</span>
                  <div className={styles.chipList}>
                    {cleanList(profile?.business?.targetCustomers).length > 0
                      ? cleanList(profile?.business?.targetCustomers).map((item) => <strong key={item}>{item}</strong>)
                      : <em>No data</em>}
                  </div>
                </div>
                <div className={styles.chipBlock}>
                  <span>Products / services</span>
                  <div className={styles.chipList}>
                    {(profile?.business?.products || []).length > 0
                      ? profile?.business?.products?.map((product, index) => {
                          const productName = typeof product === 'string' ? product : product.name;
                          return productName?.trim()
                            ? <strong key={`${productName}-${index}`}>{productName}</strong>
                            : null;
                        })
                      : <em>No data</em>}
                  </div>
                </div>
              </div>

              <div className={styles.profileSection}>
                <div className={styles.sectionHead}>
                  <strong>Contact</strong>
                  <span>Website, emails, phones, and address</span>
                </div>
                <div className={styles.contactGrid}>
                  <div className={styles.contactCard}>
                    <div className={styles.contactHead}>
                      <span><Globe2 size={16} /> Website</span>
                    </div>
                    <div className={styles.chipList}>
                      {websiteHref(profile?.contact?.website)
                        ? (
                          <a
                            className={styles.chipLink}
                            href={websiteHref(profile?.contact?.website) || undefined}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {profile?.contact?.website}
                          </a>
                        )
                        : <em>No data</em>}
                    </div>
                  </div>

                  <div className={styles.contactCard}>
                    <div className={styles.contactHead}>
                      <span><Mail size={16} /> Emails</span>
                    </div>
                    <div className={styles.chipList}>
                      {cleanList(profile?.contact?.emails).length > 0
                        ? cleanList(profile?.contact?.emails).map((item) => (
                          <a className={styles.chipLink} href={`mailto:${item}`} key={item}>
                            {item}
                          </a>
                        ))
                        : <em>No data</em>}
                    </div>
                  </div>

                  <div className={styles.contactCard}>
                    <div className={styles.contactHead}>
                      <span><Phone size={16} /> Phones</span>
                    </div>
                    <div className={styles.chipList}>
                      {cleanList(profile?.contact?.phones).length > 0
                        ? cleanList(profile?.contact?.phones).map((item) => <strong key={item}>{item}</strong>)
                        : <em>No data</em>}
                    </div>
                  </div>

                  <div className={styles.contactCard}>
                    <div className={styles.contactHead}>
                      <span><MapPin size={16} /> Address</span>
                    </div>
                    <div className={styles.addressList}>
                      {(profile?.contact?.addresses || []).length > 0 ? (
                        profile?.contact?.addresses?.map((address, index) => (
                          <article key={`${address.fullAddress || 'address'}-${index}`}>
                            <strong>{address.fullAddress || 'No full address'}</strong>
                            <span>{[address.city, address.country].filter(Boolean).join(', ') || address.type || 'Address'}</span>
                          </article>
                        ))
                      ) : (
                        <em>No data</em>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeStep === 'criteria' && (
            <div className={styles.evidenceWorkspace}>
              <main className={styles.evidenceCriteriaStack}>
                <div className={styles.stageHint}>
                  <strong>Evidence and AI score suggestion</strong>
                  <span>Enter the Staff score and reason for each criterion, tick the supporting documents, then use AI as a reference check before submitting to Manager.</span>
                </div>

                {effectiveCriteria.map((criterion) => {
                  const key = criterion.criterionKey;
                  const suggestion = draft.automaticSuggestions?.[key];
                  const input = draft.criterionInputs?.[key];
                  const localInput = criterionDrafts[key] || { rawScore: '', explanation: '', evidenceIds: [] };
                  const evidenceRows = draft.criterionEvidence?.[key] || [];
                  const criterionDone = numericRole
                    ? input?.rawScore !== null && input?.rawScore !== undefined && Boolean(input?.explanation)
                    : Boolean(input?.explanation || suggestion?.explanation);
                  const hasSuggestion = Boolean(suggestion);
                  const isOpen = openCriteria.has(key);
                  const isAiRunning = actionLoading === `suggest-${key}`;
                  const currentAiProgress = aiProgress[key] || 0;
                  const statusLabel = criterionDone ? 'Confirmed' : hasSuggestion ? 'AI suggested' : 'Not evaluated';

                  return (
                    <article className={`${styles.evidenceCriterionCard} ${isOpen ? styles.evidenceCriterionOpen : ''}`} key={key}>
                      <button className={styles.evidenceCriterionToggle} type="button" onClick={() => toggleCriterionOpen(key)}>
                        <div>
                          <span className={styles.eyebrow}>{key}</span>
                          <strong>{criterion.criterionName || key}</strong>
                          <small>
                            {criterion.required ? 'Required' : 'Optional'} | Weight {criterion.weight ?? 'N/A'}% | Direction {criterion.direction || 'N/A'}
                          </small>
                        </div>
                        <span className={`${styles.statusPill} ${criterionDone ? styles.good : hasSuggestion ? styles.warn : styles.neutral}`}>
                          {statusLabel}
                        </span>
                        <ChevronDown size={18} />
                      </button>

                      {isOpen && (
                        <div className={styles.evidenceCriterionBody}>
                          <section className={styles.manualScoreCard}>
                            <div className={styles.evidenceSectionHead}>
                              <div>
                                <strong>Staff Score</strong>
                                <span>Staff confirms the final score after reviewing evidence and the AI suggestion.</span>
                              </div>
                              {numericRole && suggestion?.suggestedRawScore !== null && suggestion?.suggestedRawScore !== undefined && localInput.rawScore && Number(localInput.rawScore) !== Number(suggestion.suggestedRawScore) && (
                                <span className={styles.overridePill}>AI {suggestion.suggestedRawScore} {'->'} Staff {localInput.rawScore}</span>
                              )}
                            </div>

                            <div className={styles.manualScoreGrid}>
                              {numericRole && (
                                <label>
                                  <span>Staff Score 0-100</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={localInput.rawScore || ''}
                                    disabled={!editable}
                                    onChange={(event) => setCriterionDrafts((current) => ({
                                      ...current,
                                      [key]: { ...(current[key] || { rawScore: '', explanation: '', evidenceIds: [] }), rawScore: event.target.value },
                                    }))}
                                  />
                                </label>
                              )}
                              <label>
                                <span>{numericRole ? 'Reason / Override note' : 'Qualitative finding'}</span>
                                <textarea
                                  value={localInput.explanation || ''}
                                  disabled={!editable}
                                  placeholder={numericRole ? 'Explain why the final Staff score is appropriate...' : 'Write the final qualitative finding...'}
                                  onChange={(event) => setCriterionDrafts((current) => ({
                                    ...current,
                                    [key]: { ...(current[key] || { rawScore: '', explanation: '', evidenceIds: [] }), explanation: event.target.value },
                                  }))}
                                />
                              </label>
                            </div>

                            {editable && (
                              <div className={styles.inlineActions}>
                                <button type="button" onClick={() => void acceptSuggestion(key)} disabled={Boolean(actionLoading || !suggestion)}>
                                  <CheckCircle2 size={15} /> Use AI as reference
                                </button>
                                <button className={styles.primaryButton} type="button" onClick={() => void saveCriterion(key)} disabled={Boolean(actionLoading)}>
                                  {actionLoading === `save-${key}` ? <Loader2 size={15} className={styles.spin} /> : <CheckCircle2 size={15} />}
                                  Save Staff score
                                </button>
                              </div>
                            )}
                          </section>

                          <section className={styles.evidenceSection}>
                            <div className={styles.evidenceSectionHead}>
                              <div>
                                <strong>Evidence documents for manager review</strong>
                                <span>Old project documents and newly uploaded files appear here. Select only the documents that support this criterion score.</span>
                              </div>
                              <span>{evidenceRows.length} selected</span>
                            </div>

                            <div className={styles.documentToolbar}>
                              <label>
                                <Search size={15} />
                                <input
                                  value={evidenceSearch}
                                  onChange={(event) => setEvidenceSearch(event.target.value)}
                                  placeholder="Search project documents..."
                                />
                              </label>
                              <select value={evidenceType} onChange={(event) => setEvidenceType(event.target.value)}>
                                {evidenceDocumentTypes.map((type) => (
                                  <option key={type} value={type}>{type === 'ALL' ? 'All file types' : type}</option>
                                ))}
                              </select>
                            </div>

                            <div className={styles.projectDocumentList}>
                              {documentsLoading ? (
                                <div className={styles.miniEmpty}>Loading project documents...</div>
                              ) : filteredEvidenceDocuments.length === 0 ? (
                                <div className={styles.miniEmpty}>No project documents found. Upload a new evidence file below, then select it for manager review.</div>
                              ) : (
                                filteredEvidenceDocuments.map((document) => {
                                  const attachedEvidence = evidenceRows.find((item) => item.rawDocumentId === document.rawDocumentId);
                                  const attached = Boolean(attachedEvidence);
                                  return (
                                    <article className={attached ? styles.documentSelected : undefined} key={`${document.rawDocumentId || document.id}-${key}`}>
                                      <label className={styles.documentCheck}>
                                        <input
                                          type="checkbox"
                                          checked={attached}
                                          disabled={!editable || Boolean(actionLoading) || !document.rawDocumentId}
                                          onChange={() => {
                                            if (attachedEvidence?.evidenceId) void removeDocumentEvidence(key, attachedEvidence.evidenceId);
                                            else void addDocumentEvidence(key, document);
                                          }}
                                        />
                                        <span />
                                      </label>
                                      <div className={styles.documentIcon}><FileText size={17} /></div>
                                      <div>
                                        <strong>{document.fileName || `Document #${document.id}`}</strong>
                                        <span>
                                          {documentTypeLabel(document)} | {formatFileSize(document.fileSizeBytes)} | {document.uploadedByName || 'Unknown uploader'}
                                        </span>
                                        <small>{document.uploadedAt ? new Date(document.uploadedAt).toLocaleString() : document.status}</small>
                                      </div>
                                      <div className={styles.documentActions}>
                                        <button type="button" onClick={() => openDocument(document, false)} disabled={!document.rawDocumentId}>
                                          <Eye size={14} /> View online
                                        </button>
                                        <button type="button" onClick={() => openDocument(document, true)} disabled={!document.rawDocumentId}>
                                          <Download size={14} /> Download
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })
                              )}
                            </div>

                            <label className={styles.uploadEvidenceHint}>
                              <input
                                type="file"
                                disabled={!editable || uploadingEvidence || !onUploadEvidence}
                                onChange={(event) => {
                                  void onUploadEvidence?.(event.target.files?.[0] ?? null);
                                  event.currentTarget.value = '';
                                }}
                              />
                              <Upload size={17} />
                              <div>
                                <strong>{uploadingEvidence ? 'Uploading new evidence...' : 'Upload new evidence'}</strong>
                                <span>Upload a new file if old project documents are not enough. After upload, click Select for review on the file you want to submit.</span>
                              </div>
                            </label>
                          </section>

                          <section className={styles.aiSuggestionCard}>
                            <div className={styles.evidenceSectionHead}>
                              <div>
                                <strong>AI Score Suggestion</strong>
                                <span>AI suggests a score using the checked evidence documents for this criterion.</span>
                              </div>
                              {editable && (
                                <button
                                  type="button"
                                  onClick={() => void generateSuggestion(key)}
                                  disabled={Boolean(actionLoading) || evidenceRows.length === 0}
                                  title={evidenceRows.length === 0 ? 'Tick at least one evidence document before using AI.' : undefined}
                                >
                                  {actionLoading === `suggest-${key}` ? <Loader2 size={15} className={styles.spin} /> : <Sparkles size={15} />}
                                  Analyze with AI
                                </button>
                              )}
                            </div>

                            {(isAiRunning || currentAiProgress === 100) && (
                              <div className={styles.aiProgressCard}>
                                <div>
                                  <span>{isAiRunning ? 'AI analysis in progress' : 'AI analysis complete'}</span>
                                  <strong>{aiProgressLabel(currentAiProgress)}</strong>
                                </div>
                                <small>{currentAiProgress}%</small>
                                <div className={styles.aiProgressTrack}>
                                  <i style={{ width: `${currentAiProgress}%` }} />
                                </div>
                              </div>
                            )}

                            <div className={styles.aiScoreGrid}>
                              <div>
                                <span>AI Score</span>
                                <strong>{suggestion?.suggestedRawScore ?? 'N/A'}</strong>
                              </div>
                              <div>
                                <span>Confidence</span>
                                <strong>{percent(suggestion?.confidence)}</strong>
                              </div>
                              <div>
                                <span>Review status</span>
                                <strong>{suggestion?.reviewStatus || 'Not reviewed'}</strong>
                              </div>
                            </div>

                            <div className={styles.aiReasonBox}>
                              <span>AI reasoning</span>
                              <p>{suggestion ? suggestionText(suggestion) : 'No AI suggestion yet. Tick one or more evidence documents, then click Analyze with AI.'}</p>
                            </div>

                            <div className={styles.aiInsightGrid}>
                              <div className={styles.aiInsightPanel}>
                                <div className={styles.aiInsightPanelHead}>
                                  <strong>Important signals</strong>
                                  <span>{suggestion?.validationWarnings?.length || 0} found</span>
                                </div>
                                <div className={styles.aiSignalList}>
                                  {(suggestion?.validationWarnings?.length ? suggestion.validationWarnings : ['No extracted signals yet']).map((item) => (
                                    <span key={item}>{item}</span>
                                  ))}
                                </div>
                              </div>
                              <div className={styles.aiInsightPanel}>
                                <div className={styles.aiInsightPanelHead}>
                                  <strong>Missing evidence</strong>
                                  <span>{suggestion?.missingData?.length || 0} item(s)</span>
                                </div>
                                <div className={styles.aiIssueList}>
                                  {(suggestion?.missingData?.length ? suggestion.missingData : ['No missing evidence flagged']).map((item, index) => (
                                    <article key={`${item}-${index}`}>
                                      <span>{index + 1}</span>
                                      <p>{item}</p>
                                    </article>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className={styles.evidenceMapping}>
                              <strong>Evidence mapping used by AI</strong>
                              {evidenceRows.length === 0 ? (
                                <div className={styles.miniEmpty}>Attach evidence to make AI reasoning traceable.</div>
                              ) : (
                                evidenceRows.map((item) => (
                                  <article key={item.evidenceId}>
                                    <FileText size={15} />
                                    <div>
                                      <strong>{item.note || item.evidenceCategory || item.rawDocumentId || item.evidenceId}</strong>
                                      <span>{item.sourceType || 'Evidence'} | Reliability {item.reliability || 'N/A'} | Used for {criterion.criterionName || key}</span>
                                    </div>
                                  </article>
                                ))
                              )}
                            </div>
                          </section>

                        </div>
                      )}
                    </article>
                  );
                })}
              </main>

              <aside className={styles.evidenceSummary}>
                <section>
                  <span>Completion</span>
                  <strong>{completedCriteriaCount}/{effectiveCriteria.length}</strong>
                  <div className={styles.summaryProgress}><i style={{ width: `${completion}%` }} /></div>
                  <small>{completion}% complete</small>
                </section>
                <section>
                  <span>Attached evidence</span>
                  <strong>{attachedEvidenceCount}</strong>
                  <small>Linked across all criteria</small>
                </section>
                <section>
                  <span>Average Staff score</span>
                  <strong>{averageStaffScore !== null ? `${averageStaffScore}/100` : 'N/A'}</strong>
                  <small>Based on saved scores</small>
                </section>
                <section>
                  <span>AI suggestions</span>
                  <strong>{Object.keys(draft.automaticSuggestions || {}).length}</strong>
                  <small>Generated criteria</small>
                </section>
              </aside>
            </div>
          )}

          {activeStep === 'preview' && mode === 'staff' && (
            <div className={styles.submitWorkspace}>
              <main className={styles.submitReviewPanel}>
                <div className={styles.submitHero}>
                  <span className={styles.eyebrow}>Submission review</span>
                  <h4>Ready to send to Manager?</h4>
                  <p>Check that every criterion has a Staff score, reason, and supporting evidence. AI is only a reference; Manager will review the Staff-confirmed result.</p>
                </div>

                <div className={styles.submitMetricGrid}>
                  <article>
                    <span>Completed criteria</span>
                    <strong>{completedCriteriaCount}/{effectiveCriteria.length}</strong>
                    <small>{completion}% complete</small>
                  </article>
                  <article>
                    <span>Evidence attached</span>
                    <strong>{attachedEvidenceCount}</strong>
                    <small>Documents linked to criteria</small>
                  </article>
                  <article>
                    <span>AI suggestions</span>
                    <strong>{Object.keys(draft.automaticSuggestions || {}).length}</strong>
                    <small>Used as reference only</small>
                  </article>
                  <article>
                    <span>{numericRole ? 'Average Staff score' : 'Review mode'}</span>
                    <strong>{numericRole ? averageStaffScore ?? 'N/A' : 'Qualitative'}</strong>
                    <small>{numericRole ? 'Across saved criteria' : 'Manager checks findings'}</small>
                  </article>
                </div>

                <section className={styles.ruleReadinessPanel}>
                  <div className={styles.formPanelHead}>
                    <ShieldCheck size={18} />
                    <strong>Staff submission readiness</strong>
                  </div>
                  <div className={styles.ruleReadinessSummary}>
                    <span className={`${styles.badge} ${staffReadyToSubmit ? styles.good : styles.warn}`}>
                      {staffReadyToSubmit ? 'READY' : 'INCOMPLETE'}
                    </span>
                    <strong>{staffReadyToSubmit ? 'This draft can be submitted to Manager.' : 'Complete Staff score, reason, and evidence before submitting.'}</strong>
                    <p>Submit now follows the Staff-confirmed workflow. AI suggestions and project documents support the decision, but Staff score, reason, and selected evidence are the required submit gate.</p>
                  </div>
                  {staffSubmissionMissingCriteria.length > 0 && (
                    <div className={styles.ruleMissingList}>
                      {staffSubmissionMissingCriteria.map((criterion) => {
                        const input = draft.criterionInputs?.[criterion.criterionKey];
                        const evidenceCount = draft.criterionEvidence?.[criterion.criterionKey]?.length || 0;
                        const missing = [
                          numericRole && (input?.rawScore === null || input?.rawScore === undefined) ? 'Staff score' : null,
                          !input?.explanation ? 'Reason' : null,
                          evidenceCount === 0 ? 'Evidence document' : null,
                        ].filter(Boolean).join(', ');
                        return (
                          <article key={criterion.criterionKey}>
                            <div>
                              <strong>{criterion.criterionName || criterion.criterionKey}</strong>
                              <span>{criterion.criterionKey}</span>
                            </div>
                            <p>Missing: {missing || 'Required Staff confirmation data'}</p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className={styles.reviewTable}>
                  <div className={styles.formPanelHead}>
                    <ClipboardCheck size={18} />
                    <strong>Criteria ready for Manager review</strong>
                  </div>
                  <div className={styles.reviewRows}>
                    {effectiveCriteria.map((criterion) => {
                      const input = draft.criterionInputs?.[criterion.criterionKey];
                      const suggestion = draft.automaticSuggestions?.[criterion.criterionKey];
                      const evidenceCount = draft.criterionEvidence?.[criterion.criterionKey]?.length || 0;
                      const hasScore = numericRole ? input?.rawScore !== null && input?.rawScore !== undefined : Boolean(input?.explanation);
                      const hasReason = Boolean(input?.explanation);
                      const ready = hasScore && hasReason && evidenceCount > 0;
                      return (
                        <article key={criterion.criterionKey}>
                          <div>
                            <strong>{criterion.criterionName || criterion.criterionKey}</strong>
                            <span>{ready ? 'Ready' : 'Needs attention'}</span>
                          </div>
                          <div>
                            <span>Staff score</span>
                            <strong>{numericRole ? input?.rawScore ?? 'Missing' : hasReason ? 'Finding saved' : 'Missing'}</strong>
                          </div>
                          <div>
                            <span>Reason</span>
                            <strong>{hasReason ? 'Saved' : 'Missing'}</strong>
                          </div>
                          <div>
                            <span>Evidence</span>
                            <strong>{evidenceCount}</strong>
                          </div>
                          <div>
                            <span>AI</span>
                            <strong>{suggestion ? (numericRole ? suggestion.suggestedRawScore ?? 'Suggested' : 'Suggested') : 'Optional'}</strong>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </main>

              <aside className={styles.submitSidePanel}>
                <section>
                  <h4>Submission status</h4>
                  <div className={styles.summaryProgress}><i style={{ width: `${completion}%` }} /></div>
                  <div className={styles.submitChecklist}>
                    <span className={completion === 100 ? styles.readyItem : styles.warningItem}>
                      <CheckCircle2 size={15} /> All Staff scores and reasons saved
                    </span>
                    <span className={attachedEvidenceCount > 0 ? styles.readyItem : styles.warningItem}>
                      <FileText size={15} /> Evidence documents selected
                    </span>
                    <span className={staffReadyToSubmit ? styles.readyItem : styles.warningItem}>
                      <ShieldCheck size={15} /> Staff submission readiness passed
                    </span>
                    <span className={Object.keys(draft.automaticSuggestions || {}).length > 0 ? styles.readyItem : styles.neutralItem}>
                      <Sparkles size={15} /> AI reference reviewed
                    </span>
                  </div>
                </section>

                <section>
                  <h4>Manager note</h4>
                  <textarea
                    value={submitNote}
                    disabled={!editable}
                    placeholder="Optional note: what should the manager pay attention to?"
                    onChange={(event) => setSubmitNote(event.target.value)}
                  />
                  <button className={styles.primaryButton} type="button" onClick={() => void submitEvaluation()} disabled={!editable || actionLoading === 'submit' || !staffReadyToSubmit}>
                    {actionLoading === 'submit' ? <Loader2 size={15} className={styles.spin} /> : <Send size={15} />} Submit to Manager
                  </button>
                </section>
              </aside>
            </div>
          )}

          {activeStep === 'decision' && (
          <div className={`${styles.layout} ${mode === 'manager' ? styles.managerDecisionLayout : ''}`}>
            <aside className={styles.criteriaRail}>
              <div className={styles.railHead}>
                <strong>Criteria</strong>
                <span>{effectiveCriteria.length} item(s)</span>
              </div>
              {effectiveCriteria.map((criterion) => {
                const input = draft.criterionInputs?.[criterion.criterionKey];
                const suggestion = draft.automaticSuggestions?.[criterion.criterionKey];
                const complete = numericRole ? input?.rawScore !== null && input?.rawScore !== undefined : Boolean(input?.explanation || suggestion?.explanation);
                return (
                  <button
                    className={`${styles.criterionTab} ${selectedKey === criterion.criterionKey ? styles.activeCriterion : ''}`}
                    type="button"
                    key={criterion.criterionKey}
                    onClick={() => setActiveCriterion(criterion.criterionKey)}
                  >
                    <span>{criterion.criterionName || criterion.criterionKey}</span>
                    <small>{criterion.weight ? `${criterion.weight}% weight` : criterion.required ? 'Required' : 'Optional'}</small>
                    <i className={complete ? styles.goodDot : styles.warnDot} />
                  </button>
                );
              })}
            </aside>

            <main className={`${styles.criterionDetail} ${mode === 'manager' ? styles.managerDecisionMain : ''}`}>
              {mode === 'manager' && (
                <div className={styles.managerDecisionHero}>
                  <article>
                    <span>Review status</span>
                    <strong>{roleEvaluationStatusLabel(draft.status)}</strong>
                    <small>{managerCanReview ? 'Ready for decision' : 'Decision locked'}</small>
                  </article>
                  <article>
                    <span>Criteria checked</span>
                    <strong>{completedCriteriaCount}/{effectiveCriteria.length}</strong>
                    <small>{missingStaffCriteriaCount} remaining</small>
                  </article>
                  <article>
                    <span>Evidence attached</span>
                    <strong>{totalAttachedEvidence}</strong>
                    <small>Across all criteria</small>
                  </article>
                  <article>
                    <span>{numericRole ? 'Staff average' : 'AI references'}</span>
                    <strong>{numericRole ? (averageStaffScore !== null ? `${averageStaffScore}/100` : 'N/A') : aiSuggestionCount}</strong>
                    <small>{numericRole ? 'Based on saved Staff scores' : 'Suggestions available'}</small>
                  </article>
                </div>
              )}
              {selectedCriterion && selectedKey ? (
                <>
                  <div className={styles.stageHint}>
                    <strong>
                      {activeStep === 'decision' && 'Manager review detail'}
                    </strong>
                    <span>
                      {activeStep === 'decision' && 'Manager reviews Staff input, AI rationale, readiness, and evidence before making a decision.'}
                    </span>
                  </div>
                  <div className={styles.criterionHeader}>
                    <div>
                      <span className={styles.eyebrow}>{selectedCriterion.criterionKey}</span>
                      <h4>{selectedCriterion.criterionName || selectedCriterion.criterionKey}</h4>
                      <p>
                        Weight {selectedCriterion.weight ?? 'N/A'} | Direction {selectedCriterion.direction || 'N/A'} |
                        {' '}{selectedCriterion.required ? 'Required' : 'Optional'}
                      </p>
                    </div>
                    <span className={`${styles.badge} ${readinessTone(selectedReadiness?.sufficiencyStatus)}`}>
                      {selectedReadiness?.sufficiencyStatus || readiness?.aggregateCompletenessStatus || 'Readiness N/A'}
                    </span>
                  </div>

                  <div className={styles.scoreGrid}>
                    {numericRole && (
                      <>
                        <div className={styles.scoreBox}>
                          <span>AI suggested score</span>
                          <strong>{selectedSuggestion?.suggestedRawScore ?? 'N/A'}</strong>
                          <small>Confidence {percent(selectedSuggestion?.confidence)}</small>
                        </div>
                        <div className={styles.scoreBox}>
                          <span>Staff confirmed score</span>
                          <strong>{selectedInput?.rawScore ?? 'Not saved'}</strong>
                          <small>{selectedInput?.inputMethod || 'Manual review'}</small>
                        </div>
                      </>
                    )}
                    <div className={styles.scoreBox}>
                      <span>Evidence</span>
                      <strong>{selectedEvidence.length}</strong>
                      <small>{selectedLocalInput?.evidenceIds?.length || 0} selected for score</small>
                    </div>
                  </div>

                  {showEvidencePanel && (
                  <div className={styles.evidencePanel}>
                    <div className={styles.formPanelHead}>
                      <FileText size={18} />
                      <strong>Evidence</strong>
                    </div>
                    {selectedEvidence.length === 0 ? (
                      <div className={styles.miniEmpty}>No evidence linked to this criterion.</div>
                    ) : (
                      <div className={styles.evidenceList}>
                        {selectedEvidence.map((item) => (
                          <article key={item.evidenceId}>
                            <strong>{item.note || item.evidenceCategory || item.rawDocumentId || item.evidenceId}</strong>
                            <span>{item.sourceType || 'Evidence'} | Reliability {item.reliability || 'N/A'}</span>
                          </article>
                        ))}
                      </div>
                    )}
                    {editable && documents.length > 0 && (
                      <div className={styles.documentPicker}>
                        {documents.filter((document) => document.rawDocumentId).slice(0, 8).map((document) => (
                          <button
                            type="button"
                            key={document.id}
                            onClick={() => void addDocumentEvidence(selectedKey, document)}
                            disabled={Boolean(actionLoading)}
                          >
                            <Plus size={14} />{document.fileName || `Document #${document.id}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {showAiPanel && (
                  <div className={styles.aiPanel}>
                    <div className={styles.aiPanelHead}>
                      <Bot size={18} />
                      <div>
                        <strong>AI suggestion</strong>
                        <span>{selectedSuggestion?.reviewStatus || 'Not reviewed'} | {selectedSuggestion?.validationStatus || 'Validation N/A'}</span>
                      </div>
                    </div>
                    <p className={styles.managerAiText}>{suggestionText(selectedSuggestion)}</p>
                    {(selectedSuggestion?.missingData?.length || selectedSuggestion?.validationWarnings?.length) ? (
                      <div className={styles.tokenList}>
                        {[...(selectedSuggestion?.missingData || []), ...(selectedSuggestion?.validationWarnings || [])].map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    ) : null}
                    {editable && (
                      <div className={styles.inlineActions}>
                        <button type="button" onClick={() => void generateSuggestion(selectedKey)} disabled={Boolean(actionLoading)}>
                          <Sparkles size={15} /> Generate AI
                        </button>
                        <button type="button" onClick={() => void generateSuggestion()} disabled={Boolean(actionLoading)}>
                          <Sparkles size={15} /> Generate all
                        </button>
                        <button type="button" onClick={() => void acceptSuggestion(selectedKey)} disabled={Boolean(actionLoading || !selectedSuggestion)}>
                          <CheckCircle2 size={15} /> Accept AI
                        </button>
                        <button type="button" onClick={() => void editSuggestion(selectedKey)} disabled={Boolean(actionLoading || !selectedSuggestion)}>
                          <MessageSquare size={15} /> Edit AI
                        </button>
                        <button type="button" onClick={() => void rejectSuggestion(selectedKey)} disabled={Boolean(actionLoading || !selectedSuggestion)}>
                          <XCircle size={15} /> Reject
                        </button>
                        <button type="button" onClick={() => void markNeedsMoreData(selectedKey)} disabled={Boolean(actionLoading || !selectedSuggestion)}>
                          <AlertTriangle size={15} /> Need data
                        </button>
                      </div>
                    )}
                  </div>
                  )}

                  {showStaffInputPanel && (
                  <div className={styles.formPanel}>
                    <div className={styles.formPanelHead}>
                      <MessageSquare size={18} />
                      <strong>{numericRole ? 'Staff score input' : 'Qualitative finding'}</strong>
                    </div>
                    {numericRole && (
                      <label>
                        <span>Score 0-100</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={selectedLocalInput?.rawScore || ''}
                          disabled={!editable}
                          onChange={(event) => setCriterionDrafts((current) => ({
                            ...current,
                            [selectedKey]: { ...(current[selectedKey] || { rawScore: '', explanation: '', evidenceIds: [] }), rawScore: event.target.value },
                          }))}
                        />
                      </label>
                    )}
                    <label>
                      <span>Explanation</span>
                      <textarea
                        value={selectedLocalInput?.explanation || ''}
                        disabled={!editable}
                        placeholder={numericRole ? 'Explain why this score is appropriate...' : 'Write the qualitative finding and rationale...'}
                        onChange={(event) => setCriterionDrafts((current) => ({
                          ...current,
                          [selectedKey]: { ...(current[selectedKey] || { rawScore: '', explanation: '', evidenceIds: [] }), explanation: event.target.value },
                        }))}
                      />
                    </label>
                    {editable && (
                      <button className={styles.primaryButton} type="button" onClick={() => void saveCriterion(selectedKey)} disabled={Boolean(actionLoading)}>
                        {actionLoading === `save-${selectedKey}` ? <Loader2 size={15} className={styles.spin} /> : <CheckCircle2 size={15} />} Save criterion
                      </button>
                    )}
                  </div>
                  )}

                  {showPreviewPanel && (
                  <div className={`${styles.previewPanel} ${mode === 'manager' ? styles.managerPreviewPanel : ''}`}>
                    <div className={styles.formPanelHead}>
                      <Gauge size={18} />
                      <strong>
                        {isApproved && numericRole ? 'Official approved result' : numericRole ? 'Score preview' : 'Qualitative review summary'}
                      </strong>
                    </div>
                    {isApproved && numericRole && officialScore ? (
                      <>
                        <div className={styles.previewDetailGrid}>
                          <div>
                            <span>Approved score</span>
                            <strong>{officialOverallScore !== null ? `${officialOverallScore}/100` : 'N/A'}</strong>
                          </div>
                          <div>
                            <span>Completeness</span>
                            <strong>{officialScore.completenessStatus || 'N/A'}</strong>
                          </div>
                          <div>
                            <span>Calculated at</span>
                            <strong>{officialScore.calculatedAt ? new Date(officialScore.calculatedAt).toLocaleString() : 'N/A'}</strong>
                          </div>
                          <div>
                            <span>Rule version</span>
                            <strong>{officialScore.scoreRuleSetVersion || 'N/A'}</strong>
                          </div>
                          <div>
                            <span>Weight version</span>
                            <strong>{officialScore.weightVersion || 'N/A'}</strong>
                          </div>
                          <div>
                            <span>Weight method</span>
                            <strong>{officialScore.weightingMethod || 'N/A'}</strong>
                          </div>
                        </div>
                        {officialScore.criterionScores && Object.keys(officialScore.criterionScores).length > 0 && (
                          <div className={styles.contributionList}>
                            {Object.entries(officialScore.criterionScores).map(([key, value]) => (
                              <article key={key}>
                                <span>{key}</span>
                                <strong>{String(value)}</strong>
                              </article>
                            ))}
                          </div>
                        )}
                      </>
                    ) : numericRole ? (
                      <div className={styles.previewDetailGrid}>
                        <div>
                          <span>Preview overall score</span>
                          <strong>{displayedPreviewScore !== null ? `${displayedPreviewScore}/100` : 'N/A'}</strong>
                        </div>
                        <div>
                          <span>Completeness</span>
                          <strong>{preview?.completenessStatus || readiness?.aggregateCompletenessStatus || 'Not checked'}</strong>
                        </div>
                        <div>
                          <span>Missing criteria</span>
                          <strong>{preview?.missingCriteria?.length || 0}</strong>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.qualitativeCard}>
                        <strong>No numeric overall score</strong>
                        <span>PARTNER evaluations are approved as qualitative findings with rationale and evidence.</span>
                      </div>
                    )}
                    {!isApproved && preview?.criterionScores && Object.keys(preview.criterionScores).length > 0 && (
                      <div className={styles.contributionList}>
                        {Object.entries(preview.criterionScores).map(([key, value]) => (
                          <article key={key}>
                            <span>{key}</span>
                            <strong>{String(value)}</strong>
                          </article>
                        ))}
                      </div>
                    )}
                    {!isApproved && (
                    <button type="button" onClick={() => draft && void loadDerived(draft)} disabled={Boolean(actionLoading)}>
                      <Gauge size={15} /> Recalculate preview
                    </button>
                    )}
                  </div>
                  )}

                  {showPreviewPanel && effectiveCriteria.length > 0 && (
                    <div className={`${styles.reviewTable} ${mode === 'manager' ? styles.managerReviewTable : ''}`}>
                      <div className={styles.formPanelHead}>
                        <ClipboardCheck size={18} />
                        <strong>{mode === 'manager' ? 'Manager review checklist' : 'Final submission checklist'}</strong>
                      </div>
                      <div className={styles.reviewRows}>
                        {effectiveCriteria.map((criterion) => {
                          const input = draft.criterionInputs?.[criterion.criterionKey];
                          const suggestion = draft.automaticSuggestions?.[criterion.criterionKey];
                          const evidenceCount = draft.criterionEvidence?.[criterion.criterionKey]?.length || 0;
                          const readinessStatus = readiness?.criterionResults?.[criterion.criterionKey]?.sufficiencyStatus;
                          return (
                            <article key={criterion.criterionKey}>
                              <div>
                                <strong>{criterion.criterionName || criterion.criterionKey}</strong>
                                <span>{criterion.criterionKey}</span>
                              </div>
                              <div>
                                <span>AI</span>
                                <strong>{numericRole ? suggestion?.suggestedRawScore ?? 'N/A' : suggestion?.reviewStatus || 'N/A'}</strong>
                              </div>
                              <div>
                                <span>Staff</span>
                                <strong>{numericRole ? input?.rawScore ?? 'Not saved' : input?.explanation ? 'Finding saved' : 'Not saved'}</strong>
                              </div>
                              <div>
                                <span>Evidence</span>
                                <strong>{evidenceCount}</strong>
                              </div>
                              <div>
                                <span>Readiness</span>
                                <strong className={readinessTone(readinessStatus)}>{readinessStatus || 'N/A'}</strong>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className={styles.empty}>No criteria were returned by the active rule set.</div>
              )}
            </main>

            <aside className={`${styles.sidePanel} ${mode === 'manager' ? styles.managerDecisionSide : ''}`}>
              <section className={mode === 'manager' ? styles.managerSideCard : undefined}>
                <h4>Preview</h4>
                {numericRole ? (
                  <div className={styles.previewRing} style={{ '--score': displayedPreviewScore ?? 0 } as React.CSSProperties}>
                    <strong>{displayedPreviewScore ?? 'N/A'}</strong>
                    <span>/100</span>
                  </div>
                ) : (
                  <div className={styles.qualitativeCard}>
                    <strong>Qualitative role</strong>
                    <span>PARTNER evaluations do not create an overall numeric score.</span>
                  </div>
                )}
                <button type="button" onClick={() => draft && void loadDerived(draft)} disabled={Boolean(actionLoading)}>
                  <Gauge size={15} /> Recalculate preview
                </button>
              </section>

              <section className={mode === 'manager' ? styles.managerSideCard : undefined}>
                <h4>Drafts</h4>
                <div className={styles.draftList}>
                  {drafts.map((item) => (
                    <button
                      type="button"
                      className={item.id === draft?.id ? styles.activeDraft : ''}
                      key={item.id}
                      onClick={() => {
                        setDraft(item);
                        void loadDerived(item);
                      }}
                    >
                      <strong>{item.id.slice(-8)}</strong>
                      <span>{item.status}</span>
                    </button>
                  ))}
                </div>
              </section>

              {mode === 'staff' ? (
                <section>
                  <h4>Submit</h4>
                  <textarea
                    value={submitNote}
                    disabled={!editable}
                    placeholder="Optional submission note for the manager..."
                    onChange={(event) => setSubmitNote(event.target.value)}
                  />
                  <button className={styles.primaryButton} type="button" onClick={() => void submitEvaluation()} disabled={!editable || actionLoading === 'submit'}>
                    {actionLoading === 'submit' ? <Loader2 size={15} className={styles.spin} /> : <Send size={15} />} Submit evaluation
                  </button>
                </section>
              ) : (
                <section className={styles.managerDecisionCard}>
                  <div className={styles.managerDecisionHead}>
                    <div>
                      <span className={styles.eyebrow}>Final decision</span>
                      <h4>Manager decision</h4>
                    </div>
                    <span className={`${styles.badge} ${managerCanReview ? styles.good : styles.neutral}`}>
                      {managerCanReview ? 'Action required' : 'Locked'}
                    </span>
                  </div>
                  <textarea
                    value={managerComment}
                    placeholder="Write a clear review note. Revision and reject decisions require a justification."
                    onChange={(event) => onManagerCommentChange?.(event.target.value)}
                    disabled={draft.status === 'APPROVED' || draft.status === 'REJECTED' || draft.status === 'APPROVAL_PROCESSING'}
                  />
                  <div className={styles.managerDecisionHint}>
                    <ClipboardCheck size={16} />
                    <span>Approve only when Staff score, reason, and supporting evidence are consistent for every criterion.</span>
                  </div>
                  <div className={styles.reviewActions}>
                    <button className={styles.revisionButton} type="button" onClick={() => void reviewEvaluation('REQUEST_REVISION')} disabled={Boolean(actionLoading || !managerCanReview)}>
                      <AlertTriangle size={15} /> Revision
                    </button>
                    <button className={styles.rejectButton} type="button" onClick={() => void reviewEvaluation('REJECT')} disabled={Boolean(actionLoading || !managerCanReview)}>
                      <XCircle size={15} /> Reject
                    </button>
                    <button className={styles.primaryButton} type="button" onClick={() => void reviewEvaluation('APPROVE')} disabled={Boolean(actionLoading || !managerCanReview)}>
                      {actionLoading === 'review-APPROVE' ? <Loader2 size={15} className={styles.spin} /> : <CheckCircle2 size={15} />} Approve
                    </button>
                  </div>
                </section>
              )}
            </aside>
          </div>
          )}

          <div className={styles.stepFooter}>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={currentStepIndex <= 0}
              onClick={() => goToAdjacentStep(-1)}
            >
              Back
            </button>
            <div>
              <strong>{steps[currentStepIndex]?.label}</strong>
              <span>{steps[currentStepIndex]?.note}</span>
            </div>
            <button
              className={styles.primaryButton}
              type="button"
              disabled={currentStepIndex >= steps.length - 1}
              onClick={() => goToAdjacentStep(1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
};
