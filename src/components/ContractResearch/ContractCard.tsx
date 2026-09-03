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
}

const formatContractType = (type?: string | null) => {
  if (!type || type === 'UNKNOWN' || type === 'AUTO_DETECT') return 'Auto Detect';
  if (type === 'COOPERATION_AGREEMENT') return 'Thỏa thuận hợp tác';
  if (type === 'PARTNERSHIP_AGREEMENT') return 'Đối tác chiến lược';
  if (type === 'JOINT_VENTURE_AGREEMENT') return 'Liên doanh (JVA)';
  if (type === 'BUSINESS_COOPERATION_CONTRACT') return 'Hợp tác KD (BCC)';
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
}) => {
  const isExtracting = contract.extractionStatus === 'PROCESSING';
  const isExtracted = contract.extractionStatus === 'COMPLETED';
  const isFailed = contract.extractionStatus === 'FAILED';
  const isApproved = contract.reviewStatus === 'APPROVED';
  const canEditCard = canEdit && !isApproved;

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  const handleSelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    if (canEdit && isEligible && onToggleSelection) {
      onToggleSelection(contract.id);
    }
  };

  const typeLabel = formatContractType(contract.confirmedContractType || contract.declaredContractType);

  return (
    <article
      className={`${styles.reportCard} ${selected ? styles.reportCardSelected : ''}`}
      onClick={() => onSelect(contract.id)}
      aria-current={selected ? 'true' : undefined}
    >
      {isExtracting && <div className={styles.extractingBar} />}

      {/* Top Row: Checkbox / Approved Badge + Delete */}
      <div className={styles.cardTopRow}>
        {isApproved ? (
          <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
            <CheckCircle2 size={12} />
            Đã phê duyệt
          </span>
        ) : contract.reviewStatus === 'PENDING_REVIEW' ? (
          <span className={styles.statusBadge} style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', fontSize: 11.5 }}>
            ● Chờ duyệt
          </span>
        ) : isManagerMode ? (
          contract.reviewStatus === 'CHANGES_REQUESTED' ? (
            <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
              ● Cần sửa lại
            </span>
          ) : (
            <span className={`${styles.statusBadge} ${styles.statusDraft}`}>
              ● Bản nháp
            </span>
          )
        ) : !hasMultipleContracts ? (
          /* Single contract in project: No checkbox needed! */
          contract.reviewStatus === 'CHANGES_REQUESTED' ? (
            <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`}>
              ● Cần sửa lại
            </span>
          ) : (
            <span className={styles.statusBadge} style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontSize: 11.5 }}>
              ● Sẵn sàng nộp
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
                  ? 'Bóc tách hợp đồng này trước khi thêm vào danh sách nộp.'
                  : 'Chọn hợp đồng này để nộp cho Manager'
              }
            >
              <input
                type="checkbox"
                checked={selectedForSubmission}
                disabled={!canEditCard || !isEligible}
                onChange={handleSelectionChange}
                aria-label={`Chọn ${contract.title} để nộp`}
              />
              <span>Submit</span>
            </label>

            {contract.reviewStatus === 'CHANGES_REQUESTED' && (
              <span className={`${styles.statusBadge} ${styles.statusChangesRequested}`} style={{ padding: '2px 7px', fontSize: 10.5 }}>
                ● Cần sửa
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
                onEdit(contract);
              }}
              disabled={isExtracting}
              aria-label={`Edit ${contract.title}`}
              title="Chỉnh sửa thông tin hợp đồng"
              style={{ color: '#2563eb' }}
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
                onDelete(contract);
              }}
              disabled={isExtracting}
              aria-label={`Delete ${contract.title}`}
              title="Delete contract"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Meta Row */}
      <div className={styles.cardMetaRow}>
        <span>{formatDate(contract.documentDate || contract.createdAt)}</span>
      </div>

      {/* Title */}
      <h4 className={styles.cardTitle}>{contract.title}</h4>

      {/* Changes Requested Feedback */}
      {contract.reviewStatus === 'CHANGES_REQUESTED' && (
        <div className={styles.cardFeedbackBox}>
          <strong>Ý kiến phản hồi từ Manager</strong>
          <p>{contract.reviewComment || 'Manager yêu cầu chỉnh sửa hợp đồng này.'}</p>
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
          onClick={(event) => {
            stop(event);
            onViewPdf(contract.documentId);
          }}
        >
          <FileText size={14} />
          Xem PDF gốc
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
            <>
              <Loader2 size={14} className={styles.spinIcon} />
              <span>Đang trích xuất...</span>
            </>
          ) : isFailed ? (
            <span>Trích xuất lỗi</span>
          ) : isExtracted ? (
            <>
              <CheckCircle2 size={14} />
              <span>{clauseCount} trường trích xuất</span>
            </>
          ) : (
            <span style={{ color: '#64748b' }}>Chưa trích xuất</span>
          )}
        </div>

        {canEditCard && (
          isExtracted ? (
            <button
              className={styles.cardExtractBtn}
              type="button"
              onClick={(event) => {
                stop(event);
                onReExtract(contract.id);
              }}
              title="Trích xuất lại dữ liệu hợp đồng bằng AI"
            >
              <RefreshCw size={12} />
              Trích xuất lại
            </button>
          ) : !isExtracting && (
            <button
              className={styles.cardExtractBtn}
              type="button"
              onClick={(event) => {
                stop(event);
                onExtract(contract.id);
              }}
              style={{ color: '#2563eb', fontWeight: 600 }}
              title="Bóc tách thông tin hợp đồng bằng AI"
            >
              <Sparkles size={12} />
              {isFailed ? 'Thử lại' : 'Bóc tách'}
            </button>
          )
        )}
      </div>
    </article>
  );
};
