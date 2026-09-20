import React from 'react';
import type { RelationshipAssessmentResponse } from '../../types/relationshipAssessment';
import styles from './RelationshipCloseness.module.css';

interface RelationshipAssessmentHistoryProps {
  history: RelationshipAssessmentResponse[];
  onSelectVersion?: (version: RelationshipAssessmentResponse) => void;
}

const formatDate = (val?: string | null) => {
  if (!val) return '—';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RelationshipAssessmentHistory: React.FC<RelationshipAssessmentHistoryProps> = ({
  history,
  onSelectVersion,
}) => {
  if (!history || history.length === 0) {
    return (
      <div className={styles.emptyBox} style={{ padding: '24px 16px' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
          No previous finalized assessments recorded yet.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.historyList}>
      {history.map((item) => {
        const rank = item.officialRank || item.ownerFinalRank || item.managerRank || 'D';
        const score = item.officialScore ?? item.ownerFinalTotalScore ?? item.managerTotalScore;
        const isOwnerAdjustment = Boolean(item.isOwnerAdjustment || item.assessmentType === 'OWNER_ADJUSTMENT');
        const rankBadgeClass =
          rank === 'A'
            ? styles.rankBadgeA
            : rank === 'B'
            ? styles.rankBadgeB
            : rank === 'C'
            ? styles.rankBadgeC
            : styles.rankBadgeD;

        return (
          <div key={item.id} className={styles.historyItem}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className={rankBadgeClass} style={{ width: 34, height: 34, fontSize: '0.95rem' }}>
                {rank}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>
                    {item.formattedVersion ? (item.formattedVersion.startsWith('V') ? item.formattedVersion : `Version ${item.formattedVersion}`) : `Version ${item.versionNumber}`}
                  </span>
                  <span style={{ fontWeight: 800, color: '#1e40af', fontSize: '0.95rem' }}>
                    {score !== null && score !== undefined ? `${score} / 100` : '— / 100'}
                  </span>
                  {isOwnerAdjustment ? (
                    <span
                      style={{
                        background: '#f5f3ff',
                        color: '#7c3aed',
                        border: '1px solid #ddd6fe',
                        borderRadius: 999,
                        padding: '2px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      Owner Adjustment {item.sourceFormattedVersion || item.sourceVersionNumber ? `(từ ${item.sourceFormattedVersion || `V${item.sourceVersionNumber}`})` : ''}
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: 999,
                        padding: '2px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                      }}
                    >
                      Manager Assessment
                    </span>
                  )}
                  <span className={`${styles.statusBadge} ${styles.statusFinalized}`}>
                    {item.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3 }}>
                  Finalized on {formatDate(item.finalizedAt)} · Policy: {item.scoringPolicyVersion}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {item.normalizationApplied && (
                <span className={styles.normalizedPill} style={{ margin: 0 }}>
                  ⚖️ Normalized (85-pt)
                </span>
              )}
              {onSelectVersion && (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                  onClick={() => onSelectVersion(item)}
                >
                  View Details
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
