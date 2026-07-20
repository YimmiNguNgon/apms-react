import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

type RelationshipType = 'PARTNER_WITH' | 'COMPETITOR_OF' | 'SUPPLIER_OF' | 'CUSTOMER_OF' | 'POTENTIAL_PARTNER_OF' | string;

type NetworkNode = {
  id: string;
  label: string;
  relationshipType: RelationshipType;
  industry?: string;
};

type NetworkEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  confidence?: number;
};

interface RelationshipMapProps {
  setActivePage?: (page: string) => void;
}

const edgeColor = (relationshipType: string) => {
  if (relationshipType.includes('COMPETITOR')) return '#ef4444';
  if (relationshipType.includes('POTENTIAL')) return '#f59e0b';
  if (relationshipType.includes('SUPPLIER')) return '#06b6d4';
  if (relationshipType.includes('CUSTOMER')) return '#8b5cf6';
  return '#10b981';
};

const nodeColor = (relationshipType: string) => {
  if (relationshipType.includes('COMPETITOR')) return '#ef4444';
  if (relationshipType.includes('POTENTIAL')) return '#f59e0b';
  if (relationshipType.includes('SUPPLIER')) return '#06b6d4';
  if (relationshipType.includes('CUSTOMER')) return '#8b5cf6';
  return '#2563eb';
};

export const RelationshipMap: React.FC<RelationshipMapProps> = ({ setActivePage }) => {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<any>('/graph/network')
      .then((res) => {
        const rows = Array.isArray(res?.data) ? res.data : res?.data?.content ?? [];
        const nextNodes: NetworkNode[] = [];
        const nextEdges: NetworkEdge[] = [];
        const seen = new Set<string>();

        rows.forEach((item: any, index: number) => {
          const nodeId = String(item.companyId || item.id || `node-${index}`);
          if (!seen.has(nodeId)) {
            nextNodes.push({
              id: nodeId,
              label: String(item.name || item.tradeName || item.legalName || nodeId),
              relationshipType: String(item.relationshipType || 'PARTNER_WITH'),
              industry: item.industry || item.primaryIndustry,
            });
            seen.add(nodeId);
          }

          (item.relationships || []).forEach((rel: any, relIndex: number) => {
            nextEdges.push({
              id: `edge-${nodeId}-${rel.targetCompanyId || relIndex}`,
              source: String(rel.sourceCompanyId || nodeId),
              target: String(rel.targetCompanyId || rel.target || `${nodeId}-${relIndex}`),
              label: String(rel.relationshipType || 'RELATED'),
              confidence: typeof rel.confidenceScore === 'number' ? rel.confidenceScore : undefined,
            });
          });
        });

        setNodes(nextNodes);
        setEdges(nextEdges);
      })
      .catch(() => {
        setNodes([]);
        setEdges([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || null;
  const relatedEdges = selectedNode ? edges.filter((edge) => edge.source === selectedNode.id || edge.target === selectedNode.id) : [];
  const relatedNodes = selectedNode
    ? nodes.filter((node) => relatedEdges.some((edge) => edge.source === node.id || edge.target === node.id) && node.id !== selectedNode.id)
    : [];

  const summary = useMemo(() => {
    const competitors = nodes.filter((node) => node.relationshipType.includes('COMPETITOR')).length;
    const potential = nodes.filter((node) => node.relationshipType.includes('POTENTIAL')).length;
    const suppliers = nodes.filter((node) => node.relationshipType.includes('SUPPLIER')).length;

    return [
      { label: 'Companies in graph', value: nodes.length, note: 'Nodes returned by the backend network endpoint' },
      { label: 'Relationships', value: edges.length, note: 'Edges returned by the backend network endpoint' },
      { label: 'Competitors', value: competitors, note: 'Nodes marked with competitor relationships' },
      { label: 'Potential / supplier', value: potential + suppliers, note: 'Nodes marked as potential partner or supplier' },
    ];
  }, [edges.length, nodes]);

  const radialLayout = useMemo(() => {
    const centerX = 360;
    const centerY = 240;
    const radius = 150;
    return nodes.map((node, index) => {
      const angle = (index / Math.max(nodes.length, 1)) * Math.PI * 2;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
  }, [nodes]);

  const positionedNode = (id: string) => radialLayout.find((node) => node.id === id);

  return (
    <section className="workspace-page" id="page-relationship-map">
      <div className="workspace-shell">
        <div className="workspace-main">
          <div className="workspace-breadcrumbs">Ecosystem <span>/</span> Relationship Map</div>
          <div className="workspace-page-head">
            <div>
              <h1>Relationship map</h1>
              <p>This graph now renders only backend network data and no longer falls back to seeded companies or mock ecosystem links.</p>
            </div>
          </div>

          <div className="workspace-stats workspace-stats-compact">
            {summary.map((item) => (
              <article key={item.label} className="workspace-stat-card">
                <span className="workspace-stat-label">{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
          </div>

          {loading ? (
            <div className="workspace-panel"><div className="workspace-empty">Loading network graph...</div></div>
          ) : radialLayout.length === 0 ? (
            <div className="workspace-panel"><div className="workspace-empty">No relationship graph data was returned by the backend.</div></div>
          ) : (
            <div className="workspace-panel" style={{ padding: 24 }}>
              <svg viewBox="0 0 720 480" style={{ width: '100%', height: '100%' }}>
                {edges.map((edge) => {
                  const source = positionedNode(edge.source);
                  const target = positionedNode(edge.target);
                  if (!source || !target) return null;
                  return (
                    <line
                      key={edge.id}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={edgeColor(edge.label)}
                      strokeOpacity={edge.confidence ?? 0.65}
                      strokeWidth={2}
                    />
                  );
                })}
                {radialLayout.map((node) => (
                  <g key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelectedNodeId(node.id)} style={{ cursor: 'pointer' }}>
                    <circle r={selectedNodeId === node.id ? 26 : 22} fill={nodeColor(node.relationshipType)} opacity={0.92} />
                    <text textAnchor="middle" y={5} fill="#fff" fontSize="10" fontWeight="700">
                      {node.label.slice(0, 10)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        <aside className="workspace-sidebar">
          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Selected node</span>
            {selectedNode ? (
              <div className="workspace-detail-list" style={{ marginTop: 14 }}>
                <div><strong>Company</strong><span>{selectedNode.label}</span></div>
                <div><strong>Relationship type</strong><span>{selectedNode.relationshipType}</span></div>
                <div><strong>Industry</strong><span>{selectedNode.industry || 'Not available'}</span></div>
                <div><strong>Linked edges</strong><span>{relatedEdges.length}</span></div>
              </div>
            ) : (
              <div className="workspace-empty" style={{ marginTop: 14 }}>Select a node to inspect backend relationship details.</div>
            )}
          </div>

          <div className="workspace-side-card">
            <span className="workspace-side-eyebrow">Connected companies</span>
            {relatedNodes.length > 0 ? (
              <div className="workspace-activity-list" style={{ marginTop: 14 }}>
                {relatedNodes.map((node) => (
                  <article key={node.id}>
                    <strong>{node.label}</strong>
                    <p>{node.relationshipType}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="workspace-empty" style={{ marginTop: 14 }}>No connected companies to show.</div>
            )}
          </div>

          {selectedNode && setActivePage && (
            <div className="workspace-side-card">
              <span className="workspace-side-eyebrow">Next action</span>
              <div className="workspace-directory-actions" style={{ marginTop: 14 }}>
                <button className="btn btn-primary" onClick={() => setActivePage('company-detail')}>Open company detail</button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};
