import React, { useState, useEffect } from 'react';
import type { ContractTypeSelection } from '../../types/contractResearch';
import { api } from '../../services/api';
import styles from './ContractResearchWorkbench.module.css';

interface Props {
  projectId: number;
  taskId: number;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    documentDate?: string | null;
    documentId: string;
    declaredContractType?: ContractTypeSelection | null;
  }) => Promise<void>;
}

interface RawDocumentOption {
  id: string;
  fileName?: string;
  originalName?: string;
  source?: { fileName?: string };
  storage?: { mimeType?: string };
}

export const CreateContractEntryModal: React.FC<Props> = ({
  projectId,
  taskId,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [declaredType, setDeclaredType] = useState<ContractTypeSelection>('AUTO_DETECT');
  const [documents, setDocuments] = useState<RawDocumentOption[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDocumentDate('');
      setDocumentId('');
      setDeclaredType('AUTO_DETECT');
      setError(null);
      fetchProjectDocuments();
    }
  }, [isOpen]);

  const fetchProjectDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const res = await api.get<any>(`/projects/${projectId}/documents`);
      const rawData = res.data;
      const docs = Array.isArray(rawData) ? rawData : rawData?.content || [];
      // Filter for PDF documents
      const pdfDocs = docs.filter((d: any) => {
        const name = d.fileName || d.originalName || (d.source && d.source.fileName) || '';
        return name.toLowerCase().endsWith('.pdf') || (d.storage && d.storage.mimeType === 'application/pdf');
      });
      setDocuments(pdfDocs.length > 0 ? pdfDocs : docs);
      if (pdfDocs.length > 0) {
        setDocumentId(pdfDocs[0].id);
        const autoTitle = (pdfDocs[0].fileName || pdfDocs[0].originalName || (pdfDocs[0].source && pdfDocs[0].source.fileName) || '')
          .replace(/\.pdf$/i, '');
        setTitle(autoTitle);
      }
    } catch (e: any) {
      console.warn('Failed to load project documents', e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDocumentChange = (selectedId: string) => {
    setDocumentId(selectedId);
    const doc = documents.find((d) => d.id === selectedId);
    if (doc && !title) {
      const autoTitle = (doc.fileName || doc.originalName || (doc.source && doc.source.fileName) || '')
        .replace(/\.pdf$/i, '');
      setTitle(autoTitle);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a contract title.');
      return;
    }
    if (!documentId) {
      setError('Please select a PDF document for extraction.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        documentDate: documentDate || null,
        documentId,
        declaredContractType: declaredType,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to create contract entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
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
            background: '#fafafa',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            Add Contract Entry
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
              Select Contract PDF Document *
            </label>
            {isLoadingDocs ? (
              <div style={{ fontSize: 12, color: '#64748b' }}>Loading documents...</div>
            ) : documents.length === 0 ? (
              <div style={{ fontSize: 12, color: '#dc2626' }}>
                No PDF documents found in this project. Please upload a PDF in the Project Documents tab first.
              </div>
            ) : (
              <select
                value={documentId}
                onChange={(e) => handleDocumentChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                }}
                required
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fileName || d.originalName || (d.source && d.source.fileName) || d.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
              Contract Title / Entry Label *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Thỏa thuận Hợp tác Đầu tư 2026"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Document / Signing Date
              </label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Declared Contract Type
              </label>
              <select
                value={declaredType}
                onChange={(e) => setDeclaredType(e.target.value as ContractTypeSelection)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  fontSize: 13,
                  background: '#ffffff',
                }}
              >
                <option value="AUTO_DETECT">🤖 Auto Detect (AI Classified)</option>
                <option value="COOPERATION_AGREEMENT">Cooperation Agreement</option>
                <option value="PARTNERSHIP_AGREEMENT">Partnership Agreement</option>
                <option value="JOINT_VENTURE_AGREEMENT">Joint Venture Agreement</option>
                <option value="BUSINESS_COOPERATION_CONTRACT">Business Cooperation Contract (BCC)</option>
              </select>
            </div>
          </div>

          <div
            style={{
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
            }}
          >
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary}`}
              disabled={isSubmitting || documents.length === 0}
            >
              {isSubmitting ? 'Creating...' : 'Create Contract Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
