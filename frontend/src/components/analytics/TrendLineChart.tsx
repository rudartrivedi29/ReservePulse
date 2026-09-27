import React, { useState } from 'react';
import { type TimelineDataPoint } from '../../services/analytics.service';

interface TrendLineChartProps {
  data: TimelineDataPoint[];
  height?: number;
}

export const TrendLineChart: React.FC<TrendLineChartProps> = ({
  data,
  height = 260,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl"
        style={{ height }}
      >
        No timeline data available for the selected timeframe.
      </div>
    );
  }

  const padding = { top: 20, right: 25, bottom: 35, left: 35 };
  const width = 600; // SVG viewBox coordinate width
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxTotal = Math.max(...data.map((d) => d.total), 5);
  // Add 15% headroom to max
  const yMax = Math.ceil(maxTotal * 1.15);

  const getX = (index: number) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / yMax) * chartHeight;
  };

  // Build SVG path points
  const totalPoints = data.map((d, i) => `${getX(i)},${getY(d.total)}`).join(' ');
  const activePoints = data.map((d, i) => `${getX(i)},${getY(d.active)}`).join(' ');

  const totalAreaPath = `
    M ${getX(0)},${getY(0)}
    ${data.map((d, i) => `L ${getX(i)},${getY(d.total)}`).join(' ')}
    L ${getX(data.length - 1)},${getY(0)}
    Z
  `;

  // Pick tick labels for X axis (maximum 7 ticks)
  const tickStep = Math.max(1, Math.ceil(data.length / 7));
  const xTicks = data.filter((_, i) => i % tickStep === 0 || i === data.length - 1);

  // Y-axis grid ticks (4 divisions)
  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), yMax];

  const activePoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="relative w-full">
      {/* Legend & Hover Info Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block shadow-xs" />
            <span className="text-slate-600 font-medium">Total Bookings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
            <span className="text-slate-600 font-medium">Active (Confirmed/Completed)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block shadow-xs" />
            <span className="text-slate-600 font-medium">Cancelled</span>
          </div>
        </div>

        {activePoint && (
          <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-2 shadow-md animate-in fade-in duration-150">
            <span className="font-semibold text-slate-200">{activePoint.label}:</span>
            <span>Total: <strong>{activePoint.total}</strong></span>
            <span className="text-emerald-300">Active: <strong>{activePoint.active}</strong></span>
            {activePoint.cancelled > 0 && (
              <span className="text-rose-300">Cancelled: <strong>{activePoint.cancelled}</strong></span>
            )}
          </div>
        )}
      </div>

      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="totalAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="activeLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-Axis Labels */}
          {yTicks.map((val, idx) => (
            <g key={`y-grid-${idx}`}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="#f1f5f9"
                strokeWidth="1"
                strokeDasharray={idx === 0 ? undefined : '3 3'}
              />
              <text
                x={padding.left - 8}
                y={getY(val) + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Area fill for Total */}
          <path d={totalAreaPath} fill="url(#totalAreaGrad)" />

          {/* Total Line (Indigo) */}
          <polyline
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={totalPoints}
          />

          {/* Active Line (Emerald / Cyan Gradient) */}
          <polyline
            fill="none"
            stroke="url(#activeLineGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={activePoints}
          />

          {/* Vertical Guides and Interactive Nodes */}
          {data.map((d, i) => {
            const cx = getX(i);
            const cyTotal = getY(d.total);
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={`node-${i}`}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {/* Invisible hover capture column */}
                <rect
                  x={cx - chartWidth / (data.length * 2)}
                  y={padding.top}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                />

                {isHovered && (
                  <line
                    x1={cx}
                    y1={padding.top}
                    x2={cx}
                    y2={padding.top + chartHeight}
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}

                {/* Node circle on Total Line */}
                <circle
                  cx={cx}
                  cy={cyTotal}
                  r={isHovered ? 5.5 : 3.5}
                  fill="#ffffff"
                  stroke="#4f46e5"
                  strokeWidth={isHovered ? 2.5 : 2}
                  className="transition-all duration-150"
                />

                {/* If active differs from total, show active node as well */}
                {d.active !== d.total && (
                  <circle
                    cx={cx}
                    cy={getY(d.active)}
                    r={isHovered ? 4.5 : 2.5}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    className="transition-all duration-150"
                  />
                )}
              </g>
            );
          })}

          {/* X-Axis Ticks */}
          {xTicks.map((d) => {
            const index = data.findIndex((item) => item.timestamp === d.timestamp);
            if (index === -1) return null;
            const cx = getX(index);
            return (
              <text
                key={`x-label-${d.timestamp}`}
                x={cx}
                y={height - 10}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-medium font-sans"
              >
                {d.label.split(',')[0]}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
