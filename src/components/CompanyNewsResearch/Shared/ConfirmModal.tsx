import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmDisabled?: boolean;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmDisabled = false,
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div 
        className="confirmation-modal-backdrop"
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.65)'
        }}
      />
      <div 
        className="confirmation-modal-layer"
        role="dialog"
        aria-modal="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px'
        }}
      >
        <div 
          className="confirmation-modal"
          style={{
            backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{ 
            padding: '16px 24px', borderBottom: '1px solid #e2e8f0', 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: isDestructive ? '#fef2f2' : '#f8fafc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: isDestructive ? '#ef4444' : '#3b82f6', display: 'flex' }}>
                {isDestructive ? <AlertTriangle size={24} /> : <Info size={24} />}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: isDestructive ? '#991b1b' : '#0f172a' }}>
                {title}
              </h3>
            </div>
            <button 
              onClick={onCancel}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', display: 'flex' }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: '24px', fontSize: '0.95rem', color: '#475569', lineHeight: 1.5 }}>
            {message}
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
            display: 'flex', justifyContent: 'flex-end', gap: '12px'
          }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1',
                backgroundColor: '#fff', color: '#475569', fontWeight: 500, cursor: 'pointer'
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={confirmDisabled}
              style={{
                padding: '8px 16px', borderRadius: '6px', border: 'none',
                backgroundColor: isDestructive ? '#ef4444' : '#3b82f6', 
                color: '#fff', fontWeight: 500, cursor: confirmDisabled ? 'not-allowed' : 'pointer',
                opacity: confirmDisabled ? 0.55 : 1
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
