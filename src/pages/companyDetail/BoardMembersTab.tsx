import React, { useEffect, useState } from 'react';
import { ExternalLink, Users, PieChart, ShieldCheck, Sparkles } from 'lucide-react';
import { listingDataApi } from '../../API/listingDataApi';
import { externalDataApi } from '../../API/externalDataApi';
import type { CompanyBoardMember, CompanyOwnership } from '../../types/listingData';
import { ListingTabShell } from './common';
import { BOARD_GROUP_LABELS, BOARD_GROUP_ORDER, formatCurrency, initialsOf, useListingTabData } from './utils';

interface BoardMembersTabProps {
  companyId: string;
}

const BoardMembersTab: React.FC<BoardMembersTabProps> = ({ companyId }) => {
  const { loading, error, data, reload } = useListingTabData<CompanyBoardMember[]>(
    `board-members:${companyId}`,
    companyId,
    listingDataApi.getBoardMembers,
  );
  const [ownershipList, setOwnershipList] = useState<CompanyOwnership[]>([]);

  useEffect(() => {
    listingDataApi.getOwnershipStructure(companyId)
      .then((res) => setOwnershipList(res.data ?? []))
      .catch(() => setOwnershipList([]));
  }, [companyId]);

  const members = data?.data ?? [];
  const groups = BOARD_GROUP_ORDER
    .map((group) => ({ group, members: members.filter((member) => member.positionGroup === group) }))
    .filter(({ members: groupMembers }) => groupMembers.length > 0);



  return (
    <ListingTabShell loading={loading} error={error} hasData={members.length > 0 || ownershipList.length > 0} crawledAt={data?.crawledAt} onRetry={reload}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                background: '#2563EB',
                color: '#FFFFFF',
              }}
            >
              <Users size={14} />
              <span>Board of Directors & Executives ({members.length})</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {groups.length === 0 ? (
            <div style={{ background: '#FFFFFF', padding: '24px', textAlign: 'center', borderRadius: '10px', color: '#64748B', fontSize: '0.75rem' }}>
              No leadership data available for this company profile.
            </div>
            ) : (
              groups.map(({ group, members: groupMembers }) => (
                <div key={group} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <h3 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #F1F5F9', paddingBottom: '6px' }}>
                    <ShieldCheck size={16} style={{ color: '#2563EB' }} />
                    <span>{BOARD_GROUP_LABELS[group] ?? `Nhóm ${group}`}</span>
                  </h3>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                    {groupMembers.map((member) => (
                      <div
                        key={member.id ?? `${member.name}-${member.position}`}
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                        }}
                      >
                        {member.imageUrl ? (
                          <img
                            src={member.imageUrl}
                            alt={member.name || ''}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              flexShrink: 0,
                              border: '1px solid #E2E8F0',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initialsOf(member.name)}
                          </div>
                        )}

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>{member.name}</h4>
                          <p style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 600, margin: '0 0 4px' }}>{member.position}</p>
                          {member.education && (
                            <p style={{ fontSize: '0.64rem', color: '#64748B', margin: 0, lineHeight: 1.3 }}>{member.education}</p>
                          )}
                          {member.profileUrl && (
                            <a href={member.profileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.62rem', color: '#2563EB', marginTop: '4px', display: 'inline-block' }}>
                              Source
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
      </div>
    </ListingTabShell>
  );
};

export default BoardMembersTab;
