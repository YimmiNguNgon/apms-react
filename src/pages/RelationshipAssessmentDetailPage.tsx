import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileText,
  HelpCircle,
  History,
  Info,
  Loader2,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { companyRelationshipAssessmentApi } from '../API/companyRelationshipAssessmentApi';
import { companyProfileApi } from '../API/companyProfileApi';
import { ROLES, useUser, type Role } from '../context/UserContext';
import type {
  RelationshipAssessmentResponse,
  RelationshipOverviewResponse,
  UpdateRelationshipAssessmentRequest,
  FinalizeRelationshipAssessmentRequest,
  OwnerAdjustmentUpdateRequest,
} from '../types/relationshipAssessment';
import { RelationshipScoreBuilderTable } from '../components/RelationshipCloseness/RelationshipScoreBuilderTable';
import { RelationshipOwnerAdjustmentEditor } from '../components/RelationshipCloseness/RelationshipOwnerAdjustmentEditor';
import { RelationshipScoreBreakdown } from '../components/RelationshipCloseness/RelationshipScoreBreakdown';
import { canUseRelationshipCloseness } from './companyDetail/utils';
import styles from '../components/RelationshipCloseness/RelationshipCloseness.module.css';

interface RelationshipAssessmentDetailPageProps {
  setActivePage?: (page: string) => void;
}

interface ParsedNavContext {
  companyProfileId: string;
  assessmentId: number | null;
  historyId: number | null;
  mode: 'review' | 'edit' | 'view' | null;
  readOnly: boolean;
  companyName: string;
  version: number | null;
}

const parseNavContext = (): ParsedNavContext => {
  let hash = '';
  if (typeof window !== 'undefined') {
    hash = window.location.hash.replace(/^#\/?/, '').trim();
  }
  const qIndex = hash.indexOf('?');
  const searchStr = qIndex !== -1 ? hash.slice(qIndex) : (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(searchStr);

  return {
    companyProfileId: params.get('companyProfileId') || params.get('companyId') || params.get('profileId') || '',
    assessmentId: params.get('assessmentId') ? parseInt(params.get('assessmentId')!, 10) : null,
    historyId: params.get('historyId') ? parseInt(params.get('historyId')!, 10) : null,
    mode: (params.get('mode') as any) || null,
    readOnly: params.get('readOnly') === 'true',
    companyName: params.get('companyName') || '',
    version: params.get('version') ? parseInt(params.get('version')!, 10) : null,
  };
};

const formatDate = (val?: string | null) => {
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

export const RelationshipAssessmentDetailPage: React.FC<RelationshipAssessmentDetailPageProps> = ({
  setActivePage,
}) => {
  const { currentUser } = useUser();
  const navContext = useMemo(() => parseNavContext(), []);
  const { companyProfileId, assessmentId, historyId, mode, readOnly, version } = navContext;

  const [companyName, setCompanyName] = useState<string>(navContext.companyName || '');
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<RelationshipAssessmentResponse | null>(null);
  const [sourceAssessment, setSourceAssessment] = useState<RelationshipAssessmentResponse | null>(null);
  const [overview, setOverview] = useState<RelationshipOverviewResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // Owner Request Changes modal state
  const [isRequestChangesOpen, setIsRequestChangesOpen] = useState(false);
  const [requestChangesReason, setRequestChangesReason] = useState('');


  const currentUserRole = currentUser?.role;
  const isOwner = currentUserRole === ROLES.OWNER;
  const isManager = currentUserRole === ROLES.MANAGER;

  const flushPendingSaveRef = useRef<(() => Promise<boolean>) | null>(null);

  // Navigate back to company detail -> relationship closeness tab
  const handleBackToDashboard = useCallback(async () => {
    if (flushPendingSaveRef.current) {
      try {
        const ok = await flushPendingSaveRef.current();
        if (!ok) {
          setActionMessage({
            type: 'error',
            text: 'Không thể lưu tự động bản nháp trước khi thoát. Vui lòng thử lại.',
          });
          return;
        }
      } catch {
        setActionMessage({
          type: 'error',
          text: 'Không thể lưu tự động bản nháp trước khi thoát. Vui lòng thử lại.',
        });
        return;
      }
    }
    if (!setActivePage) {
      window.history.back();
      return;
    }
    setActivePage(`company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=relationship-closeness`);
  }, [setActivePage, companyProfileId]);

  // Load data
  const loadData = useCallback(async () => {
    if (!companyProfileId) {
      setActionMessage({ type: 'error', text: 'Không tìm thấy mã hồ sơ doanh nghiệp.' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setActionMessage(null);

      // Fetch company profile to verify eligibility and name
      let fetchedProfile = null;
      try {
        fetchedProfile = await companyProfileApi.getCompanyProfile(companyProfileId);
        const cName = fetchedProfile?.identity?.tradeName || fetchedProfile?.identity?.legalName;
        if (cName && !companyName) {
          setCompanyName(cName);
        }
      } catch {
        // ignore profile fetch failure
      }

      if (fetchedProfile && !canUseRelationshipCloseness(fetchedProfile.relationshipType, false, false, fetchedProfile.canAccessRelationshipCloseness)) {
        // Redirect back to Company Detail -> Overview for non-eligible companies
        if (setActivePage) {
          setActivePage(`company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=overview`);
        } else if (typeof window !== 'undefined') {
          window.location.href = `#/company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=overview`;
        }
        setLoading(false);
        return;
      }

      // Fetch overview
      const ovRes = await companyRelationshipAssessmentApi.getOverview(companyProfileId);
      setOverview(ovRes.data);

      const targetAssessmentId = historyId || assessmentId;

      let resolvedAssessment: RelationshipAssessmentResponse | null = null;
      if (targetAssessmentId) {
        // Direct assessment by id
        const assessRes = await companyRelationshipAssessmentApi.getById(targetAssessmentId);
        resolvedAssessment = assessRes.data;
      } else if (ovRes.data?.activeAssessment) {
        resolvedAssessment = ovRes.data.activeAssessment;
      } else if (ovRes.data?.officialFinalizedAssessment) {
        resolvedAssessment = ovRes.data.officialFinalizedAssessment;
      }

      if (resolvedAssessment) {
        setAssessment(resolvedAssessment);
        if (resolvedAssessment.sourceAssessmentId) {
          try {
            const srcRes = await companyRelationshipAssessmentApi.getById(resolvedAssessment.sourceAssessmentId);
            setSourceAssessment(srcRes.data);
          } catch {
            if (ovRes.data?.officialFinalizedAssessment?.id === resolvedAssessment.sourceAssessmentId) {
              setSourceAssessment(ovRes.data.officialFinalizedAssessment);
            }
          }
        } else if (resolvedAssessment.isOwnerAdjustment && ovRes.data?.officialFinalizedAssessment) {
          setSourceAssessment(ovRes.data.officialFinalizedAssessment);
        }
      } else {
        // Virtual initial draft when no assessment exists yet
        const liveEvidence = ovRes.data?.liveCommercialEvidence;
        const virtualDraft: RelationshipAssessmentResponse = {
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
          canComplete: isManager,
          canRequestChanges: false,
          canFinalize: false,
          canCreateNewVersion: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setAssessment(virtualDraft);
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể tải thông tin chi tiết đánh giá.',
      });
    } finally {
      setLoading(false);
    }
  }, [companyProfileId, assessmentId, historyId, companyName, isManager]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Assessment type and permissions
  const isOwnerAdjustment = Boolean(
    assessment?.isOwnerAdjustment || assessment?.assessmentType === 'OWNER_ADJUSTMENT'
  );
  const isHistorical = Boolean(historyId);
  const isFinalized = assessment?.status === 'FINALIZED';
  const isCancelled = assessment?.status === 'CANCELLED';
  const isOwnerReview = false; // Owner review UI hidden in active V5 flow
  const isSubmittedNonOwner = Boolean(assessment && assessment.status === 'SUBMITTED' && !isOwner);

  const canOwnerEditAdjustment = isOwnerAdjustment && assessment?.status === 'DRAFT' && isOwner && !readOnly;
  const canManagerEditDraft = !isOwnerAdjustment && assessment?.status === 'DRAFT' && isManager && !readOnly;

  const isStrictReadOnly =
    readOnly ||
    isHistorical ||
    isFinalized ||
    isCancelled ||
    isSubmittedNonOwner ||
    (isOwnerAdjustment && !canOwnerEditAdjustment) ||
    (!isOwnerAdjustment && !canManagerEditDraft);

  const assessmentRef = useRef(assessment);
  assessmentRef.current = assessment;

  // Handle Save Draft (stays on detail page, quiet auto-save without disruptive banners)
  const handleSaveDraft = async (data: UpdateRelationshipAssessmentRequest) => {
    const currentAssessment = assessmentRef.current;
    if (!currentAssessment) return;
    try {
      setIsSaving(true);
      let updated: RelationshipAssessmentResponse;

      if (!currentAssessment.id || currentAssessment.id === 0) {
        // First-time assessment lazy creation
        const res = await companyRelationshipAssessmentApi.createDraft(companyProfileId, data);
        updated = res.data;
        assessmentRef.current = updated;
        setAssessment(updated);
      } else {
        const res = await companyRelationshipAssessmentApi.updateDraft(currentAssessment.id, data);
        updated = res.data;
        assessmentRef.current = updated;
        setAssessment(updated);
      }
    } catch (err: any) {
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Complete (Manager direct completion -> atomic API call & navigates back to Dashboard)
  const handleComplete = async (data?: UpdateRelationshipAssessmentRequest) => {
    if (!assessment) return;
    try {
      setIsSubmitting(true);
      setActionMessage(null);
      let targetId = assessment.id;

      if (!targetId || targetId === 0) {
        const createRes = await companyRelationshipAssessmentApi.createDraft(companyProfileId, data);
        targetId = createRes.data.id;
      }

      if (targetId) {
        await companyRelationshipAssessmentApi.complete(targetId, data);
      }

      // Navigate back to Relationship Closeness Dashboard
      handleBackToDashboard();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể hoàn tất đánh giá.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Owner Adjustment Save Draft
  const handleSaveOwnerAdjustment = async (data: OwnerAdjustmentUpdateRequest) => {
    const currentAssessment = assessmentRef.current;
    if (!currentAssessment) return;
    try {
      setIsSaving(true);
      const res = await companyRelationshipAssessmentApi.updateOwnerAdjustment(currentAssessment.id, data);
      setAssessment(res.data);
      assessmentRef.current = res.data;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Complete Owner Adjustment
  const handleCompleteOwnerAdjustment = async (data: OwnerAdjustmentUpdateRequest) => {
    if (!assessment) return;
    try {
      setIsSubmitting(true);
      setActionMessage(null);
      await companyRelationshipAssessmentApi.completeOwnerAdjustment(assessment.id, data);
      handleBackToDashboard();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể hoàn tất điều chỉnh đánh giá.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Owner Adjustment
  const handleCancelOwnerAdjustment = async () => {
    if (!assessment) return;
    await companyRelationshipAssessmentApi.cancelOwnerAdjustment(assessment.id);
  };

  // Handle Owner Request Changes -> navigates back to Dashboard (preserved)
  const handleRequestChanges = async () => {
    if (!assessment || !requestChangesReason.trim()) return;
    try {
      setIsSubmitting(true);
      setActionMessage(null);
      await companyRelationshipAssessmentApi.requestChanges(assessment.id, {
        reason: requestChangesReason.trim(),
      });
      setIsRequestChangesOpen(false);
      setRequestChangesReason('');
      // Navigate back to Dashboard
      handleBackToDashboard();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể gửi yêu cầu sửa đổi.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Owner Finalize -> navigates back to Dashboard (preserved)
  const handleFinalize = async (data: FinalizeRelationshipAssessmentRequest) => {
    if (!assessment) return;
    try {
      setIsSubmitting(true);
      setActionMessage(null);
      await companyRelationshipAssessmentApi.finalize(assessment.id, data);
      // Navigate back to Dashboard
      handleBackToDashboard();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể phê duyệt đánh giá chính thức.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleDisplayName = (role?: Role) => {
    switch (role) {
      case ROLES.ADMIN: return 'Administrator';
      case ROLES.OWNER: return 'Business Owner';
      case ROLES.MANAGER: return 'BD Manager';
      case ROLES.STAFF: return 'Research Staff';
      default: return 'User';
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingBox} style={{ minHeight: '60vh' }}>
        <Loader2 size={28} className="spinIcon" style={{ color: '#2563eb' }} />
        <span style={{ fontSize: '0.95rem', color: '#64748b' }}>
          Đang tải màn hình đánh giá Relationship Closeness...
        </span>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className={styles.emptyBox} style={{ minHeight: '60vh' }}>
        <AlertCircle size={40} style={{ color: '#ef4444' }} />
        <div className={styles.emptyTitle}>Không tìm thấy dữ liệu đánh giá</div>
        <p className={styles.emptyDesc}>
          Vui lòng kiểm tra lại đường dẫn hoặc quay lại màn hình Dashboard.
        </p>
        <button type="button" className={styles.btnSecondary} onClick={handleBackToDashboard}>
          <ArrowLeft size={16} />
          <span>Quay lại Relationship Closeness</span>
        </button>
      </div>
    );
  }

  const liveEvidence = overview?.liveCommercialEvidence;
  const status = isHistorical ? 'FINALIZED' : assessment.status;

  return (
    <div className={styles.container} style={{ maxWidth: 1560, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Action Notification Banner */}
      {actionMessage && (
        <div className={actionMessage.type === 'ok' ? styles.alertBannerBlue : styles.alertBannerOrange}>
          {actionMessage.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DETAIL PAGE HEADER WITH CONTEXT & BACK BUTTON                           */}
      {/* ========================================================================= */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '18px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleBackToDashboard}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Relationship Closeness</span>
          </button>

          {isHistorical && (
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1e40af',
                background: '#dbeafe',
                padding: '4px 12px',
                borderRadius: 999,
              }}
            >
              Chế độ xem lịch sử (Read-Only)
            </span>
          )}

          {isOwnerReview && (
            <span
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#15803d',
                background: '#dcfce7',
                padding: '4px 12px',
                borderRadius: 999,
              }}
            >
              Chế độ Business Owner thẩm định & phê duyệt
            </span>
          )}
        </div>

        {isOwnerAdjustment ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Điều chỉnh mức độ thân thiết
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: '0.88rem', color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>{companyName || 'Doanh nghiệp'}</strong>
                <span>·</span>
                <span>
                  Phiên bản <strong>V{assessment.versionNumber}</strong>
                </span>
                <span>·</span>
                <span>
                  Điều chỉnh từ <strong>V{assessment.sourceVersionNumber ?? sourceAssessment?.versionNumber ?? (assessment.versionNumber - 1)}</strong>
                </span>
                <span
                  className={`${styles.statusBadge} ${
                    status === 'FINALIZED'
                      ? styles.statusFinalized
                      : status === 'SUBMITTED'
                      ? styles.statusSubmitted
                      : status === 'CHANGES_REQUESTED'
                      ? styles.statusChangesRequested
                      : styles.statusDraft
                  }`}
                  style={{ marginLeft: 4 }}
                >
                  {status}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                Relationship Closeness Assessment
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: '0.86rem', color: '#475569' }}>
                <div>
                  Doanh nghiệp: <strong style={{ color: '#0f172a' }}>{companyName || 'Đối tác'}</strong>
                </div>
                <span>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Phiên bản: <strong style={{ color: '#0f172a' }}>V{assessment.versionNumber}</strong>
                  <span
                    style={{
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    Manager Assessment
                  </span>
                </div>
                <span>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Trạng thái:
                  <span
                    className={`${styles.statusBadge} ${
                      status === 'FINALIZED'
                        ? styles.statusFinalized
                        : status === 'SUBMITTED'
                        ? styles.statusSubmitted
                        : status === 'CHANGES_REQUESTED'
                        ? styles.statusChangesRequested
                        : styles.statusDraft
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <span>•</span>
                <div>
                  Vai trò của bạn: <strong style={{ color: '#2563eb' }}>{getRoleDisplayName(currentUserRole)}</strong>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
              <div>
                Cập nhật lần cuối: <strong>{formatDate(assessment.updatedAt || assessment.createdAt)}</strong>
              </div>
              {assessment.finalizedAt && (
                <div style={{ marginTop: 2 }}>
                  Hoàn tất: <strong>{formatDate(assessment.finalizedAt)}</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. PROMINENT OWNER FEEDBACK BANNER (FOR CHANGES_REQUESTED)                */}
      {/* ========================================================================= */}
      {assessment.status === 'CHANGES_REQUESTED' && assessment.changesRequestedReason && (
        <div
          className={styles.alertBannerOrange}
          style={{ padding: '16px 20px', borderRadius: 10, fontSize: '0.92rem' }}
        >
          <ShieldAlert size={22} style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: 2 }}>
              Ý kiến phản hồi từ Business Owner:
            </strong>
            <span>"{assessment.changesRequestedReason}"</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MAIN ASSESSMENT CONTENT: EDIT FORM OR READ-ONLY BREAKDOWN               */}
      {/* ========================================================================= */}
      {canOwnerEditAdjustment ? (
        <RelationshipOwnerAdjustmentEditor
          assessment={assessment}
          sourceAssessment={sourceAssessment}
          commercialEvidence={liveEvidence}
          onSave={handleSaveOwnerAdjustment}
          onComplete={handleCompleteOwnerAdjustment}
          onCancelAdjustment={handleCancelOwnerAdjustment}
          onBack={handleBackToDashboard}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          onFlushPendingSaveRef={flushPendingSaveRef}
        />
      ) : canManagerEditDraft ? (
        <div>
          <RelationshipScoreBuilderTable
            assessment={assessment}
            commercialEvidence={liveEvidence}
            isOwnerReview={false}
            onSaveDraft={handleSaveDraft}
            onFlushPendingSaveRef={flushPendingSaveRef}
            onComplete={handleComplete}
            onFinalize={handleFinalize}
            onRequestChanges={() => setIsRequestChangesOpen(true)}
            onCancel={handleBackToDashboard}
            isSaving={isSaving}
            isSubmitting={isSubmitting}
            canSubmit={Boolean(assessment.canSubmit || isManager)}
            canComplete={Boolean(assessment.canComplete ?? (assessment.status === 'DRAFT' && isManager))}
            isManager={isManager}
            isOwner={isOwner}
          />
        </div>
      ) : (
        /* Read-Only Mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Read-Only Notice for In-Progress evaluations */}
          {isOwner && !isOwnerAdjustment && assessment.status === 'DRAFT' && (
            <div className={styles.alertBannerBlue} style={{ padding: '12px 18px', borderRadius: 10, fontSize: '0.88rem' }}>
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>
                Phiên bản <strong>V{assessment.versionNumber}</strong> đang được BD Manager đánh giá. Bạn đang xem ở chế độ chỉ đọc để theo dõi tiến độ.
              </span>
            </div>
          )}

          {isManager && isOwnerAdjustment && assessment.status === 'DRAFT' && (
            <div className={styles.alertBannerBlue} style={{ padding: '12px 18px', borderRadius: 10, fontSize: '0.88rem' }}>
              <Info size={18} style={{ flexShrink: 0 }} />
              <span>
                Phiên bản <strong>V{assessment.versionNumber}</strong> đang được Business Owner điều chỉnh (dựa trên V{assessment.sourceVersionNumber ?? sourceAssessment?.versionNumber ?? (assessment.versionNumber - 1)}). Bạn đang xem ở chế độ chỉ đọc để theo dõi tiến độ.
              </span>
            </div>
          )}

          {isOwnerAdjustment && assessment.status === 'FINALIZED' && assessment.ownerAdjustmentReason && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                background: '#faf5ff',
                border: '1px solid #e9d5ff',
                borderRadius: 10,
                padding: '14px 18px',
                color: '#6b21a8',
                fontSize: '0.9rem',
                lineHeight: 1.5,
              }}
            >
              <Info size={18} style={{ flexShrink: 0, marginTop: 2, color: '#7c3aed' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 2, color: '#581c87' }}>
                  Lý do điều chỉnh của Business Owner (V{assessment.versionNumber} từ V{assessment.sourceVersionNumber ?? sourceAssessment?.versionNumber ?? (assessment.versionNumber - 1)}):
                </strong>
                <span>"{assessment.ownerAdjustmentReason}"</span>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.titleGroup}>
                <h3 className={styles.cardTitle}>
                  Chi tiết đánh giá {isHistorical ? `Version ${assessment.versionNumber}` : 'chính thức'}
                </h3>
                <span className={styles.versionBadge}>Version {assessment.versionNumber}</span>
                {isOwnerAdjustment && (
                  <span
                    style={{
                      background: '#f5f3ff',
                      color: '#7c3aed',
                      border: '1px solid #ddd6fe',
                      borderRadius: 999,
                      padding: '2px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    Owner Adjustment
                  </span>
                )}
                <span
                  className={`${styles.statusBadge} ${
                    status === 'FINALIZED' ? styles.statusFinalized : styles.statusSubmitted
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>

            <RelationshipScoreBreakdown
              assessment={assessment}
              commercialEvidence={liveEvidence}
              showDetails={true}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. OWNER REQUEST CHANGES MODAL                                            */}
      {/* ========================================================================= */}
      {isRequestChangesOpen && (
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
              maxWidth: 520,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#9a3412' }}>
                Yêu cầu chỉnh sửa đánh giá (Request Changes)
              </h3>
              <button
                type="button"
                onClick={() => setIsRequestChangesOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.86rem', color: '#475569', lineHeight: 1.45 }}>
              Vui lòng nhập lý do và yêu cầu cụ thể để Business Development Manager cập nhật lại đánh giá.
            </p>

            <textarea
              className={styles.textarea}
              placeholder="Nhập chi tiết yêu cầu chỉnh sửa cho Manager..."
              value={requestChangesReason}
              onChange={(e) => setRequestChangesReason(e.target.value)}
              rows={4}
            />

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsRequestChangesOpen(false)}
                disabled={isSubmitting}
              >
                Hủy
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleRequestChanges}
                disabled={isSubmitting || !requestChangesReason.trim()}
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu sửa đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
