import React from 'react';

interface LogoutModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ onConfirm, onCancel }) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon warning">
          <span>🚪</span>
        </div>
        <h3 className="modal-title">Đăng xuất hệ thống?</h3>
        <p className="modal-body">
          Bạn sẽ được đăng xuất khỏi <strong>APMS Platform</strong>.<br />
          Mọi thay đổi chưa lưu sẽ bị mất. Bạn có chắc không?
        </p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>
            Huỷ bỏ
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            🚪 Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};
