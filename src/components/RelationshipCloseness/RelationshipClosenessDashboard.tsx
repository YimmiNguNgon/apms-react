import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  History,
  Info,
  Loader2,
  PlusCircle,
  Sliders,
  TrendingDown,
  TrendingUp,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { companyRelationshipAssessmentApi } from '../../API/companyRelationshipAssessmentApi';
import { ROLES, type Role } from '../../context/UserContext';
import type {
  RelationshipAssessmentResponse,
  RelationshipOverviewResponse,
} from '../../types/relationshipAssessment';
import { RelationshipScoreSummary } from './RelationshipScoreSummary';
import {
  getRankMeta,
} from './scoringGuidanceConfig';
import styles from './RelationshipCloseness.module.css';

export interface RelationshipClosenessDashboardProps {
  companyProfileId: string;
  companyName?: string;
  currentUserRole?: Role;
  setActivePage?: (page: string) => void;
}

const formatDate = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB');
};

const formatDateTime = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatVersionString = (ver?: { formattedVersion?: string; versionNumber?: number; majorVersion?: number; minorRevision?: number } | null) => {
  if (!ver) return '—';
  if (ver.formattedVersion) return ver.formattedVersion;
  if (ver.majorVersion != null) {
    return ver.minorRevision && ver.minorRevision > 0
      ? `V${ver.majorVersion}.${ver.minorRevision}`
      : `V${ver.majorVersion}`;
  }
  return `V${ver.versionNumber}`;
};

export const RelationshipClosenessDashboard: React.FC<RelationshipClosenessDashboardProps> = ({
  companyProfileId,
  companyName = '',
  currentUserRole,
  setActivePage,
}) => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<RelationshipOverviewResponse | null>(null);
  const [history, setHistory] = useState<RelationshipAssessmentResponse[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [isCreatingOwnerAdjustment, setIsCreatingOwnerAdjustment] = useState(false);
  const [isAllHistoryModalOpen, setIsAllHistoryModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);

  const finalizedHistory = useMemo(() => {
    if (!history || history.length === 0) return [];
    return history
      .filter((item) => item.status === 'FINALIZED')
      .sort((a, b) => {
        const timeA = a.finalizedAt ? new Date(a.finalizedAt).getTime() : 0;
        const timeB = b.finalizedAt ? new Date(b.finalizedAt).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        const majorA = a.majorVersion ?? 0;
        const majorB = b.majorVersion ?? 0;
        if (majorB !== majorA) return majorB - majorA;
        const minorA = a.minorRevision ?? 0;
        const minorB = b.minorRevision ?? 0;
        return minorB - minorA;
      });
  }, [history]);

  const visibleFinalizedHistory = useMemo(() => finalizedHistory.slice(0, 3), [finalizedHistory]);

  const isOwner = currentUserRole === ROLES.OWNER;
  const isManager = currentUserRole === ROLES.MANAGER;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [ovRes, histRes] = await Promise.all([
        companyRelationshipAssessmentApi.getOverview(companyProfileId),
        companyRelationshipAssessmentApi.getHistory(companyProfileId),
      ]);
      setOverview(ovRes.data);
      setHistory(histRes.data || []);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || 'Không thể tải dữ liệu đánh giá mức độ thân thiết.');
    } finally {
      setLoading(false);
    }
  }, [companyProfileId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const active = overview?.activeAssessment;
  const official = overview?.officialFinalizedAssessment;
  const liveEvidence = overview?.liveCommercialEvidence;

  // 1. Determine official finalized assessment (authoritative official relationship score)
  const latestFinalizedAssessment = useMemo<RelationshipAssessmentResponse | null>(() => {
    if (official && official.status === 'FINALIZED') {
      return official;
    }
    const fromHistory = finalizedHistory[0];
    return fromHistory || null;
  }, [official, finalizedHistory]);

  // 2. Determine active draft assessment
  // Correction 1: For V5, active assessment is strictly DRAFT (no SUBMITTED or CHANGES_REQUESTED in active V5)
  const activeDraft = useMemo<RelationshipAssessmentResponse | null>(() => {
    if (!active) return null;
    const isV5 = active.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V5';
    if (isV5) {
      return active.status === 'DRAFT' ? active : null;
    }
    // Legacy V1-V4: can be DRAFT, CHANGES_REQUESTED, SUBMITTED
    return active.status === 'DRAFT' || active.status === 'CHANGES_REQUESTED' || active.status === 'SUBMITTED'
      ? active
      : null;
  }, [active]);

  const isFirstTime = !latestFinalizedAssessment && !activeDraft;

  // 3. Primary assessment displayed on the dashboard
  // Correction 5: ALWAYS use latestFinalizedAssessment if present!
  // Only fall back to activeDraft when NO finalized assessment has ever existed
  const displayAssessment = useMemo<RelationshipAssessmentResponse>(() => {
    if (latestFinalizedAssessment) {
      return latestFinalizedAssessment;
    }
    if (activeDraft) {
      return activeDraft;
    }

    // Virtual draft representation for first-time view
    return {
      id: 0,
      ownerCompanyProfileId: '',
      companyProfileId,
      versionNumber: 1,
      status: 'DRAFT',
      scoringPolicyVersion: 'RELATIONSHIP_CLOSENESS_V5',
      commercialScore: null,
      commercialSuggestedScore: null,
      commercialAwardedScore: null,
      commercialAdjustmentReason: null,
      commercialEvidenceNote: null,
      contractValueScore: null,
      contractCountScore: 0,
      relationshipDurationScore: 0,
      contractRecencyScore: 0,
      approvedContractCount: liveEvidence?.approvedContractCount ?? 0,
      totalContractValueVnd: liveEvidence?.totalContractValueVnd ?? null,
      contractCurrencies: liveEvidence?.contractCurrencies ?? null,
      currencyBreakdown: null,
      contractValueStatus: liveEvidence?.contractValueStatus ?? 'SCORABLE',
      firstCooperationDate: liveEvidence?.firstCooperationDate ?? null,
      latestContractDate: liveEvidence?.latestContractDate ?? null,
      upcomingContractCount: liveEvidence?.upcomingContractCount ?? 0,
      scorableBase: 30,
      normalizationApplied: true,
      cooperationScore: null,
      cooperationEvidenceNote: null,
      strategicScore: null,
      strategicEvidenceNote: null,
      relationshipNetworkScore: null,
      relationshipNetworkNote: null,
      engagementScore: null,
      engagementEvidenceNote: null,
      qualitativeScore: null,
      qualitativeEvidenceNote: null,
      trustScore: null,
      trustEvidenceNote: null,
      managerNote: null,
      managerRawScorableScore: null,
      managerTotalScore: null,
      managerNormalizedScore: null,
      managerRank: null,
      managerRankDescription: null,
      managerAccountId: null,
      managerSubmittedAt: null,
      changesRequestedReason: null,
      changesRequestedByAccountId: null,
      changesRequestedAt: null,
      ownerCommercialScore: null,
      ownerCooperationScore: null,
      ownerStrategicScore: null,
      ownerRelationshipNetworkScore: null,
      ownerRelationshipNetworkNote: null,
      ownerEngagementScore: null,
      ownerQualitativeScore: null,
      ownerTrustScore: null,
      ownerNote: null,
      ownerAdjustmentReason: null,
      ownerRawScorableScore: null,
      ownerFinalTotalScore: null,
      ownerNormalizedScore: null,
      ownerFinalRank: null,
      ownerFinalRankDescription: null,
      ownerAccountId: null,
      finalizedAt: null,
      completedCriteriaCount: 0,
      totalCriteriaCount: 6,
      draftSubtotalScore: null,
      isComplete: false,
      officialScore: null,
      officialRank: null,
      officialRankDescription: null,
      isOfficialFinalized: false,
      canEditDraft: true,
      canSubmit: isManager,
      canRequestChanges: false,
      canFinalize: false,
      canCreateNewVersion: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [latestFinalizedAssessment, activeDraft, companyProfileId, liveEvidence, isManager]);

  // Count assessed criteria for active draft
  const activeDraftAssessedCount = useMemo(() => {
    if (!activeDraft) return 0;
    if (activeDraft.completedCriteriaCount != null) {
      return activeDraft.completedCriteriaCount;
    }
    const isV3 = activeDraft.scoringPolicyVersion === 'RELATIONSHIP_CLOSENESS_V3';
    let count = 0;
    if (activeDraft.commercialAwardedScore != null) count++;
    if (activeDraft.engagementScore != null) count++;
    if (activeDraft.relationshipNetworkScore != null) count++;
    if (!isV3) {
      if (activeDraft.cooperationScore != null) count++;
      if (activeDraft.strategicScore != null) count++;
      if ((activeDraft.trustScore ?? activeDraft.qualitativeScore) != null) count++;
    }
    return count;
  }, [activeDraft]);

  // Navigate to dedicated assessment detail page
  const navigateToAssessmentDetail = (params?: {
    assessmentId?: number;
    historyId?: number;
    mode?: 'review' | 'edit' | 'view';
    readOnly?: boolean;
    versionNumber?: number;
    assessmentType?: 'MANAGER_ASSESSMENT' | 'OWNER_ADJUSTMENT';
  }) => {
    if (!setActivePage) return;
    const query = new URLSearchParams();
    query.set('companyProfileId', companyProfileId);
    if (companyName) query.set('companyName', companyName);
    if (params?.assessmentId) query.set('assessmentId', String(params.assessmentId));
    if (params?.historyId) query.set('historyId', String(params.historyId));
    if (params?.mode) query.set('mode', params.mode);
    if (params?.readOnly) query.set('readOnly', 'true');
    if (params?.versionNumber) query.set('version', String(params.versionNumber));
    if (params?.assessmentType) query.set('assessmentType', params.assessmentType);

    setActivePage(`relationship-assessment-detail?${query.toString()}`);
  };

  // Handle creating new version from finalized state (Pure client navigation, zero backend draft)
  const handleCreateNewVersion = () => {
    navigateToAssessmentDetail({
      mode: 'edit',
      assessmentType: 'MANAGER_ASSESSMENT',
    });
  };

  // Handle creating Owner Adjustment from latest finalized assessment (Pure client navigation, zero backend draft)
  const handleCreateOwnerAdjustment = () => {
    if (!latestFinalizedAssessment) return;
    navigateToAssessmentDetail({
      mode: 'edit',
      assessmentType: 'OWNER_ADJUSTMENT',
    });
  };

  // Helper to extract score for the 6 criteria cards
  const getCriterionDisplayScore = (key: string): { score: number | null; isAssessed: boolean } => {
    let val: number | null | undefined = null;
    const isOwnerFinal = displayAssessment.status === 'FINALIZED' && displayAssessment.ownerFinalTotalScore != null;

    switch (key) {
      case 'commercial':
        val = isOwnerFinal
          ? (displayAssessment.ownerCommercialScore ?? displayAssessment.commercialAwardedScore ?? displayAssessment.commercialScore)
          : (displayAssessment.commercialAwardedScore ?? displayAssessment.commercialScore);
        break;
      case 'cooperation':
        val = isOwnerFinal
          ? (displayAssessment.ownerCooperationScore ?? displayAssessment.cooperationScore)
          : displayAssessment.cooperationScore;
        break;
      case 'strategic':
        val = isOwnerFinal
          ? (displayAssessment.ownerStrategicScore ?? displayAssessment.strategicScore)
          : displayAssessment.strategicScore;
        break;
      case 'network':
        val = isOwnerFinal
          ? (displayAssessment.ownerRelationshipNetworkScore ?? displayAssessment.relationshipNetworkScore)
          : displayAssessment.relationshipNetworkScore;
        break;
      case 'engagement':
        val = isOwnerFinal
          ? (displayAssessment.ownerEngagementScore ?? displayAssessment.engagementScore)
          : displayAssessment.engagementScore;
        break;
      case 'trust':
        val = isOwnerFinal
          ? (displayAssessment.ownerTrustScore ?? displayAssessment.ownerQualitativeScore ?? displayAssessment.trustScore ?? displayAssessment.qualitativeScore)
          : (displayAssessment.trustScore ?? displayAssessment.qualitativeScore);
        break;
      default:
        val = null;
    }

    const isAssessed = val !== null && val !== undefined;
    return { score: isAssessed ? Number(val) : null, isAssessed };
  };

  // Calculate Trend if previous version exists in history (strictly immediate previous finalized version)
  const trendInfo = useMemo(() => {
    if (overview?.trendInfo) {
      return overview.trendInfo;
    }

    if (!latestFinalizedAssessment || finalizedHistory.length < 2) return null;
    const currentScore =
      latestFinalizedAssessment.officialScore ??
      latestFinalizedAssessment.ownerFinalTotalScore ??
      latestFinalizedAssessment.managerTotalScore ??
      null;

    if (currentScore === null) return null;

    // In chronologically sorted finalizedHistory (newest to oldest):
    // Find the position of latestFinalizedAssessment, then immediately preceding is the next item in array
    const latestIndex = finalizedHistory.findIndex((h) => h.id === latestFinalizedAssessment.id);
    const prevItem = latestIndex >= 0 && latestIndex + 1 < finalizedHistory.length
      ? finalizedHistory[latestIndex + 1]
      : (latestIndex === -1 ? finalizedHistory[1] : null);

    if (!prevItem) return null;
    const prevScore =
      prevItem.officialScore ??
      prevItem.ownerFinalTotalScore ??
      prevItem.managerTotalScore ??
      null;
    if (prevScore === null || prevScore === undefined) return null;

    const prevRank = prevItem.officialRank || prevItem.ownerFinalRank || prevItem.managerRank || 'D';
    const currentRank = latestFinalizedAssessment.officialRank || latestFinalizedAssessment.ownerFinalRank || latestFinalizedAssessment.managerRank || 'D';

    const diff = currentScore - prevScore;
    return {
      prevVersion: prevItem.versionNumber,
      prevFormattedVersion: formatVersionString(prevItem),
      prevScore,
      prevRank,
      currentVersion: latestFinalizedAssessment.versionNumber,
      currentFormattedVersion: formatVersionString(latestFinalizedAssessment),
      currentScore,
      currentRank,
      diff,
    };
  }, [overview?.trendInfo, latestFinalizedAssessment, finalizedHistory]);

  // Business insights: deterministic strongest and lowest criteria (Correction 3 & 4)
  const businessInsights = useMemo(() => {
    // Only calculate when all 6 criteria scores are available
    const criteriaList = [
      { key: 'commercial', name: 'Commercial Relationship', score: getCriterionDisplayScore('commercial').score },
      { key: 'cooperation', name: 'Interaction & Cooperation', score: getCriterionDisplayScore('cooperation').score },
      { key: 'strategic', name: 'Strategic Importance', score: getCriterionDisplayScore('strategic').score },
      { key: 'network', name: 'Relationship Network', score: getCriterionDisplayScore('network').score },
      { key: 'engagement', name: 'Business Engagement', score: getCriterionDisplayScore('engagement').score },
      { key: 'trust', name: 'Trust & Reliability', score: getCriterionDisplayScore('trust').score },
    ];

    const hasAllSix = criteriaList.every((c) => c.score !== null && c.score !== undefined);
    if (!hasAllSix) return null;

    const scores = criteriaList.map((c) => c.score as number);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    const formatTied = (items: Array<{ name: string; score: number | null }>, scoreVal: number) => {
      if (items.length === 1) {
        return `${items[0].name} — ${scoreVal}/5`;
      }
      if (items.length === 2) {
        return `${items[0].name}, ${items[1].name} — ${scoreVal}/5`;
      }
      const firstTwo = items.slice(0, 2).map((i) => i.name).join(', ');
      const remaining = items.length - 2;
      return `${firstTwo} +${remaining} — ${scoreVal}/5`;
    };

    if (maxScore === minScore) {
      return {
        strongest: `Tất cả 6 tiêu chí đều đạt ${maxScore}/5`,
        lowest: null,
      };
    }

    const highestItems = criteriaList.filter((c) => c.score === maxScore);
    const lowestItems = criteriaList.filter((c) => c.score === minScore);

    return {
      strongest: formatTied(highestItems, maxScore),
      lowest: formatTied(lowestItems, minScore),
    };
  }, [displayAssessment]);

  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <Loader2 size={24} className="spinIcon" style={{ color: '#2563eb' }} />
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Đang tải dữ liệu tổng quan Relationship Closeness...
        </span>
      </div>
    );
  }

  // Render header actions inside Summary Card
  const renderSummaryHeaderActions = () => {
    const hasManagerDraft = Boolean(overview?.myDraft && overview.myDraft.draftType === 'MANAGER_ASSESSMENT');
    const hasOwnerDraft = Boolean(overview?.myDraft && overview.myDraft.draftType === 'OWNER_ADJUSTMENT');

    if (isFirstTime) {
      if (!isManager) return null;
      if (hasManagerDraft) {
        return (
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() =>
              navigateToAssessmentDetail({
                mode: 'edit',
                assessmentType: 'MANAGER_ASSESSMENT',
              })
            }
          >
            <Edit3 size={16} />
            <span>Tiếp tục đánh giá</span>
          </button>
        );
      }
      return (
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={() => navigateToAssessmentDetail({ mode: 'edit' })}
        >
          <PlusCircle size={16} />
          <span>Bắt đầu đánh giá</span>
        </button>
      );
    }

    // Finalized assessment exists
    if (latestFinalizedAssessment) {
      const canAdjust = latestFinalizedAssessment.canAdjust ?? true;
      const canReassess = latestFinalizedAssessment.canCreateNewVersion ?? true;

      return (
        <>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() =>
              navigateToAssessmentDetail({
                assessmentId: latestFinalizedAssessment.id,
                historyId: latestFinalizedAssessment.id,
                versionNumber: latestFinalizedAssessment.versionNumber,
                readOnly: true,
              })
            }
          >
            <Eye size={16} />
            <span>Xem chi tiết</span>
          </button>

          {isOwner && canAdjust && (
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleCreateOwnerAdjustment}
              style={{ background: '#7c3aed', borderColor: '#6d28d9' }}
            >
              <Edit3 size={16} />
              <span>{hasOwnerDraft ? 'Tiếp tục điều chỉnh' : 'Điều chỉnh đánh giá'}</span>
            </button>
          )}

          {isManager && canReassess && (
            hasManagerDraft ? (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={() =>
                  navigateToAssessmentDetail({
                    mode: 'edit',
                    assessmentType: 'MANAGER_ASSESSMENT',
                  })
                }
              >
                <Edit3 size={16} />
                <span>Tiếp tục đánh giá</span>
              </button>
            ) : (
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={handleCreateNewVersion}
              >
                <PlusCircle size={16} />
                <span>Tạo phiên bản đánh giá mới</span>
              </button>
            )
          )}
        </>
      );
    }

    return null;
  };

  // Render single history row (used by both dashboard and all-history modal)
  const renderHistoryRow = (ver: RelationshipAssessmentResponse) => {
    const score = ver.officialScore ?? ver.ownerFinalTotalScore ?? ver.managerTotalScore;
    const rank = ver.officialRank || ver.ownerFinalRank || ver.managerRank || 'D';
    const rankMeta = getRankMeta(rank);
    const isVerFinalized = ver.status === 'FINALIZED';
    const isVerOwnerAdjustment = Boolean(ver.isOwnerAdjustment || ver.assessmentType === 'OWNER_ADJUSTMENT');

    const actionText = isVerOwnerAdjustment
      ? `Owner điều chỉnh${ver.sourceVersionNumber ? ` từ V${ver.sourceVersionNumber}` : ''}`
      : 'Manager đánh giá';

    const dateText = formatDate(ver.finalizedAt || ver.updatedAt || ver.createdAt);

    return (
      <div
        key={ver.id}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          {/* Primary line: V8    90/100 · Rank A */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', minWidth: 28 }}>
              {formatVersionString(ver)}
            </span>
            <span style={{ fontSize: '0.92rem', color: '#334155' }}>
              <strong style={{ color: '#0f172a' }}>{score !== null && score !== undefined ? `${score}/100` : '—/100'}</strong>
              <span style={{ color: '#94a3b8', margin: '0 6px' }}>·</span>
              <span style={{ color: rankMeta.color, fontWeight: 700 }}>
                Rank {rank}
              </span>
            </span>

            {/* Exceptional non-finalized states only */}
            {!isVerFinalized && (
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: ver.status === 'CANCELLED' ? '#ef4444' : '#64748b',
                  background: ver.status === 'CANCELLED' ? '#fef2f2' : '#f1f5f9',
                  padding: '2px 7px',
                  borderRadius: 4,
                  border: `1px solid ${ver.status === 'CANCELLED' ? '#fecaca' : '#e2e8f0'}`,
                }}
              >
                {ver.status === 'CANCELLED' ? 'ĐÃ HỦY' : ver.status}
              </span>
            )}
          </div>

          {/* Secondary line: Owner điều chỉnh từ V7 · 16/09/2026 */}
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            <span>{actionText}</span>
            <span style={{ color: '#94a3b8', margin: '0 5px' }}>·</span>
            <span>{dateText}</span>
          </div>
        </div>

        <div>
          <button
            type="button"
            className={styles.btnSecondary}
            style={{
              padding: '5px 12px',
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => {
              setIsAllHistoryModalOpen(false);
              navigateToAssessmentDetail({
                assessmentId: ver.id,
                historyId: ver.id,
                versionNumber: ver.versionNumber,
                readOnly: true,
              });
            }}
          >
            <Eye size={13} />
            <span>Xem chi tiết</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      {/* Error / Alert notification */}
      {errorMsg && (
        <div className={styles.alertBannerOrange}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 0. PRIVATE WORKING DRAFT CARD (IF ACTOR HAS A SAVED DRAFT)                */}
      {/* ========================================================================= */}

      {/* ========================================================================= */}
      {/* 1. FIRST-TIME EMPTY STATE (IF NO ASSESSMENT YET)                          */}
      {/* ========================================================================= */}
      {isFirstTime ? (
        <div className={styles.firstTimeEmptyCard}>
          <div className={styles.emptyIconCircle}>
            <Award size={28} strokeWidth={2} />
          </div>

          <h3 className={styles.firstTimeEmptyTitle}>
            Chưa có đánh giá mức độ thân thiết
          </h3>

          <p className={styles.firstTimeEmptyDesc}>
            {isOwner
              ? 'Đánh giá ban đầu sẽ được thực hiện bởi BD Manager. Sau khi hoàn tất, bạn có thể xem và điều chỉnh tại đây.'
              : 'Doanh nghiệp này chưa có đánh giá mức độ thân thiết. Thực hiện đánh giá để xác định mức độ quan hệ hiện tại và theo dõi sự thay đổi qua các lần đánh giá sau.'}
          </p>

          {isManager && (
            <button
              type="button"
              className={styles.emptyCtaBtn}
              onClick={() =>
                navigateToAssessmentDetail({
                  mode: 'edit',
                  assessmentType: overview?.myDraft?.draftType === 'MANAGER_ASSESSMENT' ? 'MANAGER_ASSESSMENT' : undefined,
                })
              }
            >
              {overview?.myDraft && overview.myDraft.draftType === 'MANAGER_ASSESSMENT' ? (
                <>
                  <Edit3 size={17} />
                  <span>Tiếp tục đánh giá</span>
                </>
              ) : (
                <>
                  <PlusCircle size={17} />
                  <span>Bắt đầu đánh giá</span>
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ========================================================================= */}
          {/* 2. RELATIONSHIP SUMMARY (SCORE CIRCLE + 0-100 SCALE BAR)                   */}
          {/* ========================================================================= */}
          <RelationshipScoreSummary
            assessment={displayAssessment}
            headerActions={renderSummaryHeaderActions()}
          />

          {/* ========================================================================= */}
          {/* 4. OPTIONAL INFORMATION & RELATIONSHIP TREND                              */}
          {/* ========================================================================= */}
          {/* Trend Card if previous finalized version exists */}
          {trendInfo && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.titleGroup}>
                  <h3 className={styles.cardTitle}>Xu hướng mối quan hệ (Relationship Trend)</h3>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, padding: '8px 0', flexWrap: 'wrap' }}>
                {/* Score change badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: trendInfo.diff >= 0 ? '#dcfce7' : '#fee2e2',
                      color: trendInfo.diff >= 0 ? '#15803d' : '#b91c1c',
                      flexShrink: 0,
                    }}
                  >
                    {trendInfo.diff >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Thay đổi so với {trendInfo.prevFormattedVersion}
                    </div>
                    <div
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: trendInfo.diff >= 0 ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {trendInfo.diff > 0 ? `+${trendInfo.diff}` : trendInfo.diff} điểm
                    </div>
                  </div>
                </div>

                <div style={{ height: 40, width: 1, background: '#e2e8f0' }} />

                {/* Score comparison with ranks (Correction 5) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.84rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Phiên bản trước:</span>{' '}
                    <strong>{trendInfo.prevFormattedVersion} — {trendInfo.prevScore}/100 — Rank {trendInfo.prevRank}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Phiên bản hiện tại:</span>{' '}
                    <strong style={{ color: '#1d4ed8' }}>
                      {trendInfo.currentFormattedVersion} — {trendInfo.currentScore}/100 — Rank {trendInfo.currentRank}
                    </strong>
                  </div>
                </div>

                {/* Deterministic business insights (Correction 3 & 4) */}
                {businessInsights && (
                  <>
                    <div style={{ height: 40, width: 1, background: '#e2e8f0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.84rem' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Điểm mạnh nhất:</span>{' '}
                        <strong style={{ color: '#15803d' }}>{businessInsights.strongest}</strong>
                      </div>
                      {businessInsights.lowest && (
                        <div>
                          <span style={{ color: '#64748b' }}>Điểm cần cải thiện:</span>{' '}
                          <strong style={{ color: '#b45309' }}>{businessInsights.lowest}</strong>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. VERSION HISTORY SECTION                                                */}
          {/* ========================================================================= */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.titleGroup}>
                <History size={18} style={{ color: '#2563eb' }} />
                <h3 className={styles.cardTitle}>Lịch sử đánh giá</h3>
                <span className={styles.versionBadge}>{finalizedHistory.length} phiên bản</span>
              </div>
              <div>
                {finalizedHistory.length > 3 && (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{ padding: '4px 12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                    onClick={() => setIsAllHistoryModalOpen(true)}
                  >
                    Xem tất cả ({finalizedHistory.length})
                  </button>
                )}
              </div>
            </div>

            {/* Active Draft Row (displayed separately at the top of history) */}
            {activeDraft && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: 8,
                  gap: 16,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', minWidth: 28 }}>
                      V{activeDraft.versionNumber}
                    </span>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#2563eb',
                        background: '#eff6ff',
                        padding: '2px 7px',
                        borderRadius: 4,
                        border: '1px solid #bfdbfe',
                      }}
                    >
                      DRAFT · ĐANG ĐÁNH GIÁ
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    {activeDraftAssessedCount} / {activeDraft.totalCriteriaCount ?? 6} tiêu chí hoàn thành · Cập nhật ngày: {formatDate(activeDraft.updatedAt || activeDraft.createdAt)}
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                    onClick={() =>
                      navigateToAssessmentDetail({
                        assessmentId: activeDraft.id,
                        mode: 'edit',
                      })
                    }
                  >
                    <Edit3 size={13} />
                    <span>Tiếp tục</span>
                  </button>
                </div>
              </div>
            )}

            {finalizedHistory.length === 0 && !activeDraft ? (
              <div style={{ padding: '16px 0', color: '#64748b', fontSize: '0.86rem' }}>
                Chưa có phiên bản lịch sử nào được ghi nhận.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {visibleFinalizedHistory.map((ver) => renderHistoryRow(ver))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 6. ALL HISTORY MODAL DIALOG                                               */}
      {/* ========================================================================= */}
      {isAllHistoryModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setIsAllHistoryModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              padding: '24px',
              maxWidth: 720,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '80vh',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  Toàn bộ lịch sử đánh giá ({finalizedHistory.length} phiên bản)
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Danh sách tất cả các phiên bản đánh giá mức độ thân thiết được sắp xếp theo phiên bản mới nhất.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAllHistoryModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: '58vh', paddingRight: 4 }}>
              {finalizedHistory.map((ver) => renderHistoryRow(ver))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsAllHistoryModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Confirmation Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 480,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Xác nhận xóa bản nháp
              </h3>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingDraft}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
              Bạn có chắc muốn xóa bản nháp đánh giá này?
              <br />
              Các điểm và ghi chú chưa hoàn tất sẽ bị mất.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingDraft}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={async () => {
                  try {
                    setIsDeletingDraft(true);
                    await companyRelationshipAssessmentApi.deleteMyDraft(companyProfileId);
                    setShowDeleteModal(false);
                    await loadData();
                  } catch (err: any) {
                    alert(err?.response?.data?.message || 'Không thể xóa bản nháp.');
                  } finally {
                    setIsDeletingDraft(false);
                  }
                }}
                disabled={isDeletingDraft}
                style={{ background: '#dc2626', borderColor: '#b91c1c' }}
              >
                {isDeletingDraft ? 'Đang xóa...' : 'Xóa bản nháp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
