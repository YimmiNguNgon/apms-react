import React, { useState } from 'react';
import { Edit3, Loader2, CheckCircle2, X, Building, Hash, User, MapPin, Percent, DollarSign, FileText, Quote, BookOpen } from 'lucide-react';
import styles from './EditModal.module.css';

interface Props {
  title: string;
  itemType: 'party' | 'sharing' | 'commitment' | 'rights_obligations' | 'generic';
  initialPayload: Record<string, any>;
  sourcePage?: number | null;
  evidence?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { itemPayload: Record<string, any>; evidence?: string | null; sourcePage?: number | null }) => Promise<void>;
}

export const EditArrayItemModal: React.FC<Props> = ({
  title,
  itemType,
  initialPayload,
  sourcePage: initialPage = 1,
  evidence: initialEvidence = '',
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [payload, setPayload] = useState<Record<string, any>>({ ...initialPayload });
  const [evidence, setEvidence] = useState<string>(initialEvidence || '');
  const [sourcePage, setSourcePage] = useState<number | string>(initialPage || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setPayload((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        itemPayload: payload,
        evidence: evidence.trim() || null,
        sourcePage: sourcePage ? Number(sourcePage) : 1,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <div className={styles.iconBadge}>
              <Edit3 size={18} />
            </div>
            <div className={styles.titleGroup}>
              <h3 className={styles.modalTitle}>{title}</h3>
              <p className={styles.modalSubtitle}>Update details and supporting evidence from source document</p>
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

            {/* Party Fields */}
            {itemType === 'party' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <Building size={14} className={styles.labelIcon} />
                    <span>Party Legal Name</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={payload.legalName || ''}
                    onChange={(e) => handleChange('legalName', e.target.value)}
                    placeholder="e.g., FPT Corporation"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <Hash size={14} className={styles.labelIcon} />
                      <span>Tax Code</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={payload.taxCode || ''}
                      onChange={(e) => handleChange('taxCode', e.target.value)}
                      placeholder="0101248141"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <FileText size={14} className={styles.labelIcon} />
                      <span>Role</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={payload.role || ''}
                      onChange={(e) => handleChange('role', e.target.value)}
                      placeholder="e.g., Partner / Party A"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <User size={14} className={styles.labelIcon} />
                    <span>Legal Representative</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={payload.representative || ''}
                    onChange={(e) => handleChange('representative', e.target.value)}
                    placeholder="e.g., Mr. John Doe - General Director"
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <MapPin size={14} className={styles.labelIcon} />
                    <span>Registered Address</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={payload.address || ''}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Registered business address..."
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Sharing / Distribution Fields */}
            {itemType === 'sharing' && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <Building size={14} className={styles.labelIcon} />
                    <span>Party Name</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={payload.party || ''}
                    onChange={(e) => handleChange('party', e.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <Percent size={14} className={styles.labelIcon} />
                      <span>Distribution Ratio (%)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className={styles.inputField}
                      value={payload.percentage !== undefined ? payload.percentage : ''}
                      onChange={(e) => handleChange('percentage', e.target.value)}
                      placeholder="e.g., 50"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      <DollarSign size={14} className={styles.labelIcon} />
                      <span>Fixed Amount (if any)</span>
                    </label>
                    <input
                      type="text"
                      className={styles.inputField}
                      value={payload.amount || ''}
                      onChange={(e) => handleChange('amount', e.target.value)}
                      placeholder="e.g., 1,000,000,000 VND"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FileText size={14} className={styles.labelIcon} />
                    <span>Distribution Terms (Condition / Note)</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={payload.condition || payload.note || ''}
                    onChange={(e) => handleChange('condition', e.target.value)}
                    placeholder="Conditions for profit/revenue sharing..."
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Commitment Fields */}
            {(itemType === 'commitment' || itemType === 'rights_obligations') && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <Building size={14} className={styles.labelIcon} />
                    <span>Responsible Party</span>
                  </label>
                  <input
                    type="text"
                    className={styles.inputField}
                    value={payload.party || ''}
                    onChange={(e) => handleChange('party', e.target.value)}
                    placeholder="Party name (or All Parties)"
                    disabled={isSubmitting}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <FileText size={14} className={styles.labelIcon} />
                    <span>Commitment / Obligation Details</span>
                    <span className={styles.requiredStar}>*</span>
                  </label>
                  <textarea
                    rows={3}
                    className={styles.textareaField}
                    value={payload.responsibility || payload.commitment || payload.description || ''}
                    onChange={(e) => {
                      if ('responsibility' in payload) handleChange('responsibility', e.target.value);
                      else if ('commitment' in payload) handleChange('commitment', e.target.value);
                      else handleChange('description', e.target.value);
                    }}
                    placeholder="Enter detailed commitment or obligation terms..."
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </>
            )}

            {/* Generic fallback */}
            {itemType === 'generic' && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  <FileText size={14} className={styles.labelIcon} />
                  <span>Item Content</span>
                </label>
                <textarea
                  rows={3}
                  className={styles.textareaField}
                  value={payload.value || payload.description || ''}
                  onChange={(e) => handleChange('value', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Source Page & Evidence */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <BookOpen size={14} className={styles.labelIcon} />
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
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Quote size={14} className={styles.labelIcon} />
                <span>Supporting Evidence</span>
              </label>
              <textarea
                rows={2}
                className={styles.textareaField}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Paste verbatim excerpt from document..."
                disabled={isSubmitting}
              />
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
