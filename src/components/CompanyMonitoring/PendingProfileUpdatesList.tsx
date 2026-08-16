import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { CompanyProfileUpdateProposalResponse } from '../../types/domain';
import styles from './CompanyRelationship.module.css';
import { ProfileUpdateApprovalModal } from './ProfileUpdateApprovalModal';

interface PendingProfileUpdatesListProps {
  companyProfileId: string;
}

export const PendingProfileUpdatesList: React.FC<PendingProfileUpdatesListProps> = ({ companyProfileId }) => {
  const [proposals, setProposals] = useState<CompanyProfileUpdateProposalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedProposal, setSelectedProposal] = useState<CompanyProfileUpdateProposalResponse | null>(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const res = await api.get<CompanyProfileUpdateProposalResponse[]>(`/company-profiles/${companyProfileId}/pending-proposals`);
      setProposals(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load pending profile updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [companyProfileId]);

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/profile-update-proposals/${id}/approve`);
      fetchProposals();
      // Notify parent to refresh CompanyProfileDetail
      window.dispatchEvent(new CustomEvent('apms-profile-updated'));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve proposal');
      throw err;
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/profile-update-proposals/${id}/reject`);
      fetchProposals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject proposal');
      throw err;
    }
  };

  if (loading) return <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading profile updates...</div>;
  if (error) return <div className={styles.errorText}>{error}</div>;

  if (proposals.length === 0) {
    return null; // Hide the section if there are no pending proposals
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <h4 className={styles.sectionTitle}>Pending Profile Updates</h4>
      {proposals.map(p => (
        <div key={p.id} className={styles.proposalCard} style={{ borderLeft: '4px solid #3b82f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className={styles.cardHeader} style={{ fontSize: '1rem', marginBottom: '4px' }}>
              Profile Update Proposed
            </div>
            <div className={styles.cardText} style={{ marginBottom: '4px', fontSize: '0.875rem', color: '#64748b' }}>
              <strong>Proposed At:</strong> {new Date(p.createdAt).toLocaleDateString()}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#334155' }}>
              {p.changeSummary || 'No summary provided.'}
            </div>
          </div>
          
          <button 
            className={styles.actionButton}
            onClick={() => setSelectedProposal(p)}
          >
            Review Updates
          </button>
        </div>
      ))}

      {selectedProposal && (
        <ProfileUpdateApprovalModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
};
