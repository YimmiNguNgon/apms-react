import React from 'react';

export interface HealthMetric {
  metric: string;
  score: number; // 0-100
  benchmark: number; // 0-100
}

export interface RelationshipHealthRadarProps {
  data: HealthMetric[];
  height?: number;
}

export const RelationshipHealthRadar: React.FC<RelationshipHealthRadarProps> = ({
  data,
  height = 280,
}) => {
  if (data.length < 3) {
    return <div className="workspace-empty">No relationship health data available.</div>;
  }
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.38;

  const count = data.length;
  const angleStep = (Math.PI * 2) / count;

  // Compute point coordinates for a score value at metric index
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2;
    const r = (value / 100) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Build SVG polygon points path
  const scorePoints = data.map((d, i) => getCoordinates(d.score, i));
  const benchmarkPoints = data.map((d, i) => getCoordinates(d.benchmark, i));

  const scorePath = scorePoints.map((p) => `${p.x},${p.y}`).join(' ');
  const benchmarkPath = benchmarkPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Concentric background grid rings (20%, 40%, 60%, 80%, 100%)
  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Legend Header */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '0.75rem', fontWeight: 600 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2563EB', opacity: 0.8 }} />
          Org Performance
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#7C3AED' }}>
          <span style={{ width: '10px', height: '2px', background: '#7C3AED' }} />
          Industry Benchmark
        </span>
      </div>

      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: '100%', height, maxHeight: `${height}px` }}>
        {/* Background Grid Rings */}
        {rings.map((r, rIdx) => {
          const ringPoints = data.map((_, i) => getCoordinates(r * 100, i));
          const pathStr = ringPoints.map((p) => `${p.x},${p.y}`).join(' ');
          return (
            <polygon
              key={rIdx}
              points={pathStr}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray={rIdx === rings.length - 1 ? undefined : '2 2'}
            />
          );
        })}

        {/* Axis Lines & Labels */}
        {data.map((item, i) => {
          const outerP = getCoordinates(100, i);
          const labelP = getCoordinates(115, i);

          return (
            <g key={i}>
              <line
                x1={cx}
                y1={cy}
                x2={outerP.x}
                y2={outerP.y}
                stroke="#E2E8F0"
                strokeWidth="1"
              />
              <text
                x={labelP.x}
                y={labelP.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#475569"
                fontSize="9px"
                fontWeight="600"
              >
                {item.metric}
              </text>
            </g>
          );
        })}

        {/* Benchmark Polygon */}
        <polygon
          points={benchmarkPath}
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2"
          strokeDasharray="4 3"
        />

        {/* Score Area Polygon */}
        <polygon
          points={scorePath}
          fill="#3B82F6"
          fillOpacity="0.25"
          stroke="#2563EB"
          strokeWidth="2.5"
        />

        {/* Score Data Dots */}
        {scorePoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#2563EB"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
};
