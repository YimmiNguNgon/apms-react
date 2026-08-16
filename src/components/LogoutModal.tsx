import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

interface LogoutModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({ onConfirm, onCancel }) => {
  const { t } = useTranslation('common');

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-icon warning">
          <span>🚪</span>
        </div>
        <h3 className="modal-title">{t('logout.title')}</h3>
        <p className="modal-body">
          <Trans
            i18nKey="logout.body"
            ns="common"
            components={{ 1: <strong>APMS Platform</strong> }}
          />
        </p>
        <div className="modal-actions">
          <button className="btn btn-outline" onClick={onCancel}>
            {t('logout.cancel')}
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            {t('logout.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
