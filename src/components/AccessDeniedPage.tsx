import React from 'react';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { useUser, ROLE_DEFAULT_PAGE } from '../context/UserContext';

interface AccessDeniedPageProps {
  title?: string;
  message?: string;
  onBack?: () => void;
  onDashboard?: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  title = 'Access Denied',
  message = "You don't have permission to access this page.",
  onBack,
  onDashboard,
}) => {
  const { currentUser } = useUser();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else if (currentUser) {
      const defaultPage = ROLE_DEFAULT_PAGE[currentUser.role];
      window.location.hash = `#${defaultPage}`;
    }
  };

  const handleGoDashboard = () => {
    if (onDashboard) {
      onDashboard();
      return;
    }
    if (currentUser) {
      const defaultPage = ROLE_DEFAULT_PAGE[currentUser.role];
      window.location.hash = `#${defaultPage}`;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '32px 16px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          color: '#EF4444',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}
      >
        <ShieldAlert size={36} />
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 16,
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#DC2626',
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginBottom: 12,
        }}
      >
        403 FORBIDDEN
      </div>

      <h1
        style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: 'var(--text-primary, #0F172A)',
          margin: '0 0 8px 0',
        }}
      >
        {title}
      </h1>

      <p
        style={{
          fontSize: '0.95rem',
          color: 'var(--text-secondary, #64748B)',
          maxWidth: 440,
          lineHeight: 1.5,
          margin: '0 0 28px 0',
        }}
      >
        {message}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 8,
            border: '1px solid #CBD5E1',
            background: '#FFFFFF',
            color: '#334155',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <button
          type="button"
          onClick={handleGoDashboard}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '9px 18px',
            borderRadius: 8,
            border: 'none',
            background: '#2563EB',
            color: '#FFFFFF',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
          }}
        >
          <LayoutDashboard size={16} />
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};
