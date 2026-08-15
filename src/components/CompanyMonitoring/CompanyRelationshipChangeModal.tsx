import React, { useState } from 'react';
import { companyMonitoringApi } from '../../API/companyMonitoringApi';
import styles from './CompanyRelationship.module.css';

interface CompanyRelationshipChangeModalProps {
  open: boolean;
  onClose: () => void;
  assignmentId: number;
  onSuccess: () => void;
}

const RELATIONSHIP_TYPES = [
  'PARTNER_WITH',
  'POTENTIAL_PARTNER_OF',
  'COMPETITOR_OF',
  'CUSTOMER_OF',
  'SUPPLIER_OF'
];

export const CompanyRelationshipChangeModal: React.FC<CompanyRelationshipChangeModalProps> = ({
  open,
  onClose,
  assignmentId,
  onSuccess
}) => {
  const [newRelationshipType, setNewRelationshipType] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!newRelationshipType) {
      setError('Please select a new relationship type.');
      return;
    }
    if (!reason) {
      setError('Please provide a reason for the change.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await companyMonitoringApi.proposeRelationshipChange(assignmentId, {
        newRelationshipType,
        reason
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to propose relationship change.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>Propose Relationship Change</h3>

        {error && <div className={styles.errorText}>{error}</div>}

        <div className={styles.formGroup}>
          <label>New Relationship Type</label>
          <select
            className={styles.select}
            value={newRelationshipType}
            onChange={(e) => setNewRelationshipType(e.target.value)}
          >
            <option value="" disabled>Select relationship type...</option>
            {RELATIONSHIP_TYPES.map(type => (
              <option key={type} value={type}>{type.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Reason for Change</label>
          <textarea
            className={styles.textarea}
            placeholder="Describe the reason for the proposed relationship change..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>

        <div className={styles.actions}>
          <button 
            className={styles.secondaryButton} 
            onClick={onClose} 
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className={styles.primaryButton}
            onClick={handleSubmit} 
            disabled={loading || !newRelationshipType || !reason}
          >
            {loading ? 'Submitting...' : 'Propose Change'}
          </button>
        </div>
      </div>
    </div>
  );
};
