import React, { useEffect, useState } from 'react';
import { companyMonitoringApi } from '../../API/companyMonitoringApi';
import type { RelationshipChangeProposalResponse } from '../../types/domain';
import styles from './CompanyRelationship.module.css';

interface PendingProposalsListProps {
  companyProfileId: string;
}

export const PendingProposalsList: React.FC<PendingProposalsListProps> = ({ companyProfileId }) => {
  const [proposals, setProposals] = useState<RelationshipChangeProposalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const data = await companyMonitoringApi.getPendingProposals(companyProfileId);
      setProposals(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load pending proposals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [companyProfileId]);

  const handleApprove = async (id: number) => {
    try {
      await companyMonitoringApi.approveProposal(id);
      fetchProposals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve proposal');
    }
  };

  const handleRejectClick = (id: number) => {
    setSelectedProposalId(id);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!selectedProposalId) return;
    try {
      await companyMonitoringApi.rejectProposal(selectedProposalId, { rejectReason });
      setRejectDialogOpen(false);
      fetchProposals();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject proposal');
    }
  };

  if (loading) return <div>Loading proposals...</div>;
  if (error) return <div className={styles.errorText}>{error}</div>;
  if (proposals.length === 0) return null;

  return (
    <div>
      <h4 className={styles.sectionTitle}>Pending Relationship Change Proposals</h4>
      {proposals.map(p => (
        <div key={p.id} className={styles.proposalCard}>
          <div className={styles.cardHeader}>
            {p.oldRelationshipType} ➔ {p.newRelationshipType}
          </div>
          <div className={styles.cardText}>
            <strong>Proposed By:</strong> {p.proposedByAccountName} on {new Date(p.proposedAt).toLocaleDateString()}
          </div>
          <div className={styles.cardReason}>
            <strong>Reason:</strong> {p.reason}
          </div>

          <div className={styles.cardActions}>
            <button 
              className={styles.successButton} 
              onClick={() => handleApprove(p.id)}
            >
              Approve
            </button>
            <button 
              className={styles.dangerButton} 
              onClick={() => handleRejectClick(p.id)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {rejectDialogOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Reject Proposal</h3>
            <div className={styles.formGroup}>
              <label>Reason for Rejection</label>
              <textarea
                className={styles.textarea}
                autoFocus
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <button 
                className={styles.secondaryButton} 
                onClick={() => setRejectDialogOpen(false)}
              >
                Cancel
              </button>
              <button 
                className={styles.dangerButton} 
                onClick={handleRejectConfirm} 
                disabled={!rejectReason.trim()}
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
