import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, ShieldAlert } from 'lucide-react';
import totpApi from '../API/totpApi';
import type { StepUpVerifyResponse } from '../API/totpApi';

interface TotpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (secureSession: StepUpVerifyResponse) => void;
  scope?: string;
  resourceId?: string;
}

export const TotpVerificationModal: React.FC<TotpVerificationModalProps> = ({ 
  isOpen, onClose, onVerified, scope, resourceId 
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError(null);
      // We could call GET /status to check if locked, but the POST will fail with LOCKED anyway
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

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length !== 6 || lockedUntil) return;

    setLoading(true);
    setError(null);
    try {
      const res = await totpApi.verifyStepUp({ code, scope, resourceId });
      onVerified(res.data);
      onClose();
    } catch (err: unknown) {
      const apiError = err as { status?: number; payload?: { message?: string; lockedUntil?: string }; message?: string };
      const status = apiError.status;
      const msg = apiError.payload?.message || apiError.message;
      
      if (status === 423 || msg === 'TOTP_ACCOUNT_LOCKED' || msg?.includes('locked')) {
        setLockedUntil(apiError.payload?.lockedUntil || 'Vài phút nữa');
        setError('Tài khoản đã bị khóa do nhập sai quá nhiều lần.');
      } else if (msg === 'TOTP_CODE_REPLAYED') {
        setError('Mã này đã được sử dụng. Vui lòng đợi mã mới.');
      } else {
        setError('Mã xác thực không đúng. Vui lòng thử lại.');
      }
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
            <Lock size={24} color="#3b82f6" />
            <h2 style={styles.title}>Xác thực bảo mật 2 lớp</h2>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={styles.content}>
          {lockedUntil ? (
            <div style={styles.lockedContainer}>
              <ShieldAlert size={48} color="#ef4444" />
              <h3 style={styles.lockedTitle}>Khóa tạm thời</h3>
              <p style={styles.lockedText}>
                Bạn đã nhập sai quá nhiều lần. Tính năng xác thực đã bị khóa.
                <br />
                Vui lòng thử lại sau: <strong>{lockedUntil}</strong>
              </p>
              <button style={styles.closeActionBtn} onClick={onClose}>Đóng</button>
            </div>
          ) : (
            <form onSubmit={handleVerify} style={styles.form}>
              <p style={styles.description}>
                Mở ứng dụng Authenticator (Google/Microsoft) và nhập mã 6 số để tiếp tục truy cập dữ liệu bảo mật.
              </p>
              
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setError(null);
                    setCode(e.target.value.replace(/\D/g, ''));
                  }}
                  placeholder="000000"
                  style={{
                    ...styles.input,
                    borderColor: error ? '#ef4444' : '#e2e8f0'
                  }}
                  autoFocus
                />
              </div>

              {error && <p style={styles.errorText}>{error}</p>}

              <button 
                type="submit"
                style={{ ...styles.verifyBtn, opacity: code.length === 6 && !loading ? 1 : 0.5 }}
                disabled={code.length !== 6 || loading}
              >
                {loading ? 'Đang xác minh...' : 'Xác minh'}
              </button>
            </form>
          )}
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
    backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px',
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
  form: { display: 'flex', flexDirection: 'column' },
  description: { margin: '0 0 24px 0', color: '#475569', fontSize: '15px', lineHeight: '1.5' },
  inputWrapper: { display: 'flex', justifyContent: 'center', marginBottom: '16px' },
  input: {
    width: '100%', padding: '16px', fontSize: '32px', textAlign: 'center', letterSpacing: '12px',
    border: '2px solid #e2e8f0', borderRadius: '8px', outline: 'none', transition: 'border-color 0.2s',
    fontFamily: 'monospace'
  },
  errorText: { margin: '0 0 16px 0', fontSize: '14px', color: '#ef4444', textAlign: 'center' },
  verifyBtn: {
    width: '100%', padding: '14px',
    backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
    fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s'
  },
  lockedContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 0' },
  lockedTitle: { margin: '16px 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#ef4444' },
  lockedText: { margin: '0 0 24px 0', color: '#475569', lineHeight: '1.6' },
  closeActionBtn: {
    padding: '10px 24px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '6px',
    cursor: 'pointer', fontWeight: 500, color: '#0f172a'
  }
};
