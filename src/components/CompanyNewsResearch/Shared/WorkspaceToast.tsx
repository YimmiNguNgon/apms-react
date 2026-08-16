import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastState {
  kind: 'success' | 'error';
  message: string;
}

interface WorkspaceToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export const WorkspaceToast: React.FC<WorkspaceToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.kind === 'success';

  return (
    <div style={{
      position: 'fixed', top: '24px', right: '24px',
      zIndex: 50, display: 'flex', alignItems: 'center', gap: '12px',
      backgroundColor: isSuccess ? '#ecfdf5' : '#fef2f2',
      border: `1px solid ${isSuccess ? '#10b981' : '#ef4444'}`,
      padding: '12px 16px', borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      minWidth: '300px',
      animation: 'toast-slide-left 0.3s ease-out forwards'
    }}>
      <style>{`
        @keyframes toast-slide-left {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div style={{ color: isSuccess ? '#10b981' : '#ef4444', display: 'flex' }}>
        {isSuccess ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <strong style={{ color: isSuccess ? '#065f46' : '#991b1b', fontSize: '0.95rem' }}>
          {isSuccess ? 'Success' : 'Error'}
        </strong>
        <span style={{ color: isSuccess ? '#064e3b' : '#7f1d1d', fontSize: '0.85rem' }}>
          {toast.message}
        </span>
      </div>
      <button 
        onClick={onClose}
        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: isSuccess ? '#047857' : '#b91c1c', display: 'flex', padding: 0 }}
      >
        <X size={18} />
      </button>
    </div>
  );
};
