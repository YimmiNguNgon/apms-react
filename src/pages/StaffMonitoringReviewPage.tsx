import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';
import type { ProfileResponse } from '../types/domain';
import { Building2, FileText, LayoutGrid, Shield, TrendingUp, Save, ArrowLeft } from 'lucide-react';
import { formatCompanyName } from './companyDetail/tokens';
import { CompanyProfileHeader, PageShell } from './companyDetail/CompanyProfileHeader';
import { ListingTabBar, type ListingTabId } from './companyDetail/ListingTabs';
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

export const StaffMonitoringReviewPage: React.FC<{
  assignmentId: number;
  companyProfileId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ assignmentId, companyProfileId, onClose, onSuccess }) => {
  const [originalProfile, setOriginalProfile] = useState<ProfileResponse | null>(null);
  const [localProfile, setLocalProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<ListingTabId>('overview');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ProfileResponse>(/company-profiles/ + companyProfileId);
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
    np.identity = { ...np.identity, legalName: payload.legalName, tradeName: payload.tradeName, taxCode: payload.taxCode, registrationNumber: payload.registrationNumber, stockTicker: payload.stockTicker, stockExchange: payload.stockExchange } as any;
    np.contact = { ...np.contact, website: payload.website, emails: [payload.email], phones: [payload.phone], addresses: [{ fullAddress: payload.address, type: '', city: '', country: '' }] } as any;
    np.companySize = { ...np.companySize, employeeTier: payload.employeeTier, employeeCount: payload.employeeCount } as any;
    np.business = { ...np.business, businessModel: payload.businessModel, industries: payload.industries } as any;
    setLocalProfile(np);
  };

  const handleSaveSwot = async (payload: SwotPayload) => {
    if (!localProfile) return;
    setLocalProfile({ ...localProfile, insights: payload.insights });
  };

  const handleSaveBusinessFields = async (payload: BusinessFieldsPayload) => {
    if (!localProfile) return;
    const np = { ...localProfile };
    np.business = { ...np.business, products: payload.products, markets: payload.markets, targetCustomers: payload.targetCustomers } as any;
    setLocalProfile(np);
  };

  const handleSaveBoard = async (payload: BoardPayload) => {
    if (!localProfile) return;
    setLocalProfile({ ...localProfile, companyMembers: payload.companyMembers });
  };

  const handleSubmitProposal = async () => {
    if (!localProfile || !originalProfile) return;
    setSubmitting(true);
    try {
      const payload = {
        companyProfileId,
        changeSummary: 'Staff monitoring updates',
        sourceDocumentIds: [],
        proposedIdentity: localProfile.identity,
        proposedContact: localProfile.contact,
        proposedCompanySize: localProfile.companySize,
        proposedBusiness: localProfile.business,
        proposedInsights: localProfile.insights,
        proposedFinancial: localProfile.financial,
        proposedMarket: localProfile.market,
        proposedInnovation: localProfile.innovation,
        proposedRisk: localProfile.risk,
        proposedCompliance: localProfile.compliance,
        proposedCompanyMembers: localProfile.companyMembers,
      };
      const proposalResponse = await api.post('/profile-update-proposals/monitoring', payload);
      const updateProposalId = (proposalResponse as any).data.id;
      
      await companyMonitoringApi.submitReview(assignmentId, {
        result: 'UPDATE_PROPOSED',
        note: 'Staff proposed profile updates.',
        updateProposalId,
      });
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !localProfile) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  const displayName = formatCompanyName(localProfile.identity?.tradeName || localProfile.identity?.legalName);
  const initials = displayName.substring(0, 2).toUpperCase() || 'CP';
  const hasChanges = JSON.stringify(localProfile) !== JSON.stringify(originalProfile);

  return (
    <div style={{ background: '#f8fafc', overflowY: 'auto' }}>
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
              <button
                onClick={handleSubmitProposal}
                disabled={!hasChanges || submitting}
                style={{
                  background: hasChanges ? '#2563eb' : '#cbd5e1',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Save size={16} /> {submitting ? 'Submitting...' : 'Submit Proposal to Manager'}
              </button>
            </>
          }
        />
        
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
            onSaveOverview={handleSaveOverview as any}
            onSaveSwot={handleSaveSwot as any}
            onSaveBusinessFields={handleSaveBusinessFields as any}
            onSaveBoard={handleSaveBoard as any}
          />
        </div>
      </PageShell>
    </div>
  );
};
