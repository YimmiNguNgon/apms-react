import React, { useState } from 'react';
import { CheckCircle, Edit3, X } from 'lucide-react';
import styles from './ReviewSubmissionModal.module.css';

interface ReviewSubmissionModalProps {
  assignmentId: number;
  companyName: string;
  onClose: () => void;
  onSubmit: (assignmentId: number, data: { result: string; note: string; changeSummary?: string }) => Promise<void>;
  onOpenEditor?: () => void;
}

export const ReviewSubmissionModal: React.FC<ReviewSubmissionModalProps> = ({
  assignmentId,
  companyName,
  onClose,
  onSubmit,
  onOpenEditor
}) => {
  const [result, setResult] = useState<'NO_CHANGE' | 'UPDATE_PROPOSED'>('NO_CHANGE');
  const [changeSummary, setChangeSummary] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (result === 'UPDATE_PROPOSED' && !changeSummary.trim()) {
      setError('Change summary is required when proposing an update.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(assignmentId, { 
        result, 
        note, 
        changeSummary: result === 'UPDATE_PROPOSED' ? changeSummary : undefined 
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to submit review', err);
      setError(err?.response?.data?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Submit Review</h2>
          <button className={styles.closeButton} onClick={onClose}><X size={20} /></button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.pageSubtitle}>
            Reviewing monitoring assignment for: <strong>{companyName}</strong>
          </p>

          {error && (
            <div style={{ color: '#ef4444', backgroundColor: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
              {error}
            </div>
          )}
          
          <div className={styles.cardGrid}>
            <div 
              className={`${styles.resultCard} ${result === 'NO_CHANGE' ? styles.selectedOk : ''}`}
              onClick={() => setResult('NO_CHANGE')}
            >
              <div className={styles.cardIcon}>
                <CheckCircle size={24} />
              </div>
              <div>
                <div className={styles.cardTitle}>All Clear</div>
                <div className={styles.cardDesc}>No changes needed</div>
              </div>
            </div>

            <div 
              className={`${styles.resultCard} ${result === 'UPDATE_PROPOSED' ? styles.selectedUpdate : ''}`}
              onClick={() => setResult('UPDATE_PROPOSED')}
            >
              <div className={styles.cardIcon}>
                <Edit3 size={24} />
              </div>
              <div>
                <div className={styles.cardTitle}>Propose Update</div>
                <div className={styles.cardDesc}>Company details changed</div>
              </div>
            </div>
          </div>

          {result === 'UPDATE_PROPOSED' && (
            <div className={`${styles.formGroup} ${styles.slideDown}`} style={{ textAlign: 'center', margin: '24px 0' }}>
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '16px' }}>
                You have selected to propose updates. Please open the profile editor to make your changes and attach evidence.
              </p>
              <button 
                className={styles.actionButton} 
                onClick={onOpenEditor}
                style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              >
                Open Profile Editor
              </button>
            </div>
          )}

          {result === 'NO_CHANGE' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Review Notes (Optional)</label>
                <textarea 
                  className={styles.formTextarea} 
                  placeholder="Any additional context or findings..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div className={styles.modalFooter}>
                <button 
                  className={styles.ghostButton} 
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  className={styles.actionButton} 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
