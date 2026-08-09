import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { externalDataApi, type ExternalDataItem } from '../API/externalDataApi';
import {
  DataTable,
  Drawer,
  EmptyState,
  FilterBar,
  MetricCard,
  PageHeader,
  PrimaryButton,
  RiskBadge,
  SecondaryButton,
  Tabs,
} from '../components/ui';
import type { ColumnDef } from '../components/ui/DataTable';
import type { FilterConfig } from '../components/ui/FilterBar';

interface NormalizedNewsArticle {
  id: string;
  title: string;
  source: { name: string; publishedAt: string; url: string | null };
  summary: { text: string | null };
  originalArticle: { content: string | null; url: string | null };
  aiAnalysis: {
    sentiment: string | null;
    importance: string | null;
    confidence: number | null;
    topics: string[];
    keyPoints: string[];
    businessImpact: string | null;
    riskLevel: string | null;
  };
  relatedCompanies: Array<{ id: string | null; name: string; ticker: string | null; relationship: string; relevance: string | null }>;
  recommendedAction: { priority: string | null; action: string | null; reason: string | null; timeframe: string | null };
  relatedCompanyId: string | null;
  companyProfileId: string | null;
  topics: string[];
}

type NewsArticleItem = NormalizedNewsArticle;

interface NewsProps {
  setActivePage?: (page: string) => void;
}

const repairMojibake = (value: string) => {
  if (!/[\u00c2\u00c3\u00e2]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
    const repaired = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return repaired.includes('\uFFFD') ? value : repaired;
  } catch {
    return value;
  }
};

const displayValue = (value?: string | null) => (value && value.trim() ? repairMojibake(value).trim() : null);

const safeExternalUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
};

const parseHtmlContent = (value?: string | null) => {
  if (!value) return null;
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,form').forEach((node) => node.remove());
  const text = (doc.body.textContent || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return text ? repairMojibake(text) : null;
};

const extractSource = (value?: string | null) => {
  if (!value) return { name: 'Source not available', url: null as string | null };
  const parser = new DOMParser();
  const doc = parser.parseFromString(value, 'text/html');
  const anchor = doc.querySelector('a[href]');
  const font = doc.querySelector('font');
  const text = parseHtmlContent(value) || 'Source not available';
  return {
    name: repairMojibake((font?.textContent || text).replace(/\s+/g, ' ').trim()),
    url: safeExternalUrl(anchor?.getAttribute('href')),
  };
};

const formatPublishedAt = (value?: string | null) => {
  if (!value) return 'Date not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date not available' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const normalizeConfidence = (value?: number | null) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const percentage = value >= 0 && value <= 1 ? value * 100 : value;
  return percentage >= 0 && percentage <= 100 ? Math.round(percentage) : null;
};

const normalizeArticle = (item: ExternalDataItem): NormalizedNewsArticle => {
  const source = extractSource(item.source || item.sourceDomain);
  const publishedAt = formatPublishedAt(item.publishedAt || item.createdAt);
  const title = parseHtmlContent(item.title) || 'Untitled news item';
  const summary = parseHtmlContent(item.aiSummary) || parseHtmlContent(item.summary);
  const topics = (item.topics || []).filter(Boolean);
  const importance = item.riskLevel || item.opportunityLevel || null;
  const companyName = displayValue(item.relatedCompanyName);
  return {
    id: item.id,
    title,
    source: { name: source.name, publishedAt, url: safeExternalUrl(item.url) || source.url },
    summary: { text: summary },
    originalArticle: { content: parseHtmlContent(item.summary), url: item.url || source.url },
    aiAnalysis: {
      sentiment: displayValue(item.sentiment)?.toUpperCase() || null,
      importance: importance?.toUpperCase() || null,
      confidence: normalizeConfidence(item.sentimentConfidence),
      topics,
      keyPoints: [],
      businessImpact: null,
      riskLevel: item.riskLevel?.toUpperCase() || null,
    },
    relatedCompanies: companyName ? [{ id: item.relatedCompanyId || item.companyProfileId || null, name: companyName, ticker: null, relationship: 'Referenced Company', relevance: null }] : [],
    recommendedAction: { priority: null, action: null, reason: null, timeframe: null },
    relatedCompanyId: item.relatedCompanyId || null,
    companyProfileId: item.companyProfileId || null,
    topics,
  };
};

const DRAWER_TABS = [
  { id: 'summary',     label: 'Summary' },
  { id: 'original',    label: 'Original Article' },
  { id: 'analysis',    label: 'AI Analysis' },
  { id: 'companies',   label: 'Related Companies' },
  { id: 'recommended', label: 'Recommended Action' },
];

// Helper Badge
const SentimentBadge: React.FC<{ sentiment?: string | null }> = ({ sentiment }) => {
  const value = sentiment?.toUpperCase() || '';
  const colors = {
    POSITIVE: { bg: 'var(--cds-support-success-bg)', color: 'var(--cds-support-success)', label: 'Positive' },
    NEGATIVE: { bg: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', label: 'Negative' },
    NEUTRAL:  { bg: 'var(--cds-layer-01)', color: 'var(--cds-text-secondary)', label: 'Neutral' },
  };
  const theme = colors[value as keyof typeof colors] || { bg: 'var(--cds-layer-01)', color: 'var(--cds-text-helper)', label: 'Not available' };
  return (
    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: theme.bg, color: theme.color, whiteSpace: 'nowrap' }}>
      {theme.label}
    </span>
  );
};

export const News: React.FC<NewsProps> = ({ setActivePage }) => {
  const { t } = useTranslation('news');
  const drawerTabs = [
    { id: 'summary', label: t('modal.aiSummaryTitle') },
    { id: 'original', label: t('modal.collectedContent') },
    { id: 'analysis', label: t('aiState.completed') },
    { id: 'companies', label: t('company.related') },
    { id: 'recommended', label: t('actions.details') },
  ];
  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [sentimentFilter, setSentimentFilter] = useState('All');
  const [importanceFilter, setImportanceFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drawer state
  const [selectedArticle, setSelectedArticle] = useState<NewsArticleItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('summary');

  // Load from API on mount
  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await externalDataApi.getItems('NEWS', { page: 0, size: 100 });
        if (res?.content && Array.isArray(res.content)) {
          const mapped: NewsArticleItem[] = res.content.map(normalizeArticle);
          setArticles(mapped);
        } else {
          setArticles([]);
        }
      } catch {
        setArticles([]);
        setLoadError('Unable to load intelligence data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    void fetchNews();
  }, [dataVersion]);

  const refreshCompanyNews = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await externalDataApi.runApprovedProfilesFetch();
      setDataVersion((version) => version + 1);
    } finally {
      setRefreshing(false);
    }
  };

  const shareDigest = async () => {
    if (!selectedArticle) return;
    const digest = [
      selectedArticle.title,
      `${selectedArticle.source.name} - ${selectedArticle.source.publishedAt}`,
      selectedArticle.summary.text,
    ].filter(Boolean).join('\n\n');
    const shareData = {
      title: selectedArticle.title,
      text: digest,
      ...(selectedArticle.source.url ? { url: selectedArticle.source.url } : {}),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(digest);
        window.alert('News digest copied to the clipboard.');
        return;
      }
      window.alert('Sharing is not available in this browser.');
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        window.alert('Unable to share the news digest. Please try again.');
      }
    }
  };

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((item) => {
      const matchSearch =
        !search ||
        (item.title || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.relatedCompanies[0]?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        item.source.name.toLowerCase().includes(search.toLowerCase());

      const matchSource = sourceFilter === 'All' || item.source.name === sourceFilter;
      const matchSentiment = sentimentFilter === 'All' || item.aiAnalysis.sentiment === sentimentFilter;
      const matchImportance = importanceFilter === 'All' || item.aiAnalysis.importance === importanceFilter;

      return matchSearch && matchSource && matchSentiment && matchImportance;
    });
  }, [articles, search, sourceFilter, sentimentFilter, importanceFilter]);

  // Unique sources for filter
  const uniqueSources = useMemo(() => {
    const set = new Set(articles.map((a) => a.source.name).filter(Boolean));
    return [{ value: 'All', label: 'All Sources' }, ...Array.from(set).map((s) => ({ value: s, label: s }))];
  }, [articles]);

  // Key Metrics
  const totalArticles = articles.length;
  const uniqueCompaniesCount = new Set(articles.flatMap((a) => a.relatedCompanies.map((company) => company.name))).size;
  const uniqueSourcesCount = uniqueSources.length - 1;
  const positiveNewsCount = articles.filter((a) => a.aiAnalysis.sentiment === 'POSITIVE').length;
  const negativeNewsCount = articles.filter((a) => a.aiAnalysis.sentiment === 'NEGATIVE').length;

  // Trending Companies Computation
  const trendingCompanies = useMemo(() => {
    const map: Record<string, { count: number; sentiment: string }> = {};
    articles.forEach((a) => {
      const comp = a.relatedCompanies[0]?.name;
      if (comp) {
        if (!map[comp]) map[comp] = { count: 0, sentiment: a.aiAnalysis.sentiment || '' };
        map[comp].count += 1;
      }
    });
    return Object.entries(map).map(([name, val]) => ({ name, ...val })).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [articles]);

  // Topic Distribution Computation
  const topicDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach((a) => {
      a.topics.forEach((tp) => {
        map[tp] = (map[tp] || 0) + 1;
      });
    });
    return Object.entries(map).map(([topic, count]) => ({ topic, count }));
  }, [articles]);

  // Source Ranking Computation
  const sourceRanking = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach((a) => {
      const src = a.source.name || 'Web Outlet';
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [articles]);

  // Open Drawer
  const openDrawer = (item: NewsArticleItem) => {
    setSelectedArticle(item);
    setDrawerTab('summary');
    setDrawerOpen(true);
  };

  // â”€â”€ Table Column Definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const columns: ColumnDef<NewsArticleItem>[] = [
    {
      key: 'title',
      header: 'Title & Snippet',
      width: '280px',
      render: (_, row) => (
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', lineHeight: '18px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {row.title || 'Untitled News Item'}
          </div>
          {row.summary.text && (
            <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '270px' }}>
              {row.summary.text}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'relatedCompanyName',
      header: 'Company',
      width: '150px',
      sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: '12px', fontWeight: 600, color: row.relatedCompanies[0] ? 'var(--cds-text-primary)' : 'var(--cds-text-helper)' }}>
          {row.relatedCompanies[0]?.name || 'Not available'}
        </span>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      width: '120px',
      sortable: true,
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{row.source.name}</span>
        </div>
      ),
    },
    {
      key: 'sentiment',
      header: 'Sentiment',
      width: '100px',
      sortable: true,
      render: (_, row) => <SentimentBadge sentiment={row.aiAnalysis.sentiment} />,
    },
    {
      key: 'importanceLevel',
      header: 'Importance',
      width: '100px',
      sortable: true,
      render: (_, row) => {
        const importance = row.aiAnalysis.importance || row.aiAnalysis.riskLevel;
        return <RiskBadge level={importance || ''} label={importance || 'Not available'} />;
      },
    },
    {
      key: 'publishedAt',
      header: 'Date',
      width: '110px',
      render: (_, row) => <span style={{ fontSize: '12px', color: 'var(--cds-text-helper)' }}>{row.source.publishedAt}</span>,
    },
    {
      key: 'confidenceScore',
      header: 'Confidence',
      width: '100px',
      align: 'center',
      render: (_, row) => (
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: 'var(--cds-support-info-bg)', color: 'var(--cds-interactive)' }}>
          {row.aiAnalysis.confidence == null ? 'Not available' : `${row.aiAnalysis.confidence}%`}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '100px',
      align: 'right',
      render: (_, row) => (
        <SecondaryButton size="sm" onClick={() => openDrawer(row)}>
          Details
        </SecondaryButton>
      ),
    },
  ];

  // â”€â”€ Filter Bar Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filters: FilterConfig[] = [
    { id: 'source', type: 'select', label: 'Source', value: sourceFilter, onChange: (v) => setSourceFilter(v as string), options: uniqueSources },
    {
      id: 'sentiment',
      type: 'select',
      label: 'Sentiment',
      value: sentimentFilter,
      onChange: (v) => setSentimentFilter(v as string),
      options: [
        { value: 'All', label: 'All Sentiments' },
        { value: 'POSITIVE', label: 'Positive' },
        { value: 'NEUTRAL', label: 'Neutral' },
        { value: 'NEGATIVE', label: 'Negative' },
      ],
    },
    {
      id: 'importance',
      type: 'select',
      label: 'Importance',
      value: importanceFilter,
      onChange: (v) => setImportanceFilter(v as string),
      options: [
        { value: 'All', label: 'All Importances' },
        { value: 'HIGH', label: 'High Importance' },
        { value: 'MEDIUM', label: 'Medium Importance' },
        { value: 'LOW', label: 'Low Importance' },
      ],
    },
  ];

  // â”€â”€ Render Drawer Tab Content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const renderDrawerTab = () => {
    if (!selectedArticle) return null;

    switch (drawerTab) {
      case 'summary':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)' }}>
              <strong>AI Executive Briefing</strong>
              <p style={{ margin: '8px 0 0' }}>{selectedArticle.summary.text || 'Summary not available.'}</p>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>At a Glance</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                <MetricCard label="Sentiment" value={selectedArticle.aiAnalysis.sentiment || 'Not available'} />
                <MetricCard label="Importance" value={selectedArticle.aiAnalysis.importance || 'Not available'} />
                <MetricCard label="AI Confidence" value={selectedArticle.aiAnalysis.confidence == null ? 'Not available' : `${selectedArticle.aiAnalysis.confidence}%`} />
                <MetricCard label="Risk Level" value={selectedArticle.aiAnalysis.riskLevel || 'Not available'} />
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Key Takeaways</h4>
              {selectedArticle.aiAnalysis.keyPoints.length > 0 ? selectedArticle.aiAnalysis.keyPoints.map((point) => <div key={point} style={{ fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}>- {point}</div>) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Key takeaways not available.</p>}
            </div>

            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Business Impact</h4>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}>{selectedArticle.aiAnalysis.businessImpact || 'Business impact not available.'}</p>
            </div>
          </div>
        );

      case 'original':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '20px' }}>
              <strong style={{ color: 'var(--cds-text-primary)', display: 'block', fontSize: '14px', marginBottom: '8px' }}>{selectedArticle.title}</strong>
              Source: {selectedArticle.source.name}<br />
              Published: {selectedArticle.source.publishedAt}
            </div>
            <div style={{ background: 'var(--cds-layer-01)', padding: '14px', border: '1px solid var(--cds-border-subtle-00)', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)', whiteSpace: 'pre-wrap' }}>
              {selectedArticle.originalArticle.content || 'Article content is not available in the system.'}
            </div>
            {selectedArticle.originalArticle.url && (
              <SecondaryButton size="sm" onClick={() => window.open(selectedArticle.originalArticle.url || '', '_blank', 'noopener,noreferrer')}>
                Open Original Publisher Link
              </SecondaryButton>
            )}
          </div>
        );

      case 'analysis':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <MetricCard label="Sentiment" value={selectedArticle.aiAnalysis.sentiment || 'Not available'} />
              <MetricCard label="Importance" value={selectedArticle.aiAnalysis.importance || 'Not available'} />
              <MetricCard label="AI Confidence" value={selectedArticle.aiAnalysis.confidence == null ? 'Not available' : `${selectedArticle.aiAnalysis.confidence}%`} />
            </div>
            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Topics</h4>
              {selectedArticle.aiAnalysis.topics.length > 0 ? selectedArticle.aiAnalysis.topics.map((topic) => <span key={topic} style={{ display: 'inline-block', marginRight: '6px', padding: '3px 8px', background: 'var(--cds-border-subtle-00)', color: 'var(--cds-text-primary)', fontSize: '11px' }}>{topic.replace(/_/g, ' ')}</span>) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>AI analysis is not available for this article.</p>}
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Business Impact</h4>
              <p style={{ margin: 0, fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}>{selectedArticle.aiAnalysis.businessImpact || 'Business impact not available.'}</p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Key Points</h4>
              {selectedArticle.aiAnalysis.keyPoints.length > 0 ? (
                <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}>
                  {selectedArticle.aiAnalysis.keyPoints.map((point) => <li key={point}>{point}</li>)}
                </ol>
              ) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>Key points not available.</p>}
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Risk Assessment</h4>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)' }}>{selectedArticle.aiAnalysis.riskLevel || 'Risk assessment not available.'}</p>
            </div>
          </div>
        );

      case 'companies':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedArticle.relatedCompanies.length > 0 ? selectedArticle.relatedCompanies.map((company) => {
              const companyId = company.id;
              return (
              <div key={companyId || company.name} style={{ background: 'var(--cds-layer-01)', padding: '12px', border: '1px solid var(--cds-border-subtle-00)' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--cds-text-primary)' }}>{company.name}</strong>
                <div style={{ marginTop: '8px', fontSize: '12px', lineHeight: '20px', color: 'var(--cds-text-secondary)' }}>Ticker: {company.ticker || 'Not available'}<br />Relationship: {company.relationship}<br />Relevance: {company.relevance || 'Not available'}</div>
                {companyId && setActivePage && <SecondaryButton size="sm" onClick={() => { localStorage.setItem('apms-selected-company', companyId); setDrawerOpen(false); setActivePage('company-detail'); }}>View Company Profile</SecondaryButton>}
              </div>
              );
            }) : <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No related companies were identified.</p>}
          </div>
        );

      case 'recommended':
        return (
          <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0' }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Recommended Action</h4>
            {selectedArticle.recommendedAction.action ? (
              <div style={{ fontSize: '13px', color: 'var(--cds-text-secondary)', lineHeight: '22px' }}>
                {selectedArticle.recommendedAction.priority && <p style={{ margin: '0 0 6px' }}><strong>Priority:</strong> {selectedArticle.recommendedAction.priority}</p>}
                <p style={{ margin: '0 0 6px' }}><strong>Recommended Action:</strong> {selectedArticle.recommendedAction.action}</p>
                {selectedArticle.recommendedAction.reason && <p style={{ margin: '0 0 6px' }}><strong>Reason:</strong> {selectedArticle.recommendedAction.reason}</p>}
                {selectedArticle.recommendedAction.timeframe && <p style={{ margin: 0 }}><strong>Timeframe:</strong> {selectedArticle.recommendedAction.timeframe}</p>}
              </div>
            ) : <><p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)' }}>No recommended action is available for this article.</p><p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--cds-text-helper)' }}>Owner may review the related company profile and original source.</p></>}
          </div>
        );

      default:
        return null;
    }
  };

  // â”€â”€ Main Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="cds-page-shell" id="page-news-intelligence">
      {/* 1. Page Header */}
      <PageHeader
        title={t('header.title')}
        eyebrow={t('header.eyebrow')}
        description={t('header.description')}
        breadcrumb={[{ label: t('header.dashboard') }, { label: t('header.breadcrumb') }]}
        actions={
          <>
            <SecondaryButton size="md" onClick={() => alert('Exporting Media Digest PDF...')}>
              {t('header.exportDigest')}
            </SecondaryButton>
            <PrimaryButton size="md" loading={refreshing} disabled={refreshing} onClick={() => void refreshCompanyNews()}>
              {refreshing ? t('header.refreshFeed') : t('header.refreshFeed')}
            </PrimaryButton>
          </>
        }
      />

      {loadError && (
        <div style={{ marginBottom: '14px', padding: '10px 14px', border: '1px solid var(--cds-support-error)', background: 'var(--cds-support-error-bg)', color: 'var(--cds-support-error)', fontSize: '13px' }}>
          {loadError}
        </div>
      )}

      {/* 2. Top Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <MetricCard label={t('metrics.articles.label')} value={totalArticles} description={t('metrics.articles.description')} trend={14} trendLabel={t('metrics.today')} />
        <MetricCard label={t('metrics.companies.label')} value={uniqueCompaniesCount} description={t('metrics.companies.description')} />
        <MetricCard label={t('metrics.sources.label')} value={uniqueSourcesCount} description={t('metrics.sources.description')} />
        <MetricCard label={t('metrics.positive.label')} value={positiveNewsCount} description={t('metrics.positive.description')} valueColor={positiveNewsCount > 0 ? 'var(--cds-support-success)' : undefined} />
        <MetricCard label={t('metrics.negative.label')} value={negativeNewsCount} description={t('metrics.negative.description')} valueColor={negativeNewsCount > 0 ? 'var(--cds-support-error)' : undefined} />
      </div>

      {/* 3. Featured News Feed Grid */}
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
          {t('title')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          {filteredArticles.slice(0, 3).map((article) => (
            <div
              key={article.id}
              onClick={() => openDrawer(article)}
              style={{
                background: 'var(--cds-background)',
                border: '1px solid var(--cds-border-color)',
                borderRadius: 'var(--cds-border-radius)',
                padding: '14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-helper)' }}>{article.source.name}</span>
                  <SentimentBadge sentiment={article.aiAnalysis.sentiment} />
                </div>
                <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)', lineHeight: '18px' }}>
                  {article.title}
                </h4>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--cds-text-secondary)', lineHeight: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {article.summary.text || t('summary.empty')}
                </p>
              </div>
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                <span>{t('table.company')}: <strong>{article.relatedCompanies[0]?.name || t('company.noMatch')}</strong></span>
                <span>{article.source.publishedAt}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Analytics Section: Trending Companies | Topic Distribution | Sentiment & Source Ranking */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        
        {/* Trending Companies */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('company.related')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {trendingCompanies.map((comp, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ color: 'var(--cds-text-primary)', fontWeight: 600 }}>{comp.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <SentimentBadge sentiment={comp.sentiment} />
                  <strong style={{ color: 'var(--cds-interactive)' }}>{comp.count}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic Distribution */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('modal.topics')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topicDistribution.map((t, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '2px' }}>
                  <span style={{ color: 'var(--cds-text-secondary)' }}>{t.topic}</span>
                  <span style={{ color: 'var(--cds-text-primary)', fontWeight: 600 }}>{t.count}</span>
                </div>
                <div style={{ height: '4px', background: 'var(--cds-border-subtle-00)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, t.count * 25)}%`, height: '100%', background: 'var(--cds-interactive)', borderRadius: '2px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Ranking */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px' }}>
          <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('metrics.sources.label')}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sourceRanking.map((s, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <span style={{ color: 'var(--cds-text-primary)', fontWeight: 500 }}>{idx + 1}. {s.source}</span>
                <strong style={{ color: 'var(--cds-text-secondary)' }}>{s.count}</strong>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 5. Filter Bar */}
      <FilterBar
        searchValue={search}
        searchPlaceholder={t('filters.searchPlaceholder')}
        onSearchChange={setSearch}
        filters={filters}
      />

      {/* 6. Enterprise Data Table */}
      <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px 16px' }}>
        <DataTable<NewsArticleItem>
          columns={columns}
          data={filteredArticles}
          rowKey={(row) => row.id}
          onRowClick={openDrawer}
          pageSize={10}
          exportFilename="news-intelligence-digest"
          loading={loading}
          emptyState={
            <EmptyState
              title={t('empty.noResults')}
              body={t('filters.searchPlaceholder')}
              action={
                <PrimaryButton size="sm" onClick={() => { setSearch(''); setSourceFilter('All'); setSentimentFilter('All'); setImportanceFilter('All'); }}>
                  {t('filters.reset')}
                </PrimaryButton>
              }
            />
          }
        />
      </div>

      {/* 7. Article Detail Drawer (5 Tabs, Zero Popups) */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedArticle?.title || t('actions.details')}
        subtitle={selectedArticle ? `${selectedArticle.source.name} - ${selectedArticle.source.publishedAt}` : ''}
        width={720}
        footerActions={
          <>
            {selectedArticle?.source.url && (
              <SecondaryButton size="sm" onClick={() => window.open(selectedArticle.source.url || '', '_blank', 'noopener,noreferrer')}>
                {t('modal.openOriginal')}
              </SecondaryButton>
            )}
            <PrimaryButton size="sm" onClick={() => void shareDigest()}>
              {t('header.exportDigest')}
            </PrimaryButton>
          </>
        }
      >
        {selectedArticle && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '12px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <SentimentBadge sentiment={selectedArticle.aiAnalysis.sentiment} />
              <RiskBadge level={selectedArticle.aiAnalysis.importance || selectedArticle.aiAnalysis.riskLevel || ''} label={selectedArticle.aiAnalysis.importance || selectedArticle.aiAnalysis.riskLevel || t('company.noMatch')} />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', marginLeft: 'auto' }}>
                AI: <strong>{selectedArticle.aiAnalysis.confidence == null ? t('company.noMatch') : `${selectedArticle.aiAnalysis.confidence}%`}</strong>
              </span>
            </div>

            <Tabs items={drawerTabs} activeId={drawerTab} onChange={setDrawerTab} />

            <div style={{ marginTop: '16px' }}>
              {renderDrawerTab()}
            </div>
          </>
        )}
      </Drawer>

    </div>
  );
};
