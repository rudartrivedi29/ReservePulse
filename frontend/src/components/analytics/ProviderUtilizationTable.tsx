import React, { useState } from 'react';
import { type ProviderUtilizationItem } from '../../services/analytics.service';
import { Badge, Input } from '../ui';

interface ProviderUtilizationTableProps {
  providers: ProviderUtilizationItem[];
  fleetUtilizationRate: number;
}

export const ProviderUtilizationTable: React.FC<ProviderUtilizationTableProps> = ({
  providers,
  fleetUtilizationRate,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'utilization' | 'appointments' | 'name'>('utilization');

  const filteredProviders = providers
    .filter((p) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        p.providerName.toLowerCase().includes(term) ||
        p.providerType.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'utilization') return b.utilizationRate - a.utilizationRate;
      if (sortBy === 'appointments') return b.activeAppointments - a.activeAppointments;
      return a.providerName.localeCompare(b.providerName);
    });

  const getProgressColor = (rate: number): string => {
    if (rate >= 90) return 'bg-rose-500';
    if (rate >= 75) return 'bg-amber-500';
    if (rate >= 50) return 'bg-indigo-600';
    return 'bg-emerald-500';
  };

  const getRateBadge = (rate: number) => {
    if (rate >= 90) return <Badge variant="rose" size="xs">High Demand ({rate}%)</Badge>;
    if (rate >= 75) return <Badge variant="amber" size="xs">Optimal ({rate}%)</Badge>;
    if (rate >= 40) return <Badge variant="blue" size="xs">Moderate ({rate}%)</Badge>;
    return <Badge variant="slate" size="xs">Available ({rate}%)</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm" dot>
            Fleet Utilization: {fleetUtilizationRate}%
          </Badge>
          <span className="text-xs text-slate-500">
            {providers.length} {providers.length === 1 ? 'Resource' : 'Resources / Providers'} tracked
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="Search provider or room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="text-xs py-1.5 h-8 w-full sm:w-48"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs py-1.5 h-8 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="utilization">Sort by Utilization</option>
            <option value="appointments">Sort by Bookings</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {filteredProviders.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
          {searchTerm ? 'No providers matched your search.' : 'No provider or resource data found.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-2xs">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Provider / Resource</th>
                <th className="py-3 px-3 text-center">Type</th>
                <th className="py-3 px-4">Capacity Utilization</th>
                <th className="py-3 px-3 text-right">Active Bookings</th>
                <th className="py-3 px-3 text-right">Booked Hours</th>
                <th className="py-3 px-3 text-right">Avg Duration</th>
                <th className="py-3 px-3 text-right">Cancelled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProviders.map((p) => {
                const bookedHours = (p.bookedMinutes / 60).toFixed(1);
                const availableHours = (p.availableMinutes / 60).toFixed(0);

                return (
                  <tr key={p.providerId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      <div>{p.providerName}</div>
                      <div className="text-[10px] text-slate-400 font-normal">
                        ID: {p.providerId.slice(0, 14)}...
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-600">
                        {p.providerType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 min-w-[200px]">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{p.utilizationRate}%</span>
                          {getRateBadge(p.utilizationRate)}
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(
                              p.utilizationRate
                            )}`}
                            style={{ width: `${Math.min(100, p.utilizationRate)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {bookedHours}h of ~{availableHours}h capacity
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                      {p.activeAppointments}
                      <span className="text-[10px] text-slate-400 font-normal block">
                        of {p.totalAppointments} total
                      </span>
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                      {bookedHours} hrs
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-700">
                      {p.avgDurationMinutes} mins
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono">
                      {p.cancelledAppointments > 0 ? (
                        <span className="text-rose-600 font-bold">{p.cancelledAppointments}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
