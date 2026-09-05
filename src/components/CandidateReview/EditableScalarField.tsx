import React, { useState, useEffect } from 'react';
import type { AiFieldResult } from '../../types/domain';
import { EditableFieldCard } from './EditableFieldCard';
import styles from './CandidateReview.module.css';

interface EditableScalarFieldProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  type?: 'string' | 'number' | 'textarea';
  onChange: (key: string, value: any, status?: string) => void;
  disabled?: boolean;
}

export const EditableScalarField: React.FC<EditableScalarFieldProps> = ({
  label,
  fieldKey,
  fieldResult,
  type = 'string',
  onChange,
  disabled
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
    setDraftValue(type === 'number' ? Number(e.target.value) : e.target.value);
  };

  const handleSave = () => {
    const isUnchanged = JSON.stringify(draftValue) === JSON.stringify(currentValue);
    if (isUnchanged) {
      const currentStatus = fieldResult?.staffReviewStatus ?? 'PENDING';
      onChange(fieldKey, draftValue, currentStatus);
      return;
    }

    const aiVal = fieldResult?.value;
    const isAiValEmpty = aiVal === undefined || aiVal === null || aiVal === '';
    const status = isAiValEmpty ? 'ADDED' : (!draftValue || draftValue === '') ? 'REMOVED' : 'EDITED';
    onChange(fieldKey, draftValue, status);
  };

  const handleCancel = () => {
    setDraftValue(currentValue ?? '');
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, 'CONFIRMED');
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
