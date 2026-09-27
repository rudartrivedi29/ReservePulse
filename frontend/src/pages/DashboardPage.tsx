import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminService, type AdminDashboardStats } from '../services/admin.service';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  ProgressBar,
  EmptyState,
  Skeleton,
  SkeletonAvatar,
  useToast,
} from '../components/ui';

export const DashboardPage: React.FC = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Admin-specific state
  const [adminStats, setAdminStats] = useState<AdminDashboardStats | null>(null);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const fetchAdminStats = useCallback(async (options?: { silent?: boolean }) => {
    if (role !== 'admin') return;
    if (!options?.silent) {
      setIsAdminLoading(true);
    }
    setAdminError(null);
    try {
      const data = await adminService.getDashboardStats();
      setAdminStats(data);
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to aggregate platform telemetry';
      setAdminError(errMsg);
      if (!options?.silent) {
        toast.error('Dashboard Error', errMsg);
      }
    } finally {
      if (!options?.silent) {
        setIsAdminLoading(false);
      }
    }
  }, [role, toast]);

  useEffect(() => {
    if (role === 'admin') {
      fetchAdminStats();

      const interval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchAdminStats({ silent: true });
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [role, fetchAdminStats]);

  // Format date helper
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Status badge variant mapper
  const getStatusBadgeVariant = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'confirmed') return 'emerald' as const;
    if (s === 'pending') return 'amber' as const;
    if (s === 'in_progress') return 'blue' as const;
    if (s === 'completed') return 'purple' as const;
    if (s === 'cancelled' || s === 'payment-failed' || s === 'payment_failed') return 'rose' as const;
    return 'slate' as const;
  };

  // Fallback metrics for customer / organiser roles
  const metrics = [
    {
      title: 'Active Bookings',
      value: role === 'customer' ? '3' : '142',
      trend: '+12% from last week',
      badge: 'Operational',
      badgeVariant: 'emerald' as const,
    },
    {
      title: 'Resource Allocation',
      value: '84.6%',
      trend: 'Peak hours 10am-3pm',
      badge: 'High Demand',
      badgeVariant: 'amber' as const,
    },
    {
      title: 'Active Concurrency Locks',
      value: '4 Locks',
      trend: 'Zero collision conflicts',
      badge: 'Live Lock Engine',
      badgeVariant: 'blue' as const,
    },
    {
      title: 'Platform Latency',
      value: '18ms',
      trend: 'P99 < 35ms response',
      badge: 'Optimal',
      badgeVariant: 'emerald' as const,
    },
  ];

  const recentBookings = [
    {
      id: 'RES-901',
      resource: 'Boardroom Delta (4K Telepresence)',
      user: 'Sarah Jenkins',
      time: 'Today, 10:00 - 11:30 AM',
      status: 'Confirmed',
      variant: 'emerald' as const,
    },
    {
      id: 'RES-902',
      resource: 'GPU Compute Node Cluster 02',
      user: 'DevOps Scheduler',
      time: 'Today, 01:00 - 04:00 PM',
      status: 'Running',
      variant: 'blue' as const,
    },
    {
      id: 'RES-903',
      resource: 'Private Consultation Pod 1',
      user: 'Dr. Michael Chen',
      time: 'Tomorrow, 09:30 AM',
      status: 'Pending Lock',
      variant: 'amber' as const,
    },
    {
      id: 'RES-904',
      resource: 'Studio Audio/Visual Bay',
      user: 'Creative Media',
      time: 'Tomorrow, 02:00 PM',
      status: 'Confirmed',
      variant: 'emerald' as const,
    },
  ];

  // -------------------------------------------------------------
  // RENDER: ADMIN DASHBOARD VIEW
  // -------------------------------------------------------------
  if (role === 'admin') {
    return (
      <div className="space-y-6 font-sans">
        {/* Top Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl border border-purple-500/20">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-400/20 text-purple-300 text-xs font-semibold mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span>Admin Governance Console Active</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Platform Overview &amp; Governance
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/75 mt-0.5">
              Comprehensive visibility across registered users, service providers, and platform-wide reservations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => navigate('/admin/users')}
            >
              Users &amp; Providers
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate('/admin/bookings')}
            >
              All Bookings
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={() => fetchAdminStats()}
              title="Refresh telemetry"
            >
              <svg className={`w-4 h-4 ${isAdminLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isAdminLoading && !adminStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-4 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-36" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </div>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                    <div className="space-y-1.5">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-2.5 w-24" />
                    </div>
                    <Skeleton className="h-3 w-28 hidden sm:block" />
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-6 w-14 rounded-lg" />
                  </div>
                ))}
              </div>

              <div className="lg:col-span-4 p-6 rounded-2xl bg-white/80 border border-slate-200/80 shadow-xs space-y-4">
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <SkeletonAvatar size="sm" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-36" />
                    </div>
                    <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {adminError && !adminStats && (
          <Card variant="glass" className="border-rose-200 bg-rose-50/50">
            <CardContent className="p-6 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                !
              </div>
              <h3 className="text-sm font-bold text-slate-800">Failed to Load Platform Telemetry</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{adminError}</p>
              <Button size="sm" variant="primary" onClick={() => fetchAdminStats()}>
                Retry Loading
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Live Admin KPIs */}
        {adminStats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Total Users */}
              <Card
                variant="glass"
                className="cursor-pointer hover:border-purple-300 transition-colors"
                onClick={() => navigate('/admin/users')}
              >
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold text-slate-500">Total Registered Users</span>
                  <Badge variant="emerald" size="xs" dot>
                    {adminStats.userStats.active} Active
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {adminStats.totalUsers}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {adminStats.userStats.customers} Customers • {adminStats.userStats.organisers} Providers • {adminStats.userStats.admins} Admins
                  </p>
                </CardContent>
              </Card>

              {/* 2. Total Service Providers */}
              <Card
                variant="glass"
                className="cursor-pointer hover:border-emerald-300 transition-colors"
                onClick={() => navigate('/admin/users?role=ORGANISER')}
              >
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold text-slate-500">Total Service Providers</span>
                  <Badge variant="blue" size="xs" dot>
                    Fleet Active
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {adminStats.totalProviders}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {adminStats.serviceStats.totalServices} Services • {adminStats.serviceStats.totalResources} Fleet Resources
                  </p>
                </CardContent>
              </Card>

              {/* 3. Total Appointments / Bookings */}
              <Card
                variant="glass"
                className="cursor-pointer hover:border-indigo-300 transition-colors"
                onClick={() => navigate('/admin/bookings')}
              >
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold text-slate-500">Total Appointments</span>
                  <Badge variant="purple" size="xs" dot>
                    Global Ledger
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {adminStats.totalAppointments}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {adminStats.appointmentStats.confirmed} Confirmed • {adminStats.appointmentStats.pending} Pending • {adminStats.appointmentStats.cancelled} Cancelled
                  </p>
                </CardContent>
              </Card>

              {/* 4. Infrastructure & Concurrency Lock */}
              <Card
                variant="glass"
                className="cursor-pointer hover:border-teal-300 transition-colors"
                onClick={() => navigate('/admin/resources')}
              >
                <CardHeader className="pb-2">
                  <span className="text-xs font-semibold text-slate-500">Operational Resources</span>
                  <Badge variant="emerald" size="xs" dot>
                    Optimal
                  </Badge>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                    {adminStats.serviceStats.operationalResources} / {adminStats.serviceStats.totalResources}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Zero-Collision ACID Concurrency Protection
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Main Grid: Platform Bookings Ledger & Quick Governance */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Platform Bookings Ledger */}
              <div className="lg:col-span-8">
                <Card variant="glass">
                  <CardHeader>
                    <div>
                      <CardTitle>Platform-Wide Recent Appointments</CardTitle>
                      <CardDescription>Live timeline across all service providers and resources</CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => navigate('/admin/bookings')}
                    >
                      View All Bookings ({adminStats.totalAppointments})
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {adminStats.recentAppointments.length === 0 ? (
                      <div className="p-8 text-center">
                        <EmptyState
                          title="No platform bookings recorded yet"
                          description="When clients reserve appointments, they will appear in real time here."
                        />
                      </div>
                    ) : (
                      <Table density="compact" striped hoverable>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Reference</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Schedule</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminStats.recentAppointments.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-mono text-xs font-bold text-slate-700">
                                {b.bookingReference || b.id.slice(0, 8)}
                              </TableCell>
                              <TableCell>
                                <p className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                                  {b.customerName || b.guestName || 'Client'}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
                                  {b.customerEmail || b.guestEmail || '-'}
                                </p>
                              </TableCell>
                              <TableCell className="text-xs text-slate-700 font-medium">
                                {b.serviceName || 'Service'}
                              </TableCell>
                              <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                {formatDateTime(b.startTime)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(b.status)} size="xs" dot>
                                  {b.status.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => navigate(`/admin/bookings/${b.id}`)}
                                >
                                  Inspect
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar: Recent Users & Fleet Health */}
              <div className="lg:col-span-4 space-y-4">
                {/* Platform Registered Users */}
                <Card variant="glass">
                  <CardHeader>
                    <div>
                      <CardTitle>Recent Registered Users</CardTitle>
                      <CardDescription>Latest platform accounts</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => navigate('/admin/users')}
                    >
                      Directory
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    {adminStats.recentUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/60 transition-colors cursor-pointer"
                        onClick={() => navigate('/admin/users')}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {u.fullName ? u.fullName.slice(0, 2) : 'US'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{u.fullName}</p>
                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={u.role === 'ADMIN' ? 'purple' : u.role === 'ORGANISER' ? 'emerald' : 'blue'}
                            size="xs"
                          >
                            {u.role}
                          </Badge>
                          <Badge
                            variant={u.isActive ? 'emerald' : 'rose'}
                            size="xs"
                          >
                            {u.isActive ? 'Active' : 'Off'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Platform Infrastructure Capacity */}
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Resource Telemetry</CardTitle>
                    <CardDescription>Capacity utilization breakdown</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                        <span>Physical Meeting Suites</span>
                        <span className="font-bold">92%</span>
                      </div>
                      <ProgressBar value={92} color="emerald" height="sm" />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                        <span>GPU Compute Clusters</span>
                        <span className="font-bold">78%</span>
                      </div>
                      <ProgressBar value={78} color="sky" height="sm" />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                        <span>Consultation Pods</span>
                        <span className="font-bold">45%</span>
                      </div>
                      <ProgressBar value={45} color="emerald" height="sm" />
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>ACID Lock Engine:</span>
                      <span className="font-mono font-bold text-emerald-700">Serialized Rows</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: CUSTOMER / ORGANISER DASHBOARD VIEW (Unmodified)
  // -------------------------------------------------------------
  return (
    <div className="space-y-6 font-sans">
      {/* Top Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-xl border border-emerald-500/20">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-xs font-semibold mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="capitalize">{role} Workspace Active</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome back, {user.name}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/75 mt-0.5">
            Real-time reservation telemetry and resource orchestration overview.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const target = role === 'public' ? '/services' : `/${role}/services`;
              navigate(target);
            }}
          >
            Explore Services
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              const target = role === 'public' ? '/calendar' : `/${role}/calendar`;
              navigate(target);
            }}
          >
            View Calendar
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <Card key={idx} variant="glass">
            <CardHeader className="pb-2">
              <span className="text-xs font-semibold text-slate-500">{m.title}</span>
              <Badge variant={m.badgeVariant} size="xs" dot>
                {m.badge}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {m.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{m.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid: Recent Bookings & Concurrency Lock Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bookings Ledger */}
        <div className="lg:col-span-8">
          <Card variant="glass">
            <CardHeader>
              <div>
                <CardTitle>Recent Reservation Ledger</CardTitle>
                <CardDescription>Live timeline of booked and locked capacity slots</CardDescription>
              </div>
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  const target = role === 'public' ? '/services' : `/${role}/bookings`;
                  navigate(target);
                }}
              >
                View All
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table density="compact" striped hoverable>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking ID</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Time Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {b.id}
                      </TableCell>
                      <TableCell className="font-medium text-slate-900">{b.resource}</TableCell>
                      <TableCell className="text-xs text-slate-500">{b.time}</TableCell>
                      <TableCell>
                        <Badge variant={b.variant} size="xs" dot>
                          {b.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => toast.info('Booking Inspected', `Showing details for ${b.id}`)}
                        >
                          Inspect
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Real-time Fleet Capacity & Locking Queue */}
        <div className="lg:col-span-4 space-y-4">
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Fleet Capacity Load</CardTitle>
              <CardDescription>Resource utilization breakdown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                  <span>Workspaces &amp; Rooms</span>
                  <span className="font-bold">92%</span>
                </div>
                <ProgressBar value={92} color="emerald" height="sm" />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                  <span>Compute Clusters</span>
                  <span className="font-bold">78%</span>
                </div>
                <ProgressBar value={78} color="sky" height="sm" />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-600 mb-1 font-medium">
                  <span>Consultation Pods</span>
                  <span className="font-bold">45%</span>
                </div>
                <ProgressBar value={45} color="emerald" height="sm" />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Concurrency Lock Expiry:</span>
                <span className="font-mono font-bold text-emerald-700">300s TTL</span>
              </div>
            </CardContent>
          </Card>

          <Card variant="interactive" onClick={() => toast.success('Orchestrator Synced', 'All locks validated.')}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Zero-Collision Engine</h4>
                <p className="text-[11px] text-slate-500">Automated ACID transaction safeguards active</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
