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
  tabs?: ListingTabDef[];
}

export const ListingTabBar: React.FC<ListingTabsProps> = ({ activeTab, onTabChange, tabs }) => {
  const defs = tabs ?? LISTING_TABS;
  return (
    <div className={styles.tabBar} role="tablist">
      {defs.map((tab) => (
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
