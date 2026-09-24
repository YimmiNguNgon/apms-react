import React, { useState, useEffect, useRef } from 'react';
import { contractResearchApi } from '../../API/contractResearchApi';
import type { ContractEntry, ContractResearchResponse } from '../../types/contractResearch';
import { AlertTriangle, Edit3, FileText, FileUp, Loader2, X } from 'lucide-react';
import { validatePdfUpload, PDF_ACCEPT_ATTRIBUTE } from '../../utils/pdfValidation';

interface Props {
  open: boolean;
  contract: ContractEntry | null;
  projectId: number;
  taskId: number;
  onClose: () => void;
  onSuccess: (updatedResearch: ContractResearchResponse, toastMessage?: string) => void;
}

export const EditContractModal: React.FC<Props> = ({
  open,
  contract,
  projectId,
  taskId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirmReplace, setShowConfirmReplace] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (contract && open) {
      setTitle(contract.title || '');
      setSelectedFile(null);
      setErrorMessage(null);
      setShowConfirmReplace(false);
    }
  }, [contract, open]);

  if (!open || !contract) return null;

  const isManual = contract.dataEntryMethod === 'MANUAL';

  const currentDocName =
    contract.documentName ||
    (isManual ? 'No document attached' : 'Attached Contract Document.pdf');

  const hasExtractedData =
    !isManual &&
    (contract.extractionStatus === 'COMPLETED' ||
      contract.extractionStatus === 'AWAITING_TYPE_CONFIRMATION' ||
      Boolean(contract.commonData) ||
      Boolean(contract.cooperationAgreementData) ||
      Boolean(contract.partnershipAgreementData) ||
      Boolean(contract.jointVentureAgreementData) ||
      Boolean(contract.businessCooperationContractData));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const err = validatePdfUpload(file);
      if (err) {
        setErrorMessage(err);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
      setShowConfirmReplace(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setShowConfirmReplace(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please enter the contract title.');
      return;
    }

    if (selectedFile) {
      const err = validatePdfUpload(selectedFile);
      if (err) {
        setErrorMessage(err);
        return;
      }
    }

    // If replacement file is chosen and existing extraction data exists, require confirmation first
    if (selectedFile && hasExtractedData && !showConfirmReplace) {
      setShowConfirmReplace(true);
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    const origTitle = contract.title || '';
    const titleChanged = title.trim() !== origTitle.trim();
    const fileChanged = Boolean(selectedFile);

    if (!titleChanged && !fileChanged) {
      onClose();
      setIsSubmitting(false);
      return;
    }

    try {
      let latestResearch: ContractResearchResponse | null = null;
      let toastMessage = '';

      if (titleChanged && fileChanged) {
        await contractResearchApi.updateContract(projectId, taskId, contract.id, {
          title: title.trim(),
          documentDate: contract.documentDate || null,
        });
        const res = await contractResearchApi.replaceContractFile(projectId, taskId, contract.id, selectedFile!);
        latestResearch = res;
        toastMessage = isManual
          ? 'Contract details and reference document updated successfully.'
          : 'Contract details updated successfully. Extraction data was reset because the source document was replaced.';
      } else if (fileChanged) {
        const res = await contractResearchApi.replaceContractFile(projectId, taskId, contract.id, selectedFile!);
        latestResearch = res;
        toastMessage = isManual
          ? (contract.documentName ? 'Reference document updated successfully.' : 'Reference document attached successfully.')
          : 'Contract document replaced successfully. Run extraction again to analyze the new document.';
      } else if (titleChanged) {
        const res = await contractResearchApi.updateContract(projectId, taskId, contract.id, {
          title: title.trim(),
          documentDate: contract.documentDate || null,
        });
        latestResearch = res;
        toastMessage = 'Contract title updated successfully.';
      }

      if (latestResearch) {
        onSuccess(latestResearch, toastMessage);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.message || err?.message || 'An error occurred while updating the contract.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    padding: '16px',
  };

  const modalStyle: React.CSSProperties = {
    background: '#ffffff',
    padding: '24px',
    borderRadius: '14px',
    width: '520px',
    maxWidth: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    border: '1px solid #e2e8f0',
    fontFamily: 'Inter, -apple-system, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '12px',
    borderBottom: '1px solid #f1f5f9',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    marginTop: '4px',
    marginBottom: '2px',
  };

  const inputStyle: React.CSSProperties = {
    padding: '9px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    width: '100%',
    boxSizing: 'border-box',
    fontSize: '13px',
    color: '#0f172a',
    backgroundColor: '#ffffff',
    outline: 'none',
    transition: 'border-color 150ms ease',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form style={modalStyle} onSubmit={handleFormSubmit} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '8px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={17} />
            </div>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
              Edit Contract Details
            </h3>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                background: isManual ? '#f1f5f9' : '#eff6ff',
                color: isManual ? '#475569' : '#2563eb',
                border: `1px solid ${isManual ? '#e2e8f0' : '#bfdbfe'}`,
              }}
            >
              {isManual ? 'MANUAL ENTRY' : 'AI EXTRACTION'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* SECTION 1: CONTRACT INFORMATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={sectionTitleStyle}>Contract Information</div>

          <label style={labelStyle}>
            Contract Title *
            <input
              required
              style={inputStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Business Cooperation Agreement between A and B..."
              disabled={isSubmitting}
            />
          </label>
        </div>

        {/* SECTION 2: SOURCE DOCUMENT / REFERENCE DOCUMENT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          <div style={sectionTitleStyle}>
            {isManual ? 'Reference Document (Optional)' : 'Source Document'}
          </div>

          {/* Current Document Display */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <FileText size={18} color="#3b82f6" style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Current Document</div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={currentDocName}
                >
                  {currentDocName}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                color: '#2563eb',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0,
              }}
            >
              <FileUp size={14} />
              {contract.documentName ? 'Choose New File' : 'Choose File'}
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={PDF_ACCEPT_ATTRIBUTE}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            disabled={isSubmitting}
          />

          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {isManual && !contract.documentName
              ? 'Optional. PDF only, maximum 50 MB. Select a PDF to attach reference material.'
              : 'Optional. PDF only, maximum 50 MB. Leave empty to keep the current document.'}
          </span>

          {/* Selected Replacement File Display */}
          {selectedFile && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <FileUp size={18} color="#2563eb" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>Selected Replacement</div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#1e3a8a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={selectedFile.name}
                  >
                    {selectedFile.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isSubmitting}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  flexShrink: 0,
                }}
                title="Remove replacement selection"
              >
                <X size={15} />
                <span>Remove</span>
              </button>
            </div>
          )}

          {/* Replacement Warning / Info Banner */}
          {selectedFile && !isManual && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                color: '#92400e',
                fontSize: '12px',
                lineHeight: '1.45',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Replace source document?</strong>
                <p style={{ margin: '3px 0 0 0' }}>
                  Replacing this document will reset the AI extraction results associated with this contract because they belong to the previous file. The contract itself and its metadata will be preserved.
                </p>
              </div>
            </div>
          )}
          {selectedFile && isManual && (
            <div
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e40af',
                fontSize: '12px',
                lineHeight: '1.45',
              }}
            >
              <strong>Updating reference document:</strong> The new PDF will be linked to this contract as reference material. Existing manual fields will be preserved.
            </div>
          )}
        </div>

        {/* Inline Confirmation Box before saving replacement if extraction results exist */}
        {showConfirmReplace && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '8px',
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              marginTop: '4px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b', marginBottom: '4px' }}>
              Confirm Document Replacement
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#7f1d1d', lineHeight: '1.4' }}>
              This contract currently has extracted information. Replacing the document will clear those extraction results and reset extraction to unextracted state so you can re-run AI extraction on the new file.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setShowConfirmReplace(false)}
                style={{
                  padding: '6px 12px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSave}
                disabled={isSubmitting}
                style={{
                  padding: '6px 14px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  color: '#ffffff',
                }}
              >
                {isSubmitting ? 'Replacing...' : 'Replace & Save'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer Buttons */}
        {!showConfirmReplace && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '8px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              style={{
                padding: '8px 18px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting || !title.trim() ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '13px',
                opacity: isSubmitting || !title.trim() ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};