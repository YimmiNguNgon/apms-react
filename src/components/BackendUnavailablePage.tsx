import React from 'react';
import { FileQuestion } from 'lucide-react';

interface BackendUnavailablePageProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const BackendUnavailablePage: React.FC<BackendUnavailablePageProps> = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        color: '#F8FAFC',
        padding: '32px 16px',
        textAlign: 'center',
        boxSizing: 'border-box',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Simple Document/Error Icon */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          color: '#F87171',
          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.15)',
        }}
      >
        <FileQuestion size={40} strokeWidth={1.8} />
      </div>

      {/* Main Title: OOPS... PAGE NOT FOUND */}
      <div
        style={{
          fontSize: '1rem',
          fontWeight: 700,
          letterSpacing: '0.15em',
          color: '#94A3B8',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        OOPS...
      </div>
      <h1
        style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          lineHeight: 1.15,
          margin: '0 0 12px 0',
          color: '#F8FAFC',
        }}
      >
        PAGE NOT FOUND
      </h1>

      {/* Optional small generic text */}
      <p
        style={{
          fontSize: '1.05rem',
          color: '#94A3B8',
          maxWidth: 440,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        We couldn't load this page right now.
      </p>
    </div>
  );
};
export default BackendUnavailablePage;
