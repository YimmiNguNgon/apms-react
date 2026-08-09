// Operational Competitor Watchlist for Manager & Staff roles
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import type { GraphCompanyDto } from '../types/domain';

export const CompetitorWatchlist: React.FC = () => {
  const { t } = useTranslation('competitor-intelligence');
  const [competitors, setCompetitors] = useState<GraphCompanyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get<GraphCompanyDto[]>('/graph/competitors')
      .then((res) => {
        if (res?.data && Array.isArray(res.data)) {
          setCompetitors(res.data);
        } else {
          setCompetitors([]);
        }
      })
      .catch(() => setCompetitors([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = competitors.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.industry?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>{t('watchlist.title')}</h1>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>{t('watchlist.description')}</p>
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('watchlist.search')}
          style={{ width: '100%', maxWidth: '360px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
        />
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#475569', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>{t('watchlist.company')}</th>
              <th style={{ padding: '12px 16px' }}>{t('watchlist.industry')}</th>
              <th style={{ padding: '12px 16px' }}>{t('watchlist.relationship')}</th>
              <th style={{ padding: '12px 16px' }}>{t('watchlist.companyId')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>{t('watchlist.loading')}</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>{t('watchlist.empty')}</td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr key={c.companyId || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0F172A' }}>{c.name}</td>
                  <td style={{ padding: '12px 16px', color: '#475569' }}>{c.industry || 'Technology'}</td>
                  <td style={{ padding: '12px 16px', color: '#EF4444', fontWeight: 600 }}>{t('watchlist.competitor')}</td>
                  <td style={{ padding: '12px 16px', color: '#94A3B8', fontFamily: 'monospace' }}>{c.companyId}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
