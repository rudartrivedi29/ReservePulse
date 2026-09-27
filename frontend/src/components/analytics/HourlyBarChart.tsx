import React, { useState } from 'react';
import { type HourlyDistributionItem, type PeakHoursAnalysis } from '../../services/analytics.service';
import { Badge } from '../ui';

interface HourlyBarChartProps {
  peakHours: PeakHoursAnalysis;
  height?: number;
}

export const HourlyBarChart: React.FC<HourlyBarChartProps> = ({
  peakHours,
  height = 240,
}) => {
  const [hoveredHour, setHoveredHour] = useState<HourlyDistributionItem | null>(null);

  const distribution = peakHours?.hourlyDistribution || [];
  const peakHour = peakHours?.peakHour ?? -1;

  if (distribution.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl"
        style={{ height }}
      >
        No hourly demand data available for this timeframe.
      </div>
    );
  }

  const padding = { top: 30, right: 15, bottom: 35, left: 35 };
  const width = 640;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxCount = Math.max(...distribution.map((d) => d.bookingCount), 4);
  const yMax = Math.ceil(maxCount * 1.15);

  const slotWidth = chartWidth / 24;
  const barWidth = Math.max(8, slotWidth * 0.7);

  const getY = (val: number) => {
    return padding.top + chartHeight - (val / yMax) * chartHeight;
  };

  const yTicks = [0, Math.round(yMax * 0.5), yMax];

  // Key hour marks for X axis (every 3 hours)
  const xMarkHours = [0, 3, 6, 9, 12, 15, 18, 21];
  const formatHourShort = (h: number) => {
    if (h === 0) return '12A';
    if (h === 12) return '12P';
    return h > 12 ? `${h - 12}P` : `${h}A`;
  };

  return (
    <div className="w-full">
      {/* Header bar with summary & peak callout */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="amber" size="xs" dot>
            Peak Hour: {peakHours.peakHourLabel} ({peakHours.peakCount} active bookings)
          </Badge>
          <span className="text-[11px] text-slate-500">
            Busiest Window: <strong className="text-slate-700">{peakHours.busiestWindow}</strong>
          </span>
        </div>

        {hoveredHour && (
          <div className="bg-slate-900 text-white px-2.5 py-1 rounded-md text-[11px] font-medium flex items-center gap-2 shadow-md">
            <span>{hoveredHour.label}:</span>
            <span>Bookings: <strong className="text-amber-300">{hoveredHour.bookingCount}</strong></span>
            <span className="text-slate-300">({hoveredHour.percentage}% of volume)</span>
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
            <linearGradient id="barStandardGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="barPeakGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="barHoverGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines */}
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
                x={padding.left - 6}
                y={getY(val) + 3}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-mono"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Bars */}
          {distribution.map((item) => {
            const isPeak = item.hour === peakHour && item.bookingCount > 0;
            const isHovered = hoveredHour?.hour === item.hour;
            const xCenter = padding.left + item.hour * slotWidth + slotWidth / 2;
            const x = xCenter - barWidth / 2;
            const barHeight = item.bookingCount > 0
              ? Math.max(4, chartHeight - (getY(item.bookingCount) - padding.top))
              : 2;
            const y = padding.top + chartHeight - barHeight;

            let fill = 'url(#barStandardGrad)';
            if (isHovered) fill = 'url(#barHoverGrad)';
            else if (isPeak) fill = 'url(#barPeakGrad)';
            else if (item.bookingCount === 0) fill = '#e2e8f0';

            return (
              <g
                key={`bar-${item.hour}`}
                className="cursor-pointer transition-opacity duration-150"
                onMouseEnter={() => setHoveredHour(item)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Invisible hover area spanning whole slot */}
                <rect
                  x={xCenter - slotWidth / 2}
                  y={padding.top}
                  width={slotWidth}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* The Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  ry="3"
                  fill={fill}
                  className="transition-all duration-200"
                />

                {/* Highlight dot or star above peak hour */}
                {isPeak && (
                  <circle
                    cx={xCenter}
                    cy={y - 7}
                    r="3.5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                )}
              </g>
            );
          })}

          {/* X Axis Baseline */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={width - padding.right}
            y2={padding.top + chartHeight}
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          {/* X-Axis Ticks (every 3 hours) */}
          {xMarkHours.map((h) => {
            const xCenter = padding.left + h * slotWidth + slotWidth / 2;
            return (
              <text
                key={`x-mark-${h}`}
                x={xCenter}
                y={height - 12}
                textAnchor="middle"
                className="text-[10px] fill-slate-500 font-medium font-mono"
              >
                {formatHourShort(h)}
              </text>
            );
          })}
        </svg>
      </div>
      <p className="text-[11px] text-slate-400 mt-1 italic">
        * Cancelled and payment-failed bookings are excluded from peak hours calculations to reflect genuine operational load.
      </p>
    </div>
  );
};
