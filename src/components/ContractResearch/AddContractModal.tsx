import React, { useState } from 'react';
import { api } from '../../services/api';
import { contractResearchApi } from '../../API/contractResearchApi';
import type { ContractResearchResponse } from '../../types/contractResearch';
import { FileUp, Loader2, X, FileText, Sparkles, Edit3 } from 'lucide-react';
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
  const [dataEntryMethod, setDataEntryMethod] = useState<'AI_EXTRACTION' | 'MANUAL'>('AI_EXTRACTION');
  
  // File upload state
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle('');
      setFile(null);
      setDataEntryMethod('AI_EXTRACTION');
      setErrorMessage(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (dataEntryMethod === 'AI_EXTRACTION' && !file) {
      setErrorMessage('Please select or upload a PDF contract file for AI Extraction.');
      return;
    }

    if (!title.trim()) {
      setErrorMessage('Please enter a contract title.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalDocId: string | null = null;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('taskId', String(taskId));

        const uploadRes = await api.post<any>(`/projects/${projectId}/documents/upload`, formData);
        const dataObj = uploadRes.data?.data || uploadRes.data;
        finalDocId = dataObj?.rawDocumentId || (dataObj?.id ? String(dataObj.id) : null);
      }

      const updated = await contractResearchApi.createContract(projectId, taskId, {
        title: title.trim(),
        documentId: finalDocId,
        documentDate: null,
        declaredContractType: 'COOPERATION_AGREEMENT',
        dataEntryMethod,
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
              {dataEntryMethod === 'AI_EXTRACTION' ? 'Add Contract Document (AI Extraction)' : 'Add Contract (Manual Entry)'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              {dataEntryMethod === 'AI_EXTRACTION'
                ? 'Upload a partner contract PDF to extract terms with AI'
                : 'Enter contract terms manually (reference PDF is optional)'}
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
          {/* 1. Contract Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>
              Contract Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Strategic Investment and Distribution Agreement 2026"
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

          {/* 2. Method Switcher Cards */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6, display: 'block' }}>
              Data Entry Method *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div
                onClick={() => {
                  setDataEntryMethod('AI_EXTRACTION');
                  setErrorMessage(null);
                }}
                style={{
                  border: dataEntryMethod === 'AI_EXTRACTION' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: dataEntryMethod === 'AI_EXTRACTION' ? '#eff6ff' : '#ffffff',
                  borderRadius: 8,
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ marginTop: 2, color: dataEntryMethod === 'AI_EXTRACTION' ? '#2563eb' : '#64748b' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: dataEntryMethod === 'AI_EXTRACTION' ? '#1e40af' : '#1e293b' }}>
                    AI Extraction
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Upload source PDF and extract contract terms automatically
                  </div>
                </div>
              </div>

              <div
                onClick={() => {
                  setDataEntryMethod('MANUAL');
                  setErrorMessage(null);
                }}
                style={{
                  border: dataEntryMethod === 'MANUAL' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: dataEntryMethod === 'MANUAL' ? '#eff6ff' : '#ffffff',
                  borderRadius: 8,
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ marginTop: 2, color: dataEntryMethod === 'MANUAL' ? '#2563eb' : '#64748b' }}>
                  <Edit3 size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: dataEntryMethod === 'MANUAL' ? '#1e40af' : '#1e293b' }}>
                    Manual Entry
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    Enter contract fields manually; reference PDF is optional
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Upload Box */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block' }}>
                {dataEntryMethod === 'AI_EXTRACTION' ? 'Source Contract PDF *' : 'Reference Contract PDF (Optional)'}
              </label>
              {file && dataEntryMethod === 'MANUAL' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '0 4px',
                  }}
                >
                  Remove attached file
                </button>
              )}
            </div>
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
                padding: '20px 16px',
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
                    Ready to {dataEntryMethod === 'MANUAL' ? 'attach' : 'upload'} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              ) : (
                <div>
                  <strong style={{ fontSize: 13, color: '#334155' }}>
                    {dataEntryMethod === 'AI_EXTRACTION'
                      ? 'Click to browse or drag & drop contract PDF *'
                      : 'Click to attach reference PDF (Optional)'}
                  </strong>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    {dataEntryMethod === 'AI_EXTRACTION'
                      ? 'Required for AI Extraction • PDF up to 50MB'
                      : 'Không có tài liệu tham khảo? Bạn có thể tiếp tục tạo hợp đồng thủ công.'}
                  </div>
                </div>
              )}
            </div>
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
              ) : dataEntryMethod === 'MANUAL' ? (
                'Create Manual Contract'
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
