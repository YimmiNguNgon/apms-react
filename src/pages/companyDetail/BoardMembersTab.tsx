import React, { useEffect, useState } from 'react';
import { listingDataApi } from '../../API/listingDataApi';
import { api } from '../../services/api';
import type { ProfileResponse } from '../../types/domain';
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
  const [profileFallback, setProfileFallback] = useState<ProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    if (!data?.hasData && companyId) {
      setProfileLoading(true);
      api.get<ProfileResponse>(`/profiles/${companyId}`)
        .then((res) => setProfileFallback(res.data ?? null))
        .catch(() => setProfileFallback(null))
        .finally(() => setProfileLoading(false));
    }
  }, [data?.hasData, companyId]);

  const cafefMembers = data?.data ?? [];
  const mongoMembers: CompanyBoardMember[] = (profileFallback?.companyMembers ?? []).map((cm, idx) => ({
    id: idx + 1,
    companyId,
    name: cm.name || cm.fullName || 'Thành viên ban quản trị',
    position: cm.position || cm.role || 'Thành viên HĐQT / Ban giám đốc',
    positionGroup: 1,
    personType: cm.role || 'Đại diện doanh nghiệp',
    education: cm.phone ? `SĐT: ${cm.phone}` : (cm.email ? `Email: ${cm.email}` : undefined),
    crawledAt: null,
  }));

  const members = cafefMembers.length > 0 ? cafefMembers : mongoMembers;

  const groups = BOARD_GROUP_ORDER
    .map((group) => ({ group, members: members.filter((m) => m.positionGroup === group) }))
    .filter((g) => g.members.length > 0);

  const hasContent = (data?.hasData ?? false) || members.length > 0;

  return (
    <ListingTabShell
      loading={loading || profileLoading}
      error={error}
      hasData={hasContent}
      crawledAt={data?.crawledAt}
      onRetry={reload}
    >
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Ban lãnh đạo & Cơ cấu sở hữu</h2>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>{members.length} cá nhân</span>
        </div>

        {groups.map(({ group, members: groupMembers }) => (
          <div key={group} className={styles.boardGroup} style={{ marginTop: '10px' }}>
            <h3 className={styles.boardGroupTitle} style={{ fontSize: '0.78rem', fontWeight: 700, margin: '0 0 6px', color: '#1E293B' }}>
              {BOARD_GROUP_LABELS[group] || `Nhóm ${group}`}
              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600', marginLeft: '6px' }}>
                ({groupMembers.length})
              </span>
            </h3>
            <div className={styles.boardGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
              {groupMembers.map((m) => (
                <div key={m.id ?? `${m.name}-${m.position}`} className={styles.boardCard} style={{ background: '#F8FAFC', padding: '8px', borderRadius: '6px', border: '1px solid #F1F5F9', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={styles.boardAvatar} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#2563EB', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700 }}>{initialsOf(m.name)}</div>
                  <div className={styles.boardBody}>
                    <p className={styles.boardName} style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>{m.name || '—'}</p>
                    {m.position && <p className={styles.boardPosition} style={{ margin: 0, fontSize: '0.68rem', color: '#475569' }}>{m.position}</p>}
                    {m.personType && (
                      <span className={styles.boardPersonType} style={{ fontSize: '0.62rem', background: '#E2E8F0', color: '#334155', padding: '1px 4px', borderRadius: '3px', marginTop: '2px', display: 'inline-block' }}>{m.personType}</span>
                    )}
                    {m.education && <p className={styles.boardEducation} style={{ margin: 0, fontSize: '0.62rem', color: '#64748B' }}>{m.education}</p>}
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
