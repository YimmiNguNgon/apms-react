// Enterprise Relationship Map — IBM Carbon Operations Center
// 3-column Layout: Left Filters Sidebar | Center Interactive Network Graph | Right Analytics Sidebar
// Top KPI Row | Below-Graph Drawer on Node Click | Level-based Circular Network Redesign

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, RotateCcw, Building, Search, X, ArrowRight, CheckCircle2, AlertTriangle, AlertCircle, Play } from 'lucide-react';
import { api } from '../services/api';
import type { GraphCompanyDto, ProfileResponse, ProjectResponse } from '../types/domain';
import type { PageResponse } from '../services/api';
import {
  PageHeader,
  MetricCard,
  RiskBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';
import { CompanyDetail } from './CompanyDetail';

// ─── Types & Interfaces ────────────────────────────────────────────────────────
export type GroupKey = 'ALL' | 'partner' | 'supplier' | 'competitor' | 'customer' | 'potential-partner';

export type RelationshipGroupFilter =
  | 'PARTNER'
  | 'CUSTOMER'
  | 'SUPPLIER'
  | 'COMPETITOR'
  | 'POTENTIAL_PARTNER';

export const FILTER_TO_GROUP_KEY: Record<RelationshipGroupFilter, GroupKey> = {
  PARTNER: 'partner',
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  COMPETITOR: 'competitor',
  POTENTIAL_PARTNER: 'potential-partner',
};

export const getGroupFilterLabel = (group: RelationshipGroupFilter): string => {
  switch (group) {
    case 'PARTNER': return 'Partner';
    case 'CUSTOMER': return 'Customer';
    case 'SUPPLIER': return 'Supplier';
    case 'COMPETITOR': return 'Competitor';
    case 'POTENTIAL_PARTNER': return 'Potential Partner';
  }
};

export interface OwnerRelationshipClosenessSummary {
  companyProfileId: string;
  hasFinalizedAssessment: boolean;
  score: number | null;
  rank: 'A' | 'B' | 'C' | 'D' | null;
  rankDescription: string | null;
  versionNumber: number | null;
  completedAt: string | null;
  criteria: {
    commercial: number | null;
    interaction: number | null;
    strategic: number | null;
    network: number | null;
    engagement: number | null;
    trust: number | null;
  } | null;
  isLoading: boolean;
  isError: boolean;
}

const isClosenessEligibleGroup = (group: GroupKey): boolean => {
  return group === 'partner' || group === 'customer' || group === 'supplier';
};

const formatDate = (isoString?: string | null): string => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
};


const toGroupKey = (relationshipType?: string): GroupKey => {
  const t = (relationshipType || '').toUpperCase();
  switch (t) {
    case 'PARTNER':
    case 'PARTNER_WITH': return 'partner';
    case 'COMPETITOR':
    case 'COMPETITOR_OF': return 'competitor';
    case 'SUPPLIER':
    case 'SUPPLIER_OF': return 'supplier';
    case 'CUSTOMER':
    case 'CUSTOMER_OF': return 'customer';
    case 'POTENTIAL_PARTNER':
    case 'POTENTIAL_PARTNER_OF': return 'potential-partner';
    default: return 'partner';
  }
};

export interface GraphNode {
  id: string;
  name: string;
  industry: string;
  group: GroupKey;
  healthScore: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  connections: number;
  x: number;
  y: number;
  initials: string;
  color: string;
  overview?: string;
  sharedProjects?: Array<{ name: string; status: string; progress: number; due: string }>;
  contacts?: Array<{ name: string; role: string; email: string; phone: string }>;
  meetings?: Array<{ title: string; date: string; notes: string }>;
  aiRecommendation?: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  label: string;
  group: GroupKey;
  color: string;
  dashed: boolean;
}

const RELATIONSHIP_STYLES: Record<string, { color: string; label: string; dashed?: boolean }> = {
  partner: { color: '#10B981', label: 'Partner' }, // Green
  competitor: { color: '#EF4444', label: 'Competitor', dashed: true }, // Red
  supplier: { color: '#F59E0B', label: 'Supplier' }, // Orange
  customer: { color: '#2563EB', label: 'Customer' }, // Blue
  'potential-partner': { color: '#8B5CF6', label: 'Potential Partner', dashed: true }, // Purple
};

const DRAWER_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'strength',     label: 'Relationship Strength' },
  { id: 'projects',     label: 'Shared Projects' },
  { id: 'contacts',     label: 'Contacts' },
];

const getCurvePath = (x1: number, y1: number, x2: number, y2: number, bend = 20) => {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  
  if (len === 0) return { path: `M ${x1} ${y1}`, cx: x1, cy: y1 };
  
  const nx = -dy / len;
  const ny = dx / len;
  
  const cx = mx + nx * bend;
  const cy = my + ny * bend;
  
  return {
    path: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
    cx,
    cy
  };
};

export const SVG_VIEWBOX_WIDTH = 1400;
export const SVG_VIEWBOX_HEIGHT = 900;

export interface RingConfig {
  radius: number;
  count: number;
  startAngleOffset: number;
}

export function computeRingDistribution(totalCount: number): RingConfig[] {
  if (totalCount <= 0) return [];
  if (totalCount <= 8) {
    return [{ radius: 280, count: totalCount, startAngleOffset: 0 }];
  }
  if (totalCount <= 16) {
    const count1 = Math.min(6, Math.max(3, Math.round(totalCount * (230 / (230 + 360)))));
    const count2 = totalCount - count1;
    return [
      { radius: 230, count: count1, startAngleOffset: 0 },
      { radius: 360, count: count2, startAngleOffset: Math.PI / count2 },
    ];
  }
  if (totalCount <= 28) {
    const sumR = 220 + 330 + 440;
    const c1 = Math.min(6, Math.max(3, Math.round(totalCount * (220 / sumR))));
    const c2 = Math.min(10, Math.max(5, Math.round(totalCount * (330 / sumR))));
    const c3 = totalCount - c1 - c2;
    return [
      { radius: 220, count: c1, startAngleOffset: 0 },
      { radius: 330, count: c2, startAngleOffset: Math.PI / c2 },
      { radius: 440, count: c3, startAngleOffset: Math.PI / (2 * c3) },
    ];
  }
  // 4 rings for 29+ nodes
  const radii = [200, 310, 420, 530];
  const sumR = radii.reduce((a, b) => a + b, 0);
  let remaining = totalCount;
  const rings: RingConfig[] = [];
  radii.forEach((r, idx) => {
    if (idx === radii.length - 1) {
      rings.push({ radius: r, count: remaining, startAngleOffset: (idx % 2) * (Math.PI / Math.max(1, remaining)) });
    } else {
      const maxForRing = idx === 0 ? 6 : (idx === 1 ? 10 : 14);
      const c = Math.min(maxForRing, Math.max(3, Math.round(totalCount * (r / sumR))));
      const allocated = Math.min(remaining - (radii.length - 1 - idx), c);
      rings.push({ radius: r, count: allocated, startAngleOffset: (idx % 2) * (Math.PI / Math.max(1, allocated)) });
      remaining -= allocated;
    }
  });
  return rings;
}

export const TOGGLE_GROUPS_CONFIG: Array<{
  key: RelationshipGroupFilter;
  labelKey: string;
  defaultLabel: string;
  color: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}> = [
  {
    key: 'PARTNER',
    labelKey: 'chips.partner',
    defaultLabel: 'Partner',
    color: '#10B981',
    activeBg: '#ecfdf5',
    activeBorder: '#10B981',
    activeText: '#065f46',
  },
  {
    key: 'CUSTOMER',
    labelKey: 'chips.customer',
    defaultLabel: 'Customer',
    color: '#2563EB',
    activeBg: '#eff6ff',
    activeBorder: '#2563EB',
    activeText: '#1e40af',
  },
  {
    key: 'SUPPLIER',
    labelKey: 'chips.supplier',
    defaultLabel: 'Supplier',
    color: '#F59E0B',
    activeBg: '#fffbeb',
    activeBorder: '#F59E0B',
    activeText: '#92400e',
  },
  {
    key: 'COMPETITOR',
    labelKey: 'chips.competitor',
    defaultLabel: 'Competitor',
    color: '#EF4444',
    activeBg: '#fef2f2',
    activeBorder: '#EF4444',
    activeText: '#991b1b',
  },
  {
    key: 'POTENTIAL_PARTNER',
    labelKey: 'chips.potentialPartner',
    defaultLabel: 'Potential Partner',
    color: '#8B5CF6',
    activeBg: '#f5f3ff',
    activeBorder: '#8B5CF6',
    activeText: '#5b21b6',
  },
];

interface RelationshipMapProps {
  setActivePage?: (page: string) => void;
}

export const RelationshipMap: React.FC<RelationshipMapProps> = ({ setActivePage }) => {
  const { t, i18n } = useTranslation('relationship-map');

  const getGroupLabel = (group: string) => {
    switch (group) {
      case 'partner': return t('relationshipTypes.partnerWith', 'Partner');
      case 'competitor': return t('relationshipTypes.competitorOf', 'Competitor');
      case 'supplier': return t('relationshipTypes.supplierOf', 'Supplier');
      case 'customer': return t('relationshipTypes.customerOf', 'Customer');
      case 'potential-partner': return t('relationshipTypes.potentialPartnerOf', 'Potential Partner');
      default: return t('relationshipTypes.fallback', 'Other link');
    }
  };

  // ── State ────────────────────────────────────────────────────────
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [ownerName, setOwnerName] = useState('OUR COMPANY');
  const [ownerCompanyId, setOwnerCompanyId] = useState<string>('');
  const [projectCounts, setProjectCounts] = useState<Map<string, number>>(new Map());

  // Filters (Shared between left sidebar & local toolbar)
  const [search, setSearch] = useState('');
  const [activeRelationshipGroup, setActiveRelationshipGroup] = useState<RelationshipGroupFilter>('PARTNER');

  const supportsRelationshipCloseness =
    activeRelationshipGroup === 'PARTNER' ||
    activeRelationshipGroup === 'CUSTOMER' ||
    activeRelationshipGroup === 'SUPPLIER';

  const handleSelectRelationshipGroup = (newGroup: RelationshipGroupFilter) => {
    if (newGroup === activeRelationshipGroup) return;
    setActiveRelationshipGroup(newGroup);
    setSelectedNode(null);
    setHoveredNodeId(null);
    setTooltipNode(null);
    setTooltipPos(null);
    setExpandedL1Ids(new Set());
    setClosenessFilter('ALL');
  };
  const [minHealth, setMinHealth] = useState<number>(0);
  const [industryFilter, setIndustryFilter] = useState('All');
  const [depthFilter] = useState<'direct' | '2nd-degree' | 'all'>('2nd-degree');
  const [layoutMode, setLayoutMode] = useState<'radial' | 'grid'>('radial');

  // Incremental Expansion (Initial state shows Level 0 + Level 1. Click L1 node to expand L2 nodes)
  const [expandedL1Ids, setExpandedL1Ids] = useState<Set<string>>(new Set());

  // Closeness Real Data State & Filters
  const [closenessMap, setClosenessMap] = useState<Map<string, OwnerRelationshipClosenessSummary>>(new Map());
  const [isClosenessLoading, setIsClosenessLoading] = useState(false);
  const [closenessFilter, setClosenessFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'UNASSESSED'>('ALL');

  // Compact Tooltip State (short delay)
  const [tooltipNode, setTooltipNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const tooltipOpenTimerRef = useRef<any>(null);
  const tooltipCloseTimerRef = useRef<any>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Interactive Graph Controls
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [showAllL2, setShowAllL2] = useState<boolean>(false);

  // Sync & Details Overlay
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [aiRecommendations, setAiRecommendations] = useState<Record<string, any>>({});
  const [loadingAi, setLoadingAi] = useState(false);

  // ── Sync API Graph Data ──────────────────────────────────────────
  useEffect(() => {
    const fetchGraphData = async () => {
      setRefreshing(true);
      setLoadError(null);
      try {
        const res = await api.get<GraphCompanyDto[]>('/graph/network');
        if (!Array.isArray(res?.data)) throw new Error('Network API returned an invalid payload.');
        const loadedRelationships = res.data.reduce((count, company) => count + (company.relationships?.length || 0), 0);
        console.debug('[RelationshipNetwork] companies loaded:', res.data.length);
        console.debug('[RelationshipNetwork] relationships loaded:', loadedRelationships);
        if (res.data.length > 0) {
          const needsDetails = res.data.some((company) => !company.relationships);
          const details = needsDetails
            ? await Promise.allSettled(
              res.data.map((company) => api.get<GraphCompanyDto>(`/graph/companies/${encodeURIComponent(company.companyId)}`)),
            )
            : [];
          const companies = res.data.map((company, index) => {
            const detail = details[index];
            return detail?.status === 'fulfilled' && detail.value.data ? { ...company, ...detail.value.data } : company;
          });
          const canonicalCompanyIds = new Set(
            companies.map((company) => company.companyId).filter((companyId): companyId is string => Boolean(companyId)),
          );
          const groupByNode = new Map<string, GroupKey>();
          const edgeIds = new Set<string>();
          const hydratedEdges: GraphEdge[] = [];

          companies.forEach((company) => (company.relationships || []).forEach((relationship) => {
            const from = relationship.sourceCompanyId;
            const to = relationship.targetCompanyId;
            if (!from || !to) {
              if (import.meta.env.DEV) console.warn('[RelationshipNetwork] skipped relationship without canonical endpoints:', relationship);
              return;
            }
            if (!canonicalCompanyIds.has(from) || !canonicalCompanyIds.has(to)) {
              if (import.meta.env.DEV) console.warn('[RelationshipNetwork] skipped relationship with endpoint absent from network nodes:', { from, to, relationship });
              return;
            }
            const group = toGroupKey(relationship.relationshipType);
            const id = `${[from, to].sort().join('|')}|${group}`;
            if (edgeIds.has(id)) return;
            edgeIds.add(id);
            const style = RELATIONSHIP_STYLES[group] || { color: '#64748b', label: 'Related' };
            hydratedEdges.push({ 
              id, 
              from, 
              to, 
              type: relationship.relationshipType || style.label, 
              label: style.label, 
              group, 
              color: style.color, 
              dashed: Boolean(style.dashed) 
            });
            if (!groupByNode.has(from)) groupByNode.set(from, group);
            if (!groupByNode.has(to)) groupByNode.set(to, group);
          }));

          const hydratedNodes: GraphNode[] = companies.map((company, index) => {
            const hash = (company.companyId || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const healthScore = (hash % 21) + 75; // 75 - 95
            const riskLevel = (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const)[hash % 4];
            const group = groupByNode.get(company.companyId) || toGroupKey(company.relationshipType);

            const aiRecMap: Record<string, string> = {
              partner: "Strengthen active joint product integration. Coordinate marketing activities and co-selling opportunities in secondary markets.",
              supplier: "Schedule a quarterly service quality audit. Monitor operational delivery SLA compliance and prepare backup sourcing avenues.",
              competitor: "Track competitor customer acquisitions in the local market. Monitor their pricing adjustments and key executive transitions.",
              customer: "Schedule regular check-ins to monitor project delivery satisfaction and explore upselling opportunities.",
              'potential-partner': "Design a small-scale proof of concept (PoC) to evaluate operational synergy and synergies before full partnership commitment.",
            };
            const aiRec = aiRecMap[group] || "Maintain regular ecosystem monitoring and record any significant changes in corporate governance or market positioning.";

            return {
              id: company.companyId || `node-${index}`,
              name: company.name || 'Not available',
              industry: company.industry || 'Not available',
              group,
              healthScore,
              riskLevel,
              connections: 0,
              x: 0, y: 0,
              initials: (company.name || 'NA').trim().split(/\s+/).slice(0, 2).map((word) => word ? word[0] : '').join('').toUpperCase(),
              color: RELATIONSHIP_STYLES[group]?.color || '#2563EB',
              overview: company.industry ? `${company.name} operates in the ${company.industry} sector, serving key roles within our business network.` : 'Ecosystem node details are loaded and monitored.',
              sharedProjects: [],
              contacts: [],
              meetings: [],
              aiRecommendation: aiRec,
            };
          });
          setNodes(hydratedNodes);
          setEdges(hydratedEdges);
          if (import.meta.env.DEV) {
            console.debug('[RelationshipNetwork] nodes:', hydratedNodes.length);
            console.debug('[RelationshipNetwork] edges:', hydratedEdges.length);
          }
        } else {
          setNodes([]);
          setEdges([]);
        }
      } catch (err) {
        console.error("Error fetching graph network data:", err);
        setLoadError(err instanceof Error ? err.message : 'Unable to load relationship network data.');
        setNodes([]);
        setEdges([]);
      } finally {
        setRefreshing(false);
      }
    };
    void fetchGraphData();
  }, [dataVersion]);

  useEffect(() => {
    void Promise.allSettled([
      api.get<ProfileResponse>('/owner/company-profile'),
      api.get<PageResponse<ProjectResponse>>('/projects', { params: { page: 0, size: 100 } }),
    ]).then(([ownerResult, projectsResult]) => {
      if (ownerResult.status === 'fulfilled') {
        const profile = ownerResult.value.data;
        const name = profile?.identity?.tradeName || profile?.identity?.legalName;
        if (name) setOwnerName(name);
        if (profile?.companyId) setOwnerCompanyId(profile.companyId);
      }
      if (projectsResult.status === 'fulfilled') {
        const counts = new Map<string, number>();
        (projectsResult.value.data?.content || []).forEach((project) => {
          if (project.targetCompanyProfileId) counts.set(project.targetCompanyProfileId, (counts.get(project.targetCompanyProfileId) || 0) + 1);
        });
        setProjectCounts(counts);
      }
    });
  }, []);

  // ── Layout calculations ──────────────────────────────────────────
  const centerId = useMemo(() => {
    if (ownerCompanyId) return ownerCompanyId;
    const found = nodes.find(n => n.name.toLowerCase() === ownerName.toLowerCase());
    return found?.id || nodes[0]?.id || '';
  }, [ownerCompanyId, ownerName, nodes]);

  // ── Real Relationship Closeness Fetching (Promise.allSettled + Cache) ──
  useEffect(() => {
    if (nodes.length === 0) return;

    const eligibleNodes = nodes.filter(
      (n) => n.id !== centerId && isClosenessEligibleGroup(n.group)
    );

    if (eligibleNodes.length === 0) return;

    const missingNodes = eligibleNodes.filter((n) => !closenessMap.has(n.id));
    if (missingNodes.length === 0) return;

    setIsClosenessLoading(true);

    void Promise.allSettled(
      missingNodes.map(async (n) => {
        const res = await api.get<any>(
          `/company-profiles/${encodeURIComponent(n.id)}/relationship-assessments/overview`
        );
        return { nodeId: n.id, data: res.data };
      })
    ).then((results) => {
      setClosenessMap((prev) => {
        const next = new Map(prev);
        results.forEach((result, idx) => {
          const node = missingNodes[idx];
          if (!node) return;

          if (result.status === 'fulfilled' && result.value?.data) {
            const overviewData = result.value.data;
            const off = overviewData.officialFinalizedAssessment;
            if (off && (off.officialScore !== null || off.managerTotalScore !== null)) {
              next.set(node.id, {
                companyProfileId: node.id,
                hasFinalizedAssessment: true,
                score: off.officialScore ?? off.managerTotalScore ?? null,
                rank: (off.officialRank ?? off.managerRank ?? null) as any,
                rankDescription: off.officialRankDescription ?? off.managerRankDescription ?? null,
                versionNumber: off.versionNumber ?? null,
                completedAt: off.finalizedAt ?? off.updatedAt ?? null,
                criteria: {
                  commercial: off.commercialAwardedScore ?? null,
                  interaction: off.cooperationScore ?? null,
                  strategic: off.strategicScore ?? null,
                  network: off.relationshipNetworkScore ?? null,
                  engagement: off.engagementScore ?? null,
                  trust: off.qualitativeScore ?? null, // Correction 3: Explicitly qualitativeScore
                },
                isLoading: false,
                isError: false,
              });
            } else {
              next.set(node.id, {
                companyProfileId: node.id,
                hasFinalizedAssessment: false,
                score: null,
                rank: null,
                rankDescription: null,
                versionNumber: null,
                completedAt: null,
                criteria: null,
                isLoading: false,
                isError: false,
              });
            }
          } else {
            next.set(node.id, {
              companyProfileId: node.id,
              hasFinalizedAssessment: false,
              score: null,
              rank: null,
              rankDescription: null,
              versionNumber: null,
              completedAt: null,
              criteria: null,
              isLoading: false,
              isError: true,
            });
          }
        });
        return next;
      });
      setIsClosenessLoading(false);
    });
  }, [nodes, centerId, dataVersion]);

  // ── Unfiltered Group Counts (Authoritative Real Graph Data) ────────
  const groupCounts = useMemo(() => {
    const uniqueNodesMap = new Map<string, GraphNode>();
    nodes.forEach((n) => {
      if (n.id && n.id !== centerId && !uniqueNodesMap.has(n.id)) {
        uniqueNodesMap.set(n.id, n);
      }
    });

    const uniqueNodes = Array.from(uniqueNodesMap.values());

    return {
      PARTNER: uniqueNodes.filter((n) => n.group === 'partner').length,
      CUSTOMER: uniqueNodes.filter((n) => n.group === 'customer').length,
      SUPPLIER: uniqueNodes.filter((n) => n.group === 'supplier').length,
      COMPETITOR: uniqueNodes.filter((n) => n.group === 'competitor').length,
      POTENTIAL_PARTNER: uniqueNodes.filter((n) => n.group === 'potential-partner').length,
    };
  }, [nodes, centerId]);

  // ── Closeness Analytics (Derived Dynamically for Active Relationship Group) ────────
  const activeGroupKey = FILTER_TO_GROUP_KEY[activeRelationshipGroup];
  const isGroupEligibleForCloseness = isClosenessEligibleGroup(activeGroupKey);

  const closenessAnalytics = useMemo(() => {
    if (!isGroupEligibleForCloseness) {
      return {
        isEligible: false,
        totalEligible: 0,
        assessedCount: 0,
        averageScore: 0,
        rankA: 0,
        rankB: 0,
        rankC: 0,
        rankD: 0,
        unassessed: 0,
        needsAttention: [] as Array<{ id: string; name: string; score: number; rank: string }>,
        unassessedList: [] as Array<{ id: string; name: string }>,
      };
    }

    const uniqueGroupNodes = Array.from(
      new Map(
        nodes
          .filter((n) => n.id !== centerId && n.group === activeGroupKey)
          .map((n) => [n.id, n])
      ).values()
    );

    let assessedCount = 0;
    let scoreSum = 0;
    let rankA = 0;
    let rankB = 0;
    let rankC = 0;
    let rankD = 0;
    let unassessed = 0;

    const needsAttention: Array<{ id: string; name: string; score: number; rank: string }> = [];
    const unassessedList: Array<{ id: string; name: string }> = [];

    uniqueGroupNodes.forEach((node) => {
      const summary = closenessMap.get(node.id);
      if (summary?.hasFinalizedAssessment && summary.score !== null) {
        assessedCount++;
        scoreSum += summary.score;
        if (summary.rank === 'A') rankA++;
        else if (summary.rank === 'B') rankB++;
        else if (summary.rank === 'C') rankC++;
        else if (summary.rank === 'D') rankD++;

        // Correction 4: Rank C/D (score < 60)
        if (summary.rank === 'C' || summary.rank === 'D' || summary.score < 60) {
          needsAttention.push({
            id: node.id,
            name: node.name,
            score: summary.score,
            rank: summary.rank || 'C',
          });
        }
      } else {
        unassessed++;
        unassessedList.push({ id: node.id, name: node.name });
      }
    });

    const averageScore = assessedCount > 0 ? scoreSum / assessedCount : 0;

    return {
      isEligible: true,
      totalEligible: uniqueGroupNodes.length,
      assessedCount,
      averageScore,
      rankA,
      rankB,
      rankC,
      rankD,
      unassessed,
      needsAttention,
      unassessedList,
    };
  }, [nodes, centerId, closenessMap, activeGroupKey, isGroupEligibleForCloseness]);

  // ── Closeness Tooltip Handlers (Short Open/Close Delays) ────────────
  const handleNodeMouseEnter = (node: GraphNode, e: React.MouseEvent<HTMLDivElement>) => {
    if (node.id === centerId || !isClosenessEligibleGroup(node.group)) {
      return;
    }
    if (tooltipCloseTimerRef.current) {
      clearTimeout(tooltipCloseTimerRef.current);
    }
    const containerRect = canvasContainerRef.current?.getBoundingClientRect();
    const nodeRect = e.currentTarget.getBoundingClientRect();
    if (containerRect) {
      const top = nodeRect.bottom - containerRect.top + 6;
      const left = nodeRect.left - containerRect.left + nodeRect.width / 2;
      
      // Short open delay (100ms)
      tooltipOpenTimerRef.current = setTimeout(() => {
        setTooltipPos({ top, left });
        setTooltipNode(node);
      }, 100);
    }
  };

  const handleNodeMouseLeave = () => {
    if (tooltipOpenTimerRef.current) {
      clearTimeout(tooltipOpenTimerRef.current);
    }
    // Short close delay (150ms)
    tooltipCloseTimerRef.current = setTimeout(() => {
      setTooltipNode(null);
      setTooltipPos(null);
    }, 150);
  };

  // ── Closeness Filter Matching Helper ──────────────────────────────
  const isNodeMatchingClosenessFilter = (nodeId: string): boolean => {
    if (!supportsRelationshipCloseness || closenessFilter === 'ALL' || nodeId === centerId) return true;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || !isClosenessEligibleGroup(node.group)) return false;
    const summary = closenessMap.get(nodeId);
    if (closenessFilter === 'UNASSESSED') {
      return !summary?.hasFinalizedAssessment;
    }
    return Boolean(summary?.hasFinalizedAssessment && summary.rank === closenessFilter);
  };

  // ── Closeness Badge Renderer ──────────────────────────────────────
  const renderClosenessBadge = (node: GraphNode) => {
    if (node.id === centerId || !isClosenessEligibleGroup(node.group)) {
      return null;
    }
    const summary = closenessMap.get(node.id);
    if (isClosenessLoading && !summary) {
      return (
        <span
          style={{
            fontSize: '8px',
            fontWeight: 600,
            color: '#94a3b8',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            padding: '1px 4px',
            borderRadius: '4px',
          }}
        >
          ...
        </span>
      );
    }
    if (summary?.hasFinalizedAssessment && summary.rank && summary.score !== null) {
      const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
        A: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
        B: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
        C: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
        D: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
      };
      const c = badgeColors[summary.rank] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
      return (
        <span
          style={{
            fontSize: '8.5px',
            fontWeight: 800,
            color: c.text,
            background: c.bg,
            border: `1px solid ${c.border}`,
            padding: '1px 5px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            letterSpacing: '0.2px',
          }}
        >
          [{summary.rank} · {summary.score}]
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '8px',
          fontWeight: 600,
          color: '#64748b',
          background: '#f1f5f9',
          border: '1px solid #e2e8f0',
          padding: '1px 5px',
          borderRadius: '4px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        [Chưa đánh giá]
      </span>
    );
  };

  const { positionedNodes, l1NodeIds, l2NodeIds, l2ParentMap } = useMemo(() => {
    if (nodes.length === 0) {
      return { positionedNodes: [], l1NodeIds: new Set<string>(), l2NodeIds: new Set<string>(), l2ParentMap: new Map<string, string>() };
    }

    // Compute levels relative to Owner Company (Level 0)
    const levels = new Map<string, number>();
    levels.set(centerId, 0);

    const l1Ids = new Set<string>();
    edges.forEach(edge => {
      if (edge.from === centerId && edge.to !== centerId) l1Ids.add(edge.to);
      else if (edge.to === centerId && edge.from !== centerId) l1Ids.add(edge.from);
    });
    l1Ids.forEach(id => levels.set(id, 1));

    const l2Ids = new Set<string>();
    edges.forEach(edge => {
      const fromL1 = l1Ids.has(edge.from);
      const toL1 = l1Ids.has(edge.to);
      if (fromL1 && edge.to !== centerId && !l1Ids.has(edge.to)) l2Ids.add(edge.to);
      if (toL1 && edge.from !== centerId && !l1Ids.has(edge.from)) l2Ids.add(edge.from);
    });
    l2Ids.forEach(id => levels.set(id, 2));

    nodes.forEach(n => {
      if (!levels.has(n.id)) levels.set(n.id, 2);
    });

    // Match Level 2 with parent L1
    const parentMap = new Map<string, string>();
    const childrenMap = new Map<string, string[]>();

    edges.forEach(edge => {
      const fromL1 = l1Ids.has(edge.from);
      const toL1 = l1Ids.has(edge.to);
      const toL2 = l2Ids.has(edge.to);
      const fromL2 = l2Ids.has(edge.from);

      if (fromL1 && toL2) {
        if (!parentMap.has(edge.to)) {
          parentMap.set(edge.to, edge.from);
          const c = childrenMap.get(edge.from) || [];
          c.push(edge.to);
          childrenMap.set(edge.from, c);
        }
      } else if (toL1 && fromL2) {
        if (!parentMap.has(edge.from)) {
          parentMap.set(edge.from, edge.to);
          const c = childrenMap.get(edge.to) || [];
          c.push(edge.from);
          childrenMap.set(edge.to, c);
        }
      }
    });

    l2Ids.forEach(id => {
      if (!parentMap.has(id)) {
        const fallback = Array.from(l1Ids)[0];
        if (fallback) {
          parentMap.set(id, fallback);
          const c = childrenMap.get(fallback) || [];
          c.push(id);
          childrenMap.set(fallback, c);
        }
      }
    });

    // Apply Filter Criteria
    const targetGroupKey = FILTER_TO_GROUP_KEY[activeRelationshipGroup];
    const matchedFilters = nodes.filter(n => {
      if (n.id === centerId) return true;
      const matchSearch = !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.industry.toLowerCase().includes(search.toLowerCase());
      const matchGroup = n.group === targetGroupKey;
      const matchHealth = n.healthScore >= minHealth;
      const matchIndustry = industryFilter === 'All' || n.industry === industryFilter;
      return matchSearch && matchGroup && matchHealth && matchIndustry;
    });

    // INCREMENTAL EXPANSION: Filter Level 2 nodes. Only show Level 2 nodes if their parent Level 1 node is expanded.
    let filtered = matchedFilters.filter(node => {
      if (node.id === centerId) return true;
      const level = levels.get(node.id);
      if (level === 1) return true; // Level 1 (Direct) is always visible
      
      if (level === 2) {
        const parentId = parentMap.get(node.id);
        const isParentExpanded = parentId && expandedL1Ids.has(parentId);
        return isParentExpanded; // Show only if L1 parent is expanded
      }
      return false;
    });

    // Apply L2 limit count logic if needed
    const visibleL2Filtered = filtered.filter(n => levels.get(n.id) === 2);
    const maxL2 = 12;
    if (visibleL2Filtered.length > maxL2 && !showAllL2) {
      const sortedL2 = [...visibleL2Filtered].sort((a, b) => {
        const countA = edges.filter(e => e.from === a.id || e.to === a.id).length;
        const countB = edges.filter(e => e.from === b.id || e.to === b.id).length;
        return countB - countA;
      });
      const keepL2 = new Set(sortedL2.slice(0, maxL2).map(n => n.id));
      filtered = filtered.filter(n => {
        if (levels.get(n.id) === 2) return keepL2.has(n.id);
        return true;
      });
    }

    if (layoutMode === 'grid') {
      const itemsPerRow = 5;
      const spacingX = 240;
      const spacingY = 180;
      const startX = 200;
      const startY = 150;

      const sortedNodes = [
        ...filtered.filter(n => n.id === centerId),
        ...filtered.filter(n => levels.get(n.id) === 1),
        ...filtered.filter(n => levels.get(n.id) === 2)
      ];

      const positioned = sortedNodes.map((node, idx) => {
        const row = Math.floor(idx / itemsPerRow);
        const col = idx % itemsPerRow;
        const x = startX + col * spacingX;
        const y = startY + row * spacingY;
        const connCount = edges.filter(e => e.from === node.id || e.to === node.id).length;
        return {
          ...node,
          x,
          y,
          connections: connCount
        };
      });
      return { positionedNodes: positioned, l1NodeIds: l1Ids, l2NodeIds: l2Ids, l2ParentMap: parentMap };
    }

    // Radial layout coordinates calculations (Canvas size 1400x900 responsive center)
    const centerX = SVG_VIEWBOX_WIDTH / 2;
    const centerY = SVG_VIEWBOX_HEIGHT / 2;

    const visibleL1 = filtered.filter(n => levels.get(n.id) === 1);
    const visibleL2 = filtered.filter(n => levels.get(n.id) === 2);
    const N1 = visibleL1.length;

    const positions = new Map<string, { x: number; y: number; angle?: number; radius?: number }>();
    positions.set(centerId, { x: centerX, y: centerY });

    // Level 1 positions using count-aware multi-ring distribution
    const sortedL1 = [...visibleL1].sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.name.localeCompare(b.name);
    });

    const rings = computeRingDistribution(N1);
    let nodeIndex = 0;
    rings.forEach(ring => {
      for (let i = 0; i < ring.count && nodeIndex < sortedL1.length; i++, nodeIndex++) {
        const node = sortedL1[nodeIndex];
        const angle = ring.count > 0 ? (i * 2 * Math.PI) / ring.count - Math.PI / 2 + ring.startAngleOffset : 0;
        const x = centerX + ring.radius * Math.cos(angle);
        const y = centerY + ring.radius * Math.sin(angle);
        positions.set(node.id, { x, y, angle, radius: ring.radius });
      }
    });

    // Level 2 positions fanned around Level 1 parent node
    visibleL2.forEach(node => {
      const parentId = parentMap.get(node.id);
      const parentPos = parentId ? positions.get(parentId) : null;
      const l2Radius = (parentPos?.radius || 280) + 130;
      if (parentPos && parentPos.angle !== undefined) {
        const siblings = visibleL2.filter(n => parentId && parentMap.get(n.id) === parentId);
        const k = siblings.length;
        const idxInSiblings = siblings.findIndex(n => n.id === node.id);
        const spread = k > 1 ? Math.min(0.24, 0.85 / k) : 0;
        const childAngle = parentPos.angle + (idxInSiblings - (k - 1) / 2) * spread;
        const x = centerX + l2Radius * Math.cos(childAngle);
        const y = centerY + l2Radius * Math.sin(childAngle);
        positions.set(node.id, { x, y });
      } else {
        const idx = visibleL2.indexOf(node);
        const angle = visibleL2.length > 0 ? (idx * 2 * Math.PI) / visibleL2.length : 0;
        const x = centerX + l2Radius * Math.cos(angle);
        const y = centerY + l2Radius * Math.sin(angle);
        positions.set(node.id, { x, y });
      }
    });

    const positioned = filtered.map(node => {
      const pos = positions.get(node.id) || { x: centerX, y: centerY };
      const connCount = edges.filter(e => e.from === node.id || e.to === node.id).length;
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        connections: connCount
      };
    });

    return { positionedNodes: positioned, l1NodeIds: l1Ids, l2NodeIds: l2Ids, l2ParentMap: parentMap };
  }, [nodes, edges, centerId, search, activeRelationshipGroup, minHealth, industryFilter, depthFilter, showAllL2, expandedL1Ids, layoutMode]);

  const visibleNodeIds = useMemo(() => new Set(positionedNodes.map(n => n.id)), [positionedNodes]);

  const visibleEdges = useMemo(() => {
    return edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
  }, [edges, visibleNodeIds]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[RelationshipNetwork] relationships after filter:', visibleEdges.length);
    }
  }, [visibleEdges]);

  const visibleL2Nodes = useMemo(() => {
    return positionedNodes.filter(n => l2NodeIds.has(n.id));
  }, [positionedNodes, l2NodeIds]);

  // ── Highlight Path Calculations (Path and direct connections highlighted) ──────
  const activeHighlightId = selectedNode?.id || hoveredNodeId || '';

  const { pathNodes, pathEdges } = useMemo(() => {
    const pNodes = new Set<string>();
    const pEdges = new Set<string>();
    
    if (!activeHighlightId || !centerId) return { pathNodes: pNodes, pathEdges: pEdges };
    
    pNodes.add(centerId);
    pNodes.add(activeHighlightId);

    // Highlight direct edge between Center and Active
    const directEdge = edges.find(e => 
      (e.from === centerId && e.to === activeHighlightId) || 
      (e.from === activeHighlightId && e.to === centerId)
    );
    if (directEdge) pEdges.add(directEdge.id);

    // If active node is Level 2, find the parent L1 node and edges
    const parentId = l2ParentMap.get(activeHighlightId);
    if (parentId) {
      pNodes.add(parentId);
      
      const edgeToParent = edges.find(e => 
        (e.from === activeHighlightId && e.to === parentId) || 
        (e.from === parentId && e.to === activeHighlightId)
      );
      if (edgeToParent) pEdges.add(edgeToParent.id);

      const edgeParentToCenter = edges.find(e => 
        (e.from === parentId && e.to === centerId) || 
        (e.from === centerId && e.to === parentId)
      );
      if (edgeParentToCenter) pEdges.add(edgeParentToCenter.id);
    }

    // Also highlight direct connections (Level 2 children) of the selected node if it's Level 1
    if (l1NodeIds.has(activeHighlightId)) {
      edges.forEach(e => {
        if (e.from === activeHighlightId && e.to !== centerId) {
          pNodes.add(e.to);
          pEdges.add(e.id);
        } else if (e.to === activeHighlightId && e.from !== centerId) {
          pNodes.add(e.from);
          pEdges.add(e.id);
        }
      });
    }

    return { pathNodes: pNodes, pathEdges: pEdges };
  }, [activeHighlightId, edges, centerId, l1NodeIds, l2NodeIds, l2ParentMap]);

  const getNodeOpacity = (nodeId: string) => {
    const matchesCloseness = isNodeMatchingClosenessFilter(nodeId);
    if (!matchesCloseness) return 0.18;

    if (!activeHighlightId) return 1;
    return pathNodes.has(nodeId) ? 1 : 0.15;
  };

  const getEdgeOpacity = (edgeId: string) => {
    const edge = edges.find((e) => e.id === edgeId);
    if (edge) {
      const fromMatches = isNodeMatchingClosenessFilter(edge.from);
      const toMatches = isNodeMatchingClosenessFilter(edge.to);
      if (!fromMatches || !toMatches) return 0.08;
    }

    if (!activeHighlightId) return 0.6;
    return pathEdges.has(edgeId) ? 1 : 0.08;
  };

  // ── Metrics & Sidebar items ───────────────────────────────────────
  const filteredNodes = useMemo(() => {
    const targetGroupKey = FILTER_TO_GROUP_KEY[activeRelationshipGroup];
    return nodes.filter((n) => {
      const matchSearch = !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.industry.toLowerCase().includes(search.toLowerCase());
      const matchGroup = n.group === targetGroupKey;
      const matchHealth = n.healthScore >= minHealth;
      const matchIndustry = industryFilter === 'All' || n.industry === industryFilter;
      return matchSearch && matchGroup && matchHealth && matchIndustry;
    });
  }, [nodes, search, activeRelationshipGroup, minHealth, industryFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(() => {
    return edges.filter((e) => filteredNodeIds.has(e.from) && filteredNodeIds.has(e.to));
  }, [edges, filteredNodeIds]);

  const totalCompanies = filteredNodes.length;
  const totalConnections = filteredEdges.length;
  const totalSharedProjects = filteredNodes.reduce((acc, n) => acc + (n.sharedProjects?.length || 0) + (projectCounts.get(n.id) || 0), 0);
  const riskLinksCount = filteredNodes.filter((n) => n.riskLevel === 'CRITICAL' || n.riskLevel === 'HIGH').length;

  const metrics = useMemo(() => {
    const nonOwnerNodes = nodes.filter(n => n.id !== centerId);
    const connectedCompanies = nonOwnerNodes.length;
    const directRelationships = nodes.filter(n => l1NodeIds.has(n.id)).length;
    const partners = nodes.filter(n => n.id !== centerId && n.group === 'partner').length;
    const customers = nodes.filter(n => n.id !== centerId && n.group === 'customer').length;
    const suppliers = nodes.filter(n => n.id !== centerId && n.group === 'supplier').length;
    const competitors = nodes.filter(n => n.id !== centerId && n.group === 'competitor').length;
    const potentialPartners = nodes.filter(n => n.id !== centerId && n.group === 'potential-partner').length;

    return {
      connectedCompanies,
      directRelationships,
      partners,
      customers,
      suppliers,
      competitors,
      potentialPartners
    };
  }, [nodes, centerId, l1NodeIds]);

  // Dynamic Owner Summary insights
  const networkInsightText = useMemo(() => {
    const l1Partners = new Set(nodes.filter(n => l1NodeIds.has(n.id) && n.group === 'partner').map(n => n.id));
    const partnersCount = l1Partners.size;
    const competitorsList = nodes.filter(n => n.group === 'competitor' && n.id !== centerId);
    
    let sharingCompetitorsCount = 0;
    competitorsList.forEach(comp => {
      const isConnectedToPartner = edges.some(edge => 
        (edge.from === comp.id && l1Partners.has(edge.to)) || 
        (edge.to === comp.id && l1Partners.has(edge.from))
      );
      if (isConnectedToPartner) sharingCompetitorsCount++;
    });

    return t('network.insightText', 'You have {{partnersCount}} direct partners. {{sharingCompetitorsCount}} of your competitors share ecosystem connections with your partners.', { partnersCount, sharingCompetitorsCount });
  }, [nodes, edges, centerId, l1NodeIds, t]);

  const industryOptions = useMemo(() => {
    const set = new Set(nodes.map((n) => n.industry).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [nodes]);

  // Handle Node Click to select company & Expand L2 connections (Incremental Graph Expansion)
  const handleNodeClick = (node: GraphNode) => {
    if (node.id === centerId) return;
    setSelectedNode(prev => prev?.id === node.id ? null : node);

    const level = node.id === centerId ? 0 : (l1NodeIds.has(node.id) ? 1 : 2);
    if (level === 1) {
      setExpandedL1Ids(prev => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id);
        } else {
          next.add(node.id);
        }
        return next;
      });
    }
  };

  const exportNodeDossierCsv = () => {
    if (!selectedNode) return;
    const header = ['Field', 'Value'];
    const rows = [
      ['Entity', selectedNode.name],
      ['Industry', selectedNode.industry],
      ['Relationship Group', selectedNode.group.toUpperCase()],
      ['Health Score', selectedNode.healthScore],
      ['Risk Level', selectedNode.riskLevel],
      ['Connections', selectedNode.connections],
      ['Overview', selectedNode.overview || ''],
      ['AI Recommendation', selectedNode.aiRecommendation || ''],
      ...(selectedNode.contacts || []).map((c, i) => [`Contact ${i + 1}`, `${c.name} · ${c.role} · ${c.email} · ${c.phone}`]),
    ];
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relationship-dossier-${(selectedNode.name || 'entity').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  // ── Owner-Centric Visual Flow & Path Computations ────────────────────────
  const sharedNodes = useMemo(() => {
    if (!selectedNode || !centerId) return [];
    return nodes.filter(n => n.id !== centerId && n.id !== selectedNode.id && 
      edges.some(e => (e.from === centerId && e.to === n.id) || (e.to === centerId && e.from === n.id)) &&
      edges.some(e => (e.from === selectedNode.id && e.to === n.id) || (e.to === selectedNode.id && e.from === n.id))
    );
  }, [selectedNode, centerId, nodes, edges]);

  const sharedNodeNamesText = useMemo(() => {
    if (sharedNodes.length === 0) return '';
    return sharedNodes.map(n => n.name).join(' and ');
  }, [sharedNodes]);

  const whyThisMattersText = useMemo(() => {
    if (!selectedNode) return '';
    const isOwner = selectedNode.id === centerId;
    if (isOwner) return "This is your own company profile representing the focal hub of your business ecosystem.";
    
    const sharedText = sharedNodeNamesText ? ` both companies are connected to ${sharedNodeNamesText}. This creates a shared ecosystem relationship that may influence your competitive strategy.` : ' maintaining alignment secures supply chain integrity and limits market risk.';

    switch (selectedNode.group) {
      case 'competitor':
        return `${selectedNode.name} is a direct competitor of your company in the ${selectedNode.industry || 'IT'} sector. However,${sharedText}`;
      case 'partner':
        return `${selectedNode.name} is a direct partner in your ecosystem. Keeping relationship alignment high secures active collaborative channels and shared projects.`;
      case 'supplier':
        return `${selectedNode.name} acts as a vital supplier. Disruptions or high risk levels here directly threaten operational output stability and SLA delivery timelines.`;
      case 'customer':
        return `${selectedNode.name} is a customer. Maintaining a healthy relationship protects direct revenue streams and uncovers growth/upsell opportunities.`;
      case 'potential-partner':
        return `${selectedNode.name} is a potential partner. Analyzing their ecosystem connections allows for structured, low-risk partnership exploration.`;
      default:
        return `${selectedNode.name} is mapped within your corporate intelligence network. Monitor their status to minimize risk exposure.`;
    }
  }, [selectedNode, centerId, sharedNodeNamesText]);

  const businessImpactData = useMemo(() => {
    if (!selectedNode) return null;
    const isCompetitor = selectedNode.group === 'competitor';
    const isPartner = selectedNode.group === 'partner';
    const isSupplier = selectedNode.group === 'supplier';
    const hasOverlap = sharedNodes.length > 0;

    return {
      competitiveRisk: {
        level: isCompetitor ? 'HIGH' : (selectedNode.group === 'potential-partner' ? 'MEDIUM' : 'LOW'),
        desc: isCompetitor 
          ? `${selectedNode.name} operates in your market space and is classified as a direct competitor.`
          : `${selectedNode.name} does not pose immediate direct market competition.`
      },
      ecosystemOverlap: {
        level: hasOverlap ? 'HIGH' : 'LOW',
        desc: hasOverlap
          ? `Your company and ${selectedNode.name} share Microsoft Vietnam as an ecosystem connection.`
          : `No direct shared partners detected in current mappings.`
      },
      stability: {
        level: selectedNode.healthScore >= 85 ? 'HIGH' : (selectedNode.healthScore >= 72 ? 'MEDIUM' : 'LOW'),
        desc: `Based on a relationship health score of ${selectedNode.healthScore}/100, engagement is stable.`
      },
      opportunity: {
        level: (isPartner || isSupplier) ? 'HIGH' : 'MEDIUM',
        desc: `Shared ecosystem ties present possibilities for strategic alignment or joint value creation.`
      }
    };
  }, [selectedNode, sharedNodes]);

  const renderVisualPathVertical = (node: GraphNode) => {
    const isL1 = l1NodeIds.has(node.id);
    const edgeToNode = edges.find(e => 
      (e.from === centerId && e.to === node.id) || 
      (e.from === node.id && e.to === centerId)
    );
    
    if (isL1) {
      const groupLabel = edgeToNode?.label || RELATIONSHIP_STYLES[node.group]?.label || 'Connection';
      const groupColor = RELATIONSHIP_STYLES[node.group]?.color || '#64748b';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', gap: '4px' }}>
          <div style={{ padding: '6px 14px', background: '#0F172A', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            YOUR COMPANY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '2px', height: '24px', background: groupColor }} />
            <div style={{ background: `${groupColor}12`, color: groupColor, border: `1px solid ${groupColor}40`, padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {groupLabel}
            </div>
            <div style={{ width: '2px', height: '10px', background: groupColor }} />
            <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${groupColor}` }} />
          </div>
          <div style={{ padding: '6px 14px', background: '#ffffff', color: '#0f172a', border: `2px solid ${groupColor}`, borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
            {node.name}
          </div>
        </div>
      );
    }
    
    // Level 2 Node path vertical
    const parentId = l2ParentMap.get(node.id);
    const parentNode = nodes.find(n => n.id === parentId);
    const edge1 = parentId ? edges.find(e => 
      (e.from === centerId && e.to === parentId) || 
      (e.from === parentId && e.to === centerId)
    ) : undefined;
    const edge2 = parentId ? edges.find(e => 
      (e.from === parentId && e.to === node.id) || 
      (e.from === node.id && e.to === parentId)
    ) : undefined;

    const style1 = parentNode ? (RELATIONSHIP_STYLES[parentNode.group] || { color: '#64748b', label: 'Related' }) : { color: '#64748b', label: 'Related' };
    const style2 = RELATIONSHIP_STYLES[node.group] || { color: '#64748b', label: 'Related' };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '14px 0', gap: '4px' }}>
        <div style={{ padding: '6px 14px', background: '#0F172A', color: '#ffffff', borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          YOUR COMPANY
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '2px', height: '20px', background: style1.color }} />
          <div style={{ background: `${style1.color}12`, color: style1.color, border: `1px solid ${style1.color}40`, padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 800 }}>
            {edge1?.label || style1.label}
          </div>
          <div style={{ width: '2px', height: '8px', background: style1.color }} />
          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${style1.color}` }} />
        </div>
        <div style={{ padding: '5px 12px', background: '#ffffff', color: '#0f172a', border: `2px solid ${style1.color}`, borderRadius: '8px', fontWeight: 600, fontSize: '10.5px' }}>
          {parentNode?.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '2px', height: '20px', background: style2.color }} />
          <div style={{ background: `${style2.color}12`, color: style2.color, border: `1px solid ${style2.color}40`, padding: '1px 6px', borderRadius: '4px', fontSize: '8px', fontWeight: 800 }}>
            {edge2?.label || style2.label}
          </div>
          <div style={{ width: '2px', height: '8px', background: style2.color }} />
          <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: `5px solid ${style2.color}` }} />
        </div>
        <div style={{ padding: '6px 14px', background: '#ffffff', color: '#0f172a', border: `2px solid ${style2.color}`, borderRadius: '8px', fontWeight: 700, fontSize: '11px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
          {node.name}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (drawerTab === 'ai-recommend' && selectedNode && !aiRecommendations[selectedNode.id]) {
      const fetchAiRecs = async () => {
        setLoadingAi(true);
        try {
          const res = await api.get<any>(`/graph/companies/${encodeURIComponent(selectedNode.id)}/ai-recommendations`);
          if (res?.data) {
            setAiRecommendations(prev => ({
              ...prev,
              [selectedNode.id]: res.data
            }));
          }
        } catch (err: any) {
          console.error("Failed to fetch AI recommendations:", err);
          window.alert("Lỗi tải AI: " + (err.message || String(err)));
        } finally {
          setLoadingAi(false);
        }
      };
      void fetchAiRecs();
    }
  }, [drawerTab, selectedNode, aiRecommendations]);

  // Render Restored Original 6 Drawer Tabs with Improved Owner-Centric Content
  const renderDrawerTab = () => {
    if (!selectedNode) return null;

    const sharedName = sharedNodeNamesText ? sharedNodeNamesText.split(' and ')[0] : 'Microsoft Vietnam';
    const isComp = selectedNode.group === 'competitor';
    const hasOverlap = sharedNodes.length > 0;

    switch (drawerTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            
            {/* General Info */}
            <div style={{ borderBottom: '1px solid #cbd5e1', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{selectedNode.name}</h3>
                <span style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: RELATIONSHIP_STYLES[selectedNode.group]?.color || '#475569',
                  background: `${RELATIONSHIP_STYLES[selectedNode.group]?.color || '#475569'}15`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                }}>
                  {selectedNode.group}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Industry: <strong>{selectedNode.industry}</strong></div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  Relationship Status: <strong style={{ color: '#10b981' }}>Active</strong>
                </div>
                {setActivePage && (
                  <button
                    onClick={() => {
                      localStorage.setItem('apms-selected-company', selectedNode.id);
                      localStorage.setItem('apms-selected-company-name', selectedNode.name);
                      localStorage.setItem('apms-selected-company-industry', selectedNode.industry || 'Ecosystem Company');
                      setActivePage('company-detail');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    View Full Profile <ArrowRight size={11} />
                  </button>
                )}
              </div>
            </div>



            {/* WHY THIS RELATIONSHIP MATTERS */}
            <div style={{ background: '#f8fafc', borderLeft: '4px solid #3b82f6', padding: '14px', borderRadius: '0 8px 8px 0', fontSize: '12.5px', lineHeight: '20px' }}>
              <strong style={{ display: 'block', marginBottom: '6px', color: '#0f172a', fontSize: '11.5px', fontWeight: 800, letterSpacing: '0.05em' }}>
                WHY THIS RELATIONSHIP MATTERS
              </strong>
              <div style={{ color: '#334155' }}>
                {whyThisMattersText}
              </div>
            </div>

            {/* NETWORK CONNECTIONS */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <h4 style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('drawer.networkConnections', 'Network Connections')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(() => {
                  const nodeEdges = edges.filter(e => e.from === selectedNode.id || e.to === selectedNode.id);
                  const validEdges = nodeEdges.filter(e => {
                    const otherId = e.from === selectedNode.id ? e.to : e.from;
                    return otherId !== centerId;
                  });
                  if (validEdges.length === 0) {
                    return <span style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.noConnectionsMapped', 'No connections mapped.')}</span>;
                  }
                  return validEdges.map(edge => {
                    const otherId = edge.from === selectedNode.id ? edge.to : edge.from;
                    const otherNode = nodes.find(n => n.id === otherId);
                    if (!otherNode) return null;

                    const style = RELATIONSHIP_STYLES[edge.group] || { label: 'connection' };
                    const isConnectedToOwner = edges.find(e => 
                      (e.from === centerId && e.to === otherId) || 
                      (e.from === otherId && e.to === centerId)
                    );
                    const ownerRelStyle = isConnectedToOwner ? (RELATIONSHIP_STYLES[isConnectedToOwner.group] || { label: 'related' }) : null;

                    return (
                      <div key={edge.id} style={{ fontSize: '12px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                        <strong style={{ color: '#0f172a' }}>{otherNode.name}</strong>
                        <div style={{ color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                          <span>→ {getGroupLabel(edge.group)} {t('drawer.with', 'with')} {selectedNode.name}</span>
                          <span>|</span>
                          <span>
                            {isConnectedToOwner 
                              ? `→ ${getGroupLabel(isConnectedToOwner.group)} ${t('drawer.withYourCompany', 'with Your Company')}` 
                              : `→ ${t('drawer.noDirectRelationship', 'No direct relationship with Your Company')}`}
                          </span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

          </div>
        );

      case 'strength':
        if (!businessImpactData) return null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.relationshipAssessment', 'Relationship Assessment')}
            </h4>

            {/* Assessment Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.relationshipType', 'Relationship Type')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a', marginTop: '2px', textTransform: 'uppercase' }}>
                  {getGroupLabel(selectedNode.group)}
                </strong>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.relationshipStatus', 'Relationship Status')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#10b981', marginTop: '2px' }}>
                  {t('priority.active', 'ACTIVE')}
                </strong>
              </div>

              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.businessRisk', 'Business Risk')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: businessImpactData.competitiveRisk.level === 'HIGH' ? '#ef4444' : '#64748b', marginTop: '2px' }}>
                  {businessImpactData.competitiveRisk.level}
                </strong>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>{t('drawer.networkImpact', 'Network Impact')}</span>
                <strong style={{ display: 'block', fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
                  {businessImpactData.opportunity.level}
                </strong>
              </div>
            </div>

            {/* Explanatory breakdown */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{t('drawer.assessmentRationale', 'Assessment Rationale')}</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#475569' }}>
                <div>• {t('drawer.typeDirect', 'Type: Direct relationship')}</div>
                <div>• {t('drawer.industryCoverage', 'Industry coverage:')} {selectedNode.industry}</div>
                {hasOverlap ? (
                  <div>• {t('drawer.sharedEcosystemPartners', 'Shared ecosystem partners:')} {sharedNodeNamesText}</div>
                ) : (
                  <div>• {t('drawer.noDirectSharedPartners', 'No direct shared partners detected in map')}</div>
                )}
                <div>• {t('drawer.operationalStatusSync', 'Operational status: Active database sync')}</div>
              </div>
            </div>

          </div>
        );

      case 'projects':
        const directProjects = [
          ...(selectedNode.sharedProjects || []),
          ...Array.from({ length: projectCounts.get(selectedNode.id) || 0 }).map((_, i) => ({
            name: `Joint Integration Project Phase ${i + 1}`,
            status: i % 2 === 0 ? 'ACTIVE' : 'COMPLETED',
            progress: i % 2 === 0 ? 65 : 100,
            due: `2026-12-${10 + i * 5}`
          }))
        ];

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.sharedProjects', 'Shared Projects')}
            </h4>

            {directProjects.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {directProjects.map((p, idx) => (
                  <div key={idx} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{p.name}</strong>
                      <span style={{ fontSize: '9px', fontWeight: 800, color: p.status === 'ACTIVE' ? '#2563eb' : '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px' }}>
                        {p.status === 'ACTIVE' ? t('priority.active', 'ACTIVE') : t('priority.inactive', 'COMPLETED')}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Target Completion: {p.due}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Relationship Impact: <strong style={{ color: '#0f172a' }}>Strengthens direct business engagement</strong>
                    </div>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '8px' }}>
                      <div style={{ width: `${p.progress}%`, height: '100%', background: '#2563eb', borderRadius: '2px' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', border: '1px dashed #cbd5e1', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '10px' }}>{t('drawer.noSharedProjects', 'No direct shared projects.')}</span>
                
                {hasOverlap && (
                  <div style={{ fontSize: '11.5px', color: '#475569', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    <strong>{t('drawer.ecosystemProjectPotential', 'Ecosystem Project Potential:')}</strong> Ecosystem project involving {sharedName}, which is connected to both companies.
                  </div>
                )}
              </div>
            )}

          </div>
        );

      case 'contacts':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.relationshipContacts', 'Relationship Contacts')}
            </h4>

            {(() => {
              const contacts = selectedNode.contacts || [];
              if (contacts.length === 0) {
                return <p style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.noContactsListed', 'No contacts listed.')}</p>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {contacts.map((cnt, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}>
                      <strong style={{ fontSize: '13px', color: '#0f172a', display: 'block' }}>{cnt.name}</strong>
                      <div style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 6px' }}>{cnt.role} - {selectedNode.name}</div>
                      
                      <div style={{ fontSize: '11px', color: '#475569' }}>
                        <div style={{ marginTop: '4px', paddingTop: '4px' }}>
                          Email: <a href={`mailto:${cnt.email}`} style={{ color: '#2563eb' }}>{cnt.email}</a> • Phone: {cnt.phone}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );

      case 'meetings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.meetingsHistory', 'Meetings History')}
            </h4>
            {(() => {
              const meetings = selectedNode.meetings || [];
              if (meetings.length === 0) {
                return <p style={{ fontSize: '12px', color: '#64748b' }}>Không có lịch họp nào.</p>;
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {meetings.map((mtg, i) => (
                    <div key={i} style={{ padding: '12px', border: '1px solid #cbd5e1', borderRadius: '10px', background: '#ffffff' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>{mtg.date}</span>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', margin: '3px 0 6px' }}>
                        {mtg.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: '18px' }}>
                        {mtg.notes}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        );

      case 'ai-recommend': {
        if (loadingAi) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '16px', color: '#64748b' }}>
              <div className="cds--loading" style={{ width: '40px', height: '40px', border: '3px solid #cbd5e1', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Vui lòng đợi, AI đang phân tích mạng lưới...</div>
              <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
              `}</style>
            </div>
          );
        }

        const aiData = aiRecommendations[selectedNode.id];
        if (!aiData) {
          return (
            <div style={{ padding: '20px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
              Không thể tải dữ liệu AI tại thời điểm này.
            </div>
          );
        }

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', color: '#1e293b' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {t('drawer.aiRecommendationsTitle', 'Prescriptive AI Recommendations')}
            </h4>

            {/* HIGH PRIORITY */}
            {aiData.highPriority && (
              <div style={{ border: '1px solid #fee2e2', borderRadius: '10px', padding: '14px', background: '#fff5f5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertCircle size={14} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, background: '#ef4444', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    {t('drawer.highPriority', 'HIGH PRIORITY')}
                  </span>
                </div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>
                  {aiData.highPriority.title}
                </strong>
                
                <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '18px', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 700 }}>WHY:</div>
                  <div style={{ marginTop: '2px' }}>{aiData.highPriority.reason}</div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>EVIDENCE:</div>
                  <div style={{ marginTop: '2px' }}>{aiData.highPriority.evidence}</div>
                </div>

                <div style={{ fontSize: '12px', color: '#7f1d1d', lineHeight: '18px', marginBottom: '12px' }}>
                  <strong>RECOMMENDED ACTION:</strong> {aiData.highPriority.action}
                </div>
              </div>
            )}

            {/* MEDIUM PRIORITY */}
            {aiData.mediumPriority && (
              <div style={{ border: '1px solid #fef3c7', borderRadius: '10px', padding: '14px', background: '#fffbeb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle size={14} style={{ color: '#d97706' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, background: '#d97706', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    MEDIUM PRIORITY
                  </span>
                </div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#92400e', marginBottom: '4px' }}>
                  {aiData.mediumPriority.title}
                </strong>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#78350f', lineHeight: '18px' }}>
                  {aiData.mediumPriority.reason} {aiData.mediumPriority.evidence}
                </p>
                <div style={{ fontSize: '12px', color: '#78350f', lineHeight: '18px' }}>
                  <strong>RECOMMENDED ACTION:</strong> {aiData.mediumPriority.action}
                </div>
              </div>
            )}

            {/* OPPORTUNITY */}
            {aiData.opportunity && (
              <div style={{ border: '1px solid #dcfce7', borderRadius: '10px', padding: '14px', background: '#f0fdf4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                  <span style={{ fontSize: '9px', fontWeight: 900, background: '#16a34a', color: '#ffffff', padding: '1px 6px', borderRadius: '10px' }}>
                    OPPORTUNITY
                  </span>
                </div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#166534', marginBottom: '4px' }}>
                  {aiData.opportunity.title}
                </strong>
                <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#14532d', lineHeight: '18px' }}>
                  {aiData.opportunity.reason} {aiData.opportunity.evidence}
                </p>
                <div style={{ fontSize: '12px', color: '#14532d', lineHeight: '18px' }}>
                  <strong>RECOMMENDED ACTION:</strong> {aiData.opportunity.action}
                </div>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Canvas Mouse Panning
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    if (target.tagName === 'svg' || target.id === 'graph-bg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ── Main Shell Render ────────────────────────────────────────────
  return (
    <div className="cds-page-shell" id="page-relationship-map">
      
      {/* 1. Page Header */}
      <PageHeader
        title={t('title', 'Dashboard')}
      />

      {/* 2. Top KPI Cards and Owner Summary Banner */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', background: '#ffffff', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
        
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.directRelationships', 'Direct Relationships')}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{metrics.directRelationships}</div>
          </div>
          <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.ecosystemCompanies', 'Ecosystem Companies')}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{metrics.connectedCompanies}</div>
          </div>
          <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.partners', 'Partners')}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>{metrics.partners}</div>
          </div>
          <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.customers', 'Customers')}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563EB', marginTop: '2px' }}>{metrics.customers}</div>
          </div>
          <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.suppliers', 'Suppliers')}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#F59E0B', marginTop: '2px' }}>{metrics.suppliers}</div>
          </div>
          <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('stats.competitors', 'Competitors')}</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#EF4444', marginTop: '2px' }}>{metrics.competitors}</div>
          </div>
        </div>

      </div>

      {/* 3. 2-Column Operations Layout: Center Graph Redesign (Stretched) | Right Analytics */}
      <div className="relationship-map-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '14px', alignItems: 'start', marginBottom: '16px' }}>
        
        {/* CENTER: REDESIGNED Circular Level Network panel */}
        <div className="relationship-network-panel" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', position: 'relative', minWidth: 0 }}>
          <div style={{ marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>{t('network.title', 'Relationship Network')}</h3>
          </div>

          {/* Local Toolbar above Graph Canvas */}
          <div 
            style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              gap: '8px', 
              marginBottom: '12px', 
              paddingBottom: '10px', 
              borderBottom: '1px solid var(--cds-border-subtle-00, #cbd5e1)' 
            }}
          >
            {/* Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '150px' }}>
                <Search style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={13} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('filters.searchPlaceholder', 'Search...')}
                  style={{
                    width: '100%',
                    padding: '4px 6px 4px 24px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid var(--cds-border-color, #cbd5e1)',
                    background: 'var(--cds-layer-01, #f8fafc)',
                    color: 'var(--cds-text-primary, #1e293b)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <select
                value={industryFilter}
                onChange={e => setIndustryFilter(e.target.value)}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--cds-border-color, #cbd5e1)',
                  background: 'var(--cds-layer-01, #f8fafc)',
                  color: 'var(--cds-text-primary, #1e293b)',
                  cursor: 'pointer',
                }}
              >
                {industryOptions.map((ind) => (
                  <option key={ind} value={ind}>{ind === 'All' ? t('filters.allIndustries', 'All Industries') : ind}</option>
                ))}
              </select>

              {supportsRelationshipCloseness && (
                <select
                  value={closenessFilter}
                  onChange={e => setClosenessFilter(e.target.value as any)}
                  style={{
                    padding: '4px 6px',
                    fontSize: '11px',
                    borderRadius: '4px',
                    border: '1px solid var(--cds-border-color, #cbd5e1)',
                    background: 'var(--cds-layer-01, #f8fafc)',
                    color: 'var(--cds-text-primary, #1e293b)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Closeness</option>
                  <option value="A">Rank A (Rất thân thiết)</option>
                  <option value="B">Rank B (Thân thiết)</option>
                  <option value="C">Rank C (Trung bình)</option>
                  <option value="D">Rank D (Xã giao)</option>
                  <option value="UNASSESSED">Chưa đánh giá</option>
                </select>
              )}
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setSelectedNode(null);
                  setSearch('');
                  setActiveRelationshipGroup('PARTNER');
                  setMinHealth(0);
                  setIndustryFilter('All');
                  setClosenessFilter('ALL');
                  setShowAllL2(false);
                  setExpandedL1Ids(new Set());
                  setHoveredNodeId(null);
                  setTooltipNode(null);
                  setTooltipPos(null);
                }}
                style={{
                  padding: '4px 6px',
                  fontSize: '11px',
                  borderRadius: '4px',
                  border: '1px solid var(--cds-border-color, #cbd5e1)',
                  background: '#ffffff',
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RotateCcw size={11} />
                {t('network.reset', 'Reset')}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--cds-border-color, #cbd5e1)', borderRadius: '4px', overflow: 'hidden', background: '#ffffff' }}>
                <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} style={{ width: '22px', height: '20px', border: 0, background: 'transparent', borderRight: '1px solid var(--cds-border-color, #cbd5e1)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Minus size={11} />
                </button>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '0 4px', color: '#475569', minWidth: '26px', textAlign: 'center', userSelect: 'none' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} style={{ width: '22px', height: '20px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <Plus size={11} />
                </button>
              </div>
            </div>
          </div>

          {/* Relationship Type Toggle Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              flexWrap: 'wrap',
            }}
          >
            {TOGGLE_GROUPS_CONFIG.map((item) => {
              const isActive = activeRelationshipGroup === item.key;
              const count = groupCounts[item.key];
              const label = t(item.labelKey, item.defaultLabel);

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleSelectRelationshipGroup(item.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    border: isActive ? `2px solid ${item.activeBorder}` : '1px solid var(--cds-border-color, #cbd5e1)',
                    background: isActive ? item.activeBg : '#ffffff',
                    color: isActive ? item.activeText : '#475569',
                    fontWeight: isActive ? 700 : 500,
                    boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{label}</span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: '10px',
                      background: isActive ? item.color : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#64748b',
                      lineHeight: 1.3,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Graph Canvas Container (Widened to 1400 viewbox and Heightened to 680px) */}
          <div ref={canvasContainerRef} className="relationship-network-canvas" style={{ width: '100%', minHeight: '680px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--cds-border-subtle-00)', overflow: 'hidden', position: 'relative' }}>
            {loadError ? (
              <div style={{ minHeight: '680px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div><AlertCircle size={36} style={{ color: '#dc2626', marginBottom: '12px' }} /><strong style={{ display: 'block', fontSize: '14px', color: '#991b1b' }}>Không thể tải dữ liệu mạng lưới quan hệ.</strong><span style={{ fontSize: '12px', color: '#64748b' }}>{loadError}</span></div>
              </div>
            ) : edges.length === 0 ? (
              <div style={{ minHeight: '680px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div>
                  <Building size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>Chưa có dữ liệu quan hệ doanh nghiệp.</strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Chưa có quan hệ hợp lệ để hiển thị trong mạng lưới.</span>
                </div>
              </div>
            ) : positionedNodes.length === 0 ? (
              <div style={{ minHeight: '680px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div>
                  <Search size={36} style={{ color: '#94a3b8', marginBottom: '12px' }} />
                  <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>Không có quan hệ phù hợp với bộ lọc hiện tại.</strong>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Hãy điều chỉnh bộ lọc hoặc chọn Reset để xem toàn bộ mạng lưới.</span>
                </div>
              </div>
            ) : (
              <>
                <svg
                  viewBox="0 0 1400 900"
                  role="img"
                  aria-label={t('network.ariaLabel', 'Business relationship network')}
                  style={{ width: '100%', height: '680px', display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <rect id="graph-bg" width="1400" height="900" fill="transparent" />

                  {/* SVG marker definitions for arrows */}
                  <defs>
                    {Object.entries(RELATIONSHIP_STYLES).map(([key, style]) => (
                      <marker
                        key={key}
                        id={`arrow-${key}`}
                        viewBox="0 0 10 10"
                        refX={6}
                        refY={5}
                        markerWidth={5}
                        markerHeight={5}
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={style.color} />
                      </marker>
                    ))}
                  </defs>

                  <g 
                    transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} 
                    style={{ transformOrigin: 'center', transition: isDragging ? 'none' : 'transform 150ms ease-out' }}
                  >
                    
                    {/* Render curved edge lines */}
                    {visibleEdges.map(edge => {
                      const posA = positionedNodes.find(n => n.id === edge.from);
                      const posB = positionedNodes.find(n => n.id === edge.to);
                      if (!posA || !posB) return null;

                      const xa = posA.x;
                      const ya = posA.y;
                      const xb = posB.x;
                      const yb = posB.y;

                      const D = Math.hypot(xb - xa, yb - ya);
                      if (D === 0) return null;

                      const dx = (xb - xa) / D;
                      const dy = (yb - ya) / D;

                      const levelA = posA.id === centerId ? 0 : (l1NodeIds.has(posA.id) ? 1 : 2);
                      const levelB = posB.id === centerId ? 0 : (l1NodeIds.has(posB.id) ? 1 : 2);

                      const getRectPadding = (level: number, dx: number, dy: number, isTarget: boolean) => {
                        const width = level === 0 ? 220 : (level === 1 ? 170 : 150);
                        const height = level === 0 ? 80 : (level === 1 ? 64 : 54);
                        // Add some gap so arrow doesn't overlap text/border
                        const gap = isTarget ? 12 : 0; 
                        const tx = (width / 2 + gap) / (Math.abs(dx) || 0.001);
                        const ty = (height / 2 + gap) / (Math.abs(dy) || 0.001);
                        return Math.min(tx, ty);
                      };

                      const paddingA = Math.min(getRectPadding(levelA, dx, dy, false), D * 0.45);
                      const paddingB = Math.min(getRectPadding(levelB, dx, dy, true), D * 0.45);

                      const xStart = xa + dx * paddingA;
                      const yStart = ya + dy * paddingA;
                      const xEnd = xb - dx * paddingB;
                      const yEnd = yb - dy * paddingB;

                      const isCenterConnection = levelA === 0 || levelB === 0;
                      const bend = isCenterConnection ? 25 : 15;
                      const { path, cx, cy } = getCurvePath(xStart, yStart, xEnd, yEnd, bend);
                      
                      const isPathActive = pathEdges.has(edge.id);
                      const edgeOpacity = getEdgeOpacity(edge.id);
                      const labelWidth = edge.label.length * 6 + 12;

                      return (
                        <g key={edge.id}>
                          <path
                            d={path}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={12}
                            style={{ cursor: 'pointer' }}
                          />
                          <path
                            d={path}
                            fill="none"
                            stroke={edge.color}
                            strokeWidth={isPathActive ? 3 : 1.5}
                            strokeDasharray={edge.dashed ? '4 3' : undefined}
                            markerEnd={`url(#arrow-${edge.group})`}
                            opacity={edgeOpacity}
                            style={{ transition: 'opacity 200ms ease, stroke-width 200ms ease' }}
                          />
                          {/* Label badge */}
                          <g transform={`translate(${cx}, ${cy})`} opacity={edgeOpacity} style={{ transition: 'opacity 200ms ease' }}>
                            <rect
                              x={-labelWidth / 2}
                              y={-9}
                              width={labelWidth}
                              height={18}
                              rx={9}
                              fill="#ffffff"
                              stroke={edge.color}
                              strokeWidth={1}
                              style={{ filter: 'drop-shadow(0 1px 2px rgba(15,23,42,0.06))' }}
                            />
                            <text
                              x={0}
                              y={3}
                              textAnchor="middle"
                              fill={edge.color}
                              fontSize={8.5}
                              fontWeight={800}
                              style={{ userSelect: 'none' }}
                            >
                              {edge.label}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Render node cards (NO FABRICATED HEALTH SCORES DISPLAYED) */}
                    {positionedNodes.map(node => {
                      const level = node.id === centerId ? 0 : (l1NodeIds.has(node.id) ? 1 : 2);
                      const isOwner = level === 0;
                      const style = RELATIONSHIP_STYLES[node.group] || { color: '#64748b', label: 'Related' };
                      
                      const width = isOwner ? 220 : (level === 1 ? 170 : 150);
                      const height = isOwner ? 80 : (level === 1 ? 64 : 54);
                      
                      const opacity = getNodeOpacity(node.id);
                      const isSelected = selectedNode?.id === node.id;
                      const isHovered = hoveredNodeId === node.id;

                      const isExpandedL1 = level === 1 && expandedL1Ids.has(node.id);

                      return (
                        <foreignObject
                          key={node.id}
                          x={node.x - width / 2}
                          y={node.y - height / 2}
                          width={width}
                          height={height}
                          style={{
                            opacity,
                            cursor: isOwner ? 'default' : 'pointer',
                            overflow: 'visible'
                          }}
                        >
                          {isOwner ? (
                            // OWNER CENTER NODE
                            <div
                              onClick={() => handleNodeClick(node)}
                              onMouseEnter={() => setHoveredNodeId(node.id)}
                              onMouseLeave={() => setHoveredNodeId(null)}
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#0f172a', // Slate 900
                                color: '#ffffff',
                                borderRadius: '12px',
                                border: '2px solid #3b82f6',
                                boxShadow: isSelected 
                                  ? '0 0 16px 4px rgba(59, 130, 246, 0.45)' 
                                  : '0 5px 12px rgba(15, 23, 42, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px 14px',
                                boxSizing: 'border-box',
                                gap: '10px',
                                transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
                                transition: 'transform 150ms ease, box-shadow 150ms ease',
                              }}
                            >
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: 'rgba(59, 130, 246, 0.2)',
                                  display: 'grid',
                                  placeItems: 'center',
                                  color: '#60a5fa',
                                  flexShrink: 0,
                                }}
                              >
                                <Building size={16} />
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#60a5fa', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                                  YOUR COMPANY
                                </span>
                                <strong style={{ fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#ffffff' }}>
                                  {node.name}
                                </strong>
                                <span style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '1.5px' }}>
                                  {metrics.directRelationships} Connections
                                </span>
                              </div>
                            </div>
                          ) : (
                            // REGULAR TIERS: Level 1 and Level 2 (No fabricated scores)
                            <div
                              onClick={() => handleNodeClick(node)}
                              onMouseEnter={(e) => {
                                setHoveredNodeId(node.id);
                                handleNodeMouseEnter(node, e);
                              }}
                              onMouseLeave={() => {
                                setHoveredNodeId(null);
                                handleNodeMouseLeave();
                              }}
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#ffffff',
                                borderRadius: level === 1 ? '10px' : '8px',
                                border: `2px solid ${level === 1 ? style.color : (isSelected ? style.color : '#e2e8f0')}`,
                                boxShadow: isSelected 
                                  ? '0 0 0 3px rgba(37, 99, 235, 0.22), 0 4px 12px rgba(15, 23, 42, 0.12)' 
                                  : (isHovered ? '0 4px 12px rgba(15, 23, 42, 0.08)' : '0 2px 6px rgba(15, 23, 42, 0.02)'),
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                padding: level === 1 ? '8px 12px' : '6px 10px',
                                boxSizing: 'border-box',
                                transform: isHovered || isSelected ? 'scale(1.03)' : 'scale(1)',
                                transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
                              }}
                            >
                              <strong
                                style={{
                                  display: 'block',
                                  fontSize: level === 1 ? '11px' : '10px',
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  marginBottom: level === 1 ? '4px' : '2px',
                                }}
                              >
                                {node.name}
                              </strong>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', minWidth: 0 }}>
                                {level === 1 ? (
                                  <span
                                    style={{
                                      fontSize: '8px',
                                      fontWeight: 800,
                                      color: style.color,
                                      background: `${style.color}15`,
                                      padding: '1px 6px',
                                      borderRadius: '999px',
                                      textTransform: 'uppercase',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {getGroupLabel(node.group)} {isExpandedL1 ? `• ${t('network.expanded', 'Expanded')}` : ''}
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '8.5px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: style.color }} />
                                    {t('network.level2', 'Level 2')}
                                  </span>
                                )}

                                {renderClosenessBadge(node)}
                                
                                <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                                  {node.connections} {t('topographyAnalytics.links', 'links')}
                                </span>
                              </div>
                            </div>
                          )}
                        </foreignObject>
                      );
                    })}

                  </g>
                </svg>

                {/* SVG legend overlay */}
                <div style={{ position: 'absolute', left: '12px', bottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '7px 9px', border: '1px solid #dbe3ef', borderRadius: '5px', background: 'rgba(255,255,255,.95)', fontSize: '11px', color: '#475569', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
                  {(['partner', 'competitor', 'supplier', 'customer', 'potential-partner'] as const).map((group) => (
                    <span key={group} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <i style={{ width: '7px', height: '7px', borderRadius: '50%', background: RELATIONSHIP_STYLES[group].color }} />
                      {getGroupLabel(group)}
                    </span>
                  ))}
                </div>

                {/* Visible Level 2 limit count notifier */}
                {depthFilter === '2nd-degree' && visibleL2Nodes.length > 12 && !showAllL2 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #cbd5e1',
                      boxShadow: '0 3px 8px rgba(0, 0, 0, 0.05)',
                      fontSize: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#475569',
                    }}
                  >
                    <span>{t('network.showingL2', 'Showing 12 of {{total}} second-degree connections', { total: visibleL2Nodes.length })}</span>
                    <button
                      onClick={() => setShowAllL2(true)}
                      style={{
                        border: 0,
                        background: 'none',
                        color: '#2563eb',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {t('network.showAll', 'Show all')}
                    </button>
                  </div>
                )}

                {/* Empty state for active relationship group (Correction 7) */}
                {positionedNodes.filter(n => n.id !== centerId).length === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '24px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '10px 20px',
                      background: 'rgba(255, 255, 255, 0.96)',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12.5px',
                      color: '#334155',
                      zIndex: 10,
                      pointerEvents: 'none',
                    }}
                  >
                    <Building size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                    <span>
                      {groupCounts[activeRelationshipGroup] === 0
                        ? `Chưa có doanh nghiệp thuộc nhóm ${getGroupFilterLabel(activeRelationshipGroup)}.`
                        : 'Không có doanh nghiệp phù hợp với bộ lọc hiện tại.'}
                    </span>
                  </div>
                )}

                {/* Ultra-Compact Hover Tooltip (Short Delays, Score/Rank Only, No Buttons) */}
                {tooltipNode && tooltipPos && (() => {
                  const summary = closenessMap.get(tooltipNode.id);
                  const isAssessed = Boolean(summary?.hasFinalizedAssessment && summary.score !== null);

                  const canvasW = canvasContainerRef.current?.clientWidth || 800;
                  const canvasH = canvasContainerRef.current?.clientHeight || 680;
                  const tooltipW = 180;
                  const left = Math.max(tooltipW / 2 + 8, Math.min(canvasW - tooltipW / 2 - 8, tooltipPos.left));
                  const top = (tooltipPos.top + 50 > canvasH) ? Math.max(10, tooltipPos.top - 55) : tooltipPos.top;

                  return (
                    <div
                      style={{
                        position: 'absolute',
                        top: `${top}px`,
                        left: `${left}px`,
                        transform: 'translateX(-50%)',
                        zIndex: 1000,
                        width: `${tooltipW}px`,
                        background: '#0f172a',
                        color: '#ffffff',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                        pointerEvents: 'none',
                        textAlign: 'center',
                        lineHeight: 1.35,
                      }}
                    >
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tooltipNode.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: isAssessed ? '#86efac' : '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                        {isAssessed && summary
                          ? `${summary.score} / 100 · Rank ${summary.rank}`
                          : t('closeness.unassessed', 'Chưa đánh giá')}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: Topography Analytics (Default) OR Company Relationship Summary (Selected) */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedNode ? (
            /* ========================================================================= */
            /* SELECTED COMPANY MODE                                                     */
            /* ========================================================================= */
            (() => {
              const isEligible = isClosenessEligibleGroup(selectedNode.group);
              const summary = closenessMap.get(selectedNode.id);
              const isAssessed = Boolean(isEligible && summary?.hasFinalizedAssessment && summary.score !== null);
              const groupColor = RELATIONSHIP_STYLES[selectedNode.group]?.color || '#475569';
              const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
                A: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
                B: { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
                C: { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
                D: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
              };
              const rankStyle = summary?.rank ? (badgeColors[summary.rank] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }) : null;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Top Bar: Back Action & Close */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--cds-border-subtle-00)', paddingBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        padding: '2px 0',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: '#2563eb',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      ← {t('sidebar.backToOverview', 'Tổng quan')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      style={{
                        border: 'none',
                        background: '#f1f5f9',
                        color: '#64748b',
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                      title={t('common.close', 'Đóng')}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Company Header */}
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                      {selectedNode.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        {selectedNode.industry || '—'}
                      </span>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: groupColor,
                          background: `${groupColor}15`,
                          border: `1px solid ${groupColor}40`,
                          borderRadius: '12px',
                          padding: '2px 7px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {getGroupLabel(selectedNode.group)}
                      </span>
                    </div>
                  </div>

                  {/* Closeness Section */}
                  <div style={{ borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '10px' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.4px', marginBottom: '8px' }}>
                      {t('closeness.headerTitle', 'Mức độ thân thiết')}
                    </div>

                    {!isEligible ? (
                      /* Ineligible (Competitor / Potential Partner) */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          {t('closeness.notApplicable', 'Không áp dụng cho loại quan hệ này.')}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = `#company-detail?companyId=${encodeURIComponent(selectedNode.id)}&tab=overview`;
                            if (setActivePage) setActivePage('company-detail');
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '5px',
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {t('closeness.viewProfile', 'Xem hồ sơ')} →
                        </button>
                      </div>
                    ) : isAssessed && summary ? (
                      /* Eligible & Finalized */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {/* Score & Rank */}
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                              {summary.score}
                            </span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>/ 100</span>
                          </div>
                          {rankStyle && (
                            <div style={{ marginTop: '4px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  color: rankStyle.text,
                                  background: rankStyle.bg,
                                  border: `1px solid ${rankStyle.border}`,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  display: 'inline-block',
                                }}
                              >
                                Rank {summary.rank}
                              </span>
                              {summary.rankDescription && (
                                <div style={{ fontSize: '11px', color: '#475569', marginTop: '4px', fontWeight: 500 }}>
                                  {summary.rankDescription}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 6 Criteria Grid */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                            {t('closeness.criteriaBreakdown', 'Tiêu chí đánh giá')}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontSize: '11px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Commercial</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.commercial ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Interaction</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.interaction ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Strategic</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.strategic ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Network</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.network ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', borderBottom: '1px solid #f1f5f9' }}>
                              <span style={{ color: '#64748b' }}>Engagement</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.engagement ?? '—'} / 5</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                              <span style={{ color: '#64748b' }}>Trust & Reliability</span>
                              <strong style={{ color: '#0f172a' }}>{summary.criteria?.trust ?? '—'} / 5</strong>
                            </div>
                          </div>
                        </div>

                        {/* Last Assessment Date */}
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          <span>{t('closeness.lastAssessment', 'Đánh giá gần nhất:')} </span>
                          <strong style={{ color: '#334155' }}>{formatDate(summary.completedAt) || '—'}</strong>
                        </div>

                        {/* CTAs (Correction 3: Xem đánh giá & Xem hồ sơ) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = `#company-detail?companyId=${encodeURIComponent(selectedNode.id)}&tab=relationship-closeness`;
                              if (setActivePage) setActivePage('company-detail');
                            }}
                            style={{
                              width: '100%',
                              padding: '7px 10px',
                              borderRadius: '5px',
                              background: '#2563eb',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                            }}
                          >
                            {t('closeness.viewAssessment', 'Xem đánh giá')} →
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              window.location.hash = `#company-detail?companyId=${encodeURIComponent(selectedNode.id)}&tab=overview`;
                              if (setActivePage) setActivePage('company-detail');
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              borderRadius: '5px',
                              background: '#ffffff',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              textAlign: 'center',
                            }}
                          >
                            {t('closeness.viewProfile', 'Xem hồ sơ')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Eligible & Unassessed */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '2px' }}>
                            {t('closeness.notAssessedYet', 'Chưa có đánh giá chính thức.')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {t('closeness.unassessedDesc', 'Doanh nghiệp này chưa được đánh giá mức độ thân thiết.')}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            window.location.hash = `#company-detail?companyId=${encodeURIComponent(selectedNode.id)}&tab=overview`;
                            if (setActivePage) setActivePage('company-detail');
                          }}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '5px',
                            background: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {t('closeness.viewProfile', 'Xem hồ sơ')} →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            /* ========================================================================= */
            /* DEFAULT ECOSYSTEM ANALYTICS MODE                                          */
            /* ========================================================================= */
            <>
              <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
                {t('topographyAnalytics.title', 'Topography Analytics')}
              </h3>

              {/* Cluster Breakdown */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '8px' }}>
                  {t('topographyAnalytics.ecosystemClusters', 'Ecosystem Clusters')}
                </div>
                {[
                  { key: 'PARTNER' as RelationshipGroupFilter, label: t('stats.partners', 'Partners'), count: metrics.partners, color: '#10B981' },
                  { key: 'SUPPLIER' as RelationshipGroupFilter, label: t('stats.suppliers', 'Suppliers'), count: metrics.suppliers, color: '#F59E0B' },
                  { key: 'COMPETITOR' as RelationshipGroupFilter, label: t('stats.competitors', 'Competitors'), count: metrics.competitors, color: '#EF4444' },
                  { key: 'CUSTOMER' as RelationshipGroupFilter, label: t('stats.customers', 'Customers'), count: metrics.customers, color: '#2563EB' },
                  { key: 'POTENTIAL_PARTNER' as RelationshipGroupFilter, label: t('stats.potentialPartners', 'Potential Partners'), count: metrics.potentialPartners, color: '#8B5CF6' },
                ].map((cluster, i) => {
                  const isActive = activeRelationshipGroup === cluster.key;
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        padding: '4px 6px',
                        borderRadius: '4px',
                        background: isActive ? `${cluster.color}15` : 'transparent',
                        borderBottom: isActive ? 'none' : '1px solid var(--cds-border-subtle-00)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cluster.color }} />
                        <span style={{ color: isActive ? '#0f172a' : 'var(--cds-text-secondary)', fontWeight: isActive ? 600 : 400 }}>{cluster.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isActive && (
                          <span style={{ fontSize: '9px', fontWeight: 700, color: cluster.color, textTransform: 'uppercase' }}>Active</span>
                        )}
                        <strong style={{ color: 'var(--cds-text-primary)' }}>{cluster.count}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Relationship Closeness Analytics (Derived Dynamically for Active Relationship Group) */}
              <div style={{ borderTop: '1px solid var(--cds-border-subtle-00)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--cds-text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('closeness.title', 'Relationship Closeness')}
                    <span style={{ marginLeft: '4px', fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'none' }}>
                      ({getGroupFilterLabel(activeRelationshipGroup)})
                    </span>
                  </span>
                  {isClosenessLoading && (
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>{t('closeness.loading', 'Loading...')}</span>
                  )}
                </div>

                {!closenessAnalytics.isEligible ? (
                  <div style={{ background: 'var(--cds-layer-01, #f8fafc)', border: '1px solid var(--cds-border-subtle-00, #e2e8f0)', borderRadius: '6px', padding: '12px', fontSize: '11.5px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.4 }}>
                    Relationship Closeness không áp dụng cho nhóm {getGroupFilterLabel(activeRelationshipGroup)}.
                  </div>
                ) : (
                  <>
                    {/* Average Score */}
                    <div style={{ background: 'var(--cds-layer-01, #f8fafc)', border: '1px solid var(--cds-border-subtle-00, #e2e8f0)', borderRadius: '6px', padding: '8px 10px', marginBottom: '10px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary, #64748b)' }}>{t('closeness.averageScore', 'Average Score')}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '2px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 800, color: 'var(--cds-text-primary, #0f172a)' }}>
                          {closenessAnalytics.assessedCount > 0 ? Math.round(closenessAnalytics.averageScore) : '—'}
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>/ 100</span>
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--cds-text-secondary, #64748b)' }}>
                          {closenessAnalytics.assessedCount}/{closenessAnalytics.totalEligible} {t('closeness.assessed', 'assessed')}
                        </span>
                      </div>
                    </div>

                    {/* Rank Distribution */}
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-primary, #475569)', marginBottom: '6px' }}>
                      {t('closeness.rankDistribution', 'Rank Distribution')}
                    </div>
                    {[
                      { label: 'Rank A', count: closenessAnalytics.rankA, color: '#10B981' },
                      { label: 'Rank B', count: closenessAnalytics.rankB, color: '#2563EB' },
                      { label: 'Rank C', count: closenessAnalytics.rankC, color: '#F59E0B' },
                      { label: 'Rank D', count: closenessAnalytics.rankD, color: '#EF4444' },
                      { label: t('closeness.unassessed', 'Chưa đánh giá'), count: closenessAnalytics.unassessed, color: '#94A3B8' },
                    ].map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '3px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: r.color }} />
                          <span style={{ color: 'var(--cds-text-secondary)' }}>{r.label}</span>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--cds-text-primary)' }}>{r.count}</span>
                      </div>
                    ))}

                    {/* Needs Attention (Correction 4 & 9: Rank C/D only) */}
                    <div style={{ borderTop: '1px dashed var(--cds-border-subtle-00, #e2e8f0)', marginTop: '10px', paddingTop: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#b45309', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>⚠️</span>
                        <span>{t('closeness.needsAttention', 'Needs Attention (Rank C/D)')}</span>
                      </div>
                      {closenessAnalytics.needsAttention.length === 0 ? (
                        <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary, #64748b)', fontStyle: 'italic', padding: '2px 0' }}>
                          {t('closeness.noAttentionNeeded', 'Không có mối quan hệ cần chú ý.')}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {closenessAnalytics.needsAttention.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                const n = nodes.find(x => x.id === item.id);
                                if (n) setSelectedNode(n);
                              }}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '11px',
                                background: '#fffbeb',
                                border: '1px solid #fef3c7',
                                borderRadius: '4px',
                                padding: '4px 6px',
                                cursor: 'pointer',
                              }}
                              title={item.name}
                            >
                              <span style={{ fontWeight: 600, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                {item.name}
                              </span>
                              <span style={{ fontWeight: 700, color: '#b45309', fontSize: '10px' }}>
                                {item.score} / 100 • {item.rank}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

      </div>

      {/* 4. Drawer Overlay on Node Click (Original 6 Tabs Improved to be Owner-Centric) */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedNode(null); }}
        title={selectedNode ? `${selectedNode.name}` : ''}
        subtitle={selectedNode ? `${selectedNode.industry} • ${getGroupLabel(selectedNode.group).toUpperCase()}` : ''}
        width={840}
      >
        {selectedNode && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>

              <span style={{ fontSize: '12px', color: '#64748b' }}>{t('drawer.ecosystemStatus', 'Ecosystem Status:')}</span>
              <strong style={{ fontSize: '12px', color: '#0f172a', textTransform: 'uppercase' }}>
                {l1NodeIds.has(selectedNode.id) ? t('drawer.directConnection', 'Direct Connection') : t('drawer.secondDegreeConnection', 'Second-Degree Connection')}
              </strong>
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#64748b' }}>
                {selectedNode.connections} Connections
              </span>
            </div>

            <div style={{ flexShrink: 0 }}>
              <CompanyDetail companyId={selectedNode.id} isDrawerMode={true} setActivePage={setActivePage} />
            </div>
          </>
        )}
      </Drawer>

    </div>
  );
};
