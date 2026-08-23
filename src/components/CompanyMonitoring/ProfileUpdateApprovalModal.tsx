import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle } from 'lucide-react';
import styles from './CompanyRelationship.module.css';
import type { CompanyProfileUpdateProposalResponse, ProfileResponse } from '../../types/domain';
import { api } from '../../services/api';

interface ProfileUpdateApprovalModalProps {
  proposal: CompanyProfileUpdateProposalResponse;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export const ProfileUpdateApprovalModal: React.FC<ProfileUpdateApprovalModalProps> = ({
  proposal,
  onClose,
  onApprove,
  onReject
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<ProfileResponse | null>(null);
  
  // Custom confirmation modal state
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);

  // Custom toast state
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        const res = await api.get<ProfileResponse>(`/company-profiles/${proposal.companyProfileId}`);
        setCurrentProfile(res.data);
      } catch (err) {
        console.error('Failed to fetch current profile for comparison', err);
      }
    };
    fetchCurrentProfile();
  }, [proposal.companyProfileId]);

  const executeAction = async () => {
    if (!confirmAction) return;
    
    setIsSubmitting(true);
    try {
      if (confirmAction === 'approve') {
        await onApprove(proposal.id);
        showToast('Profile update approved successfully', 'success');
      } else {
        await onReject(proposal.id);
        showToast('Profile update rejected successfully', 'success');
      }
      // Delay closing to show toast
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Action failed';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'N/A';
      return value.map(v => typeof v === 'object' ? v.fullAddress || JSON.stringify(v) : v).join(', ');
    }
    if (typeof value === 'object') return value.fullAddress || JSON.stringify(value, null, 2);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const renderField = (label: string, originalValue: any, proposedValue: any, isFullWidth: boolean = false) => {
    const origStr = formatValue(originalValue);
    const propStr = formatValue(proposedValue);
    const isChanged = origStr !== propStr && propStr !== 'N/A' && proposedValue !== undefined;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: isFullWidth ? '1 / -1' : 'auto' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {isChanged && <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#3b82f6' }} title="Modified"></span>}
        </label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ 
            fontSize: '0.95rem', 
            color: isChanged ? '#15803d' : '#1e293b', 
            fontWeight: isChanged ? 500 : 400,
            backgroundColor: isChanged ? '#dcfce7' : '#f8fafc',
            border: `1px solid ${isChanged ? '#bbf7d0' : '#e2e8f0'}`,
            padding: '8px 12px',
            borderRadius: '6px',
            minHeight: '38px',
            display: 'flex',
            alignItems: 'center',
            wordBreak: 'break-word'
          }}>
            {propStr}
          </div>
          {isChanged && origStr !== 'N/A' && origStr !== '[]' && origStr !== '{}' && (
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through', paddingLeft: '4px' }}>
              {origStr}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '850px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        <div className={styles.modalHeader} style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Review Profile Update Proposal</h3>
          <button className={styles.closeButton} onClick={onClose} disabled={isSubmitting} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.modalBody} style={{ overflowY: 'auto', padding: '24px', flex: 1, backgroundColor: '#f1f5f9' }}>
          
          <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '8px', fontSize: '0.95rem' }}>Change Summary from Staff:</strong>
            <p style={{ color: '#475569', margin: 0, fontSize: '0.95rem' }}>{proposal.changeSummary || 'No summary provided.'}</p>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Legal & Identity Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {renderField('Trade Name', currentProfile?.identity?.tradeName, proposal.proposedIdentity?.tradeName)}
              {renderField('Legal Name', currentProfile?.identity?.legalName, proposal.proposedIdentity?.legalName)}
              {renderField('Tax Code', currentProfile?.identity?.taxCode, proposal.proposedIdentity?.taxCode)}
              {renderField('Registration No', currentProfile?.identity?.registrationNumber, proposal.proposedIdentity?.registrationNumber)}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Contact & Size Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {renderField('Website', currentProfile?.contact?.website, proposal.proposedContact?.website)}
              {renderField('Contact Email', currentProfile?.contact?.emails, proposal.proposedContact?.emails)}
              {renderField('Phone Number', currentProfile?.contact?.phones, proposal.proposedContact?.phones)}
              {renderField('Company Size (Tier)', currentProfile?.companySize?.employeeTier, proposal.proposedCompanySize?.employeeTier)}
              {renderField('Head Office Address', currentProfile?.contact?.addresses, proposal.proposedContact?.addresses, true)}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Business Information</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {renderField('Industry', currentProfile?.business?.industries, proposal.proposedBusiness?.industries)}
              {renderField('Markets (Regions)', currentProfile?.business?.markets, proposal.proposedBusiness?.markets)}
              {renderField('Target Customers', currentProfile?.business?.targetCustomers, proposal.proposedBusiness?.targetCustomers)}
              {renderField('Products & Services', currentProfile?.business?.products?.map((p: any) => p.name).filter(Boolean), proposal.proposedBusiness?.products?.map((p: any) => p.name).filter(Boolean), true)}
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>Relationship Proposal</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              {proposal.proposedRelationship && renderField('Proposed Relationship', currentProfile?.relationshipType, proposal.proposedRelationship, true)}
            </div>
          </div>
          
        </div>

        <div className={styles.modalFooter} style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
          <button 
            onClick={onClose} 
            className={styles.ghostButton}
            disabled={isSubmitting || confirmAction !== null}
          >
            Cancel
          </button>
          <button 
            onClick={() => setConfirmAction('reject')} 
            className={styles.dangerButton}
            disabled={isSubmitting || confirmAction !== null}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <XCircle size={16} /> Reject
          </button>
          <button 
            onClick={() => setConfirmAction('approve')} 
            className={styles.successButton}
            disabled={isSubmitting || confirmAction !== null}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <CheckCircle size={16} /> Approve
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000, backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className={styles.modalContent} style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#0f172a' }}>
              Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
            </h3>
            <p style={{ color: '#475569', marginBottom: '24px' }}>
              Are you sure you want to {confirmAction} this profile update proposal?
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button 
                className={styles.ghostButton} 
                onClick={() => setConfirmAction(null)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                className={confirmAction === 'approve' ? styles.successButton : styles.dangerButton}
                onClick={executeAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Yes, ${confirmAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && toast.show && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 9999,
          animation: 'slideInRight 0.3s ease-out forwards'
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
