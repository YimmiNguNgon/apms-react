import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { companyRelationshipAssessmentApi } from '../API/companyRelationshipAssessmentApi';
import { companyProfileApi } from '../API/companyProfileApi';
import { ROLES, useUser, type Role } from '../context/UserContext';
import type {
  RelationshipAssessmentResponse,
  RelationshipAssessmentDraftResponse,
  SaveRelationshipAssessmentDraftRequest,
  RelationshipOverviewResponse,
  CompleteRelationshipAssessmentRequest,
  CompleteOwnerAdjustmentRequest,
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
  assessmentType: 'MANAGER_ASSESSMENT' | 'OWNER_ADJUSTMENT' | null;
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
    assessmentType: (params.get('assessmentType') as any) || null,
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
  const { companyProfileId, assessmentId, historyId, readOnly } = navContext;

  const [companyName, setCompanyName] = useState<string>(navContext.companyName || '');
  const [loading, setLoading] = useState(true);
  const [assessment, setAssessment] = useState<RelationshipAssessmentResponse | null>(null);
  const [sourceAssessment, setSourceAssessment] = useState<RelationshipAssessmentResponse | null>(null);
  const [overview, setOverview] = useState<RelationshipOverviewResponse | null>(null);
  const [myDraft, setMyDraft] = useState<RelationshipAssessmentDraftResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'ok' | 'error'; text: string; conflict?: boolean } | null>(null);

  // Local unsaved changes state & confirmation modal
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const currentUserRole = currentUser?.role;
  const isOwner = currentUserRole === ROLES.OWNER;
  const isManager = currentUserRole === ROLES.MANAGER;

  // Perform backward navigation
  const performBackNavigation = useCallback(() => {
    if (!setActivePage) {
      window.history.back();
      return;
    }
    setActivePage(`company-detail?companyId=${encodeURIComponent(companyProfileId)}&tab=relationship-closeness`);
  }, [setActivePage, companyProfileId]);

  // Navigate back with unsaved check
  const handleBackToDashboard = useCallback(() => {
    if (isDirty) {
      setShowUnsavedModal(true);
      return;
    }
    performBackNavigation();
  }, [isDirty, performBackNavigation]);

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

      const latestOfficial = ovRes.data?.officialFinalizedAssessment || null;
      const liveEvidence = ovRes.data?.liveCommercialEvidence;
      const draft = ovRes.data?.myDraft || null;
      setMyDraft(draft);
      const targetAssessmentId = historyId || (readOnly ? assessmentId : null);

      if (targetAssessmentId) {
        // Viewing historical finalized assessment (Read-only)
        const assessRes = await companyRelationshipAssessmentApi.getById(targetAssessmentId);
        setAssessment(assessRes.data);
        if (assessRes.data.sourceAssessmentId) {
          try {
            const srcRes = await companyRelationshipAssessmentApi.getById(assessRes.data.sourceAssessmentId);
            setSourceAssessment(srcRes.data);
          } catch {
            if (latestOfficial?.id === assessRes.data.sourceAssessmentId) {
              setSourceAssessment(latestOfficial);
            }
          }
        }
      } else {
        // Edit mode: Purely in-memory blank form (or initialized from private draft)
        const isOwnerAdjustment = navContext.assessmentType === 'OWNER_ADJUSTMENT' || (isOwner && !isManager);

        if (isOwnerAdjustment) {
          if (!latestOfficial) {
            setActionMessage({
              type: 'error',
              text: 'Không thể điều chỉnh khi chưa có bản đánh giá chính thức nào.',
            });
            setLoading(false);
            return;
          }
          setSourceAssessment(latestOfficial);
          const latestMajor = latestOfficial.majorVersion ?? latestOfficial.versionNumber ?? 1;
          const nextMinor = (latestOfficial.minorRevision ?? 0) + 1;
          const nextVersionNumber = latestMajor * 100 + nextMinor;
          const formattedVersion = `V${latestMajor}.${nextMinor}`;

          const virtualAdjustment: RelationshipAssessmentResponse = {
            id: 0,
            companyProfileId,
            ownerCompanyProfileId: latestOfficial.ownerCompanyProfileId,
            versionNumber: nextVersionNumber,
            majorVersion: latestMajor,
            minorRevision: nextMinor,
            formattedVersion,
            status: 'DRAFT',
            assessmentType: 'OWNER_ADJUSTMENT',
            isOwnerAdjustment: true,
            sourceAssessmentId: latestOfficial.id,
            sourceVersionNumber: latestOfficial.versionNumber,
            scoringPolicyVersion: 'RELATIONSHIP_CLOSENESS_V5',
            approvedContractCount: liveEvidence?.approvedContractCount ?? latestOfficial.approvedContractCount ?? 0,
            totalContractValueVnd: liveEvidence?.totalContractValueVnd ?? latestOfficial.totalContractValueVnd ?? null,
            contractCurrencies: liveEvidence?.contractCurrencies ?? latestOfficial.contractCurrencies ?? null,
            contractValueStatus: liveEvidence?.contractValueStatus ?? latestOfficial.contractValueStatus ?? 'SCORABLE',
            firstCooperationDate: liveEvidence?.firstCooperationDate ?? latestOfficial.firstCooperationDate ?? null,
            latestContractDate: liveEvidence?.latestContractDate ?? latestOfficial.latestContractDate ?? null,
            upcomingContractCount: liveEvidence?.upcomingContractCount ?? latestOfficial.upcomingContractCount ?? 0,
            scorableBase: 30,
            normalizationApplied: true,
            ownerCommercialScore: draft?.ownerCommercialScore ?? null,
            ownerCooperationScore: draft?.ownerCooperationScore ?? null,
            ownerStrategicScore: draft?.ownerStrategicScore ?? null,
            ownerRelationshipNetworkScore: draft?.ownerRelationshipNetworkScore ?? null,
            ownerEngagementScore: draft?.ownerEngagementScore ?? null,
            ownerQualitativeScore: draft?.ownerQualitativeScore ?? null,
            ownerCommercialNote: draft?.ownerCommercialNote ?? null,
            ownerCooperationNote: draft?.ownerCooperationNote ?? null,
            ownerStrategicNote: draft?.ownerStrategicNote ?? null,
            ownerRelationshipNetworkNote: draft?.ownerRelationshipNetworkNote ?? null,
            ownerEngagementNote: draft?.ownerEngagementNote ?? null,
            ownerQualitativeNote: draft?.ownerQualitativeNote ?? null,
            ownerNote: draft?.ownerNote ?? null,
            ownerAdjustmentReason: draft?.ownerAdjustmentReason ?? null,
            isOfficialFinalized: false,
            canEditDraft: true,
            canSubmit: false,
            canComplete: isOwner,
            canRequestChanges: false,
            canFinalize: false,
            canCreateNewVersion: false,
            createdAt: draft?.createdAt ?? new Date().toISOString(),
            updatedAt: draft?.updatedAt ?? new Date().toISOString(),
          };
          setAssessment(virtualAdjustment);
        } else {
          // Manager Assessment: blank form or initialized from private draft
          setSourceAssessment(latestOfficial);
          const nextMajor = (latestOfficial?.majorVersion ?? latestOfficial?.versionNumber ?? 0) + 1;
          const formattedVersion = `V${nextMajor}`;

          const virtualAssessment: RelationshipAssessmentResponse = {
            id: 0,
            companyProfileId,
            ownerCompanyProfileId: '',
            versionNumber: nextMajor,
            majorVersion: nextMajor,
            minorRevision: 0,
            formattedVersion,
            status: 'DRAFT',
            assessmentType: 'MANAGER_ASSESSMENT',
            isOwnerAdjustment: false,
            sourceAssessmentId: latestOfficial?.id ?? null,
            sourceVersionNumber: latestOfficial?.versionNumber ?? null,
            scoringPolicyVersion: 'RELATIONSHIP_CLOSENESS_V5',
            commercialAwardedScore: draft?.commercialScore ?? null,
            cooperationScore: draft?.cooperationScore ?? null,
            strategicScore: draft?.strategicScore ?? null,
            relationshipNetworkScore: draft?.relationshipNetworkScore ?? null,
            engagementScore: draft?.engagementScore ?? null,
            qualitativeScore: draft?.qualitativeScore ?? null,
            trustScore: draft?.qualitativeScore ?? null,
            commercialEvidenceNote: draft?.commercialEvidenceNote ?? null,
            cooperationEvidenceNote: draft?.cooperationEvidenceNote ?? null,
            strategicEvidenceNote: draft?.strategicEvidenceNote ?? null,
            relationshipNetworkNote: draft?.relationshipNetworkNote ?? null,
            engagementEvidenceNote: draft?.engagementEvidenceNote ?? null,
            qualitativeEvidenceNote: draft?.qualitativeEvidenceNote ?? null,
            trustEvidenceNote: draft?.qualitativeEvidenceNote ?? null,
            managerNote: draft?.managerNote ?? null,
            approvedContractCount: liveEvidence?.approvedContractCount ?? 0,
            totalContractValueVnd: liveEvidence?.totalContractValueVnd ?? null,
            contractCurrencies: liveEvidence?.contractCurrencies ?? null,
            contractValueStatus: liveEvidence?.contractValueStatus ?? 'SCORABLE',
            firstCooperationDate: liveEvidence?.firstCooperationDate ?? null,
            latestContractDate: liveEvidence?.latestContractDate ?? null,
            upcomingContractCount: liveEvidence?.upcomingContractCount ?? 0,
            scorableBase: 30,
            normalizationApplied: true,
            completedCriteriaCount: draft?.completedCriteriaCount ?? 0,
            totalCriteriaCount: 6,
            isComplete: false,
            isOfficialFinalized: false,
            canEditDraft: true,
            canSubmit: isManager,
            canComplete: isManager,
            canRequestChanges: false,
            canFinalize: false,
            canCreateNewVersion: false,
            createdAt: draft?.createdAt ?? new Date().toISOString(),
            updatedAt: draft?.updatedAt ?? new Date().toISOString(),
          };
          setAssessment(virtualAssessment);
        }
      }
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể tải thông tin chi tiết đánh giá.',
      });
    } finally {
      setLoading(false);
    }
  }, [companyProfileId, assessmentId, historyId, companyName, isManager, isOwner, navContext.assessmentType, readOnly, setActivePage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Assessment type and permissions
  const isOwnerAdjustment = Boolean(
    assessment?.isOwnerAdjustment || assessment?.assessmentType === 'OWNER_ADJUSTMENT'
  );
  const isHistorical = Boolean(historyId || readOnly);
  const isFinalized = assessment?.status === 'FINALIZED' && assessment.id !== 0;

  const canOwnerEditAdjustment = isOwnerAdjustment && isOwner && !isHistorical;
  const canManagerEditDraft = !isOwnerAdjustment && isManager && !isHistorical;

  // Atomic Manager Completion
  const handleComplete = async (data: CompleteRelationshipAssessmentRequest) => {
    try {
      setIsSubmitting(true);
      setActionMessage(null);
      const payload: CompleteRelationshipAssessmentRequest = {
        ...data,
        sourceAssessmentId: sourceAssessment?.id ?? null,
        baseMajorVersion: myDraft?.baseMajorVersion ?? sourceAssessment?.majorVersion ?? sourceAssessment?.versionNumber ?? 0,
      };
      await companyRelationshipAssessmentApi.completeDirectAssessment(companyProfileId, payload);
      setIsDirty(false);
      performBackNavigation();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setActionMessage({
          type: 'error',
          text: err.response.data?.message || 'Bản đánh giá chính thức đã được cập nhật trong khi bạn đang thực hiện đánh giá. Vui lòng tải lại dữ liệu trước khi tiếp tục.',
          conflict: true,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: err?.response?.data?.message || 'Không thể hoàn tất đánh giá.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Atomic Owner Adjustment Completion
  const handleCompleteOwnerAdjustment = async (data: CompleteOwnerAdjustmentRequest) => {
    try {
      setIsSubmitting(true);
      setActionMessage(null);
      const payload: CompleteOwnerAdjustmentRequest = {
        ...data,
        baseMajorVersion: sourceAssessment?.majorVersion ?? sourceAssessment?.versionNumber ?? 1,
        baseMinorRevision: sourceAssessment?.minorRevision ?? 0,
      };
      await companyRelationshipAssessmentApi.completeDirectOwnerAdjustment(companyProfileId, payload);
      setIsDirty(false);
      performBackNavigation();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setActionMessage({
          type: 'error',
          text: err.response.data?.message || 'Bản đánh giá chính thức đã được cập nhật trong khi bạn đang thực hiện đánh giá. Vui lòng tải lại dữ liệu trước khi tiếp tục.',
          conflict: true,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: err?.response?.data?.message || 'Không thể hoàn tất điều chỉnh đánh giá.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Private Draft
  const handleSaveDraft = async (data: any) => {
    try {
      setIsSavingDraft(true);
      setActionMessage(null);
      let draftPayload: SaveRelationshipAssessmentDraftRequest;
      if (isOwnerAdjustment) {
        draftPayload = data;
      } else {
        draftPayload = {
          baseOfficialAssessmentId: sourceAssessment?.id ?? null,
          baseMajorVersion: sourceAssessment?.majorVersion ?? sourceAssessment?.versionNumber ?? 0,
          commercialScore: data.commercialAwardedScore,
          cooperationScore: data.cooperationScore,
          strategicScore: data.strategicScore,
          relationshipNetworkScore: data.relationshipNetworkScore,
          engagementScore: data.engagementScore,
          qualitativeScore: data.qualitativeScore ?? data.trustScore,
          commercialEvidenceNote: data.commercialEvidenceNote,
          cooperationEvidenceNote: data.cooperationEvidenceNote,
          strategicEvidenceNote: data.strategicEvidenceNote,
          relationshipNetworkNote: data.relationshipNetworkNote,
          engagementEvidenceNote: data.engagementEvidenceNote,
          qualitativeEvidenceNote: data.qualitativeEvidenceNote ?? data.trustEvidenceNote,
          managerNote: data.managerNote,
        };
      }
      const res = await companyRelationshipAssessmentApi.saveDraft(companyProfileId, draftPayload);
      setMyDraft(res.data);
      setIsDirty(false);
      performBackNavigation();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể lưu bản nháp.',
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Rebase Owner Draft to new baseline
  const handleRebaseOwnerDraft = async () => {
    try {
      setIsSavingDraft(true);
      setActionMessage(null);
      const res = await companyRelationshipAssessmentApi.rebaseOwnerDraft(companyProfileId);
      setMyDraft(res.data);
      setIsDirty(false);
      setActionMessage({ type: 'ok', text: 'Đã cập nhật bản nháp theo phiên bản chính thức mới nhất.' });
      await loadData();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể cập nhật bản nháp.',
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Delete Private Draft
  const handleDeleteDraft = async () => {
    try {
      setIsSavingDraft(true);
      setActionMessage(null);
      await companyRelationshipAssessmentApi.deleteMyDraft(companyProfileId);
      setMyDraft(null);
      setIsDirty(false);
      setActionMessage({ type: 'ok', text: 'Đã xóa bản nháp.' });
      performBackNavigation();
    } catch (err: any) {
      setActionMessage({
        type: 'error',
        text: err?.response?.data?.message || 'Không thể xóa bản nháp.',
      });
    } finally {
      setIsSavingDraft(false);
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

  return (
    <div className={styles.container} style={{ maxWidth: 1560, margin: '0 auto', padding: '16px 20px 48px' }}>
      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={actionMessage.type === 'ok' ? styles.alertBannerBlue : styles.alertBannerOrange}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {actionMessage.type === 'ok' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
          {actionMessage.conflict && (
            <button
              type="button"
              className={styles.btnSecondary}
              style={{ padding: '4px 10px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                setActionMessage(null);
                setIsDirty(false);
                loadData();
              }}
            >
              Tải lại đánh giá
            </button>
          )}
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
                  Phiên bản <strong>{assessment.formattedVersion || `V${assessment.versionNumber}`}</strong>
                </span>
                <span>·</span>
                <span>
                  Điều chỉnh từ <strong>{sourceAssessment?.formattedVersion || (assessment.sourceVersionNumber ? `V${assessment.sourceVersionNumber}` : `V${assessment.versionNumber - 1}`)}</strong>
                </span>
                {isFinalized && (
                  <span className={`${styles.statusBadge} ${styles.statusFinalized}`} style={{ marginLeft: 4 }}>
                    FINALIZED
                  </span>
                )}
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
                  Phiên bản: <strong style={{ color: '#0f172a' }}>{assessment.formattedVersion || `V${assessment.versionNumber}`}</strong>
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
                {isFinalized && (
                  <>
                    <span>•</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Trạng thái:
                      <span className={`${styles.statusBadge} ${styles.statusFinalized}`}>
                        FINALIZED
                      </span>
                    </div>
                  </>
                )}
                <span>•</span>
                <div>
                  Vai trò của bạn: <strong style={{ color: '#2563eb' }}>{getRoleDisplayName(currentUserRole)}</strong>
                </div>
              </div>
            </div>

            {assessment.updatedAt && (
              <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#64748b' }}>
                <div>
                  Cập nhật: <strong>{formatDate(assessment.updatedAt || assessment.createdAt)}</strong>
                </div>
                {assessment.finalizedAt && (
                  <div style={{ marginTop: 2 }}>
                    Hoàn tất: <strong>{formatDate(assessment.finalizedAt)}</strong>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN ASSESSMENT CONTENT: EDIT FORM OR READ-ONLY BREAKDOWN               */}
      {/* ========================================================================= */}
      {canOwnerEditAdjustment ? (
        <RelationshipOwnerAdjustmentEditor
          assessment={assessment}
          sourceAssessment={sourceAssessment}
          commercialEvidence={liveEvidence}
          draft={myDraft}
          onComplete={handleCompleteOwnerAdjustment}
          onBack={handleBackToDashboard}
          onSaveDraft={handleSaveDraft}
          onRebaseDraft={handleRebaseOwnerDraft}
          onDeleteDraft={handleDeleteDraft}
          onDirtyChange={setIsDirty}
          isSaving={isSavingDraft}
          isSubmitting={isSubmitting}
        />
      ) : canManagerEditDraft ? (
        <div>
          <RelationshipScoreBuilderTable
            assessment={assessment}
            commercialEvidence={liveEvidence}
            draft={myDraft}
            isOwnerReview={false}
            onComplete={handleComplete}
            onSaveDraft={handleSaveDraft}
            onCancel={handleBackToDashboard}
            onDirtyChange={setIsDirty}
            isSaving={isSavingDraft}
            isSubmitting={isSubmitting}
            canComplete={isManager}
            isManager={isManager}
            isOwner={isOwner}
          />
        </div>
      ) : (
        /* Read-Only Mode */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  Lý do điều chỉnh của Business Owner ({assessment.formattedVersion || `V${assessment.versionNumber}`} từ {assessment.sourceFormattedVersion || sourceAssessment?.formattedVersion || (assessment.sourceVersionNumber ? `V${assessment.sourceVersionNumber}` : `V${assessment.versionNumber - 1}`)}):
                </strong>
                <span>"{assessment.ownerAdjustmentReason}"</span>
              </div>
            </div>
          )}

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.titleGroup}>
                <h3 className={styles.cardTitle}>
                  Chi tiết đánh giá {isHistorical ? (assessment.formattedVersion ? `(${assessment.formattedVersion})` : `Version ${assessment.versionNumber}`) : 'chính thức'}
                </h3>
                <span className={styles.versionBadge}>{assessment.formattedVersion || `Version ${assessment.versionNumber}`}</span>
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
                <span className={`${styles.statusBadge} ${styles.statusFinalized}`}>
                  FINALIZED
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
      {/* 3. UNSAVED CHANGES CONFIRMATION MODAL                                     */}
      {/* ========================================================================= */}
      {showUnsavedModal && (
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
                Rời khỏi màn hình đánh giá?
              </h3>
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
              Bạn có thay đổi chưa hoàn tất. Bạn có chắc muốn rời đi? Dữ liệu chưa hoàn tất sẽ không được lưu.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowUnsavedModal(false)}
              >
                Ở lại
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => {
                  setShowUnsavedModal(false);
                  setIsDirty(false);
                  performBackNavigation();
                }}
              >
                Rời đi không lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
