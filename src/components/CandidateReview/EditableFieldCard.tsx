import React, { useState } from 'react';
import { Edit3, Check, X, Undo2, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import type { AiFieldResult } from '../../types/domain';
import { EvidenceSection } from './EvidenceSection';
import styles from './CandidateReview.module.css';

interface EditableFieldCardProps {
  label: string;
  fieldResult?: AiFieldResult;
  dirty?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onRestore: () => void;
  currentValueDisplay: React.ReactNode;
  children: React.ReactNode;
  isList?: boolean;
  disabled?: boolean;
}

export const EditableFieldCard: React.FC<EditableFieldCardProps> = ({ 
  label, fieldResult, dirty, 
  onSave, onCancel, onConfirm, onRestore, 
  currentValueDisplay, children,
  disabled
}) => {
  const [expandedEvidence, setExpandedEvidence] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
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

  const aiOriginal = fieldResult?.value;
  const hasAiOriginal = aiOriginal !== null && aiOriginal !== undefined && aiOriginal !== '' && !(Array.isArray(aiOriginal) && aiOriginal.length === 0);
  const hasReviewedValue = fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const currentValue = hasReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : fieldResult?.value;
  const hasCurrentValue = currentValue !== null && currentValue !== undefined && currentValue !== '' && !(Array.isArray(currentValue) && currentValue.length === 0);
  const differsFromAi = hasReviewedValue && JSON.stringify(currentValue) !== JSON.stringify(aiOriginal);
  const isEdited = fieldResult?.staffReviewStatus === 'EDITED' || fieldResult?.staffReviewStatus === 'ADDED' || fieldResult?.staffReviewStatus === 'REMOVED' || differsFromAi || dirty;
  const isConfirmed = fieldResult?.staffReviewStatus === 'CONFIRMED' && !dirty;
  const isAdded = fieldResult?.staffReviewStatus === 'ADDED' || (!hasAiOriginal && hasCurrentValue && hasReviewedValue);
  const isRemoved = fieldResult?.staffReviewStatus === 'REMOVED' || (hasAiOriginal && !hasCurrentValue && hasReviewedValue);

  const isValidationFail = fieldResult?.validationStatus === 'FAIL';
  const managerStatus = String(fieldResult?.managerReviewStatus || 'PENDING').toUpperCase();
  const previousManagerStatus = String(fieldResult?.previousManagerReviewStatus || '').toUpperCase();
  const isManagerApproved = managerStatus === 'ACCEPTED' || managerStatus === 'APPROVED';
  const isReturned = managerStatus === 'REJECTED'
    || managerStatus === 'CHANGES_REQUESTED'
    || managerStatus === 'NEEDS_REVIEW'
    || previousManagerStatus === 'REJECTED'
    || previousManagerStatus === 'CHANGES_REQUESTED'
    || previousManagerStatus === 'NEEDS_REVIEW';
  const managerFeedback = fieldResult?.previousManagerReviewComment || fieldResult?.managerReviewComment;
  const previousSubmittedValue = fieldResult?.previousSubmittedValue;

  const handleEditClick = () => setIsEditing(true);
  const handleCancelClick = () => { setIsEditing(false); onCancel(); };
  const handleSaveClick = () => { setIsEditing(false); onSave(); };

  return (
    <div className={`${styles.fieldRow} ${dirty ? styles.fieldRowDirty : ''} ${isValidationFail ? styles.fieldRowIssue : ''} ${confidence > 0 && confidence < 0.6 ? styles.fieldRowLowConfidence : ''}`}>
      <div className={styles.fieldRowHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <div className={styles.fieldBadges}>
          {isManagerApproved && (
            <span className={`${styles.reviewBadge} ${styles.reviewConfirmed}`}>
              Approved by Manager
            </span>
          )}
          {isReturned && !isManagerApproved && (
            <span className={`${styles.reviewBadge} ${styles.reviewReturned}`}>
              Changes Requested
            </span>
          )}
          {confidence > 0 && (
            <span className={`${styles.confidenceBadge} ${confidenceClass}`}>
              {(confidence * 100).toFixed(0)}% &middot; {confidenceLabel}
            </span>
          )}
        </div>
      </div>

      <div className={styles.fieldBody}>
        <div className={styles.fieldValue}>
          {isEditing ? (
            <div className={styles.editInline}>
              {children}
              <div className={styles.editActions}>
                <button className={styles.btnSecondary} onClick={handleCancelClick}><X size={14}/> Cancel</button>
                <button className={styles.btnPrimary} onClick={handleSaveClick}><Check size={14}/> Save</button>
              </div>
              {hasAiOriginal && (
                <div className={styles.editOriginal}>
                  <span><strong>AI Value:</strong> {typeof aiOriginal === 'string' ? aiOriginal : 'Structured data'}</span>
                  <button type="button" className={styles.restoreLink} onClick={() => { onRestore(); setIsEditing(false); }}>
                    <Undo2 size={12}/> Restore
                  </button>
                </div>
              )}
            </div>
          ) : (
            currentValueDisplay
          )}

          {isEditing && (
            <div className={styles.editControls}>
              <button className={`${styles.btnCompact} ${styles.btnSave}`} onClick={onSave} disabled={disabled}><Check size={14}/> Save</button>
              <button className={styles.btnCompact} onClick={onCancel} disabled={disabled}><X size={14}/> Cancel</button>
              {fieldResult?.staffReviewStatus === 'EDITED' && (
                <button className={`${styles.btnCompact} ${styles.btnRestore}`} onClick={onRestore} disabled={disabled} title="Restore to extracted value">
                  <Undo2 size={14}/> Restore
                </button>
              )}
            </div>
          )}
        </div>

        {(() => {
          return (
            <>
              {!isEditing && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(isManagerApproved || isValidationFail) && (
                    <div className={styles.evidenceLine}>
                      {isManagerApproved && (
                        <>
                          <span>Approved in Round {fieldResult?.previousReviewedRevision || fieldResult?.changedInRevision || ''}</span>
                          <span>&middot;</span>
                          <span>Locked</span>
                        </>
                      )}
                      {isValidationFail && (
                        <span className={`${styles.validationBadge} ${styles.validFail}`}>
                          Validation Issue
                        </span>
                      )}
                    </div>
                  )}

                  <EvidenceSection
                    evidenceText={fieldResult?.evidenceText}
                    pageNumber={fieldResult?.pageNumber}
                    expanded={expandedEvidence}
                    onToggle={() => setExpandedEvidence(!expandedEvidence)}
                  />

                  {isReturned && (
                    <div className={styles.managerFeedbackInline}>
                      {previousSubmittedValue !== undefined && (
                        <div>
                          <span>Previous submitted value</span>
                          <strong>{typeof previousSubmittedValue === 'string' ? previousSubmittedValue : JSON.stringify(previousSubmittedValue)}</strong>
                        </div>
                      )}
                      <div>
                        <span>Manager feedback</span>
                        <strong>{managerFeedback || 'Manager requested a change.'}</strong>
                      </div>
                      {fieldResult?.previousManagerReviewStatus && (
                        <small>{fieldResult.previousManagerReviewStatus} in Round {fieldResult.previousReviewedRevision || 1}</small>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {!isEditing && (
                <div className={styles.fieldFooter} style={{ marginTop: '12px', borderTop: '1px dashed #cbd5e1', paddingTop: '12px' }}>
                  <div className={styles.fieldFooterLeft}>
                    {isEdited ? (
                      <span className={`${styles.reviewBadge} ${styles.reviewEdited}`}>
                        {isAdded ? 'Added' : isRemoved ? 'Removed' : 'Edited'}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.fieldFooterRight}>
                    {disabled ? (
                      <span className={styles.textConfirmed} style={{ color: '#6b7280', fontSize: '12px' }}>🔒 Locked</span>
                    ) : (
                      <>
                        <button className={styles.btnCompact} onClick={handleEditClick} style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', fontWeight: 600 }}>
                          <Edit3 size={14}/> Edit
                        </button>
                        {!isConfirmed && hasCurrentValue && (
                          <button className={`${styles.btnCompact} ${styles.btnConfirm}`} onClick={onConfirm} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 600 }}>
                            <Check size={14}/> Confirm
                          </button>
                        )}
                        {isConfirmed && (
                          <span className={styles.reviewConfirmed} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontWeight: 600 }}>
                            <Check size={14} /> Confirmed
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
};
