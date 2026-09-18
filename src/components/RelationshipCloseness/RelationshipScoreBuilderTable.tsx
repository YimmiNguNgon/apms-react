import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  FileCheck,
  FileText,
  Info,
  Loader2,
  Save,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import type {
  RelationshipAssessmentResponse,
  CommercialEvidence,
  UpdateRelationshipAssessmentRequest,
} from '../../types/relationshipAssessment';
import styles from './RelationshipCloseness.module.css';
import { CriterionGuidancePopover } from './CriterionGuidancePopover';

const V5_SCORE_OPTIONS = [5, 4, 3, 2, 1, 0];

export type AutoSaveStatus = 'SAVED' | 'DIRTY' | 'SAVING' | 'ERROR';

interface RelationshipScoreBuilderTableProps {
  assessment: RelationshipAssessmentResponse;
  commercialEvidence?: CommercialEvidence | null;
  isOwnerReview?: boolean;
  onSaveDraft: (data: UpdateRelationshipAssessmentRequest) => Promise<void>;
  onSubmit?: (data?: UpdateRelationshipAssessmentRequest) => Promise<void>;
  onComplete?: (data?: UpdateRelationshipAssessmentRequest) => Promise<void>;
  onFinalize?: (data: {
    ownerCommercialScore: number;
    ownerCooperationScore: number;
    ownerStrategicScore: number;
    ownerRelationshipNetworkScore: number;
    ownerRelationshipNetworkNote?: string;
    ownerEngagementScore: number;
    ownerQualitativeScore: number;
    ownerNote?: string;
    ownerAdjustmentReason?: string;
  }) => Promise<void>;
  onRequestChanges?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
  canSubmit?: boolean;
  canComplete?: boolean;
  isManager?: boolean;
  isOwner?: boolean;
  onScoresChange?: (scores: {
    comm: number | null | '';
    coop: number | null | '';
    strat: number | null | '';
    net: number | null | '';
    eng: number | null | '';
    qual: number | null | '';
    ownerComm?: number | null | '';
    ownerCoop?: number | null | '';
    ownerStrat?: number | null | '';
    ownerNet?: number | null | '';
    ownerEng?: number | null | '';
    ownerQual?: number | null | '';
  }) => void;
  onFlushPendingSaveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
}

const formatVnd = (val?: number | null) => {
  if (val == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

const formatDate = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB');
};

const formatDuration = (months?: number | null, firstDate?: string | null) => {
  if (firstDate) {
    const d = new Date(firstDate);
    const diffMonths = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
    const years = Math.floor(diffMonths / 12);
    const remMonths = diffMonths % 12;
    if (years > 0) {
      return `${years} năm ${remMonths > 0 ? `${remMonths} tháng` : ''}`;
    }
    return `${diffMonths} tháng`;
  }
  if (months !== undefined && months !== null) {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years > 0) return `${years} năm ${rem > 0 ? `${rem} tháng` : ''}`;
    return `${months} tháng`;
  }
  return '—';
};

const formatRecency = (recencyMonths?: number | null, latestDate?: string | null) => {
  if (latestDate) {
    const d = new Date(latestDate);
    const diffMonths = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
    if (diffMonths === 0) return 'Trong tháng này';
    if (diffMonths < 12) return `${diffMonths} tháng trước`;
    const years = Math.floor(diffMonths / 12);
    return `${years} năm trước`;
  }
  if (recencyMonths !== undefined && recencyMonths !== null) {
    if (recencyMonths === 0) return 'Trong tháng này';
    if (recencyMonths < 12) return `${recencyMonths} tháng trước`;
    return `${Math.floor(recencyMonths / 12)} năm trước`;
  }
  return '—';
};

export const RelationshipScoreBuilderTable: React.FC<RelationshipScoreBuilderTableProps> = ({
  assessment,
  commercialEvidence,
  isOwnerReview = false,
  onSaveDraft,
  onSubmit,
  onComplete,
  onFinalize,
  onRequestChanges,
  onCancel,
  isSaving = false,
  isSubmitting = false,
  canSubmit = false,
  canComplete = false,
  isManager = false,
  isOwner = false,
  onScoresChange,
  onFlushPendingSaveRef,
}) => {
  const isV5 = assessment.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V5';
  const isV4 = assessment.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V4';
  const isV3 = assessment.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V3';
  const commMax = isV5 ? 5 : isV3 ? 50 : 35;
  const coopMax = isV5 ? 5 : 25;
  const stratMax = isV5 ? 5 : 20;
  const netMax = isV5 ? 5 : isV3 ? 30 : 10;
  const engMax = isV5 ? 5 : isV3 ? 20 : 5;
  const qualMax = 5;

  // System suggested commercial score (for legacy V1..V3)
  const suggestedCommercial =
    assessment.commercialSuggestedScore ??
    commercialEvidence?.commercialScore ??
    assessment.commercialScore ??
    0;

  // Manager scores state (canonical: number | null)
  const [commAwarded, setCommAwarded] = useState<number | null>(
    assessment.commercialAwardedScore !== null && assessment.commercialAwardedScore !== undefined
      ? assessment.commercialAwardedScore
      : (isV4 || isV5)
      ? null
      : assessment.commercialScore !== null && assessment.commercialScore !== undefined
      ? assessment.commercialScore
      : suggestedCommercial
  );
  const [commReason, setCommReason] = useState<string>(
    assessment.commercialAdjustmentReason ?? ''
  );
  const [commEvidenceNote, setCommEvidenceNote] = useState<string>(
    assessment.commercialEvidenceNote ?? ''
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [coop, setCoop] = useState<number | null>(
    assessment.cooperationScore !== null && assessment.cooperationScore !== undefined
      ? assessment.cooperationScore
      : null
  );
  const [coopNote, setCoopNote] = useState<string>(assessment.cooperationEvidenceNote ?? '');

  const [strat, setStrat] = useState<number | null>(
    assessment.strategicScore !== null && assessment.strategicScore !== undefined
      ? assessment.strategicScore
      : null
  );
  const [stratNote, setStratNote] = useState<string>(assessment.strategicEvidenceNote ?? '');

  const [net, setNet] = useState<number | null>(
    assessment.relationshipNetworkScore !== null && assessment.relationshipNetworkScore !== undefined
      ? assessment.relationshipNetworkScore
      : null
  );
  const [netNote, setNetNote] = useState<string>(
    assessment.relationshipNetworkNote ?? ''
  );

  const [eng, setEng] = useState<number | null>(
    assessment.engagementScore !== null && assessment.engagementScore !== undefined
      ? assessment.engagementScore
      : null
  );
  const [engNote, setEngNote] = useState<string>(assessment.engagementEvidenceNote ?? '');

  const [qual, setQual] = useState<number | null>(
    assessment.trustScore !== null && assessment.trustScore !== undefined
      ? assessment.trustScore
      : assessment.qualitativeScore !== null && assessment.qualitativeScore !== undefined
      ? assessment.qualitativeScore
      : null
  );
  const [qualNote, setQualNote] = useState<string>(
    assessment.trustEvidenceNote ?? assessment.qualitativeEvidenceNote ?? ''
  );

  const [managerNote, setManagerNote] = useState<string>(
    !isV5 && assessment.managerNote ? assessment.managerNote : ''
  );

  // Owner Review state (User Correction 2 & 5: Adapt score area to show Manager and Owner Final)
  const [ownerComm, setOwnerComm] = useState<number | null>(
    assessment.ownerCommercialScore !== null && assessment.ownerCommercialScore !== undefined
      ? assessment.ownerCommercialScore
      : assessment.commercialAwardedScore !== null && assessment.commercialAwardedScore !== undefined
      ? assessment.commercialAwardedScore
      : (isV4 || isV5)
      ? null
      : assessment.commercialScore ?? suggestedCommercial
  );
  const [ownerCoop, setOwnerCoop] = useState<number | null>(
    assessment.ownerCooperationScore !== null && assessment.ownerCooperationScore !== undefined
      ? assessment.ownerCooperationScore
      : assessment.cooperationScore ?? null
  );
  const [ownerStrat, setOwnerStrat] = useState<number | null>(
    assessment.ownerStrategicScore !== null && assessment.ownerStrategicScore !== undefined
      ? assessment.ownerStrategicScore
      : assessment.strategicScore ?? null
  );
  const [ownerNet, setOwnerNet] = useState<number | null>(
    assessment.ownerRelationshipNetworkScore !== null && assessment.ownerRelationshipNetworkScore !== undefined
      ? assessment.ownerRelationshipNetworkScore
      : assessment.relationshipNetworkScore ?? null
  );
  const [ownerNetNote, setOwnerNetNote] = useState<string>(
    assessment.ownerRelationshipNetworkNote ?? assessment.relationshipNetworkNote ?? ''
  );
  const [ownerEng, setOwnerEng] = useState<number | null>(
    assessment.ownerEngagementScore !== null && assessment.ownerEngagementScore !== undefined
      ? assessment.ownerEngagementScore
      : assessment.engagementScore ?? null
  );
  const [ownerQual, setOwnerQual] = useState<number | null>(
    assessment.ownerTrustScore !== null && assessment.ownerTrustScore !== undefined
      ? assessment.ownerTrustScore
      : assessment.ownerQualitativeScore !== null && assessment.ownerQualitativeScore !== undefined
      ? assessment.ownerQualitativeScore
      : assessment.trustScore ?? assessment.qualitativeScore ?? null
  );
  const [ownerNote, setOwnerNote] = useState<string>(assessment.ownerNote ?? '');
  const [ownerReason, setOwnerReason] = useState<string>(assessment.ownerAdjustmentReason ?? '');

  // Notify parent of live score changes
  useEffect(() => {
    if (onScoresChange) {
      onScoresChange({
        comm: commAwarded,
        coop: isV3 ? null : coop,
        strat: isV3 ? null : strat,
        net,
        eng,
        qual: isV3 ? null : qual,
        ownerComm: isOwnerReview ? ownerComm : undefined,
        ownerCoop: isOwnerReview && !isV3 ? ownerCoop : undefined,
        ownerStrat: isOwnerReview && !isV3 ? ownerStrat : undefined,
        ownerNet: isOwnerReview ? ownerNet : undefined,
        ownerEng: isOwnerReview ? ownerEng : undefined,
        ownerQual: isOwnerReview && !isV3 ? ownerQual : undefined,
      });
    }
  }, [
    commAwarded,
    coop,
    strat,
    net,
    eng,
    qual,
    ownerComm,
    ownerCoop,
    ownerStrat,
    ownerNet,
    ownerEng,
    ownerQual,
    isOwnerReview,
    isV3,
    onScoresChange,
  ]);

  const handleScoreChange = (
    val: string,
    setter: (v: number | null) => void,
    max: number
  ) => {
    if (val.trim() === '') {
      setter(null);
      scheduleSave(300);
      return;
    }
    const num = parseInt(val, 10);
    if (Number.isNaN(num)) return;
    setter(Math.max(0, Math.min(max, num)));
    scheduleSave(300);
  };

  // Auto-save state machine
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('SAVED');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const isSavingInProgressRef = useRef(false);
  const pendingPayloadRef = useRef<UpdateRelationshipAssessmentRequest | null>(null);
  const persistedPayloadRef = useRef<string>('');
  const baselinePayloadRef = useRef<string>('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  // Keep latest mutable values for fresh reads in async/debounced callbacks without closure stale reads
  const latestValuesRef = useRef({
    commAwarded,
    commEvidenceNote,
    commReason,
    coop,
    coopNote,
    strat,
    stratNote,
    net,
    netNote,
    eng,
    engNote,
    qual,
    qualNote,
    managerNote,
  });

  latestValuesRef.current = {
    commAwarded,
    commEvidenceNote,
    commReason,
    coop,
    coopNote,
    strat,
    stratNote,
    net,
    netNote,
    eng,
    engNote,
    qual,
    qualNote,
    managerNote,
  };

  const isDraft = assessment.status === 'DRAFT';
  const canAutoSave = isDraft && !isOwnerReview && Boolean(canComplete || canSubmit || isManager);

  // Build payload for Manager Save Draft / Submit / Complete
  const getManagerPayload = useCallback((): UpdateRelationshipAssessmentRequest => {
    const v = latestValuesRef.current;
    return {
      fullSnapshot: isV5 ? true : undefined,
      isFullSnapshot: isV5 ? true : undefined,
      commercialAwardedScore: v.commAwarded,
      commercialAdjustmentReason: (isV4 || isV5) ? null : (v.commReason.trim() || null),
      commercialEvidenceNote: (isV4 || isV5) ? (v.commEvidenceNote.trim() || null) : null,
      cooperationScore: isV3 ? null : v.coop,
      cooperationEvidenceNote: isV3 ? null : (v.coopNote.trim() || null),
      strategicScore: isV3 ? null : v.strat,
      strategicEvidenceNote: isV3 ? null : (v.stratNote.trim() || null),
      relationshipNetworkScore: v.net,
      relationshipNetworkNote: v.netNote.trim() || null,
      engagementScore: v.eng,
      engagementEvidenceNote: v.engNote.trim() || null,
      qualitativeScore: isV3 ? null : v.qual,
      qualitativeEvidenceNote: isV3 ? null : (v.qualNote.trim() || null),
      trustScore: isV5 ? v.qual : undefined,
      trustEvidenceNote: isV5 ? (v.qualNote.trim() || null) : undefined,
      managerNote: isV5 ? undefined : (v.managerNote.trim() || null),
    };
  }, [isV5, isV4, isV3]);

  // Initial baseline hydration: runs once on mount
  useEffect(() => {
    isMountedRef.current = true;
    const initialPayload = getManagerPayload();
    const serialized = JSON.stringify(initialPayload);
    baselinePayloadRef.current = serialized;
    persistedPayloadRef.current = serialized;
    setAutoSaveStatus('SAVED');
    setIsDirty(false);

    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Single-flight + latest-payload queue save dispatcher
  const triggerAutoSave = useCallback(async () => {
    if (!canAutoSave) return;
    const latestPayload = getManagerPayload();
    const serialized = JSON.stringify(latestPayload);

    // If latest payload equals persisted payload, nothing new to save
    if (serialized === persistedPayloadRef.current) {
      if (isMountedRef.current) {
        setAutoSaveStatus('SAVED');
        setIsDirty(false);
      }
      return;
    }

    pendingPayloadRef.current = latestPayload;

    // If a save request is already in flight, the running loop will pick up pendingPayloadRef upon completion
    if (isSavingInProgressRef.current) {
      return;
    }

    isSavingInProgressRef.current = true;
    if (isMountedRef.current) {
      setAutoSaveStatus('SAVING');
    }

    while (pendingPayloadRef.current !== null) {
      const payloadToSave = pendingPayloadRef.current;
      const payloadString = JSON.stringify(payloadToSave);
      pendingPayloadRef.current = null;

      try {
        await onSaveDraft(payloadToSave);
        persistedPayloadRef.current = payloadString;
        baselinePayloadRef.current = payloadString;
        if (isMountedRef.current) {
          setLastSavedAt(new Date());
        }
      } catch (err) {
        isSavingInProgressRef.current = false;
        if (isMountedRef.current) {
          setAutoSaveStatus('ERROR');
          setIsDirty(true);
        }
        return;
      }
    }

    isSavingInProgressRef.current = false;
    if (!isMountedRef.current) return;

    // After loop finishes, verify if another edit occurred right before loop exit
    const finalPayload = getManagerPayload();
    if (JSON.stringify(finalPayload) === persistedPayloadRef.current) {
      setAutoSaveStatus('SAVED');
      setIsDirty(false);
    } else {
      pendingPayloadRef.current = finalPayload;
      triggerAutoSave();
    }
  }, [canAutoSave, getManagerPayload, onSaveDraft]);

  // Schedule auto-save with specific debounce
  const scheduleSave = useCallback((delayMs: number) => {
    if (!canAutoSave) return;
    if (isMountedRef.current) {
      setAutoSaveStatus('DIRTY');
      setIsDirty(true);
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      triggerAutoSave();
    }, delayMs);
  }, [canAutoSave, triggerAutoSave]);

  const handleScoreSelect = (
    val: string,
    setter: (v: number | null) => void
  ) => {
    let nextVal: number | null = null;
    if (val !== '') {
      const parsed = parseInt(val, 10);
      nextVal = Number.isNaN(parsed) ? null : parsed;
    }
    setter(nextVal);
    scheduleSave(300);
  };

  const handleNoteChange = (
    val: string,
    setter: (v: string) => void
  ) => {
    setter(val);
    scheduleSave(700);
  };

  // Controlled navigation flush
  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const currentPayload = getManagerPayload();
    if (JSON.stringify(currentPayload) === persistedPayloadRef.current && !isSavingInProgressRef.current) {
      return true;
    }
    try {
      await triggerAutoSave();
      return persistedPayloadRef.current === JSON.stringify(getManagerPayload());
    } catch {
      return false;
    }
  }, [getManagerPayload, triggerAutoSave]);

  useEffect(() => {
    if (onFlushPendingSaveRef) {
      onFlushPendingSaveRef.current = flushPendingSave;
    }
    return () => {
      if (onFlushPendingSaveRef) {
        onFlushPendingSaveRef.current = null;
      }
    };
  }, [flushPendingSave, onFlushPendingSaveRef]);

  // Browser reload / tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty || autoSaveStatus === 'SAVING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, autoSaveStatus]);

  const handleRetry = () => {
    triggerAutoSave();
  };

  // Validation logic
  const isDiffFromSuggested = commAwarded !== null && commAwarded !== suggestedCommercial;
  const isCommReasonRequired = (isV4 || isV5)
    ? false
    : isV3
    ? isDiffFromSuggested ||
      assessment.commercialSuggestionStatus === 'PARTIAL' ||
      assessment.commercialSuggestionStatus === 'UNAVAILABLE'
    : isDiffFromSuggested;

  const isOwnerAdjusted = isOwnerReview && (
    (ownerComm !== null && ownerComm !== (assessment.ownerCommercialScore ?? assessment.commercialAwardedScore ?? ((isV4 || isV5) ? null : assessment.commercialScore ?? suggestedCommercial))) ||
    (ownerEng !== null && ownerEng !== (assessment.ownerEngagementScore ?? assessment.engagementScore)) ||
    (ownerNet !== null && ownerNet !== (assessment.ownerRelationshipNetworkScore ?? assessment.relationshipNetworkScore)) ||
    (!isV3 && (
      (ownerCoop !== null && ownerCoop !== (assessment.ownerCooperationScore ?? assessment.cooperationScore)) ||
      (ownerStrat !== null && ownerStrat !== (assessment.ownerStrategicScore ?? assessment.strategicScore)) ||
      (ownerQual !== null && ownerQual !== (assessment.ownerTrustScore ?? assessment.ownerQualitativeScore ?? assessment.trustScore ?? assessment.qualitativeScore))
    ))
  );

  // Check completeness (null means unassessed, 0 is assessed)
  const isAssessed = (v: number | null) => v !== null && v !== undefined;
  const completedCriteriaCount = isV3
    ? [commAwarded, eng, net].filter(isAssessed).length
    : [commAwarded, coop, strat, net, eng, qual].filter(isAssessed).length;
  const isComplete = completedCriteriaCount === (isV3 ? 3 : 6);

  // Live completion preview (only displayed when all 6 criteria are assessed in V5)
  const liveResult = useMemo(() => {
    if (!isV5) return null;
    if (
      commAwarded === null ||
      coop === null ||
      strat === null ||
      net === null ||
      eng === null ||
      qual === null
    ) {
      return null;
    }
    const raw = commAwarded + coop + strat + net + eng + qual;
    const normalized = (raw / 30.0) * 100.0;
    const displayScore = Math.min(100, Math.round(normalized));
    const rank =
      normalized >= 90.0 ? 'A' : normalized >= 60.0 ? 'B' : normalized >= 30.0 ? 'C' : 'D';
    return {
      displayScore,
      rank,
    };
  }, [isV5, commAwarded, coop, strat, net, eng, qual]);

  const handleComplete = async () => {
    setSubmitAttempted(true);
    if (!isComplete) {
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    const payload = getManagerPayload();
    if (onComplete) {
      await onComplete(payload);
    } else if (onSubmit) {
      await onSaveDraft(payload);
      await onSubmit(payload);
    }
  };

  const handleSubmit = async () => {
    await handleComplete();
  };

  const handleOwnerFinalize = async () => {
    if (!onFinalize) return;
    if (isOwnerAdjusted && !ownerReason.trim()) {
      return;
    }
    await onFinalize({
      ownerCommercialScore: ownerComm == null ? Number(commAwarded) : Number(ownerComm),
      ownerCooperationScore: isV3 ? 0 : (ownerCoop == null ? Number(coop) : Number(ownerCoop)),
      ownerStrategicScore: isV3 ? 0 : (ownerStrat == null ? Number(strat) : Number(ownerStrat)),
      ownerRelationshipNetworkScore: ownerNet == null ? Number(net) : Number(ownerNet),
      ownerRelationshipNetworkNote: ownerNetNote.trim() || undefined,
      ownerEngagementScore: ownerEng == null ? Number(eng) : Number(ownerEng),
      ownerQualitativeScore: isV3 ? 0 : (ownerQual == null ? Number(qual) : Number(ownerQual)),
      ownerNote: ownerNote.trim() || undefined,
      ownerAdjustmentReason: ownerReason.trim() || undefined,
    });
  };

  // Evidence metadata
  const contractCount = assessment.approvedContractCount ?? commercialEvidence?.approvedContractCount ?? 0;
  const contractValueStatus = assessment.contractValueStatus ?? commercialEvidence?.contractValueStatus ?? 'SCORABLE';
  const totalVnd = assessment.totalContractValueVnd ?? commercialEvidence?.totalContractValueVnd;
  const firstCoop = assessment.firstCooperationDate ?? commercialEvidence?.firstCooperationDate;
  const latestContract = assessment.latestContractDate ?? commercialEvidence?.latestContractDate;
  const currencies = assessment.contractCurrencies ?? commercialEvidence?.contractCurrencies;
  const durationMonths = assessment.firstCooperationDate ? null : commercialEvidence?.relationshipDurationMonths;
  const recencyMonths = assessment.latestContractDate ? null : commercialEvidence?.contractRecencyMonths;

  const contractSegments: string[] = [];
  if (contractCount > 0) {
    contractSegments.push(`${contractCount} hợp đồng`);
  }
  if (totalVnd != null && totalVnd > 0) {
    contractSegments.push(formatVnd(totalVnd));
  }
  const durationText = formatDuration(durationMonths, firstCoop);
  if (durationText && durationText !== '—') {
    contractSegments.push(`hợp tác ${durationText}`);
  }
  const recencyText = formatRecency(recencyMonths, latestContract);
  if (recencyText && recencyText !== '—') {
    contractSegments.push(`gần nhất ${recencyText}`);
  }
  const compactContractEvidence =
    contractSegments.length > 0 ? (
      <span>
        <strong>Tham khảo:</strong> {contractSegments.join(' · ')}
      </span>
    ) : undefined;

  return (
    <div className={styles.builderCard}>
      {/* Header */}
      <div className={styles.builderHeader}>
        <div>
          <h3 className={styles.builderTitle}>Chi tiết đánh giá</h3>
          <p className={styles.builderSubtitle}>
            {isOwnerReview
              ? 'Business Owner thẩm định và phê duyệt kết quả đánh giá từ Manager.'
              : 'Nhập điểm số thủ công cho từng tiêu chí theo hướng dẫn quy chuẩn.'}
          </p>
        </div>
        <div className={styles.completionIndicator}>
          <span style={{ fontWeight: 700, color: isComplete ? '#15803d' : '#2563eb' }}>
            {completedCriteriaCount} / {isV3 ? 3 : 6}
          </span>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>tiêu chí đã nhập điểm</span>
        </div>
      </div>

      {/* Main Assessment Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.builderTable}>
          <thead>
            {isV5 ? (
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                <th style={{ width: '35%' }}>Tiêu chí</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Điểm đánh giá</th>
                <th style={{ width: '40%' }}>Ghi chú (Tùy chọn)</th>
              </tr>
            ) : (
              <tr>
                <th style={{ width: '4%' }}>#</th>
                <th style={{ width: isOwnerReview ? '16%' : '17%' }}>Tiêu chí</th>
                <th style={{ width: isOwnerReview ? '28%' : '30%' }}>Rule / Hướng dẫn chấm</th>
                <th style={{ width: isOwnerReview ? '8%' : '9%', textAlign: 'center' }}>Điểm tối đa</th>
                {isOwnerReview ? (
                  <>
                    <th style={{ width: '10%', textAlign: 'center' }}>Manager Score</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Owner Final</th>
                  </>
                ) : (
                  <th style={{ width: '12%', textAlign: 'center' }}>Điểm nhập</th>
                )}
                <th style={{ width: isOwnerReview ? '24%' : '28%' }}>Ghi chú / Lý do</th>
              </tr>
            )}
          </thead>
          <tbody>
            {isV3 ? (
              <>
                {/* ========================================================================= */}
                {/* V3 ROW 1: COMMERCIAL RELATIONSHIP (0..50)                                */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>1</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className={styles.dimensionName}>Commercial Relationship</span>
                      <span className={styles.badgeAutoSuggested}>Tự động gợi ý</span>
                    </div>
                    <div className={styles.dimensionSource}>Hợp đồng phê duyệt APMS (0–50)</div>
                  </td>
                  <td>
                    {/* Compact Highlighted Evidence Box */}
                    <div className={styles.evidenceHighlightBox}>
                      <div className={styles.evidenceGridTwoCol}>
                        <div>
                          <span className={styles.evidenceItemLabel}>Approved Contracts:</span>{' '}
                          <strong>{contractCount}</strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Total Value:</span>{' '}
                          <strong>
                            {contractValueStatus === 'UNSCORABLE_NON_VND'
                              ? `N/A (${currencies || 'Non-VND'})`
                              : formatVnd(totalVnd)}
                          </strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Relationship Duration:</span>{' '}
                          <strong>{formatDuration(durationMonths, firstCoop)}</strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Latest Contract:</span>{' '}
                          <strong>{formatRecency(recencyMonths, latestContract)}</strong>
                        </div>
                      </div>

                      {assessment.commercialSuggestionStatus === 'PARTIAL' && (
                        <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 4 }}>
                          ⚠️ Dữ liệu hợp đồng chưa đầy đủ ({assessment.commercialAvailablePoints ?? 30}/50 điểm khả dụng). Cần ghi rõ lý do điều chỉnh khi nộp.
                        </div>
                      )}
                      {assessment.commercialSuggestionStatus === 'UNAVAILABLE' && (
                        <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 4 }}>
                          ⚠️ Không có dữ liệu hợp đồng thương mại hợp lệ (0/50 điểm khả dụng). Cần ghi rõ lý do điều chỉnh khi nộp.
                        </div>
                      )}
                      {contractValueStatus === 'UNSCORABLE_NON_VND' && assessment.commercialSuggestionStatus === 'COMPLETE' && (
                        <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 4 }}>
                          ⚠️ Non-VND contracts. Điểm giá trị hợp đồng không thể tính tự động.
                        </div>
                      )}

                      <div className={styles.suggestedScorePill}>
                        Điểm hệ thống gợi ý: <strong>{suggestedCommercial} / {assessment.commercialAvailablePoints ?? 50}</strong>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    50
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.commercialAwardedScore ?? assessment.commercialScore ?? suggestedCommercial} / 50
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={50}
                            className={styles.scoreInput}
                            value={ownerComm ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerComm, 50)}
                          />
                          <span className={styles.scoreInputMax}>/ 50</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={50}
                          placeholder="0–50"
                          className={styles.scoreInput}
                          value={commAwarded ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setCommAwarded, 50)}
                        />
                        <span className={styles.scoreInputMax}>/ 50</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {!isOwnerReview ? (
                      isCommReasonRequired ? (
                        <div className={styles.reasonFieldContainer}>
                          <label className={styles.reasonLabel}>
                            Lý do điều chỉnh (Commercial vs Gợi ý) <span style={{ color: '#dc2626' }}>* (Bắt buộc)</span>
                          </label>
                          <textarea
                            className={styles.reasonInput}
                            style={{ border: !commReason.trim() ? '1.5px solid #f97316' : undefined }}
                            placeholder="Giải thích lý do điều chỉnh điểm so với gợi ý hệ thống..."
                            value={commReason}
                            onChange={(e) => setCommReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Điểm tự động theo dữ liệu hợp đồng APMS.
                        </span>
                      )
                    ) : (
                      <div>
                        {assessment.commercialAdjustmentReason && (
                          <div style={{ fontSize: '0.76rem', color: '#b45309', marginBottom: 4 }}>
                            <strong>Manager điều chỉnh:</strong> {assessment.commercialAdjustmentReason}
                          </div>
                        )}
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          (Xem lý do điều chỉnh Owner bên dưới)
                        </span>
                      </div>
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V3 ROW 2: BUSINESS ENGAGEMENT (0..20)                                    */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>2</td>
                  <td>
                    <span className={styles.dimensionName}>Business Engagement</span>
                    <div className={styles.dimensionSource}>Thủ công (0–20) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>16–20:</span> Hợp tác chiến lược thường xuyên, đối tác ưu tiên cao nhất, phối hợp đa tầng</div>
                      <div><span className={styles.tierTag}>11–15:</span> Gắn kết tích cực, tương tác định kỳ, phối hợp hiệu quả</div>
                      <div><span className={styles.tierTag}>6–10:</span> Tương tác mức độ cơ bản, phối hợp khi có phát sinh công việc</div>
                      <div><span className={styles.tierTag}>1–5:</span> Rất ít tương tác / gắn kết yếu</div>
                      <div><span className={styles.tierTag}>0:</span> Không có tương tác</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    20
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.engagementScore !== null ? `${assessment.engagementScore} / 20` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            className={styles.scoreInput}
                            value={ownerEng ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerEng, 20)}
                          />
                          <span className={styles.scoreInputMax}>/ 20</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          placeholder="0–20"
                          className={styles.scoreInput}
                          value={eng ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setEng, 20)}
                        />
                        <span className={styles.scoreInputMax}>/ 20</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.engagementEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !engNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú hoạt động gắn kết doanh nghiệp (Bắt buộc khi nộp)..."
                        value={engNote}
                        onChange={(e) => setEngNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V3 ROW 3: RELATIONSHIP NETWORK (0..30)                                   */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>3</td>
                  <td>
                    <span className={styles.dimensionName}>Relationship Network</span>
                    <div className={styles.dimensionSource}>Thủ công (0–30) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>25–30:</span> Mạng lưới sâu rộng tới C-Level / Ban Giám đốc & key decision makers</div>
                      <div><span className={styles.tierTag}>18–24:</span> Quan hệ trực tiếp với Department Head / Senior Managers</div>
                      <div><span className={styles.tierTag}>10–17:</span> Quan hệ ở cấp quản lý vận hành / Project Managers</div>
                      <div><span className={styles.tierTag}>1–9:</span> Chỉ có đầu mối liên hệ cấp nhân viên / staff-level</div>
                      <div><span className={styles.tierTag}>0:</span> Không có đầu mối liên hệ rõ ràng</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    30
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.relationshipNetworkScore !== null ? `${assessment.relationshipNetworkScore} / 30` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            className={styles.scoreInput}
                            value={ownerNet ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerNet, 30)}
                          />
                          <span className={styles.scoreInputMax}>/ 30</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          placeholder="0–30"
                          className={styles.scoreInput}
                          value={net ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setNet, 30)}
                        />
                        <span className={styles.scoreInputMax}>/ 30</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {ownerNetNote || assessment.relationshipNetworkNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !netNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú đầu mối liên hệ và sức mạnh mạng lưới (Bắt buộc khi nộp)..."
                        value={netNote}
                        onChange={(e) => setNetNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>
              </>
            ) : isV5 ? (
              <>
                {/* ========================================================================= */}
                {/* V5 ROW 1: COMMERCIAL RELATIONSHIP (0..5)                                   */}
                {/* Compact Dropdown Scoring + Hover Guidance + Optional Note                 */}
                {/* ========================================================================= */}
                <tr className={styles.compactTableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>1</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.dimensionName}>Commercial Relationship</span>
                      <CriterionGuidancePopover
                        criterionKey="commercial"
                        contractEvidenceSummary={compactContractEvidence}
                      />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`${styles.scoreSelect} ${commAwarded === null ? styles.scoreSelectUnset : ''}`}
                      value={commAwarded !== null && commAwarded !== undefined ? String(commAwarded) : ''}
                      onChange={(e) => handleScoreSelect(e.target.value, setCommAwarded)}
                    >
                      <option value="">Chọn điểm</option>
                      {V5_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      className={styles.optionalNoteInput}
                      placeholder="Ghi chú thêm nếu cần..."
                      value={commEvidenceNote}
                      onChange={(e) => handleNoteChange(e.target.value, setCommEvidenceNote)}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V5 ROW 2: INTERACTION & COOPERATION (0..5)                                 */}
                {/* ========================================================================= */}
                <tr className={styles.compactTableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>2</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.dimensionName}>Interaction & Cooperation</span>
                      <CriterionGuidancePopover criterionKey="cooperation" />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`${styles.scoreSelect} ${coop === null ? styles.scoreSelectUnset : ''}`}
                      value={coop !== null && coop !== undefined ? String(coop) : ''}
                      onChange={(e) => handleScoreSelect(e.target.value, setCoop)}
                    >
                      <option value="">Chọn điểm</option>
                      {V5_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      className={styles.optionalNoteInput}
                      placeholder="Ghi chú thêm nếu cần..."
                      value={coopNote}
                      onChange={(e) => handleNoteChange(e.target.value, setCoopNote)}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V5 ROW 3: STRATEGIC IMPORTANCE (0..5)                                      */}
                {/* ========================================================================= */}
                <tr className={styles.compactTableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>3</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.dimensionName}>Strategic Importance</span>
                      <CriterionGuidancePopover criterionKey="strategic" />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`${styles.scoreSelect} ${strat === null ? styles.scoreSelectUnset : ''}`}
                      value={strat !== null && strat !== undefined ? String(strat) : ''}
                      onChange={(e) => handleScoreSelect(e.target.value, setStrat)}
                    >
                      <option value="">Chọn điểm</option>
                      {V5_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      className={styles.optionalNoteInput}
                      placeholder="Ghi chú thêm nếu cần..."
                      value={stratNote}
                      onChange={(e) => handleNoteChange(e.target.value, setStratNote)}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V5 ROW 4: RELATIONSHIP NETWORK (0..5)                                      */}
                {/* ========================================================================= */}
                <tr className={styles.compactTableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>4</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.dimensionName}>Relationship Network</span>
                      <CriterionGuidancePopover criterionKey="network" />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`${styles.scoreSelect} ${net === null ? styles.scoreSelectUnset : ''}`}
                      value={net !== null && net !== undefined ? String(net) : ''}
                      onChange={(e) => handleScoreSelect(e.target.value, setNet)}
                    >
                      <option value="">Chọn điểm</option>
                      {V5_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      className={styles.optionalNoteInput}
                      placeholder="Ghi chú thêm nếu cần..."
                      value={netNote}
                      onChange={(e) => handleNoteChange(e.target.value, setNetNote)}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V5 ROW 5: BUSINESS ENGAGEMENT (0..5)                                       */}
                {/* ========================================================================= */}
                <tr className={styles.compactTableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>5</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.dimensionName}>Business Engagement</span>
                      <CriterionGuidancePopover criterionKey="engagement" />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`${styles.scoreSelect} ${eng === null ? styles.scoreSelectUnset : ''}`}
                      value={eng !== null && eng !== undefined ? String(eng) : ''}
                      onChange={(e) => handleScoreSelect(e.target.value, setEng)}
                    >
                      <option value="">Chọn điểm</option>
                      {V5_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      className={styles.optionalNoteInput}
                      placeholder="Ghi chú thêm nếu cần..."
                      value={engNote}
                      onChange={(e) => handleNoteChange(e.target.value, setEngNote)}
                      rows={2}
                    />
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V5 ROW 6: TRUST & RELIABILITY (0..5)                                       */}
                {/* ========================================================================= */}
                <tr className={styles.compactTableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b', textAlign: 'center' }}>6</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className={styles.dimensionName}>Trust & Reliability</span>
                      <CriterionGuidancePopover criterionKey="trust" />
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <select
                      className={`${styles.scoreSelect} ${qual === null ? styles.scoreSelectUnset : ''}`}
                      value={qual !== null && qual !== undefined ? String(qual) : ''}
                      onChange={(e) => handleScoreSelect(e.target.value, setQual)}
                    >
                      <option value="">Chọn điểm</option>
                      {V5_SCORE_OPTIONS.map((score) => (
                        <option key={score} value={score}>
                          {score}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <textarea
                      className={styles.optionalNoteInput}
                      placeholder="Ghi chú thêm nếu cần..."
                      value={qualNote}
                      onChange={(e) => handleNoteChange(e.target.value, setQualNote)}
                      rows={2}
                    />
                  </td>
                </tr>
              </>
            ) : isV4 ? (
              <>
                {/* ========================================================================= */}
                {/* V4 ROW 1: COMMERCIAL RELATIONSHIP (0..35)                                 */}
                {/* Guided Manual Scoring — Contract Evidence Reference Only                  */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>1</td>
                  <td>
                    <span className={styles.dimensionName}>Commercial Relationship</span>
                    <div className={styles.dimensionSource}>Thủ công (0–35) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    {/* Supporting Contract Evidence Box */}
                    <div className={styles.evidenceHighlightBox}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} style={{ color: '#2563eb' }} />
                        <span>Dữ liệu hợp đồng tham khảo</span>
                      </div>
                      <div className={styles.evidenceGridTwoCol}>
                        <div>
                          <span className={styles.evidenceItemLabel}>Approved Contracts:</span>{' '}
                          <strong>{contractCount !== undefined && contractCount !== null ? contractCount : '—'}</strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Total Value (VND):</span>{' '}
                          <strong>
                            {contractValueStatus === 'UNSCORABLE_NON_VND'
                              ? `N/A (${currencies || 'Non-VND'})`
                              : totalVnd != null
                              ? formatVnd(totalVnd)
                              : '—'}
                          </strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Relationship Duration:</span>{' '}
                          <strong>{(firstCoop || durationMonths != null) ? formatDuration(durationMonths, firstCoop) : '—'}</strong>
                          {firstCoop && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 4 }}>
                              (từ {formatDate(firstCoop)})
                            </span>
                          )}
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Latest Contract:</span>{' '}
                          <strong>{(latestContract || recencyMonths != null) ? formatRecency(recencyMonths, latestContract) : '—'}</strong>
                          {latestContract && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: 4 }}>
                              ({formatDate(latestContract)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* V4 Scoring Bands Guidance */}
                    <div className={styles.guidanceTiersList} style={{ marginTop: 10 }}>
                      <div>
                        <span className={styles.tierTag} style={{ minWidth: 140 }}>29–35 — RẤT MẠNH:</span>{' '}
                        Quan hệ thương mại rất mạnh, hợp đồng giá trị lớn, đối tác cốt lõi, hợp tác liên tục và gần đây vẫn có giao dịch.{' '}
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>(Very strong, long-term and active commercial relationship)</span>
                      </div>
                      <div>
                        <span className={styles.tierTag} style={{ minWidth: 140 }}>22–28 — MẠNH:</span>{' '}
                        Quan hệ thương mại mạnh và tương đối ổn định, có nhiều hợp đồng hoặc hợp đồng giá trị khá, phát sinh đều đặn.{' '}
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>(Strong and stable commercial relationship)</span>
                      </div>
                      <div>
                        <span className={styles.tierTag} style={{ minWidth: 140 }}>15–21 — TRUNG BÌNH:</span>{' '}
                        Có quan hệ thương mại rõ ràng nhưng chưa sâu, giá trị hợp đồng ở mức vừa phải, hoặc hợp tác chưa lâu.{' '}
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>(Established but moderate commercial relationship)</span>
                      </div>
                      <div>
                        <span className={styles.tierTag} style={{ minWidth: 140 }}>8–14 — HẠN CHẾ:</span>{' '}
                        Quan hệ thương mại còn hạn chế, số lượng hợp đồng ít, giá trị nhỏ, hoặc đã lâu không có hợp đồng mới.{' '}
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>(Limited commercial relationship)</span>
                      </div>
                      <div>
                        <span className={styles.tierTag} style={{ minWidth: 140 }}>0–7 — RẤT THẤP:</span>{' '}
                        Hầu như không có quan hệ thương mại đáng kể, chưa có hợp đồng lớn, hoặc chỉ có giao dịch rời rạc không đáng kể.{' '}
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>(Very little or no meaningful commercial relationship)</span>
                      </div>
                    </div>

                    {/* Helper explanation below bands */}
                    <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                        Manager xem xét đồng thời 4 yếu tố:
                      </div>
                      <ul style={{ margin: '0 0 6px 18px', padding: 0, listStyleType: 'disc' }}>
                        <li>Giá trị hợp đồng</li>
                        <li>Số lượng hợp đồng</li>
                        <li>Thời gian hợp tác</li>
                        <li>Mức độ gần đây của hợp đồng</li>
                      </ul>
                      <div style={{ marginBottom: 4 }}>
                        để xác định khoảng điểm phù hợp.
                      </div>
                      <div style={{ fontStyle: 'italic', color: '#64748b' }}>
                        <div>• <strong>Điểm ở đầu khoảng:</strong> chỉ vừa đạt mức đánh giá đó.</div>
                        <div>• <strong>Điểm ở giữa khoảng:</strong> bằng chứng rõ ràng phù hợp với mức đó.</div>
                        <div>• <strong>Điểm ở cuối khoảng:</strong> bằng chứng rất mạnh và gần đạt mức tiếp theo.</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    35
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.commercialAwardedScore !== null && assessment.commercialAwardedScore !== undefined
                          ? `${assessment.commercialAwardedScore} / 35`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={35}
                            placeholder="0–35"
                            className={styles.scoreInput}
                            value={ownerComm ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerComm, 35)}
                          />
                          <span className={styles.scoreInputMax}>/ 35</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={35}
                          placeholder="0–35"
                          className={styles.scoreInput}
                          value={commAwarded ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setCommAwarded, 35)}
                        />
                        <span className={styles.scoreInputMax}>/ 35</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {!isOwnerReview ? (
                      <div>
                        <textarea
                          className={styles.noteInput}
                          style={{
                            border:
                              !commEvidenceNote.trim() && (submitAttempted || isComplete)
                                ? '1.5px solid #dc2626'
                                : !commEvidenceNote.trim()
                                ? '1.5px solid #f97316'
                                : undefined,
                          }}
                          placeholder="Ghi chú căn cứ chấm điểm (vd: Hai bên đã hợp tác 4 năm, có 5 hợp đồng với tổng giá trị 18 tỷ VNĐ và vẫn có giao dịch trong 2 tháng gần đây)..."
                          value={commEvidenceNote}
                          onChange={(e) => setCommEvidenceNote(e.target.value)}
                          rows={3}
                        />
                        {!commEvidenceNote.trim() && (submitAttempted || isComplete) && (
                          <div style={{ fontSize: '0.74rem', color: '#dc2626', marginTop: 4, fontWeight: 500 }}>
                            * Vui lòng nhập ghi chú minh chứng cho tiêu chí Commercial Relationship
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {assessment.commercialEvidenceNote ? (
                          <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                            {assessment.commercialEvidenceNote}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>—</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V4 ROW 2: INTERACTION & COOPERATION (0..25)                               */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>2</td>
                  <td>
                    <span className={styles.dimensionName}>Interaction & Cooperation</span>
                    <div className={styles.dimensionSource}>Thủ công (0–25) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>21–25:</span> Phối hợp vận hành xuất sắc, giao tiếp chủ động, tin cậy cao, xử lý sự cố nhanh chóng</div>
                      <div><span className={styles.tierTag}>16–20:</span> Hợp tác thường xuyên, phối hợp bàn giao tin cậy, quan hệ làm việc lành mạnh</div>
                      <div><span className={styles.tierTag}>11–15:</span> Hợp tác mức cơ bản theo hợp đồng, đáp ứng nghĩa vụ, thỉnh thoảng có chậm trễ phối hợp</div>
                      <div><span className={styles.tierTag}>6–10:</span> Ít tương tác, phối hợp bị động, thường xuyên xảy ra vướng mắc hoặc chậm trễ</div>
                      <div><span className={styles.tierTag}>0–5:</span> Tương tác căng thẳng, bất đồng vận hành chưa giải quyết, tắc nghẽn giao tiếp nghiêm trọng</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    25
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.cooperationScore !== null && assessment.cooperationScore !== undefined
                          ? `${assessment.cooperationScore} / 25`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={25}
                            className={styles.scoreInput}
                            value={ownerCoop ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerCoop, 25)}
                          />
                          <span className={styles.scoreInputMax}>/ 25</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={25}
                          placeholder="0–25"
                          className={styles.scoreInput}
                          value={coop ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setCoop, 25)}
                        />
                        <span className={styles.scoreInputMax}>/ 25</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.cooperationEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !coopNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú minh chứng tương tác & phối hợp vận hành (Bắt buộc khi nộp)..."
                        value={coopNote}
                        onChange={(e) => setCoopNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V4 ROW 3: STRATEGIC RELATIONSHIP (0..20)                                  */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>3</td>
                  <td>
                    <span className={styles.dimensionName}>Strategic Relationship</span>
                    <div className={styles.dimensionSource}>Thủ công (0–20) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>17–20:</span> Đối tác chiến lược cốt lõi, có lãnh đạo cấp cao bảo trợ, cùng phát triển sáng kiến / định hướng</div>
                      <div><span className={styles.tierTag}>12–16:</span> Giá trị chiến lược đáng kể, là đối tác ưu tiên, định hướng kinh doanh đồng thuận</div>
                      <div><span className={styles.tierTag}>7–11:</span> Ý nghĩa chiến lược vừa phải, đối tác có giá trị nhưng ít kế hoạch hợp tác tương lai</div>
                      <div><span className={styles.tierTag}>0–6:</span> Quan hệ mang tính giao dịch thông thường / thay thế được, không có định hướng chiến lược</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    20
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.strategicScore !== null && assessment.strategicScore !== undefined
                          ? `${assessment.strategicScore} / 20`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            className={styles.scoreInput}
                            value={ownerStrat ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerStrat, 20)}
                          />
                          <span className={styles.scoreInputMax}>/ 20</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          placeholder="0–20"
                          className={styles.scoreInput}
                          value={strat ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setStrat, 20)}
                        />
                        <span className={styles.scoreInputMax}>/ 20</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.strategicEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !stratNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú minh chứng tầm quan trọng chiến lược (Bắt buộc khi nộp)..."
                        value={stratNote}
                        onChange={(e) => setStratNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V4 ROW 4: RELATIONSHIP NETWORK (0..10)                                    */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>4</td>
                  <td>
                    <span className={styles.dimensionName}>Relationship Network</span>
                    <div className={styles.dimensionSource}>Thủ công (0–10) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>9–10:</span> Kết nối đa tầng (C-Level, Ban Quản lý, bộ phận nghiệp vụ); mạng lưới người bảo trợ vững mạnh</div>
                      <div><span className={styles.tierTag}>6–8:</span> Kết nối tin cậy qua nhiều phòng ban, tương tác cấp quản lý trung gian tốt</div>
                      <div><span className={styles.tierTag}>3–5:</span> Chỉ có một đầu mối liên hệ duy nhất, khả năng tiếp cận các cấp khác hạn chế</div>
                      <div><span className={styles.tierTag}>0–2:</span> Mạng lưới liên hệ mỏng manh, nhân sự đầu mối thay đổi liên tục, khó tiếp cận</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    10
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.relationshipNetworkScore !== null && assessment.relationshipNetworkScore !== undefined
                          ? `${assessment.relationshipNetworkScore} / 10`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            className={styles.scoreInput}
                            value={ownerNet ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerNet, 10)}
                          />
                          <span className={styles.scoreInputMax}>/ 10</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          placeholder="0–10"
                          className={styles.scoreInput}
                          value={net ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setNet, 10)}
                        />
                        <span className={styles.scoreInputMax}>/ 10</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {ownerNetNote || assessment.relationshipNetworkNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !netNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú mạng lưới đầu mối liên hệ (Bắt buộc khi nộp)..."
                        value={netNote}
                        onChange={(e) => setNetNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V4 ROW 5: BUSINESS ENGAGEMENT (0..5)                                      */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>5</td>
                  <td>
                    <span className={styles.dimensionName}>Business Engagement</span>
                    <div className={styles.dimensionSource}>Thủ công (0–5) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>5:</span> Rất tích cực tham gia đánh giá điều hành, hội thảo chuyên đề, chia sẻ kế hoạch</div>
                      <div><span className={styles.tierTag}>4:</span> Tham gia đều đặn các cuộc họp mốc dự án và phiên họp chỉ đạo</div>
                      <div><span className={styles.tierTag}>3:</span> Tham gia khi có yêu cầu phát sinh, phản hồi tích cực</div>
                      <div><span className={styles.tierTag}>2:</span> Mức độ tham gia thấp, chỉ dự các buổi đối soát bắt buộc theo hợp đồng</div>
                      <div><span className={styles.tierTag}>1:</span> Rất ít phản hồi đối với các hoạt động kết nối · <span className={styles.tierTag}>0:</span> Hoàn toàn không tham gia hoặc không phản hồi</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    5
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.engagementScore !== null && assessment.engagementScore !== undefined
                          ? `${assessment.engagementScore} / 5`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            className={styles.scoreInput}
                            value={ownerEng ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerEng, 5)}
                          />
                          <span className={styles.scoreInputMax}>/ 5</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          placeholder="0–5"
                          className={styles.scoreInput}
                          value={eng ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setEng, 5)}
                        />
                        <span className={styles.scoreInputMax}>/ 5</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.engagementEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !engNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú hoạt động gắn kết doanh nghiệp (Bắt buộc khi nộp)..."
                        value={engNote}
                        onChange={(e) => setEngNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* V4 ROW 6: QUALITATIVE ASSESSMENT (0..5)                                   */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>6</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={styles.dimensionName}>Qualitative Assessment</span>
                    </div>
                    <div className={styles.dimensionSource}>Thủ công (0–5) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>5:</span> Uy tín thị trường vượt trội, tính chính trực tuyệt đối, năng lực dẫn đầu ngành</div>
                      <div><span className={styles.tierTag}>4:</span> Uy tín thị trường rất tốt, đối tác đáng tin cậy, không có vấn đề đáng ngại</div>
                      <div><span className={styles.tierTag}>3:</span> Uy tín thị trường mức trung bình, tuân thủ và bàn giao chấp nhận được</div>
                      <div><span className={styles.tierTag}>2:</span> Uy tín chưa đồng đều hoặc có cảnh báo về chất lượng, tiến độ, cam kết</div>
                      <div><span className={styles.tierTag}>1:</span> Có rủi ro uy tín đáng kể, tranh chấp hoặc chất lượng bàn giao bất ổn · <span className={styles.tierTag}>0:</span> Vấn đề nghiêm trọng về uy tín, pháp lý, đạo đức hoặc vi phạm tuân thủ</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    5
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.qualitativeScore !== null && assessment.qualitativeScore !== undefined
                          ? `${assessment.qualitativeScore} / 5`
                          : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            className={styles.scoreInput}
                            value={ownerQual ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerQual, 5)}
                          />
                          <span className={styles.scoreInputMax}>/ 5</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          placeholder="0–5"
                          className={styles.scoreInput}
                          value={qual ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setQual, 5)}
                        />
                        <span className={styles.scoreInputMax}>/ 5</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.qualitativeEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !qualNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú đánh giá uy tín định tính (Bắt buộc khi nộp)..."
                        value={qualNote}
                        onChange={(e) => setQualNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>
              </>
            ) : (
              <>
                {/* ========================================================================= */}
                {/* ROW 1: COMMERCIAL RELATIONSHIP                                            */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>1</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span className={styles.dimensionName}>Commercial Relationship</span>
                      <span className={styles.badgeAutoSuggested}>Tự động gợi ý</span>
                    </div>
                    <div className={styles.dimensionSource}>Hợp đồng phê duyệt APMS</div>
                  </td>
                  <td>
                    {/* Compact Highlighted Evidence Box */}
                    <div className={styles.evidenceHighlightBox}>
                      <div className={styles.evidenceGridTwoCol}>
                        <div>
                          <span className={styles.evidenceItemLabel}>Approved Contracts:</span>{' '}
                          <strong>{contractCount}</strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Total Value:</span>{' '}
                          <strong>
                            {contractValueStatus === 'UNSCORABLE_NON_VND'
                              ? `N/A (${currencies || 'Non-VND'})`
                              : formatVnd(totalVnd)}
                          </strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Relationship Duration:</span>{' '}
                          <strong>{formatDuration(durationMonths, firstCoop)}</strong>
                        </div>
                        <div>
                          <span className={styles.evidenceItemLabel}>Latest Contract:</span>{' '}
                          <strong>{formatRecency(recencyMonths, latestContract)}</strong>
                        </div>
                      </div>

                      {contractValueStatus === 'UNSCORABLE_NON_VND' && (
                        <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: 4 }}>
                          ⚠️ Currency normalization unavailable. Điểm hệ thống mang tính tham khảo một phần.
                        </div>
                      )}

                      <div className={styles.suggestedScorePill}>
                        Điểm hệ thống gợi ý: <strong>{suggestedCommercial} / 35</strong>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    35
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.commercialAwardedScore ?? assessment.commercialScore ?? suggestedCommercial} / 35
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={35}
                            className={styles.scoreInput}
                            value={ownerComm ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerComm, 35)}
                          />
                          <span className={styles.scoreInputMax}>/ 35</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={35}
                          placeholder="0–35"
                          className={styles.scoreInput}
                          value={commAwarded ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setCommAwarded, 35)}
                        />
                        <span className={styles.scoreInputMax}>/ 35</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {!isOwnerReview ? (
                      isDiffFromSuggested ? (
                        <div className={styles.reasonFieldContainer}>
                          <label className={styles.reasonLabel}>
                            Lý do điều chỉnh (Commercial vs Gợi ý) <span style={{ color: '#dc2626' }}>*</span>
                          </label>
                          <textarea
                            className={styles.reasonInput}
                            placeholder="Giải thích lý do điều chỉnh điểm so với gợi ý hệ thống..."
                            value={commReason}
                            onChange={(e) => setCommReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Điểm tự động theo dữ liệu hợp đồng APMS.
                        </span>
                      )
                    ) : (
                      <div>
                        {assessment.commercialAdjustmentReason && (
                          <div style={{ fontSize: '0.76rem', color: '#b45309', marginBottom: 4 }}>
                            <strong>Manager điều chỉnh:</strong> {assessment.commercialAdjustmentReason}
                          </div>
                        )}
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          (Xem lý do điều chỉnh Owner bên dưới)
                        </span>
                      </div>
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* ROW 2: INTERACTION & COOPERATION                                         */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>2</td>
                  <td>
                    <span className={styles.dimensionName}>Interaction & Cooperation</span>
                    <div className={styles.dimensionSource}>Thủ công (0–25)</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>21–25:</span> Hợp tác rất chặt chẽ và hiệu quả</div>
                      <div><span className={styles.tierTag}>16–20:</span> Hợp tác tốt và ổn định</div>
                      <div><span className={styles.tierTag}>11–15:</span> Hợp tác thường xuyên</div>
                      <div><span className={styles.tierTag}>6–10:</span> Hợp tác cơ bản</div>
                      <div><span className={styles.tierTag}>0–5:</span> Rất ít tương tác / hợp tác khó khăn</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    25
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.cooperationScore !== null ? `${assessment.cooperationScore} / 25` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={25}
                            className={styles.scoreInput}
                            value={ownerCoop ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerCoop, 25)}
                          />
                          <span className={styles.scoreInputMax}>/ 25</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={25}
                          placeholder="0–25"
                          className={styles.scoreInput}
                          value={coop ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setCoop, 25)}
                        />
                        <span className={styles.scoreInputMax}>/ 25</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.cooperationEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        placeholder="Ghi chú minh chứng (vd: Thường xuyên phối hợp nhịp nhàng)..."
                        value={coopNote}
                        onChange={(e) => setCoopNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* ROW 3: STRATEGIC RELATIONSHIP                                            */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>3</td>
                  <td>
                    <span className={styles.dimensionName}>Strategic Relationship</span>
                    <div className={styles.dimensionSource}>Thủ công (0–20)</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>17–20:</span> Core / Strategic Partner</div>
                      <div><span className={styles.tierTag}>13–16:</span> Đối tác rất quan trọng về chiến lược</div>
                      <div><span className={styles.tierTag}>9–12:</span> Đối tác quan trọng</div>
                      <div><span className={styles.tierTag}>5–8:</span> Có tiềm năng dài hạn</div>
                      <div><span className={styles.tierTag}>0–4:</span> Không có ý nghĩa chiến lược đáng kể</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    20
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.strategicScore !== null ? `${assessment.strategicScore} / 20` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            className={styles.scoreInput}
                            value={ownerStrat ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerStrat, 20)}
                          />
                          <span className={styles.scoreInputMax}>/ 20</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          placeholder="0–20"
                          className={styles.scoreInput}
                          value={strat ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setStrat, 20)}
                        />
                        <span className={styles.scoreInputMax}>/ 20</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.strategicEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        placeholder="Ghi chú minh chứng chiến lược..."
                        value={stratNote}
                        onChange={(e) => setStratNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* ROW 4: RELATIONSHIP NETWORK                                              */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>4</td>
                  <td>
                    <span className={styles.dimensionName}>Relationship Network</span>
                    <div className={styles.dimensionSource}>Thủ công (0–10)</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>9–10:</span> Quan hệ rất mạnh với key decision maker / executive sponsor</div>
                      <div><span className={styles.tierTag}>7–8:</span> Quan hệ trực tiếp Director / C-Level</div>
                      <div><span className={styles.tierTag}>5–6:</span> Kết nối Manager / Department Head</div>
                      <div><span className={styles.tierTag}>3–4:</span> Contact nghiệp vụ / staff-level</div>
                      <div><span className={styles.tierTag}>0–2:</span> Không có hoặc rất ít đầu mối trực tiếp</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    10
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.relationshipNetworkScore !== null ? `${assessment.relationshipNetworkScore} / 10` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            className={styles.scoreInput}
                            value={ownerNet ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerNet, 10)}
                          />
                          <span className={styles.scoreInputMax}>/ 10</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          placeholder="0–10"
                          className={styles.scoreInput}
                          value={net ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setNet, 10)}
                        />
                        <span className={styles.scoreInputMax}>/ 10</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {ownerNetNote || assessment.relationshipNetworkNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        placeholder="Ghi chú đầu mối liên hệ..."
                        value={netNote}
                        onChange={(e) => setNetNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* ROW 5: BUSINESS ENGAGEMENT                                               */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>5</td>
                  <td>
                    <span className={styles.dimensionName}>Business Engagement</span>
                    <div className={styles.dimensionSource}>Thủ công (0–5)</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>5:</span> Rất cao (Hội thảo, sự kiện, gặp gỡ điều hành thường xuyên)</div>
                      <div><span className={styles.tierTag}>4:</span> Cao (Tham gia đều đặn các hoạt động kết nối)</div>
                      <div><span className={styles.tierTag}>3:</span> Thường xuyên (Gặp gỡ định kỳ)</div>
                      <div><span className={styles.tierTag}>2:</span> Thỉnh thoảng</div>
                      <div><span className={styles.tierTag}>1:</span> Rất thấp · <span className={styles.tierTag}>0:</span> Không có</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    5
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.engagementScore !== null ? `${assessment.engagementScore} / 5` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            className={styles.scoreInput}
                            value={ownerEng ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerEng, 5)}
                          />
                          <span className={styles.scoreInputMax}>/ 5</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          placeholder="0–5"
                          className={styles.scoreInput}
                          value={eng ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setEng, 5)}
                        />
                        <span className={styles.scoreInputMax}>/ 5</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.engagementEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        placeholder="Ghi chú hoạt động gắn kết doanh nghiệp..."
                        value={engNote}
                        onChange={(e) => setEngNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>

                {/* ========================================================================= */}
                {/* ROW 6: QUALITATIVE ASSESSMENT                                            */}
                {/* ========================================================================= */}
                <tr className={styles.tableRow}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>6</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className={styles.dimensionName}>Qualitative Assessment</span>
                    </div>
                    <div className={styles.dimensionSource}>Thủ công (0–5) · Bắt buộc ghi chú</div>
                  </td>
                  <td>
                    <div className={styles.guidanceTiersList}>
                      <div><span className={styles.tierTag}>5:</span> Excellent (Uy tín vượt trội, tin cậy tuyệt đối)</div>
                      <div><span className={styles.tierTag}>4:</span> Very Good (Đối tác đáng tin cậy, trách nhiệm cao)</div>
                      <div><span className={styles.tierTag}>3:</span> Good (Bình thường, ổn định)</div>
                      <div><span className={styles.tierTag}>2:</span> Moderate · <span className={styles.tierTag}>1:</span> Weak · <span className={styles.tierTag}>0:</span> Very Weak</div>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                    5
                  </td>

                  {isOwnerReview ? (
                    <>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#2563eb' }}>
                        {assessment.qualitativeScore !== null ? `${assessment.qualitativeScore} / 5` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className={styles.scoreInputWrapper}>
                          <input
                            type="number"
                            min={0}
                            max={5}
                            className={styles.scoreInput}
                            value={ownerQual ?? ''}
                            onChange={(e) => handleScoreChange(e.target.value, setOwnerQual, 5)}
                          />
                          <span className={styles.scoreInputMax}>/ 5</span>
                        </div>
                      </td>
                    </>
                  ) : (
                    <td style={{ textAlign: 'center' }}>
                      <div className={styles.scoreInputWrapper}>
                        <input
                          type="number"
                          min={0}
                          max={5}
                          placeholder="0–5"
                          className={styles.scoreInput}
                          value={qual ?? ''}
                          onChange={(e) => handleScoreChange(e.target.value, setQual, 5)}
                        />
                        <span className={styles.scoreInputMax}>/ 5</span>
                      </div>
                    </td>
                  )}

                  <td>
                    {isOwnerReview ? (
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                        {assessment.qualitativeEvidenceNote || '—'}
                      </div>
                    ) : (
                      <textarea
                        className={styles.noteInput}
                        style={{ border: !qualNote.trim() ? '1.5px solid #f97316' : undefined }}
                        placeholder="Ghi chú đánh giá uy tín (Bắt buộc khi nộp)..."
                        value={qualNote}
                        onChange={(e) => setQualNote(e.target.value)}
                        rows={2}
                      />
                    )}
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* NOTES & REASONS SECTION                                                   */}
      {/* ========================================================================= */}
      {isOwnerReview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Owner Adjustment Reason (User Correction 2 & 3: Distinct from commercial reason) */}
          {isOwnerAdjusted && (
            <div className={styles.ownerReasonContainer}>
              <label className={styles.reasonLabel} style={{ color: '#b91c1c' }}>
                <ShieldCheck size={16} />
                <span>Lý do Owner điều chỉnh điểm số Manager <span style={{ color: '#dc2626' }}>* (Bắt buộc)</span></span>
              </label>
              <textarea
                className={styles.reasonInput}
                style={{ borderColor: '#fca5a5' }}
                placeholder="Nêu rõ căn cứ điều chỉnh điểm số so với đánh giá của Manager..."
                value={ownerReason}
                onChange={(e) => setOwnerReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Owner Final Note */}
          <div className={styles.overallNoteSection}>
            <label className={styles.overallNoteLabel}>Ghi chú phê duyệt của Owner (Tùy chọn)</label>
            <textarea
              className={styles.overallNoteTextarea}
              placeholder="Nhận xét tổng thể hoặc chỉ đạo định hướng quan hệ đối tác..."
              value={ownerNote}
              onChange={(e) => setOwnerNote(e.target.value)}
              rows={2}
            />
          </div>
        </div>
      ) : !isV5 ? (
        /* Overall Manager Assessment Note (Legacy V1-V4 only) */
        <div className={styles.overallNoteSection}>
          <label className={styles.overallNoteLabel}>
            Ghi chú tổng kết đánh giá (Tùy chọn)
          </label>
          <div className={styles.overallNoteHelper}>
            Manager có thể nhập tóm tắt kết quả đánh giá tổng thể nếu cần.
          </div>
          <textarea
            className={styles.overallNoteTextarea}
            placeholder="Ghi chú tổng kết đánh giá (tùy chọn)..."
            value={managerNote}
            onChange={(e) => setManagerNote(e.target.value)}
            rows={3}
          />
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* ACTION BUTTONS (Role-based)                                               */}
      {/* ========================================================================= */}
      <div className={styles.builderActions}>
        <div className={styles.builderActionsLeft}>
          {/* Auto-save Error Notification (Silent on success/saving, error feedback on failure) */}
          {isDraft && !isOwnerReview && autoSaveStatus === 'ERROR' && (
            <div className={styles.autoSaveStatus}>
              <span className={styles.autoSaveStatusError}>
                <AlertCircle size={14} />
                <span>Không thể lưu thay đổi. Vui lòng thử lại.</span>
                <button
                  type="button"
                  className={styles.retrySaveBtn}
                  onClick={handleRetry}
                >
                  Thử lại
                </button>
              </span>
            </div>
          )}

          {liveResult ? (
            <div className={styles.liveScorePreview}>
              <span>
                <strong>6/6 tiêu chí</strong> · Điểm dự kiến:{' '}
                <strong>{liveResult.displayScore}/100</strong> · Rank{' '}
                <span className={styles.liveScoreRankBadge}>{liveResult.rank}</span>
              </span>
            </div>
          ) : completedCriteriaCount > 0 ? (
            <div className={styles.liveScorePreview}>
              <span>
                <strong>{completedCriteriaCount}/{isV3 ? 3 : 6} tiêu chí</strong>
              </span>
            </div>
          ) : null}

          {isOwnerReview && onRequestChanges && (
            <button
              type="button"
              className={styles.btnDanger}
              onClick={onRequestChanges}
              disabled={isSubmitting}
            >
              Yêu cầu sửa đổi (Request Changes)
            </button>
          )}
        </div>

        <div className={styles.builderActionsRight}>
          {!isOwnerReview ? (
            /* Complete Assessment: MANAGER ONLY */
            isManager && (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleComplete}
                disabled={
                  !canComplete ||
                  !isComplete ||
                  isSubmitting
                }
                title={
                  !canComplete
                    ? 'Chỉ Business Development Manager mới có quyền hoàn tất đánh giá.'
                    : !isComplete
                    ? `Cần nhập đủ ${isV3 ? 3 : 6} tiêu chí trước khi hoàn tất (${completedCriteriaCount}/${isV3 ? 3 : 6}).`
                    : 'Hoàn tất đánh giá mức độ thân thiết.'
                }
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spinIcon" />
                    <span>Đang hoàn tất...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Hoàn tất đánh giá</span>
                  </>
                )}
              </button>
            )
          ) : (
            /* Owner Finalize Action */
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleOwnerFinalize}
              disabled={isSubmitting || (isOwnerAdjusted && !ownerReason.trim())}
              title={
                isOwnerAdjusted && !ownerReason.trim()
                  ? 'Cần nhập lý do điều chỉnh điểm số so với Manager.'
                  : 'Phê duyệt chính thức điểm mức độ thân thiết.'
              }
            >
              {isSubmitting ? (
                <Loader2 size={16} className="spinIcon" />
              ) : (
                <FileCheck size={16} />
              )}
              <span>Phê duyệt chính thức (Finalize Assessment)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
