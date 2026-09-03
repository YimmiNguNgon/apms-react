import React, { useState } from 'react';
import type { ContractEntry, ContractType } from '../../types/contractResearch';
import styles from './ContractResearchWorkbench.module.css';

interface Props {
  contract: ContractEntry;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (confirmedType: ContractType) => Promise<void>;
}

export const TypeResolutionModal: React.FC<Props> = ({
  contract,
  isOpen,
  onClose,
  onResolve,
}) => {
  const [selectedType, setSelectedType] = useState<ContractType>(
    contract.detectedContractType && contract.detectedContractType !== 'UNKNOWN'
      ? contract.detectedContractType
      : contract.declaredContractType || 'COOPERATION_AGREEMENT'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (typeToConfirm: ContractType) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onResolve(typeToConfirm);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resolve contract type.');
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
          width: 540,
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
            background: '#fff7ed',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚠</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#9a3412' }}>
              Resolve Contract Type
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: 6, fontSize: 12, color: '#991b1b' }}>
              {error}
            </div>
          )}

          <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
            The declared contract type does not match the AI classification result, or requires human confirmation. Please confirm the correct subtype to proceed with structured clause extraction.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginBottom: 2 }}>Declared Type</span>
              <strong style={{ fontSize: 13, color: '#0f172a' }}>
                {contract.declaredContractType || 'Auto Detect'}
              </strong>
            </div>

            <div style={{ padding: 12, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
              <span style={{ fontSize: 11, color: '#1e40af', display: 'block', marginBottom: 2 }}>
                AI Detected Type ({contract.classificationConfidence ? `${(contract.classificationConfidence * 100).toFixed(0)}%` : '—'})
              </span>
              <strong style={{ fontSize: 13, color: '#1d4ed8' }}>
                {contract.detectedContractType || 'UNKNOWN'}
              </strong>
            </div>
          </div>

          {contract.classificationEvidence && (
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                AI Evidence Excerpt (Page {contract.classificationSourcePage || 1})
              </label>
              <div
                style={{
                  padding: '10px 12px',
                  background: '#fffbeb',
                  border: '1px solid #fef3c7',
                  borderRadius: 6,
                  fontSize: 12,
                  fontStyle: 'italic',
                  color: '#92400e',
                  lineHeight: 1.4,
                }}
              >
                "{contract.classificationEvidence}"
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Select Confirmed Contract Type *
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ContractType)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                background: '#ffffff',
                fontWeight: 600,
              }}
            >
              <option value="COOPERATION_AGREEMENT">Cooperation Agreement (Thỏa thuận Hợp tác)</option>
              <option value="PARTNERSHIP_AGREEMENT">Partnership Agreement (Thỏa thuận Đối tác Chiến lược)</option>
              <option value="JOINT_VENTURE_AGREEMENT">Joint Venture Agreement (Hợp đồng Liên doanh)</option>
              <option value="BUSINESS_COOPERATION_CONTRACT">Business Cooperation Contract (Hợp đồng BCC)</option>
            </select>
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
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => handleSubmit(selectedType)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Confirming & Extracting...' : 'Confirm Type & Extract'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
