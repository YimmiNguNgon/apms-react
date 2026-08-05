import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import i18n from '../i18n';
import { formatDate } from '../utils/format';
import styles from './RelationshipMap.module.css';

type GroupKey = 'ALL' | 'project' | 'supplier' | 'customer' | 'competitor' | 'investment' | 'other';
type LayoutMode = 'radial' | 'grid';

interface GraphRelationshipExt {
  targetCompanyId: string;
  targetCompanyName?: string;
  relationshipType: string;
  confidenceScore?: number;
  projectId?: string;
}

interface GraphCompanyDto {
  companyId: string;
  name: string;
  industry?: string;
  relationships?: GraphRelationshipExt[];
}

interface RiskItem {
  companyId: string;
  tradeName?: string;
  riskScore?: number;
  riskLevel?: string;
}

interface GNode {
  id: string;
  name: string;
  initials: string;
  short: string;
  connections: number;
  color: string;
  label: string;
  group: GroupKey;
  industry?: string;
}

interface GEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  color: string;
  dashed: boolean;
  label: string;
  group: GroupKey;
}

interface GraphState {
  nodes: GNode[];
  edges: GEdge[];
  counts: Record<GroupKey, number>;
  projectCount: number;
}

const TYPE_META: Record<string, { color: string; label: string; dashed: boolean; group: GroupKey }> = {
  PARTNER_WITH: { color: '#10B981', label: i18n.t('relationship-map:relationshipTypes.partnerWith'), dashed: false, group: 'project' },
  SUPPLIER_OF: { color: '#2563EB', label: i18n.t('relationship-map:relationshipTypes.supplierOf'), dashed: true, group: 'supplier' },
  CUSTOMER_OF: { color: '#F97316', label: i18n.t('relationship-map:relationshipTypes.customerOf'), dashed: false, group: 'customer' },
  COMPETITOR_OF: { color: '#EF4444', label: i18n.t('relationship-map:relationshipTypes.competitorOf'), dashed: true, group: 'competitor' },
  POTENTIAL_PARTNER_OF: { color: '#8B5CF6', label: i18n.t('relationship-map:relationshipTypes.potentialPartnerOf'), dashed: true, group: 'investment' },
};

const FALLBACK_META = { color: '#64748B', label: i18n.t('relationship-map:relationshipTypes.fallback'), dashed: false, group: 'other' as GroupKey };

const LEGEND_ORDER = ['PARTNER_WITH', 'SUPPLIER_OF', 'CUSTOMER_OF', 'COMPETITOR_OF', 'POTENTIAL_PARTNER_OF'];

const CHIP_LABELS: Record<string, string> = {
  ALL: i18n.t('relationship-map:chips.all'),
  project: i18n.t('relationship-map:chips.project'),
  supplier: i18n.t('relationship-map:chips.supplier'),
  customer: i18n.t('relationship-map:chips.customer'),
  competitor: i18n.t('relationship-map:chips.competitor'),
  investment: i18n.t('relationship-map:chips.investment'),
};

const SAMPLE_COUNTS: Record<string, number> = {
  ALL: 48, project: 8, supplier: 6, customer: 5, competitor: 3, investment: 4,
};

const CHIP_DEFS: Array<{ key: GroupKey; color: string }> = [
  { key: 'ALL', color: '#64748B' },
  { key: 'project', color: '#10B981' },
  { key: 'supplier', color: '#2563EB' },
  { key: 'customer', color: '#F97316' },
  { key: 'competitor', color: '#EF4444' },
  { key: 'investment', color: '#8B5CF6' },
];

const PARTNER_TYPE_OPTIONS = [
  { value: 'PARTNER_WITH', label: i18n.t('relationship-map:relationshipTypes.partnerWith') },
  { value: 'SUPPLIER_OF', label: i18n.t('relationship-map:relationshipTypes.supplierOf') },
  { value: 'CUSTOMER_OF', label: i18n.t('relationship-map:relationshipTypes.customerOf') },
  { value: 'COMPETITOR_OF', label: i18n.t('relationship-map:relationshipTypes.competitorOf') },
  { value: 'POTENTIAL_PARTNER_OF', label: i18n.t('relationship-map:relationshipTypes.potentialPartnerOf') },
] as const;

interface PartnerForm {
  name: string;
  industry: string;
  relationshipType: string;
  notes: string;
}

const clamp = (v: number) => Math.min(2, Math.max(0.7, Math.round(v * 10) / 10));

const hexToRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

const darken = (hex: string, amt: number) => {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.max(0, Math.round(v * (1 - amt))));
  return `rgb(${r},${g},${b})`;
};

const avatarGrad = (hex: string) => `linear-gradient(135deg, ${hex} 0%, ${darken(hex, 0.28)} 100%)`;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function shortOf(name: string): string {
  const t = name.trim();
  return t.length > 15 ? `${t.slice(0, 15)}…` : t;
}

function buildGraph(raw: GraphCompanyDto[]): GraphState {
  const incBy: Record<string, string[]> = {};
  const edges: GEdge[] = [];
  const projects = new Set<string>();

  raw.forEach((c) => {
    (c.relationships || []).forEach((rel) => {
      const t = (rel.relationshipType || '').toUpperCase();
      const meta = TYPE_META[t] || FALLBACK_META;
      edges.push({
        id: `${c.companyId}→${rel.targetCompanyId}·${t}`,
        from: c.companyId,
        to: rel.targetCompanyId,
        type: t,
        color: meta.color,
        dashed: meta.dashed,
        label: meta.label,
        group: meta.group,
      });
      (incBy[c.companyId] = incBy[c.companyId] || []).push(t);
      (incBy[rel.targetCompanyId] = incBy[rel.targetCompanyId] || []).push(t);
      if (rel.projectId) projects.add(rel.projectId);
    });
  });

  const nodes: GNode[] = raw.map((c) => {
    const types = incBy[c.companyId] || [];
    const freq: Record<string, number> = {};
    types.forEach((t) => { freq[t] = (freq[t] || 0) + 1; });
    const domType = Object.keys(freq).sort((a, b) => (freq[b] || 0) - (freq[a] || 0))[0];
    const meta = TYPE_META[domType] || FALLBACK_META;
    const displayName = c.name || i18n.t('relationship-map:node.noName');
    return {
      id: c.companyId,
      name: displayName,
      initials: initialsOf(displayName),
      short: shortOf(displayName),
      connections: types.length,
      color: meta.color,
      label: meta.label,
      group: meta.group,
      industry: c.industry,
    };
  });

  const counts: Record<GroupKey, number> = {
    ALL: edges.length, project: 0, supplier: 0, customer: 0, competitor: 0, investment: 0, other: 0,
  };
  edges.forEach((e) => { counts[e.group] = (counts[e.group] || 0) + 1; });

  return { nodes, edges, counts, projectCount: projects.size };
}

function radialPositions(n: number, cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });
}

function gridPositions(n: number, cx: number, cy: number, w: number, h: number): Array<{ x: number; y: number }> {
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const out: Array<{ x: number; y: number }> = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (idx >= n) break;
      const x = cols > 1 ? cx - w / 2 + (w / (cols - 1)) * c : cx;
      const y = rows > 1 ? cy - h / 2 + (h / (rows - 1)) * r : cy;
      out.push({ x, y });
      idx++;
    }
  }
  return out;
}

interface RelationshipMapProps {
  setActivePage?: (page: string, params?: Record<string, string>) => void;
}

export const RelationshipMap: React.FC<RelationshipMapProps> = ({ setActivePage }) => {
  const { t } = useTranslation('relationship-map');
  const [graph, setGraph] = useState<GraphState | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GroupKey>('ALL');
  const [industryFilter, setIndustryFilter] = useState<string[]>(() => {
    const raw = new URLSearchParams(window.location.search).get('industry');
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });
  const [industrySearch, setIndustrySearch] = useState('');
  const [layout, setLayout] = useState<LayoutMode>('radial');
  const [zoom, setZoom] = useState(1);
  const [hoverNode, setHoverNode] = useState<string | null>(null);
  const [aiScore, setAiScore] = useState('8.4');
  const [riskWarnings, setRiskWarnings] = useState(7);

  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerForm, setPartnerForm] = useState<PartnerForm>({ name: '', industry: '', relationshipType: 'PARTNER_WITH', notes: '' });
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.allSettled([
      api.get<GraphCompanyDto[]>('/graph/network'),
      api.get<RiskItem[]>('/risk-monitoring'),
    ])
      .then(([net, risk]) => {
        const list = net.status === 'fulfilled' && Array.isArray(net.value?.data) ? net.value.data : [];
        setGraph(buildGraph(list));
        if (risk.status === 'fulfilled' && Array.isArray(risk.value?.data)) {
          const items = risk.value.data as RiskItem[];
          const scores = items.map((i) => Number(i.riskScore)).filter((n) => !Number.isNaN(n));
          if (scores.length) setAiScore((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
          setRiskWarnings(items.filter((i) => (i.riskLevel || '').toUpperCase() === 'HIGH').length);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = formatDate(new Date());

  const updateIndustryFilter = useCallback((next: string[]) => {
    setIndustryFilter(next);
    const params = new URLSearchParams(window.location.search);
    if (next.length) params.set('industry', next.join(','));
    else params.delete('industry');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
  }, []);

  const kpis: Array<{ label: string; value: number | string; growth: string; color: string }> = useMemo(() => {
    const n = graph?.nodes.length ?? 48;
    const e = graph?.edges.length ?? 18;
    const p = graph?.projectCount ?? 3;
    return [
      { label: t('stats.totalPartners'), value: n, growth: t('stats.totalPartnersGrowth'), color: '#2563EB' },
      { label: t('stats.activeRelations'), value: e, growth: t('stats.activeRelationsGrowth'), color: '#F59E0B' },
      { label: t('stats.sharedProjects'), value: p, growth: t('stats.sharedProjectsGrowth'), color: '#F97316' },
      { label: t('stats.riskWarnings'), value: riskWarnings, growth: t('stats.riskWarningsGrowth'), color: '#EF4444' },
      { label: t('stats.avgAiScore'), value: aiScore, growth: t('stats.avgAiScoreGrowth'), color: '#8B5CF6' },
    ];
  }, [graph, riskWarnings, aiScore, t]);

  const visibleNodes = useMemo(() => {
    if (!graph) return [];
    const hasTypeFilter = filter !== 'ALL';
    const hasIndustryFilter = industryFilter.length > 0;
    if (!hasTypeFilter && !hasIndustryFilter) return graph.nodes;
    const typeIds = new Set<string>();
    if (hasTypeFilter) {
      graph.edges.forEach((e) => { if (e.group === filter) { typeIds.add(e.from); typeIds.add(e.to); } });
    }
    return graph.nodes.filter((n) => {
      if (hasTypeFilter && !typeIds.has(n.id)) return false;
      if (hasIndustryFilter) {
        const nodeIndustry = (n.industry || '').trim() || t('filters.noIndustry');
        if (!industryFilter.includes(nodeIndustry)) return false;
      }
      return true;
    });
  }, [graph, filter, industryFilter, t]);

  const visibleEdges = useMemo(() => {
    if (!graph) return [];
    const hasTypeFilter = filter !== 'ALL';
    const hasIndustryFilter = industryFilter.length > 0;
    if (!hasTypeFilter && !hasIndustryFilter) return graph.edges;
    const ids = new Set(visibleNodes.map((n) => n.id));
    return graph.edges.filter((e) => {
      if (hasTypeFilter && e.group !== filter) return false;
      return ids.has(e.from) && ids.has(e.to);
    });
  }, [graph, filter, industryFilter, visibleNodes]);

  const industryOptions = useMemo(() => {
    if (!graph) return [];
    const map = new Map<string, number>();
    graph.nodes.forEach((n) => {
      const key = (n.industry || '').trim() || t('filters.noIndustry');
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
  }, [graph, t]);

  const positions = useMemo(() => {
    const n = visibleNodes.length;
    if (layout === 'grid') return gridPositions(n, 430, 220, 560, 260);
    return radialPositions(n, 430, 220, 150);
  }, [layout, visibleNodes.length]);

  const posById = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    visibleNodes.forEach((node, i) => m.set(node.id, positions[i] || { x: 430, y: 220 }));
    return m;
  }, [visibleNodes, positions]);

  const topPartners = useMemo(() => {
    if (!graph) return [];
    return [...visibleNodes].sort((a, b) => b.connections - a.connections).slice(0, 5);
  }, [graph, visibleNodes]);

  const handleViewCompany = (companyId?: string) => {
    if (!companyId) return;
    localStorage.setItem('apms-selected-company', companyId);
    if (setActivePage) {
      window.history.pushState({}, '', `/partner-ecosystem/company/${companyId}`);
      setActivePage('company-detail');
    }
  };

  const handleExportCSV = () => {
    const edges = graph?.edges ?? [];
    const header = [t('exportCsv.source'), t('exportCsv.type'), t('exportCsv.group'), t('exportCsv.target')];
    const rows = edges.map((e) => {
      const src = graph?.nodes.find((n) => n.id === e.from);
      const dst = graph?.nodes.find((n) => n.id === e.to);
      return [src?.name ?? e.from, e.label, CHIP_LABELS[e.group] ?? e.group, dst?.name ?? e.to];
    });
    const content = [header, ...rows].map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relationship_network_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const nodeDashed = (group: GroupKey) => group === 'supplier' || group === 'competitor' || group === 'investment';

  const openPartnerModal = () => {
    setPartnerForm({ name: '', industry: '', relationshipType: 'PARTNER_WITH', notes: '' });
    setPartnerError(null);
    setPartnerModalOpen(true);
  };

  const closePartnerModal = () => {
    if (partnerSubmitting) return;
    setPartnerModalOpen(false);
    setPartnerError(null);
  };

  const handleCreatePartner = async () => {
    if (!partnerForm.name.trim()) {
      setPartnerError(t('errors.requiredName'));
      return;
    }
    setPartnerSubmitting(true);
    setPartnerError(null);
    try {
      await api.post('/graph/partners', {
        name: partnerForm.name.trim(),
        industry: partnerForm.industry.trim() || undefined,
        relationshipType: partnerForm.relationshipType,
        notes: partnerForm.notes.trim() || undefined,
      });
      setPartnerModalOpen(false);
      await load();
    } catch (err) {
      setPartnerError(err instanceof Error ? err.message : t('errors.createFailed'));
    } finally {
      setPartnerSubmitting(false);
    }
  };

  return (
    <div className={styles.rmPage}>
      {/* ── Header ── */}
      <header className={styles.rmHeader}>
        <div className={styles.rmHeaderLeft}>
          <h1 className={styles.rmTitle}>{t('title')}</h1>
          <span className={styles.rmSub}>{t('subtitle', { date: today })}</span>
        </div>
        <div className={styles.rmHeaderActions}>
          <button className={`${styles.rmBtn} ${styles.rmBtnOutline}`} onClick={handleExportCSV}>
            {t('actions.export')}
          </button>
          <button className={`${styles.rmBtn} ${styles.rmBtnPrimary}`} onClick={openPartnerModal}>
            {t('actions.addPartner')}
          </button>
        </div>
      </header>

      {/* ── KPI row ── */}
      <section className={styles.rmKpiGrid}>
        {kpis.map((kpi, idx) => (
          <div key={kpi.label} className={styles.rmKpi} style={{ animationDelay: `${idx * 40}ms` }}>
            <div className={styles.rmKpiLabel}>{kpi.label}</div>
            <div className={styles.rmKpiBottom}>
              <span className={styles.rmKpiValue}>{kpi.value}</span>
              <span className={styles.rmKpiGrowth} style={{ color: kpi.color }}>{kpi.growth}</span>
            </div>
          </div>
        ))}
      </section>

      {/* ── Main grid ── */}
      <div className={styles.rmMainGrid}>
        {/* Network panel */}
        <section className={styles.rmNetwork}>
          <div className={styles.rmNetworkHead}>
            <div className={styles.rmNetworkTitle}>
              <h2>{t('network.title')}</h2>
              <span className={styles.rmTag}>{t('network.companies', { count: graph ? visibleNodes.length : 12 })}</span>
              <span className={styles.rmTag}>{t('network.connections', { count: graph ? visibleEdges.length : 18 })}</span>
            </div>
            <div className={styles.rmControls}>
              <button className={styles.rmCtrlBtn} title={t('network.zoomOut')} onClick={() => setZoom((z) => clamp(z - 0.2))}>-</button>
              <button className={styles.rmCtrlBtn} title={t('network.zoomIn')} onClick={() => setZoom((z) => clamp(z + 0.2))}>+</button>
              <button className={styles.rmCtrlBtn} title={t('network.refresh')} onClick={load}>{t('network.refresh')}</button>
              <button className={styles.rmCtrlBtn} title={t('network.toggleLayout')} onClick={() => setLayout((l) => (l === 'radial' ? 'grid' : 'radial'))}>
                {layout === 'radial' ? t('network.grid') : t('network.radial')}
              </button>
            </div>
          </div>

          <div className={styles.rmGraphWrap}>
            {loading ? (
              <div className={styles.rmLoading}>{t('network.loading')}</div>
            ) : graph && graph.nodes.length > 0 ? (
              visibleNodes.length === 0 ? (
                <div className={styles.rmEmpty}>{t('network.emptyFiltered')}</div>
              ) : (
                <svg className={styles.rmGraph} viewBox="0 0 860 440" role="img" aria-label={t('network.ariaLabel')}>
                  <defs>
                    <pattern id="rmDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1.2" fill="rgba(148,163,184,0.28)" />
                    </pattern>
                    <radialGradient id="rmCenterGrad" cx="50%" cy="42%" r="72%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#1e3a8a" />
                    </radialGradient>
                    <radialGradient id="rmCenterHalo" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(59,130,246,0.35)" />
                      <stop offset="100%" stopColor="rgba(59,130,246,0)" />
                    </radialGradient>
                  </defs>

                  <rect x="0" y="0" width="860" height="440" fill="url(#rmDotGrid)" />
                  <ellipse cx="430" cy="220" rx="270" ry="165" fill="url(#rmCenterHalo)" />

                  <g
                    className={styles.rmGraphGroup}
                    style={{
                      transform: `translate(${(430 * (1 - zoom)).toFixed(2)}px, ${(220 * (1 - zoom)).toFixed(2)}px) scale(${zoom})`,
                    }}
                  >
                    {/* mesh edges */}
                    {visibleEdges.map((e, i) => {
                      const p1 = posById.get(e.from);
                      const p2 = posById.get(e.to);
                      if (!p1 || !p2) return null;
                      const active = hoverNode === null || e.from === hoverNode || e.to === hoverNode;
                      return (
                        <line
                          key={e.id}
                          className={styles.rmEdge}
                          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                          stroke={e.color}
                          strokeOpacity={active ? (hoverNode ? 0.9 : 0.35) : 0.12}
                          strokeWidth={active && hoverNode ? 2.2 : 1.2}
                          strokeDasharray={e.dashed ? '5 5' : undefined}
                          style={{ animationDelay: `${i * 20}ms` }}
                        />
                      );
                    })}

                    {/* hub edges from center */}
                    {visibleNodes.map((n) => {
                      const p = posById.get(n.id);
                      if (!p) return null;
                      const active = hoverNode === null || n.id === hoverNode;
                      return (
                        <line
                          key={`hub-${n.id}`}
                          className={styles.rmHubEdge}
                          x1={430} y1={220} x2={p.x} y2={p.y}
                          stroke={n.color}
                          strokeOpacity={active ? (hoverNode ? 0.55 : 0.25) : 0.08}
                          strokeWidth={active && hoverNode ? 1.8 : 1.2}
                          strokeDasharray={nodeDashed(n.group) ? '4 5' : undefined}
                        />
                      );
                    })}

                    {/* satellite nodes */}
                    {visibleNodes.map((n, i) => {
                      const p = posById.get(n.id)!;
                      const dimmed = hoverNode !== null && hoverNode !== n.id;
                      return (
                        <g
                          key={n.id}
                          className={styles.rmNodeGroup}
                          style={{ opacity: dimmed ? 0.35 : 1, animationDelay: `${i * 45}ms` }}
                          onClick={() => handleViewCompany(n.id)}
                          onMouseEnter={() => setHoverNode(n.id)}
                          onMouseLeave={() => setHoverNode(null)}
                        >
                          <title>{n.name}</title>
                          <circle
                            cx={p.x} cy={p.y} r={18}
                            fill={`${n.color}1f`} stroke={n.color} strokeWidth={2}
                            style={{ cursor: 'pointer', filter: `drop-shadow(0 3px 8px ${hexToRgba(n.color, 0.35)})` }}
                          />
                          <text x={p.x} y={p.y + 3.5} textAnchor="middle" className={styles.rmNodeText} fill={n.color}>{n.initials}</text>
                          <circle cx={p.x + 13} cy={p.y - 13} r={7} fill={n.color} stroke="#fff" strokeWidth={1.5} />
                          <text x={p.x + 13} y={p.y - 10.5} textAnchor="middle" className={styles.rmBadgeText}>{n.connections}</text>
                          <text x={p.x} y={p.y + 30} textAnchor="middle" className={styles.rmNodeLabel}>{n.short}</text>
                        </g>
                      );
                    })}

                    {/* center node */}
                    <g className={styles.rmCenterHalo} pointerEvents="none">
                      <circle cx={430} cy={220} r={46} fill="rgba(59,130,246,0.15)" />
                      <circle cx={430} cy={220} r={40} fill="url(#rmCenterGrad)" stroke="#1e40af" strokeWidth={2.5} />
                      <text x={430} y={215} textAnchor="middle" className={styles.rmCenterText}>MC</text>
                      <text x={430} y={229} textAnchor="middle" className={styles.rmCenterSub}>{t('network.centerSub')}</text>
                    </g>
                  </g>
                </svg>
              )
            ) : (
              <div className={styles.rmEmpty}>{t('network.emptyData')}</div>
            )}
          </div>

          <div className={styles.rmLegend}>
            {LEGEND_ORDER.map((key) => {
              const m = TYPE_META[key];
              return (
                <div key={key} className={styles.rmLegendItem}>
                  <span
                    className={`${styles.rmLegendLine} ${m.dashed ? styles.rmLegendLineDashed : styles.rmLegendLineSolid}`}
                    style={{ borderColor: m.color }}
                  />
                  {m.label}
                </div>
              );
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className={styles.rmSide}>
          <div className={styles.rmSideCard}>
            <div className={styles.rmSideTitle}>{t('filters.title')}</div>
            <div className={styles.rmChips}>
              {CHIP_DEFS.map((chip) => {
                const count = graph ? (graph.counts[chip.key] ?? 0) : (SAMPLE_COUNTS[chip.key] ?? 0);
                const active = filter === chip.key;
                return (
                  <button
                    key={chip.key}
                    className={`${styles.rmChip} ${active ? styles.rmChipActive : ''}`}
                    style={active ? { background: hexToRgba(chip.color, 0.14), borderColor: hexToRgba(chip.color, 0.35) } : undefined}
                    onClick={() => setFilter(chip.key)}
                  >
                    <span className={styles.rmChipDot} style={{ background: chip.color }} />
                    <span className={styles.rmChipLabel}>{CHIP_LABELS[chip.key]}</span>
                    <span className={styles.rmChipCount} style={active ? { color: chip.color, borderColor: hexToRgba(chip.color, 0.4) } : undefined}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.rmSideCard}>
            <div className={styles.rmSideTitle}>{t('filters.industry')}</div>
            <div className={styles.rmIndustrySearch}>
              <input
                type="text"
                className={styles.rmIndustrySearchInput}
                placeholder={t('filters.searchPlaceholder')}
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
              />
            </div>
            <div className={styles.rmIndustryList}>
              <label className={`${styles.rmIndustryItem} ${industryFilter.length === 0 ? styles.rmIndustryItemActive : ''}`}>
                <input
                  type="checkbox"
                  className={styles.rmIndustryCheck}
                  checked={industryFilter.length === 0}
                  onChange={() => updateIndustryFilter([])}
                />
                <span className={styles.rmIndustryName}>{t('filters.allIndustries')}</span>
                <span className={styles.rmIndustryCount}>{graph?.nodes.length ?? 0}</span>
              </label>
              {industryOptions
                .filter((opt) => opt.name.toLowerCase().includes(industrySearch.trim().toLowerCase()))
                .map((opt) => {
                  const checked = industryFilter.includes(opt.name);
                  return (
                    <label key={opt.name} className={`${styles.rmIndustryItem} ${checked ? styles.rmIndustryItemActive : ''}`}>
                      <input
                        type="checkbox"
                        className={styles.rmIndustryCheck}
                        checked={checked}
                        onChange={() => {
                          const next = checked
                            ? industryFilter.filter((x) => x !== opt.name)
                            : [...industryFilter, opt.name];
                          updateIndustryFilter(next);
                        }}
                      />
                      <span className={styles.rmIndustryName}>{opt.name}</span>
                      <span className={styles.rmIndustryCount}>{opt.count}</span>
                    </label>
                  );
                })}
              {industryOptions.length === 0 && !loading && (
                <div className={styles.rmIndustryEmpty}>{t('filters.empty')}</div>
              )}
              {industryOptions.length > 0 && industrySearch.trim() !== '' &&
                industryOptions.filter((opt) => opt.name.toLowerCase().includes(industrySearch.trim().toLowerCase())).length === 0 && (
                <div className={styles.rmIndustryEmpty}>{t('filters.notFound')}</div>
              )}
            </div>
          </div>

          <div className={styles.rmSideCard}>
            <div className={styles.rmSideTitle}>{t('topPartners.title')}</div>
            <div className={styles.rmRankList}>
              {topPartners.map((node, i) => {
                const maxConn = Math.max(1, ...topPartners.map((t) => t.connections));
                return (
                  <div
                    key={node.id}
                    className={`${styles.rmRankItem} ${i === 0 ? styles.rmRankTop : ''}`}
                    onClick={() => handleViewCompany(node.id)}
                  >
                    <span className={styles.rmRank}>{i + 1}</span>
                    <span className={styles.rmAvatar} style={{ background: avatarGrad(node.color) }}>{node.initials}</span>
                    <div className={styles.rmRankInfo}>
                      <div className={styles.rmRankName}>{node.short}</div>
                      <div className={styles.rmRankSub}>{node.industry || node.label}</div>
                      <div className={styles.rmRankBar}>
                        <span className={styles.rmRankBarFill} style={{ width: `${Math.round((node.connections / maxConn) * 100)}%`, background: node.color }} />
                      </div>
                    </div>
                    <span className={styles.rmRankCount}>{t('topPartners.connections', { count: node.connections })}</span>
                  </div>
                );
              })}
              {topPartners.length === 0 && !loading && (
                <div className={styles.rmEmpty}>
                  {graph && graph.nodes.length > 0 ? t('topPartners.emptyFiltered') : t('topPartners.emptyData')}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* ── Add partner modal ── */}
      {partnerModalOpen && (
        <div className="modal-overlay" onClick={closePartnerModal}>
          <div className={`modal ${styles.rmModal}`} role="dialog" aria-modal="true" aria-labelledby="add-partner-title" onClick={(e) => e.stopPropagation()}>
            <div className={styles.rmModalHead}>
              <div>
                <h3 id="add-partner-title">{t('modal.addTitle')}</h3>
                <p>{t('modal.description')}</p>
              </div>
              <button className={styles.rmModalClose} type="button" aria-label={t('modal.close')} onClick={closePartnerModal}>&times;</button>
            </div>

            {partnerError && <div className="workspace-inline-error">{partnerError}</div>}

            <div className={styles.rmFormGrid}>
              <label>
                <span>{t('modal.companyName')} <em>*</em></span>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t('modal.companyNamePlaceholder')}
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm((cur) => ({ ...cur, name: e.target.value }))}
                />
              </label>
              <label>
                <span>{t('modal.industry')}</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder={t('modal.industryPlaceholder')}
                  value={partnerForm.industry}
                  onChange={(e) => setPartnerForm((cur) => ({ ...cur, industry: e.target.value }))}
                />
              </label>
              <label className={styles.rmFormSpan}>
                <span>{t('modal.relationshipType')} <em>*</em></span>
                <select
                  className="search-input"
                  value={partnerForm.relationshipType}
                  onChange={(e) => setPartnerForm((cur) => ({ ...cur, relationshipType: e.target.value }))}
                >
                  {PARTNER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.rmFormSpan}>
                <span>{t('modal.notes')}</span>
                <textarea
                  className="search-input"
                  rows={4}
                  placeholder={t('modal.notesPlaceholder')}
                  value={partnerForm.notes}
                  onChange={(e) => setPartnerForm((cur) => ({ ...cur, notes: e.target.value }))}
                />
              </label>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={closePartnerModal} disabled={partnerSubmitting}>{t('modal.cancel')}</button>
              <button className="btn btn-primary" onClick={() => void handleCreatePartner()} disabled={partnerSubmitting}>
                {partnerSubmitting ? t('modal.saving') : t('modal.addPartner')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
