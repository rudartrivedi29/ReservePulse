import React, { useState } from 'react';
import { type StatusBreakdownItem } from '../../services/analytics.service';

interface StatusDonutChartProps {
  data: StatusBreakdownItem[];
  totalAppointments: number;
  size?: number;
}

const STATUS_COLORS: Record<string, { stroke: string; bg: string; text: string }> = {
  confirmed: { stroke: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-700' },
  completed: { stroke: '#10b981', bg: 'bg-emerald-500', text: 'text-emerald-700' },
  pending: { stroke: '#f59e0b', bg: 'bg-amber-500', text: 'text-amber-700' },
  in_progress: { stroke: '#8b5cf6', bg: 'bg-purple-500', text: 'text-purple-700' },
  cancelled: { stroke: '#f43f5e', bg: 'bg-rose-500', text: 'text-rose-700' },
};

export const StatusDonutChart: React.FC<StatusDonutChartProps> = ({
  data,
  totalAppointments,
  size = 200,
}) => {
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);

  const validItems = data.filter((item) => item.count > 0);

  if (totalAppointments === 0 || validItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
        <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-dashed mb-2" />
        No booking status data for this timeframe.
      </div>
    );
  }

  const strokeWidth = 26;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  const slices = validItems.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += item.percentage;

    const colors = STATUS_COLORS[item.status.toLowerCase()] || {
      stroke: '#64748b',
      bg: 'bg-slate-500',
      text: 'text-slate-700',
    };

    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      colors,
    };
  });

  const activeHoverItem = hoveredStatus
    ? validItems.find((d) => d.status === hoveredStatus)
    : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Donut SVG */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 select-none"
        >
          {/* Base track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {slices.map((slice) => {
            const isHovered = hoveredStatus === slice.status;
            return (
              <circle
                key={`slice-${slice.status}`}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.colors.stroke}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                strokeLinecap="round"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredStatus(slice.status)}
                onMouseLeave={() => setHoveredStatus(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          {activeHoverItem ? (
            <>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                {activeHoverItem.count}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[100px]">
                {activeHoverItem.label} ({activeHoverItem.percentage}%)
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl font-black text-slate-900 tracking-tight">
                {totalAppointments}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Total Bookings
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend & Breakdown List */}
      <div className="flex-1 w-full space-y-2">
        {data.map((item) => {
          const colors = STATUS_COLORS[item.status.toLowerCase()] || {
            stroke: '#64748b',
            bg: 'bg-slate-500',
            text: 'text-slate-700',
          };
          const isHovered = hoveredStatus === item.status;

          return (
            <div
              key={`legend-${item.status}`}
              className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                isHovered ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
              }`}
              onMouseEnter={() => setHoveredStatus(item.status)}
              onMouseLeave={() => setHoveredStatus(null)}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${colors.bg} inline-block`} />
                <span className="text-slate-700 font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-900 font-bold">{item.count}</span>
                <span className="font-mono text-[11px] text-slate-400 w-11 text-right">
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
