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
  const [activeSubTab, setActiveSubTab] = useState<'BOARD' | 'OWNERSHIP'>('BOARD');
  const [crawling, setCrawling] = useState(false);
  const [crawlMsg, setCrawlMsg] = useState<string | null>(null);
  const showManualCrawler = companyId !== '6a31a0000000000000000001';

  useEffect(() => {
    listingDataApi.getOwnershipStructure(companyId)
      .then((res) => setOwnershipList(res.data ?? []))
      .catch(() => setOwnershipList([]));
  }, [companyId]);

  const members = data?.data ?? [];
  const groups = BOARD_GROUP_ORDER
    .map((group) => ({ group, members: members.filter((member) => member.positionGroup === group) }))
    .filter(({ members: groupMembers }) => groupMembers.length > 0);

  const handleRunAiCrawler = async () => {
    setCrawling(true);
    setCrawlMsg(null);
    try {
      const msg = await externalDataApi.runFetch({ forceRefresh: true });
      setCrawlMsg(msg || 'Đã kích hoạt AI crawler thu thập ban lãnh đạo!');
      reload();
    } catch (err) {
      setCrawlMsg(err instanceof Error ? err.message : 'Kích hoạt crawler thất bại.');
    } finally {
      setCrawling(false);
    }
  };

  return (
    <ListingTabShell loading={loading} error={error} hasData={members.length > 0 || ownershipList.length > 0} crawledAt={data?.crawledAt} onRetry={reload}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Top Bar Navigation */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setActiveSubTab('BOARD')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeSubTab === 'BOARD' ? '#2563EB' : '#F1F5F9',
                color: activeSubTab === 'BOARD' ? '#FFFFFF' : '#475569',
              }}
            >
              <Users size={14} />
              <span>Ban Lãnh Đạo & HĐQT ({members.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('OWNERSHIP')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: activeSubTab === 'OWNERSHIP' ? '#2563EB' : '#F1F5F9',
                color: activeSubTab === 'OWNERSHIP' ? '#FFFFFF' : '#475569',
              }}
            >
              <PieChart size={14} />
              <span>Cơ cấu Sở hữu & Cổ đông ({ownershipList.length})</span>
            </button>
          </div>

          {showManualCrawler && <button
            type="button"
            onClick={handleRunAiCrawler}
            disabled={crawling}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.68rem',
              fontWeight: 700,
              cursor: crawling ? 'not-allowed' : 'pointer',
              opacity: crawling ? 0.7 : 1,
            }}
          >
            <Sparkles size={12} />
            <span>{crawling ? 'AI Crawling...' : 'Kích hoạt AI Crawler'}</span>
          </button>}
        </div>

        {showManualCrawler && crawlMsg && (
          <div style={{ fontSize: '0.65rem', color: '#059669', background: '#ECFDF5', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
            {crawlMsg}
          </div>
        )}

        {activeSubTab === 'BOARD' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {groups.length === 0 ? (
              <div style={{ background: '#FFFFFF', padding: '24px', textAlign: 'center', borderRadius: '10px', color: '#64748B', fontSize: '0.75rem' }}>
                Chưa có dữ liệu ban lãnh đạo cho hồ sơ doanh nghiệp này. Hãy bấm "Kích hoạt AI Crawler" để hệ thống tự động tìm kiếm.
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

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>{member.name}</h4>
                          <p style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 600, margin: '0 0 4px' }}>{member.position}</p>
                          {member.education && (
                            <p style={{ fontSize: '0.64rem', color: '#64748B', margin: 0, lineHeight: 1.3 }}>{member.education}</p>
                          )}
                          {member.profileUrl && (
                            <a href={member.profileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.62rem', color: '#2563EB', marginTop: '4px', display: 'inline-block' }}>
                              Xem Nguồn
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
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieChart size={16} style={{ color: '#2563EB' }} />
              <span>Danh sách Cổ đông lớn & Cơ cấu Sở hữu</span>
            </h3>

            {ownershipList.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748B', fontSize: '0.75rem' }}>
                Chưa có dữ liệu cơ cấu sở hữu đã được phân tích. Hãy chạy tác vụ AI Crawler để cập nhật.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ownershipList.map((item) => (
                  <div key={item.holderName} style={{ background: '#F8FAFC', border: '1px solid #F1F5F9', borderRadius: '8px', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        <strong style={{ fontSize: '0.78rem', color: '#0F172A' }}>{item.holderName}</strong>
                        {item.representedBy && (
                          <span style={{ fontSize: '0.65rem', color: '#64748B', marginLeft: '8px' }}>
                            (Đại diện: {item.representedBy})
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF' }}>{item.ownershipPercent}%</span>
                      </div>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, item.ownershipPercent ?? 0)}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ListingTabShell>
  );
};

export default BoardMembersTab;
