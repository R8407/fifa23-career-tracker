import React from 'react';
import { Zap } from 'lucide-react';

export interface RadarAttributes {
  pace: number | string;
  shooting: number | string;
  passing: number | string;
  dribbling: number | string;
  defending: number | string;
  physical: number | string;
}

const CATEGORIES: { key: keyof RadarAttributes; label: string }[] = [
  { key: 'pace', label: 'PAC' },
  { key: 'shooting', label: 'SHO' },
  { key: 'passing', label: 'PAS' },
  { key: 'dribbling', label: 'DRI' },
  { key: 'defending', label: 'DEF' },
  { key: 'physical', label: 'PHY' },
];

interface AttributeRadarProps {
  attributes: RadarAttributes;
  size?: number;
  color?: string;
  className?: string;
}

export const AttributeRadar: React.FC<AttributeRadarProps> = ({
  attributes,
  size = 280,
  color = '#f59e0b',
  className = '',
}) => {
  const center = size / 2;
  const radius = size / 2 - 42;

  const point = (idx: number, r: number) => {
    const angle = (Math.PI * 2 / CATEGORIES.length) * idx - Math.PI / 2;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const valueFor = (key: keyof RadarAttributes) => {
    const raw = attributes[key];
    const n = typeof raw === 'number' ? raw : parseInt(raw || '0', 10);
    return Math.min(99, Math.max(0, Number.isFinite(n) ? n : 0));
  };

  const dataPath = CATEGORIES.map((c, idx) => {
    const { x, y } = point(idx, (valueFor(c.key) / 99) * radius);
    return `${x},${y}`;
  }).join(' ');

  const webLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-xs font-bold uppercase text-zinc-400 mb-2 flex items-center gap-1.5">
        <Zap className="w-4 h-4 text-amber-400" /> Attribute Radar
      </div>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto overflow-visible">
        {webLevels.map((level) => {
          const pts = CATEGORIES.map((_, idx) => {
            const { x, y } = point(idx, radius * level);
            return `${x},${y}`;
          }).join(' ');
          return (
            <polygon key={level} points={pts} fill="none" stroke="#27272a" strokeWidth="1" />
          );
        })}

        {CATEGORIES.map((c, idx) => {
          const { x: x2, y: y2 } = point(idx, radius);
          const { x: lx, y: ly } = point(idx, radius + 24);
          const val = valueFor(c.key);
          return (
            <g key={c.key}>
              <line x1={center} y1={center} x2={x2} y2={y2} stroke="#3f3f46" strokeWidth="1" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#a1a1aa"
                fontSize="11"
                fontWeight="bold"
              >
                {c.label}
              </text>
              <text
                x={x2}
                y={y2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={val >= 85 ? '#34d399' : val >= 75 ? '#fbbf24' : '#a1a1aa'}
                fontSize="12"
                fontWeight="black"
                dy="-10"
              >
                {val}
              </text>
            </g>
          );
        })}

        <polygon points={dataPath} fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
      </svg>
    </div>
  );
};
