import React from 'react';
import { CheckCircle2, FileText, Loader2, RefreshCw, Sparkles, Trash2, Edit3 } from 'lucide-react';
import type { ContractEntry } from '../../types/contractResearch';
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
}) => {
  const isExtracting = contract.extractionStatus === 'PROCESSING';
  const isOtherExtracting = Boolean(isAnyExtracting && !isExtracting);
  const isExtracted = contract.extractionStatus === 'COMPLETED';
  const isFailed = contract.extractionStatus === 'FAILED';
  const isApproved = contract.reviewStatus === 'APPROVED';
  const canEditCard = canEdit && !isApproved;

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
      className={`${styles.reportCard} ${selected ? styles.reportCardSelected : ''}`}
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
        ) : contract.reviewStatus === 'PENDING_REVIEW' ? (
          <span className={styles.statusBadge} style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: 11.5 }}>
            ● In Review
          </span>
        ) : isManagerMode ? (
          contract.reviewStatus === 'CHANGES_REQUESTED' ? (
            <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
              ● Changes Requested
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
              ● Draft
            </span>
          )
        ) : !hasMultipleContracts ? (
          /* Single contract in project: No checkbox needed! */
          contract.reviewStatus === 'CHANGES_REQUESTED' ? (
            <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
              ● Changes Requested
            </span>
          ) : (
            <span className={styles.statusBadge} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11.5 }}>
              ● Ready to Submit
            </span>
          )
        ) : (
          /* Multiple contracts in project: Show checkbox to select, plus tag if CHANGES_REQUESTED */
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <label
              className={styles.cardSelectLabel}
              onClick={stop}
              title={
                !isEligible
                  ? 'Extract this contract before adding to submission package.'
                  : 'Select this contract for Manager submission'
              }
            >
              <input
                type="checkbox"
                checked={selectedForSubmission}
                disabled={!canEditCard || !isEligible || isOtherExtracting}
                onChange={handleSelectionChange}
                aria-label={`Select ${contract.title} to submit`}
              />
              <span>Submit</span>
            </label>

            {contract.reviewStatus === 'CHANGES_REQUESTED' && (
              <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`} style={{ padding: '2px 7px', fontSize: 10.5 }}>
                ● Changes Requested
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {canEditCard && onEdit && (
            <button
              className={styles.cardDeleteBtn}
              type="button"
              onClick={(event) => {
                stop(event);
                if (isOtherExtracting) return;
                onEdit(contract);
              }}
              disabled={isExtracting || isOtherExtracting}
              aria-label={`Edit ${contract.title}`}
              title={isOtherExtracting ? 'Another document is being processed by AI' : 'Edit contract details'}
              style={isOtherExtracting ? { opacity: 0.4, cursor: 'not-allowed' } : { color: '#2563eb' }}
            >
              <Edit3 size={14} />
            </button>
          )}

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
      {contract.documentName && (
        <p style={{ margin: '2px 0 0', fontSize: 11.5, color: '#64748b' }}>
          File: {contract.documentName}
        </p>
      )}

      {/* Changes Requested Feedback */}
      {contract.reviewStatus === 'CHANGES_REQUESTED' && (
        <div className={styles.cardFeedbackBox}>
          <strong>Manager Review Feedback</strong>
          <p>{contract.reviewComment || 'Manager requested revisions for this contract.'}</p>
          <small>
            {contract.reviewedByName || 'Manager'}
            {contract.reviewedAt ? ` • ${formatDate(contract.reviewedAt)}` : ''}
          </small>
        </div>
      )}

      {/* View Source PDF Link */}
      {contract.documentId && (
        <button
          className={styles.cardPdfLink}
          type="button"
          disabled={isOtherExtracting}
          onClick={(event) => {
            stop(event);
            if (isOtherExtracting) return;
            onViewPdf(contract.documentId);
          }}
          style={isOtherExtracting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          title={isOtherExtracting ? 'Another document is being processed by AI. Please wait for completion.' : undefined}
        >
          <FileText size={14} />
          View Original PDF
        </button>
      )}

      {/* Card Footer */}
      <div className={styles.cardFooter}>
        <div
          className={`${styles.cardStatus} ${
            isExtracted
              ? styles.cardStatusSuccess
              : isFailed
              ? styles.cardStatusError
              : isExtracting
              ? styles.cardStatusExtracting
              : ''
          }`}
        >
          {isExtracting ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                  <Loader2 size={12} className={styles.spinIcon} />
                  <span>Extracting...</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb' }}>
                  {contract.extractionProgress || 35}%
                </span>
              </div>
              <div style={{ width: '100%', height: 4, background: '#dbeafe', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.max(contract.extractionProgress || 35, 10)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #2563eb, #38bdf8)',
                    borderRadius: 999,
                    transition: 'width 0.35s ease',
                  }}
                />
              </div>
            </div>
          ) : isFailed ? (
            <span>Extraction Failed</span>
          ) : isExtracted ? (
            <>
              <CheckCircle2 size={14} />
              <span>{clauseCount} extracted fields</span>
            </>
          ) : (
            <span style={{ color: '#64748b' }}>Not Extracted</span>
          )}
        </div>

        {canEditCard && (
          isExtracted ? (
            <button
              className={styles.cardExtractBtn}
              type="button"
              disabled={isOtherExtracting}
              onClick={(event) => {
                stop(event);
                if (isOtherExtracting) return;
                onSelect(contract.id);
                onReExtract(contract.id);
              }}
              style={isOtherExtracting ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
              title={isOtherExtracting ? 'Another document is being processed by AI. Please wait for completion.' : 'Re-extract contract data with AI'}
            >
              <RefreshCw size={12} />
              Re-extract
            </button>
          ) : !isExtracting && (
            <button
              className={styles.cardExtractBtn}
              type="button"
              disabled={isOtherExtracting}
              onClick={(event) => {
                stop(event);
                if (isOtherExtracting) return;
                onSelect(contract.id);
                onExtract(contract.id);
              }}
              style={isOtherExtracting ? { opacity: 0.5, cursor: 'not-allowed' } : { color: '#2563eb', fontWeight: 600 }}
              title={isOtherExtracting ? 'Another document is being processed by AI. Please wait for completion.' : 'Extract contract terms with AI'}
            >
              <Sparkles size={12} />
              {isFailed ? 'Retry' : 'Extract'}
            </button>
          )
        )}
      </div>
    </article>
  );
};
