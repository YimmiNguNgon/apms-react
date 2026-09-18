import React, { useState, useEffect, useMemo, useRef } from 'react';
import type {
  ContractEntry,
  ContractResearchResponse,
  ManualContractPartyDto,
  SaveManualContractRequest,
} from '../../types/contractResearch';
import { contractResearchApi } from '../../API/contractResearchApi';
import {
  FileText,
  Calendar,
  Users,
  Plus,
  Trash2,
  Save,
  Loader2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import styles from '../FinancialResearch/FinancialResearchWorkbench.module.css';
import contractStyles from './ContractResearchWorkbench.module.css';
import { ConfirmModal } from '../Shared/ConfirmModal';
import { validateContractDates } from './contractValidation';

interface Props {
  projectId: number;
  taskId: number;
  contract: ContractEntry;
  onSaveSuccess: (updated: ContractResearchResponse) => void;
  onCancel?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  onViewPdf?: (documentId?: string | null) => void;
  onReplaceFile?: (file: File) => Promise<void> | void;
  isReplacingFile?: boolean;
}

export const ManualContractEntryTemplate: React.FC<Props> = ({
  projectId,
  taskId,
  contract,
  onSaveSuccess,
  onCancel,
  onDirtyChange,
}) => {
  // Top metadata
  const [title, setTitle] = useState(contract.title || '');
  const [documentDate, setDocumentDate] = useState(contract.documentDate ? String(contract.documentDate) : '');

  // Section 1: General & Legal Terms
  const common = contract.commonData;
  const [contractNumber, setContractNumber] = useState(common?.contractNumber?.value || '');
  const [signingDate, setSigningDate] = useState(common?.signingDate?.value ? String(common.signingDate.value) : '');
  const [effectiveDate, setEffectiveDate] = useState(common?.effectiveDate?.value ? String(common.effectiveDate.value) : '');
  const [expiryDate, setExpiryDate] = useState(common?.expiryDate?.value ? String(common.expiryDate.value) : '');
  const [term, setTerm] = useState(common?.term?.value || '');

  const initialCv = common?.contractValue?.value;
  const [contractValueAmount, setContractValueAmount] = useState<string>(
    initialCv?.amount != null ? String(initialCv.amount) : ''
  );
  const [contractValueCurrency, setContractValueCurrency] = useState<string>(
    initialCv?.currency || 'VND'
  );
  const [rawContractValueText, setRawContractValueText] = useState<string>(
    initialCv?.rawAmountText || ''
  );

  const [governingLaw, setGoverningLaw] = useState(common?.governingLaw?.value || '');
  const [purpose, setPurpose] = useState(common?.purpose?.value || '');

  // Section 2: Contracting Parties (default to 2 if empty)
  const initialParties = useMemo<ManualContractPartyDto[]>(() => {
    if (common?.parties && common.parties.length > 0) {
      return common.parties.map((p) => ({
        id: p.id,
        legalName: p.legalName || '',
        role: p.role || '',
        taxCode: p.taxCode || '',
        representative: p.representative || '',
        address: p.address || '',
      }));
    }
    return [
      { id: undefined, legalName: '', role: 'Bên A', taxCode: '', representative: '', address: '' },
      { id: undefined, legalName: '', role: 'Bên B', taxCode: '', representative: '', address: '' },
    ];
  }, [common?.parties]);

  const [parties, setParties] = useState<ManualContractPartyDto[]>(initialParties);

  // Status & error
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Field refs for date validation autofocus/scroll
  const effectiveDateInputRef = useRef<HTMLInputElement>(null);
  const expiryDateInputRef = useRef<HTMLInputElement>(null);

  // Live date relationships validation
  const dateErrors = useMemo(() => {
    return validateContractDates({
      signingDate,
      effectiveDate,
      expiryDate,
    });
  }, [signingDate, effectiveDate, expiryDate]);
  const hasDateErrors = Boolean(dateErrors.effectiveDate || dateErrors.expiryDate);

  // Sync if contract changes
  useEffect(() => {
    setTitle(contract.title || '');
    setDocumentDate(contract.documentDate ? String(contract.documentDate) : '');
    setContractNumber(common?.contractNumber?.value || '');
    setSigningDate(common?.signingDate?.value ? String(common.signingDate.value) : '');
    setEffectiveDate(common?.effectiveDate?.value ? String(common.effectiveDate.value) : '');
    setExpiryDate(common?.expiryDate?.value ? String(common.expiryDate.value) : '');
    setTerm(common?.term?.value || '');
    setContractValueAmount(initialCv?.amount != null ? String(initialCv.amount) : '');
    setContractValueCurrency(initialCv?.currency || 'VND');
    setRawContractValueText(initialCv?.rawAmountText || '');
    setGoverningLaw(common?.governingLaw?.value || '');
    setPurpose(common?.purpose?.value || '');
    setParties(initialParties);
    setErrorMessage(null);
    setSaveSuccessMsg(null);
  }, [contract.id]);

  // Dirty tracking
  const initialSnapshotRef = useRef<string>(JSON.stringify({
    title: contract.title || '',
    documentDate: contract.documentDate ? String(contract.documentDate) : '',
    contractNumber: common?.contractNumber?.value || '',
    signingDate: common?.signingDate?.value ? String(common.signingDate.value) : '',
    effectiveDate: common?.effectiveDate?.value ? String(common.effectiveDate.value) : '',
    expiryDate: common?.expiryDate?.value ? String(common.expiryDate.value) : '',
    term: common?.term?.value || '',
    contractValueAmount: initialCv?.amount != null ? String(initialCv.amount) : '',
    contractValueCurrency: initialCv?.currency || 'VND',
    rawContractValueText: initialCv?.rawAmountText || '',
    governingLaw: common?.governingLaw?.value || '',
    purpose: common?.purpose?.value || '',
    parties: initialParties,
  }));

  const currentSnapshot = useMemo(() => JSON.stringify({
    title,
    documentDate,
    contractNumber,
    signingDate,
    effectiveDate,
    expiryDate,
    term,
    contractValueAmount,
    contractValueCurrency,
    rawContractValueText,
    governingLaw,
    purpose,
    parties,
  }), [
    title,
    documentDate,
    contractNumber,
    signingDate,
    effectiveDate,
    expiryDate,
    term,
    contractValueAmount,
    contractValueCurrency,
    rawContractValueText,
    governingLaw,
    purpose,
    parties,
  ]);

  const isDirty = currentSnapshot !== initialSnapshotRef.current;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);

  const handleCancelClick = () => {
    if (isDirty) {
      setIsConfirmDiscardOpen(true);
    } else {
      onCancel?.();
    }
  };

  const handleConfirmDiscard = () => {
    setIsConfirmDiscardOpen(false);
    try {
      const snap = JSON.parse(initialSnapshotRef.current);
      setTitle(snap.title || '');
      setDocumentDate(snap.documentDate || '');
      setContractNumber(snap.contractNumber || '');
      setSigningDate(snap.signingDate || '');
      setEffectiveDate(snap.effectiveDate || '');
      setExpiryDate(snap.expiryDate || '');
      setTerm(snap.term || '');
      setContractValueAmount(snap.contractValueAmount != null ? String(snap.contractValueAmount) : '');
      setContractValueCurrency(snap.contractValueCurrency || 'VND');
      setRawContractValueText(snap.rawContractValueText || '');
      setGoverningLaw(snap.governingLaw || '');
      setPurpose(snap.purpose || '');
      setParties(snap.parties || []);
    } catch {
      // Fallback
    }
    onDirtyChange?.(false);
    onCancel?.();
  };

  // Party handlers
  const handlePartyChange = (index: number, field: keyof ManualContractPartyDto, value: any) => {
    setParties((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddParty = () => {
    const nextChar = String.fromCharCode(65 + parties.length);
    setParties((prev) => [
      ...prev,
      {
        id: undefined,
        legalName: '',
        role: `Bên ${nextChar}`,
        taxCode: '',
        representative: '',
        address: '',
      },
    ]);
  };

  const handleRemoveParty = (index: number) => {
    if (parties.length <= 1) return;
    setParties((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Field counter
  const enteredFieldsCount = useMemo(() => {
    let count = 0;
    if (title.trim()) count++;
    if (contractNumber.trim()) count++;
    if (signingDate.trim()) count++;
    if (effectiveDate.trim()) count++;
    if (expiryDate.trim()) count++;
    if (term.trim()) count++;
    if (contractValueAmount.trim() || rawContractValueText.trim()) count++;
    if (governingLaw.trim()) count++;
    if (purpose.trim()) count++;
    parties.forEach((p) => {
      if (p.legalName?.trim()) count++;
      if (p.taxCode?.trim()) count++;
      if (p.representative?.trim()) count++;
      if (p.address?.trim()) count++;
    });
    return count;
  }, [
    title,
    contractNumber,
    signingDate,
    effectiveDate,
    expiryDate,
    term,
    contractValueAmount,
    rawContractValueText,
    governingLaw,
    purpose,
    parties,
  ]);

  // Save handler
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    if (!title.trim()) {
      setErrorMessage('Tiêu đề hợp đồng là bắt buộc.');
      return;
    }

    if (dateErrors.effectiveDate) {
      setErrorMessage(dateErrors.effectiveDate);
      effectiveDateInputRef.current?.focus();
      effectiveDateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (dateErrors.expiryDate) {
      setErrorMessage(dateErrors.expiryDate);
      expiryDateInputRef.current?.focus();
      expiryDateInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setIsSaving(true);
    try {
      const payload: SaveManualContractRequest = {
        title: title.trim(),
        documentDate: documentDate || null,
        contractNumber: contractNumber.trim() || null,
        signingDate: signingDate || null,
        effectiveDate: effectiveDate || null,
        expiryDate: expiryDate || null,
        term: term.trim() || null,
        contractValueAmount: contractValueAmount ? Number(contractValueAmount) : null,
        contractValueCurrency: contractValueCurrency || 'VND',
        rawContractValueText: rawContractValueText.trim() || null,
        governingLaw: governingLaw.trim() || null,
        purpose: purpose.trim() || null,
        parties: parties.map((p) => ({
          id: p.id,
          legalName: p.legalName?.trim() || undefined,
          role: p.role?.trim() || undefined,
          taxCode: p.taxCode?.trim() || undefined,
          representative: p.representative?.trim() || undefined,
          address: p.address?.trim() || undefined,
        })),
      };

      const updated = await contractResearchApi.saveManualContract(
        projectId,
        taskId,
        contract.id,
        payload
      );

      initialSnapshotRef.current = JSON.stringify({
        title: title.trim(),
        documentDate,
        contractNumber,
        signingDate,
        effectiveDate,
        expiryDate,
        term,
        contractValueAmount,
        contractValueCurrency,
        rawContractValueText,
        governingLaw,
        purpose,
        parties,
      });

      onDirtyChange?.(false);
      setSaveSuccessMsg('Lưu thông tin hợp đồng thành công!');
      onSaveSuccess(updated);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi lưu thông tin hợp đồng.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Banner with Manual Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              padding: '3px 10px',
              fontSize: 11.5,
              fontWeight: 700,
              borderRadius: 12,
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Manual Entry Form
          </span>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Nhập thông tin và điều khoản hợp đồng thủ công
          </span>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: '10px 14px',
            background: '#fef2f2',
            border: '1px solid #fecdd3',
            borderRadius: 8,
            color: '#991b1b',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccessMsg && (
        <div
          style={{
            padding: '10px 14px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 8,
            color: '#166534',
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Contract Metadata Header Card */}
      <div className={contractStyles.sectionBox}>
        <div className={contractStyles.sectionBoxHead}>
          <div className={contractStyles.sectionBoxTitle}>
            <FileText size={16} color="#2563eb" />
            <span>Thông tin hồ sơ hợp đồng</span>
          </div>
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Tiêu đề hợp đồng *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Hợp đồng Hợp tác Kinh doanh Phân phối Sản phẩm 2026"
              style={{
                width: '100%',
                padding: '9px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Ngày tài liệu / văn bản
            </label>
            <input
              type="date"
              value={documentDate}
              onChange={(e) => setDocumentDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8.5px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 1: General Information & Legal Terms */}
      <div className={contractStyles.sectionBox}>
        <div className={contractStyles.sectionBoxHead}>
          <div className={contractStyles.sectionBoxTitle}>
            <Calendar size={16} color="#2563eb" />
            <span>1. General Information & Legal Terms (Thông tin chung & Pháp lý)</span>
          </div>
          <span className={contractStyles.sectionMeta}>8 trường số liệu</span>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Row 1: Contract Number & Term */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Số hợp đồng (Contract Number)
              </label>
              <input
                type="text"
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="e.g., HD-2026/01/BCC"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Thời hạn hợp đồng (Contract Term)
              </label>
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="e.g., 24 tháng kể từ ngày ký"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Row 2: 3 Dates (Signing, Effective, Expiry) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Ngày ký (Signing Date)
              </label>
              <input
                type="date"
                value={signingDate}
                onChange={(e) => setSigningDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Ngày hiệu lực (Effective Date)
              </label>
              <input
                ref={effectiveDateInputRef}
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: dateErrors.effectiveDate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              {dateErrors.effectiveDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: '#dc2626' }}>
                  <AlertTriangle size={13} color="#dc2626" />
                  <span>{dateErrors.effectiveDate}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Ngày hết hạn (Expiry Date)
              </label>
              <input
                ref={expiryDateInputRef}
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: dateErrors.expiryDate ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
              {dateErrors.expiryDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: '#dc2626' }}>
                  <AlertTriangle size={13} color="#dc2626" />
                  <span>{dateErrors.expiryDate}</span>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Contract Value (Amount, Currency, Raw Notes) */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Giá trị hợp đồng (Số tiền)
              </label>
              <input
                type="number"
                value={contractValueAmount}
                onChange={(e) => setContractValueAmount(e.target.value)}
                placeholder="e.g., 500000000"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Loại tiền tệ
              </label>
              <select
                value={contractValueCurrency}
                onChange={(e) => setContractValueCurrency(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8.5px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  background: '#ffffff',
                  boxSizing: 'border-box',
                }}
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="SGD">SGD</option>
                <option value="JPY">JPY</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Ghi chú giá trị (nếu không có số tiền cố định)
              </label>
              <input
                type="text"
                value={rawContractValueText}
                onChange={(e) => setRawContractValueText(e.target.value)}
                placeholder="e.g., Căn cứ phụ lục từng đợt đặt hàng"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontSize: 13,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Row 4: Governing Law */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Luật điều chỉnh & Cơ quan tài phán (Governing Law & Dispute Resolution)
            </label>
            <textarea
              rows={2}
              value={governingLaw}
              onChange={(e) => setGoverningLaw(e.target.value)}
              placeholder="e.g., Pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam | Trọng tài Quốc tế VIAC tại Hà Nội"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Row 5: Purpose */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
              Mục đích & Phạm vi hợp tác (Cooperation Purpose)
            </label>
            <textarea
              rows={2}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., Hợp tác phân phối độc quyền và triển khai các gói phần mềm chuyển đổi số cho doanh nghiệp vừa và nhỏ"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontSize: 13,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contracting Parties */}
      <div className={contractStyles.sectionBox}>
        <div className={contractStyles.sectionBoxHead}>
          <div className={contractStyles.sectionBoxTitle}>
            <Users size={16} color="#2563eb" />
            <span>2. Contracting Parties (Các bên tham gia hợp đồng)</span>
          </div>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleAddParty}
            style={{ padding: '5px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <Plus size={13} />
            Thêm bên tham gia
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {parties.map((party, idx) => {
            const avatarChar = idx === 0 ? 'A' : idx === 1 ? 'B' : String.fromCharCode(65 + idx);
            return (
              <div
                key={party.id || idx}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '14px 16px',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {/* Party Head */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className={contractStyles.partyAvatar}>{avatarChar}</div>
                    <div>
                      <strong style={{ fontSize: 14, color: '#0f172a' }}>
                        {party.legalName ? party.legalName : `Bên tham gia #${idx + 1}`}
                      </strong>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {party.role ? party.role : `Party ${avatarChar}`}
                      </div>
                    </div>
                  </div>

                  {parties.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveParty(idx)}
                      style={{
                        background: '#fff1f2',
                        border: '1px solid #fecdd3',
                        color: '#e11d48',
                        padding: '4px 10px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                      title="Xóa bên tham gia này"
                    >
                      <Trash2 size={13} />
                      Xóa bên này
                    </button>
                  )}
                </div>

                {/* Party Inputs Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Tên pháp nhân (Legal Name) *
                    </label>
                    <input
                      type="text"
                      value={party.legalName || ''}
                      onChange={(e) => handlePartyChange(idx, 'legalName', e.target.value)}
                      placeholder="e.g., Công ty Cổ phần Alpha"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Vai trò trong hợp đồng (Role)
                    </label>
                    <input
                      type="text"
                      value={party.role || ''}
                      onChange={(e) => handlePartyChange(idx, 'role', e.target.value)}
                      placeholder="e.g., Bên A / Nhà cung cấp"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Mã số thuế (Tax Code)
                    </label>
                    <input
                      type="text"
                      value={party.taxCode || ''}
                      onChange={(e) => handlePartyChange(idx, 'taxCode', e.target.value)}
                      placeholder="e.g., 0101234567"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Người đại diện pháp luật (Representative)
                    </label>
                    <input
                      type="text"
                      value={party.representative || ''}
                      onChange={(e) => handlePartyChange(idx, 'representative', e.target.value)}
                      placeholder="e.g., Ông Nguyễn Văn A - Tổng Giám đốc"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                      Địa chỉ đăng ký trụ sở (Registered Address)
                    </label>
                    <input
                      type="text"
                      value={party.address || ''}
                      onChange={(e) => handlePartyChange(idx, 'address', e.target.value)}
                      placeholder="e.g., Số 123 Phố Huế, Phường Ngô Thì Nhậm, Quận Hai Bà Trưng, Hà Nội"
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        fontSize: 12.5,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Floating/Sticky Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          padding: '12px 18px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          position: 'sticky',
          bottom: 12,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>
            Đã nhập: <strong>{enteredFieldsCount}</strong> trường
          </span>
          {hasDateErrors ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#dc2626',
                fontSize: 12.5,
                fontWeight: 600,
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              <AlertTriangle size={13} color="#dc2626" />
              Dữ liệu ngày không hợp lệ
            </span>
          ) : isDirty ? (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#ea580c',
                fontSize: 12.5,
                fontWeight: 600,
                background: '#fff7ed',
                border: '1px solid #ffedd5',
                padding: '3px 8px',
                borderRadius: 6,
              }}
            >
              <AlertTriangle size={13} />
              Bạn có thay đổi chưa lưu
            </span>
          ) : (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: '#16a34a',
                fontSize: 12.5,
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={14} />
              Đã đồng bộ
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onCancel && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleCancelClick}
              disabled={isSaving}
              style={{ padding: '7px 18px', fontSize: 13 }}
            >
              Hủy
            </button>
          )}

          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '7px 20px',
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={15} className={styles.spinIcon} />
                Đang lưu thông tin...
              </>
            ) : (
              <>
                <Save size={15} />
                Lưu thông tin
              </>
            )}
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmDiscardOpen}
        title="Hủy các thay đổi chưa lưu?"
        message="Những thay đổi bạn vừa nhập sẽ không được lưu."
        confirmText="Hủy thay đổi"
        cancelText="Tiếp tục chỉnh sửa"
        isDestructive={true}
        onConfirm={handleConfirmDiscard}
        onCancel={() => setIsConfirmDiscardOpen(false)}
      />
    </div>
  );
};
