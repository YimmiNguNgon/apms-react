import React, { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, ArrowRight, Save, Trash2, Edit3, PlusCircle } from 'lucide-react';
import { api } from '../../services/api';
import type { CompanyProfileUpdateProposalResponse, ProfileResponse } from '../../types/domain';
import styles from './ProfileUpdateApprovalModal.module.css';

interface ProfileUpdateApprovalModalProps {
  proposal: CompanyProfileUpdateProposalResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export const ProfileUpdateApprovalModal: React.FC<ProfileUpdateApprovalModalProps> = ({ proposal, onClose, onSuccess }) => {
  const [currentProfile, setCurrentProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<ProfileResponse>('/company-profiles/' + proposal.companyProfileId);
        if (res.data) {
          setCurrentProfile(res.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [proposal.companyProfileId]);

  const executeAction = async () => {
    if (!confirmAction) return;
    setIsSubmitting(true);
    try {
      if (confirmAction === 'approve') {
        await api.patch('/profile-update-proposals/' + proposal.id + '/approve', { reviewComment });
      } else {
        await api.patch('/profile-update-proposals/' + proposal.id + '/reject', { reviewComment });
      }
      setToast({ show: true, message: 'Proposal successfully ' + confirmAction + 'd.', type: 'success' });
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setToast({ show: true, message: err?.message || 'Failed to ' + confirmAction + ' proposal.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      setIsSubmitting(false);
      setConfirmAction(null);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return 'N/A';
    if (Array.isArray(value)) {
      if (value.length === 0) return 'N/A';
      return value.map(v => typeof v === 'object' ? (v.name || v.fullName || v.title || v.fullAddress || JSON.stringify(v)) : v).join(', ');
    }
    if (typeof value === 'object') return value.fullAddress || value.name || value.employeeTier || JSON.stringify(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  };

  const renderDiffField = (label: string, fieldPath: string, original: any, proposed: any, isFullWidth = false) => {
    if (proposal.changedFieldPaths?.length && !proposal.changedFieldPaths.includes(fieldPath)) {
      return null;
    }
    const origStr = formatValue(original);
    const propStr = formatValue(proposed);
    if (origStr === propStr || (origStr === 'N/A' && proposed === undefined)) return null;

    const evidence = proposal.fieldEvidence?.find(e => e.fieldPath === fieldPath);

    return (
      <div key={label} style={{ display: 'flex', flexDirection: 'column' as any, gap: '8px', gridColumn: isFullWidth ? '1 / -1' : 'auto', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as any }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', fontSize: '0.875rem', textDecoration: 'line-through' }}>
            {origStr}
          </div>
          <ArrowRight size={16} color="#94a3b8" />
          <div style={{ flex: 1, padding: '8px 12px', background: '#dcfce3', color: '#166534', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 500 }}>
            {propStr}
          </div>
        </div>
        {evidence && (
          <div style={{ marginTop: '8px', padding: '8px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>Supporting Evidence provided:</div>
            {evidence.evidenceSource && <div><strong>Source:</strong> <a href={evidence.evidenceSource} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{evidence.evidenceSource}</a></div>}
            {evidence.evidenceScript && <div><strong>Explanation:</strong> {evidence.evidenceScript}</div>}
            {evidence.evidenceImageId && <div><strong>Image Attached:</strong> <span style={{ color: '#15803d' }}>Yes (ID: {evidence.evidenceImageId})</span></div>}
          </div>
        )}
      </div>
    );
  };

  const renderBoardMembersDiff = (fieldPath: string, original: any[], proposed: any[]) => {
    if (proposal.changedFieldPaths?.length && !proposal.changedFieldPaths.includes(fieldPath)) {
      return null;
    }
    if (!original?.length && !proposed?.length) return null;
    if (JSON.stringify(original) === JSON.stringify(proposed)) return null;

    const origMembers = original || [];
    const propMembers = proposed || [];

    const renderMember = (member: any, type: 'orig' | 'prop') => (
      <div key={member.fullName + member.position} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', background: type === 'orig' ? '#fee2e2' : '#dcfce3', color: type === 'orig' ? '#991b1b' : '#166534', borderRadius: '6px', marginBottom: '8px', textDecoration: type === 'orig' ? 'line-through' : 'none' }}>
        {member.imageUrl ? (
          <img src={member.imageUrl} alt={member.fullName} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>{member.fullName?.charAt(0) || '?'}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{member.fullName}</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{member.position}</span>
        </div>
      </div>
    );

    return (
      <div key="board-members" style={{ display: 'flex', flexDirection: 'column' as any, gap: '8px', gridColumn: '1 / -1', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as any }}>Board Members</span>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as any }}>
            {origMembers.length === 0 ? <div style={{ fontSize: '0.875rem', padding: '8px', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', textDecoration: 'line-through' }}>N/A</div> : origMembers.map((m: any) => renderMember(m, 'orig'))}
          </div>
          <ArrowRight size={16} color="#94a3b8" style={{ marginTop: '16px' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as any }}>
            {propMembers.length === 0 ? <div style={{ fontSize: '0.875rem', padding: '8px', background: '#dcfce3', borderRadius: '6px', color: '#166534' }}>N/A</div> : propMembers.map((m: any) => renderMember(m, 'prop'))}
          </div>
        </div>
        {(() => {
          const evidence = proposal.fieldEvidence?.find(e => e.fieldPath === fieldPath);
          if (!evidence) return null;
          return (
            <div style={{ marginTop: '12px', padding: '8px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: '4px' }}>Supporting Evidence provided:</div>
              {evidence.evidenceSource && <div><strong>Source:</strong> <a href={evidence.evidenceSource} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{evidence.evidenceSource}</a></div>}
              {evidence.evidenceScript && <div><strong>Explanation:</strong> {evidence.evidenceScript}</div>}
              {evidence.evidenceImageId && <div><strong>Image Attached:</strong> <span style={{ color: '#15803d' }}>Yes (ID: {evidence.evidenceImageId})</span></div>}
            </div>
          );
        })()}
      </div>
    );
  };

  const renderDiffSection = (title: string, fields: React.ReactNode[]) => {
    const validFields = fields.filter(f => f !== null);
    if (validFields.length === 0) return null;
    return (
      <div key={title} style={{ marginBottom: '24px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '2px solid #f1f5f9', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Edit3 size={18} color="#3b82f6" /> {title}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {validFields}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modalContent} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <span>Loading proposal data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' as any, padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 700 }}>Review Profile Update Proposal</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
              Submitted on {proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>
          <button onClick={onClose} disabled={isSubmitting} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', padding: '8px', borderRadius: '50%' }}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto' as any, padding: '24px', flex: 1, backgroundColor: '#f1f5f9' }}>
          
          <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <AlertCircle size={20} color="#3b82f6" style={{ marginTop: '2px' }} />
            <div>
              <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px', fontSize: '0.95rem' }}>Staff Change Summary</strong>
              <p style={{ color: '#475569', margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                {proposal.changeSummary || 'No summary provided by the staff.'}
              </p>
            </div>
          </div>

          {/* Diffs */}
          {renderDiffSection('Legal & Identity', [
            renderDiffField('Trade Name', 'identity.tradeName', currentProfile?.identity?.tradeName, proposal.proposedIdentity?.tradeName),
            renderDiffField('Legal Name', 'identity.legalName', currentProfile?.identity?.legalName, proposal.proposedIdentity?.legalName),
            renderDiffField('Tax Code', 'identity.taxCode', currentProfile?.identity?.taxCode, proposal.proposedIdentity?.taxCode),
            renderDiffField('Registration No', 'identity.registrationNumber', currentProfile?.identity?.registrationNumber, proposal.proposedIdentity?.registrationNumber),
            renderDiffField('Stock Ticker', 'identity.stockTicker', currentProfile?.identity?.stockTicker, proposal.proposedIdentity?.stockTicker),
          ])}

          {renderDiffSection('Contact & Size', [
            renderDiffField('Website', 'contact.website', currentProfile?.contact?.website, proposal.proposedContact?.website),
            renderDiffField('Contact Email', 'contact.emails', currentProfile?.contact?.emails, proposal.proposedContact?.emails),
            renderDiffField('Phone Number', 'contact.phones', currentProfile?.contact?.phones, proposal.proposedContact?.phones),
            renderDiffField('Company Size (Tier)', 'companySize.employeeTier', currentProfile?.companySize?.employeeTier, proposal.proposedCompanySize?.employeeTier),
            renderDiffField('Head Office', 'contact.addresses', currentProfile?.contact?.addresses, proposal.proposedContact?.addresses, true),
          ])}

          {renderDiffSection('Business & Strategy', [
            renderDiffField('Industries', 'business.industries', currentProfile?.business?.industries, proposal.proposedBusiness?.industries),
            renderDiffField('Markets', 'business.markets', currentProfile?.business?.markets, proposal.proposedBusiness?.markets),
            renderDiffField('Target Customers', 'business.targetCustomers', currentProfile?.business?.targetCustomers, proposal.proposedBusiness?.targetCustomers),
            renderDiffField('Business Model', 'business.businessModel', currentProfile?.business?.businessModel, proposal.proposedBusiness?.businessModel),
            renderDiffField('Products & Services', 'business.products', currentProfile?.business?.products, proposal.proposedBusiness?.products, true),
          ])}

          {renderDiffSection('SWOT Analysis', [
            renderDiffField('Strengths', 'insights.strengths', currentProfile?.insights?.strengths, proposal.proposedInsights?.strengths, true),
            renderDiffField('Weaknesses', 'insights.weaknesses', currentProfile?.insights?.weaknesses, proposal.proposedInsights?.weaknesses, true),
            renderDiffField('Opportunities', 'insights.opportunities', currentProfile?.insights?.opportunities, proposal.proposedInsights?.opportunities, true),
            renderDiffField('Threats', 'insights.threats', currentProfile?.insights?.threats, proposal.proposedInsights?.threats, true),
          ])}

          {renderDiffSection('Board & Management', [
            renderBoardMembersDiff('companyMembers', currentProfile?.companyMembers || [], proposal.proposedCompanyMembers || []),
          ])}
          
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
          <button onClick={onClose} disabled={isSubmitting || confirmAction !== null} style={{ padding: '10px 16px', border: '1px solid #cbd5e1', background: '#fff', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={() => setConfirmAction('reject')} disabled={isSubmitting || confirmAction !== null} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', background: '#fee2e2', color: '#991b1b', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            <XCircle size={18} /> Reject Updates
          </button>
          <button onClick={() => setConfirmAction('approve')} disabled={isSubmitting || confirmAction !== null} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', border: 'none', background: '#2563eb', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
            <CheckCircle size={18} /> Approve Updates
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className={styles.modalOverlay} style={{ zIndex: 1000, backgroundColor: 'rgba(15, 23, 42, 0.75)' }}>
          <div className={styles.modalContent} style={{ maxWidth: '420px', padding: '24px', textAlign: 'center', borderRadius: '16px' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: confirmAction === 'approve' ? '#dbeafe' : '#fee2e2', borderRadius: '50%', marginBottom: '16px' }}>
              {confirmAction === 'approve' ? <CheckCircle size={32} color="#2563eb" /> : <XCircle size={32} color="#dc2626" />}
            </div>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 12px 0', color: '#0f172a' }}>
              Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
            </h3>
            <p style={{ color: '#475569', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Are you sure you want to {confirmAction} this profile update proposal? {confirmAction === 'approve' && 'This will instantly update the public company profile and increment its version.'}
            </p>
            <div style={{ marginBottom: '24px', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>
                Decision Note (Optional, visible to staff)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={`Why was this ${confirmAction}d?`}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', fontSize: '0.9rem', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
              <button onClick={() => setConfirmAction(null)} disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', color: '#475569', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={executeAction} disabled={isSubmitting} style={{ flex: 1, padding: '10px', background: confirmAction === 'approve' ? '#2563eb' : '#dc2626', border: 'none', color: '#fff', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                {isSubmitting ? 'Processing...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && toast.show && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '12px 24px', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '8px',
          zIndex: 9999, animation: 'slideInRight 0.3s ease-out forwards' as any
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          <span style={{ fontWeight: 500 }}>{toast.message}</span>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      ` }} />
    </div>
  );
};
