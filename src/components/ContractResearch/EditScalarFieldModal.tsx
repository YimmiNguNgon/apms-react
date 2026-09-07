import React, { useState } from 'react';
import type { ExtractedContractField } from '../../types/contractResearch';
import { Edit3, Loader2, CheckCircle2, X, FileText, Hash, Quote, Calendar } from 'lucide-react';
import styles from './EditModal.module.css';

interface Props {
  fieldPath: string;
  fieldLabel: string;
  fieldData?: ExtractedContractField<any> | null;
  fieldType?: 'text' | 'date' | 'number' | 'textarea';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { value: any; evidence?: string | null; sourcePage?: number | null }) => Promise<void>;
}

export const EditScalarFieldModal: React.FC<Props> = ({
  fieldPath = '',
  fieldLabel,
  fieldData,
  fieldType = 'text',
  isOpen,
  onClose,
  onSubmit,
}) => {
  const isDateField =
    fieldType === 'date' ||
    fieldPath.toLowerCase().includes('date') ||
    fieldLabel.toLowerCase().includes('date') ||
    fieldLabel.toLowerCase().includes('ngày');
  const isNumberField = fieldType === 'number';
  const isTextareaField = fieldType === 'textarea';

  const formatInitialValue = () => {
    if (!fieldData || fieldData.value === null || fieldData.value === undefined) {
      return '';
    }
    const raw =
      typeof fieldData.value === 'object' && fieldData.value !== null && 'amount' in fieldData.value
        ? String(fieldData.value.amount != null ? fieldData.value.amount : (fieldData.value.rawAmountText || ''))
        : String(fieldData.value);

    if (isDateField) {
      if (!raw || raw.trim().toUpperCase() === 'N/A') return '';
      const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) {
        return match[0];
      }
      const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      }
      return '';
    }
    return raw;
  };

  const [val, setVal] = useState<string>(formatInitialValue);
  const [evidence, setEvidence] = useState<string>(fieldData?.evidence || '');
  const [sourcePage, setSourcePage] = useState<number | string>(fieldData?.sourcePage || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDateField) {
      if (!val) {
        setError('Please select a valid date.');
        return;
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(val) || isNaN(Date.parse(val))) {
        setError('Invalid date format. Please select a valid date (YYYY-MM-DD).');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        value: val,
        evidence: evidence.trim() || null,
        sourcePage: sourcePage ? Number(sourcePage) : 1,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update field.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBadge}>
              <Edit3 size={18} />
            </div>
            <div className={styles.titleGroup}>
              <h3 className={styles.modalTitle}>Edit: {fieldLabel}</h3>
              <p className={styles.modalSubtitle}>Update field value and supporting evidence from source document</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {error && (
              <div className={styles.errorBanner}>
                {error}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                {isDateField ? (
                  <Calendar size={14} className={styles.labelIcon} />
                ) : (
                  <FileText size={14} className={styles.labelIcon} />
                )}
                <span>Field Value</span>
                <span className={styles.requiredStar}>*</span>
              </label>
              {isTextareaField ? (
                <textarea
                  className={styles.inputField}
                  rows={4}
                  style={{ resize: 'vertical', minHeight: '88px', lineHeight: 1.45 }}
                  value={val}
                  onChange={(e) => {
                    setVal(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  disabled={isSubmitting}
                  placeholder="Enter accurate value..."
                />
              ) : (
                <input
                  type={isDateField ? 'date' : isNumberField ? 'number' : 'text'}
                  className={styles.inputField}
                  value={val}
                  onChange={(e) => {
                    setVal(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  disabled={isSubmitting}
                  placeholder={isDateField ? 'YYYY-MM-DD' : 'Enter accurate value...'}
                />
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Hash size={14} className={styles.labelIcon} />
                <span>Source Page</span>
              </label>
              <input
                type="number"
                min={1}
                className={styles.inputField}
                value={sourcePage}
                onChange={(e) => setSourcePage(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., 1"
              />
              <span className={styles.fieldHint}>Page number in the PDF document where this term appears</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Quote size={14} className={styles.labelIcon} />
                <span>Supporting Evidence</span>
              </label>
              <textarea
                rows={3}
                className={styles.textareaField}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Paste verbatim excerpt or sentence from the contract document..."
                disabled={isSubmitting}
              />
              <span className={styles.fieldHint}>Verbatim excerpt for verification reference</span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className={styles.spinIcon} />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Save & Verify</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
