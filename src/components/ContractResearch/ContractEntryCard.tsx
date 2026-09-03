import React from 'react';
import type { ContractEntry } from '../../types/contractResearch';
import styles from './ContractResearchWorkbench.module.css';

interface Props {
  contract: ContractEntry;
  isSelected: boolean;
  isChecked: boolean;
  isCheckable: boolean;
  onSelect: () => void;
  onToggleCheck: (checked: boolean) => void;
  onDelete?: () => void;
}

export const ContractEntryCard: React.FC<Props> = ({
  contract,
  isSelected,
  isChecked,
  isCheckable,
  onSelect,
  onToggleCheck,
  onDelete,
}) => {
  const isMismatch = contract.typeValidationStatus === 'MISMATCH';
  const isCompanyMismatch = contract.companyMatchStatus === 'MISMATCH';
  const hasUnconfirmedCompany =
    (contract.companyMatchStatus === 'POSSIBLE_MATCH' || contract.companyMatchStatus === 'UNKNOWN') &&
    !contract.companyMatchConfirmed;

  return (
    <div
      className={`${styles.contractCard} ${isSelected ? styles.contractCardActive : ''}`}
      onClick={onSelect}
    >
      <div className={styles.contractCardHeader}>
        {isCheckable ? (
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleCheck(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div style={{ width: 13 }} />
        )}

        <div className={styles.contractCardBody}>
          <div className={styles.contractCardTitle} title={contract.title}>
            {contract.title}
          </div>

          <div className={styles.contractCardMeta}>
            <span>{contract.documentDate || 'No Date'}</span>
            <span>•</span>
            <span title={contract.documentName}>
              📄 {contract.documentName.length > 22
                ? contract.documentName.substring(0, 20) + '...'
                : contract.documentName}
            </span>
          </div>

          <div className={styles.contractCardBadges}>
            {/* Review Status Badge */}
            <span
              className={`${styles.statusBadge} ${
                contract.reviewStatus === 'APPROVED'
                  ? styles.statusApproved
                  : contract.reviewStatus === 'CHANGES_REQUESTED'
                  ? styles.statusChangesRequested
                  : contract.reviewStatus === 'PENDING_REVIEW'
                  ? styles.statusPendingReview
                  : styles.statusDraft
              }`}
            >
              {contract.reviewStatus === 'CHANGES_REQUESTED' ? 'Changes Req' : contract.reviewStatus}
            </span>

            {/* Contract Type Tag */}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#f1f5f9',
                color: '#334155',
              }}
            >
              {getContractTypeShort(contract.confirmedContractType || contract.detectedContractType || contract.declaredContractType)}
            </span>

            {/* Extraction Status */}
            {contract.extractionStatus === 'PROCESSING' && (
              <span className={`${styles.statusBadge} ${styles.statusProcessing}`}>
                {contract.extractionProgress}% AI
              </span>
            )}
            {contract.extractionStatus === 'FAILED' && (
              <span className={`${styles.statusBadge} ${styles.statusNeedsReview}`}>
                AI Failed
              </span>
            )}
          </div>

          {/* Warnings Bar */}
          {(isMismatch || isCompanyMismatch || hasUnconfirmedCompany) && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
              {isMismatch && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#c2410c',
                    background: '#ffedd5',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  ⚠ Type Mismatch
                </span>
              )}
              {isCompanyMismatch && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#b91c1c',
                    background: '#fee2e2',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  ✖ Company Mismatch
                </span>
              )}
              {hasUnconfirmedCompany && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#b45309',
                    background: '#fef3c7',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                >
                  Confirm Match
                </span>
              )}
            </div>
          )}
        </div>

        {onDelete && contract.reviewStatus === 'DRAFT' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete contract entry"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 14,
              padding: 2,
            }}
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
};

function getContractTypeShort(type?: string | null): string {
  if (!type) return 'AUTO';
  switch (type) {
    case 'COOPERATION_AGREEMENT':
      return 'Cooperation';
    case 'PARTNERSHIP_AGREEMENT':
      return 'Partnership';
    case 'JOINT_VENTURE_AGREEMENT':
      return 'Joint Venture';
    case 'BUSINESS_COOPERATION_CONTRACT':
      return 'BCC';
    default:
      return type;
  }
}
