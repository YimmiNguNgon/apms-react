import React from 'react';
import { Users } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import type { CompanyBoardMember } from '../../types/listingData';
import { ListingTabShell } from './common';
import {
  BOARD_GROUP_LABELS,
  BOARD_GROUP_ORDER,
  initialsOf,
  useListingTabData,
} from './utils';
import styles from '../CompanyDetail.module.css';

interface BoardMembersTabProps {
  companyId: string;
}

const BoardMembersTab: React.FC<BoardMembersTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyBoardMember[]>(
    `board-members:${companyId}`,
    companyId,
    listingDataApi.getBoardMembers,
  );

  const members = data?.data ?? [];
  const groups = BOARD_GROUP_ORDER
    .map((group) => ({ group, members: members.filter((m) => m.positionGroup === group) }))
    .filter((g) => g.members.length > 0);

  return (
    <ListingTabShell
      loading={loading}
      error={error}
      hasData={data?.hasData ?? false}
      crawledAt={data?.crawledAt}
      onRetry={reload}
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <Users size={20} style={{ color: '#2563EB' }} />
            <h2>Ban lãnh đạo & Cơ cấu sở hữu</h2>
          </div>
          <span style={{ fontSize: '13px', color: '#64748B' }}>{members.length} cá nhân</span>
        </div>

        {groups.map(({ group, members: groupMembers }) => (
          <div key={group} className={styles.boardGroup}>
            <h3 className={styles.boardGroupTitle}>
              {BOARD_GROUP_LABELS[group] || `Nhóm ${group}`}
              <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
                ({groupMembers.length})
              </span>
            </h3>
            <div className={styles.boardGrid}>
              {groupMembers.map((m) => (
                <div key={m.id ?? `${m.name}-${m.position}`} className={styles.boardCard}>
                  <div className={styles.boardAvatar}>{initialsOf(m.name)}</div>
                  <div className={styles.boardBody}>
                    <p className={styles.boardName}>{m.name || '—'}</p>
                    {m.position && <p className={styles.boardPosition}>{m.position}</p>}
                    {m.personType && (
                      <span className={styles.boardPersonType}>{m.personType}</span>
                    )}
                    {m.education && <p className={styles.boardEducation}>{m.education}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ListingTabShell>
  );
};

export default BoardMembersTab;
