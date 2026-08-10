import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import type { AiFieldResult } from '../../types/domain';
import { EditableFieldCard } from './EditableFieldCard';
import styles from './CandidateReview.module.css';

interface EditableListFieldProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  onChange: (key: string, value: string[], status?: string) => void;
  disabled?: boolean;
}

export const EditableListField: React.FC<EditableListFieldProps> = ({
  label,
  fieldKey,
  fieldResult,
  onChange,
  disabled,
}) => {
  const hasStaffReviewedValue = fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const rawCurrentValue = hasStaffReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : fieldResult?.value;
  const currentValue: string[] = Array.isArray(rawCurrentValue) ? rawCurrentValue : [];
  const aiOriginal: string[] = Array.isArray(fieldResult?.value) ? fieldResult.value : [];

  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  // Sync state only when currentValue changes in length/content
  useEffect(() => {
    setItems(currentValue);
  }, [currentValue.join('|')]);

  const handleSaveList = () => {
    let finalItems = items;
    if (adding && draft.trim()) {
      finalItems = [...items, draft.trim()];
      setItems(finalItems);
      setDraft('');
      setAdding(false);
    }
    const isUnchanged = JSON.stringify(finalItems) === JSON.stringify(currentValue);
    if (isUnchanged) {
      const currentStatus = fieldResult?.staffReviewStatus ?? 'PENDING';
      onChange(fieldKey, finalItems, currentStatus);
      return;
    }

    const isAiValEmpty = aiOriginal.length === 0;
    const isNowEmpty = finalItems.length === 0;
    const status = isAiValEmpty ? 'ADDED' : (isNowEmpty ? 'REMOVED' : 'EDITED');
    onChange(fieldKey, finalItems, status);
  };

  const handleCancelList = () => {
    setItems(currentValue);
    setAdding(false);
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, 'CONFIRMED');
  };

  const handleRestore = () => {
    onChange(fieldKey, aiOriginal, 'RESTORED');
  };

  const addItem = () => {
    if (!draft.trim()) {
      setAdding(false);
      return;
    }
    setItems([...items, draft.trim()]);
    setDraft('');
    setAdding(false);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    } else if (e.key === 'Escape') {
      setDraft('');
      setAdding(false);
    }
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
        <span className={styles.emptyValue}>Not extracted</span>
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
    >
      <div className={styles.tagList}>
        {items.map((item, index) => (
          <span key={index} className={styles.chip}>
            {item}
            <button type="button" className={styles.chipRemove} onClick={() => deleteItem(index)}>
              <X size={14} />
            </button>
          </span>
        ))}
        
        {adding ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input 
              type="text" 
              value={draft} 
              onChange={(e) => setDraft(e.target.value)} 
              onKeyDown={handleKeyDown}
              className={styles.input}
              style={{ width: '150px', padding: '4px 8px' }}
              autoFocus
              placeholder="Add item..."
            />
            <button type="button" className={styles.btnSecondary} onClick={addItem} style={{ padding: '4px' }}>
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <button type="button" className={styles.chipAdd} onClick={() => setAdding(true)}>
            <Plus size={14} /> Add {label.toLowerCase()}
          </button>
        )}
      </div>
    </EditableFieldCard>
  );
};
