import React, { useState } from 'react';
import type { ExtractedContractField } from '../../types/contractResearch';
import { Edit3, Loader2, CheckCircle2, X, FileText, Hash, Quote, Calendar } from 'lucide-react';
import styles from './EditModal.module.css';

interface Props {
  fieldPath: string;
  fieldLabel: string;
  fieldData?: ExtractedContractField<any> | null;
  fieldType?: 'text' | 'date' | 'number';
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
    fieldLabel.toLowerCase().includes('ngày');
  const isNumberField = fieldType === 'number';

  const formatInitialValue = () => {
    if (!fieldData || fieldData.value === null || fieldData.value === undefined) {
      return '';
    }
    const raw =
      typeof fieldData.value === 'object' && 'amount' in fieldData.value
        ? String(fieldData.value.amount || '')
        : String(fieldData.value);

    if (isDateField && raw) {
      const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
      if (match) {
        return match[0];
      }
      const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      }
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
        setError('Vui lòng chọn ngày hợp lệ.');
        return;
      }
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(val) || isNaN(Date.parse(val))) {
        setError('Định dạng ngày không hợp lệ. Vui lòng chọn ngày hợp lệ (YYYY-MM-DD).');
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
              <h3 className={styles.modalTitle}>Chỉnh sửa: {fieldLabel}</h3>
              <p className={styles.modalSubtitle}>Cập nhật giá trị và trích dẫn bằng chứng từ văn bản</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            title="Đóng"
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
                <span>Giá trị trường (Field Value)</span>
                <span className={styles.requiredStar}>*</span>
              </label>
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
                placeholder={isDateField ? 'YYYY-MM-DD' : 'Nhập giá trị chính xác...'}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Hash size={14} className={styles.labelIcon} />
                <span>Số trang tài liệu gốc (Source Page)</span>
              </label>
              <input
                type="number"
                min={1}
                className={styles.inputField}
                value={sourcePage}
                onChange={(e) => setSourcePage(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ví dụ: 1"
              />
              <span className={styles.fieldHint}>Trang tài liệu PDF nơi thông tin này xuất hiện</span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Quote size={14} className={styles.labelIcon} />
                <span>Trích dẫn bằng chứng từ văn bản (Supporting Evidence)</span>
              </label>
              <textarea
                rows={3}
                className={styles.textareaField}
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Dán câu hoặc đoạn trích nguyên văn từ văn bản hợp đồng..."
                disabled={isSubmitting}
              />
              <span className={styles.fieldHint}>Đoạn trích nguyên văn để đối chiếu pháp lý khi kiểm tra</span>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={styles.btnSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className={styles.spinIcon} />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  <span>Lưu & Xác thực</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
