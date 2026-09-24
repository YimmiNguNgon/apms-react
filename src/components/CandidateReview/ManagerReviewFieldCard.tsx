import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Check, AlertTriangle, Loader2, ChevronDown, ChevronUp, RotateCcw, XCircle } from 'lucide-react';
import type { CandidateFieldEvidence } from '../../types/domain';
import { isCandidateFieldEdited, normalizeCandidateFieldValue } from './candidateFieldDefinitions';
import { useIndustryCatalog } from '../../API/industryApi';
import { EvidenceSection } from './EvidenceSection';
import styles from './CandidateReview.module.css';
import modalStyles from './ManagerReviewFieldCard.module.css';

interface ManagerReviewFieldCardProps {
  label: string;
  fieldKey: string;
  fieldResult: any;
  currentRevisionNumber?: number;
  onDecision: (decision: 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING', comment?: string) => Promise<void>;
  disabled?: boolean;
  highlighted?: boolean;
  evidenceItems?: CandidateFieldEvidence[];
  isManual?: boolean;
  defaultFileName?: string;
}

/* ── helpers ── */

const isEmpty = (val: any): boolean => normalizeCandidateFieldValue(val) === null;

const getEffectiveReviewedValue = (field: any): any => {
  if (!field) return undefined;
  if (field.reviewedValue !== undefined) return field.reviewedValue;
  if (field.staffReviewedValue !== undefined) return field.staffReviewedValue;
  return field.value;
};

const stableStringify = (value: any): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
};

const deepEqual = (a: any, b: any): boolean => stableStringify(a) === stableStringify(b);

const normalizeManagerStatus = (status: unknown): 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' => {
  const value = String(status || 'PENDING').toUpperCase();
  if (value === 'ACCEPTED' || value === 'APPROVED') return 'ACCEPTED';
  if (value === 'REJECTED') return 'REJECTED';
  if (value === 'CHANGES_REQUESTED' || value === 'NEEDS_REVIEW' || value === 'REVISION_REQUIRED') return 'CHANGES_REQUESTED';
  return 'PENDING';
};

const humanizeKey = (key: string) => {
  const result = key.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const mapManagerStatus = (rawStatus: unknown): { text: string } => {
  const s = normalizeManagerStatus(rawStatus);
  switch (s) {
    case 'ACCEPTED':          return { text: 'Approved' };
    case 'REJECTED':          return { text: 'Changes Requested' };
    case 'CHANGES_REQUESTED': return { text: 'Changes Requested' };
    default:                  return { text: 'Manager Pending' };
  }
};

/* ── Product List with Collapse (matching Staff EditableProductList) ── */
const ProductListDisplay: React.FC<{ products: any[] }> = ({ products }) => {
  const [showAll, setShowAll] = useState(false);
  const initialShowCount = 3;
  if (!products || products.length === 0) return <span className={styles.emptyValue}>N/A</span>;
  return (
    <div className={styles.productDisplayList}>
      {(showAll ? products : products.slice(0, initialShowCount)).map((p, idx) => (
        <div key={idx} className={styles.productPill}>
          <strong>{typeof p === 'object' ? (p.name || JSON.stringify(p)) : String(p)}</strong>
        </div>
      ))}
      {products.length > initialShowCount && (
        <button
          type="button"
          className={styles.btnShowMore}
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? (
            <>Show less <ChevronUp size={14} /></>
          ) : (
            <>Show {products.length - initialShowCount} more <ChevronDown size={14} /></>
          )}
        </button>
      )}
    </div>
  );
};

/* ── Value renderer matching Staff field rendering exactly ── */
const renderValue = (
  fieldKey: string,
  val: any,
  isManual?: boolean,
  isCatalogIndustry?: (name: string) => boolean
): React.ReactNode => {
  if (isEmpty(val)) return <span className={styles.emptyValue}>{isManual ? 'Not provided' : 'N/A'}</span>;
  if (typeof val === 'boolean') return <span>{val ? 'Yes' : 'No'}</span>;

  // Products & Services
  if (fieldKey === 'business.products') {
    const arr = Array.isArray(val) ? val : [val];
    return <ProductListDisplay products={arr} />;
  }

  // Addresses (rendered as chips in tagList, matching Staff)
  if (fieldKey === 'contact.addresses' || fieldKey === 'contact.address') {
    const arr = Array.isArray(val) ? val : [val];
    return (
      <div className={styles.tagList}>
        {arr.map((item, i) => {
          const str = typeof item === 'object' ? (item.fullAddress || item.address || JSON.stringify(item)) : String(item);
          return (
            <span key={i} className={styles.chip}>
              {str}
            </span>
          );
        })}
      </div>
    );
  }

  // Industries (rendered as chips in tagList with NEW catalog tags, matching Staff)
  if (fieldKey === 'business.industries') {
    const arr = Array.isArray(val) ? val : [val];
    return (
      <div className={styles.tagList}>
        {arr.map((item, i) => {
          const str = typeof item === 'object' ? (item.name || item.text || JSON.stringify(item)) : String(item);
          const isCatalog = isCatalogIndustry ? isCatalogIndustry(str) : true;
          return (
            <span
              key={i}
              className={styles.chip}
              style={
                !isCatalog
                  ? {
                      backgroundColor: '#fffbeb',
                      borderColor: '#f59e0b',
                      color: '#92400e',
                    }
                  : undefined
              }
            >
              <span>{str}</span>
              {!isCatalog && (
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    borderRadius: '4px',
                    padding: '1px 4px',
                    marginLeft: '4px',
                    letterSpacing: '0.5px',
                  }}
                  title="Proposed industry (not in global catalog yet)"
                >
                  NEW
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  // General list / chips (emails, phones, markets, target customers)
  if (Array.isArray(val)) {
    return (
      <div className={styles.tagList}>
        {val.map((item, i) => {
          const str = typeof item === 'object' ? (item.name || item.text || JSON.stringify(item)) : String(item);
          return (
            <span key={i} className={styles.chip}>
              {str}
            </span>
          );
        })}
      </div>
    );
  }

  // Structured object fallback
  if (typeof val === 'object') {
    return (
      <div className={modalStyles.structuredGrid}>
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className={modalStyles.metricBox}>
            <span className={modalStyles.metricLabel}>{humanizeKey(k)}</span>
            <span className={modalStyles.metricValue}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
          </div>
        ))}
      </div>
    );
  }

  if (typeof val === 'number') {
    return <span>{val}</span>;
  }

  return <span>{String(val)}</span>;
};

/* ── ManagerReviewFieldCard Component ── */

export const ManagerReviewFieldCard: React.FC<ManagerReviewFieldCardProps> = ({
  label,
  fieldKey,
  fieldResult,
  currentRevisionNumber = 1,
  onDecision,
  disabled,
  highlighted,
  evidenceItems,
  isManual = false,
  defaultFileName,
}) => {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'REJECTED' | 'CHANGES_REQUESTED' | null>(null);
  const [comment, setComment] = useState('');
  const [expandedEvidence, setExpandedEvidence] = useState(false);
  const [mutatingAction, setMutatingAction] = useState<'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING' | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { isCatalogIndustry } = useIndustryCatalog();

  const currentRound = currentRevisionNumber ?? 1;
  const currentDecision = fieldResult?.currentDecision;
  const status = normalizeManagerStatus(currentDecision?.status ?? fieldResult?.managerReviewStatus);
  const originalValue = fieldResult?.value;
  const staffValue = getEffectiveReviewedValue(fieldResult);
  const isChanged = isCandidateFieldEdited(originalValue, staffValue);
  const rawStaffStatus = fieldResult?.staffReviewStatus || 'PENDING';
  const effectiveStaffStatus = isChanged
    ? (isEmpty(originalValue) && !isEmpty(staffValue) ? 'ADDED' : (!isEmpty(originalValue) && isEmpty(staffValue) ? 'REMOVED' : 'EDITED'))
    : (rawStaffStatus === 'EDITED' || rawStaffStatus === 'ADDED' || rawStaffStatus === 'REMOVED' ? 'CONFIRMED' : rawStaffStatus);
  const isAdded = effectiveStaffStatus === 'ADDED';
  const isRemoved = effectiveStaffStatus === 'REMOVED';

  const confidence = fieldResult?.confidence ?? 0;
  let confidenceClass = styles.confHigh;
  let confidenceLabel = 'High';
  if (confidence < 0.6) {
    confidenceClass = styles.confLow;
    confidenceLabel = 'Low';
  } else if (confidence < 0.85) {
    confidenceClass = styles.confMedium;
    confidenceLabel = 'Med';
  }
  if (confidence === 0) {
    confidenceClass = styles.confNone;
    confidenceLabel = 'N/A';
  }

  const isAccepted = status === 'ACCEPTED';
  const isRejected = status === 'REJECTED';
  const isNeedsReview = status === 'CHANGES_REQUESTED';
  const isPending = status === 'PENDING';
  const hasDecision = isAccepted || isRejected || isNeedsReview;

  // Decision belongs to current round if roundNumber matches currentRound
  const isCurrentRoundDecision =
    hasDecision &&
    (currentDecision?.roundNumber == null || currentDecision.roundNumber === currentRound) &&
    (fieldResult?.reviewedRevision == null || fieldResult.reviewedRevision === currentRound);

  const managerComment = currentDecision?.comment ?? fieldResult?.managerReviewComment;

  // Canonical previous review resolution: strictly earlier rounds (< currentRound)
  const previousDecision = (() => {
    if (currentRound <= 1) return null;

    let prevSubmitted = fieldResult?.previousSubmittedValue
      ?? (fieldResult?.previousDecision?.submittedValue !== undefined ? fieldResult?.previousDecision?.submittedValue : undefined);

    // Safeguard: if previous submitted value matches current staffValue, but original AI value is different,
    // recover the true initial submitted value (Round 1)
    if (
      (prevSubmitted === undefined || deepEqual(prevSubmitted, staffValue)) &&
      originalValue !== undefined &&
      !deepEqual(originalValue, staffValue)
    ) {
      prevSubmitted = originalValue;
    }

    if (fieldResult?.previousDecision && fieldResult.previousDecision.roundNumber < currentRound) {
      const prevNorm = normalizeManagerStatus(fieldResult.previousDecision.status);
      if (prevNorm !== 'PENDING') {
        return {
          ...fieldResult.previousDecision,
          status: prevNorm,
          submittedValue: prevSubmitted !== undefined ? prevSubmitted : fieldResult.previousDecision.submittedValue,
        };
      }
    }

    const rawPrev = fieldResult?.previousManagerReviewStatus;
    if (!rawPrev) return null;
    const norm = normalizeManagerStatus(rawPrev);
    if (norm === 'PENDING') return null;

    const prevRev = fieldResult?.previousReviewedRevision ?? (currentRound - 1);
    if (prevRev >= currentRound) return null;

    return {
      roundNumber: prevRev,
      status: norm,
      comment: fieldResult?.previousManagerReviewComment || null,
      submittedValue: prevSubmitted,
      reviewedAt: (fieldResult as any)?.previousManagerReviewedAt || null,
      reviewedByUserId: (fieldResult as any)?.previousManagerReviewedByUserId || null,
    };
  })();

  const handleApprove = useCallback(async () => {
    if (mutatingAction || disabled) return;
    setMutatingAction('ACCEPTED');
    setMutationError(null);
    try {
      await onDecision('ACCEPTED');
    } catch (err: any) {
      setMutationError(err?.message || 'Unable to approve field. Please try again.');
    } finally {
      setMutatingAction(null);
    }
  }, [onDecision, mutatingAction, disabled]);

  const handleUndo = useCallback(async () => {
    if (mutatingAction || disabled) return;
    setMutatingAction('PENDING');
    setMutationError(null);
    try {
      await onDecision('PENDING');
    } catch (err: any) {
      setMutationError(err?.message || 'Unable to undo decision. Please try again.');
    } finally {
      setMutatingAction(null);
    }
  }, [onDecision, mutatingAction, disabled]);

  const openRequestChangesModal = useCallback(() => {
    setPendingDecision('CHANGES_REQUESTED');
    setComment(managerComment || '');
    setMutationError(null);
    setIsCommentModalOpen(true);
  }, [managerComment]);

  const submitCommentDecision = useCallback(async () => {
    if (!comment.trim() || !pendingDecision || mutatingAction) return;
    setMutatingAction(pendingDecision);
    setMutationError(null);
    try {
      await onDecision(pendingDecision, comment.trim());
      setIsCommentModalOpen(false);
      setComment('');
      setPendingDecision(null);
    } catch (err: any) {
      setMutationError(err?.message || `Unable to ${pendingDecision === 'CHANGES_REQUESTED' ? 'request changes for' : 'reject'} this field.`);
    } finally {
      setMutatingAction(null);
    }
  }, [comment, pendingDecision, onDecision, mutatingAction]);

  const cancelModal = useCallback(() => {
    if (mutatingAction) return;
    setIsCommentModalOpen(false);
    setPendingDecision(null);
    setMutationError(null);
  }, [mutatingAction]);

  const isFieldMutating = mutatingAction !== null;

  // Card CSS class matching Staff EditableFieldCard
  const cardClass = [
    styles.fieldRow,
    highlighted ? styles.fieldRowDirty : '',
    confidence > 0 && confidence < 0.6 ? styles.fieldRowLowConfidence : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      {/* Header Row (Label on left, Status & Confidence badges on right, matching Staff) */}
      <div className={styles.fieldRowHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <div className={styles.fieldBadges}>
          {isAccepted && (
            <span className={`${styles.reviewBadge} ${styles.reviewConfirmed}`}>
              <Check size={12} /> Approved
            </span>
          )}
          {(isNeedsReview || isRejected) && (
            <span className={`${styles.reviewBadge} ${styles.reviewReturned}`}>
              <AlertTriangle size={12} /> Changes Requested
            </span>
          )}
          {!isManual && confidence > 0 && (
            <span className={`${styles.confidenceBadge} ${confidenceClass}`}>
              {(confidence * 100).toFixed(0)}% &middot; {confidenceLabel}
            </span>
          )}
        </div>
      </div>

      {/* Field Body */}
      <div className={styles.fieldBody}>
        {/* Value Display / Diff */}
        <div className={styles.fieldValue}>
          {!isManual && isChanged ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>AI Original</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{renderValue(fieldKey, originalValue, isManual, isCatalogIndustry)}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase', marginBottom: '4px' }}>Staff Submitted</div>
                <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>{renderValue(fieldKey, staffValue, isManual, isCatalogIndustry)}</div>
              </div>
            </div>
          ) : (
            renderValue(fieldKey, staffValue ?? originalValue, isManual, isCatalogIndustry)
          )}
        </div>

        {/* Evidence Section - Reusing EvidenceSection component exactly like Staff */}
        {!isManual && (
          <div style={{ marginTop: '10px' }}>
            <EvidenceSection
              evidenceText={fieldResult?.evidenceText}
              evidenceItems={fieldResult?.evidence || (evidenceItems?.length ? evidenceItems : undefined)}
              pageNumber={fieldResult?.pageNumber}
              expanded={expandedEvidence}
              onToggle={() => setExpandedEvidence(prev => !prev)}
              defaultFileName={defaultFileName}
            />
          </div>
        )}

        {/* Manager Comment (post-decision in current round) */}
        {isCurrentRoundDecision && managerComment && (
          <div className={styles.managerFeedbackInline}>
            <div>
              <span>Manager feedback</span>
              <strong>&ldquo;{managerComment}&rdquo;</strong>
            </div>
          </div>
        )}

        {/* Previous review history (Round 2+) */}
        {previousDecision && (
          <div className={styles.managerFeedbackInline} style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
            <div>
              <span style={{ color: '#475569' }}>
                Previous review — Round {previousDecision.roundNumber} ({mapManagerStatus(previousDecision.status).text})
              </span>
              {previousDecision.comment && (
                <strong style={{ color: '#1e293b' }}>&ldquo;{previousDecision.comment}&rdquo;</strong>
              )}
              {previousDecision.submittedValue !== undefined && (
                <div style={{ marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                  <span>Previous submitted value: </span>
                  {renderValue(fieldKey, previousDecision.submittedValue, isManual, isCatalogIndustry)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mutation Error */}
        {mutationError && !isCommentModalOpen && (
          <div className={modalStyles.errorBanner} style={{ marginTop: '8px' }}>
            <XCircle size={14} /> {mutationError}
          </div>
        )}

        {/* Card Footer / Action Bar (matching Staff fieldFooter layout) */}
        <div className={styles.fieldFooter} style={{ marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
          <div className={styles.fieldFooterLeft}>
            {isChanged ? (
              <span className={`${styles.reviewBadge} ${styles.reviewEdited}`}>
                {isAdded ? 'Added by Staff' : isRemoved ? 'Removed by Staff' : 'Edited by Staff'}
              </span>
            ) : isManual ? (
              <span style={{ color: '#64748b', fontSize: '12px' }}>Entered manually</span>
            ) : null}
          </div>

          <div className={styles.fieldFooterRight}>
            {/* Pending actions: Approve & Request Changes */}
            {!disabled && isPending && (
              <>
                <button
                  type="button"
                  className={styles.btnCompact}
                  style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 600 }}
                  onClick={openRequestChangesModal}
                  disabled={disabled || isFieldMutating}
                >
                  <AlertTriangle size={14} /> Request Changes
                </button>
                <button
                  type="button"
                  className={`${styles.btnCompact} ${styles.btnConfirm}`}
                  style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600 }}
                  onClick={handleApprove}
                  disabled={disabled || isFieldMutating}
                >
                  {mutatingAction === 'ACCEPTED' ? (
                    <><Loader2 size={14} className={modalStyles.spin} /> Approving&hellip;</>
                  ) : (
                    <><Check size={14} /> Approve</>
                  )}
                </button>
              </>
            )}

            {/* Resolved state & Undo action */}
            {hasDecision && (
              <>
                {isAccepted ? (
                  <span className={styles.reviewConfirmed} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600 }}>
                    <Check size={14} /> Approved
                  </span>
                ) : (
                  <span className={styles.reviewReturned} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontWeight: 600 }}>
                    <AlertTriangle size={14} /> Changes Requested
                  </span>
                )}

                {!disabled && isCurrentRoundDecision && (
                  <button
                    type="button"
                    className={styles.btnCompact}
                    style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600, marginLeft: '6px' }}
                    onClick={handleUndo}
                    disabled={disabled || isFieldMutating}
                    title="Reset field decision to pending"
                  >
                    {mutatingAction === 'PENDING' ? (
                      <><Loader2 size={12} className={modalStyles.spin} /> Undoing&hellip;</>
                    ) : (
                      <><RotateCcw size={12} /> Undo</>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal for Request Changes (Portal to body) */}
      {isCommentModalOpen && ReactDOM.createPortal(
        <div className={modalStyles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !mutatingAction) cancelModal(); }}>
          <div className={modalStyles.modalContent}>
            <h3>Request Changes</h3>
            <div className={modalStyles.modalFieldName}>{label}</div>
            <p>
              Why are changes being requested for this field?
              <span className={modalStyles.required}> *</span>
            </p>
            <textarea
              className={modalStyles.commentInput}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what needs to be changed or provided for this field…"
              autoFocus
            />
            <div className={modalStyles.modalHelper}>
              Your feedback will be shown to the Staff during revision.
            </div>
            {mutationError && (
              <div className={modalStyles.errorBanner} style={{ marginBottom: 12 }}>
                <XCircle size={14} /> {mutationError}
              </div>
            )}
            <div className={modalStyles.modalActions}>
              <button type="button" className={modalStyles.btnCancel} onClick={cancelModal} disabled={isFieldMutating}>Cancel</button>
              <button
                type="button"
                className={modalStyles.btnSubmit}
                onClick={submitCommentDecision}
                disabled={isFieldMutating || !comment.trim()}
              >
                {mutatingAction ? (
                  <><Loader2 size={14} className={modalStyles.spin} /> Submitting&hellip;</>
                ) : (
                  'Request Changes'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
