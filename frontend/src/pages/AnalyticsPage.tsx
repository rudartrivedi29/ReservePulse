import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  Input,
  Skeleton,
  useToast,
} from '../components/ui';
import {
  TrendLineChart,
  HourlyBarChart,
  StatusDonutChart,
  ProviderUtilizationTable,
} from '../components/analytics';
import {
  analyticsService,
  type AnalyticsOverviewResult,
  type AnalyticsQueryParams,
} from '../services/analytics.service';
import { useAuth } from '../context/AuthContext';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [data, setData] = useState<AnalyticsOverviewResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const params: AnalyticsQueryParams = { timeFilter };
      if (timeFilter === 'custom') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }

      const res = await analyticsService.getOverview(params);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch platform analytics';
      setError(msg);
      if (!options?.silent) {
        toast.error('Analytics Error', msg);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [timeFilter, customStartDate, customEndDate, toast]);

  useEffect(() => {
    fetchAnalytics();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAnalytics({ silent: true });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchAnalytics]);

  const handleApplyCustomDate = () => {
    if (!customStartDate || !customEndDate) {
      toast.warning('Invalid Date Range', 'Please select both start and end dates.');
      return;
    }
    if (new Date(customStartDate) > new Date(customEndDate)) {
      toast.warning('Invalid Date Range', 'Start date cannot be after end date.');
      return;
    }
    fetchAnalytics();
  };

  const handleExportCSV = () => {
    if (!data) return;

    try {
      const headers = ['Metric', 'Value'];
      const rows = [
        headers,
        ['Total Appointments', data.summary.totalAppointments.toString()],
        ['Active Appointments', data.summary.activeAppointments.toString()],
        ['Confirmed Appointments', data.summary.confirmedAppointments.toString()],
        ['Completed Appointments', data.summary.completedAppointments.toString()],
        ['Pending Appointments', data.summary.pendingAppointments.toString()],
        ['Cancelled Appointments', data.summary.cancelledAppointments.toString()],
        ['Cancellation Rate (%)', `${data.summary.cancellationRate}%`],
        ['Total Booked Hours', `${data.summary.totalBookedHours} hrs`],
        ['Average Duration', `${data.summary.avgDurationMinutes} mins`],
        ['Fleet Utilization Rate (%)', `${data.summary.fleetUtilizationRate}%`],
        ['Peak Hour', data.summary.peakHourLabel],
        ['Busiest Window', data.peakHours.busiestWindow],
        [],
        ['Provider / Resource', 'Type', 'Active Bookings', 'Cancelled', 'Booked Hours', 'Utilization (%)'],
        ...data.providerUtilization.map((p) => [
          p.providerName,
          p.providerType,
          p.activeAppointments.toString(),
          p.cancelledAppointments.toString(),
          (p.bookedMinutes / 60).toFixed(1),
          `${p.utilizationRate}%`,
        ]),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `reservepulse-analytics-${timeFilter}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report Exported', 'CSV analytics snapshot downloaded successfully.');
    } catch {
      toast.error('Export Error', 'Failed to generate CSV export.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header & Filtering Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Operational Analytics &amp; Throughput
            </h2>
            {user?.role === 'admin' ? (
              <Badge variant="purple" size="xs">Platform-wide (Admin)</Badge>
            ) : (
              <Badge variant="blue" size="xs">Organiser Workspace</Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time appointment volume, peak demand hours, and provider capacity utilization.
          </p>
        </div>

        {/* Date Filter & Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200/80 shadow-2xs">
            {(['today', 'week', 'month', 'custom'] as const).map((filter) => {
              const labels: Record<string, string> = {
                today: 'Today',
                week: 'Last 7 Days',
                month: 'Last 30 Days',
                custom: 'Custom Range',
              };
              const isActive = timeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {labels[filter]}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchAnalytics()}
            disabled={loading}
            className="text-xs py-1.5"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleExportCSV}
            disabled={!data || loading}
            className="text-xs py-1.5"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Custom Date Range Picker Bar (Shown when 'custom' selected) */}
      {timeFilter === 'custom' && (
        <Card variant="glass" className="bg-slate-50/70 border-indigo-100">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs font-semibold text-slate-700 shrink-0">
                Custom Range:
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="text-xs py-1 h-8 bg-white"
                />
                <span className="text-xs text-slate-400">to</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="text-xs py-1 h-8 bg-white"
                />
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={handleApplyCustomDate}
                disabled={loading}
                className="text-xs py-1.5 h-8 shrink-0"
              >
                Apply Range
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading Skeletons */}
      {loading && !data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex justify-between items-center mb-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>

            <div className="lg:col-span-4 p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4">
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <div className="flex items-center justify-center py-6">
                <Skeleton className="w-48 h-48 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !data && (
        <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
          <div className="text-sm font-bold text-rose-700">Failed to load analytics data</div>
          <p className="text-xs text-rose-600">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => fetchAnalytics()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Main Analytics Content */}
      {data && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="glass" className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500">Total Appointments</span>
                <Badge variant="blue" size="xs">
                  {data.summary.activeAppointments} Active
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data.summary.totalAppointments}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                  <span>Confirmed: {data.summary.confirmedAppointments}</span>
                  <span>•</span>
                  <span>Completed: {data.summary.completedAppointments}</span>
                </div>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500">Peak Demand Hour</span>
                <Badge variant="amber" size="xs" dot>
                  {data.peakHours.peakCount} Bookings
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                  {data.summary.peakHourLabel}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Busiest: {data.peakHours.busiestWindow}
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500">Fleet Utilization</span>
                <Badge
                  variant={data.summary.fleetUtilizationRate > 75 ? 'amber' : 'emerald'}
                  size="xs"
                  dot
                >
                  {data.summary.fleetUtilizationRate}% Avg
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data.summary.totalBookedHours} hrs
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ~{data.summary.avgDurationMinutes} mins avg duration
                </p>
              </CardContent>
            </Card>

            <Card variant="glass">
              <CardHeader className="pb-2">
                <span className="text-xs font-semibold text-slate-500">Cancellation Rate</span>
                <Badge
                  variant={data.summary.cancellationRate > 20 ? 'rose' : 'emerald'}
                  size="xs"
                >
                  {data.summary.cancelledAppointments} Cancelled
                </Badge>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {data.summary.cancellationRate}%
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {data.summary.activeAppointments} fulfilled appointments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Timeline Trend & Status Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Timeline Trend Line Chart */}
            <div className="lg:col-span-8">
              <Card variant="glass">
                <CardHeader>
                  <div>
                    <CardTitle>Appointment Demand Trend</CardTitle>
                    <CardDescription>
                      Reservation activity over selected interval ({data.meta.timeFilter})
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <TrendLineChart data={data.trend} />
                </CardContent>
              </Card>
            </div>

            {/* Status Breakdown Donut Chart */}
            <div className="lg:col-span-4">
              <Card variant="glass">
                <CardHeader>
                  <CardTitle>Status Breakdown</CardTitle>
                  <CardDescription>Fulfillment &amp; outcome share</CardDescription>
                </CardHeader>
                <CardContent>
                  <StatusDonutChart
                    data={data.statusBreakdown}
                    totalAppointments={data.summary.totalAppointments}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Peak Booking Hours Distribution */}
          <Card variant="glass">
            <CardHeader>
              <div>
                <CardTitle>Peak Booking Hours Distribution</CardTitle>
                <CardDescription>
                  Active reservations across the 24-hour cycle (excludes cancelled bookings)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <HourlyBarChart peakHours={data.peakHours} />
            </CardContent>
          </Card>

          {/* Provider & Resource Utilization Table */}
          <Card variant="glass">
            <CardHeader>
              <div>
                <CardTitle>Provider &amp; Resource Capacity Utilization</CardTitle>
                <CardDescription>
                  Booked minutes versus available operational capacity per provider
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <ProviderUtilizationTable
                providers={data.providerUtilization}
                fleetUtilizationRate={data.summary.fleetUtilizationRate}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
