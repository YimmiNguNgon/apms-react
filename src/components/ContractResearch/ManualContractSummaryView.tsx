import React from 'react';
import type { ContractEntry } from '../../types/contractResearch';
import {
  FileText,
  FileUp,
  Calendar,
  Users,
  Edit3,
  AlertTriangle,
  FileCheck2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import styles from '../FinancialResearch/FinancialResearchWorkbench.module.css';
import contractStyles from './ContractResearchWorkbench.module.css';

interface Props {
  contract: ContractEntry;
  canEdit?: boolean;
  onEdit?: () => void;
  onViewPdf?: (documentId?: string | null) => void;
  onReplaceFile?: (file: File) => Promise<void> | void;
  isReplacingFile?: boolean;
}

export const ManualContractSummaryView: React.FC<Props> = ({
  contract,
  canEdit = false,
  onEdit,
  onViewPdf,
  onReplaceFile,
  isReplacingFile = false,
}) => {
  const common = contract.commonData;

  const formatDate = (val?: string | null) => {
    if (!val) return 'N/A';
    try {
      const parts = String(val).split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return String(val);
    } catch {
      return String(val);
    }
  };

  const formatNumeric = (val?: number | string | null) => {
    if (val == null || val === '') return 'N/A';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const renderValueOrNa = (value?: string | number | null) => {
    if (value == null || String(value).trim() === '' || String(value).trim().toUpperCase() === 'N/A') {
      return <span style={{ fontSize: 13, fontWeight: 500, color: '#64748b' }}>N/A</span>;
    }
    return <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0f172a', lineHeight: 1.45 }}>{value}</span>;
  };

  // Contract Value calculation
  const cv = common?.contractValue?.value;
  const hasAmount = cv?.amount != null;
  const rawText = cv?.rawAmountText ? cv.rawAmountText.trim() : '';
  const cvDisplay = hasAmount
    ? `${formatNumeric(cv.amount)} ${cv.currency || 'VND'}`
    : rawText || 'N/A';

  // Governing Law parts
  const governingLawVal = common?.governingLaw?.value || '';
  const lawParts = governingLawVal
    ? governingLawVal.split('|').map((s) => s.trim()).filter(Boolean)
    : [];

  const parties = common?.parties || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Descriptive Context Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={16} color="#2563eb" />
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
            Hợp đồng nhập thủ công • {parties.length} bên tham gia
          </span>
        </div>

        {contract.documentId ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {onViewPdf && (
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => onViewPdf(contract.documentId)}
                style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <FileText size={13} />
                {contract.documentName || 'View Reference PDF'}
              </button>
            )}
            {canEdit && onReplaceFile && (
              <label
                className={styles.secondaryButton}
                style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: isReplacingFile ? 'not-allowed' : 'pointer' }}
                title="Thay đổi tài liệu PDF tham khảo"
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  style={{ display: 'none' }}
                  disabled={isReplacingFile}
                  onChange={async (e) => {
                    if (e.target.files?.[0]) {
                      await onReplaceFile(e.target.files[0]);
                      e.target.value = '';
                    }
                  }}
                />
                {isReplacingFile ? <Loader2 size={12} className={styles.spinIcon} /> : <RefreshCw size={12} />}
                <span>{isReplacingFile ? 'Đang thay đổi...' : 'Thay đổi PDF'}</span>
              </label>
            )}
          </div>
        ) : canEdit && onReplaceFile ? (
          <label
            className={styles.secondaryButton}
            style={{ padding: '4px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, cursor: isReplacingFile ? 'not-allowed' : 'pointer' }}
            title="Đính kèm tài liệu PDF tham khảo"
          >
            <input
              type="file"
              accept="application/pdf,.pdf"
              style={{ display: 'none' }}
              disabled={isReplacingFile}
              onChange={async (e) => {
                if (e.target.files?.[0]) {
                  await onReplaceFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
            {isReplacingFile ? <Loader2 size={12} className={styles.spinIcon} /> : <FileUp size={12} />}
            <span>{isReplacingFile ? 'Đang tải lên...' : 'Đính kèm PDF tham khảo'}</span>
          </label>
        ) : (
          <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
            <FileText size={13} />
            <span>Không có tài liệu tham khảo</span>
          </span>
        )}
      </div>


      {/* Section 1: General Information & Legal Terms (8 KPI Cards) */}
      <div className={contractStyles.sectionBox}>
        <div className={contractStyles.sectionBoxHead}>
          <div className={contractStyles.sectionBoxTitle}>
            <Calendar size={16} color="#2563eb" />
            <span>1. General Information & Legal Terms</span>
          </div>
          <span className={contractStyles.sectionMeta}>8 indicators</span>
        </div>

        <div className={contractStyles.kpiGrid}>
          {/* 1. Contract Number */}
          <div className={contractStyles.kpiCard}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Contract Number</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(common?.contractNumber?.value)}
            </div>
          </div>

          {/* 2. Signing Date */}
          <div className={contractStyles.kpiCard}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Signing Date</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(formatDate(common?.signingDate?.value ? String(common.signingDate.value) : null))}
            </div>
          </div>

          {/* 3. Effective Date */}
          <div className={contractStyles.kpiCard}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Effective Date</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(formatDate(common?.effectiveDate?.value ? String(common.effectiveDate.value) : null))}
            </div>
          </div>

          {/* 4. Expiry Date */}
          <div className={contractStyles.kpiCard}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Expiry Date</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(formatDate(common?.expiryDate?.value ? String(common.expiryDate.value) : null))}
            </div>
          </div>

          {/* 5. Contract Term */}
          <div className={contractStyles.kpiCard}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Contract Term</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(common?.term?.value)}
            </div>
          </div>

          {/* 6. Contract Value */}
          <div className={contractStyles.kpiCard}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Contract Value</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(cvDisplay)}
            </div>
          </div>

          {/* 7. Governing Law & Dispute Resolution */}
          <div className={contractStyles.kpiCard} style={{ gridColumn: '1 / -1' }}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Governing Law & Dispute Resolution</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {lawParts.length > 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, lineHeight: 1.45, color: '#1e293b' }}>
                  {lawParts.map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: '#64748b', userSelect: 'none' }}>•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              ) : (
                renderValueOrNa(governingLawVal)
              )}
            </div>
          </div>

          {/* 8. Cooperation Purpose */}
          <div className={contractStyles.kpiCard} style={{ gridColumn: '1 / -1' }}>
            <div className={contractStyles.kpiCardHead}>
              <span className={contractStyles.kpiLabel}>Cooperation Purpose</span>
            </div>
            <div className={contractStyles.kpiValue}>
              {renderValueOrNa(common?.purpose?.value)}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Contracting Parties */}
      <div className={contractStyles.sectionBox}>
        <div className={contractStyles.sectionBoxHead}>
          <div className={contractStyles.sectionBoxTitle}>
            <Users size={16} color="#2563eb" />
            <span>2. Contracting Parties ({parties.length} parties)</span>
          </div>
        </div>

        <div className={contractStyles.partyGrid}>
          {parties.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Chưa có bên tham gia nào được nhập.
            </div>
          ) : (
            parties.map((party, idx) => {
              const avatarChar = idx === 0 ? 'A' : idx === 1 ? 'B' : String.fromCharCode(65 + idx);
              return (
                <div key={party.id || idx} className={contractStyles.partyCard}>
                  {/* Party Head */}
                  <div className={contractStyles.partyHead}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className={contractStyles.partyAvatar}>{avatarChar}</div>
                      <div>
                        <div className={contractStyles.partyTitle}>
                          {party.legalName || 'N/A'}
                        </div>
                        <div className={contractStyles.partySubtitle}>
                          Contracting Party #{idx + 1}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Structured Party Details Grid */}
                  <div className={contractStyles.partyInfoGrid}>
                    <div className={contractStyles.partyInfoItem}>
                      <span className={contractStyles.partyInfoLabel}>Role</span>
                      <span className={contractStyles.partyInfoValue}>{party.role || 'N/A'}</span>
                    </div>
                    <div className={contractStyles.partyInfoItem}>
                      <span className={contractStyles.partyInfoLabel}>Tax Code</span>
                      <span className={contractStyles.partyInfoValue}>{party.taxCode || 'N/A'}</span>
                    </div>
                    <div className={contractStyles.partyInfoItem} style={{ gridColumn: 'span 2' }}>
                      <span className={contractStyles.partyInfoLabel}>Legal Representative</span>
                      <span className={contractStyles.partyInfoValue}>{party.representative || 'N/A'}</span>
                    </div>
                    <div className={contractStyles.partyInfoItem} style={{ gridColumn: 'span 2' }}>
                      <span className={contractStyles.partyInfoLabel}>Registered Address</span>
                      <span className={contractStyles.partyInfoValue}>{party.address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
