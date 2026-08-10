import React from 'react';
import type { AiFieldResult } from '../../types/domain';
import { EditableListField } from './EditableListField';
import styles from './CandidateReview.module.css';

interface SwotGridProps {
  strengths?: AiFieldResult;
  weaknesses?: AiFieldResult;
  opportunities?: AiFieldResult;
  threats?: AiFieldResult;
  onChange: (key: string, value: string[], status?: string) => void;
  disabled?: boolean;
}

export const SwotGrid: React.FC<SwotGridProps> = ({
  strengths,
  weaknesses,
  opportunities,
  threats,
  onChange,
  disabled,
}) => {
  return (
    <div className={styles.swotGrid}>
      <EditableListField
        label="Strengths"
        fieldKey="insights.strengths"
        fieldResult={strengths}
        onChange={onChange}
        disabled={disabled}
      />
      <EditableListField
        label="Weaknesses"
        fieldKey="insights.weaknesses"
        fieldResult={weaknesses}
        onChange={onChange}
        disabled={disabled}
      />
      <EditableListField
        label="Opportunities"
        fieldKey="insights.opportunities"
        fieldResult={opportunities}
        onChange={onChange}
        disabled={disabled}
      />
      <EditableListField
        label="Threats"
        fieldKey="insights.threats"
        fieldResult={threats}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};
