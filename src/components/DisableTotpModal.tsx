import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldAlert } from 'lucide-react';
import totpApi from '../API/totpApi';

interface DisableTotpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DisableTotpModal: React.FC<DisableTotpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
    }
  }, [isOpen]);

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

  const handleDisable = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6) return;

    setLoading(true);
    setError(null);
    try {
      await totpApi.disableTotp({ code });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const apiError = err as { payload?: { message?: string }; message?: string };
      setError(apiError.payload?.message || apiError.message || 'Incorrect verification code. Please try again.');
      setCode('');
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
            <ShieldAlert size={22} color="#dc2626" />
            <h2 style={styles.title}>Disable Two-Factor Authentication</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          <form onSubmit={handleDisable} style={styles.form}>
            <p style={styles.description}>
              Enter the 6-digit code from your Authenticator app to confirm disabling two-factor authentication.
            </p>

            <div style={styles.inputWrapper}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setError(null);
                  setCode(e.target.value.replace(/\D/g, ''));
                }}
                placeholder="000000"
                style={{
                  ...styles.input,
                  borderColor: error ? '#ef4444' : '#e2e8f0',
                }}
                autoFocus
                disabled={loading}
              />
            </div>

            {error && <p style={styles.errorText}>{error}</p>}

            <div style={styles.buttonGroup}>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                style={{
                  ...styles.disableBtn,
                  opacity: code.length === 6 && !loading ? 1 : 0.5,
                }}
                disabled={code.length !== 6 || loading}
              >
                {loading ? 'Disabling...' : 'Confirm Disable'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10030,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e2e8f0',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 700,
    color: '#0f172a',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  description: {
    margin: '0 0 20px 0',
    color: '#475569',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  inputWrapper: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '26px',
    textAlign: 'center',
    letterSpacing: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'monospace',
  },
  errorText: {
    margin: '0 0 16px 0',
    fontSize: '13px',
    color: '#ef4444',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  cancelBtn: {
    padding: '10px 18px',
    backgroundColor: '#ffffff',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  disableBtn: {
    padding: '10px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
