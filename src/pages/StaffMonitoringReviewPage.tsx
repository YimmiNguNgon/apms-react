import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { ProfileResponse, FieldEvidence } from '../types/domain';
import { ArrowLeft, Building2, CheckCircle, Eye, LayoutGrid, Save, Shield, Upload } from 'lucide-react';
import { formatCompanyName } from './companyDetail/tokens';
import { CompanyProfileHeader, PageShell } from './companyDetail/CompanyProfileHeader';
import { ListingTabBar, type ListingTabId } from './companyDetail/ListingTabs';
import { ConfirmModal } from '../components/Shared/ConfirmModal';
import { MonitoringReviewDetailsModal } from '../components/Monitoring/MonitoringReviewDetailsModal';
import type { CompanyMonitoringReviewResponse, CompanyProfileUpdateProposalResponse } from '../types/domain';
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
  { id: 'board', label: 'Leadership', icon: <Shield size={14} /> },
];

type ChangedField = {
  key: string;
  label: string;
  section: 'identity' | 'contact' | 'companySize' | 'business' | 'insights' | 'companyMembers';
  path: string;
};

type MonitoringProposalPayload = {
  companyProfileId: string;
  changeSummary: string;
  sourceDocumentIds: string[];
  changedFieldPaths?: string[];
  fieldEvidence?: FieldEvidence[];
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

const comparableFields = (profile: ProfileResponse): Record<string, { value: unknown; section: ChangedField['section']; path: string }> => ({
  legalName: { value: profile.identity?.legalName ?? '', section: 'identity', path: 'identity.legalName' },
  tradeName: { value: profile.identity?.tradeName ?? '', section: 'identity', path: 'identity.tradeName' },
  taxCode: { value: profile.identity?.taxCode ?? '', section: 'identity', path: 'identity.taxCode' },
  registrationNumber: { value: profile.identity?.registrationNumber ?? '', section: 'identity', path: 'identity.registrationNumber' },
  stockTicker: { value: profile.identity?.stockTicker ?? profile.stockTicker ?? '', section: 'identity', path: 'identity.stockTicker' },
  stockExchange: { value: profile.identity?.stockExchange ?? profile.stockExchange ?? 'NONE', section: 'identity', path: 'identity.stockExchange' },
  website: { value: profile.contact?.website ?? '', section: 'contact', path: 'contact.website' },
  email: { value: profile.contact?.emails?.[0] ?? '', section: 'contact', path: 'contact.emails' },
  phone: { value: profile.contact?.phones?.[0] ?? '', section: 'contact', path: 'contact.phones' },
  address: { value: primaryAddress(profile), section: 'contact', path: 'contact.addresses' },
  employeeTier: { value: profile.companySize?.employeeTier ?? '', section: 'companySize', path: 'companySize.employeeTier' },
  employeeCount: { value: profile.companySize?.employeeCount ?? '', section: 'companySize', path: 'companySize.employeeCount' },
  businessModel: { value: profile.business?.businessModel ?? '', section: 'business', path: 'business.businessModel' },
  industries: { value: profile.business?.industries ?? [], section: 'business', path: 'business.industries' },
  products: { value: profile.business?.products ?? [], section: 'business', path: 'business.products' },
  markets: { value: profile.business?.markets ?? [], section: 'business', path: 'business.markets' },
  targetCustomers: { value: profile.business?.targetCustomers ?? [], section: 'business', path: 'business.targetCustomers' },
  strengths: { value: profile.insights?.strengths ?? [], section: 'insights', path: 'insights.strengths' },
  weaknesses: { value: profile.insights?.weaknesses ?? [], section: 'insights', path: 'insights.weaknesses' },
  opportunities: { value: profile.insights?.opportunities ?? [], section: 'insights', path: 'insights.opportunities' },
  threats: { value: profile.insights?.threats ?? [], section: 'insights', path: 'insights.threats' },
  companyMembers: {
    value: (profile.companyMembers ?? []).map((member) => ({
      fullName: member.fullName ?? member.name ?? '',
      position: member.position ?? member.role ?? '',
      imageUrl: member.imageUrl ?? '',
      notes: member.notes ?? ''
    })),
    section: 'companyMembers',
    path: 'companyMembers'
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
      section: field.section,
      path: field.path
    }));
};

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;

const buildProposalPayload = (
  companyProfileId: string,
  localProfile: ProfileResponse,
  changedFields: ChangedField[],
  evidenceMap: Record<string, FieldEvidence>
): MonitoringProposalPayload => {
  const sparseProfile: Record<string, any> = {};
  changedFields.forEach(field => {
    const root = field.path.split('.')[0];
    const key = field.path.substring(root.length + 1);
    
    if (root === 'companyMembers') {
      sparseProfile.companyMembers = localProfile.companyMembers;
      return;
    }
    
    if (!sparseProfile[root]) sparseProfile[root] = {};
    
    const sourceSection = (localProfile as any)[root];
    if (sourceSection && key) {
      sparseProfile[root][key] = sourceSection[key];
    }
  });

  const payload: MonitoringProposalPayload = {
    companyProfileId,
    changeSummary: `Staff monitoring updates: ${changedFields.map((field) => field.label).join(', ')}`,
    sourceDocumentIds: [],
    changedFieldPaths: changedFields.map((f) => f.path),
    fieldEvidence: changedFields.map(f => evidenceMap[f.path] || { fieldPath: f.path, fieldLabel: f.label }).filter(e => e.evidenceSource || e.evidenceScript || e.evidenceImageId)
  };

  if (sparseProfile.identity) payload.proposedIdentity = sparseProfile.identity;
  if (sparseProfile.contact) payload.proposedContact = sparseProfile.contact;
  if (sparseProfile.companySize) payload.proposedCompanySize = sparseProfile.companySize;
  if (sparseProfile.business) payload.proposedBusiness = sparseProfile.business;
  if (sparseProfile.insights) payload.proposedInsights = sparseProfile.insights;
  if (sparseProfile.companyMembers) payload.proposedCompanyMembers = sparseProfile.companyMembers;

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
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [evidenceMap, setEvidenceMap] = useState<Record<string, FieldEvidence>>({});
  const [imageUploadErrors, setImageUploadErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');

  const [pendingProposal, setPendingProposal] = useState<CompanyProfileUpdateProposalResponse | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [selectedProposalForModal, setSelectedProposalForModal] = useState<CompanyProfileUpdateProposalResponse | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileResponse>('/company-profiles/' + companyProfileId);
      if (res?.data) {
        setOriginalProfile(res.data);
        setLocalProfile(JSON.parse(JSON.stringify(res.data)));
      }
      try {
        const pendingRes = await companyMonitoringApi.getPendingProfileUpdateProposals(companyProfileId);
        const active = (pendingRes || []).find(
          p => p.status === 'SUBMITTED' || p.status === 'IN_REVIEW' || p.status === 'PENDING'
        );
        setPendingProposal(active || null);
      } catch (err) {
        console.error('Failed to fetch pending proposals', err);
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

  const handleSubmitProposal = async () => {
    if (!localProfile || !originalProfile) return;
    const currentChangedFields = changedFieldsFor(originalProfile, localProfile);
    if (!currentChangedFields.length) {
      setShowNoChangeConfirm(true);
      return;
    }
    if (submitting) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildProposalPayload(companyProfileId, localProfile, currentChangedFields, evidenceMap);
      const proposalResponse = await companyMonitoringApi.createMonitoringProposal(
        payload.companyProfileId,
        payload.changeSummary,
        payload.changedFieldPaths,
        payload.fieldEvidence,
        payload.proposedIdentity,
        payload.proposedContact,
        payload.proposedBusiness,
        payload.proposedCompanySize,
        payload.proposedInsights,
        payload.proposedCompanyMembers
      );
      const updateProposalId = proposalResponse.id;
      
      await companyMonitoringApi.submitReview(assignmentId, {
        result: 'UPDATE_PROPOSED',
        updateProposalId,
      });
      onSuccess('Monitoring proposal submitted to Manager.');
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.response?.data?.message || 'Failed to submit monitoring proposal.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawProposal = async () => {
    if (!pendingProposal || withdrawing) return;
    setWithdrawing(true);
    setSubmitError(null);
    try {
      await companyMonitoringApi.withdrawProfileUpdateProposal(pendingProposal.id);
      setShowWithdrawConfirm(false);
      setPendingProposal(null);
      setEvidenceMap({});
      await loadProfile();
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.response?.data?.message || 'Failed to cancel proposal submission.');
    } finally {
      setWithdrawing(false);
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

        {pendingProposal ? (
          <section style={{
            marginTop: '16px',
            padding: '14px 16px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
                Pending Proposal
              </div>
              <strong style={{ color: '#1e3a8a', fontSize: '0.95rem' }}>
                Proposal awaiting manager review.
              </strong>
              <div style={{ fontSize: '0.85rem', color: '#3b82f6', marginTop: '2px' }}>
                Submitted at: {pendingProposal.createdAt ? new Date(pendingProposal.createdAt).toLocaleDateString('en-GB') : '-'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setSelectedProposalForModal(pendingProposal)}
                style={{ background: '#fff' }}
              >
                <Eye size={14} /> View Proposal
              </button>
              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => setShowWithdrawConfirm(true)}
                disabled={withdrawing}
              >
                {withdrawing ? 'Cancelling...' : 'Cancel Submission'}
              </button>
            </div>
          </section>
        ) : (
          <section style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: '16px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Review status:
              </div>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>
                {hasChanges ? `${changedFields.length} change${changedFields.length !== 1 ? 's' : ''} proposed` : 'No changes proposed.'}
              </strong>
              {hasChanges && (
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  ({changedFields.map((field) => field.label).join(', ')})
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => hasChanges ? setShowProposalModal(true) : setShowNoChangeConfirm(true)}
              disabled={submitting}
              style={{
                flexShrink: 0,
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {hasChanges ? <Save size={14} /> : <CheckCircle size={14} />}
              {submitting ? loadingLabel : actionLabel}
            </button>
          </section>
        )}
        
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
            editable={!pendingProposal}
            onSaveOverview={handleSaveOverview}
            onSaveSwot={handleSaveSwot}
            onSaveBusinessFields={handleSaveBusinessFields}
            onSaveBoard={handleSaveBoard}
          />
        </div>
      </PageShell>
      <ConfirmModal
        isOpen={showWithdrawConfirm}
        title="Cancel submitted proposal?"
        message="The Manager will no longer be able to approve or reject this proposal. You can create a new proposal afterward."
        cancelText="Keep Proposal"
        confirmText={withdrawing ? 'Cancelling...' : 'Cancel Submission'}
        confirmDisabled={withdrawing}
        onCancel={() => {
          if (!withdrawing) setShowWithdrawConfirm(false);
        }}
        onConfirm={handleWithdrawProposal}
      />
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
        onConfirm={handleCompleteReview}
      />
      {selectedProposalForModal && (
        <MonitoringReviewDetailsModal
          review={{
            id: 0,
            monitoringAssignmentId: assignmentId,
            companyProfileId: companyProfileId,
            companyName: displayName,
            reviewedById: selectedProposalForModal.submittedBy || 0,
            reviewedByName: selectedProposalForModal.reviewedByName || 'Staff',
            reviewedAt: selectedProposalForModal.createdAt || new Date().toISOString(),
            result: 'UPDATE_PROPOSED',
            updateProposalId: selectedProposalForModal.id,
            proposalStatus: selectedProposalForModal.status,
            note: selectedProposalForModal.changeSummary || null
          }}
          bundle={originalProfile ? { proposal: selectedProposalForModal, profile: originalProfile } : null}
          onClose={() => setSelectedProposalForModal(null)}
          title="Submitted Proposal Details"
        />
      )}
      {showProposalModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)' }} onClick={() => !submitting && setShowProposalModal(false)}></div>
          <div style={{ position: 'relative', backgroundColor: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Submit Monitoring Proposal</h3>
              <button onClick={() => !submitting && setShowProposalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#64748b' }}>×</button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <p style={{ fontSize: '0.9rem', color: '#475569', margin: 0 }}>
                You have proposed <strong>{changedFields.length}</strong> change{changedFields.length !== 1 ? 's' : ''}. You may optionally add evidence (source link, explanation, or screenshot) for each changed field.
              </p>
              {changedFields.map(field => {
                const evidence = evidenceMap[field.path] || { fieldPath: field.path, fieldLabel: field.label };
                return (
                  <div key={field.path} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#0f172a' }}>Field: {field.label}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Source Link (optional)</label>
                        <input 
                          type="text" 
                          placeholder="https://..." 
                          value={evidence.evidenceSource || ''}
                          onChange={(e) => setEvidenceMap(prev => ({ ...prev, [field.path]: { ...evidence, evidenceSource: e.target.value } }))}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Explanation (optional)</label>
                        <input 
                          type="text" 
                          placeholder="Why was this changed?" 
                          value={evidence.evidenceScript || ''}
                          onChange={(e) => setEvidenceMap(prev => ({ ...prev, [field.path]: { ...evidence, evidenceScript: e.target.value } }))}
                          style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }} 
                        />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Evidence Image (optional)</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              if (f.size > 2 * 1024 * 1024) {
                                setImageUploadErrors(prev => ({ ...prev, [field.path]: 'Image must be 2 MB or smaller.' }));
                                return;
                              }
                              try {
                                setImageUploadErrors(prev => ({ ...prev, [field.path]: '' }));
                                const res = await companyMonitoringApi.uploadEvidenceImage(f);
                                setEvidenceMap(prev => ({ ...prev, [field.path]: { ...evidence, evidenceImageId: res.evidenceImageId } }));
                              } catch (err) {
                                console.error(err);
                                setImageUploadErrors(prev => ({ ...prev, [field.path]: 'Unable to upload image. Retry or remove the image.' }));
                              }
                            }
                          }}
                          style={{ fontSize: '0.85rem' }}
                        />
                        {imageUploadErrors[field.path] && <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px' }}>{imageUploadErrors[field.path]} <button onClick={() => setImageUploadErrors(prev => ({ ...prev, [field.path]: '' }))} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Dismiss</button></div>}
                        {evidence.evidenceImageId && <span style={{ fontSize: '0.8rem', color: '#15803d', marginLeft: '8px' }}>Image uploaded ✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                onClick={() => setShowProposalModal(false)} 
                disabled={submitting}
                style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={() => void handleSubmitProposal()} 
                disabled={submitting}
                style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
