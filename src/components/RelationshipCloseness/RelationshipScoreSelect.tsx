import React from 'react';
import styles from './RelationshipCloseness.module.css';

export interface RelationshipScoreSelectProps {
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

const RELATIONSHIP_SCORE_OPTIONS = [5, 4, 3, 2, 1, 0] as const;

export const RelationshipScoreSelect: React.FC<RelationshipScoreSelectProps> = ({
  value,
  onChange,
  placeholder = 'Chọn điểm',
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
}) => {
  const isUnset = value === null || value === undefined;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onChange(null);
    } else {
      const parsed = parseInt(rawVal, 10);
      onChange(Number.isNaN(parsed) ? null : parsed);
    }
  };

  return (
    <select
      id={id}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`${styles.scoreSelect} ${isUnset ? styles.scoreSelectUnset : ''} ${className || ''}`}
      value={!isUnset ? String(value) : ''}
      onChange={handleChange}
    >
      <option value="">{placeholder}</option>
      {RELATIONSHIP_SCORE_OPTIONS.map((score) => (
        <option key={score} value={score}>
          {score}
        </option>
      ))}
    </select>
  );
};
