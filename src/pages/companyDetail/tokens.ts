import type { CSSProperties } from 'react';

/**
 * Shared compact design tokens for the Owner Company Profile UI.
 * Source of truth used by CompanyDetail and the Admin Owner Company Profile page.
 */
export const C: Record<string, CSSProperties> = {
  page: {
    background: '#F8FAFC',
    minHeight: '100vh',
    padding: '8px 16px 16px',
    color: '#0F172A',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  container: { maxWidth: '1440px', margin: '0 auto' },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '8px 12px',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
    marginBottom: '6px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '4px',
  },
  h2: { margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' },
  h3: { margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' },
  fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' },
  fieldCell: {
    background: '#F8FAFC',
    padding: '5px 8px',
    borderRadius: '6px',
    border: '1px solid #F1F5F9',
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: '0.62rem',
    color: '#64748B',
    fontWeight: 500,
    display: 'block',
    marginBottom: '2px',
  },
  value: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#0F172A',
    wordBreak: 'break-word',
  },
  muted: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#94A3B8',
    wordBreak: 'break-word',
  },
};

export const formatCompanyName = (name?: string | null): string => {
  if (name && name.trim() && !/^[0-9a-fA-F]{24}$/.test(name.trim())) {
    return name.trim();
  }
  return 'Chưa có tên công ty';
};

export const exchangeLabel = (ex?: string): string =>
  ex && ex !== 'NONE' ? ex : 'Chưa niêm yết';

export const INPUT_STYLE: CSSProperties = {
  width: '100%',
  padding: '4px 8px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.72rem',
  background: '#FFFFFF',
  color: '#0F172A',
  outline: 'none',
  boxSizing: 'border-box',
};

export const PRIMARY_BUTTON: CSSProperties = {
  background: '#2563EB',
  border: 'none',
  color: '#FFFFFF',
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
};

export const GHOST_BUTTON: CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #CBD5E1',
  color: '#334155',
  fontSize: '0.72rem',
  fontWeight: 600,
  padding: '4px 10px',
  borderRadius: '6px',
  cursor: 'pointer',
};
