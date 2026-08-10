import React, { useState, useEffect } from 'react';
import type { AiFieldResult } from '../../types/domain';
import { EditableFieldCard } from './EditableFieldCard';
import styles from './CandidateReview.module.css';

export interface ObjectFieldSchema {
  key: string;
  label: string;
  type: 'string' | 'number' | 'textarea' | 'list';
}

interface EditableObjectFieldProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  schema: ObjectFieldSchema[];
  onChange: (key: string, value: any, status?: string) => void;
  disabled?: boolean;
}

export const EditableObjectField: React.FC<EditableObjectFieldProps> = ({
  label,
  fieldKey,
  fieldResult,
  schema,
  onChange,
  disabled
}) => {
  const hasStaffReviewedValue = fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const rawCurrentValue = hasStaffReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : fieldResult?.value;
  const currentValue: Record<string, any> = typeof rawCurrentValue === 'object' && rawCurrentValue !== null ? rawCurrentValue : {};
  const aiOriginal: Record<string, any> = typeof fieldResult?.value === 'object' && fieldResult?.value !== null ? fieldResult?.value : {};

  // Check if there are actually any non-empty properties mapped in our schema
  const hasVisibleFields = (obj: Record<string, any>) => schema.some(field => {
    const val = obj[field.key];
    return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
  });

  const [draftValue, setDraftValue] = useState<Record<string, any>>(currentValue);

  useEffect(() => {
    setDraftValue(currentValue);
  }, [JSON.stringify(currentValue)]);

  const handleChange = (key: string, value: any) => {
    setDraftValue(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const isUnchanged = JSON.stringify(draftValue) === JSON.stringify(currentValue);
    if (isUnchanged) {
      const currentStatus = fieldResult?.staffReviewStatus ?? 'PENDING';
      onChange(fieldKey, draftValue, currentStatus);
      return;
    }

    const isAiValEmpty = Object.keys(aiOriginal).length === 0;
    const isNowEmpty = Object.keys(draftValue).length === 0 || Object.values(draftValue).every(v => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0));
    
    const status = isAiValEmpty ? 'ADDED' : (isNowEmpty ? 'REMOVED' : 'EDITED');
    onChange(fieldKey, draftValue, status);
  };

  const handleCancel = () => {
    setDraftValue(currentValue);
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, 'CONFIRMED');
  };

  const handleRestore = () => {
    onChange(fieldKey, aiOriginal, 'RESTORED');
  };

  const displayValue = (Object.keys(currentValue).length > 0 && hasVisibleFields(currentValue)) ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {schema.map(field => {
        const val = currentValue[field.key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
        return (
          <div key={field.key} style={{ fontSize: '13px' }}>
            <strong style={{ color: '#6b7280' }}>{field.label}:</strong>{' '}
            <span>{Array.isArray(val) ? val.join(', ') : String(val)}</span>
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <EditableFieldCard
      label={label}
      fieldResult={fieldResult}
      onSave={handleSave}
      onCancel={handleCancel}
      onConfirm={handleConfirm}
      onRestore={handleRestore}
      currentValueDisplay={
        displayValue || <span className={styles.emptyValue}>Not extracted</span>
      }
      disabled={disabled}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {schema.map(field => (
          <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                className={styles.textarea}
                value={(draftValue[field.key] as string) || ''}
                onChange={e => handleChange(field.key, e.target.value)}
                rows={3}
              />
            ) : field.type === 'list' ? (
              <input
                type="text"
                className={styles.input}
                placeholder="Comma separated values"
                value={((draftValue[field.key] as string[]) || []).join(', ')}
                onChange={e => handleChange(field.key, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                className={styles.input}
                value={(draftValue[field.key] as string) || ''}
                onChange={e => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </EditableFieldCard>
  );
};
