import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import totpApi from '../API/totpApi';
import type { StepUpVerifyResponse, TotpEnrollmentStartResponse } from '../API/totpApi';

interface TotpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (secureSession: StepUpVerifyResponse) => void;
}

export const TotpSetupModal: React.FC<TotpSetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [setupData, setSetupData] = useState<TotpEnrollmentStartResponse | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      setCopied(false);
      startSetup();
    } else {
      setSetupData(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!loading) onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, loading, onClose]);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await totpApi.startEnrollment();
      setSetupData(res.data);
    } catch (err: unknown) {
      const apiError = err as { payload?: { message?: string }; message?: string };
      setError(apiError.payload?.message || apiError.message || 'Có lỗi xảy ra khi bắt đầu cài đặt TOTP');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (setupData?.manualEntryKey) {
      navigator.clipboard.writeText(setupData.manualEntryKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6 || !setupData) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await totpApi.confirmEnrollment({
        enrollmentId: setupData.enrollmentId,
        code
      });
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const apiError = err as { payload?: { message?: string }; message?: string };
      setError(apiError.payload?.message || apiError.message || 'Mã xác thực không đúng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <Shield size={24} color="#3b82f6" />
            <h2 style={styles.title}>Secure Access Setup</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          {loading && !setupData ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <p>Đang khởi tạo...</p>
            </div>
          ) : error && !setupData ? (
            <div style={styles.errorContainer}>
              <AlertTriangle size={32} color="#ef4444" />
              <p style={styles.errorText}>{error}</p>
              <button style={styles.retryBtn} onClick={startSetup}>Thử lại</button>
            </div>
          ) : setupData ? (
            <>
              <p style={styles.description}>
                Quét mã QR bằng Google Authenticator hoặc Microsoft Authenticator, sau đó nhập một mã 6 số để tiếp tục.
              </p>
              
              <div style={styles.twoColumn}>
                <div style={styles.qrSection}>
                  <div style={styles.qrContainer}>
                    <img src={setupData.qrCodeDataUrl} alt="QR Code" style={styles.qrImage} />
                  </div>
                </div>

                <div style={styles.manualSection}>
                  <p style={styles.manualText}>Hoặc nhập mã khóa thủ công:</p>
                  <div style={styles.keyContainer}>
                    <code style={styles.keyValue}>{setupData.manualEntryKey}</code>
                    <button style={styles.copyBtn} onClick={copyToClipboard} title="Copy khóa">
                      {copied ? <CheckCircle2 size={16} color="#10b981" /> : <Copy size={16} />}
                    </button>
                  </div>
                  
                  <div style={styles.inputSection}>
                    <p style={styles.inputLabel}>Nhập mã 6 số từ ứng dụng:</p>
                    <input
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      style={styles.input}
                    />
                    {error && <p style={styles.errorMsg}>{error}</p>}
                    <button 
                      style={{ ...styles.verifyBtn, opacity: code.length === 6 ? 1 : 0.5 }}
                      disabled={code.length !== 6 || loading}
                      onClick={handleVerify}
                    >
                      {loading ? 'Đang xác minh...' : 'Verify & Continue'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10030,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '600px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '20px 24px', borderBottom: '1px solid #e2e8f0'
  },
  titleContainer: { display: 'flex', alignItems: 'center', gap: '12px' },
  title: { margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' },
  content: { padding: '24px' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: '#64748b' },
  spinner: {
    width: '32px', height: '32px', border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite'
  },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px', textAlign: 'center' },
  errorText: { color: '#ef4444', margin: '16px 0' },
  retryBtn: {
    padding: '8px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontWeight: 500, color: '#0f172a'
  },
  description: { margin: '0 0 24px 0', color: '#475569', fontSize: '15px' },
  twoColumn: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  qrSection: { flex: '1 1 200px', display: 'flex', justifyContent: 'center' },
  qrContainer: {
    padding: '16px', backgroundColor: '#f8fafc', borderRadius: '12px',
    border: '1px solid #e2e8f0'
  },
  qrImage: { width: '100%', maxWidth: '180px', height: 'auto' },
  manualSection: { flex: '2 1 300px', display: 'flex', flexDirection: 'column' },
  manualText: { margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' },
  keyContainer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px',
    border: '1px solid #e2e8f0', marginBottom: '24px'
  },
  keyValue: { margin: 0, fontSize: '14px', fontFamily: 'monospace', color: '#0f172a', letterSpacing: '1px' },
  copyBtn: {
    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
  },
  inputSection: { marginTop: 'auto' },
  inputLabel: { margin: '0 0 8px 0', fontSize: '14px', fontWeight: 500, color: '#0f172a' },
  input: {
    width: '100%', padding: '12px', fontSize: '24px', textAlign: 'center', letterSpacing: '8px',
    border: '2px solid #e2e8f0', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s'
  },
  errorMsg: { margin: '8px 0 0 0', fontSize: '13px', color: '#ef4444' },
  verifyBtn: {
    width: '100%', padding: '12px', marginTop: '16px',
    backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '15px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s'
  }
};
