import React from 'react';
import { C } from './tokens';

interface CompanyProfileHeaderProps {
  displayName: string;
  initials: string;
  industry?: string;
  reviewStatus?: string;
  version?: string;
  topRow?: React.ReactNode;
}

/**
 * Shared hero header used by both the Owner Company Profile (CompanyDetail)
 * and the Admin "Hồ sơ công ty chủ quản" page so the two look identical.
 */
export const CompanyProfileHeader: React.FC<CompanyProfileHeaderProps> = ({
  displayName,
  initials,
  industry,
  reviewStatus,
  version,
  topRow,
}) => {
  return (
    <>
      {topRow && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {topRow}
        </div>
      )}

      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '10px',
          padding: '8px 12px',
          marginBottom: '8px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: '700',
            fontSize: '0.85rem',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.18)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>
              {displayName}
            </h1>
            <span
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                color: '#1D4ED8',
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '999px',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              PARTNER ECOSYSTEM
            </span>
            {industry && (
              <span
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#475569',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: '999px',
                }}
              >
                {industry}
              </span>
            )}
            <span style={{ fontSize: '0.65rem', color: '#64748B', marginLeft: 'auto' }}>
              Trạng thái: <strong style={{ color: '#15803D', fontWeight: 700 }}>{reviewStatus || 'VERIFIED'}</strong>
              {version && <span style={{ marginLeft: '6px', color: '#6366F1' }}>• v{version}</span>}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export const PageShell: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <div style={C.page} id={id}>
    <div style={C.container}>{children}</div>
  </div>
);
