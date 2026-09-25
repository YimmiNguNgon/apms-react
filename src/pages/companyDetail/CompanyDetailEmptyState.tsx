import React from 'react';
import styles from './CompanyDetailEmptyState.module.css';

export interface CompanyDetailEmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
  minHeight?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export const CompanyDetailEmptyState: React.FC<CompanyDetailEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  compact = false,
  minHeight,
  style,
  className,
}) => {
  const customStyle: React.CSSProperties = {
    ...(minHeight ? { minHeight } : {}),
    ...style,
  };

  return (
    <div
      className={`${styles.emptyStateCard} ${compact ? styles.emptyStateCardCompact : ''} ${className || ''}`}
      style={customStyle}
    >
      {icon && <div className={styles.iconWrapper}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.actionWrapper}>{action}</div>}
    </div>
  );
};

export default CompanyDetailEmptyState;
