// Interactive SVG Ecosystem Network Graph for BEI Executive Dashboard
import React, { useState } from 'react';

export interface EcosystemNode {
  id: string;
  name: string;
  category: 'Partner' | 'Competitor' | 'Customer' | 'Supplier' | 'Investor' | 'Government' | 'Media' | 'University';
  healthScore?: number;
  val: number;
  x?: number;
  y?: number;
}

export interface EcosystemLink {
  source: string;
  target: string;
  strength?: number;
}

export interface EcosystemNetworkGraphProps {
  nodes?: EcosystemNode[];
  links?: EcosystemLink[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Partner: '#10B981',    // Green
  Competitor: '#EF4444', // Red
  Customer: '#2563EB',   // Blue
  Supplier: '#F59E0B',   // Orange
  Investor: '#7C3AED',   // Purple
  Government: '#64748B', // Slate
  Media: '#06B6D4',      // Cyan
  University: '#EC4899', // Pink
};

export const EcosystemNetworkGraph: React.FC<EcosystemNetworkGraphProps> = ({
  nodes = [],
  links = [],
}) => {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [activeNode, setActiveNode] = useState<EcosystemNode | null>(null);

  const activeNodes = nodes;
  const activeLinks = links;

  if (activeNodes.length === 0) {
    return <div className="workspace-empty">No relationships yet.</div>;
  }

  const categories = Object.keys(CATEGORY_COLORS);

  const filteredNodes = selectedCat
    ? activeNodes.filter((n) => n.id === 'center' || n.category === selectedCat)
    : activeNodes;

  const nodeMap = new Map(filteredNodes.map((n) => [n.id, n]));

  const filteredLinks = activeLinks.filter(
    (l) => nodeMap.has(l.source) && nodeMap.has(l.target)
  );

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Category Filter Pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <button
          onClick={() => setSelectedCat(null)}
          style={{
            padding: '3px 10px',
            borderRadius: '999px',
            fontSize: '0.72rem',
            fontWeight: 600,
            border: selectedCat === null ? '1px solid #2563EB' : '1px solid #E2E8F0',
            background: selectedCat === null ? '#EFF6FF' : '#FFFFFF',
            color: selectedCat === null ? '#1D4ED8' : '#64748B',
            cursor: 'pointer',
          }}
        >
          All Entities
        </button>
        {categories.map((cat) => {
          const active = selectedCat === cat;
          const color = CATEGORY_COLORS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              style={{
                padding: '3px 10px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 600,
                border: `1px solid ${active ? color : '#E2E8F0'}`,
                background: active ? `${color}15` : '#FFFFFF',
                color: active ? color : '#64748B',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
              {cat}
            </button>
          );
        })}
      </div>

      {/* SVG Canvas */}
      <div
        style={{
          width: '100%',
          height: '320px',
          background: '#F8FAFC',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <svg viewBox="0 0 500 350" style={{ width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </radialGradient>
          </defs>

          {/* Central Hub Halo */}
          <circle cx="250" cy="175" r="90" fill="url(#hubGradient)" />

          {/* Connection Lines */}
          {filteredLinks.map((link, idx) => {
            const src = nodeMap.get(link.source);
            const tgt = nodeMap.get(link.target);
            if (!src || !tgt) return null;
            const isHighlighted =
              activeNode && (activeNode.id === src.id || activeNode.id === tgt.id);
            return (
              <line
                key={idx}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={isHighlighted ? '#2563EB' : '#CBD5E1'}
                strokeWidth={isHighlighted ? 2.5 : 1.2}
                strokeDasharray={src.id !== 'center' && tgt.id !== 'center' ? '4 4' : undefined}
                style={{ transition: 'all 0.3s ease' }}
              />
            );
          })}

          {/* Nodes */}
          {filteredNodes.map((node) => {
            const isCenter = node.id === 'center';
            const color = isCenter ? '#0F172A' : CATEGORY_COLORS[node.category] || '#64748B';
            const isHovered = activeNode?.id === node.id;
            const r = isCenter ? 24 : node.val;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseEnter={() => setActiveNode(node)}
                onMouseLeave={() => setActiveNode(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Node Outer Ring */}
                <circle
                  r={r + (isHovered ? 4 : 0)}
                  fill={isCenter ? '#0F172A' : color}
                  fillOpacity={isCenter ? 1 : 0.9}
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  style={{ transition: 'all 0.2s ease', filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'none' }}
                />

                {/* Center Icon / Initial */}
                <text
                  textAnchor="middle"
                  dy="0.3em"
                  fill="#FFFFFF"
                  fontSize={isCenter ? '11px' : '9px'}
                  fontWeight="800"
                  pointerEvents="none"
                >
                  {isCenter ? 'HUB' : node.name.substring(0, 2).toUpperCase()}
                </text>

                {/* Node Label */}
                <text
                  textAnchor="middle"
                  y={r + 14}
                  fill="#1E293B"
                  fontSize="10px"
                  fontWeight={isCenter || isHovered ? '700' : '500'}
                  pointerEvents="none"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Information Tooltip Overlay */}
        {activeNode && (
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '8px 12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 10,
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background:
                  activeNode.id === 'center'
                    ? '#0F172A'
                    : CATEGORY_COLORS[activeNode.category],
              }}
            />
            <div>
              <strong style={{ color: '#0F172A', display: 'block' }}>{activeNode.name}</strong>
              <span style={{ color: '#64748B', fontSize: '0.7rem' }}>
                Type: {activeNode.category}{' '}
                {activeNode.healthScore ? `• Health Score: ${activeNode.healthScore}/100` : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
