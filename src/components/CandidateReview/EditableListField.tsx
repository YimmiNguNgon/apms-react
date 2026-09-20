import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, AlertCircle } from 'lucide-react';
import type { AiFieldResult } from '../../types/domain';
import {
  isCandidateFieldEdited,
  normalizeCandidateFieldValue,
  isValidCandidateEmail,
  isValidCandidatePhone,
} from './candidateFieldDefinitions';
import { EditableFieldCard } from './EditableFieldCard';
import styles from './CandidateReview.module.css';

interface EditableListFieldProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  onChange: (key: string, value: string[], status?: string) => void;
  disabled?: boolean;
  isManual?: boolean;
  revisionMode?: boolean;
}

export const EditableListField: React.FC<EditableListFieldProps> = ({
  label,
  fieldKey,
  fieldResult,
  onChange,
  disabled,
  isManual = false,
  revisionMode,
}) => {
  const hasStaffReviewedValue = fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const rawCurrentValue = hasStaffReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : fieldResult?.value;
  const currentValue: string[] = Array.isArray(rawCurrentValue) ? rawCurrentValue : [];
  const aiOriginal: string[] = Array.isArray(fieldResult?.value) ? fieldResult.value : [];

  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state only when currentValue changes in length/content
  useEffect(() => {
    setItems(currentValue);
  }, [currentValue.join('|')]);

  const validateItem = (val: string, currentList: string[]): string | null => {
    const trimmed = val.trim();
    if (!trimmed) return 'Item cannot be empty';

    const isDuplicate = currentList.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      return `"${trimmed}" is already added`;
    }

    if (fieldKey === 'contact.emails' && !isValidCandidateEmail(trimmed)) {
      return `"${trimmed}" is not a valid email address`;
    }

    if (fieldKey === 'contact.phones' && !isValidCandidatePhone(trimmed)) {
      return `"${trimmed}" is not a valid phone number (7-15 digits)`;
    }

    return null;
  };

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const error = validateItem(trimmed, items);
    if (error) {
      setValidationError(error);
      inputRef.current?.focus();
      return;
    }

    setItems((prev) => [...prev, trimmed]);
    setDraft('');
    setValidationError(null);
    inputRef.current?.focus();
  };

  const deleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      addItem();
    } else if (e.key === 'Escape') {
      setDraft('');
      setValidationError(null);
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem();
  };

  const handleSaveList = (): boolean => {
    let finalItems = [...items];
    const pending = draft.trim();

    if (pending) {
      const error = validateItem(pending, finalItems);
      if (error) {
        // If it's a duplicate of an existing chip, drop the duplicate input and proceed
        const isDuplicate = finalItems.some(
          (item) => item.toLowerCase() === pending.toLowerCase()
        );
        if (isDuplicate) {
          setDraft('');
          setValidationError(null);
        } else {
          setValidationError(error);
          inputRef.current?.focus();
          return false; // Prevent save and keep editor open so user sees error
        }
      } else {
        finalItems.push(pending);
        setItems(finalItems);
        setDraft('');
        setValidationError(null);
      }
    }

    const isEdited = isCandidateFieldEdited(fieldResult?.value, finalItems);
    if (!isEdited) {
      onChange(
        fieldKey,
        finalItems,
        isManual
          ? (normalizeCandidateFieldValue(finalItems) === null ? 'PENDING' : 'ADDED')
          : 'CONFIRMED'
      );
      return true;
    }

    const isAiValEmpty = normalizeCandidateFieldValue(fieldResult?.value) === null;
    const isNowEmpty = normalizeCandidateFieldValue(finalItems) === null;
    const status = isAiValEmpty ? 'ADDED' : (isNowEmpty ? 'REMOVED' : 'EDITED');
    onChange(fieldKey, finalItems, status);
    return true;
  };

  const handleCancelList = () => {
    setItems(currentValue);
    setDraft('');
    setValidationError(null);
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, isManual ? 'ADDED' : 'CONFIRMED');
  };

  const handleRestore = () => {
    onChange(fieldKey, aiOriginal, 'RESTORED');
    setItems(aiOriginal);
  };

  const displayList = (
    <div className={styles.tagList}>
      {currentValue.length > 0 ? (
        currentValue.map((item, idx) => (
          <span key={idx} className={styles.chip}>
            {item}
          </span>
        ))
      ) : (
        <span className={styles.emptyValue}>N/A</span>
      )}
    </div>
  );

  return (
    <EditableFieldCard
      label={label}
      fieldResult={fieldResult}
      onSave={handleSaveList}
      onCancel={handleCancelList}
      onConfirm={handleConfirm}
      onRestore={handleRestore}
      currentValueDisplay={displayList}
      isList
      disabled={disabled}
      isManual={isManual}
      revisionMode={revisionMode}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className={styles.tagList} style={{ alignItems: 'center' }}>
          {items.map((item, index) => (
            <span key={index} className={styles.chip}>
              <span>{item}</span>
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => deleteItem(index)}
                title={`Remove ${item}`}
                aria-label={`Remove ${item}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={handleKeyDown}
              className={styles.input}
              style={{
                width: '150px',
                padding: '4px 8px',
                fontSize: '13px',
                height: '28px',
                borderColor: validationError ? '#dc2626' : undefined,
              }}
              placeholder="Add item..."
            />
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={handlePlusClick}
              disabled={!draft.trim()}
              style={{
                padding: '4px 8px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '28px',
                cursor: !draft.trim() ? 'not-allowed' : 'pointer',
                opacity: !draft.trim() ? 0.5 : 1,
              }}
              title="Add item"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {validationError && (
          <span style={{ fontSize: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
            <AlertCircle size={13} /> {validationError}
          </span>
        )}
      </div>
    </EditableFieldCard>
  );
};
