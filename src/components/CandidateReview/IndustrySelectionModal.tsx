import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Search, X, Plus, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  useIndustryCatalog,
  normalizeIndustryName,
  cleanIndustryDisplayName,
} from '../../API/industryApi';
import styles from './IndustrySelectionModal.module.css';

export interface IndustrySelectionModalProps {
  isOpen: boolean;
  initialSelected: string[];
  onSave: (selected: string[]) => void;
  onClose: () => void;
}

export const IndustrySelectionModal: React.FC<IndustrySelectionModalProps> = ({
  isOpen,
  initialSelected,
  onSave,
  onClose,
}) => {
  const { catalog, loading, findCatalogMatch } = useIndustryCatalog();

  const [selectedCatalog, setSelectedCatalog] = useState<Set<string>>(new Set());
  const [proposedList, setProposedList] = useState<string[]>([]);
  const [isOtherChecked, setIsOtherChecked] = useState<boolean>(false);
  const [otherInput, setOtherInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const otherInputRef = useRef<HTMLInputElement>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize state when modal opens or initialSelected/catalog changes
  useEffect(() => {
    if (!isOpen) return;

    const catalogSet = new Set<string>();
    const proposed: string[] = [];

    (initialSelected || []).forEach((rawItem) => {
      const trimmed = cleanIndustryDisplayName(rawItem);
      if (!trimmed) return;

      const match = findCatalogMatch(trimmed);
      if (match) {
        catalogSet.add(match.name);
      } else {
        const isDuplicateProposed = proposed.some(
          (p) => normalizeIndustryName(p) === normalizeIndustryName(trimmed)
        );
        if (!isDuplicateProposed) {
          proposed.push(trimmed);
        }
      }
    });

    setSelectedCatalog(catalogSet);
    setProposedList(proposed);
    setIsOtherChecked(proposed.length > 0);
    setOtherInput('');
    setSearchQuery('');
    setValidationError(null);
    setFeedbackNotice(null);
  }, [isOpen, initialSelected, catalog, findCatalogMatch]);

  const showFeedback = (msg: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedbackNotice(msg);
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackNotice(null);
    }, 4000);
  };

  const filteredCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((item) => item.name.toLowerCase().includes(q));
  }, [catalog, searchQuery]);

  const handleToggleCatalogItem = (name: string) => {
    setSelectedCatalog((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleOtherToggle = (checked: boolean) => {
    setIsOtherChecked(checked);
    setValidationError(null);
    if (!checked) {
      setProposedList([]);
      setOtherInput('');
    } else {
      setTimeout(() => otherInputRef.current?.focus(), 50);
    }
  };

  const handleAddOther = () => {
    const clean = cleanIndustryDisplayName(otherInput);
    if (!clean) {
      setValidationError('Please enter an industry name.');
      otherInputRef.current?.focus();
      return;
    }

    if (clean.length > 100) {
      setValidationError('Industry name cannot exceed 100 characters.');
      otherInputRef.current?.focus();
      return;
    }

    // Check if it matches an existing catalog item
    const match = findCatalogMatch(clean);
    if (match) {
      setSelectedCatalog((prev) => new Set(prev).add(match.name));
      setOtherInput('');
      setValidationError(null);
      showFeedback(`Resolved to existing catalog industry "${match.name}".`);
      return;
    }

    // Check if it's already in the proposed list
    const isDuplicate = proposedList.some(
      (p) => normalizeIndustryName(p) === normalizeIndustryName(clean)
    );
    if (isDuplicate) {
      setValidationError(`"${clean}" has already been proposed.`);
      otherInputRef.current?.focus();
      return;
    }

    setProposedList((prev) => [...prev, clean]);
    setOtherInput('');
    setValidationError(null);
    showFeedback(`Added "${clean}" as proposed custom industry.`);
    otherInputRef.current?.focus();
  };

  const handleRemoveProposed = (index: number) => {
    setProposedList((prev) => prev.filter((_, i) => i !== index));
    setValidationError(null);
  };

  const handleOtherKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOther();
    }
  };

  const handleSave = () => {
    const combined = [...Array.from(selectedCatalog), ...proposedList];
    onSave(combined);
    onClose();
  };

  if (!isOpen) return null;

  const totalSelected = selectedCatalog.size + proposedList.length;

  return ReactDOM.createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h3 className={styles.headerTitle}>Select Industries</h3>
            <p className={styles.headerSubtitle}>
              Select canonical industries from the catalog, or propose a new industry under Other.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {/* Search bar */}
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search industries in catalog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Catalog Checkbox List */}
          <div>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Existing Catalog Industries</span>
              <span className={styles.countBadge}>{selectedCatalog.size} selected</span>
            </div>

            <div className={styles.catalogList}>
              {loading ? (
                <div className={styles.emptyCatalogText}>Loading industries...</div>
              ) : filteredCatalog.length === 0 ? (
                <div className={styles.emptyCatalogText}>
                  {searchQuery ? 'No matching industries found in catalog.' : 'No industries available in catalog.'}
                </div>
              ) : (
                filteredCatalog.map((item) => {
                  const isChecked = selectedCatalog.has(item.name);
                  return (
                    <label
                      key={item.id || item.name}
                      className={`${styles.catalogItem} ${isChecked ? styles.catalogItemChecked : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={isChecked}
                        onChange={() => handleToggleCatalogItem(item.name)}
                      />
                      <span className={styles.catalogItemName}>{item.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <hr className={styles.divider} />

          {/* Other / Propose New Section */}
          <div className={styles.otherSection}>
            <label className={styles.otherToggle}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={isOtherChecked}
                onChange={(e) => handleOtherToggle(e.target.checked)}
              />
              <span>Other (Propose new industry)</span>
            </label>
            <div className={styles.otherDescription}>
              Propose new industries not currently listed. Proposed items remain candidate-local until final Manager approval.
            </div>

            {isOtherChecked && (
              <div className={styles.otherContent}>
                <div className={styles.otherInputRow}>
                  <input
                    ref={otherInputRef}
                    type="text"
                    className={`${styles.otherInput} ${validationError ? styles.otherInputError : ''}`}
                    placeholder="Enter industry name..."
                    value={otherInput}
                    onChange={(e) => {
                      setOtherInput(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    onKeyDown={handleOtherKeyDown}
                    maxLength={100}
                  />
                  <button
                    type="button"
                    className={styles.btnAddOther}
                    onClick={handleAddOther}
                    disabled={!otherInput.trim()}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {validationError && (
                  <div className={styles.errorMessage}>
                    <AlertCircle size={14} />
                    <span>{validationError}</span>
                  </div>
                )}

                {feedbackNotice && (
                  <div className={styles.feedbackNotice}>
                    <CheckCircle2 size={14} />
                    <span>{feedbackNotice}</span>
                  </div>
                )}

                {proposedList.length > 0 && (
                  <div className={styles.proposedChipsWrapper}>
                    <span className={styles.proposedChipsLabel}>
                      Proposed Industries ({proposedList.length}):
                    </span>
                    <div className={styles.chipsContainer}>
                      {proposedList.map((item, idx) => (
                        <span key={idx} className={styles.proposedChip}>
                          <span>{item}</span>
                          <span className={styles.newBadge}>NEW</span>
                          <button
                            type="button"
                            className={styles.chipRemoveBtn}
                            onClick={() => handleRemoveProposed(idx)}
                            title={`Remove ${item}`}
                            aria-label={`Remove ${item}`}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.footerStats}>
            Total: <strong>{totalSelected}</strong> selected ({selectedCatalog.size} catalog,{' '}
            {proposedList.length} proposed)
          </div>
          <div className={styles.footerActions}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={styles.btnSave} onClick={handleSave}>
              <Check size={14} /> Save Selection ({totalSelected})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
