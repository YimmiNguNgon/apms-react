import React, { useEffect, useRef } from 'react';

interface NetworkGraphProps {
  onNodeClick?: (nodeId: string) => void;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({ onNodeClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const nodes = [
      { id: 'center',  label: 'Doanh nghiệp', x: cx,        y: cy,        r: 35, color: '#1E6FD9', type: 'center' },
      { id: 'fpt',     label: 'FPT',          x: cx - 180,  y: cy - 120,  r: 24, color: '#10B981', type: 'strategic' },
      { id: 'cmc',     label: 'CMC',          x: cx + 160,  y: cy - 100,  r: 22, color: '#10B981', type: 'strategic' },
      { id: 'vng',     label: 'VNG',          x: cx + 200,  y: cy + 80,   r: 22, color: '#EF4444', type: 'competitor' },
      { id: 'viettel', label: 'Viettel',      x: cx - 200,  y: cy + 100,  r: 22, color: '#F59E0B', type: 'potential' },
      { id: 'misa',    label: 'MISA',         x: cx - 60,   y: cy - 170,  r: 20, color: '#1E6FD9', type: 'active' },
      { id: 'tma',     label: 'TMA',          x: cx + 60,   y: cy - 165,  r: 20, color: '#1E6FD9', type: 'active' },
      { id: 'vnpt',    label: 'VNPT',         x: cx - 150,  y: cy + 20,   r: 20, color: '#F59E0B', type: 'potential' },
      { id: 'ntt',     label: 'NTT',          x: cx + 140,  y: cy,        r: 18, color: '#10B981', type: 'strategic' },
      { id: 'fis',     label: 'FIS',          x: cx - 40,   y: cy + 150,  r: 18, color: '#1E6FD9', type: 'active' },
      { id: 'kms',     label: 'KMS',          x: cx + 80,   y: cy + 150,  r: 18, color: '#1E6FD9', type: 'active' },
    ];

    const edges = [
      { from: 'center', to: 'fpt',     color: '#10B981', width: 3 },
      { from: 'center', to: 'cmc',     color: '#10B981', width: 2.5 },
      { from: 'center', to: 'vng',     color: '#EF4444', width: 2, dash: [5, 5] as number[] },
      { from: 'center', to: 'viettel', color: '#F59E0B', width: 2 },
      { from: 'center', to: 'misa',    color: '#1E6FD9', width: 2 },
      { from: 'center', to: 'tma',     color: '#1E6FD9', width: 2 },
      { from: 'center', to: 'vnpt',    color: '#F59E0B', width: 1.5 },
      { from: 'center', to: 'ntt',     color: '#10B981', width: 2 },
      { from: 'center', to: 'fis',     color: '#1E6FD9', width: 1.5 },
      { from: 'center', to: 'kms',     color: '#1E6FD9', width: 1.5 },
      { from: 'fpt',    to: 'ntt',     color: '#94A3B8', width: 1, dash: [3, 6] as number[] },
      { from: 'fpt',    to: 'vng',     color: '#94A3B8', width: 1, dash: [3, 6] as number[] },
    ];

    const nodeMap: Record<string, typeof nodes[0]> = {};
    nodes.forEach(n => nodeMap[n.id] = n);

    let frame = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      edges.forEach(edge => {
        const from = nodeMap[edge.from];
        const to = nodeMap[edge.to];
        ctx.beginPath();
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = edge.width;
        ctx.setLineDash(edge.dash || []);
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      nodes.forEach((node, i) => {
        const floatY = Math.sin(frame * 0.02 + i) * 2;
        const drawY = node.y + (node.type !== 'center' ? floatY : 0);

        if (node.type === 'center') {
          const glowR = node.r + 8 + Math.sin(frame * 0.03) * 3;
          const gradient = ctx.createRadialGradient(node.x, drawY, node.r, node.x, drawY, glowR);
          gradient.addColorStop(0, 'rgba(30,111,217,0.3)');
          gradient.addColorStop(1, 'rgba(30,111,217,0)');
          ctx.beginPath();
          ctx.arc(node.x, drawY, glowR, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, drawY + 2, node.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, drawY, node.r, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, drawY, node.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = node.type === 'center' ? 'bold 12px Be Vietnam Pro' : 'bold 11px Be Vietnam Pro';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.label, node.x, drawY);
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      nodes.forEach(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        if (dx * dx + dy * dy < node.r * node.r) {
          if (node.id !== 'center' && onNodeClick) {
            onNodeClick(node.id);
          }
        }
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let isOver = false;

      nodes.forEach(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        if (dx * dx + dy * dy < node.r * node.r && node.id !== 'center') {
          isOver = true;
        }
      });
      canvas.style.cursor = isOver ? 'pointer' : 'default';
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [onNodeClick]);

  return (
    <div className="graph-canvas" id="graphCanvas">
      <canvas ref={canvasRef} id="networkGraph" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};
