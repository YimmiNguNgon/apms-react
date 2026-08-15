import React from 'react';
import type { ListingTabDef, ListingTabId } from './utils';
import { LISTING_TABS } from './utils';
import styles from '../CompanyDetail.module.css';

export type { ListingTabId };

interface ListingTabsProps {
  companyId: string;
  activeTab: ListingTabId;
  onTabChange: (tab: ListingTabId) => void;
  userRole?: string | null;
  isOwnerProfile?: boolean;
  isDrawerMode?: boolean;
  tabs?: ListingTabDef[];
}

export const ListingTabBar: React.FC<ListingTabsProps> = ({ activeTab, onTabChange, userRole, isOwnerProfile, isDrawerMode, tabs: customTabs }) => {
  const tabs = customTabs || LISTING_TABS.filter((tab) => {
    if (isDrawerMode && (tab.id === 'internal-news' || tab.id === 'documents')) {
      return false;
    }
    if (tab.id === 'internal-news' && userRole === 'BUSINESS_DEVELOPMENT_STAFF') {
      return false;
    }
    if (isOwnerProfile && (tab.id === 'internal-news' || tab.id === 'documents')) {
      return false;
    }
    return true;
  });

  return (
    <div className={styles.tabBar} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`${styles.tab}${activeTab === tab.id ? ` ${styles.tabActive}` : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};
