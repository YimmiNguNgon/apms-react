import React from 'react';
import styles from './CandidateReview.module.css';

interface CandidateQualitySummaryProps {
  metrics: Record<string, any>;
  status: string;
}

export const CandidateQualitySummary: React.FC<CandidateQualitySummaryProps> = ({ metrics, status }) => {
  // Check if we actually have metrics data (distinguish from real 0)
  const isAvailable = metrics && Object.keys(metrics).length > 0;

  const averageConfidence = isAvailable ? (metrics.averageConfidence ?? 0) : null;
  const confidenceScore = averageConfidence !== null ? (averageConfidence * 100).toFixed(1) : 'N/A';
  
  const totalFields = isAvailable ? (metrics.totalFields ?? 0) : null;
  const fieldsWithValue = isAvailable ? (metrics.fieldsWithValue ?? 0) : null;
  
  const passedFields = isAvailable ? (metrics.passedFields ?? 0) : null;
  const failedFields = isAvailable ? (metrics.failedFields ?? 0) : null;
  
  const completenessRate = isAvailable ? (metrics.completenessRate ?? 0) : null;
  const completenessScore = completenessRate !== null ? (completenessRate * 100).toFixed(1) : 'N/A';
  
  const evidenceCoverageRate = isAvailable ? (metrics.evidenceCoverageRate ?? 0) : null;
  const evidenceScore = evidenceCoverageRate !== null ? (evidenceCoverageRate * 100).toFixed(0) : 'N/A';

  return (
    <div className={styles.qualitySummaryRow}>
      <div className={styles.metricTile}>
        <span className={styles.metricLabel}>AI Confidence</span>
        <span className={styles.metricValue}>{confidenceScore}{averageConfidence !== null ? '%' : ''}</span>
        <span className={styles.metricSubtext}>
          {averageConfidence === null ? 'No score' : averageConfidence >= 0.85 ? 'High confidence' : averageConfidence >= 0.6 ? 'Medium confidence' : 'Low confidence'}
        </span>
        {averageConfidence !== null && (
          <div className={styles.metricProgress}>
            <div 
              className={styles.metricFill} 
              style={{ 
                width: `${confidenceScore}%`,
                backgroundColor: averageConfidence < 0.6 ? '#ef4444' : averageConfidence < 0.85 ? '#eab308' : '#22c55e'
              }} 
            />
          </div>
        )}
      </div>
      
      <div className={styles.metricTile}>
        <span className={styles.metricLabel}>Extracted</span>
        <span className={styles.metricValue}>{fieldsWithValue !== null ? `${fieldsWithValue}/${totalFields}` : 'N/A'}</span>
        <span className={styles.metricSubtext}>
          {fieldsWithValue !== null && totalFields ? `${Math.round((fieldsWithValue / totalFields) * 100)}% extracted` : 'No fields'}
        </span>
        {totalFields !== null && totalFields > 0 && (
          <div className={styles.metricProgress}>
            <div 
              className={styles.metricFill} 
              style={{ width: `${(fieldsWithValue! / totalFields) * 100}%`, backgroundColor: '#3b82f6' }} 
            />
          </div>
        )}
      </div>

      <div className={styles.metricTile}>
        <span className={styles.metricLabel}>Evidence</span>
        <span className={styles.metricValue}>{evidenceScore}{evidenceCoverageRate !== null ? '%' : ''}</span>
        <span className={styles.metricSubtext}>
          {evidenceCoverageRate === null ? 'No coverage' : evidenceCoverageRate >= 0.95 ? 'Full coverage' : 'Partial coverage'}
        </span>
        {evidenceCoverageRate !== null && (
          <div className={styles.metricProgress}>
            <div 
              className={styles.metricFill} 
              style={{ width: `${evidenceScore}%`, backgroundColor: '#8b5cf6' }} 
            />
          </div>
        )}
      </div>

      <div className={styles.metricTile}>
        <span className={styles.metricLabel}>Validated</span>
        <span className={styles.metricValue}>{passedFields !== null ? `${passedFields}/${totalFields}` : 'N/A'}</span>
        <span className={`${styles.metricSubtext} ${failedFields !== null && failedFields > 0 ? styles.metricIssueText : ''}`}>
          {failedFields !== null && failedFields > 0 ? `${failedFields} validation issue${failedFields === 1 ? '' : 's'}` : 'No validation issues'}
        </span>
        {failedFields !== null && failedFields > 0 && (
          <span className={styles.metricIssueBadge}>Needs review</span>
        )}
      </div>

      <div className={styles.metricTile}>
        <span className={styles.metricLabel}>Completeness</span>
        <span className={styles.metricValue}>{completenessScore}{completenessRate !== null ? '%' : ''}</span>
        <span className={styles.metricSubtext}>Data completeness</span>
        {completenessRate !== null && (
          <div className={styles.metricProgress}>
            <div 
              className={styles.metricFill} 
              style={{ 
                width: `${completenessScore}%`,
                backgroundColor: completenessRate < 0.5 ? '#f97316' : completenessRate < 0.8 ? '#3b82f6' : '#22c55e'
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};
