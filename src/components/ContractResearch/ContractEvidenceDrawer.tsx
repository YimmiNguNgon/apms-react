import React from 'react';
import type {
  ContractFieldQualityStatus,
  ContractFieldVerificationStatus,
  ContractFieldInputMethod,
} from '../../types/contractResearch';
import styles from './ContractResearchWorkbench.module.css';

interface Props {
  fieldName: string;
  valueText: string | number | null;
  sourcePage?: number | null;
  evidence?: string | null;
  confidence?: number | null;
  qualityStatus: ContractFieldQualityStatus;
  verificationStatus: ContractFieldVerificationStatus;
  inputMethod?: ContractFieldInputMethod;
  isEditable?: boolean;
  onEdit?: () => void;
  onVerify?: () => void;
  onClose: () => void;
}

export const ContractEvidenceDrawer: React.FC<Props> = ({
  fieldName,
  valueText,
  sourcePage,
  evidence,
  confidence,
  qualityStatus,
  verificationStatus,
  inputMethod,
  isEditable = true,
  onEdit,
  onVerify,
  onClose,
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: 380,
        background: '#ffffff',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
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
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
            Evidence & Traceability
          </h3>
          <span style={{ fontSize: 12, color: '#64748b' }}>{fieldName}</span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: '#64748b',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: 20, flex: '1 1 0px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Value Box */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
            Current Value
          </label>
          <div
            style={{
              padding: '10px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              color: '#0f172a',
            }}
          >
            {valueText !== null && valueText !== undefined && valueText !== '' ? String(valueText) : 'N/A'}
          </div>
        </div>

        {/* Quality & Verification Status */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            className={`${styles.statusBadge} ${
              qualityStatus === 'VALID' ? styles.statusApproved : styles.statusNeedsReview
            }`}
          >
            {qualityStatus === 'VALID' ? '✓ Valid Confidence' : '⚠ Needs Review'}
          </span>
          <span
            className={`${styles.statusBadge} ${
              verificationStatus === 'VERIFIED' ? styles.statusApproved : styles.statusDraft
            }`}
          >
            {verificationStatus === 'VERIFIED' ? '✓ Verified by Staff' : 'Unverified'}
          </span>
          {inputMethod === 'MANUAL' && (
            <span className={`${styles.statusBadge} ${styles.statusPendingReview}`}>
              Manual Input
            </span>
          )}
        </div>

        {/* Source Page & Confidence */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>Source Page</span>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>
              {sourcePage ? `Page ${sourcePage}` : '—'}
            </strong>
          </div>
          <div style={{ padding: '8px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
            <span style={{ fontSize: 11, color: '#64748b', display: 'block' }}>AI Confidence</span>
            <strong style={{ fontSize: 13, color: '#0f172a' }}>
              {confidence ? `${(confidence * 100).toFixed(0)}%` : '—'}
            </strong>
          </div>
        </div>

        {/* Evidence Excerpt */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
            Original Document Excerpt
          </label>
          <div
            style={{
              padding: '12px 14px',
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: 6,
              fontSize: 12,
              fontStyle: 'italic',
              color: '#92400e',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {evidence ? `"${evidence}"` : 'No verbatim text evidence available.'}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      {isEditable && onVerify && (
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            background: '#fafafa',
          }}
        >
          {verificationStatus === 'VERIFIED' ? (
            <button
              className={styles.secondaryButton}
              style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fca5a5' }}
              onClick={onVerify}
            >
              Hủy xác thực trường này
            </button>
          ) : (
            <button className={`${styles.btn} ${styles.btnSuccess}`} onClick={onVerify}>
              ✓ Xác thực trường này
            </button>
          )}
        </div>
      )}
    </div>
  );
};
