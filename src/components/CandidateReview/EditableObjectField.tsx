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

  const formatDisplayValue = (val: any, label: string) => {
    if (typeof val === 'number') {
      const lowerLabel = label.toLowerCase();
      if (lowerLabel.includes('%') || lowerLabel.includes('margin') || lowerLabel.includes('rate') || lowerLabel.includes('growth') || lowerLabel.includes('share') || lowerLabel.includes('ratio')) {
        if (val > 0 && val <= 1) return (val * 100).toFixed(2) + '%';
        return val.toLocaleString() + '%';
      }
      if (val >= 1e12) return (val / 1e12).toFixed(2) + ' Trillion';
      if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Billion';
      if (val >= 1e6) return (val / 1e6).toFixed(2) + ' Million';
      return val.toLocaleString();
    }
    if (Array.isArray(val)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
          {val.map((item, idx) => (
            <span key={idx} style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
              {item}
            </span>
          ))}
        </div>
      );
    }
    return String(val);
  };

  const displayValue = (Object.keys(currentValue).length > 0 && hasVisibleFields(currentValue)) ? (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '4px' }}>
      {schema.map(field => {
        const val = currentValue[field.key];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) return null;
        return (
          <div key={field.key} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>{field.label}</span>
            <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 600, wordBreak: 'break-word', lineHeight: '1.4' }}>
              {formatDisplayValue(val, field.label)}
            </div>
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
