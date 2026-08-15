import React, { useEffect, useState } from 'react';
import { companyMonitoringApi } from '../../API/companyMonitoringApi';
import type { RelationshipHistoryResponse } from '../../types/domain';
import styles from './CompanyRelationship.module.css';

interface CompanyRelationshipHistoryListProps {
  companyProfileId: string;
}

export const CompanyRelationshipHistoryList: React.FC<CompanyRelationshipHistoryListProps> = ({ companyProfileId }) => {
  const [history, setHistory] = useState<RelationshipHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const data = await companyMonitoringApi.getRelationshipHistory(companyProfileId);
        setHistory(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load relationship history.');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [companyProfileId]);

  if (loading) return <div>Loading history...</div>;
  if (error) return <div className={styles.errorText}>{error}</div>;
  if (history.length === 0) return null;

  return (
    <div>
      <h4 className={styles.historyTitle}>Relationship History</h4>
      {history.map((h) => (
        <div key={h.id} className={styles.historyCard}>
          <div className={styles.cardHeader}>
            {h.oldRelationshipType} ➔ {h.newRelationshipType}
          </div>
          <div className={styles.cardText}>
            <strong>Date:</strong> {new Date(h.changedAt).toLocaleString()}
          </div>
          <div className={styles.cardText}>
            <strong>Proposed By:</strong> {h.proposedByAccountName}
          </div>
          <div className={styles.cardText}>
            <strong>Approved By:</strong> {h.approvedByAccountName}
          </div>
          {h.reason && (
            <div className={styles.cardReason}>
              <strong>Reason:</strong> {h.reason}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
