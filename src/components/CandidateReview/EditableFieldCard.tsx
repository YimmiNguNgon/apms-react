import React, { useState } from 'react';
import { Edit3, Check, X, Undo2, ChevronDown, ChevronRight } from 'lucide-react';
import type { AiFieldResult } from '../../types/domain';
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
  currentValueDisplay, children, isList,
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

  const handleEditClick = () => setIsEditing(true);
  const handleCancelClick = () => { setIsEditing(false); onCancel(); };
  const handleSaveClick = () => { setIsEditing(false); onSave(); };

  return (
    <div className={`${styles.fieldRow} ${dirty ? styles.fieldRowDirty : ''} ${isValidationFail ? styles.fieldRowIssue : ''} ${confidence > 0 && confidence < 0.6 ? styles.fieldRowLowConfidence : ''}`}>
      <div className={styles.fieldRowHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <div className={styles.fieldBadges}>
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
          
          {!isEditing && (
            <div className={styles.evidenceLine}>
              {isValidationFail && (
                <span className={`${styles.validationBadge} ${styles.validFail}`}>
                  Validation Issue
                </span>
              )}
              {fieldResult?.evidenceText && (
                <>
                  <button 
                    type="button" 
                    className={styles.evidenceViewBtn} 
                    onClick={() => setExpandedEvidence(!expandedEvidence)}
                  >
                    {expandedEvidence ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    Evidence
                  </button>
                  <span>&middot;</span>
                  <span>{expandedEvidence ? `"${fieldResult.evidenceText}"` : '1 source'}</span>
                  {expandedEvidence && fieldResult.pageNumber && <span>(Page {fieldResult.pageNumber})</span>}
                </>
              )}
            </div>
          )}
        </div>
        
        {!isEditing && (
          <div className={styles.fieldFooter}>
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
                  <button className={styles.btnCompact} onClick={handleEditClick}>
                    <Edit3 size={12}/> Edit
                  </button>
                  {!isConfirmed && hasCurrentValue && (
                    <button className={`${styles.btnCompact} ${styles.btnConfirm}`} onClick={onConfirm}>
                      <Check size={12}/> Confirm
                    </button>
                  )}
                  {isConfirmed && (
                    <span className={styles.reviewConfirmed} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={12} /> Confirmed
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
