import React from 'react';
import { AlertTriangle, Lock, QrCode, Shield, Unlock } from 'lucide-react';
import { TotpSetupModal } from './TotpSetupModal';
import { TotpVerificationModal } from './TotpVerificationModal';
import type { StepUpVerifyResponse } from '../API/totpApi';

export type SecureTotpGateState =
  | 'CHECKING'
  | 'NOT_ENROLLED'
  | 'TOTP_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'LOCKED'
  | 'FORBIDDEN';

interface SecureTotpAccessGateProps {
  state: SecureTotpGateState;
  lockedUntil?: string | null;
  setupOpen: boolean;
  verifyOpen: boolean;
  scope?: string;
  resourceId?: string;
  forbiddenText: string;
  requiredText: string;
  expiredText?: string;
  onOpenSetup: () => void;
  onCloseSetup: () => void;
  onSetupSuccess: (secureSession: StepUpVerifyResponse) => void;
  onOpenVerify: () => void;
  onCloseVerify: () => void;
  onVerified: (secureSession: StepUpVerifyResponse) => void;
}

const defaultExpiredText =
  'Phi\u00ean truy c\u1eadp b\u1ea3o m\u1eadt c\u1ee7a b\u1ea1n \u0111\u00e3 h\u1ebft h\u1ea1n. Vui l\u00f2ng x\u00e1c th\u1ef1c l\u1ea1i \u0111\u1ec3 ti\u1ebfp t\u1ee5c.';

export const SecureTotpAccessGate: React.FC<SecureTotpAccessGateProps> = ({
  state,
  lockedUntil,
  setupOpen,
  verifyOpen,
  scope,
  resourceId,
  forbiddenText,
  requiredText,
  expiredText = defaultExpiredText,
  onOpenSetup,
  onCloseSetup,
  onSetupSuccess,
  onOpenVerify,
  onCloseVerify,
  onVerified,
}) => {
  if (state === 'CHECKING') {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner} />
        <p style={styles.centerText}>{'\u0110ang ki\u1ec3m tra b\u1ea3o m\u1eadt...'}</p>
      </div>
    );
  }

  if (state === 'FORBIDDEN') {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.deniedIcon}>
          <Shield size={48} color="#ef4444" />
        </div>
        <h3 style={styles.title}>Access Denied</h3>
        <p style={styles.text}>{forbiddenText}</p>
      </div>
    );
  }

  if (state === 'LOCKED') {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.deniedIcon}>
          <AlertTriangle size={48} color="#ef4444" />
        </div>
        <h3 style={styles.title}>{'T\u00ednh n\u0103ng b\u1ecb kh\u00f3a'}</h3>
        <p style={styles.text}>
          {'X\u00e1c th\u1ef1c 2 l\u1edbp c\u1ee7a b\u1ea1n \u0111\u00e3 b\u1ecb kh\u00f3a t\u1ea1m th\u1eddi do nh\u1eadp sai qu\u00e1 nhi\u1ec1u l\u1ea7n.'}
          <br />
          {'Vui l\u00f2ng th\u1eed l\u1ea1i sau: '}
          <strong>{lockedUntil}</strong>
        </p>
      </div>
    );
  }

  if (state === 'NOT_ENROLLED') {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.infoIcon}>
          <QrCode size={48} color="#3b82f6" />
        </div>
        <h3 style={styles.title}>{'C\u00e0i \u0111\u1eb7t b\u1ea3o m\u1eadt 2 l\u1edbp'}</h3>
        <p style={styles.text}>
          {'\u0110\u1ec3 xem d\u1eef li\u1ec7u nh\u1ea1y c\u1ea3m, b\u1ea1n c\u1ea7n c\u00e0i \u0111\u1eb7t x\u00e1c th\u1ef1c 2 l\u1edbp b\u1eb1ng \u1ee9ng d\u1ee5ng Authenticator.'}
        </p>
        <button style={styles.actionBtn} onClick={onOpenSetup}>
          <Shield size={18} />
          {'C\u00e0i \u0111\u1eb7t TOTP ngay'}
        </button>
        <TotpSetupModal isOpen={setupOpen} onClose={onCloseSetup} onSuccess={onSetupSuccess} />
      </div>
    );
  }

  return (
    <div style={styles.centerContainer}>
      <div style={styles.infoIcon}>
        <Lock size={48} color="#3b82f6" />
      </div>
      <h3 style={styles.title}>{'Y\u00eau c\u1ea7u x\u00e1c th\u1ef1c b\u1ed5 sung'}</h3>
      <p style={styles.text}>{state === 'SESSION_EXPIRED' ? expiredText : requiredText}</p>
      <button style={styles.actionBtn} onClick={onOpenVerify}>
        <Unlock size={18} />
        {'X\u00e1c th\u1ef1c b\u1eb1ng Authenticator'}
      </button>
      <TotpVerificationModal
        isOpen={verifyOpen}
        onClose={onCloseVerify}
        onVerified={onVerified}
        scope={scope}
        resourceId={resourceId}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textAlign: 'center',
    minHeight: '300px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f1f5f9',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  centerText: { color: '#64748b', marginTop: '16px' },
  deniedIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  infoIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '40px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: { margin: '0 0 12px 0', fontSize: '20px', color: '#0f172a' },
  text: { margin: '0 0 24px 0', color: '#64748b', maxWidth: '460px', lineHeight: 1.5 },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
