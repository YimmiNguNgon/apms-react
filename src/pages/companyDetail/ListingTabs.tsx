import React from 'react';
import type { ListingTabId } from './utils';
import { LISTING_TABS } from './utils';
import styles from '../CompanyDetail.module.css';

import { useTranslation } from 'react-i18next';

export type { ListingTabId };

interface ListingTabsProps {
  companyId: string;
  activeTab: ListingTabId;
  onTabChange: (tab: ListingTabId) => void;
}

export const ListingTabBar: React.FC<ListingTabsProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation('company-list');

  const TAB_KEY_MAP: Record<string, string> = {
    'business-fields': 'businessFields',
  };

  return (
    <div className={styles.tabBar} role="tablist">
      {LISTING_TABS.map((tab) => {
        const translationKey = `tabs.${TAB_KEY_MAP[tab.id] ?? tab.id}`;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tab}${activeTab === tab.id ? ` ${styles.tabActive}` : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {tab.icon}
              {t(translationKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
};

