import React, { useState, useEffect } from 'react';
import { contractResearchApi } from '../../API/contractResearchApi';
import type { ContractEntry, ContractResearchResponse } from '../../types/contractResearch';
import { Edit3, Loader2, X, Calendar, FileText } from 'lucide-react';
import styles from '../FinancialResearch/FinancialResearchWorkbench.module.css';

interface Props {
  open: boolean;
  contract: ContractEntry | null;
  projectId: number;
  taskId: number;
  onClose: () => void;
  onSuccess: (updatedResearch: ContractResearchResponse) => void;
}

export const EditContractModal: React.FC<Props> = ({
  open,
  contract,
  projectId,
  taskId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (contract && open) {
      setTitle(contract.title || '');
      setDocumentDate(contract.documentDate ? contract.documentDate.substring(0, 10) : '');
      setErrorMessage(null);
    }
  }, [contract, open]);

  if (!open || !contract) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tên / tiêu đề hợp đồng.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const updatedResearch = await contractResearchApi.updateContract(
        projectId,
        taskId,
        contract.id,
        {
          title: title.trim(),
          documentDate: documentDate || null,
        }
      );

      onSuccess(updatedResearch);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật hợp đồng.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1050,
      }}
    >
      <div
        style={{
          width: 520,
          background: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Edit3 size={18} color='#2563eb' />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Chỉnh sửa thông tin hợp đồng
            </h3>
          </div>
          <button
            type='button'
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {errorMessage && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                color: '#991b1b',
                fontSize: 13,
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Tên hợp đồng */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              <FileText size={14} color='#64748b' />
              Tên / Tiêu đề hợp đồng <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type='text'
              className={styles.formInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='VD: Hợp đồng hợp tác kinh doanh giữa A và B...'
              required
              disabled={isSubmitting}
              style={{ width: '100%', fontSize: 13.5 }}
            />
          </div>

          {/* Ngày tài liệu */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                marginBottom: 6,
              }}
            >
              <Calendar size={14} color='#64748b' />
              Ngày tài liệu / Ngày lập
            </label>
            <input
              type='date'
              className={styles.formInput}
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              disabled={isSubmitting}
              style={{ width: '100%', fontSize: 13.5 }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type='button'
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type='submit'
              className={styles.primaryButton}
              disabled={isSubmitting}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isSubmitting ? <Loader2 size={14} className={styles.spinIcon} /> : <Edit3 size={14} />}
              {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};