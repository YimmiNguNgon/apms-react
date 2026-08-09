// Enterprise Relationship Map â€” IBM Carbon Operations Center
// 3-column Layout: Left Filters Sidebar | Center Interactive Network Graph | Right Analytics Sidebar
// Top KPI Row | Below-Graph Timeline & History | Right-side Drawer on Node Click (Zero popups)

import React, { useEffect, useMemo, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react';
import { api } from '../services/api';
import type { GraphCompanyDto, ProfileResponse, ProjectResponse } from '../types/domain';
import type { PageResponse } from '../services/api';
import {
  PageHeader,
  MetricCard,
  RiskBadge,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Drawer,
  Tabs,
} from '../components/ui';

// â”€â”€â”€ Types & Interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  partner: { color: '#10B981', label: 'Partner' },
  competitor: { color: '#EF4444', label: 'Competitor', dashed: true },
  supplier: { color: '#F59E0B', label: 'Supplier' },
  customer: { color: '#2563EB', label: 'Customer' },
  'potential-partner': { color: '#8B5CF6', label: 'Potential Partner', dashed: true },
};

const nodeLines = (name: string) => {
  const words = name.trim().split(/\s+/);
  const lines = ['', ''];
  words.forEach((word) => {
    const target = lines[0].length <= lines[1].length ? 0 : 1;
    lines[target] = `${lines[target]} ${word}`.trim();
  });
  return lines.filter(Boolean).map((line) => line.length > 19 ? `${line.slice(0, 18)}...` : line);
};

/** Deterministic force layout with label-aware collision avoidance. */
const forceLayout = (input: GraphNode[], edges: GraphEdge[], width = 920, height = 580, spacious = false): GraphNode[] => {
  const degree = new Map(input.map((node) => [node.id, 0]));
  edges.forEach((edge) => {
    degree.set(edge.from, (degree.get(edge.from) || 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) || 0) + 1);
  });
  const placed = input.map((node, index) => {
    const angle = (index * 2.399963229728653) % (Math.PI * 2);
    const radius = Math.min(width, height) * (0.2 + 0.055 * Math.sqrt(index));
    return { ...node, connections: degree.get(node.id) || 0, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius };
  });
  const byId = new Map(placed.map((node) => [node.id, node]));
  for (let tick = 0; tick < 180; tick += 1) {
    const alpha = 1 - tick / 210;
    placed.forEach((a, i) => {
      for (let j = i + 1; j < placed.length; j += 1) {
        const b = placed[j];
        let dx = a.x - b.x; let dy = a.y - b.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const minDistance = spacious ? 136 : 118; // includes two-line company label footprint
        const push = Math.max(0, minDistance - distance) * 0.34 + 900 / (distance * distance);
        dx /= distance; dy /= distance;
        a.x += dx * push * alpha; a.y += dy * push * alpha;
        b.x -= dx * push * alpha; b.y -= dy * push * alpha;
      }
    });
    edges.forEach((edge) => {
      const a = byId.get(edge.from); const b = byId.get(edge.to);
      if (!a || !b) return;
      const dx = b.x - a.x; const dy = b.y - a.y; const distance = Math.max(1, Math.hypot(dx, dy));
      const pull = (distance - (spacious ? 178 : 150)) * 0.018 * alpha;
      a.x += dx / distance * pull; a.y += dy / distance * pull;
      b.x -= dx / distance * pull; b.y -= dy / distance * pull;
    });
    placed.forEach((node) => {
      const gravity = 0.006 * (1 + Math.min(4, node.connections) * 0.3) * alpha;
      node.x += (width / 2 - node.x) * gravity;
      node.y += (height / 2 - node.y) * gravity;
      node.x = Math.max(72, Math.min(width - 72, node.x));
      node.y = Math.max(58, Math.min(height - 72, node.y));
    });
  }
  return placed;
};

// â”€â”€â”€ Default Graph Seed Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DRAWER_TABS = [
  { id: 'overview',     label: 'Overview' },
  { id: 'strength',     label: 'Relationship Strength' },
  { id: 'projects',     label: 'Shared Projects' },
  { id: 'contacts',     label: 'Contacts' },
  { id: 'meetings',     label: 'Recent Meetings' },
  { id: 'ai-recommend', label: 'AI Recommendation' },
];

export const RelationshipMap: React.FC = () => {
  // â”€â”€ State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [ownerName, setOwnerName] = useState('OUR COMPANY');
  const [projectCounts, setProjectCounts] = useState<Map<string, number>>(new Map());

  // Filters
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupKey>('ALL');
  const [minHealth, setMinHealth] = useState<number>(0);
  const [industryFilter, setIndustryFilter] = useState('All');

  // Controls
  const [zoom, setZoom] = useState<number>(1);
  const [layoutMode, setLayoutMode] = useState<'radial' | 'grid'>('radial');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  // Drawer
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('overview');

  // Backend Graph Sync
  useEffect(() => {
    const fetchGraphData = async () => {
      setRefreshing(true);
      try {
        const res = await api.get<GraphCompanyDto[]>('/graph/network');
        if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
          // Network returns entities. Hydrate their existing detail endpoints to
          // obtain relationships without changing an API contract.
          const details = await Promise.allSettled(
            res.data.map((company) => api.get<GraphCompanyDto>(`/graph/companies/${encodeURIComponent(company.companyId)}`)),
          );
          const companies = res.data.map((company, index) => {
            const detail = details[index];
            return detail?.status === 'fulfilled' && detail.value.data ? { ...company, ...detail.value.data } : company;
          });
          const companyIds = new Set(companies.map((company) => company.companyId));
          const groupByNode = new Map<string, GroupKey>();
          const edgeIds = new Set<string>();
          const hydratedEdges: GraphEdge[] = [];

          companies.forEach((company) => (company.relationships || []).forEach((relationship) => {
            const from = relationship.sourceCompanyId;
            const to = relationship.targetCompanyId;
            if (!from || !to || !companyIds.has(from) || !companyIds.has(to)) return;
            const group = toGroupKey(relationship.relationshipType);
            const id = `${[from, to].sort().join('|')}|${group}`;
            if (edgeIds.has(id)) return;
            edgeIds.add(id);
            const style = RELATIONSHIP_STYLES[group];
            hydratedEdges.push({ id, from, to, type: relationship.relationshipType || style.label, label: style.label, group, color: style.color, dashed: Boolean(style.dashed) });
            if (!groupByNode.has(from)) groupByNode.set(from, group);
            if (!groupByNode.has(to)) groupByNode.set(to, group);
          }));
          const hydratedNodes: GraphNode[] = companies.map((company, index) => ({
            id: company.companyId || `node-${index}`,
            name: company.name || 'Not available',
            industry: company.industry || 'Not available',
            group: groupByNode.get(company.companyId) || toGroupKey(company.relationshipType),
            healthScore: 0, riskLevel: 'LOW', connections: 0, x: 0, y: 0,
            initials: (company.name || 'NA').split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase(),
            color: '#2563EB', overview: company.industry ? `Industry: ${company.industry}` : 'Not available',
            sharedProjects: [], contacts: [], meetings: [],
            aiRecommendation: 'No relationship recommendation returned from the current graph data.',
          }));
          setNodes(hydratedNodes);
          setEdges(hydratedEdges);
          return;

          const mappedNodes: GraphNode[] = res.data.map((c, i) => ({
            id: c.companyId || `node-${i}`,
            name: c.name || 'Not available',
            industry: c.industry || 'Not available',
            group: toGroupKey(c.relationshipType),
            healthScore: 0,
            riskLevel: 'LOW',
            connections: c.relationships?.length || 0,
            x: 100 + (i * 70) % 480,
            y: 80 + (i * 60) % 300,
            initials: (c.name || 'NA').substring(0, 2).toUpperCase(),
            color: 'var(--cds-interactive)',
            overview: c.industry ? `Industry: ${c.industry}` : 'Not available',
            sharedProjects: [],
            contacts: [],
            meetings: [],
            aiRecommendation: 'Not available â€” No relationship recommendation returned from backend API.',
          }));

          const nodeIdSet = new Set(mappedNodes.map((n) => n.id));
          const mappedEdges: GraphEdge[] = [];
          res.data.forEach((c, i) => {
            (c.relationships || []).forEach((rel, j) => {
              if (!rel || !nodeIdSet.has(rel.sourceCompanyId) || !nodeIdSet.has(rel.targetCompanyId)) return;
              mappedEdges.push({
                id: `edge-${i}-${j}`,
                from: rel.sourceCompanyId,
                to: rel.targetCompanyId,
                type: rel.relationshipType || 'RELATED',
                label: rel.relationshipType || 'related',
                group: toGroupKey(rel.relationshipType),
                color: 'var(--cds-interactive)',
                dashed: false,
              });
            });
          });

          setNodes(mappedNodes);
          setEdges(mappedEdges);
        } else {
          setNodes([]);
          setEdges([]);
        }
      } catch {
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

  // â”€â”€ Filtered Nodes & Edges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  const positionedNodes = useMemo(
    () => forceLayout(filteredNodes, filteredEdges, 920, 580, layoutMode === 'grid'),
    [filteredNodes, filteredEdges, layoutMode],
  );
  const positionedNodeById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes]);
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    return new Set(filteredEdges.flatMap((edge) => edge.from === hoveredNodeId ? [edge.from, edge.to] : edge.to === hoveredNodeId ? [edge.from, edge.to] : []));
  }, [filteredEdges, hoveredNodeId]);
  const highlightedEdgeIds = useMemo(
    () => new Set(hoveredNodeId ? filteredEdges.filter((edge) => edge.from === hoveredNodeId || edge.to === hoveredNodeId).map((edge) => edge.id) : []),
    [filteredEdges, hoveredNodeId],
  );
  const hoveredNode = hoveredNodeId ? positionedNodeById.get(hoveredNodeId) : null;
  const networkGroup = (group: GroupKey): 'partner' | 'competitor' | 'supplier' | 'custom' => {
    if (group === 'partner' || group === 'competitor' || group === 'supplier') return group;
    return 'custom';
  };
  const networkStyle = (group: GroupKey) => ({
    partner: { color: '#16A34A', label: 'Partner' },
    competitor: { color: '#DC2626', label: 'Competitor' },
    supplier: { color: '#D97706', label: 'Supplier' },
    custom: { color: '#2563EB', label: 'Custom' },
  }[networkGroup(group)]);
  const businessNetworkNodes = useMemo(() => {
    const connected = new Set(filteredEdges.flatMap((edge) => [edge.from, edge.to]));
    const groups = new Map<string, GraphNode[]>();
    positionedNodes.filter((node) => connected.has(node.id)).forEach((node) => {
      const group = networkGroup(node.group);
      groups.set(group, [...(groups.get(group) || []), node]);
    });
    const anchors: Record<string, [number, number]> = { partner: [450, 62], supplier: [735, 180], competitor: [450, 315], custom: [165, 180] };
    return Array.from(groups.entries()).flatMap(([group, members]) => members.map((node, index) => {
      const [baseX, baseY] = anchors[group];
      const offset = (index - (members.length - 1) / 2) * 126;
      const horizontal = group === 'partner' || group === 'competitor';
      return { ...node, networkX: horizontal ? baseX + offset : baseX, networkY: horizontal ? baseY : baseY + offset };
    }));
  }, [positionedNodes, filteredEdges]);
  const businessNodeById = useMemo(() => new Map(businessNetworkNodes.map((node) => [node.id, node])), [businessNetworkNodes]);

  // Industry options for filter
  const industryOptions = useMemo(() => {
    const set = new Set(nodes.map((n) => n.industry));
    return ['All', ...Array.from(set)];
  }, [nodes]);

  // â”€â”€ Key Metrics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalCompanies = filteredNodes.length;
  const totalConnections = filteredEdges.length;
  const totalSharedProjects = filteredNodes.reduce((acc, n) => acc + (n.sharedProjects?.length || 0), 0);
  const riskLinksCount = filteredNodes.filter((n) => n.riskLevel === 'CRITICAL' || n.riskLevel === 'HIGH').length;

  // Node click handler
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node);
    setDrawerTab('overview');
    setDrawerOpen(true);
  };

  // Export selected node dossier (client-side CSV)
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
      ...(selectedNode.contacts || []).map((c, i) => [`Contact ${i + 1}`, `${c.name} Â· ${c.role} Â· ${c.email} Â· ${c.phone}`]),
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

  // Schedule meeting via email when a contact is on file
  const scheduleMeeting = () => {
    if (!selectedNode) return;
    const email = selectedNode.contacts?.[0]?.email;
    if (email) {
      const subject = encodeURIComponent(`Strategy meeting proposal â€” ${selectedNode.name}`);
      const body = encodeURIComponent(
        `Hi,\n\nI would like to schedule a strategy meeting regarding ${selectedNode.name} (${selectedNode.industry}).\n\nBest regards,`
      );
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else {
      window.alert(`No contact email on file for ${selectedNode.name} â€” cannot schedule a meeting.`);
    }
  };

  // Render Drawer Content
  const renderDrawerTab = () => {
    if (!selectedNode) return null;

    switch (drawerTab) {
      case 'overview':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0', fontSize: '13px', lineHeight: '22px', color: 'var(--cds-text-primary)' }}>
              <strong>Executive Summary:</strong> {selectedNode.overview || 'Entity is actively monitored within the BEI intelligence map.'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              <MetricCard label="Health Score" value={`${selectedNode.healthScore}/100`} valueColor={selectedNode.healthScore >= 80 ? 'var(--cds-support-success)' : 'var(--cds-support-error)'} />
              <MetricCard label="Connections" value={selectedNode.connections} />
              <MetricCard label="Risk Level" value={selectedNode.riskLevel} valueColor={selectedNode.riskLevel === 'CRITICAL' ? 'var(--cds-support-error)' : undefined} />
            </div>

            <div style={{ background: 'var(--cds-layer-01)', padding: '12px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Entity Metadata</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Industry:</span> <strong>{selectedNode.industry}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Relationship Group:</span> <strong>{selectedNode.group.toUpperCase()}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Node ID:</span> <strong>{selectedNode.id}</strong></div>
                <div><span style={{ color: 'var(--cds-text-secondary)' }}>Radar Status:</span> <strong>ACTIVE</strong></div>
              </div>
            </div>
          </div>
        );

      case 'strength':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-primary)' }}>Relationship Health Radar Breakdown</h4>
            {[
              { label: 'Trust & Contract Compliance', score: selectedNode.healthScore },
              { label: 'Communication Velocity', score: Math.max(50, selectedNode.healthScore - 6) },
              { label: 'Revenue Alignment', score: Math.min(98, selectedNode.healthScore + 4) },
              { label: 'Risk Mitigation Index', score: selectedNode.riskLevel === 'CRITICAL' ? 40 : 88 },
            ].map((item, idx) => (
              <div key={idx} style={{ background: 'var(--cds-layer-01)', padding: '10px 12px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span style={{ color: 'var(--cds-text-secondary)' }}>{item.label}</span>
                  <strong style={{ color: item.score >= 80 ? 'var(--cds-support-success)' : 'var(--cds-support-error)' }}>{item.score}%</strong>
                </div>
                <div style={{ height: '5px', background: 'var(--cds-border-subtle-00)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.score}%`, height: '100%', background: item.score >= 80 ? 'var(--cds-support-success)' : 'var(--cds-support-error)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        );

      case 'projects':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedNode.sharedProjects && selectedNode.sharedProjects.length > 0 ? (
              selectedNode.sharedProjects.map((proj, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{proj.name}</strong>
                    <StatusBadge status={proj.status} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-secondary)', marginBottom: '8px' }}>Target Completion: {proj.due}</div>
                  <div style={{ height: '4px', background: 'var(--cds-border-subtle-00)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${proj.progress}%`, height: '100%', background: 'var(--cds-interactive)', borderRadius: '2px' }} />
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No shared active projects recorded for this entity.</p>
            )}
          </div>
        );

      case 'contacts':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedNode.contacts && selectedNode.contacts.length > 0 ? (
              selectedNode.contacts.map((cnt, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)', display: 'block' }}>{cnt.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--cds-text-secondary)', margin: '2px 0 6px' }}>{cnt.role}</div>
                  <div style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>
                    Email: <a href={`mailto:${cnt.email}`} style={{ color: 'var(--cds-link-primary)' }}>{cnt.email}</a> â€¢ Phone: {cnt.phone}
                  </div>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No executive contacts listed.</p>
            )}
          </div>
        );

      case 'meetings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedNode.meetings && selectedNode.meetings.length > 0 ? (
              selectedNode.meetings.map((mtg, i) => (
                <div key={i} style={{ padding: '12px', background: 'var(--cds-layer-01)', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <strong style={{ fontSize: '13px', color: 'var(--cds-text-primary)' }}>{mtg.title}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--cds-text-helper)' }}>{mtg.date}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-secondary)', lineHeight: '18px' }}>{mtg.notes}</p>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--cds-text-helper)' }}>No recent meeting notes found.</p>
            )}
          </div>
        );

      case 'ai-recommend':
        return (
          <div style={{ background: 'var(--cds-layer-01)', borderLeft: '3px solid var(--cds-interactive)', padding: '14px', borderRadius: '0 6px 6px 0' }}>
            <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--cds-text-primary)' }}>Prescriptive AI Action Plan</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--cds-text-secondary)', lineHeight: '22px' }}>
              {selectedNode.aiRecommendation || 'Maintain standard monitoring and schedule regular quarterly reviews.'}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  // â”€â”€ Main Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="cds-page-shell" id="page-relationship-map">
      {/* 1. Page Header */}
      <PageHeader
        title="Enterprise Ecosystem Relationship Map"
        eyebrow="Business Ecosystem Intelligence"
        description="Visualize multi-entity connection topographies, evaluate health scores, and analyze strategic network dependencies."
        breadcrumb={[{ label: 'Dashboard' }, { label: 'Relationship Map' }]}
        actions={
          <>
            <SecondaryButton size="md" onClick={() => setLayoutMode(layoutMode === 'radial' ? 'grid' : 'radial')}>
              Layout: {layoutMode === 'radial' ? 'Radial Radar' : 'Grid Topography'}
            </SecondaryButton>
            <PrimaryButton size="md" loading={refreshing} disabled={refreshing} onClick={() => setDataVersion((v) => v + 1)}>
              Refresh Graph Topology
            </PrimaryButton>
          </>
        }
      />

      {/* 2. Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', marginBottom: '16px' }}>
        <MetricCard label="Companies" value={totalCompanies} description="Active entities in map" />
        <MetricCard label="Connections" value={totalConnections} description="Network edges mapped" />
        <MetricCard label="Shared Projects" value={totalSharedProjects} description="Cross-entity initiatives" />
        <MetricCard label="Risk Links" value={riskLinksCount} description="High / Critical threat nodes" valueColor="var(--cds-support-error)" />
      </div>

      {/* 3. 3-Column Operations Layout: Left Filters | Center Graph | Right Analytics */}
      <div className="relationship-map-layout" style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr) 280px', gap: '14px', alignItems: 'start', marginBottom: '16px' }}>
        
        {/* LEFT SIDEBAR: Filters */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            Graph Filters
          </h3>

          {/* Search Entity */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>
              Search Entity Name
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company or industry..."
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: 'var(--cds-border-radius)',
                border: '1px solid var(--cds-border-color)',
                background: 'var(--cds-layer-01)',
                color: 'var(--cds-text-primary)',
              }}
            />
          </div>

          {/* Relationship Group */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>
              Relationship Group
            </label>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value as GroupKey)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: 'var(--cds-border-radius)',
                border: '1px solid var(--cds-border-color)',
                background: 'var(--cds-layer-01)',
                color: 'var(--cds-text-primary)',
              }}
            >
              <option value="ALL">All Groups</option>
              <option value="partner">Partners</option>
              <option value="supplier">Suppliers</option>
              <option value="competitor">Competitors</option>
              <option value="customer">Customers</option>
              <option value="potential-partner">Potential Partners</option>
            </select>
          </div>

          {/* Industry Filter */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>
              Industry Sector
            </label>
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: 'var(--cds-border-radius)',
                border: '1px solid var(--cds-border-color)',
                background: 'var(--cds-layer-01)',
                color: 'var(--cds-text-primary)',
              }}
            >
              {industryOptions.map((ind) => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>

          {/* Minimum Health Score Slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600, color: 'var(--cds-text-secondary)', marginBottom: '4px' }}>
              <span>Min Health Score</span>
              <span style={{ color: 'var(--cds-interactive)' }}>{minHealth}/100</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minHealth}
              onChange={(e) => setMinHealth(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cds-interactive)' }}
            />
          </div>

          {/* Reset Filters */}
          <SecondaryButton
            size="sm"
            onClick={() => {
              setSearch('');
              setGroupFilter('ALL');
              setMinHealth(0);
              setIndustryFilter('All');
            }}
          >
            Reset Filters
          </SecondaryButton>
        </div>

        {/* CENTER: force-directed relationship network */}
        <div className="relationship-network-panel" style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', position: 'relative', minWidth: 0 }}>
          <div style={{ marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--cds-text-primary)' }}>Relationship Network</h3>
            <p style={{ margin: '3px 0 0', fontSize: '12px', lineHeight: '18px', color: 'var(--cds-text-secondary)' }}>Visualize connections between partners, competitors, suppliers, customers, and potential partners.</p>
          </div>
          <div className="relationship-network-canvas" style={{ width: '100%', minHeight: '500px', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--cds-border-subtle-00)', overflow: 'hidden', position: 'relative' }}>
            <div style={{ minHeight: '500px', position: 'relative' }}>
              {filteredNodes.length === 0 ? (
                <div style={{ minHeight: '500px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}><div><strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>No company relationship data available.</strong><span style={{ fontSize: '12px', color: '#64748b' }}>No companies match the current filters.</span></div></div>
              ) : filteredEdges.length === 0 ? (
                <div style={{ minHeight: '500px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}><div><strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>{filteredNodes.length} companies available</strong><span style={{ display: 'block', maxWidth: '360px', fontSize: '12px', lineHeight: '18px', color: '#64748b' }}>Companies found, but no relationship connections have been mapped yet.</span></div></div>
              ) : (
                <svg viewBox="0 0 900 390" role="img" aria-label="Business relationship network" style={{ width: '100%', height: '500px', display: 'block' }}>
                  {filteredEdges.map((edge) => { const source = businessNodeById.get(edge.from); const target = businessNodeById.get(edge.to); if (!source || !target) return null; return <line key={edge.id} x1={source.networkX} y1={source.networkY} x2={target.networkX} y2={target.networkY} stroke={networkStyle(edge.group).color} strokeWidth="2" opacity=".7" />; })}
                  <rect x="382" y="165" width="136" height="60" rx="6" fill="#1f4f82" /><text x="450" y="190" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">{ownerName.length > 20 ? `${ownerName.slice(0, 19)}...` : ownerName}</text><text x="450" y="208" textAnchor="middle" fontSize="10" fill="#dbeafe">OUR COMPANY</text>
                  {businessNetworkNodes.map((node) => { const style = networkStyle(node.group); const projectCount = projectCounts.get(node.id) || 0; const name = node.name.length > 20 ? `${node.name.slice(0, 19)}...` : node.name; return <g key={node.id} transform={`translate(${node.networkX},${node.networkY})`} onMouseEnter={() => setHoveredNodeId(node.id)} onMouseLeave={() => setHoveredNodeId(null)} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer' }}><rect x="-52" y="-22" width="104" height="44" rx="5" fill="#fff" stroke={style.color} strokeWidth="2" /><text x="0" y="-3" textAnchor="middle" fontSize="11" fontWeight="700" fill="#172033">{name}</text><text x="0" y="13" textAnchor="middle" fontSize="10" fill={style.color}>{style.label}{projectCount ? ` · ${projectCount} projects` : ''}</text></g>; })}
                </svg>
              )}
              <div style={{ position: 'absolute', left: '12px', bottom: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', padding: '7px 9px', border: '1px solid #dbe3ef', borderRadius: '5px', background: 'rgba(255,255,255,.95)', fontSize: '11px', color: '#475569' }}>{(['partner', 'competitor', 'supplier', 'custom'] as const).map((group) => <span key={group} style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}><i style={{ width: '7px', height: '7px', borderRadius: '50%', background: networkStyle(group as GroupKey).color }} />{networkStyle(group as GroupKey).label}</span>)}</div>
              {hoveredNode && <div style={{ position: 'absolute', right: '12px', top: '12px', width: '220px', padding: '10px', border: '1px solid #dbe3ef', borderRadius: '6px', background: '#fff', fontSize: '11px', lineHeight: '17px', color: '#475569' }}><strong style={{ display: 'block', color: '#1e293b' }}>{hoveredNode.name}</strong><div>Relationship: {networkStyle(hoveredNode.group).label}</div><div>Business Impact: Not available</div><div>Active Projects: {projectCounts.get(hoveredNode.id) || 'Not available'}</div><div>Latest Activity: Not available</div><div>Last Updated: Not available</div><button type="button" onClick={() => handleNodeClick(hoveredNode)} style={{ marginTop: '7px', border: 0, background: 'var(--cds-interactive)', color: '#fff', padding: '5px 7px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>View Company Intelligence</button></div>}
            </div>
            <div style={{ display: 'none' }}>
            <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 3, display: 'flex', alignItems: 'center', gap: '2px', padding: '3px', border: '1px solid #dbe3ef', borderRadius: '6px', background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 8px rgba(15,23,42,0.08)' }}>
              <button aria-label="Zoom out" title="Zoom out" onClick={() => setZoom(Math.max(0.6, zoom - 0.2))} style={{ width: '28px', height: '28px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Minus size={15} /></button>
              <span style={{ minWidth: '42px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#475569' }}>{Math.round(zoom * 100)}%</span>
              <button aria-label="Zoom in" title="Zoom in" onClick={() => setZoom(Math.min(1.8, zoom + 0.2))} style={{ width: '28px', height: '28px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Plus size={15} /></button>
              <span style={{ height: '18px', borderLeft: '1px solid #dbe3ef' }} />
              <button aria-label="Reset graph" title="Reset graph" onClick={() => { setZoom(1); setSelectedEdge(null); }} style={{ width: '28px', height: '28px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><RotateCcw size={14} /></button>
              <button aria-label="Fit graph" title="Fit graph" onClick={() => setZoom(1)} style={{ width: '28px', height: '28px', border: 0, background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><Maximize2 size={14} /></button>
            </div>
            {positionedNodes.length === 0 ? (
              <div style={{ minHeight: '500px', display: 'grid', placeItems: 'center', padding: '32px', textAlign: 'center' }}>
                <div><strong style={{ display: 'block', fontSize: '14px', color: '#1e293b', marginBottom: '6px' }}>No relationship data available</strong><span style={{ display: 'block', maxWidth: '370px', fontSize: '12px', lineHeight: '18px', color: '#64748b' }}>Create or import partner, competitor, supplier, customer, or potential-partner relationships to visualize your business ecosystem.</span></div>
              </div>
            ) : (
              <svg viewBox="0 0 920 580" role="img" aria-label="Company relationship network" style={{ width: '100%', height: '500px', display: 'block', transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 150ms ease' }} onMouseLeave={() => setHoveredNodeId(null)}>
                {filteredEdges.map((edge) => {
                  const source = positionedNodeById.get(edge.from); const target = positionedNodeById.get(edge.to);
                  if (!source || !target) return null;
                  const active = highlightedEdgeIds.has(edge.id) || selectedEdge?.id === edge.id;
                  const dimmed = Boolean(hoveredNodeId && !active);
                  return <g key={edge.id} onClick={() => setSelectedEdge(edge)} style={{ cursor: 'pointer' }}>
                    <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="transparent" strokeWidth="14" />
                    <line x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={edge.color} strokeWidth={active ? 2.8 : 1.45} strokeDasharray={edge.dashed ? '5 4' : undefined} opacity={dimmed ? 0.12 : active ? 1 : 0.6} />
                  </g>;
                })}
                {positionedNodes.map((node) => {
                  const style = RELATIONSHIP_STYLES[node.group]; const active = !hoveredNodeId || node.id === hoveredNodeId || connectedNodeIds.has(node.id); const lines = nodeLines(node.name);
                  return <g key={node.id} transform={`translate(${node.x},${node.y})`} onMouseEnter={() => setHoveredNodeId(node.id)} onClick={() => handleNodeClick(node)} style={{ cursor: 'pointer', opacity: active ? 1 : 0.2 }}>
                    <title>{node.name}</title>
                    <circle r="25" fill="#2563EB" stroke={style.color} strokeWidth="3" style={{ filter: 'drop-shadow(0 2px 3px rgba(15,23,42,0.16))' }} />
                    <text fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle" dy="4">{node.initials}</text>
                    <text fill="#172033" fontSize="12" fontWeight="650" textAnchor="middle" y="43"><tspan x="0">{lines[0]}</tspan>{lines[1] && <tspan x="0" dy="14">{lines[1]}</tspan>}</text>
                    <rect x="-31" y={lines[1] ? 68 : 54} width="62" height="16" rx="8" fill={style.color} opacity="0.13" />
                    <text fill={style.color} fontSize="9" fontWeight="700" textAnchor="middle" y={lines[1] ? 79 : 65}>{style.label}</text>
                  </g>;
                })}
              </svg>
            )}
            <div style={{ position: 'absolute', left: '12px', bottom: '12px', zIndex: 2, padding: '8px 10px', border: '1px solid #dbe3ef', borderRadius: '6px', background: 'rgba(255,255,255,0.94)', fontSize: '11px', color: '#475569' }}>
              <strong style={{ display: 'block', marginBottom: '5px', color: '#334155' }}>Relationship Types</strong>
              {(['partner', 'competitor', 'supplier', 'customer', 'potential-partner'] as const).map((group) => <span key={group} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '8px' }}><i style={{ width: '7px', height: '7px', borderRadius: '50%', background: RELATIONSHIP_STYLES[group].color }} />{RELATIONSHIP_STYLES[group].label}</span>)}
            </div>
            {hoveredNode && <div style={{ position: 'absolute', left: '50%', top: '12px', transform: 'translateX(-50%)', zIndex: 3, maxWidth: '280px', padding: '8px 10px', border: '1px solid #dbe3ef', borderRadius: '6px', background: 'rgba(255,255,255,0.97)', boxShadow: '0 4px 14px rgba(15,23,42,0.12)', fontSize: '11px', lineHeight: '17px', color: '#475569' }}><strong style={{ display: 'block', color: '#1e293b' }}>{hoveredNode.name}</strong><span>{RELATIONSHIP_STYLES[hoveredNode.group].label} | {hoveredNode.industry}</span><br /><span>Health Score: {hoveredNode.healthScore} | Connections: {hoveredNode.connections}</span></div>}
            {selectedEdge && <div style={{ position: 'absolute', right: '12px', bottom: '12px', zIndex: 3, padding: '7px 9px', borderRadius: '6px', background: '#fff', border: `1px solid ${selectedEdge.color}`, fontSize: '11px', color: '#334155' }}><strong>{selectedEdge.label}</strong> relationship <button onClick={() => setSelectedEdge(null)} aria-label="Close relationship details" style={{ marginLeft: '6px', border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}>x</button></div>}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Analytics */}
        <div style={{ background: 'var(--cds-background)', border: '1px solid var(--cds-border-color)', borderRadius: 'var(--cds-border-radius)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--cds-text-primary)' }}>
            Topography Analytics
          </h3>

          {/* Network Density */}
          <div style={{ background: 'var(--cds-layer-01)', padding: '10px 12px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: 'var(--cds-text-secondary)' }}>Network Density</span>
              <strong style={{ color: 'var(--cds-interactive)' }}>74.2%</strong>
            </div>
            <div style={{ height: '4px', background: 'var(--cds-border-subtle-00)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: '74.2%', height: '100%', background: 'var(--cds-interactive)', borderRadius: '2px' }} />
            </div>
          </div>

          {/* Centrality Metrics */}
          <div style={{ background: 'var(--cds-layer-01)', padding: '10px 12px', borderRadius: 'var(--cds-border-radius)', border: '1px solid var(--cds-border-subtle-00)', fontSize: '12px' }}>
            <div style={{ fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '6px' }}>Highest Degree Centrality</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cds-text-secondary)', marginBottom: '3px' }}>
              <span>BEI Command Center</span>
              <strong>8 Links</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--cds-text-secondary)' }}>
              <span>Apex Rivals Inc</span>
              <strong>5 Links</strong>
            </div>
          </div>

          {/* Cluster Breakdown */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--cds-text-primary)', marginBottom: '8px' }}>Ecosystem Clusters</div>
            {[
              { label: 'Partners', count: filteredNodes.filter((n) => n.group === 'partner').length, color: '#10B981' },
              { label: 'Suppliers', count: filteredNodes.filter((n) => n.group === 'supplier').length, color: '#F59E0B' },
              { label: 'Competitors', count: filteredNodes.filter((n) => n.group === 'competitor').length, color: '#EF4444' },
              { label: 'Customers', count: filteredNodes.filter((n) => n.group === 'customer').length, color: '#2563EB' },
              { label: 'Potential Partners', count: filteredNodes.filter((n) => n.group === 'potential-partner').length, color: '#8B5CF6' },
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



      {/* 5. Right-side Drawer on Node Click (Zero Popups) */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedNode?.name ?? ''}
        subtitle={selectedNode ? `${selectedNode.group.toUpperCase()} â€¢ ${selectedNode.industry}` : ''}
        width={720}
        footerActions={
          <>
            <SecondaryButton size="sm" onClick={exportNodeDossierCsv}>
              Export Dossier
            </SecondaryButton>
            <PrimaryButton size="sm" onClick={scheduleMeeting}>
              Schedule Meeting
            </PrimaryButton>
          </>
        }
      >
        {selectedNode && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '14px', borderBottom: '1px solid var(--cds-border-subtle-00)' }}>
              <RiskBadge level={selectedNode.riskLevel} showDot />
              <span style={{ fontSize: '12px', color: 'var(--cds-text-secondary)' }}>Health Score:</span>
              <strong style={{ fontSize: '14px', color: selectedNode.healthScore >= 80 ? 'var(--cds-support-success)' : 'var(--cds-support-error)' }}>
                {selectedNode.healthScore}/100
              </strong>
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--cds-text-helper)' }}>
                {selectedNode.connections} Mapped Connections
              </span>
            </div>

            <Tabs items={DRAWER_TABS} activeId={drawerTab} onChange={setDrawerTab} />

            <div style={{ marginTop: '16px' }}>
              {renderDrawerTab()}
            </div>
          </>
        )}
      </Drawer>

    </div>
  );
};
