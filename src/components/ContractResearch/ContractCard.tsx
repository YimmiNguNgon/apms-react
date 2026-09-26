import { CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import type { ContractEntry } from '../../types/contractResearch';
import { isContractEditableByStaff, isContractChangesRequested } from './contractEditability';
import styles from '../FinancialResearch/FinancialResearchWorkbench.module.css';

interface Props {
  contract: ContractEntry;
  selected?: boolean;
  selectedForSubmission?: boolean;
  isEligible?: boolean;
  canEdit?: boolean;
  isManagerMode?: boolean;
  hasMultipleContracts?: boolean;
  clauseCount: number;
  needsReviewCount: number;
  onSelect: (contractId: string) => void;
  onToggleSelection?: (contractId: string) => void;
  onExtract: (contractId: string) => void;
  onReExtract: (contractId: string) => void;
  onDelete: (contract: ContractEntry) => void;
  onEdit?: (contract: ContractEntry) => void;
  onViewPdf: (documentId: string) => void;
  isAnyExtracting?: boolean;
  hasTopReviewBanner?: boolean;
}

const formatContractType = (type?: string | null) => {
  if (!type || type === 'UNKNOWN' || type === 'AUTO_DETECT') return 'Auto Detect';
  if (type === 'COOPERATION_AGREEMENT') return 'Cooperation Agreement';
  if (type === 'PARTNERSHIP_AGREEMENT') return 'Strategic Partnership';
  if (type === 'JOINT_VENTURE_AGREEMENT') return 'Joint Venture (JVA)';
  if (type === 'BUSINESS_COOPERATION_CONTRACT') return 'Business Cooperation (BCC)';
  return type.replace(/_/g, ' ');
};

const formatDate = (value?: string | null) => {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
};

export const ContractCard: React.FC<Props> = ({
  contract,
  selected = false,
  selectedForSubmission = false,
  isEligible = false,
  canEdit = true,
  isManagerMode = false,
  hasMultipleContracts = false,
  clauseCount,
  onSelect,
  onToggleSelection,
  onExtract,
  onReExtract,
  onDelete,
  onEdit,
  onViewPdf,
  isAnyExtracting = false,
  hasTopReviewBanner = false,
}) => {
  const isExtracting = contract.extractionStatus === 'PROCESSING';
  const isOtherExtracting = Boolean(isAnyExtracting && !isExtracting);
  const isExtracted = contract.extractionStatus === 'COMPLETED';
  const isFailed = contract.extractionStatus === 'FAILED';
  const isApproved = contract.reviewStatus === 'APPROVED';
  const requiresRevision = isContractChangesRequested(contract);
  const canEditCard = Boolean(canEdit && !isManagerMode && isContractEditableByStaff(contract));

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (canEdit && isEligible && onToggleSelection && !isOtherExtracting) {
      onToggleSelection(contract.id);
    }
  };

  const typeLabel = formatContractType(contract.confirmedContractType || contract.declaredContractType);

  return (
    <article
      className={`${styles.reportCard} ${
        requiresRevision
          ? selected
            ? styles.reportCardChangesRequestedSelected
            : styles.reportCardChangesRequested
          : selected
          ? styles.reportCardSelected
          : ''
      }`}
      onClick={() => {
        if (isOtherExtracting) return;
        onSelect(contract.id);
      }}
      style={isOtherExtracting ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
      title={isOtherExtracting ? 'Another document is being processed by AI. Please wait for completion.' : undefined}
      aria-current={selected ? 'true' : undefined}
    >
      {isExtracting && <div className={styles.extractingBar} />}

      {/* Top Row: Checkbox / Approved Badge + Delete */}
      <div className={styles.cardTopRow}>
        {isApproved ? (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <CheckCircle2 size={12} />
            Approved
          </span>
        ) : (!isEligible && (contract.reviewStatus === 'PENDING_REVIEW' || (!contract.reviewStatus && isManagerMode))) ? (
          <span className={`${styles.statusBadge} ${styles.statusPendingReview}`}>
            ● Pending Review
          </span>
        ) : isManagerMode ? (
          requiresRevision ? (
            <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
              <AlertTriangle size={12} />
              Changes Requested
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
              ● Draft
            </span>
          )
        ) : (
          /* Checkbox to select for submission, plus tag if CHANGES_REQUESTED or PENDING_REVIEW */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <label
              className={styles.cardSelectLabel}
              onClick={stop}
              title={
                !isEligible
                  ? 'Extract this contract before adding to submission package.'
                  : 'Include this contract for review'
              }
            >
              <input
                type="checkbox"
                checked={selectedForSubmission}
                disabled={!canEditCard || !isEligible || isOtherExtracting}
                onChange={handleSelectionChange}
                aria-label={`Include ${contract.title || 'Contract'} for review`}
              />
              <span>Include for review</span>
            </label>

            {requiresRevision ? (
              <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
                <AlertTriangle size={12} />
                Changes Requested
              </span>
            ) : contract.reviewStatus === 'PENDING_REVIEW' ? (
              <span className={`${styles.statusBadge} ${styles.statusPendingReview}`}>
                ● Pending Review
              </span>
            ) : null}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {canEditCard && contract.reviewStatus === 'DRAFT' && (
            <button
              className={styles.cardDeleteBtn}
              type="button"
              onClick={(event) => {
                stop(event);
                if (isOtherExtracting) return;
                onDelete(contract);
              }}
              disabled={isExtracting || isOtherExtracting}
              aria-label={`Delete ${contract.title}`}
              title={isOtherExtracting ? 'Another document is being processed by AI' : 'Delete contract'}
              style={isOtherExtracting ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Meta Row */}
      <div className={styles.cardMetaRow}>
        <span>
          {typeLabel} • {formatDate(contract.createdAt)}
        </span>
      </div>

      {/* Contract Title & Number */}
      <h4 className={styles.cardTitle}>{contract.title}</h4>

      {requiresRevision && (
        <div className={styles.cardRevisionNotice}>
          <AlertTriangle size={12} />
          <span>Manager requested revisions</span>
        </div>
      )}
    </article>
  );
};
