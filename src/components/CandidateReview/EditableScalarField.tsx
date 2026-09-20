import React, { useState, useEffect } from 'react';
import type { AiFieldResult } from '../../types/domain';
import { isCandidateFieldEdited, normalizeCandidateFieldValue } from './candidateFieldDefinitions';
import { EditableFieldCard } from './EditableFieldCard';
import styles from './CandidateReview.module.css';

interface EditableScalarFieldProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  type?: 'string' | 'number' | 'textarea';
  onChange: (key: string, value: any, status?: string) => void;
  disabled?: boolean;
  isManual?: boolean;
  revisionMode?: boolean;
}

export const EditableScalarField: React.FC<EditableScalarFieldProps> = ({
  label,
  fieldKey,
  fieldResult,
  type = 'string',
  onChange,
  disabled,
  isManual = false,
  revisionMode,
}) => {
  const hasStaffReviewedValue = fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const currentValue = hasStaffReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : (fieldResult?.value ?? '');
  
  const [draftValue, setDraftValue] = useState(currentValue ?? '');

  useEffect(() => {
    setDraftValue(currentValue ?? '');
  }, [currentValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    const val = type === 'number' ? (rawVal === '' ? '' : Number(rawVal)) : rawVal;
    setDraftValue(val);
    if (revisionMode) {
      const finalVal = val === '' ? null : val;
      onChange(fieldKey, finalVal, 'EDITED');
    }
  };

  const handleSave = () => {
    const finalVal = draftValue === '' ? null : draftValue;
    const isEdited = isCandidateFieldEdited(fieldResult?.value, finalVal);
    if (!isEdited) {
      onChange(fieldKey, finalVal, isManual ? (normalizeCandidateFieldValue(finalVal) === null ? 'PENDING' : 'ADDED') : 'CONFIRMED');
      return;
    }

    const isAiValEmpty = normalizeCandidateFieldValue(fieldResult?.value) === null;
    const isDraftEmpty = normalizeCandidateFieldValue(finalVal) === null;
    const status = isAiValEmpty ? 'ADDED' : isDraftEmpty ? 'REMOVED' : 'EDITED';
    onChange(fieldKey, finalVal, status);
  };

  const handleCancel = () => {
    setDraftValue(currentValue ?? '');
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, isManual ? 'ADDED' : 'CONFIRMED');
  };

  const handleRestore = () => {
    const aiVal = fieldResult?.value ?? '';
    onChange(fieldKey, aiVal, 'RESTORED');
  };

  const displayValue = currentValue;

  return (
    <EditableFieldCard 
      label={label} 
      fieldResult={fieldResult}
      onSave={handleSave}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      onRestore={handleRestore}
      currentValueDisplay={
        displayValue 
          ? <span>{String(displayValue)}</span> 
          : <span className={styles.emptyValue}>N/A</span>
      }
      disabled={disabled}
      isManual={isManual}
      revisionMode={revisionMode}
    >
      {type === 'textarea' ? (
        <textarea 
          className={styles.textarea} 
          value={draftValue as string} 
          onChange={handleChange} 
          rows={3} 
        />
      ) : (
        <input 
          type={type === 'number' ? 'number' : 'text'}
          className={styles.input} 
          value={draftValue as string} 
          onChange={handleChange} 
        />
      )}
    </EditableFieldCard>
  );
};
