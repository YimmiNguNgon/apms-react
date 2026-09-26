import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import totpApi from '../API/totpApi';
import type { StepUpVerifyResponse, TotpEnrollmentStartResponse } from '../API/totpApi';
import styles from './TotpSetupModal.module.css';

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

  // Lock background body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
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
      setError(apiError.payload?.message || apiError.message || 'An error occurred while setting up 2FA.');
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

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6 || !setupData) return;

    setLoading(true);
    setError(null);
    try {
      const res = await totpApi.confirmEnrollment({
        enrollmentId: setupData.enrollmentId,
        code,
      });
      onSuccess(res.data);
      onClose();
    } catch (err: unknown) {
      const apiError = err as { payload?: { message?: string }; message?: string };
      setError(apiError.payload?.message || apiError.message || 'Incorrect verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className={styles.backdrop} aria-hidden="true" onClick={!loading ? onClose : undefined} />
      <div className={styles.layer} role="dialog" aria-modal="true" aria-labelledby="totp-setup-title">
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.titleContainer}>
              <Shield size={22} color="#2563eb" />
              <h2 id="totp-setup-title" className={styles.title}>Set up Authenticator</h2>
            </div>
            <button
              type="button"
              className={styles.closeBtn}
              onClick={onClose}
              disabled={loading}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.content}>
            {loading && !setupData ? (
              <div className={styles.loadingContainer}>
                <div className={styles.spinner} />
                <p>Initializing...</p>
              </div>
            ) : error && !setupData ? (
              <div className={styles.errorContainer}>
                <AlertTriangle size={36} color="#ef4444" />
                <p className={styles.errorText}>{error}</p>
                <button type="button" className={styles.retryBtn} onClick={startSetup}>
                  Retry
                </button>
              </div>
            ) : setupData ? (
              <>
                <p className={styles.description}>
                  Scan the QR code with your Authenticator app (e.g., Google Authenticator), then enter the 6-digit verification code below.
                </p>

                {/* QR Section */}
                <div className={styles.qrSection}>
                  <div className={styles.qrBox}>
                    <img src={setupData.qrCodeDataUrl} alt="Authenticator QR Code" className={styles.qrImage} />
                  </div>
                </div>

                {/* Manual Key Section */}
                {setupData.manualEntryKey && (
                  <div className={styles.manualSection}>
                    <label className={styles.manualLabel}>Or enter key manually:</label>
                    <div className={styles.manualBox}>
                      <code className={styles.manualKey}>{setupData.manualEntryKey}</code>
                      <button
                        type="button"
                        className={`${styles.copyButton} ${copied ? styles.copyButtonSuccess : ''}`}
                        onClick={copyToClipboard}
                        title="Copy Key"
                      >
                        {copied ? <CheckCircle2 size={14} color="#059669" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <hr className={styles.divider} />

                {/* Verification Code Section */}
                <form onSubmit={handleVerify} className={styles.verificationSection}>
                  <label htmlFor="totp-code-input" className={styles.verificationLabel}>
                    Enter 6-digit verification code
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="totp-code-input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={code}
                      onChange={(e) => {
                        setError(null);
                        setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      }}
                      placeholder="000000"
                      className={`${styles.otpInput} ${error ? styles.otpInputError : ''}`}
                      autoFocus
                      disabled={loading}
                    />
                  </div>
                  {error && <p className={styles.errorText}>{error}</p>}
                  <button
                    type="submit"
                    className={styles.confirmButton}
                    disabled={code.length !== 6 || loading}
                  >
                    {loading ? 'Verifying...' : 'Confirm & Enable'}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
