import React from 'react';
import { CompanyList } from './CompanyList';

interface ManagerCompanyProfilesProps {
  setActivePage: (page: string) => void;
}

export const ManagerCompanyProfiles: React.FC<ManagerCompanyProfilesProps> = ({ setActivePage }) => {
  return (
    <CompanyList
      setActivePage={setActivePage}
      createdByMe={true}
      source="my-companies"
      subtitle="List of companies you created and manage"
    />
  );
};
