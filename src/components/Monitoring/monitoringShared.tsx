import React, { useState } from 'react';
import type {
  CompanyProfileUpdateProposalResponse,
  FieldEvidence,
  MonitoringFrequency,
  ProfileResponse,
} from '../../types/domain';

export type ProposalBundle = {
  proposal: CompanyProfileUpdateProposalResponse;
  profile: ProfileResponse | null;
  error?: string;
};

export type ChangeRow = {
  key: string;
  label: string;
  currentValue: unknown;
  proposedValue: unknown;
  source: string;
  fieldPath?: string;
  evidence?: FieldEvidence;
};

export const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

export const statusTone = (status: string) => {
  switch (status) {
    case 'ACTIVE':
    case 'ON_SCHEDULE':
    case 'UP_TO_DATE':
      return 'success';
    case 'DUE':
      return 'warning';
    case 'OVERDUE':
      return 'danger';
    case 'PAUSED':
      return 'neutral';
    default:
      return 'info';
  }
};

export const proposalTone = (status?: string | null) => {
  switch ((status || '').toUpperCase()) {
    case 'APPROVED':
    case 'APPLIED':
      return 'success';
    case 'REJECTED':
    case 'CHANGES_REQUESTED':
    case 'REVISION_REQUESTED':
      return 'danger';
    case 'DRAFT':
    case 'SUBMITTED':
    case 'IN_REVIEW':
    case 'PENDING':
      return 'warning';
    default:
      return 'neutral';
  }
};

export const frequencyLabel = (value: MonitoringFrequency) => {
  switch (value) {
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'SEMI_ANNUALLY':
      return 'Semi-annually';
    default:
      return value;
  }
};

export const reviewResultLabel = (value?: string | null) => {
  switch (value) {
    case 'NO_CHANGE':
      return 'No Change';
    case 'UPDATE_PROPOSED':
      return 'Update Proposed';
    case 'RELATIONSHIP_CHANGE_PROPOSED':
      return 'Relationship Change Proposed';
    default:
      return value || '-';
  }
};

export const reviewResultTone = (value?: string | null) => {
  switch (value) {
    case 'NO_CHANGE':
      return 'success';
    case 'UPDATE_PROPOSED':
    case 'RELATIONSHIP_CHANGE_PROPOSED':
      return 'info';
    default:
      return 'neutral';
  }
};

export const proposalStatusLabel = (value?: string | null) => {
  if (!value) return '-';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => normalizeValue(item)));
  if (isRecord(value)) {
    const sorted = Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }
  return String(value);
};

const flattenRecord = (value: unknown, prefix = ''): Array<[string, unknown]> => {
  if (!isRecord(value)) return [];

  return Object.entries(value).flatMap(([key, item]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(item)) return flattenRecord(item, path);
    return [[path, item]];
  });
};

const getByPath = (value: unknown, path: string): unknown => {
  if (!path) return value;
  return path.split('.').reduce<unknown>((current, part) => {
    if (!isRecord(current)) return undefined;
    return current[part];
  }, value);
};

const fieldLabel = (path: string) => {
  const labels: Record<string, string> = {
    legalName: 'Legal name',
    tradeName: 'Trade name',
    taxCode: 'Tax code',
    registrationNumber: 'Registration number',
    stockTicker: 'Stock ticker',
    stockExchange: 'Stock exchange',
    foundedDate: 'Founded date',
    foundedYear: 'Founded year',
    companyDescription: 'Company description',
    website: 'Website',
    emails: 'Email addresses',
    phones: 'Phone numbers',
    addresses: 'Addresses',
    employeeTier: 'Employee tier',
    employeeCount: 'Employee count',
    revenueTier: 'Revenue tier',
    industries: 'Industries',
    businessModel: 'Business model',
    products: 'Products',
    markets: 'Markets',
    targetCustomers: 'Target customers',
    strengths: 'Strengths',
    weaknesses: 'Weaknesses',
    opportunities: 'Opportunities',
    threats: 'Threats',
    companyMembers: 'Company members',
    relationshipType: 'Relationship type',
    charterCapital: 'Charter capital'
  };
  const last = path.split('.').pop() || path;
  const mapped = labels[last] || last.replace(/([A-Z])/g, ' $1');
  return mapped.charAt(0).toUpperCase() + mapped.slice(1);
};

export const collectProposalChanges = (
  proposal: CompanyProfileUpdateProposalResponse,
  profile: ProfileResponse | null
): ChangeRow[] => {
  const sections = [
    { source: 'Identity', proposed: proposal.proposedIdentity, current: profile?.identity },
    { source: 'Contact', proposed: proposal.proposedContact, current: profile?.contact },
    { source: 'Company Size', proposed: proposal.proposedCompanySize, current: profile?.companySize },
    { source: 'Business', proposed: proposal.proposedBusiness, current: profile?.business },
    { source: 'Insights', proposed: proposal.proposedInsights, current: profile?.insights },
    { source: 'Financial', proposed: proposal.proposedFinancial, current: profile?.financial ?? profile?.financials },
    { source: 'Market', proposed: proposal.proposedMarket, current: profile?.market },
    { source: 'Innovation', proposed: proposal.proposedInnovation, current: profile?.innovation },
    { source: 'Risk', proposed: proposal.proposedRisk, current: profile?.risk },
    { source: 'Compliance', proposed: proposal.proposedCompliance, current: profile?.compliance },
    {
      source: 'Leadership',
      proposed: proposal.proposedCompanyMembers ? { companyMembers: proposal.proposedCompanyMembers } : null,
      current: { companyMembers: profile?.companyMembers ?? null }
    },
    {
      source: 'Relationship',
      proposed: proposal.proposedRelationship ? { relationshipType: proposal.proposedRelationship } : null,
      current: { relationshipType: profile?.relationshipType ?? null }
    }
  ];

  const sectionRoots: Record<string, string> = {
    'Identity': 'identity',
    'Contact': 'contact',
    'Company Size': 'companySize',
    'Business': 'business',
    'Insights': 'insights',
    'Financial': 'financial',
    'Market': 'market',
    'Innovation': 'innovation',
    'Risk': 'risk',
    'Compliance': 'compliance',
    'Leadership': 'companyMembers',
    'Relationship': 'relationshipType'
  };

  const matchesFieldPath = (fieldPath: string, targetPath: string): boolean => {
    if (fieldPath === targetPath) return true;
    if ((fieldPath === 'contact.phones' && targetPath === 'contact.phoneNumbers') ||
        (fieldPath === 'contact.phoneNumbers' && targetPath === 'contact.phones')) {
      return true;
    }
    return false;
  };

  return sections.flatMap((section) => {
    if (!section.proposed) return [];

    return flattenRecord(section.proposed as Record<string, unknown>).flatMap(([path, proposedValue]) => {
      const root = sectionRoots[section.source];
      const fieldPath = root === 'companyMembers' || root === 'relationshipType' ? root : `${root}.${path}`;

      const isExplicitlyChanged = Boolean(
        proposal.changedFieldPaths &&
        proposal.changedFieldPaths.some(p => matchesFieldPath(fieldPath, p))
      );

      if (proposal.changedFieldPaths && proposal.changedFieldPaths.length > 0) {
        if (!isExplicitlyChanged) {
          return [];
        }
      }

      let currentValue: unknown;
      if (proposal.originalValues) {
        if (Object.prototype.hasOwnProperty.call(proposal.originalValues, fieldPath)) {
          currentValue = proposal.originalValues[fieldPath];
        } else if (fieldPath === 'contact.phones' && Object.prototype.hasOwnProperty.call(proposal.originalValues, 'contact.phoneNumbers')) {
          currentValue = proposal.originalValues['contact.phoneNumbers'];
        } else if (fieldPath === 'contact.phoneNumbers' && Object.prototype.hasOwnProperty.call(proposal.originalValues, 'contact.phones')) {
          currentValue = proposal.originalValues['contact.phones'];
        } else {
          currentValue = getByPath(section.current, path);
        }
      } else {
        currentValue = getByPath(section.current, path);
      }

      if (!isExplicitlyChanged && normalizeValue(currentValue) === normalizeValue(proposedValue)) {
        return [];
      }

      const evidence = proposal.fieldEvidence?.find(e => matchesFieldPath(fieldPath, e.fieldPath));

      return [{
        key: `${section.source}.${path}`,
        label: fieldLabel(path),
        currentValue,
        proposedValue,
        source: section.source,
        fieldPath,
        evidence
      }];
    });
  });
};

export const ValueDisplay = ({ value, level = 0, isProposed = false }: { value: unknown; level?: number; isProposed?: boolean }) => {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined || value === '') return <span style={{ color: 'var(--text-muted)' }}>{isProposed ? 'Removed' : 'Not provided'}</span>;
  if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
  
  if (typeof value === 'string') {
    if (value.startsWith('http') && (value.includes('.jpg') || value.includes('.png') || value.includes('.jpeg') || value.includes('.webp'))) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <img src={value} alt="Preview" style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--workspace-muted-border, #e2e8f0)' }} />
        </div>
      );
    }
    if (value.startsWith('http')) {
      return <a href={value} target="_blank" rel="noreferrer" style={{ color: '#2563eb', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }} title={value}>{value}</a>;
    }
    return <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', display: 'block', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>{value}</span>;
  }
  
  if (typeof value === 'number') return <span>{value}</span>;

  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: 'var(--text-muted)' }}>{isProposed ? 'Removed' : 'Not provided'}</span>;
    if (value.every((item) => typeof item !== 'object' || item === null)) {
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {value.map((item, i) => (
            <span key={i} style={{ background: isProposed ? 'rgba(37, 99, 235, 0.1)' : 'rgba(0, 0, 0, 0.05)', padding: '2px 8px', borderRadius: '16px', fontSize: '0.85rem', color: isProposed ? '#1e40af' : 'var(--text-primary)', border: isProposed ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid rgba(0, 0, 0, 0.1)' }}>
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    
    const limit = 4;
    const isExpandable = value.length > limit;
    const itemsToShow = expanded ? value : value.slice(0, limit);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {itemsToShow.map((item, i) => (
          <div key={i} style={{ padding: '12px', border: '1px solid var(--workspace-muted-border, #e2e8f0)', borderRadius: '6px', background: isProposed ? 'var(--bg-surface, #fff)' : 'var(--cds-layer-01, #f8fafc)' }}>
            <ValueDisplay value={item} level={level + 1} isProposed={isProposed} />
          </div>
        ))}
        {isExpandable && (
          <button 
            type="button" 
            onClick={() => setExpanded(!expanded)}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--role-accent, #2563eb)', 
              fontSize: '0.85rem', 
              fontWeight: 600, 
              cursor: 'pointer', 
              padding: '4px 0', 
              textAlign: 'left' 
            }}
          >
            {expanded ? 'Thu gọn' : `Xem thêm (${value.length - limit} mục)...`}
          </button>
        )}
      </div>
    );
  }

  if (typeof value === 'object') {
    const hiddenKeys = ['notes', 'researchedAt', 'researchedBy', 'taskId'];
    const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '' && !hiddenKeys.includes(k));
    
    if (!entries.length) return <span style={{ color: 'var(--text-muted)' }}>-</span>;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {k.replace(/([A-Z])/g, ' $1').trim()}
            </div>
            <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              <ValueDisplay value={v} level={level + 1} isProposed={isProposed} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span>{String(value)}</span>;
};
