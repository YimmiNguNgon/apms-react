import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const STATUS_COLOR: Record<string, { bg: string; color: string; label: string }> = {
  ACTIVE: { bg: '#D1FAE5', color: '#065F46', label: 'Active' },
  REVIEW: { bg: '#FEF3C7', color: '#92400E', label: 'Review' },
  WATCH: { bg: '#FEE2E2', color: '#991B1B', label: 'Watchlist' },
};

const DirectorHero: React.FC<{
  eyebrow: string;
  title: string;
  description: string;
  metrics: Array<{ value: string | number; label: string }>;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, metrics, actions }) => (
  <div className="workspace-page-head director-hero">
    <div>
      <span className="workspace-side-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    <div className="director-hero-side">
      <div className="director-mini-metrics">
        {metrics.map((metric) => (
          <article key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </article>
        ))}
      </div>
      {actions && <div className="workspace-head-actions">{actions}</div>}
    </div>
  </div>
);

const DirectorSummaryGrid: React.FC<{ items: Array<{ label: string; value: string | number; note: string }> }> = ({ items }) => (
  <div className="workspace-stats workspace-stats-compact">
    {items.map((item) => (
      <article key={item.label} className="workspace-stat-card">
        <span className="workspace-stat-label">{item.label}</span>
        <strong>{item.value}</strong>
        <p>{item.note}</p>
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

const mapPartner = (item: any, index: number): PartnerRow => ({
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

const mapCompetitor = (item: any, index: number): CompetitorRow => {
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

const mapRecommendation = (item: any, index: number): RecommendationRow => {
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

const mapReport = (item: any, index: number): ReportRow => ({
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
    api.get<any>('/dashboard/partners').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
      setPartners(rows.map(mapPartner));
    }).catch(() => setPartners([]));

    api.get<any>('/dashboard/competitors').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
      setCompetitors(rows.map(mapCompetitor));
    }).catch(() => setCompetitors([]));

    api.get<any>('/dashboard/recommendations').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
      setRecommendations(rows.map(mapRecommendation));
    }).catch(() => setRecommendations([]));

    api.get<any>('/reports').then((res) => {
      const rows = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
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

  const summary = [
    { label: 'Competitors tracked', value: competitors.length, note: 'Companies returned by the backend competitor feed' },
    { label: 'With threat score', value: competitors.filter((item) => item.threatValue !== null).length, note: 'Records carrying a numeric threat-related value' },
    { label: 'With market share', value: competitors.filter((item) => item.marketShare !== 'Not available').length, note: 'Records carrying market share metadata' },
    { label: 'With intelligence text', value: competitors.filter((item) => item.intel !== 'No intelligence summary returned from the backend.').length, note: 'Records with backend narrative context' },
  ];

  return (
    <section className="workspace-page director-page role-dashboard role-dashboard-manager manager-page" id="page-competitor-intelligence">
      <DirectorHero
        eyebrow="Ecosystem"
        title="Competitor intelligence"
        description="Assess the live competitor records provided by the backend without synthetic threat labels or fabricated market values."
        metrics={[
          { value: competitors.length, label: 'competitors' },
          { value: summary[1].value, label: 'scored' },
          { value: summary[3].value, label: 'with intel' },
        ]}
      />

      <DirectorSummaryGrid items={summary} />

      {competitors.length === 0 ? (
        <EmptyDirectorState message="No competitor intelligence records were returned by the backend." />
      ) : (
        <div className="director-list">
          {competitors.map((competitor) => (
            <article key={competitor.id} className="director-list-card" style={{ borderLeftColor: '#2563eb' }}>
              <div className="director-list-head">
                <div>
                  <div className="director-list-title-row">
                    <h3>{competitor.name}</h3>
                    <span className="workspace-badge neutral">{competitor.segment}</span>
                    <span className="workspace-badge neutral">{competitor.threatLabel}</span>
                  </div>
                  <p>{competitor.intel}</p>
                </div>
                <div className="director-score-pill">
                  <strong>{competitor.threatValue ?? competitor.marketShare}</strong>
                  <span>{competitor.threatValue !== null ? 'Threat score' : 'Market share'}</span>
                </div>
              </div>
            </article>
          ))}
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
