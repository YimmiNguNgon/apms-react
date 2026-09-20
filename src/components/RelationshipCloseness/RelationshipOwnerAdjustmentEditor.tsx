import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type {
  RelationshipAssessmentResponse,
  CommercialEvidence,
  CompleteOwnerAdjustmentRequest,
  OwnerAdjustmentUpdateRequest,
} from '../../types/relationshipAssessment';
import { CriterionGuidancePopover } from './CriterionGuidancePopover';
import { RelationshipScoreSelect } from './RelationshipScoreSelect';
import {
  calculateRelationshipClosenessV5,
  getOfficialScoresFromAssessment,
  type V5CriterionKey,
} from './scoringGuidanceConfig';
import styles from './RelationshipCloseness.module.css';

interface RelationshipOwnerAdjustmentEditorProps {
  assessment: RelationshipAssessmentResponse;
  sourceAssessment?: RelationshipAssessmentResponse | null;
  commercialEvidence?: CommercialEvidence | null;
  draft?: import('../../types/relationshipAssessment').RelationshipAssessmentDraftResponse | null;
  onComplete: (data: CompleteOwnerAdjustmentRequest) => Promise<void>;
  onBack: () => void;
  onSaveDraft?: (data: import('../../types/relationshipAssessment').SaveRelationshipAssessmentDraftRequest) => Promise<void>;
  onRebaseDraft?: () => Promise<void>;
  onDeleteDraft?: () => Promise<void>;
  onSave?: (data: any) => Promise<void>;
  onCancelAdjustment?: () => Promise<void>;
  isSaving?: boolean;
  isSubmitting?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onFlushPendingSaveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
}

const CRITERIA_NAMES: Record<string, string> = {
  commercial: 'Commercial Relationship',
  cooperation: 'Interaction & Cooperation',
  strategic: 'Strategic Importance',
  network: 'Relationship Network',
  engagement: 'Business Engagement',
  trust: 'Trust & Reliability',
};

export const RelationshipOwnerAdjustmentEditor: React.FC<RelationshipOwnerAdjustmentEditorProps> = ({
  assessment,
  sourceAssessment,
  commercialEvidence,
  draft,
  onComplete,
  onBack,
  onSaveDraft,
  onRebaseDraft,
  onDeleteDraft,
  isSaving = false,
  isSubmitting = false,
  onDirtyChange,
}) => {
  // Baseline current finalized scores frozen to sourceAssessment (Correction 2)
  const sourceOfficial = useMemo(
    () => getOfficialScoresFromAssessment(sourceAssessment),
    [sourceAssessment]
  );

  const currentComm = sourceOfficial.commercial ?? assessment.commercialAwardedScore ?? assessment.commercialScore ?? 0;
  const currentCoop = sourceOfficial.cooperation ?? assessment.cooperationScore ?? 0;
  const currentStrat = sourceOfficial.strategic ?? assessment.strategicScore ?? 0;
  const currentNet = sourceOfficial.network ?? assessment.relationshipNetworkScore ?? 0;
  const currentEng = sourceOfficial.engagement ?? assessment.engagementScore ?? 0;
  const currentQual = sourceOfficial.qualitative ?? assessment.qualitativeScore ?? assessment.trustScore ?? 0;

  // Helper to initialize adjusted score: if null, undefined, or unchanged from baseline, start as null (renders 'Chọn điểm')
  const initAdjustedScore = (savedScore: number | null | undefined, baseline: number): number | null => {
    if (savedScore !== null && savedScore !== undefined && savedScore !== baseline) {
      return savedScore;
    }
    return null;
  };

  // Owner adjusted values state (null indicates untouched criterion)
  const [ownerComm, setOwnerComm] = useState<number | null>(() =>
    initAdjustedScore(draft?.ownerCommercialScore !== undefined ? draft.ownerCommercialScore : assessment.ownerCommercialScore, currentComm)
  );
  const [ownerCoop, setOwnerCoop] = useState<number | null>(() =>
    initAdjustedScore(draft?.ownerCooperationScore !== undefined ? draft.ownerCooperationScore : assessment.ownerCooperationScore, currentCoop)
  );
  const [ownerStrat, setOwnerStrat] = useState<number | null>(() =>
    initAdjustedScore(draft?.ownerStrategicScore !== undefined ? draft.ownerStrategicScore : assessment.ownerStrategicScore, currentStrat)
  );
  const [ownerNet, setOwnerNet] = useState<number | null>(() =>
    initAdjustedScore(draft?.ownerRelationshipNetworkScore !== undefined ? draft.ownerRelationshipNetworkScore : assessment.ownerRelationshipNetworkScore, currentNet)
  );
  const [ownerEng, setOwnerEng] = useState<number | null>(() =>
    initAdjustedScore(draft?.ownerEngagementScore !== undefined ? draft.ownerEngagementScore : assessment.ownerEngagementScore, currentEng)
  );
  const [ownerQual, setOwnerQual] = useState<number | null>(() =>
    initAdjustedScore(draft?.ownerQualitativeScore !== undefined ? draft.ownerQualitativeScore : assessment.ownerQualitativeScore, currentQual)
  );

  // Per-criterion notes (sole explanation mechanism)
  const [criterionNotes, setCriterionNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (draft?.ownerCommercialNote) initial['commercial'] = draft.ownerCommercialNote;
    if (draft?.ownerCooperationNote) initial['cooperation'] = draft.ownerCooperationNote;
    if (draft?.ownerStrategicNote) initial['strategic'] = draft.ownerStrategicNote;
    if (draft?.ownerRelationshipNetworkNote) initial['network'] = draft.ownerRelationshipNetworkNote;
    if (draft?.ownerEngagementNote) initial['engagement'] = draft.ownerEngagementNote;
    if (draft?.ownerQualitativeNote) initial['trust'] = draft.ownerQualitativeNote;

    if (!initial['network'] && assessment.ownerRelationshipNetworkNote) {
      initial['network'] = assessment.ownerRelationshipNetworkNote;
    }
    if (assessment.ownerNote) {
      try {
        const parsed = JSON.parse(assessment.ownerNote);
        if (typeof parsed === 'object' && parsed !== null) {
          Object.assign(initial, parsed);
        }
      } catch {
        // preserve legacy plain text if any
      }
    }
    // Also parse from ownerAdjustmentReason if formatted as "CriterionName: NoteText"
    if (assessment.ownerAdjustmentReason) {
      const lines = assessment.ownerAdjustmentReason.split('\n');
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const cName = line.slice(0, colonIdx).trim();
          const noteContent = line.slice(colonIdx + 1).trim();
          if (cName && noteContent) {
            const matchedKey = Object.entries(CRITERIA_NAMES).find(
              ([, name]) => name.toLowerCase() === cName.toLowerCase()
            )?.[0];
            if (matchedKey && !initial[matchedKey]) {
              initial[matchedKey] = noteContent;
            }
          }
        }
      }
    }
    return initial;
  });

  const latestValuesRef = useRef({
    ownerComm,
    ownerCoop,
    ownerStrat,
    ownerNet,
    ownerEng,
    ownerQual,
  });
  latestValuesRef.current = {
    ownerComm,
    ownerCoop,
    ownerStrat,
    ownerNet,
    ownerEng,
    ownerQual,
  };

  const latestNotesRef = useRef(criterionNotes);
  latestNotesRef.current = criterionNotes;

  const getPayload = useCallback((): CompleteOwnerAdjustmentRequest => {
    const v = latestValuesRef.current;
    const notes = latestNotesRef.current;

    return {
      sourceAssessmentId: sourceAssessment?.id ?? assessment.sourceAssessmentId ?? assessment.id,
      ownerCommercialScore: v.ownerComm ?? currentComm,
      ownerCommercialNote: (notes['commercial'] ?? '').trim() || null,
      ownerCooperationScore: v.ownerCoop ?? currentCoop,
      ownerCooperationNote: (notes['cooperation'] ?? '').trim() || null,
      ownerStrategicScore: v.ownerStrat ?? currentStrat,
      ownerStrategicNote: (notes['strategic'] ?? '').trim() || null,
      ownerRelationshipNetworkScore: v.ownerNet ?? currentNet,
      ownerRelationshipNetworkNote: (notes['network'] ?? '').trim() || null,
      ownerEngagementScore: v.ownerEng ?? currentEng,
      ownerEngagementNote: (notes['engagement'] ?? '').trim() || null,
      ownerQualitativeScore: v.ownerQual ?? currentQual,
      ownerQualitativeNote: (notes['trust'] ?? '').trim() || null,
      ownerAdjustmentReason: null,
      ownerNote: null,
    };
  }, [sourceAssessment?.id, assessment.sourceAssessmentId, assessment.id, currentComm, currentCoop, currentStrat, currentNet, currentEng, currentQual]);

  // Effective scores: untouched criteria default to current baseline
  const effectiveComm = ownerComm ?? currentComm;
  const effectiveCoop = ownerCoop ?? currentCoop;
  const effectiveStrat = ownerStrat ?? currentStrat;
  const effectiveNet = ownerNet ?? currentNet;
  const effectiveEng = ownerEng ?? currentEng;
  const effectiveQual = ownerQual ?? currentQual;

  // Normalized score & rank calculation using existing V5 calculator (Correction 1)
  const projected = useMemo(() => {
    return calculateRelationshipClosenessV5({
      commercial: effectiveComm,
      cooperation: effectiveCoop,
      strategic: effectiveStrat,
      network: effectiveNet,
      engagement: effectiveEng,
      qualitative: effectiveQual,
    });
  }, [effectiveComm, effectiveCoop, effectiveStrat, effectiveNet, effectiveEng, effectiveQual]);

  // Criteria row configuration
  const criteriaRows: Array<{
    key: V5CriterionKey;
    name: string;
    currentScore: number;
    ownerScore: number | null;
    effectiveScore: number;
    isChanged: boolean;
    evidenceSummary?: React.ReactNode;
  }> = useMemo(
    () => [
      {
        key: 'commercial',
        name: 'Commercial Relationship',
        currentScore: currentComm,
        ownerScore: ownerComm,
        effectiveScore: effectiveComm,
        isChanged: ownerComm !== null && ownerComm !== currentComm,
        evidenceSummary: commercialEvidence?.approvedContractCount ? (
          <span>
            <strong>Tham khảo:</strong> {commercialEvidence.approvedContractCount} hợp đồng đã duyệt
          </span>
        ) : undefined,
      },
      {
        key: 'cooperation',
        name: 'Interaction & Cooperation',
        currentScore: currentCoop,
        ownerScore: ownerCoop,
        effectiveScore: effectiveCoop,
        isChanged: ownerCoop !== null && ownerCoop !== currentCoop,
      },
      {
        key: 'strategic',
        name: 'Strategic Importance',
        currentScore: currentStrat,
        ownerScore: ownerStrat,
        effectiveScore: effectiveStrat,
        isChanged: ownerStrat !== null && ownerStrat !== currentStrat,
      },
      {
        key: 'network',
        name: 'Relationship Network',
        currentScore: currentNet,
        ownerScore: ownerNet,
        effectiveScore: effectiveNet,
        isChanged: ownerNet !== null && ownerNet !== currentNet,
      },
      {
        key: 'engagement',
        name: 'Business Engagement',
        currentScore: currentEng,
        ownerScore: ownerEng,
        effectiveScore: effectiveEng,
        isChanged: ownerEng !== null && ownerEng !== currentEng,
      },
      {
        key: 'trust',
        name: 'Trust & Reliability',
        currentScore: currentQual,
        ownerScore: ownerQual,
        effectiveScore: effectiveQual,
        isChanged: ownerQual !== null && ownerQual !== currentQual,
      },
    ],
    [
      commercialEvidence?.approvedContractCount,
      currentComm,
      currentCoop,
      currentEng,
      currentNet,
      currentQual,
      currentStrat,
      effectiveComm,
      effectiveCoop,
      effectiveEng,
      effectiveNet,
      effectiveQual,
      effectiveStrat,
      ownerComm,
      ownerCoop,
      ownerEng,
      ownerNet,
      ownerQual,
      ownerStrat,
    ]
  );

  // Check if at least one score differs from current baseline
  const isScoreChanged = criteriaRows.some((row) => row.isChanged);
  const canCompleteNow = isScoreChanged && !draft?.isStale;

  // Local dirty tracking: form has unsaved user changes if any score changed or note written
  const isFormDirty = isScoreChanged || Object.values(criterionNotes).some((n) => Boolean(n && n.trim()));

  useEffect(() => {
    onDirtyChange?.(isFormDirty);
  }, [isFormDirty, onDirtyChange]);

  // Browser reload / tab close protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  // Handle Score Change
  const handleScoreSelect = (criterion: string, score: number | null) => {
    switch (criterion) {
      case 'commercial':
        setOwnerComm(score);
        break;
      case 'cooperation':
        setOwnerCoop(score);
        break;
      case 'strategic':
        setOwnerStrat(score);
        break;
      case 'network':
        setOwnerNet(score);
        break;
      case 'engagement':
        setOwnerEng(score);
        break;
      case 'trust':
      case 'qualitative':
        setOwnerQual(score);
        break;
    }
  };

  // Handle Criterion Note Change
  const handleCriterionNoteChange = (criterionKey: string, noteVal: string) => {
    setCriterionNotes((prev) => ({
      ...prev,
      [criterionKey]: noteVal,
    }));
  };

  // Handle Complete
  const handleCompleteAdjustment = async () => {
    if (!canCompleteNow) return;
    await onComplete(getPayload());
  };

  const hasAnyOwnerNote = Object.values(criterionNotes).some((n) => Boolean(n && n.trim() !== ''));
  const canSaveOwnerDraft = isScoreChanged || hasAnyOwnerNote;

  // Handle Save Draft
  const handleSaveDraft = async () => {
    if (!onSaveDraft || !canSaveOwnerDraft) return;
    const v = latestValuesRef.current;
    const notes = latestNotesRef.current;
    await onSaveDraft({
      baseOfficialAssessmentId: sourceAssessment?.id ?? assessment.sourceAssessmentId ?? assessment.id,
      baseMajorVersion: sourceAssessment?.majorVersion ?? sourceAssessment?.versionNumber ?? assessment.versionNumber,
      baseMinorRevision: sourceAssessment?.minorRevision ?? 0,
      ownerCommercialScore: v.ownerComm,
      ownerCooperationScore: v.ownerCoop,
      ownerStrategicScore: v.ownerStrat,
      ownerRelationshipNetworkScore: v.ownerNet,
      ownerEngagementScore: v.ownerEng,
      ownerQualitativeScore: v.ownerQual,
      ownerCommercialNote: (notes['commercial'] ?? '').trim() || null,
      ownerCooperationNote: (notes['cooperation'] ?? '').trim() || null,
      ownerStrategicNote: (notes['strategic'] ?? '').trim() || null,
      ownerRelationshipNetworkNote: (notes['network'] ?? '').trim() || null,
      ownerEngagementNote: (notes['engagement'] ?? '').trim() || null,
      ownerQualitativeNote: (notes['trust'] ?? '').trim() || null,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Stale Draft Conflict Banner */}
      {draft?.isStale && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            padding: '12px 18px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0 }} />
            <span style={{ fontSize: '0.88rem', color: '#92400e' }}>
              Bản đánh giá chính thức đã được cập nhật lên <strong>{draft.latestOfficialFormattedVersion || 'phiên bản mới'}</strong>. Bản nháp điều chỉnh này đã cũ.
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {onRebaseDraft && (
              <button
                type="button"
                className={styles.btnPrimary}
                style={{ padding: '6px 14px', fontSize: '0.82rem', background: '#d97706', borderColor: '#b45309' }}
                onClick={onRebaseDraft}
                disabled={isSaving || isSubmitting}
              >
                Cập nhật bản nháp theo {draft.latestOfficialFormattedVersion}
              </button>
            )}
            {onDeleteDraft && (
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: '6px 14px', fontSize: '0.82rem', color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={onDeleteDraft}
                disabled={isSaving || isSubmitting}
              >
                Hủy bản nháp
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. SCORING TABLE */}
      <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.comparisonTable} style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th
                  style={{
                    width: '30%',
                    textAlign: 'left',
                    padding: '12px 18px',
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: '0.84rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Tiêu chí
                </th>
                <th
                  style={{
                    width: '18%',
                    textAlign: 'center',
                    padding: '12px 14px',
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: '0.84rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Điểm hiện tại
                </th>
                <th
                  style={{
                    width: '22%',
                    textAlign: 'center',
                    padding: '12px 14px',
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: '0.84rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Điểm điều chỉnh
                </th>
                <th
                  style={{
                    width: '30%',
                    textAlign: 'left',
                    padding: '12px 18px',
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: '0.84rem',
                    textTransform: 'uppercase',
                  }}
                >
                  Ghi chú (Tùy chọn)
                </th>
              </tr>
            </thead>
            <tbody>
              {criteriaRows.map((row) => {
                const rowNote = criterionNotes[row.key] ?? '';

                return (
                  <tr
                    key={row.key}
                    style={{
                      background: '#ffffff',
                      transition: 'background 0.15s ease',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    {/* Column 1: Tiêu chí with ⓘ guidance popover */}
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{row.name}</strong>
                        <CriterionGuidancePopover
                          criterionKey={row.key}
                          contractEvidenceSummary={row.evidenceSummary}
                        />
                      </div>
                    </td>

                    {/* Column 2: Điểm hiện tại */}
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: '#475569',
                        }}
                      >
                        {row.currentScore} / 5
                      </span>
                    </td>

                    {/* Column 3: Điểm điều chỉnh */}
                    <td style={{ textAlign: 'center', padding: '10px 14px', verticalAlign: 'middle' }}>
                      <RelationshipScoreSelect
                        id={`owner-score-${row.key}`}
                        value={row.ownerScore}
                        onChange={(val) => handleScoreSelect(row.key, val)}
                        disabled={isSubmitting || isSaving}
                      />
                    </td>

                    {/* Column 4: Ghi chú theo tiêu chí (Tùy chọn) */}
                    <td style={{ padding: '10px 18px', verticalAlign: 'middle' }}>
                      <input
                        id={`criterion-note-${row.key}`}
                        type="text"
                        className={styles.input}
                        style={{
                          fontSize: '0.84rem',
                          padding: '7px 12px',
                          width: '100%',
                          boxSizing: 'border-box',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        placeholder="Ghi chú thêm nếu cần..."
                        value={rowNote}
                        onChange={(e) => handleCriterionNoteChange(row.key, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. SIMPLE ACTION FOOTER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '14px 20px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        {/* Left: Expected Score */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.88rem', color: '#0f172a' }}>
            Điểm dự kiến: <strong>{projected.normalizedScore}/100</strong> · Rank{' '}
            <strong style={{ color: projected.rankMeta.color }}>{projected.rank}</strong>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {!isScoreChanged && (
            <span style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>
              Chưa có thay đổi so với bản đánh giá hiện tại.
            </span>
          )}

          <button
            type="button"
            onClick={onBack}
            disabled={isSubmitting || isSaving}
            style={{
              padding: '8px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
              color: '#64748b',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = '#fca5a5';
              e.currentTarget.style.background = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            Hủy điều chỉnh
          </button>

          {onSaveDraft && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handleSaveDraft}
              disabled={isSubmitting || isSaving || !canSaveOwnerDraft || Boolean(draft?.isStale)}
              title={
                !canSaveOwnerDraft
                  ? 'Vui lòng điều chỉnh ít nhất 1 điểm tiêu chí hoặc nhập 1 ghi chú trước khi lưu nháp'
                  : 'Lưu bản nháp riêng'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 16px',
                fontSize: '0.88rem',
                fontWeight: 600,
                opacity: !canSaveOwnerDraft ? 0.6 : 1,
                cursor: !canSaveOwnerDraft ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="spinIcon" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Lưu bản nháp</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleCompleteAdjustment}
            disabled={!canCompleteNow || isSubmitting || isSaving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 20px',
              fontSize: '0.9rem',
              fontWeight: 600,
              background: !canCompleteNow ? '#94a3b8' : '#2563eb',
              borderColor: !canCompleteNow ? '#94a3b8' : '#1d4ed8',
              cursor: !canCompleteNow ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isSubmitting ? (
              <Loader2 size={16} className="spinIcon" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            <span>Hoàn tất điều chỉnh</span>
          </button>
        </div>
      </div>
    </div>
  );
};
