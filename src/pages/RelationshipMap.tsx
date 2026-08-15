// Enterprise Relationship Map — IBM Carbon Operations Center
// 3-column Layout: Left Filters Sidebar | Center Interactive Network Graph | Right Analytics Sidebar
// Top KPI Row | Below-Graph Drawer on Node Click | Level-based Circular Network Redesign

import React, { useEffect, useMemo, useState } from 'react';
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

// ─── Types & Interfaces ────────────────────────────────────────────────────────
export type GroupKey = 'ALL' | 'partner' | 'supplier' | 'competitor' | 'customer' | 'potential-partner';

const toGroupKey = (relationshipType?: string): GroupKey => {
  const t = (relationshipType || '').toUpperCase();
  switch (t) {
    case 'PARTNER_WITH': return 'partner';
    case 'COMPETITOR_OF': return 'competitor';
    case 'SUPPLIER_OF': return 'supplier';
    case 'CUSTOMER_OF': return 'customer';
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
  const [groupFilter, setGroupFilter] = useState<GroupKey>('ALL');
  const [minHealth, setMinHealth] = useState<number>(0);
  const [industryFilter, setIndustryFilter] = useState('All');
  const [depthFilter] = useState<'direct' | '2nd-degree' | 'all'>('2nd-degree');
  const [layoutMode, setLayoutMode] = useState<'radial' | 'grid'>('radial');

  // Incremental Expansion (Initial state shows Level 0 + Level 1. Click L1 node to expand L2 nodes)
  const [expandedL1Ids, setExpandedL1Ids] = useState<Set<string>>(new Set());

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
    const matchedFilters = nodes.filter(n => {
      if (n.id === centerId) return true;
      const matchSearch = !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.industry.toLowerCase().includes(search.toLowerCase());
      const matchGroup = groupFilter === 'ALL' || n.group === groupFilter;
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

    // Radial layout coordinates calculations (Canvas size 1400x900 - Taller and Wider)
    const centerX = 700;
    const centerY = 450;
    const R1 = 280; // Radius Level 1 (Expanded from 230)
    const R2 = 490; // Radius Level 2 (Expanded from 410)

    const visibleL1 = filtered.filter(n => levels.get(n.id) === 1);
    const visibleL2 = filtered.filter(n => levels.get(n.id) === 2);
    const N1 = visibleL1.length;

    const positions = new Map<string, { x: number; y: number; angle?: number }>();
    positions.set(centerId, { x: centerX, y: centerY });

    // Level 1 positions
    const sortedL1 = [...visibleL1].sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group);
      return a.name.localeCompare(b.name);
    });

    sortedL1.forEach((node, idx) => {
      const angle = N1 > 0 ? (idx * 2 * Math.PI) / N1 - Math.PI / 2 : 0;
      const x = centerX + R1 * Math.cos(angle);
      const y = centerY + R1 * Math.sin(angle);
      positions.set(node.id, { x, y, angle });
    });

    // Level 2 positions fanned around Level 1 parent node
    visibleL2.forEach(node => {
      const parentId = parentMap.get(node.id);
      const parentPos = parentId ? positions.get(parentId) : null;
      if (parentPos && parentPos.angle !== undefined) {
        const siblings = visibleL2.filter(n => parentId && parentMap.get(n.id) === parentId);
        const k = siblings.length;
        const idxInSiblings = siblings.findIndex(n => n.id === node.id);
        const spread = k > 1 ? Math.min(0.24, 0.85 / k) : 0;
        const childAngle = parentPos.angle + (idxInSiblings - (k - 1) / 2) * spread;
        const x = centerX + R2 * Math.cos(childAngle);
        const y = centerY + R2 * Math.sin(childAngle);
        positions.set(node.id, { x, y });
      } else {
        const idx = visibleL2.indexOf(node);
        const angle = visibleL2.length > 0 ? (idx * 2 * Math.PI) / visibleL2.length : 0;
        const x = centerX + R2 * Math.cos(angle);
        const y = centerY + R2 * Math.sin(angle);
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
  }, [nodes, edges, centerId, search, groupFilter, minHealth, industryFilter, depthFilter, showAllL2, expandedL1Ids, layoutMode]);

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
    if (!activeHighlightId) return 1;
    return pathNodes.has(nodeId) ? 1 : 0.15;
  };

  const getEdgeOpacity = (edgeId: string) => {
    if (!activeHighlightId) return 0.6;
    return pathEdges.has(edgeId) ? 1 : 0.08;
  };

  // ── Metrics & Sidebar items ───────────────────────────────────────
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchSearch = !search || n.name.toLowerCase().includes(search.toLowerCase()) || n.industry.toLowerCase().includes(search.toLowerCase());
      const matchGroup = groupFilter === 'ALL' || n.group === groupFilter;
      const matchHealth = n.healthScore >= minHealth;
      const matchIndustry = industryFilter === 'All' || n.industry === industryFilter;
      return matchSearch && matchGroup && matchHealth && matchIndustry;
    });
  }, [nodes, search, groupFilter, minHealth, industryFilter]);

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

  // Handle Node Click to open Drawer & Expand L2 connections (Incremental Graph Expansion)
  const handleNodeClick = (node: GraphNode) => {
    if (node.id === centerId) return;
    setSelectedNode(node);
    setDrawerTab('overview'); // Set default tab to 'overview'
    setDrawerOpen(true);

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
        title={t('title', 'Enterprise Ecosystem Relationship Map')}
        actions={
          <>
            <SecondaryButton size="md" onClick={() => setLayoutMode(layoutMode === 'radial' ? 'grid' : 'radial')}>
              {t('network.layout', 'Layout')}: {layoutMode === 'radial' ? t('network.radial', 'Radial Radar') : t('network.grid', 'Grid Topography')}
            </SecondaryButton>
            <PrimaryButton size="md" loading={refreshing} disabled={refreshing} onClick={() => setDataVersion((v) => v + 1)}>
              {t('network.refreshTopology', 'Refresh Graph Topology')}
            </PrimaryButton>
          </>
        }
      />

      {/* 2. Top KPI Cards and Owner Summary Banner */}
      <div style={{ border: '1px solid #cbd5e1', borderRadius: '12px', padding: '16px', background: '#ffffff', marginBottom: '16px', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
        
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', borderBottom: '1px dashed #cbd5e1', paddingBottom: '14px', marginBottom: '12px' }}>
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
      <div className="relationship-map-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 240px', gap: '14px', alignItems: 'start', marginBottom: '16px' }}>
        
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
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value as GroupKey)}
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
                <option value="ALL">{t('chips.all', 'All Groups')}</option>
                <option value="partner">{t('relationshipTypes.partnerWith', 'Partners')}</option>
                <option value="customer">{t('relationshipTypes.customerOf', 'Customers')}</option>
                <option value="supplier">{t('relationshipTypes.supplierOf', 'Suppliers')}</option>
                <option value="competitor">{t('relationshipTypes.competitorOf', 'Competitors')}</option>
                <option value="potential-partner">{t('relationshipTypes.potentialPartnerOf', 'Potential Partners')}</option>
              </select>

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
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                  setSelectedNode(null);
                  setSearch('');
                  setGroupFilter('ALL');
                  setMinHealth(0);
                  setIndustryFilter('All');
                  setShowAllL2(false);
                  setExpandedL1Ids(new Set());
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

          {/* Graph Canvas Container (Widened to 1400 viewbox and Heightened to 680px) */}
          <div className="relationship-network-canvas" style={{ width: '100%', minHeight: '680px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--cds-border-subtle-00)', overflow: 'hidden', position: 'relative' }}>
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
                              onMouseEnter={() => setHoveredNodeId(node.id)}
                              onMouseLeave={() => setHoveredNodeId(null)}
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#ffffff',
                                borderRadius: level === 1 ? '10px' : '8px',
                                border: `2px solid ${isSelected ? '#3b82f6' : (level === 1 ? (isExpandedL1 ? '#3b82f6' : style.color) : '#e2e8f0')}`,
                                boxShadow: isSelected 
                                  ? '0 0 10px 2px rgba(59, 130, 246, 0.3)' 
                                  : '0 2px 6px rgba(15, 23, 42, 0.02)',
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
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: Topography Analytics (Original kept - slightly narrowed) */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            {t('topographyAnalytics.title', 'Topography Analytics')}
          </h3>



          {/* Cluster Breakdown */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '8px' }}>{t('topographyAnalytics.ecosystemClusters', 'Ecosystem Clusters')}</div>
            {[
              { label: t('stats.partners', 'Partners'), count: metrics.partners, color: '#10B981' },
              { label: t('stats.suppliers', 'Suppliers'), count: metrics.suppliers, color: '#F59E0B' },
              { label: t('stats.competitors', 'Competitors'), count: metrics.competitors, color: '#EF4444' },
              { label: t('stats.customers', 'Customers'), count: metrics.customers, color: '#2563EB' },
              { label: t('stats.potentialPartners', 'Potential Partners'), count: metrics.potentialPartners, color: '#8B5CF6' },
            ].map((cluster, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: cluster.color }} />
                  <span style={{ color: 'var(--cds-text-secondary)' }}>{cluster.label}</span>
                </div>
                <strong style={{ color: 'var(--cds-text-primary)' }}>{cluster.count}</strong>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Drawer Overlay on Node Click (Original 6 Tabs Improved to be Owner-Centric) */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedNode(null); }}
        title={selectedNode ? `${selectedNode.name}` : ''}
        subtitle={selectedNode ? `${selectedNode.industry} • ${getGroupLabel(selectedNode.group).toUpperCase()}` : ''}
        width={840}
        footerActions={
          <>
            <SecondaryButton size="sm" onClick={exportNodeDossierCsv}>
              {t('actions.exportDossier', 'Export Dossier')}
            </SecondaryButton>

          </>
        }
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
              <Tabs
                items={DRAWER_TABS.filter(tab => !(['projects'].includes(tab.id) && selectedNode.group === 'competitor')).map((tab) => {
                  let label = tab.label;
                  if (tab.id === 'overview') label = t('drawer.overview', 'Overview');
                  else if (tab.id === 'strength') label = t('drawer.strength', 'Relationship Strength');
                  else if (tab.id === 'projects') label = t('drawer.projects', 'Shared Projects');
                  else if (tab.id === 'contacts') label = t('drawer.contacts', 'Contacts');
                  return { ...tab, label };
                })}
                activeId={drawerTab}
                onChange={setDrawerTab}
              />
            </div>

            <div style={{ marginTop: '16px' }}>
              {renderDrawerTab()}
            </div>
          </>
        )}
      </Drawer>

    </div>
  );
};
