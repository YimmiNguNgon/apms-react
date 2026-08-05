import React, { useEffect, useMemo, useState } from 'react';
import { api, type PageResponse } from '../services/api';

type PageOrData<T> = PageResponse<T> | T[];

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  REVIEW: { bg: '#FEF3C7', color: '#92400E', label: 'Review' },
  WATCH: { bg: '#FEE2E2', color: '#991B1B', label: 'Watchlist' },
};

const DirectorHero: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  metrics?: Array<{ value: string | number; label: string }>;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, metrics, actions }) => (
  <div className="workspace-page-head director-hero">
    <div>
      {eyebrow && <span className="workspace-side-eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {(metrics?.length || actions) && (
      <div className="director-hero-side">
        {!!metrics?.length && (
          <div className="director-mini-metrics">
            {metrics.map((metric) => (
              <article key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </article>
            ))}
          </div>
        )}
        {actions && <div className="workspace-head-actions">{actions}</div>}
      </div>
    )}
  </div>
);

const DirectorSummaryGrid: React.FC<{ items: Array<{ label: string; value: string | number; note?: string }> }> = ({ items }) => (
  <div className="workspace-stats workspace-stats-compact">
    {items.map((item) => (
      <article key={item.label} className="workspace-stat-card">
        <span className="workspace-stat-label">{item.label}</span>
        <strong>{item.value}</strong>
        {item.note && <p>{item.note}</p>}
      </article>
    ))}
  </div>
);

const EmptyDirectorState: React.FC<{ message: string }> = ({ message }) => (
  <div className="workspace-panel">
    <div className="workspace-empty">{message}</div>
  </div>
);

const readValue = (...values: unknown[]) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

type PartnerRow = {
  id: string | number;
  name: string;
  type: string;
  tier: string;
  region: string;
  revenue: string;
  growth: string;
  status: string;
  contact: string;
  deals: string;
};

type CompetitorRow = {
  id: string | number;
  name: string;
  segment: string;
  threatLabel: string;
  threatValue: number | null;
  marketShare: string;
  intel: string;
};

type RecommendationRow = {
  id: string | number;
  title: string;
  confidence: number | null;
  category: string;
  impact: string;
  reason: string;
};

type ReportRow = {
  id: string | number;
  title: string;
  date: string;
  type: string;
  pages: string;
  author: string;
  status: string;
};

const mapPartner = (item: Record<string, unknown>, index: number): PartnerRow => ({
  id: readValue(item.companyId, item.id, index) as string | number,
  name: String(readValue(item.name, item.tradeName, item.legalName, 'Unnamed partner')),
  type: String(readValue(item.industry, item.segment, 'Not available')),
  tier: String(readValue(item.partnerTier, item.tier, 'Not available')),
  region: String(readValue(item.region, item.country, item.market, 'Not available')),
  revenue: String(readValue(item.revenue, item.revenueTier, 'Not available')),
  growth: String(readValue(item.growth, item.growthRate, 'Not available')),
  status: String(readValue(item.status, item.partnerStatus, 'ACTIVE')).toUpperCase(),
  contact: String(readValue(item.contact, item.keyContact, item.owner, 'Not available')),
  deals: String(readValue(item.deals, item.activeDeals, item.projectCount, 'Not available')),
});

const mapCompetitor = (item: Record<string, unknown>, index: number): CompetitorRow => {
  const rawThreat = readValue(item.threatScore, item.competitionLevel, item.riskLevel);
  const parsedThreat = typeof rawThreat === 'number' ? rawThreat : Number(rawThreat);
  const threatLabel = String(readValue(item.threatLevel, item.threat, item.level, 'Unknown'));

  return {
    id: readValue(item.companyId, item.id, index) as string | number,
    name: String(readValue(item.name, item.tradeName, item.legalName, 'Unknown competitor')),
    segment: String(readValue(item.industry, item.segment, 'Not available')),
    threatLabel,
    threatValue: Number.isFinite(parsedThreat) ? parsedThreat : null,
    marketShare: String(readValue(item.marketShare, item.share, 'Not available')),
    intel: String(readValue(item.analysisText, item.summary, item.intel, 'No intelligence summary returned from the backend.')),
  };
};

const mapRecommendation = (item: Record<string, unknown>, index: number): RecommendationRow => {
  const rawConfidence = readValue(item.confidence, item.confidenceScore, item.score);
  const parsedConfidence = typeof rawConfidence === 'number' ? rawConfidence : Number(rawConfidence);

  return {
    id: readValue(item.id, item.recommendationId, index) as string | number,
    title: String(readValue(item.title, item.name, item.recommendation, 'Untitled recommendation')),
    confidence: Number.isFinite(parsedConfidence) ? parsedConfidence : null,
    category: String(readValue(item.category, item.type, 'Uncategorized')),
    impact: String(readValue(item.impact, item.priority, 'Not available')),
    reason: String(readValue(item.reason, item.description, item.summary, 'No explanation returned from the backend.')),
  };
};

const mapReport = (item: Record<string, unknown>, index: number): ReportRow => ({
  id: readValue(item.id, item.reportId, index) as string | number,
  title: String(readValue(item.title, 'Untitled report')),
  date: String(readValue(item.date, item.createdAt, item.updatedAt, 'Not available')),
  type: String(readValue(item.type, 'Not available')),
  pages: String(readValue(item.pages, item.pageCount, 'Not available')),
  author: String(readValue(item.author, item.createdBy, item.owner, 'Not available')),
  status: String(readValue(item.status, 'UNKNOWN')),
});

const useDirectorData = () => {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);

  useEffect(() => {
    api.get<PageOrData<Record<string, unknown>>>('/dashboard/partners').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : (res?.data && 'content' in res.data ? (res.data as PageResponse<Record<string, unknown>>).content : []);
      setPartners(rows.map(mapPartner));
    }).catch(() => setPartners([]));

    api.get<PageOrData<Record<string, unknown>>>('/dashboard/competitors').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : (res?.data && 'content' in res.data ? (res.data as PageResponse<Record<string, unknown>>).content : []);
      setCompetitors(rows.map(mapCompetitor));
    }).catch(() => setCompetitors([]));

    api.get<PageOrData<Record<string, unknown>>>('/dashboard/recommendations').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : (res?.data && 'content' in res.data ? (res.data as PageResponse<Record<string, unknown>>).content : []);
      setRecommendations(rows.map(mapRecommendation));
    }).catch(() => setRecommendations([]));

    api.get<PageOrData<Record<string, unknown>>>('/reports').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : (res?.data && 'content' in res.data ? (res.data as PageResponse<Record<string, unknown>>).content : []);
      setReports(rows.map(mapReport));
    }).catch(() => setReports([]));
  }, []);

  return { partners, competitors, recommendations, reports };
};

export const PartnerEcosystem: React.FC = () => {
  const { partners } = useDirectorData();
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');

  const tiers = useMemo(() => ['all', ...Array.from(new Set(partners.map((item) => item.tier).filter((item) => item && item !== 'Not available')))], [partners]);
  const filtered = partners.filter((partner) =>
    partner.name.toLowerCase().includes(search.toLowerCase()) && (filterTier === 'all' || partner.tier === filterTier),
  );

  const summary = [
    { label: 'Tracked partners', value: partners.length, note: 'Partner companies returned by the backend ecosystem feed' },
    { label: 'Visible now', value: filtered.length, note: 'Rows matching the current search and tier filter' },
    { label: 'Tiered records', value: partners.filter((item) => item.tier !== 'Not available').length, note: 'Partners with backend tier metadata' },
    { label: 'Actionable records', value: partners.filter((item) => item.status !== 'Not available').length, note: 'Partners carrying a backend status value' },
  ];

  return (
    <section className="workspace-page director-page" id="page-partner-ecosystem">
      <DirectorHero
        eyebrow="Ecosystem"
        title="Partner ecosystem"
        description="Review the current partner set returned by the backend and inspect the account metadata available for executive monitoring."
        metrics={[
          { value: partners.length, label: 'partners' },
          { value: filtered.length, label: 'visible now' },
          { value: tiers.length - 1, label: 'available tiers' },
        ]}
      />

      <DirectorSummaryGrid items={summary} />

      <div className="workspace-filter-row">
        <div className="workspace-search">
          <input className="search-input" placeholder="Search partner..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="workspace-filter-chips">
          {tiers.map((tier) => (
            <button key={tier} className={`workspace-chip ${filterTier === tier ? 'workspace-chip-active' : ''}`} onClick={() => setFilterTier(tier)}>
              {tier === 'all' ? 'All tiers' : tier}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyDirectorState message="No partner records were returned for the current filter." />
      ) : (
        <div className="director-card-grid">
          {filtered.map((partner) => {
            const status = STATUS_COLOR[partner.status] ?? { bg: '#E2E8F0', color: '#334155', label: partner.status };
            return (
              <article key={partner.id} className="director-entity-card" style={{ borderTopColor: '#2563eb' }}>
                <div className="director-entity-head">
                  <div>
                    <h3>{partner.name}</h3>
                    <p>{partner.type} · {partner.region}</p>
                  </div>
                  <span className="workspace-badge neutral">{partner.tier}</span>
                </div>
                <div className="director-entity-metrics">
                  <div><strong>Revenue</strong><span>{partner.revenue}</span></div>
                  <div><strong>Growth</strong><span>{partner.growth}</span></div>
                  <div><strong>Deals</strong><span>{partner.deals}</span></div>
                  <div><strong>Owner</strong><span>{partner.contact}</span></div>
                </div>
                <div className="director-entity-footer">
                  <span className="workspace-badge" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export const CompetitorIntelligence: React.FC = () => {
  const { competitors } = useDirectorData();
  const [search, setSearch] = useState('');
  const [filterThreat, setFilterThreat] = useState('ALL');
  const [watchlist, setWatchlist] = useState<Set<string | number>>(new Set());
  const [selected, setSelected] = useState<CompetitorRow | null>(null);

  const filtered = useMemo(() => {
    return competitors.filter((c) => {
      const text = (c.name + ' ' + c.segment + ' ' + c.intel).toLowerCase();
      const matchSearch = text.includes(search.toLowerCase());
      const matchThreat =
        filterThreat === 'ALL' ||
        (filterThreat === 'HIGH' && (c.threatValue !== null && c.threatValue >= 70)) ||
        (filterThreat === 'MEDIUM' && (c.threatValue !== null && c.threatValue >= 40 && c.threatValue < 70)) ||
        (filterThreat === 'LOW' && (c.threatValue !== null && c.threatValue < 40)) ||
        (filterThreat === 'UNSCORED' && c.threatValue === null);
      return matchSearch && matchThreat;
    });
  }, [competitors, search, filterThreat]);

  const toggleWatchlist = (id: string | number) => {
    setWatchlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getThreatBadge = (v: number | null) => {
    if (v === null) return { bg: 'var(--bg-input)', color: 'var(--text-muted)', label: 'Chưa chấm điểm' };
    if (v >= 70) return { bg: '#fef2f2', color: '#ef4444', label: 'Nguy hiểm cao' };
    if (v >= 40) return { bg: '#fef3c7', color: '#b45309', label: 'Trung bình' };
    return { bg: '#f0fdf4', color: '#10b981', label: 'Thấp' };
  };

  const summary = [
    { label: 'Đối thủ theo dõi', value: competitors.length },
    { label: 'Watchlist', value: watchlist.size },
    { label: 'Nguy cơ cao', value: competitors.filter((c) => (c.threatValue ?? 0) >= 70).length },
    { label: 'Chưa chấm', value: competitors.filter((c) => c.threatValue === null).length },
  ];

  return (
    <section className="workspace-page director-page role-dashboard role-dashboard-manager manager-page" id="page-competitor-intelligence" style={{ padding: '0 0 4px' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 14px', marginBottom: '8px', border: '1px solid var(--workspace-panel-border)', borderRadius: '12px', backgroundColor: 'var(--bg-card)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div>
          <h1 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', margin: '1px 0 0' }}>Competitor Intelligence</h1>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Phân tích tình báo đối thủ & mức độ đe dọa cạnh tranh</span>
        </div>
      </header>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginBottom: '8px' }}>
        {summary.map((item) => (
          <div key={item.label} style={{ padding: '5px 10px', border: '1px solid var(--workspace-panel-border)', borderRadius: '10px', backgroundColor: 'var(--bg-card)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
            <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{item.label}</span>
            <strong style={{ display: 'block', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1 }}>{item.value}</strong>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ backgroundColor: 'var(--bg-card)', padding: '5px 8px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Tìm theo tên, phân khúc hoặc thông tin tình báo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', outline: 'none', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text-primary)', flex: 1, minWidth: '180px' }}
        />
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mức đe dọa:</span>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'HIGH', label: 'Cao' },
            { key: 'MEDIUM', label: 'Trung bình' },
            { key: 'LOW', label: 'Thấp' },
            { key: 'UNSCORED', label: 'Chưa chấm' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterThreat(key)}
              style={{
                padding: '3px 8px', borderRadius: '999px', border: '1px solid',
                borderColor: filterThreat === key ? 'var(--brand-primary)' : 'var(--border-color)',
                backgroundColor: filterThreat === key ? 'var(--brand-primary)' : 'var(--bg-surface)',
                color: filterThreat === key ? '#FFFFFF' : 'var(--text-secondary)',
                fontSize: '0.7rem', fontWeight: filterThreat === key ? 700 : 500, cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyDirectorState message="Chưa có dữ liệu tình báo đối thủ nào." />
      ) : (
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--workspace-panel-border)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 240px)', minHeight: '200px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.72rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '5px 8px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>Tên công ty</th>
                  <th style={{ padding: '5px 8px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>Phân khúc</th>
                  <th style={{ padding: '5px 8px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>Điểm đe dọa</th>
                  <th style={{ padding: '5px 8px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>Mức nguy hiểm</th>
                  <th style={{ padding: '5px 8px', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>Tóm tắt tình báo</th>
                  <th style={{ padding: '5px 8px', textAlign: 'right', position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const badge = getThreatBadge(c.threatValue);
                  const inWatchlist = watchlist.has(c.id);
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '5px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.name}
                        {inWatchlist && (
                          <span style={{ marginLeft: '6px', fontSize: '0.62rem', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '1px 6px', borderRadius: '999px', fontWeight: 700 }}>
                            Theo dõi
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '5px 8px', color: 'var(--text-secondary)' }}>
                        <span style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)', padding: '1px 6px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600 }}>{c.segment}</span>
                      </td>
                      <td style={{ padding: '5px 8px', fontWeight: 800, color: c.threatValue !== null ? (c.threatValue >= 70 ? '#ef4444' : c.threatValue >= 40 ? '#b45309' : '#10b981') : 'var(--text-muted)' }}>
                        {c.threatValue !== null ? c.threatValue : '—'}
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        <span style={{ padding: '1px 6px', borderRadius: '999px', fontSize: '0.62rem', fontWeight: 600, backgroundColor: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '5px 8px', color: 'var(--text-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.65rem' }}>
                        {c.intel}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelected(c)}
                            style={{ padding: '2px 8px', backgroundColor: 'var(--bg-surface)', color: 'var(--brand-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => toggleWatchlist(c.id)}
                            style={{
                              padding: '2px 8px',
                              backgroundColor: inWatchlist ? '#fef3c7' : 'var(--bg-surface)',
                              color: inWatchlist ? '#b45309' : 'var(--text-secondary)',
                              border: `1px solid ${inWatchlist ? '#fde68a' : 'var(--border-color)'}`,
                              borderRadius: '6px', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer',
                            }}
                          >
                            {inWatchlist ? 'Đang theo dõi' : 'Theo dõi'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Competitor Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '540px', maxHeight: '85vh', backgroundColor: 'var(--bg-card)', borderRadius: '14px', boxShadow: '0 20px 50px rgba(15,23,42,0.25)', border: '1px solid var(--workspace-panel-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Phân tích Đối thủ Cạnh tranh
                </span>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 6px 0' }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: 'var(--bg-input)', padding: '1px 6px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{selected.segment}</span>
                  <span style={{ padding: '1px 6px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700, backgroundColor: getThreatBadge(selected.threatValue).bg, color: getThreatBadge(selected.threatValue).color }}>
                    {getThreatBadge(selected.threatValue).label}
                  </span>
                  {selected.marketShare !== 'Not available' && (
                    <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 600 }}>
                      Thị phần: {selected.marketShare}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ padding: '2px 8px', border: '1px solid var(--border-color)', background: 'var(--bg-input)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1 }}>
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '14px 16px', overflowY: 'auto', flex: 1, fontSize: '0.72rem' }}>
              {/* Threat Score visualization */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Điểm Đe dọa (Threat Score)</h3>
                {selected.threatValue !== null ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mức độ đe dọa hiện tại</span>
                      <strong style={{ fontSize: '0.85rem', color: selected.threatValue >= 70 ? '#ef4444' : selected.threatValue >= 40 ? '#b45309' : '#10b981' }}>{selected.threatValue}/100</strong>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--bg-input)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${selected.threatValue}%`, backgroundColor: selected.threatValue >= 70 ? '#ef4444' : selected.threatValue >= 40 ? '#b45309' : '#10b981', borderRadius: '999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '8px 10px', backgroundColor: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                    Chưa có dữ liệu điểm đe dọa cho đối thủ này.
                  </div>
                )}
              </div>

              {/* Intelligence Summary */}
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Tóm tắt Tình báo Cạnh tranh</h3>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', backgroundColor: 'var(--bg-input)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', margin: 0 }}>
                  {selected.intel}
                </p>
              </div>

              {/* Actions */}
              <div>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Hành động Chiến lược</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => { toggleWatchlist(selected.id); }}
                    style={{ padding: '5px 12px', backgroundColor: watchlist.has(selected.id) ? '#fef3c7' : '#eff6ff', color: watchlist.has(selected.id) ? '#2563eb' : '#2563eb', border: '1px solid', borderColor: watchlist.has(selected.id) ? '#fde68a' : '#bfdbfe', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {watchlist.has(selected.id) ? 'Đang theo dõi' : 'Thêm vào Watchlist'}
                  </button>
                  <button
                    onClick={() => alert(`Yêu cầu phân tích sâu hơn cho "${selected.name}" đã được ghi nhận.`)}
                    style={{ padding: '5px 12px', backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Yêu cầu Phân tích sâu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export const MarketOpportunities: React.FC = () => {
  const { recommendations } = useDirectorData();
  const opportunities = recommendations.filter((item) => /growth|market|opportun/i.test(item.category) || /growth|market|opportun/i.test(item.title));

  return (
    <section className="workspace-page director-page" id="page-market-opportunities">
      <DirectorHero
        eyebrow="Intelligence"
        title="Market opportunities"
        description="This view only renders backend recommendation data classified as growth or market opportunities."
        metrics={[
          { value: opportunities.length, label: 'opportunities' },
          { value: recommendations.length, label: 'all recommendations' },
          { value: opportunities.filter((item) => item.confidence !== null).length, label: 'with confidence' },
        ]}
      />

      <DirectorSummaryGrid
        items={[
          { label: 'Opportunity records', value: opportunities.length, note: 'Recommendations matching growth or market-oriented categories' },
          { label: 'High confidence', value: opportunities.filter((item) => (item.confidence ?? 0) >= 80).length, note: 'Opportunities with confidence >= 80' },
          { label: 'Medium confidence', value: opportunities.filter((item) => (item.confidence ?? 0) >= 50 && (item.confidence ?? 0) < 80).length, note: 'Opportunities with confidence between 50 and 79' },
          { label: 'No confidence field', value: opportunities.filter((item) => item.confidence === null).length, note: 'Backend items without confidence metadata' },
        ]}
      />

      {opportunities.length === 0 ? (
        <EmptyDirectorState message="The backend did not return any recommendation tagged as a market opportunity." />
      ) : (
        <div className="director-list">
          {opportunities.map((item) => (
            <article key={item.id} className="director-opportunity-card">
              <div className="director-list-head">
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.reason}</p>
                </div>
                <div className="director-score-pill">
                  <strong>{item.confidence ?? 'N/A'}</strong>
                  <span>{item.confidence !== null ? 'Confidence' : item.category}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export const AIRecommendations: React.FC = () => {
  const { recommendations } = useDirectorData();

  return (
    <section className="workspace-page director-page" id="page-ai-recommendations">
      <DirectorHero
        eyebrow="Intelligence"
        title="AI recommendations"
        description="Review only the recommendation records supplied by the backend recommendation endpoint."
        metrics={[
          { value: recommendations.length, label: 'recommendations' },
          { value: recommendations.filter((item) => item.confidence !== null).length, label: 'with confidence' },
          { value: recommendations.filter((item) => item.impact !== 'Not available').length, label: 'with impact' },
        ]}
      />

      <DirectorSummaryGrid
        items={[
          { label: 'Total recommendations', value: recommendations.length, note: 'All rows returned from the backend recommendation feed' },
          { label: 'High confidence', value: recommendations.filter((item) => (item.confidence ?? 0) >= 80).length, note: 'Confidence >= 80' },
          { label: 'Medium confidence', value: recommendations.filter((item) => (item.confidence ?? 0) >= 50 && (item.confidence ?? 0) < 80).length, note: 'Confidence between 50 and 79' },
          { label: 'No confidence field', value: recommendations.filter((item) => item.confidence === null).length, note: 'Items without confidence metadata' },
        ]}
      />

      {recommendations.length === 0 ? (
        <EmptyDirectorState message="No AI recommendations were returned by the backend." />
      ) : (
        <div className="director-list">
          {recommendations.map((item) => (
            <article key={item.id} className="director-recommendation-card">
              <div className="director-list-head">
                <div>
                  <div className="director-list-title-row">
                    <span className="workspace-badge neutral">{item.category}</span>
                    <span className="workspace-badge neutral">{item.impact}</span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.reason}</p>
                </div>
                <div className="director-score-pill">
                  <strong>{item.confidence ?? 'N/A'}</strong>
                  <span>{item.confidence !== null ? 'Confidence' : 'No score'}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export const StrategicReports: React.FC = () => {
  const { reports } = useDirectorData();

  return (
    <section className="workspace-page director-page" id="page-strategic-reports">
      <DirectorHero
        eyebrow="Intelligence"
        title="Strategic reports"
        description="This view renders only report metadata returned by the backend report service."
        metrics={[
          { value: reports.length, label: 'reports' },
          { value: reports.filter((item) => item.status.toLowerCase() === 'published').length, label: 'published' },
          { value: reports.filter((item) => item.status.toLowerCase() === 'draft').length, label: 'draft' },
        ]}
      />

      {reports.length === 0 ? (
        <EmptyDirectorState message="No strategic reports were returned by the backend." />
      ) : (
        <div className="director-card-grid">
          {reports.map((report) => (
            <article key={report.id} className="director-report-card">
              <div className="director-entity-head">
                <div>
                  <span className="workspace-badge neutral">{report.type}</span>
                  <h3 style={{ marginTop: 10 }}>{report.title}</h3>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{report.date}</span>
              </div>
              <div className="director-entity-metrics">
                <div><strong>Author</strong><span>{report.author}</span></div>
                <div><strong>Pages</strong><span>{report.pages}</span></div>
                <div><strong>Status</strong><span>{report.status}</span></div>
                <div><strong>Type</strong><span>{report.type}</span></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
