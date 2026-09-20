import React, { useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Check, X, MessageSquareWarning, CheckCircle, XCircle, AlertTriangle, Clock, Loader2, FileText, ChevronDown, ChevronUp, ExternalLink, RotateCcw } from 'lucide-react';
import type { CandidateFieldEvidence } from '../../types/domain';
import { isCandidateFieldEdited, normalizeCandidateFieldValue } from './candidateFieldDefinitions';
import styles from './ManagerReviewFieldCard.module.css';

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
}

type EvidenceItem = CandidateFieldEvidence & Record<string, unknown>;

/* ── helpers ── */

const isEmpty = (val: any): boolean => normalizeCandidateFieldValue(val) === null;

const hasReviewedValue = (field: any): boolean =>
  field?.reviewedValue !== undefined || field?.staffReviewedValue !== undefined;

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

const formatNumber = (val: number, key: string, currency?: string) => {
  const k = key.toLowerCase();
  if (k.includes('percent') || k.includes('rate') || k.includes('margin') || k.includes('growth') || k.includes('ratio')) {
    // If backend sends ratio like 0.1133 -> 11.33%
    const perc = val <= 1 && val > -1 && !k.includes('percent') ? val * 100 : val;
    return `${perc.toFixed(Math.abs(perc % 1) > 0 ? 1 : 0)}%`;
  }
  
  if (val >= 1000000000000) return `${currency ? currency + ' ' : ''}${(val / 1000000000000).toFixed(1)}T`;
  if (val >= 1000000000) return `${currency ? currency + ' ' : ''}${(val / 1000000000).toFixed(1)}B`;
  if (val >= 1000000) return `${currency ? currency + ' ' : ''}${(val / 1000000).toFixed(1)}M`;
  
  return `${currency ? currency + ' ' : ''}${val.toLocaleString()}`;
};

const StructuredRenderer: React.FC<{ data: any; type: string }> = ({ data, type }) => {
  if (!data || typeof data !== 'object') return <div>{String(data)}</div>;
  
  const renderItem = (k: string, v: any) => {
    if (isEmpty(v)) return null;
    
    if (Array.isArray(v)) {
      const isStringArray = typeof v[0] === 'string';
      if (isStringArray) {
        return (
          <div key={k} className={styles.metricBox}>
            <span className={styles.metricLabel}>{humanizeKey(k)}</span>
            <div className={styles.chipList}>
              {v.map((item, i) => <span key={i} className={styles.chip}>{item}</span>)}
            </div>
          </div>
        );
      }
      return (
        <div key={k} className={styles.metricBox}>
          <span className={styles.metricLabel}>{humanizeKey(k)}</span>
          <ul className={styles.bulletList}>
            {v.map((item, i) => <li key={i}>{typeof item === 'object' ? item.name || JSON.stringify(item) : String(item)}</li>)}
          </ul>
        </div>
      );
    }
    
    return (
      <div key={k} className={styles.metricBox}>
        <span className={styles.metricLabel}>{humanizeKey(k)}</span>
        <span className={styles.metricValue}>
          {typeof v === 'number' ? formatNumber(v, k, data.revenueCurrency || data.currency) : String(v)}
        </span>
      </div>
    );
  };
  
  // Custom semantic ordering
  const entries = Object.entries(data).filter(([k, v]) => !isEmpty(v) && k !== 'revenueCurrency' && k !== 'currency');
  
  return (
    <div className={styles.structuredGrid}>
      {entries.map(([k, v]) => renderItem(k, v))}
    </div>
  );
};

const SwotRenderer: React.FC<{ items: any[] }> = ({ items }) => {
  const [expanded, setExpanded] = useState(false);
  
  const displayItems = expanded ? items : items.slice(0, 3);
  const remaining = items.length - 3;
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayItems.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', lineHeight: 1.5 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', paddingTop: '2px' }}>
              {(i + 1).toString().padStart(2, '0')}
            </span>
            <span style={{ color: '#334155' }}>
              {typeof item === 'object' ? (item.name || item.text || JSON.stringify(item)) : String(item)}
            </span>
          </div>
        ))}
      </div>
      {!expanded && remaining > 0 && (
        <button 
          onClick={() => setExpanded(true)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: '#2563eb',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            marginTop: '4px'
          }}
        >
          +{remaining} more
        </button>
      )}
    </div>
  );
};

const renderValue = (fieldKey: string, val: any, isManual?: boolean): React.ReactNode => {
  if (isEmpty(val)) return <span className={styles.emptyValue}>{isManual ? 'Not provided' : 'N/A'}</span>;
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  
  if (fieldKey === 'financial' || fieldKey === 'innovation' || fieldKey === 'market' || fieldKey === 'risk' || fieldKey === 'compliance') {
    return <StructuredRenderer data={val} type={fieldKey} />;
  }

  if (Array.isArray(val)) {
    if (fieldKey.startsWith('swot.')) {
      return <SwotRenderer items={val} />;
    }
    return (
      <div className={styles.chipList}>
        {val.map((item, i) => (
          <span key={i} className={styles.chip}>{typeof item === 'object' ? (item.name || item.text || JSON.stringify(item)) : String(item)}</span>
        ))}
      </div>
    );
  }
  if (typeof val === 'object') {
    return (
      <div className={styles.structuredGrid}>
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className={styles.metricBox}>
            <span className={styles.metricLabel}>{humanizeKey(k)}</span>
            <span className={styles.metricValue}>{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</span>
          </div>
        ))}
      </div>
    );
  }
  if (typeof val === 'number') {
    return formatNumber(val, fieldKey);
  }
  return String(val);
};

const mapStaffStatus = (s: string, isSameAsAi: boolean): { text: string; icon: React.ReactNode } => {
  if (isSameAsAi) {
    if (s === 'PENDING') return { text: 'Pending Staff Review', icon: <Clock size={12} /> };
    return { text: 'Matches AI', icon: <Check size={12} /> };
  }
  switch (s) {
    case 'CONFIRMED': return { text: 'Edited by Staff', icon: <AlertTriangle size={12} /> };
    case 'EDITED':    return { text: 'Edited by Staff', icon: <AlertTriangle size={12} /> };
    case 'ADDED':     return { text: 'Added by Staff', icon: <AlertTriangle size={12} /> };
    case 'REMOVED':   return { text: 'Removed by Staff', icon: <X size={12} /> };
    case 'PENDING':   return { text: 'Pending Staff Review', icon: <Clock size={12} /> };
    default:          return { text: s, icon: null };
  }
};

const mapManagerStatus = (rawStatus: unknown): { text: string; className: string; icon: React.ReactNode } => {
  const s = normalizeManagerStatus(rawStatus);
  switch (s) {
    case 'ACCEPTED':          return { text: 'Approved', className: styles.managerApproved, icon: <CheckCircle size={13} /> };
    case 'REJECTED':          return { text: 'Changes Requested', className: styles.managerRejected, icon: <AlertTriangle size={13} /> };
    case 'CHANGES_REQUESTED': return { text: 'Changes Requested', className: styles.managerNeedsReview, icon: <AlertTriangle size={13} /> };
    default:                  return { text: 'Manager Pending', className: styles.managerPending, icon: <Clock size={13} /> };
  }
};

const confidenceLabel = (c: number): string => {
  if (c >= 0.85) return 'High';
  if (c >= 0.6) return 'Medium';
  return 'Low';
};

const confidenceClass = (c: number): string => {
  if (c >= 0.85) return styles.confHigh;
  if (c >= 0.6) return styles.confMedium;
  return styles.confLow;
};

const formatTimestamp = (ts: string | undefined): string => {
  if (!ts) return 'just now';
  try {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 60000) return 'just now';
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return d.toLocaleDateString();
  } catch { return 'just now'; }
};

const evidenceTextOf = (item: EvidenceItem): string => {
  const value = item.evidenceText ?? item.text ?? item.snippet ?? item.extractedText ?? item.content;
  return typeof value === 'string' ? value.trim() : '';
};

const stringField = (item: EvidenceItem, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const numberField = (item: EvidenceItem, keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return undefined;
};

const EvidenceText: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);
  const canToggle = text.length > 420;
  return (
    <div className={styles.inlineEvidenceTextWrap}>
      <p className={!expanded && canToggle ? styles.inlineEvidenceTextCollapsed : ''}>
        {text || 'No extracted evidence text is available for this source.'}
      </p>
      {canToggle && (
        <button
          type="button"
          className={styles.inlineEvidenceShowMore}
          onClick={() => setExpanded(current => !current)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
};

/* ── component ── */

export const ManagerReviewFieldCard: React.FC<ManagerReviewFieldCardProps> = ({
  label,
  fieldKey,
  fieldResult,
  currentRevisionNumber = 1,
  onDecision,
  disabled,
  highlighted,
  evidenceItems = [],
  isManual = false,
}) => {
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'REJECTED' | 'CHANGES_REQUESTED' | null>(null);
  const [comment, setComment] = useState('');
  const [evidenceExpanded, setEvidenceExpanded] = useState(false);
  const [mutatingAction, setMutatingAction] = useState<'ACCEPTED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'PENDING' | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

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
  const staffInfo = mapStaffStatus(effectiveStaffStatus, !isChanged);
  const managerInfo = mapManagerStatus(status);
  const confidence = fieldResult?.confidence;
  const hasConfidence = confidence !== null && confidence !== undefined;
  const isAccepted = status === 'ACCEPTED';
  const isRejected = status === 'REJECTED';
  const isNeedsReview = status === 'CHANGES_REQUESTED';
  const isPending = status === 'PENDING';
  const hasDecision = isAccepted || isRejected || isNeedsReview;

  // Decision belongs to current round if roundNumber matches currentRound (or reviewedRevision matches currentRound, or unspecified for active draft)
  const isCurrentRoundDecision =
    hasDecision &&
    (currentDecision?.roundNumber == null || currentDecision.roundNumber === currentRound) &&
    (fieldResult?.reviewedRevision == null || fieldResult.reviewedRevision === currentRound);

  const isLowConfidence = hasConfidence && confidence < 0.6;
  const managerComment = currentDecision?.comment ?? fieldResult?.managerReviewComment;
  const managerReviewedAt = currentDecision?.reviewedAt ?? fieldResult?.managerReviewedAt;
  const evidenceCount = evidenceItems.length;

  // Canonical previous review resolution: strictly earlier rounds (< currentRound)
  // Round 1 must NEVER have a previous decision!
  const previousDecision = (() => {
    if (currentRound <= 1) return null;

    if (fieldResult?.previousDecision && fieldResult.previousDecision.roundNumber < currentRound) {
      const prevNorm = normalizeManagerStatus(fieldResult.previousDecision.status);
      if (prevNorm !== 'PENDING') {
        return {
          ...fieldResult.previousDecision,
          status: prevNorm,
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
      submittedValue: fieldResult?.previousSubmittedValue,
      reviewedAt: (fieldResult as any)?.previousManagerReviewedAt || null,
      reviewedByUserId: (fieldResult as any)?.previousManagerReviewedByUserId || null,
    };
  })();

  const hasResubmittedInCurrentRound =
    currentRound > 1 &&
    previousDecision !== null &&
    (fieldResult?.resubmittedInCurrentRound === true ||
      isChanged ||
      !isEmpty(staffValue) ||
      previousDecision.submittedValue !== undefined);

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
    if (mutatingAction) return; // don't close while submitting
    setIsCommentModalOpen(false);
    setPendingDecision(null);
    setMutationError(null);
  }, [mutatingAction]);

  const isValueEmpty = isEmpty(staffValue) && isEmpty(originalValue);

  // Card CSS class
  const cardClass = [
    styles.cardCompact,
    isAccepted ? styles.cardAccepted : '',
    isRejected ? styles.cardRejected : '',
    isNeedsReview ? styles.cardNeedsReview : '',
    isLowConfidence ? styles.cardLowConfidence : '',
    highlighted ? styles.cardHighlighted : '',
  ].filter(Boolean).join(' ');

  const isFieldMutating = mutatingAction !== null;

  /* ── render ── */
  return (
    <div className={cardClass}>
      {/* Header Row */}
      <div className={styles.compactHeader}>
        <span className={styles.fieldLabelText}>{label}</span>
        <div className={styles.headerRightBadge}>
          <span className={`${styles.managerStatusBadge} ${managerInfo.className}`}>
            {managerInfo.icon} {managerInfo.text}
          </span>
        </div>
        {!isManual && hasConfidence && (
          <span className={`${styles.confidenceBadge} ${confidenceClass(confidence)}`}>
            {isLowConfidence && <AlertTriangle size={12} />}
            {Math.round(confidence * 100)}% &middot; {confidenceLabel(confidence)}
          </span>
        )}
      </div>

      {/* Value / Diff Section */}
      <div className={styles.cardBody}>
        {!isManual && isChanged ? (
          <div className={styles.diffContainer}>
            <div className={styles.diffBlock}>
              <span className={styles.diffLabel}>AI Original</span>
              <div className={styles.diffOriginalValue}>{renderValue(fieldKey, originalValue, isManual)}</div>
            </div>
            <div className={styles.diffBlock}>
              <span className={styles.diffLabelNew}>Staff Submitted</span>
              <div className={styles.diffNewValue}>{renderValue(fieldKey, staffValue, isManual)}</div>
            </div>
          </div>
        ) : (
          <div className={styles.valueBlock}>
            {renderValue(fieldKey, staffValue ?? originalValue, isManual)}
          </div>
        )}
      </div>

      {/* Secondary metadata & evidence row */}
      <div className={styles.secondaryMetaRow}>
        <div className={styles.secondaryMetaLeft}>
          {isManual ? (
            <span className={styles.secondaryStaffEdited}>
              {isValueEmpty ? (
                <>Not provided by Staff</>
              ) : (
                <><Check size={12} /> Entered manually by Staff</>
              )}
            </span>
          ) : isChanged ? (
            <span className={styles.secondaryStaffEdited}>Staff edited</span>
          ) : (
            <span className={styles.secondaryAiMatch}>AI match</span>
          )}
          {!isManual && isLowConfidence && (
            <>
              <span className={styles.metaDot}>&middot;</span>
              <span className={styles.secondaryLowConf}>Low confidence</span>
            </>
          )}
          {evidenceCount > 0 ? (
            <>
              <span className={styles.metaDot}>&middot;</span>
              <button
                type="button"
                className={styles.evidenceInlineBtn}
                onClick={() => setEvidenceExpanded(current => !current)}
                aria-expanded={evidenceExpanded}
                aria-label={`View evidence for ${label}`}
              >
                <FileText size={12} />
                Evidence{evidenceCount > 1 ? ` (${evidenceCount})` : ''}
                {evidenceExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </>
          ) : !isManual ? (
            <>
              <span className={styles.metaDot}>&middot;</span>
              <span className={styles.noEvidenceText}>No supporting evidence</span>
            </>
          ) : null}
        </div>
        <div className={styles.secondaryMetaRight}>
          {(managerReviewedAt || (isAccepted && !managerComment)) && (
            <span className={styles.mutedReviewedTimestamp}>
              {managerReviewedAt
                ? `Reviewed ${formatTimestamp(managerReviewedAt)}`
                : 'Reviewed just now'}
            </span>
          )}
        </div>
      </div>

      {evidenceExpanded && evidenceCount > 0 && (
        <div className={styles.inlineEvidencePanel}>
          <div className={styles.inlineEvidenceHeader}>
            <span>Supporting Evidence</span>
            <strong>{evidenceCount} source{evidenceCount !== 1 ? 's' : ''}</strong>
          </div>
          <div className={styles.inlineEvidenceList}>
            {(evidenceItems as EvidenceItem[]).map((item, index) => {
              const sourceName = stringField(item, ['documentName', 'fileName', 'source', 'rawDocumentId', 'documentId', 'sourceDocumentId']);
              const sourceUrl = stringField(item, ['sourceUrl', 'url']);
              const page = numberField(item, ['pageNumber', 'page']) ?? fieldResult?.pageNumber;
              const section = stringField(item, ['section']);
              const evidenceText = evidenceTextOf(item);
              return (
                <article className={styles.inlineEvidenceItem} key={`${sourceName || 'source'}-${page ?? 'na'}-${index}`}>
                  <div className={styles.inlineEvidenceSourceLine} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      📄 {sourceName || 'Source Document'}
                    </strong>
                    <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>PDF</span>
                    {page ? (
                      <span style={{ background: '#e2e8f0', color: '#475569', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Page {page}</span>
                    ) : (
                      <span style={{ background: '#f1f5f9', color: '#94a3b8', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Page not identified</span>
                    )}
                    {section && <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{section}</span>}
                  </div>
                  <EvidenceText text={evidenceText} />
                  {sourceUrl && (
                    <a className={styles.inlineEvidenceSourceLink} href={sourceUrl} target="_blank" rel="noreferrer">
                      View Source <ExternalLink size={13} />
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* Manager Comment (post-decision in current round) */}
      {isCurrentRoundDecision && managerComment && (
        <div className={`${styles.feedbackBlock} ${isRejected ? styles.feedbackRejected : styles.feedbackWarning}`}>
          <div className={styles.feedbackTitle}>Manager feedback</div>
          <div className={styles.feedbackText}>&ldquo;{managerComment}&rdquo;</div>
          {managerReviewedAt && (
            <div className={styles.feedbackTimestamp}>
              {managerInfo.text} {formatTimestamp(managerReviewedAt)}
            </div>
          )}
        </div>
      )}

      {/* Approved timestamp when no comment */}
      {isAccepted && isCurrentRoundDecision && !managerComment && (
        <div className={styles.approvedTimestamp}>
          {managerReviewedAt
            ? `Approved in Round ${currentRound} (${formatTimestamp(managerReviewedAt)})`
            : `Approved in Round ${currentRound}`}
        </div>
      )}

      {/* Previous review history (Round 2+) */}
      {previousDecision && (
        <div className={styles.historyBlock}>
          <div className={styles.historyTitle}>
            Previous review — Round {previousDecision.roundNumber}
          </div>
          <span className={styles.historyBadge}>
            {mapManagerStatus(previousDecision.status).icon} {mapManagerStatus(previousDecision.status).text}
          </span>
          {previousDecision.comment && <div className={styles.historyComment}>&ldquo;{previousDecision.comment}&rdquo;</div>}
          {previousDecision.submittedValue !== undefined && (
            <div className={styles.historyComment}>
              <strong>Previous submitted value:</strong> {renderValue(fieldKey, previousDecision.submittedValue, isManual)}
            </div>
          )}
          {previousDecision.reviewedAt && (
            <div className={styles.historyComment}>
              <strong>Reviewed:</strong> {formatTimestamp(previousDecision.reviewedAt)}
            </div>
          )}
          {hasResubmittedInCurrentRound && (
            <div className={styles.historyComment}>
              <strong>Current Staff revision:</strong> {renderValue(fieldKey, staffValue, isManual)}
            </div>
          )}
          {isPending && (deepEqual(previousDecision.submittedValue, staffValue) || (isEmpty(previousDecision.submittedValue) && isEmpty(staffValue))) && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#b45309', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={12} />
              <span>Resubmitted value unchanged from previous round.</span>
            </div>
          )}
        </div>
      )}

      {/* Mutation Error */}
      {mutationError && !isCommentModalOpen && (
        <div className={styles.errorBanner}>
          <XCircle size={14} /> {mutationError}
        </div>
      )}

      {/* Action Buttons */}
      {!disabled && isPending && (
        <div className={styles.actionBar}>
          <button
            type="button"
            className={`${styles.btnAction} ${styles.btnApprove}`}
            onClick={handleApprove}
            disabled={disabled || isFieldMutating}
          >
            {mutatingAction === 'ACCEPTED' ? (
              <><Loader2 size={14} className={styles.spin} /> Approving&hellip;</>
            ) : (
              <><Check size={14} /> Approve</>
            )}
          </button>

          <button
            type="button"
            className={`${styles.btnAction} ${styles.btnRequestChanges}`}
            onClick={openRequestChangesModal}
            disabled={disabled || isFieldMutating}
          >
            <AlertTriangle size={14} /> Request Changes
          </button>
        </div>
      )}

      {/* Resolved State & Undo Action */}
      {hasDecision && (
        <div className={styles.resolvedActionBar}>
          {isAccepted ? (
            <span className={styles.resolvedBadgeApproved}>
              <Check size={13} /> Approved
            </span>
          ) : (
            <span className={styles.resolvedBadgeChanges}>
              <AlertTriangle size={13} /> Changes Requested
            </span>
          )}

          {!disabled && isCurrentRoundDecision && (
            <button
              type="button"
              className={styles.btnUndoText}
              onClick={handleUndo}
              disabled={disabled || isFieldMutating}
              title="Reset field decision to pending"
            >
              {mutatingAction === 'PENDING' ? (
                <><Loader2 size={12} className={styles.spin} /> Undoing&hellip;</>
              ) : (
                <><RotateCcw size={12} /> Undo</>
              )}
            </button>
          )}
        </div>
      )}


      {/* Comment Modal (Portal to body) */}
      {isCommentModalOpen && ReactDOM.createPortal(
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget && !mutatingAction) cancelModal(); }}>
          <div className={styles.modalContent}>
            <h3>Request Changes</h3>
            <div className={styles.modalFieldName}>{label}</div>
            <p>
              Why are changes being requested for this field?
              <span className={styles.required}> *</span>
            </p>
            <textarea
              className={styles.commentInput}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe what needs to be changed or provided for this field…"
              autoFocus
            />
            <div className={styles.modalHelper}>
              Your feedback will be shown to the Staff during revision.
            </div>
            {mutationError && (
              <div className={styles.errorBanner} style={{ marginBottom: 12 }}>
                <XCircle size={14} /> {mutationError}
              </div>
            )}
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={cancelModal} disabled={isFieldMutating}>Cancel</button>
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={submitCommentDecision}
                disabled={isFieldMutating || !comment.trim()}
              >
                {mutatingAction ? (
                  <><Loader2 size={14} className={styles.spin} /> Submitting&hellip;</>
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
