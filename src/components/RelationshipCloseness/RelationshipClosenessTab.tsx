import React from 'react';
import type { Role } from '../../context/UserContext';
import { RelationshipClosenessDashboard } from './RelationshipClosenessDashboard';

export interface RelationshipClosenessTabProps {
  companyProfileId: string;
  companyName?: string;
  currentUserRole?: Role;
  setActivePage?: (page: string) => void;
}

export const RelationshipClosenessTab: React.FC<RelationshipClosenessTabProps> = ({
  companyProfileId,
  companyName,
  currentUserRole,
  setActivePage,
}) => {
  return (
    <RelationshipClosenessDashboard
      companyProfileId={companyProfileId}
      companyName={companyName}
      currentUserRole={currentUserRole}
      setActivePage={setActivePage}
    />
  );
};
