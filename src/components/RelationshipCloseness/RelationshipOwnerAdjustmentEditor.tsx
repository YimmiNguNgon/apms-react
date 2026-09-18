import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import type {
  RelationshipAssessmentResponse,
  CommercialEvidence,
  OwnerAdjustmentUpdateRequest,
} from '../../types/relationshipAssessment';
import { CriterionGuidancePopover } from './CriterionGuidancePopover';
import { getRankMeta, type V5CriterionKey } from './scoringGuidanceConfig';
import styles from './RelationshipCloseness.module.css';

interface RelationshipOwnerAdjustmentEditorProps {
  assessment: RelationshipAssessmentResponse;
  sourceAssessment?: RelationshipAssessmentResponse | null;
  commercialEvidence?: CommercialEvidence | null;
  onSave: (data: OwnerAdjustmentUpdateRequest) => Promise<void>;
  onComplete: (data: OwnerAdjustmentUpdateRequest) => Promise<void>;
  onCancelAdjustment: () => Promise<void>;
  onBack: () => void;
  isSaving?: boolean;
  isSubmitting?: boolean;
  onFlushPendingSaveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
}

const SCORE_OPTIONS = [5, 4, 3, 2, 1, 0];

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
  onSave,
  onComplete,
  onCancelAdjustment,
  onBack,
  isSaving = false,
  isSubmitting = false,
  onFlushPendingSaveRef,
}) => {
  // Baseline current finalized scores from source assessment or snapshot in draft
  const currentComm = assessment.commercialAwardedScore ?? sourceAssessment?.commercialAwardedScore ?? sourceAssessment?.commercialScore ?? 0;
  const currentCoop = assessment.cooperationScore ?? sourceAssessment?.cooperationScore ?? 0;
  const currentStrat = assessment.strategicScore ?? sourceAssessment?.strategicScore ?? 0;
  const currentNet = assessment.relationshipNetworkScore ?? sourceAssessment?.relationshipNetworkScore ?? 0;
  const currentEng = assessment.engagementScore ?? sourceAssessment?.engagementScore ?? 0;
  const currentQual = assessment.qualitativeScore ?? assessment.trustScore ?? sourceAssessment?.qualitativeScore ?? sourceAssessment?.trustScore ?? 0;

  // Owner adjusted values state
  const [ownerComm, setOwnerComm] = useState<number>(
    assessment.ownerCommercialScore !== null && assessment.ownerCommercialScore !== undefined
      ? assessment.ownerCommercialScore
      : currentComm
  );
  const [ownerCoop, setOwnerCoop] = useState<number>(
    assessment.ownerCooperationScore !== null && assessment.ownerCooperationScore !== undefined
      ? assessment.ownerCooperationScore
      : currentCoop
  );
  const [ownerStrat, setOwnerStrat] = useState<number>(
    assessment.ownerStrategicScore !== null && assessment.ownerStrategicScore !== undefined
      ? assessment.ownerStrategicScore
      : currentStrat
  );
  const [ownerNet, setOwnerNet] = useState<number>(
    assessment.ownerRelationshipNetworkScore !== null && assessment.ownerRelationshipNetworkScore !== undefined
      ? assessment.ownerRelationshipNetworkScore
      : currentNet
  );
  const [ownerEng, setOwnerEng] = useState<number>(
    assessment.ownerEngagementScore !== null && assessment.ownerEngagementScore !== undefined
      ? assessment.ownerEngagementScore
      : currentEng
  );
  const [ownerQual, setOwnerQual] = useState<number>(
    assessment.ownerQualitativeScore !== null && assessment.ownerQualitativeScore !== undefined
      ? assessment.ownerQualitativeScore
      : currentQual
  );

  // Per-criterion notes (sole explanation mechanism)
  const [criterionNotes, setCriterionNotes] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (assessment.ownerRelationshipNetworkNote) {
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

  // Cancel confirmation modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Auto-save state
  const [autoSaveStatus, setAutoSaveStatus] = useState<'SAVED' | 'SAVING' | 'DIRTY' | 'ERROR'>('SAVED');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    return assessment.updatedAt ? new Date(assessment.updatedAt) : new Date();
  });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const getPayload = useCallback((): OwnerAdjustmentUpdateRequest => {
    const v = latestValuesRef.current;
    const notes = latestNotesRef.current;

    // Serialize non-network criterion notes into ownerNote JSON for persistence
    const otherNotes: Record<string, string> = {};
    for (const [k, text] of Object.entries(notes)) {
      if (k !== 'network' && text && text.trim()) {
        otherNotes[k] = text.trim();
      }
    }
    const serializedNotes = Object.keys(otherNotes).length > 0 ? JSON.stringify(otherNotes) : undefined;

    // Synthesize combined adjustment reason from filled criteria notes
    const criteriaInfo: Array<{ key: string; name: string }> = [
      { key: 'commercial', name: 'Commercial Relationship' },
      { key: 'cooperation', name: 'Interaction & Cooperation' },
      { key: 'strategic', name: 'Strategic Importance' },
      { key: 'network', name: 'Relationship Network' },
      { key: 'engagement', name: 'Business Engagement' },
      { key: 'trust', name: 'Trust & Reliability' },
    ];

    const noteReasons: string[] = [];
    for (const c of criteriaInfo) {
      const noteText = (notes[c.key] ?? '').trim();
      if (noteText) {
        noteReasons.push(`${c.name}: ${noteText}`);
      }
    }

    return {
      ownerCommercialScore: v.ownerComm,
      ownerCooperationScore: v.ownerCoop,
      ownerStrategicScore: v.ownerStrat,
      ownerRelationshipNetworkScore: v.ownerNet,
      ownerRelationshipNetworkNote: (notes['network'] ?? '').trim() || undefined,
      ownerEngagementScore: v.ownerEng,
      ownerQualitativeScore: v.ownerQual,
      ownerAdjustmentReason: noteReasons.length > 0 ? noteReasons.join('\n') : undefined,
      ownerNote: serializedNotes,
    };
  }, []);

  const triggerSave = useCallback(async () => {
    try {
      setAutoSaveStatus('SAVING');
      await onSave(getPayload());
      setAutoSaveStatus('SAVED');
      setLastSavedAt(new Date());
    } catch {
      setAutoSaveStatus('ERROR');
    }
  }, [onSave, getPayload]);

  const scheduleAutoSave = useCallback((delay = 600) => {
    setAutoSaveStatus('DIRTY');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      triggerSave();
    }, delay);
  }, [triggerSave]);

  // Expose flush pending save for safe navigation back
  const flushPendingSave = useCallback(async (): Promise<boolean> => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    try {
      await triggerSave();
      return true;
    } catch {
      return false;
    }
  }, [triggerSave]);

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

  // Derived calculation
  const totalAdjustedRaw = ownerComm + ownerCoop + ownerStrat + ownerNet + ownerEng + ownerQual;
  const totalAdjustedScore = Math.min(100, Math.round((totalAdjustedRaw / 30.0) * 100));
  const adjustedRank =
    totalAdjustedScore >= 90 ? 'A' : totalAdjustedScore >= 60 ? 'B' : totalAdjustedScore >= 30 ? 'C' : 'D';
  const rankMeta = getRankMeta(adjustedRank);

  // Criteria row configuration
  const criteriaRows: Array<{
    key: V5CriterionKey;
    name: string;
    currentScore: number;
    ownerScore: number;
    isChanged: boolean;
    evidenceSummary?: React.ReactNode;
  }> = useMemo(
    () => [
      {
        key: 'commercial',
        name: 'Commercial Relationship',
        currentScore: currentComm,
        ownerScore: ownerComm,
        isChanged: ownerComm !== currentComm,
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
        isChanged: ownerCoop !== currentCoop,
      },
      {
        key: 'strategic',
        name: 'Strategic Importance',
        currentScore: currentStrat,
        ownerScore: ownerStrat,
        isChanged: ownerStrat !== currentStrat,
      },
      {
        key: 'network',
        name: 'Relationship Network',
        currentScore: currentNet,
        ownerScore: ownerNet,
        isChanged: ownerNet !== currentNet,
      },
      {
        key: 'engagement',
        name: 'Business Engagement',
        currentScore: currentEng,
        ownerScore: ownerEng,
        isChanged: ownerEng !== currentEng,
      },
      {
        key: 'trust',
        name: 'Trust & Reliability',
        currentScore: currentQual,
        ownerScore: ownerQual,
        isChanged: ownerQual !== currentQual,
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
  const canCompleteNow = isScoreChanged;

  // Handle Score Change
  const handleScoreSelect = (criterion: string, score: number) => {
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
    scheduleAutoSave(400);
  };

  // Handle Criterion Note Change
  const handleCriterionNoteChange = (criterionKey: string, noteVal: string) => {
    setCriterionNotes((prev) => ({
      ...prev,
      [criterionKey]: noteVal,
    }));
    scheduleAutoSave(700);
  };

  // Handle Complete
  const handleCompleteAdjustment = async () => {
    if (!isScoreChanged) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    await onComplete(getPayload());
  };

  // Handle Cancel Confirmation
  const handleConfirmCancel = async () => {
    try {
      setIsCancelling(true);
      await onCancelAdjustment();
      setIsCancelModalOpen(false);
      onBack();
    } catch {
      // Error handled by parent or notification
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
                const isRowChanged = row.isChanged;
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

                    {/* Column 3: Điểm điều chỉnh (Dropdown with subtle amber highlight) */}
                    <td style={{ textAlign: 'center', padding: '10px 14px', verticalAlign: 'middle' }}>
                      <select
                        value={row.ownerScore}
                        onChange={(e) => handleScoreSelect(row.key, Number(e.target.value))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: isRowChanged ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
                          background: isRowChanged ? '#fffbeb' : '#ffffff',
                          color: isRowChanged ? '#92400e' : '#0f172a',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          outline: 'none',
                          minWidth: 88,
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {SCORE_OPTIONS.map((val) => (
                          <option key={val} value={val}>
                            {val} / 5
                          </option>
                        ))}
                      </select>
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
            Điểm dự kiến: <strong>{totalAdjustedScore}/100</strong> · Rank{' '}
            <strong style={{ color: rankMeta.color }}>{adjustedRank}</strong>
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
            onClick={() => setIsCancelModalOpen(true)}
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

      {/* 3. CANCEL CONFIRMATION MODAL */}
      {isCancelModalOpen && (
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
              maxWidth: 460,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                Hủy bản điều chỉnh V{assessment.versionNumber}?
              </h3>
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
              Các thay đổi chưa hoàn tất sẽ bị hủy. Bản đánh giá chính thức trước đó vẫn được giữ nguyên.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
              >
                Không, quay lại
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {isCancelling ? <Loader2 size={16} className="spinIcon" /> : <Trash2 size={16} />}
                <span>Xác nhận hủy</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
