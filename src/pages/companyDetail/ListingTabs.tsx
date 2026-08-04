import React from 'react';
import type { ListingTabId } from './utils';
import { LISTING_TABS } from './utils';
import ListingInfoTab from './ListingInfoTab';
import BoardMembersTab from './BoardMembersTab';
import FinancialsTab from './FinancialsTab';
import NewsTab from './NewsTab';
import DocumentsTab from './DocumentsTab';
import styles from '../CompanyDetail.module.css';

export type { ListingTabId };

interface ListingTabsProps {
  companyId: string;
  activeTab: ListingTabId;
  onTabChange: (tab: ListingTabId) => void;
}

interface ListingTabContentProps {
  companyId: string;
  activeTab: ListingTabId;
}

export const ListingTabBar: React.FC<ListingTabsProps> = ({ activeTab, onTabChange }) => (
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
        {tab.icon}
        {tab.label}
      </button>
    ))}
  </div>
);

export const ListingTabContent: React.FC<ListingTabContentProps> = ({ companyId, activeTab }) => {
  switch (activeTab) {
    case 'listing-info':
      return <ListingInfoTab companyId={companyId} />;
    case 'board-members':
      return <BoardMembersTab companyId={companyId} />;
    case 'financials':
      return <FinancialsTab companyId={companyId} />;
    case 'news':
      return <NewsTab companyId={companyId} />;
    case 'documents':
      return <DocumentsTab companyId={companyId} />;
    default:
      return null;
  }
};
