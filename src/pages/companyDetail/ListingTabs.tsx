import React from 'react';
import type { ListingTabId } from './utils';
import { LISTING_TABS } from './utils';
import styles from '../CompanyDetail.module.css';

export type { ListingTabId };

interface ListingTabsProps {
  companyId: string;
  activeTab: ListingTabId;
  onTabChange: (tab: ListingTabId) => void;
  userRole?: string | null;
}

export const ListingTabBar: React.FC<ListingTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className={styles.tabBar} role="tablist">
      {LISTING_TABS.map((tab) => (
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
