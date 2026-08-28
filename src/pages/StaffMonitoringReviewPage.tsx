import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { ProfileResponse } from '../types/domain';
import { ArrowLeft, Building2, CheckCircle, LayoutGrid, Save, Shield } from 'lucide-react';
import { formatCompanyName } from './companyDetail/tokens';
import { CompanyProfileHeader, PageShell } from './companyDetail/CompanyProfileHeader';
import { ListingTabBar, type ListingTabId } from './companyDetail/ListingTabs';
import { ConfirmModal } from '../components/Shared/ConfirmModal';
import type { ListingTabDef } from './companyDetail/utils';
import {
  CompanyProfileTabs,
  type BoardPayload,
  type BusinessFieldsPayload,
  type OverviewPayload,
  type SwotPayload,
} from './companyDetail/CompanyProfileTabs';
import { companyMonitoringApi } from '../API/companyMonitoringApi';

const ADMIN_TABS: ListingTabDef[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutGrid size={14} /> },
  { id: 'business-fields', label: 'Business Fields', icon: <Building2 size={14} /> },
  { id: 'board', label: 'Ban lãnh d?o', icon: <Shield size={14} /> },
];

type ChangedField = {
  key: string;
  label: string;
  section: 'identity' | 'contact' | 'companySize' | 'business' | 'insights' | 'companyMembers';
};

type MonitoringProposalPayload = {
  companyProfileId: string;
  changeSummary: string;
  sourceDocumentIds: string[];
  proposedIdentity?: Record<string, unknown>;
  proposedContact?: Record<string, unknown>;
  proposedCompanySize?: Record<string, unknown>;
  proposedBusiness?: Record<string, unknown>;
  proposedInsights?: Record<string, unknown>;
  proposedCompanyMembers?: Array<Record<string, unknown>>;
};

const fieldLabels: Record<string, string> = {
  legalName: 'Legal Name',
  tradeName: 'Trade Name',
  taxCode: 'Tax Code',
  registrationNumber: 'Registration Number',
  stockTicker: 'Stock Ticker',
  stockExchange: 'Stock Exchange',
  website: 'Website',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  employeeTier: 'Employee Tier',
  employeeCount: 'Employee Count',
  businessModel: 'Business Model',
  industries: 'Industries',
  products: 'Products',
  markets: 'Markets',
  targetCustomers: 'Target Customers',
  strengths: 'Strengths',
  weaknesses: 'Weaknesses',
  opportunities: 'Opportunities',
  threats: 'Threats',
  companyMembers: 'Board Members'
};

const primaryAddress = (profile: ProfileResponse) =>
  profile.contact?.addresses?.find((address) => address.type === 'HEADQUARTERS')?.fullAddress
  ?? profile.contact?.addresses?.[0]?.fullAddress
  ?? '';

const normalizeComparable = (value: unknown): unknown => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(normalizeComparable);
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalizeComparable((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
};

const sameValue = (left: unknown, right: unknown) =>
  JSON.stringify(normalizeComparable(left)) === JSON.stringify(normalizeComparable(right));

const comparableFields = (profile: ProfileResponse): Record<string, { value: unknown; section: ChangedField['section'] }> => ({
  legalName: { value: profile.identity?.legalName ?? '', section: 'identity' },
  tradeName: { value: profile.identity?.tradeName ?? '', section: 'identity' },
  taxCode: { value: profile.identity?.taxCode ?? '', section: 'identity' },
  registrationNumber: { value: profile.identity?.registrationNumber ?? '', section: 'identity' },
  stockTicker: { value: profile.identity?.stockTicker ?? profile.stockTicker ?? '', section: 'identity' },
  stockExchange: { value: profile.identity?.stockExchange ?? profile.stockExchange ?? 'NONE', section: 'identity' },
  website: { value: profile.contact?.website ?? '', section: 'contact' },
  email: { value: profile.contact?.emails?.[0] ?? '', section: 'contact' },
  phone: { value: profile.contact?.phones?.[0] ?? '', section: 'contact' },
  address: { value: primaryAddress(profile), section: 'contact' },
  employeeTier: { value: profile.companySize?.employeeTier ?? '', section: 'companySize' },
  employeeCount: { value: profile.companySize?.employeeCount ?? '', section: 'companySize' },
  businessModel: { value: profile.business?.businessModel ?? '', section: 'business' },
  industries: { value: profile.business?.industries ?? [], section: 'business' },
  products: { value: profile.business?.products ?? [], section: 'business' },
  markets: { value: profile.business?.markets ?? [], section: 'business' },
  targetCustomers: { value: profile.business?.targetCustomers ?? [], section: 'business' },
  strengths: { value: profile.insights?.strengths ?? [], section: 'insights' },
  weaknesses: { value: profile.insights?.weaknesses ?? [], section: 'insights' },
  opportunities: { value: profile.insights?.opportunities ?? [], section: 'insights' },
  threats: { value: profile.insights?.threats ?? [], section: 'insights' },
  companyMembers: {
    value: (profile.companyMembers ?? []).map((member) => ({
      fullName: member.fullName ?? member.name ?? '',
      position: member.position ?? member.role ?? '',
      imageUrl: member.imageUrl ?? '',
      notes: member.notes ?? ''
    })),
    section: 'companyMembers'
  }
});

const changedFieldsFor = (original: ProfileResponse | null, next: ProfileResponse | null): ChangedField[] => {
  if (!original || !next) return [];
  const originalFields = comparableFields(original);
  const nextFields = comparableFields(next);

  return Object.entries(nextFields)
    .filter(([key, field]) => !sameValue(originalFields[key]?.value, field.value))
    .map(([key, field]) => ({
      key,
      label: fieldLabels[key] || key,
      section: field.section
    }));
};

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

const buildProposalPayload = (
  companyProfileId: string,
  localProfile: ProfileResponse,
  changedFields: ChangedField[]
): MonitoringProposalPayload => {
  const sections = new Set(changedFields.map((field) => field.section));
  const payload: MonitoringProposalPayload = {
    companyProfileId,
    changeSummary: `Staff monitoring updates: ${changedFields.map((field) => field.label).join(', ')}`,
    sourceDocumentIds: []
  };

  if (sections.has('identity')) payload.proposedIdentity = toRecord(localProfile.identity);
  if (sections.has('contact')) payload.proposedContact = toRecord(localProfile.contact);
  if (sections.has('companySize')) payload.proposedCompanySize = toRecord(localProfile.companySize);
  if (sections.has('business')) payload.proposedBusiness = toRecord(localProfile.business);
  if (sections.has('insights')) payload.proposedInsights = toRecord(localProfile.insights);
  if (sections.has('companyMembers')) {
    payload.proposedCompanyMembers = (localProfile.companyMembers ?? []).map((member) => ({ ...member }));
  }

  return payload;
};

export const StaffMonitoringReviewPage: React.FC<{
  assignmentId: number;
  companyProfileId: string;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}> = ({ assignmentId, companyProfileId, onClose, onSuccess }) => {
  const [originalProfile, setOriginalProfile] = useState<ProfileResponse | null>(null);
  const [localProfile, setLocalProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showNoChangeConfirm, setShowNoChangeConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileResponse>('/company-profiles/' + companyProfileId);
      if (res?.data) {
        setOriginalProfile(res.data);
        setLocalProfile(JSON.parse(JSON.stringify(res.data)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [companyProfileId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSaveOverview = async (payload: OverviewPayload) => {
    if (!localProfile) return;
    const np = { ...localProfile };
    np.identity = { ...np.identity, legalName: payload.legalName, tradeName: payload.tradeName, taxCode: payload.taxCode, registrationNumber: payload.registrationNumber, stockTicker: payload.stockTicker, stockExchange: payload.stockExchange };
    np.contact = { ...np.contact, website: payload.website, emails: [payload.email], phones: [payload.phone], addresses: [{ fullAddress: payload.address, type: '', city: '', country: '' }] };
    np.companySize = { ...np.companySize, employeeTier: payload.employeeTier, employeeCount: payload.employeeCount };
    np.business = { ...np.business, businessModel: payload.businessModel, industries: payload.industries };
    setLocalProfile(np);
  };

  const handleSaveSwot = async (payload: SwotPayload) => {
    if (!localProfile) return;
    setLocalProfile({ ...localProfile, insights: payload.insights });
  };

  const handleSaveBusinessFields = async (payload: BusinessFieldsPayload) => {
    if (!localProfile) return;
    const np = { ...localProfile };
    np.business = { ...np.business, products: payload.products, markets: payload.markets, targetCustomers: payload.targetCustomers };
    setLocalProfile(np);
  };

  const handleSaveBoard = async (payload: BoardPayload) => {
    if (!localProfile) return;
    setLocalProfile({ ...localProfile, companyMembers: payload.companyMembers });
  };

  const handleCompleteReview = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await companyMonitoringApi.submitReview(assignmentId, {
        result: 'NO_CHANGE',
      });
      setShowNoChangeConfirm(false);
      onSuccess('Monitoring review completed.');
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to complete monitoring review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitProposal = async (changedFields: ChangedField[]) => {
    if (!localProfile || !originalProfile) return;
    if (!changedFields.length) {
      setShowNoChangeConfirm(true);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildProposalPayload(companyProfileId, localProfile, changedFields);
      const proposalResponse = await api.post<{ id: string }>('/profile-update-proposals/monitoring', payload);
      const updateProposalId = proposalResponse.data.id;
      
      await companyMonitoringApi.submitReview(assignmentId, {
        result: 'UPDATE_PROPOSED',
        updateProposalId,
      });
      onSuccess('Monitoring proposal submitted to Manager.');
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to submit monitoring proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  const changedFields = useMemo(
    () => changedFieldsFor(originalProfile, localProfile),
    [localProfile, originalProfile]
  );
  const hasChanges = changedFields.length > 0;
  const actionLabel = hasChanges ? 'Submit Proposal to Manager' : 'Complete Review';
  const loadingLabel = hasChanges ? 'Submitting...' : 'Completing...';

  if (loading || !localProfile) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  const displayName = formatCompanyName(localProfile.identity?.tradeName || localProfile.identity?.legalName);
  const initials = displayName.substring(0, 2).toUpperCase() || 'CP';

  return (
    <div style={{ background: '#f8fafc', overflowY: 'auto' }}>
      {submitError && (
        <div className="apms-toast error" style={{ position: 'fixed', top: 20, right: 20, zIndex: 11000 }}>
          {submitError}
        </div>
      )}
      <PageShell>
        <CompanyProfileHeader
          displayName={displayName}
          initials={initials}
          industry={localProfile.business?.industries?.[0]}
          reviewStatus={localProfile.reviewStatus || 'UNVERIFIED'}
          version={localProfile.version}
          isHidden={localProfile.isHidden}
          topRow={
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={onClose} 
                  style={{ 
                    display: 'flex', alignItems: 'center', gap: '6px', 
                    background: '#fff', border: '1px solid #cbd5e1', 
                    color: '#475569', cursor: 'pointer', padding: '6px 12px', 
                    borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                  <ArrowLeft size={16} /> Quay lại
                </button>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Monitoring Review
                </span>
              </div>
            </>
          }
        />

        <section style={{
          marginTop: '16px',
          padding: '16px 20px',
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '20px',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              Review status
            </div>
            <strong style={{ color: '#0f172a', fontSize: '1rem' }}>
              {hasChanges ? `${changedFields.length} change${changedFields.length !== 1 ? 's' : ''} proposed` : 'No changes proposed.'}
            </strong>
            {hasChanges && (
              <ul style={{ margin: '8px 0 0 18px', padding: 0, color: '#475569', lineHeight: 1.6 }}>
                {changedFields.map((field) => (
                  <li key={field.key}>{field.label}</li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => hasChanges ? void handleSubmitProposal(changedFields) : setShowNoChangeConfirm(true)}
            disabled={submitting}
            style={{
              flexShrink: 0,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {hasChanges ? <Save size={16} /> : <CheckCircle size={16} />}
            {submitting ? loadingLabel : actionLabel}
          </button>
        </section>
        
        <div style={{ marginTop: '16px' }}>
          <ListingTabBar
            tabs={ADMIN_TABS}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as ListingTabId)}
            companyId={localProfile.companyId}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <CompanyProfileTabs
            profile={localProfile}
            activeTab={activeTab}
            editable={true}
            onSaveOverview={handleSaveOverview}
            onSaveSwot={handleSaveSwot}
            onSaveBusinessFields={handleSaveBusinessFields}
            onSaveBoard={handleSaveBoard}
          />
        </div>
      </PageShell>
      <ConfirmModal
        isOpen={showNoChangeConfirm}
        title="Complete monitoring review?"
        message="You are confirming that you reviewed the current company information and found no changes."
        cancelText="Cancel"
        confirmText={submitting ? 'Completing...' : 'Complete Review'}
        confirmDisabled={submitting}
        onCancel={() => {
          if (!submitting) setShowNoChangeConfirm(false);
        }}
        onConfirm={() => void handleCompleteReview()}
      />
    </div>
  );
};
