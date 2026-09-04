import React, { useState } from 'react';
import { api } from '../../services/api';
import { contractResearchApi } from '../../API/contractResearchApi';
import type { ContractResearchResponse } from '../../types/contractResearch';
import { FileUp, Loader2, X, FileText } from 'lucide-react';
import styles from '../FinancialResearch/FinancialResearchWorkbench.module.css';

interface Props {
  open: boolean;
  projectId: number;
  taskId: number;
  onClose: () => void;
  onSuccess: (updatedResearch: ContractResearchResponse, createdContractId?: string) => void;
}

export default function AddContractModal({ open, projectId, taskId, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!file) {
      setErrorMessage('Please select or upload a PDF contract file.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Please enter a contract title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('taskId', String(taskId));

      const uploadRes = await api.post<any>(`/projects/${projectId}/documents/upload`, formData);
      const dataObj = uploadRes.data?.data || uploadRes.data;
      const finalDocId = dataObj?.rawDocumentId || (dataObj?.id ? String(dataObj.id) : '');

      if (!finalDocId) {
        throw new Error('File uploaded successfully, but document ID was not returned.');
      }

      const today = new Date().toISOString().split('T')[0];
      const updated = await contractResearchApi.createContract(projectId, taskId, {
        title: title.trim(),
        documentId: finalDocId,
        documentDate: today,
        declaredContractType: 'COOPERATION_AGREEMENT',
      });

      // Find the newly created contract ID
      const newContract = updated.contracts?.[updated.contracts.length - 1];

      // Reset form
      setTitle('');
      setFile(null);

      onSuccess(updated, newContract?.id);
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to create contract entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setFile(droppedFile);
        if (!title) {
          setTitle(droppedFile.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
        }
      } else {
        setErrorMessage('Only PDF files are supported for contract extraction.');
      }
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.deleteConfirmModal}
        onClick={(e) => e.stopPropagation()}
        style={{ width: '560px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className={styles.deleteModalHead}>
          <div className={styles.deleteModalIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FileText size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
              Add Contract Document
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Upload a partner contract PDF to extract terms with AI
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 6, color: '#991b1b', fontSize: 13, marginBottom: 12 }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Upload Box */}
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              style={{
                border: isDragging ? '2px dashed #2563eb' : '2px dashed #cbd5e1',
                background: isDragging ? '#eff6ff' : '#f8fafc',
                borderRadius: 10,
                padding: '24px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
              onClick={() => document.getElementById('contract-file-input')?.click()}
            >
              <input
                id="contract-file-input"
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const f = e.target.files[0];
                    setFile(f);
                    if (!title) {
                      setTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
                    }
                  }
                }}
              />
              <FileUp size={28} color={file ? '#16a34a' : '#2563eb'} style={{ margin: '0 auto 8px' }} />
              {file ? (
                <div>
                  <strong style={{ fontSize: 13, color: '#0f172a' }}>{file.name}</strong>
                  <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>
                    Ready to upload ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              ) : (
                <div>
                  <strong style={{ fontSize: 13, color: '#334155' }}>
                    Click to browse or drag & drop contract PDF
                  </strong>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Supported format: PDF up to 50MB
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contract Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
              Contract Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Thỏa thuận Hợp tác Đầu tư và Phân phối 2026"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 8,
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div className={styles.deleteModalActions} style={{ marginTop: 12 }}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className={styles.spinIcon} />
                  Creating Entry...
                </>
              ) : (
                'Create Contract Entry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
