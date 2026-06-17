import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────
type NodeType = 'center' | 'strategic' | 'operational' | 'potential' | 'competitor';

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  size: number;
  revenue?: string;
  industry?: string;
  score?: number;
  contact?: string;
  since?: string;
  deals?: number;
  status?: string;
  tier?: string;
  risk?: string;
  desc?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  strength: 'strong' | 'medium' | 'weak';
}

// ─── Color Palette ───────────────────────────────────────────
const NODE_COLORS: Record<NodeType, { fill: string; stroke: string; glow: string; label: string; bg: string }> = {
  center:      { fill: '#7C3AED', stroke: '#A78BFA', glow: 'rgba(124,58,237,0.5)',  label: 'Tổ chức',              bg: '#1E1040' },
  strategic:   { fill: '#059669', stroke: '#34D399', glow: 'rgba(5,150,105,0.5)',   label: 'Strategic Partner',    bg: '#022C22' },
  operational: { fill: '#2563EB', stroke: '#60A5FA', glow: 'rgba(37,99,235,0.5)',   label: 'Operational Partner',  bg: '#0C1A4E' },
  potential:   { fill: '#D97706', stroke: '#FCD34D', glow: 'rgba(217,119,6,0.5)',   label: 'Potential Partner',    bg: '#3B1F00' },
  competitor:  { fill: '#DC2626', stroke: '#F87171', glow: 'rgba(220,38,38,0.5)',   label: 'Competitor',           bg: '#3B0000' },
};

const EDGE_COLORS: Record<string, string> = {
  strong: 'rgba(99,102,241,0.7)',
  medium: 'rgba(148,163,184,0.4)',
  weak:   'rgba(100,116,139,0.2)',
};

// ─── Mock Data ────────────────────────────────────────────────
const INITIAL_NODES: GraphNode[] = [
  { id: 'apms', label: 'APMS Corp', type: 'center', x: 540, y: 340, size: 44,
    industry: 'Business Intelligence', revenue: '—', score: 100, desc: 'Tổ chức của bạn — trung tâm hệ sinh thái.', status: 'active' },
  { id: 'fpt', label: 'FPT Corp', type: 'strategic', x: 280, y: 160, size: 36,
    revenue: '120B', industry: 'Technology', score: 92, contact: 'Nguyễn Văn A', since: '2022', deals: 8, tier: 'Platinum', status: 'active', desc: 'Đối tác chiến lược hàng đầu, hợp tác sâu về AI và cloud.' },
  { id: 'vin', label: 'VinGroup', type: 'strategic', x: 800, y: 160, size: 38,
    revenue: '200B', industry: 'Conglomerate', score: 95, contact: 'Đỗ Thị F', since: '2021', deals: 12, tier: 'Platinum', status: 'active', desc: 'Tập đoàn lớn nhất — đối tác BĐS, xe điện và tech.' },
  { id: 'vnpt', label: 'VNPT Group', type: 'strategic', x: 160, y: 340, size: 32,
    revenue: '95B', industry: 'Telecom', score: 85, contact: 'Trần Thị B', since: '2023', deals: 5, tier: 'Gold', status: 'active', desc: 'Đối tác viễn thông chiến lược tại khu vực phía Bắc.' },
  { id: 'vt', label: 'Viettel Digital', type: 'strategic', x: 920, y: 340, size: 32,
    revenue: '78B', industry: 'Technology', score: 88, contact: 'Lê Văn C', since: '2022', deals: 6, tier: 'Gold', status: 'active', desc: 'Chuyển đổi số và hạ tầng kỹ thuật số toàn quốc.' },
  { id: 'cmc', label: 'CMC Tech', type: 'operational', x: 360, y: 500, size: 28,
    revenue: '45B', industry: 'IT Services', score: 74, contact: 'Phạm D', since: '2023', deals: 3, tier: 'Silver', status: 'review', desc: 'Dịch vụ CNTT và tích hợp hệ thống cho dự án vừa.' },
  { id: 'momo', label: 'MoMo', type: 'operational', x: 660, y: 500, size: 26,
    revenue: '32B', industry: 'FinTech', score: 69, contact: 'Hoàng E', since: '2024', deals: 2, tier: 'Silver', status: 'watch', desc: 'Hợp tác thanh toán số và mở rộng kênh phân phối.' },
  { id: 'saco', label: 'Sacombank', type: 'operational', x: 180, y: 520, size: 24,
    revenue: '620B tài sản', industry: 'Banking', score: 71, contact: 'Vũ G', since: '2023', deals: 2, tier: 'Silver', status: 'active', desc: 'Đối tác ngân hàng cho thanh toán và tài trợ vốn.' },
  { id: 'agr', label: 'AgroTech VN', type: 'operational', x: 820, y: 510, size: 22,
    revenue: '3B', industry: 'Agriculture', score: 62, contact: 'Mai H', since: '2024', deals: 1, tier: 'Bronze', status: 'active', desc: 'Hợp tác phân tích dữ liệu nông nghiệp và chuỗi cung ứng.' },
  { id: 'thmilk', label: 'TH True Milk', type: 'potential', x: 450, y: 100, size: 26,
    revenue: '12B', industry: 'FMCG', score: 58, desc: 'Tiềm năng hợp tác kênh phân phối sản phẩm FMCG.', status: 'prospect' },
  { id: 'vina', label: 'Vinamilk', type: 'potential', x: 660, y: 80, size: 28,
    revenue: '60B', industry: 'FMCG', score: 64, desc: 'Mở rộng hợp tác phân tích thị trường sữa và FMCG.', status: 'prospect' },
  { id: 'techv', label: 'TechVision', type: 'potential', x: 960, y: 500, size: 22,
    revenue: '5B', industry: 'Technology', score: 55, desc: 'Startup công nghệ đang tìm kiếm đối tác chiến lược.', status: 'prospect' },
  { id: 'green', label: 'Green Energy', type: 'potential', x: 120, y: 200, size: 20,
    revenue: '8B', industry: 'Energy', score: 51, desc: 'Năng lượng tái tạo — cơ hội hợp tác ESG 2026.', status: 'prospect' },
  { id: 'delo', label: 'Deloitte VN', type: 'competitor', x: 380, y: 620, size: 30,
    revenue: '25B', industry: 'Consulting', score: 85, risk: 'High', desc: 'Đối thủ trực tiếp trong mảng tư vấn và phân tích thị trường.', status: 'active' },
  { id: 'pwc', label: 'PwC Vietnam', type: 'competitor', x: 700, y: 620, size: 28,
    revenue: '20B', industry: 'Audit', score: 80, risk: 'High', desc: 'Cạnh tranh mảng kiểm toán và advisory cho DN lớn.', status: 'active' },
  { id: 'kpmg', label: 'KPMG VN', type: 'competitor', x: 540, y: 660, size: 24,
    revenue: '14B', industry: 'Advisory', score: 72, risk: 'Medium', desc: 'Đối thủ mảng advisory và digital transformation.', status: 'active' },
  { id: 'mck', label: 'McKinsey VN', type: 'competitor', x: 220, y: 660, size: 22,
    revenue: '10B', industry: 'Strategy', score: 68, risk: 'Medium', desc: 'Tư vấn chiến lược cao cấp, ít chồng chéo hơn.', status: 'active' },
];

const EDGES: GraphEdge[] = [
  { id: 'e1',  source: 'apms', target: 'fpt',    label: 'Technology Alliance', strength: 'strong' },
  { id: 'e2',  source: 'apms', target: 'vin',    label: 'Strategic MOU',       strength: 'strong' },
  { id: 'e3',  source: 'apms', target: 'vnpt',   label: 'Telecom Backbone',    strength: 'strong' },
  { id: 'e4',  source: 'apms', target: 'vt',     label: 'Digital Partnership', strength: 'strong' },
  { id: 'e5',  source: 'apms', target: 'cmc',    label: 'IT Services',         strength: 'medium' },
  { id: 'e6',  source: 'apms', target: 'momo',   label: 'Payments',            strength: 'medium' },
  { id: 'e7',  source: 'apms', target: 'saco',   label: 'Banking Partner',     strength: 'medium' },
  { id: 'e8',  source: 'apms', target: 'agr',    label: 'Data Analytics',      strength: 'weak' },
  { id: 'e9',  source: 'apms', target: 'thmilk', label: 'Prospecting',         strength: 'weak' },
  { id: 'e10', source: 'apms', target: 'vina',   label: 'Exploring',           strength: 'weak' },
  { id: 'e11', source: 'apms', target: 'techv',  label: 'Evaluating',          strength: 'weak' },
  { id: 'e12', source: 'apms', target: 'green',  label: 'ESG Opportunity',     strength: 'weak' },
  { id: 'e13', source: 'fpt',  target: 'vnpt',   label: 'B2B Contract',        strength: 'medium' },
  { id: 'e14', source: 'vin',  target: 'vt',     label: 'Joint Venture',       strength: 'medium' },
  { id: 'e15', source: 'fpt',  target: 'cmc',    label: 'Supply Chain',        strength: 'weak' },
  { id: 'e16', source: 'vin',  target: 'momo',   label: 'Payment Integration', strength: 'medium' },
  { id: 'e17', source: 'delo', target: 'pwc',    label: 'Cạnh tranh trực tiếp', strength: 'medium' },
  { id: 'e18', source: 'delo', target: 'kpmg',   label: 'Cạnh tranh Advisory', strength: 'weak' },
  { id: 'e19', source: 'saco', target: 'momo',   label: 'Thanh toán liên kết', strength: 'weak' },
  { id: 'e20', source: 'fpt',  target: 'vin',    label: 'Technology for VinFast', strength: 'medium' },
];

// ─── KPIs ─────────────────────────────────────────────────────
const KPI_DATA = [
  { label: 'Total Partners',      value: 8,  sub: '+2 this quarter', color: '#059669', bg: 'rgba(5,150,105,0.12)' },
  { label: 'Competitors Tracked', value: 4,  sub: '2 high threat',   color: '#DC2626', bg: 'rgba(220,38,38,0.12)' },
  { label: 'Opportunities',       value: 23, sub: '4 closing soon',  color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
  { label: 'Active Risks',        value: 4,  sub: '1 critical',      color: '#7C3AED', bg: 'rgba(124,58,237,0.12)' },
];

// ─── Minimap ──────────────────────────────────────────────────
const Minimap: React.FC<{
  nodes: GraphNode[];
  visibleNodeIds: Set<string>;
  transform: { x: number; y: number; scale: number };
  selectedId: string | null;
  canvasW: number;
  canvasH: number;
}> = ({ nodes, visibleNodeIds, transform, selectedId, canvasW, canvasH }) => {
  const W = 160, H = 100;
  const pad = 20;
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
  const scl = Math.min(W / rangeX, H / rangeY);

  // Viewport rect
  const vpW = (canvasW / transform.scale) * scl;
  const vpH = (canvasH / transform.scale) * scl;
  const vpX = (-transform.x / transform.scale - minX) * scl;
  const vpY = (-transform.y / transform.scale - minY) * scl;

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16, width: W, height: H,
      background: 'rgba(10,15,30,0.85)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, overflow: 'hidden', backdropFilter: 'blur(8px)',
    }}>
      <svg width={W} height={H}>
        {/* Viewport indicator */}
        <rect x={vpX} y={vpY} width={vpW} height={vpH}
              fill="rgba(37,99,235,0.15)" stroke="#2563EB" strokeWidth="1" rx="2" />
        {/* Nodes */}
        {nodes.filter(n => visibleNodeIds.has(n.id)).map(n => {
          const clr = NODE_COLORS[n.type];
          return (
            <circle
              key={n.id}
              cx={(n.x - minX) * scl}
              cy={(n.y - minY) * scl}
              r={selectedId === n.id ? 4 : 2.5}
              fill={clr.fill}
              opacity={selectedId === n.id ? 1 : 0.7}
            />
          );
        })}
      </svg>
    </div>
  );
};

// ─── Tooltip ──────────────────────────────────────────────────
const EdgeTooltip: React.FC<{
  edge: GraphEdge;
  nodes: GraphNode[];
  mousePos: { x: number; y: number };
}> = ({ edge, nodes, mousePos }) => {
  const s = nodes.find(n => n.id === edge.source);
  const t = nodes.find(n => n.id === edge.target);
  if (!s || !t) return null;
  return (
    <div style={{
      position: 'fixed', left: mousePos.x + 12, top: mousePos.y - 10,
      background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#CBD5E1',
      pointerEvents: 'none', zIndex: 1000, backdropFilter: 'blur(8px)',
      maxWidth: 240, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: '#F1F5F9' }}>{edge.label || 'Connection'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: NODE_COLORS[s.type].fill }} />
        <span>{s.label}</span>
        <span style={{ color: '#475569' }}>→</span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: NODE_COLORS[t.type].fill }} />
        <span>{t.label}</span>
      </div>
      <div style={{ marginTop: 4, color: '#64748B', fontSize: 10 }}>
        Cường độ: {edge.strength === 'strong' ? 'Mạnh' : edge.strength === 'medium' ? 'Trung bình' : 'Yếu'}
      </div>
    </div>
  );
};

interface RelationshipMapProps {
  setActivePage?: (page: string) => void;
}

// ─── Main Component ───────────────────────────────────────────
export const RelationshipMap: React.FC<RelationshipMapProps> = ({ setActivePage }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<GraphNode[]>(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [edgeMousePos, setEdgeMousePos] = useState({ x: 0, y: 0 });
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(
    new Set(['center', 'strategic', 'operational', 'potential', 'competitor'])
  );
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ w: 1200, h: 700 });

  const velocitiesRef = useRef<Record<string, { vx: number; vy: number }>>({});

  // Drag & Pan refs
  const draggingNode = useRef<{ id: string; startX: number; startY: number; mouseX: number; mouseY: number } | null>(null);
  const panningRef = useRef<{ startX: number; startY: number; transformX: number; transformY: number } | null>(null);
  const isPanning = useRef(false);
  const hasDragged = useRef(false);

  // Track canvas size
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setCanvasSize({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Force simulation effect
  useEffect(() => {
    if (!isSimulating) return;

    let animFrame: number;
    
    const tick = () => {
      setNodes(prevNodes => {
        const vels = { ...velocitiesRef.current };
        prevNodes.forEach(n => {
          if (!vels[n.id]) {
            vels[n.id] = { vx: 0, vy: 0 };
          }
        });

        const cx = 540;
        const cy = 340;

        const nextNodes = prevNodes.map(n => {
          if (draggingNode.current && draggingNode.current.id === n.id) {
            vels[n.id] = { vx: 0, vy: 0 };
            return n;
          }

          let { vx, vy } = vels[n.id];

          // 1. Gravity / Center pull force
          const gravity = n.type === 'center' ? 0.08 : 0.01;
          vx += (cx - n.x) * gravity;
          vy += (cy - n.y) * gravity;

          // 2. Repulsion force
          prevNodes.forEach(other => {
            if (other.id === n.id) return;
            const dx = n.x - other.x;
            const dy = n.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minAllowedDist = (n.size + other.size) * 2.2;
            if (dist < minAllowedDist) {
              const force = (minAllowedDist - dist) * 0.05;
              vx += (dx / dist) * force;
              vy += (dy / dist) * force;
            }
          });

          // 3. Connection / Link force
          EDGES.forEach(edge => {
            let otherId = '';
            if (edge.source === n.id) otherId = edge.target;
            else if (edge.target === n.id) otherId = edge.source;
            else return;

            const other = prevNodes.find(o => o.id === otherId);
            if (!other) return;

            const dx = other.x - n.x;
            const dy = other.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            let desiredDist = 180;
            if (n.type === 'center' || other.type === 'center') {
              desiredDist = 160;
            }
            if (edge.strength === 'strong') desiredDist = 130;
            else if (edge.strength === 'weak') desiredDist = 240;

            const force = (dist - desiredDist) * 0.025;
            vx += (dx / dist) * force;
            vy += (dy / dist) * force;
          });

          // Damping
          vx *= 0.75;
          vy *= 0.75;

          vels[n.id] = { vx, vy };

          const limitX = Math.max(50, Math.min(1050, n.x + vx));
          const limitY = Math.max(50, Math.min(650, n.y + vy));

          return {
            ...n,
            x: limitX,
            y: limitY
          };
        });

        velocitiesRef.current = vels;
        return nextNodes;
      });

      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isSimulating]);

  // Filtered
  const visibleNodes = useMemo(() => nodes.filter(n => {
    if (!activeFilters.has(n.type)) return false;
    if (searchQuery === '') return true;
    const q = searchQuery.toLowerCase();
    return n.label.toLowerCase().includes(q) || (n.industry || '').toLowerCase().includes(q);
  }), [nodes, activeFilters, searchQuery]);

  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map(n => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(() => EDGES.filter(
    e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  ), [visibleNodeIds]);

  // Search highlight
  const searchMatchIds = useMemo(() => {
    if (searchQuery === '') return new Set<string>();
    const q = searchQuery.toLowerCase();
    return new Set(nodes.filter(n =>
      n.label.toLowerCase().includes(q) || (n.industry || '').toLowerCase().includes(q)
    ).map(n => n.id));
  }, [nodes, searchQuery]);

  // Connected nodes
  const connectedIds = useMemo(() => {
    if (!selectedNode) return null;
    return new Set(EDGES
      .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
      .flatMap(e => [e.source, e.target]));
  }, [selectedNode]);

  // ── Handlers ──
  const toggleFilter = (type: NodeType) => {
    if (type === 'center') return;
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const zoom = useCallback((delta: number) => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.3, Math.min(3, prev.scale + delta)),
    }));
  }, []);

  const resetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
    setSelectedNode(null);
  };

  const centerOnNode = useCallback((node: GraphNode) => {
    const cx = canvasSize.w / 2;
    const cy = canvasSize.h / 2;
    setTransform({
      x: cx - node.x,
      y: cy - node.y,
      scale: 1.2,
    });
  }, [canvasSize]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.1 : -0.1);
  }, [zoom]);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Node drag
  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    hasDragged.current = false;
    const node = nodes.find(n => n.id === nodeId)!;
    draggingNode.current = { id: nodeId, startX: node.x, startY: node.y, mouseX: e.clientX, mouseY: e.clientY };
  };

  // Canvas pan
  const onSvgMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isPanning.current = true;
    hasDragged.current = false;
    panningRef.current = { startX: e.clientX, startY: e.clientY, transformX: transform.x, transformY: transform.y };
  };

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode.current) {
      hasDragged.current = true;
      const { id, startX, startY, mouseX, mouseY } = draggingNode.current;
      const dx = (e.clientX - mouseX) / transform.scale;
      const dy = (e.clientY - mouseY) / transform.scale;
      setNodes(prev => prev.map(n => n.id === id ? { ...n, x: startX + dx, y: startY + dy } : n));
    } else if (isPanning.current && panningRef.current) {
      hasDragged.current = true;
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      setTransform(prev => ({ ...prev, x: panningRef.current!.transformX + dx, y: panningRef.current!.transformY + dy }));
    }
  }, [transform.scale]);

  const onMouseUp = () => {
    draggingNode.current = null;
    isPanning.current = false;
    panningRef.current = null;
  };

  const onNodeClick = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    if (hasDragged.current) return;
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  };

  const onCanvasClick = () => {
    if (!hasDragged.current) setSelectedNode(null);
  };

  // Fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(f => !f);
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Edge path
  const getEdgePath = useCallback((edge: GraphEdge) => {
    const s = nodes.find(n => n.id === edge.source);
    const t = nodes.find(n => n.id === edge.target);
    if (!s || !t) return '';
    // Curved path offset perpendicular to line
    const dx = t.x - s.x, dy = t.y - s.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const curve = Math.min(len * 0.15, 40);
    const mx = (s.x + t.x) / 2 + (-dy / len) * curve;
    const my = (s.y + t.y) / 2 + (dx / len) * curve;
    return `M${s.x},${s.y} Q${mx},${my} ${t.x},${t.y}`;
  }, [nodes]);

  // Export as PNG
  const handleExport = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgEl);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ecosystem-relationship-map.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Search auto-center
  useEffect(() => {
    if (searchMatchIds.size === 1) {
      const id = Array.from(searchMatchIds)[0];
      const node = nodes.find(n => n.id === id);
      if (node) {
        centerOnNode(node);
        setSelectedNode(node);
      }
    }
  }, [searchMatchIds, nodes, centerOnNode]);

  return (
    <div ref={containerRef} style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 64px)',
      background: '#0A0F1E', color: '#E2E8F0', fontFamily: "'Inter', sans-serif", userSelect: 'none',
    }}>
      {/* ── Header ── */}
      <div style={{ padding: '16px 24px 12px', background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#F1F5F9', margin: 0, letterSpacing: '-0.3px' }}>
              Ecosystem Relationship Map
            </h1>
            <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
              Bản đồ hệ sinh thái đối tác — {visibleNodes.length} nodes · {visibleEdges.length} connections
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm node..." style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: '7px 14px 7px 34px', color: '#F1F5F9', fontSize: 13,
                  outline: 'none', width: 220, fontFamily: 'inherit', transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = '#2563EB')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                }}>×</button>
              )}
            </div>
            {[
              { label: '−', action: () => zoom(-0.2), title: 'Zoom out' },
              { label: '+', action: () => zoom(0.2),  title: 'Zoom in'  },
            ].map(btn => (
              <button key={btn.label} title={btn.title} onClick={btn.action} style={btnStyle}>
                <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 700 }}>{btn.label}</span>
              </button>
            ))}
            <button title="Reset view" onClick={resetView} style={btnStyle}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
              </svg>
            </button>
            <button title={isSimulating ? 'Dừng mô phỏng lực' : 'Chạy mô phỏng lực'}
              onClick={() => setIsSimulating(p => !p)}
              style={{ ...btnStyle, background: isSimulating ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)', color: isSimulating ? '#34D399' : '#94A3B8' }}>
              {isSimulating ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="5" y="5" width="14" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              )}
            </button>
            <button title={showMinimap ? 'Ẩn minimap' : 'Hiện minimap'}
              onClick={() => setShowMinimap(p => !p)}
              style={{ ...btnStyle, background: showMinimap ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.06)', color: showMinimap ? '#60A5FA' : '#94A3B8' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><rect x="13" y="13" width="8" height="8" rx="1"/>
              </svg>
            </button>
            <button title="Xuất SVG" onClick={handleExport} style={btnStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
            <button title={isFullscreen ? 'Thoát' : 'Toàn màn hình'} onClick={toggleFullscreen} style={btnStyle}>
              {isFullscreen
                ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
              }
            </button>
            <span style={{ fontSize: 12, color: '#475569', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.06)' }}>
              {Math.round(transform.scale * 100)}%
            </span>
          </div>
        </div>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {KPI_DATA.map((k, i) => (
            <div key={i} style={{ background: k.bg, border: `1px solid ${k.color}30`, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: k.color, lineHeight: 1, letterSpacing: '-1px' }}>{k.value}</div>
              <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {/* ── Left Panel ── */}
        <div style={{ width: 200, flexShrink: 0, background: 'rgba(15,23,42,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          <div>
            <div style={sectionLabel}>Loại đối tượng</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(Object.entries(NODE_COLORS) as [NodeType, typeof NODE_COLORS[NodeType]][]).map(([type, clr]) => {
                const active = activeFilters.has(type);
                const count = nodes.filter(n => n.type === type).length;
                return (
                  <button key={type} onClick={() => toggleFilter(type)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: 'none',
                    background: active ? clr.bg : 'transparent', cursor: type === 'center' ? 'default' : 'pointer',
                    outline: active ? `1px solid ${clr.fill}40` : '1px solid transparent',
                    transition: 'all 0.15s', width: '100%', textAlign: 'left', fontFamily: 'inherit', opacity: active ? 1 : 0.4,
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: clr.fill, flexShrink: 0, boxShadow: active ? `0 0 8px ${clr.fill}` : 'none' }} />
                    <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: active ? '#E2E8F0' : '#94A3B8', lineHeight: 1.3 }}>{clr.label}</div>
                    <span style={{ fontSize: 11, color: '#475569', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 10 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div style={sectionLabel}>Cường độ liên kết</div>
            {[
              { s: 'strong', label: 'Mạnh',  color: '#6366F1', w: 2.5 },
              { s: 'medium', label: 'Trung bình', color: '#94A3B8', w: 1.5 },
              { s: 'weak',   label: 'Yếu',   color: '#334155', w: 1 },
            ].map(({ s, label, color, w }) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <svg width="32" height="10" viewBox="0 0 32 10">
                  <line x1="0" y1="5" x2="32" y2="5" stroke={color} strokeWidth={w} strokeDasharray={s === 'weak' ? '4,3' : undefined} />
                </svg>
                <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
              </div>
            ))}
          </div>
          <div>
            <div style={sectionLabel}>Thống kê</div>
            {[
              { l: 'Nodes hiển thị', v: String(visibleNodes.length) },
              { l: 'Connections', v: String(visibleEdges.length) },
              { l: 'Zoom', v: `${Math.round(transform.scale * 100)}%` },
              { l: 'Tìm kiếm', v: searchMatchIds.size > 0 ? `${searchMatchIds.size} kết quả` : '—' },
            ].map(s => (
              <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <span style={{ color: '#64748B' }}>{s.l}</span>
                <span style={{ color: '#94A3B8', fontWeight: 700 }}>{s.v}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 'auto' }}>
            <button onClick={resetView} style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#94A3B8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Reset tất cả
            </button>
          </div>
        </div>

        {/* ── SVG Canvas ── */}
        <div ref={canvasRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'radial-gradient(ellipse at 50% 50%, #0F172A 0%, #060912 100%)' }}>
          {/* Grid dots */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
              <pattern id="gridDots" x={transform.x % 40} y={transform.y % 40} width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="0" cy="0" r="0.8" fill="rgba(99,102,241,0.12)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#gridDots)" />
          </svg>

          {/* Main SVG */}
          <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: 'grab' }}
            onMouseDown={onSvgMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp} onClick={onCanvasClick}>
            <defs>
              {Object.entries(NODE_COLORS).map(([type, clr]) => (
                <radialGradient key={type} id={`grad-${type}`} cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor={clr.stroke} /><stop offset="100%" stopColor={clr.fill} />
                </radialGradient>
              ))}
              {/* Animated dash for strong edges */}
              <style>{`
                @keyframes edgeFlow { from { stroke-dashoffset: 20; } to { stroke-dashoffset: 0; } }
                .edge-animated { animation: edgeFlow 1.5s linear infinite; }
              `}</style>
            </defs>

            <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
              {/* Edges */}
              {visibleEdges.map(edge => {
                const s = nodes.find(n => n.id === edge.source);
                const t = nodes.find(n => n.id === edge.target);
                if (!s || !t) return null;
                const highlighted = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
                const dimmed = selectedNode && !highlighted;
                const isHovered = hoveredEdge?.id === edge.id;

                return (
                  <g key={edge.id} opacity={dimmed ? 0.08 : highlighted || isHovered ? 1 : 0.6}>
                    {/* Hit area (invisible, wider) */}
                    <path d={getEdgePath(edge)} fill="none" stroke="transparent" strokeWidth="12" style={{ cursor: 'pointer' }}
                      onMouseEnter={e => { setHoveredEdge(edge); setEdgeMousePos({ x: e.clientX, y: e.clientY }); }}
                      onMouseMove={e => setEdgeMousePos({ x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setHoveredEdge(null)}
                    />
                    {/* Visible edge */}
                    <path d={getEdgePath(edge)} fill="none"
                      stroke={highlighted || isHovered ? '#818CF8' : EDGE_COLORS[edge.strength]}
                      strokeWidth={highlighted || isHovered ? 2.5 : edge.strength === 'strong' ? 2 : edge.strength === 'medium' ? 1.5 : 1}
                      strokeDasharray={edge.strength === 'weak' ? '5,4' : undefined}
                      style={highlighted && edge.strength === 'strong' ? { strokeDasharray: '10,10', animation: 'edgeFlow 1.5s linear infinite' } : undefined}
                    />
                    {/* Edge label on highlight */}
                    {(highlighted || isHovered) && edge.label && (() => {
                      const mx = (s.x + t.x) / 2 + (-(t.y - s.y) / (Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2)||1)) * Math.min(Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2) * 0.15, 40);
                      const my = (s.y + t.y) / 2 + ((t.x - s.x) / (Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2)||1)) * Math.min(Math.sqrt((t.x-s.x)**2+(t.y-s.y)**2) * 0.15, 40) - 10;
                      return (
                        <g>
                          <rect x={mx - edge.label.length * 3.2} y={my - 9} width={edge.label.length * 6.4} height={16}
                                rx="4" fill="rgba(15,23,42,0.9)" stroke="rgba(99,102,241,0.3)" strokeWidth="0.5" />
                          <text x={mx} y={my + 3} textAnchor="middle" fill="#818CF8" fontSize="9" fontWeight="600">{edge.label}</text>
                        </g>
                      );
                    })()}
                  </g>
                );
              })}

              {/* Nodes */}
              {visibleNodes.map(node => {
                const clr = NODE_COLORS[node.type];
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode === node.id;
                const isDimmed = selectedNode && !isSelected && !(connectedIds?.has(node.id));
                const isConnected = connectedIds?.has(node.id) && !isSelected;
                const isSearchMatch = searchMatchIds.size > 0 && searchMatchIds.has(node.id);
                const scale = isSelected ? 1.2 : isHovered ? 1.08 : 1;

                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`} style={{ cursor: 'pointer' }}
                    onMouseDown={e => onNodeMouseDown(e, node.id)} onClick={e => onNodeClick(e, node)}
                    onMouseEnter={() => setHoveredNode(node.id)} onMouseLeave={() => setHoveredNode(null)}
                    opacity={isDimmed ? 0.12 : 1}>

                    {/* Search pulse ring */}
                    {isSearchMatch && !isSelected && (
                      <circle r={node.size + 16} fill="none" stroke={clr.stroke} strokeWidth="2" opacity="0.6"
                        style={{ animation: 'pulse 1.5s ease infinite' }} />
                    )}

                    {/* Glow ring */}
                    {(isSelected || isConnected) && (
                      <circle r={node.size + (isSelected ? 14 : 8)} fill="none" stroke={clr.stroke}
                        strokeWidth={isSelected ? 2 : 1} opacity={isSelected ? 0.6 : 0.3}
                        style={{ filter: `drop-shadow(0 0 8px ${clr.fill})` }} />
                    )}
                    {isSelected && (
                      <>
                        <circle r={node.size + 22} fill={clr.fill} opacity="0.06" />
                        <circle r={node.size + 30} fill={clr.fill} opacity="0.03" />
                      </>
                    )}

                    {/* Main circle */}
                    <circle r={node.size * scale} fill={`url(#grad-${node.type})`}
                      stroke={isSelected || isHovered ? clr.stroke : `${clr.stroke}60`}
                      strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
                      style={{
                        filter: isSelected || isHovered ? `drop-shadow(0 0 12px ${clr.glow})` : undefined,
                        transition: 'all 0.15s ease',
                      }}
                    />
                    {/* Score inside */}
                    <text textAnchor="middle" dominantBaseline="middle" fill="#fff"
                      fontSize={node.size > 30 ? 12 : 10} fontWeight={700} style={{ pointerEvents: 'none' }}>
                      {node.type === 'competitor' ? (node.risk?.[0] || '') : node.score}
                    </text>
                    {/* Label */}
                    <text y={node.size * scale + 16} textAnchor="middle"
                      fill={isSelected ? '#F1F5F9' : isHovered ? '#CBD5E1' : isSearchMatch ? '#A78BFA' : '#94A3B8'}
                      fontSize={11} fontWeight={isSelected || isSearchMatch ? 700 : 500}
                      style={{ pointerEvents: 'none', transition: 'fill 0.15s' }}>
                      {node.label}
                    </text>
                    {/* Hover tooltip */}
                    {isHovered && !isSelected && !draggingNode.current && (
                      <g>
                        <rect x={-80} y={-(node.size + 48)} width={160} height={32} rx="6"
                              fill="rgba(15,23,42,0.95)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                        <text x={0} y={-(node.size + 35)} textAnchor="middle" fill="#94A3B8" fontSize="10">
                          {node.industry || node.type} · {node.revenue || '—'}
                        </text>
                        <text x={0} y={-(node.size + 23)} textAnchor="middle" fill="#F1F5F9" fontSize="10" fontWeight="600">
                          Score: {node.score || '—'}{node.tier ? ` · ${node.tier}` : ''}{node.risk ? ` · Risk: ${node.risk}` : ''}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Edge tooltip (fixed position) */}
          {hoveredEdge && <EdgeTooltip edge={hoveredEdge} nodes={nodes} mousePos={edgeMousePos} />}

          {/* Minimap */}
          {showMinimap && (
            <Minimap nodes={nodes} visibleNodeIds={visibleNodeIds} transform={transform}
              selectedId={selectedNode?.id || null} canvasW={canvasSize.w} canvasH={canvasSize.h} />
          )}

          {/* Instructions */}
          {!selectedNode && (
            <div style={{
              position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
              padding: '6px 16px', fontSize: 11, color: '#475569',
              display: 'flex', gap: 16, pointerEvents: 'none',
            }}>
              <span>Kéo node để di chuyển</span><span>·</span>
              <span>Cuộn chuột để zoom</span><span>·</span>
              <span>Click node để xem chi tiết</span><span>·</span>
              <span>Kéo nền để pan</span>
            </div>
          )}

          {/* Pulse keyframe for search */}
          <style>{`@keyframes pulse { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.1)} }`}</style>
        </div>

        {/* ── Right Detail Panel ── */}
        <div style={{
          width: selectedNode ? 300 : 0, flexShrink: 0, overflow: 'hidden',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          background: 'rgba(15,23,42,0.98)', borderLeft: '1px solid rgba(255,255,255,0.06)',
        }}>
          {selectedNode && (() => {
            const clr = NODE_COLORS[selectedNode.type];
            const relEdges = EDGES.filter(e => e.source === selectedNode.id || e.target === selectedNode.id);
            const relatedIds = relEdges.map(e => e.source === selectedNode.id ? e.target : e.source);
            const relatedNodes = nodes.filter(n => relatedIds.includes(n.id));

            return (
              <div style={{ width: 300, padding: '20px 16px', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 7, padding: '4px 10px', borderRadius: 20,
                      background: clr.bg, border: `1px solid ${clr.fill}40`, fontSize: 11, fontWeight: 700, color: clr.stroke,
                    }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: clr.fill }} />
                      {clr.label}
                    </div>
                    <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#F1F5F9', marginBottom: 4 }}>{selectedNode.label}</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>{selectedNode.industry || '—'}</div>
                </div>

                {/* Score */}
                {selectedNode.score !== undefined && (
                  <div style={{ padding: 14, background: clr.bg, border: `1px solid ${clr.fill}25`, borderRadius: 10 }}>
                    <div style={{ fontSize: 10, color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      {selectedNode.type === 'competitor' ? 'Threat Level' : 'Partnership Score'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{
                          width: `${selectedNode.score}%`, height: '100%', borderRadius: 4,
                          background: `linear-gradient(90deg, ${clr.fill}, ${clr.stroke})`, transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 18, fontWeight: 900, color: clr.stroke, minWidth: 36 }}>{selectedNode.score}</span>
                    </div>
                  </div>
                )}

                {/* Info fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {[
                    { l: 'Doanh thu',  v: selectedNode.revenue },
                    { l: 'Liên hệ',    v: selectedNode.contact },
                    { l: 'Đối tác từ', v: selectedNode.since },
                    { l: 'Hợp đồng',   v: selectedNode.deals ? `${selectedNode.deals} hợp đồng` : undefined },
                    { l: 'Tier',       v: selectedNode.tier },
                    { l: 'Rủi ro',     v: selectedNode.risk },
                    { l: 'Trạng thái', v: selectedNode.status },
                  ].filter(f => f.v).map(f => (
                    <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                      <span style={{ color: '#64748B' }}>{f.l}</span>
                      <span style={{ color: '#CBD5E1', fontWeight: 600 }}>{f.v}</span>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {selectedNode.desc && (
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>
                    {selectedNode.desc}
                  </div>
                )}

                {/* Related nodes */}
                {relatedNodes.length > 0 && (
                  <div>
                    <div style={sectionLabel}>Kết nối ({relatedNodes.length})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {relatedNodes.map(rn => {
                        const rc = NODE_COLORS[rn.type];
                        const edge = relEdges.find(e => e.source === rn.id || e.target === rn.id);
                        return (
                          <button key={rn.id} onClick={e => { e.stopPropagation(); setSelectedNode(rn); centerOnNode(rn); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                              borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', width: '100%', textAlign: 'left',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: rc.fill, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#CBD5E1' }}>{rn.label}</div>
                              {edge?.label && <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{edge.label}</div>}
                            </div>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                  <button onClick={() => centerOnNode(selectedNode)} style={{ padding: '9px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${clr.fill}, ${clr.stroke})`, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Tập trung vào node
                  </button>
                  {setActivePage && selectedNode.id !== 'apms' && (
                    <button onClick={() => setActivePage('company-detail')} style={{ padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#CBD5E1', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Xem hồ sơ đầy đủ
                    </button>
                  )}
                  <button style={{ padding: '8px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Phân tích quan hệ
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

// ─── Style helpers ────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: '#94A3B8', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s', fontFamily: 'inherit',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#475569',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10,
};
