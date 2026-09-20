import React, { useState, useEffect } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';
import type { AiFieldResult } from '../../types/domain';
import {
  isCandidateFieldEdited,
  normalizeCandidateFieldValue,
} from './candidateFieldDefinitions';
import { EditableFieldCard } from './EditableFieldCard';
import { IndustrySelectionModal } from './IndustrySelectionModal';
import { useIndustryCatalog } from '../../API/industryApi';
import styles from './CandidateReview.module.css';

interface EditableIndustryFieldProps {
  label: string;
  fieldKey: string;
  fieldResult?: AiFieldResult;
  onChange: (key: string, value: string[], status?: string) => void;
  disabled?: boolean;
  isManual?: boolean;
  revisionMode?: boolean;
}

export const EditableIndustryField: React.FC<EditableIndustryFieldProps> = ({
  label,
  fieldKey,
  fieldResult,
  onChange,
  disabled,
  isManual = false,
  revisionMode,
}) => {
  const { isCatalogIndustry } = useIndustryCatalog();

  const hasStaffReviewedValue =
    fieldResult?.reviewedValue !== undefined || fieldResult?.staffReviewedValue !== undefined;
  const rawCurrentValue = hasStaffReviewedValue
    ? (fieldResult?.reviewedValue !== undefined ? fieldResult.reviewedValue : fieldResult?.staffReviewedValue)
    : fieldResult?.value;
  const currentValue: string[] = Array.isArray(rawCurrentValue) ? rawCurrentValue : [];
  const aiOriginal: string[] = Array.isArray(fieldResult?.value) ? fieldResult.value : [];

  const [items, setItems] = useState<string[]>(currentValue);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    setItems(currentValue);
  }, [currentValue.join('|')]);

  const commitSave = (finalItems: string[]) => {
    setItems(finalItems);
    const isEdited = isCandidateFieldEdited(fieldResult?.value, finalItems);
    if (!isEdited) {
      onChange(
        fieldKey,
        finalItems,
        isManual
          ? (normalizeCandidateFieldValue(finalItems) === null ? 'PENDING' : 'ADDED')
          : 'CONFIRMED'
      );
      return;
    }

    const isAiValEmpty = normalizeCandidateFieldValue(fieldResult?.value) === null;
    const isNowEmpty = normalizeCandidateFieldValue(finalItems) === null;
    const status = isAiValEmpty ? 'ADDED' : (isNowEmpty ? 'REMOVED' : 'EDITED');
    onChange(fieldKey, finalItems, status);
  };

  const handleSaveList = (): boolean => {
    commitSave(items);
    return true;
  };

  const handleCancelList = () => {
    setItems(currentValue);
    setIsModalOpen(false);
  };

  const handleConfirm = () => {
    onChange(fieldKey, currentValue, isManual ? 'ADDED' : 'CONFIRMED');
  };

  const handleRestore = () => {
    onChange(fieldKey, aiOriginal, 'RESTORED');
    setItems(aiOriginal);
  };

  const deleteItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleModalSave = (selected: string[]) => {
    commitSave(selected);
    setIsModalOpen(false);
  };

  const renderChip = (item: string, onRemove?: () => void) => {
    const isCatalog = isCatalogIndustry(item);
    return (
      <span
        key={item}
        className={styles.chip}
        style={
          !isCatalog
            ? {
                backgroundColor: '#fffbeb',
                borderColor: '#f59e0b',
                color: '#92400e',
              }
            : undefined
        }
      >
        <span>{item}</span>
        {!isCatalog && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: '#fef3c7',
              color: '#b45309',
              border: '1px solid #fde68a',
              borderRadius: '4px',
              padding: '1px 4px',
              marginLeft: '3px',
              letterSpacing: '0.5px',
            }}
            title="Proposed custom industry (pending approval)"
          >
            NEW
          </span>
        )}
        {onRemove && (
          <button
            type="button"
            className={styles.chipRemove}
            onClick={onRemove}
            title={`Remove ${item}`}
            aria-label={`Remove ${item}`}
            style={!isCatalog ? { color: '#b45309' } : undefined}
          >
            <X size={13} />
          </button>
        )}
      </span>
    );
  };

  const displayList = (
    <div className={styles.tagList}>
      {currentValue.length > 0 ? (
        currentValue.map((item) => renderChip(item))
      ) : (
        <span className={styles.emptyValue}>N/A</span>
      )}
    </div>
  );

  return (
    <>
      <EditableFieldCard
        label={label}
        fieldResult={fieldResult}
        onSave={handleSaveList}
        onCancel={handleCancelList}
        onConfirm={handleConfirm}
        onRestore={handleRestore}
        onEdit={() => setIsModalOpen(true)}
        currentValueDisplay={displayList}
        isList
        disabled={disabled}
        isManual={isManual}
        revisionMode={revisionMode}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className={styles.tagList} style={{ alignItems: 'center' }}>
            {items.length > 0 ? (
              items.map((item, index) => renderChip(item, () => deleteItem(index)))
            ) : (
              <span className={styles.emptyValue} style={{ padding: '4px 0' }}>
                No industries selected.
              </span>
            )}
          </div>

          <div>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setIsModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
              }}
            >
              <Layers size={14} />
              <span>Select from Catalog / Propose New...</span>
            </button>
          </div>
        </div>
      </EditableFieldCard>

      <IndustrySelectionModal
        isOpen={isModalOpen}
        initialSelected={items}
        onSave={handleModalSave}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
