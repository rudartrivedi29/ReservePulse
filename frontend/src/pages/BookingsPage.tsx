import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  EmptyState,
  useToast,
} from '../components/ui';
import {
  bookingClient,
  type BookingItem,
  type BookingFilters,
} from '../services/booking.service';
import { serviceClient, type ServiceItem } from '../services/service.service';
import { resourceClient, type ResourceItem } from '../services/resource.service';
import { BookingWizard } from '../components/booking';
import {
  Calendar,
  Clock,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Building,
} from 'lucide-react';

export const BookingsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const role = (user?.role || 'customer').toLowerCase();
  const isOrganiser = role === 'organiser';
  const isAdmin = role === 'admin';
  const isOrganiserOrAdmin = isOrganiser || isAdmin;

  // Data State
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<
    'all' | 'upcoming' | 'pending' | 'confirmed' | 'payment-failed' | 'cancelled'
  >('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('all');
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<'all' | 'today' | 'this_week' | 'upcoming' | 'past'>('all');
  const [adminOrganiserFilter, setAdminOrganiserFilter] = useState<string>('');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Quick Action: Confirm
  const [selectedBookingForConfirm, setSelectedBookingForConfirm] = useState<BookingItem | null>(null);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [markPaymentPaid, setMarkPaymentPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Quick Action: Cancel
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Load auxiliary data: services and resources for dropdowns
  useEffect(() => {
    const fetchAuxiliary = async () => {
      try {
        if (isOrganiser) {
          const [srvRes, resRes] = await Promise.all([
            serviceClient.getOrganiserServices(),
            resourceClient.getOrganiserResources(),
          ]);
          if (srvRes.data) setServices(srvRes.data);
          if (resRes.data) setResources(resRes.data);
        } else if (isAdmin) {
          const srvRes = await serviceClient.getPublicServices();
          if (srvRes.data) setServices(srvRes.data);
          const resRes = await resourceClient.getOrganiserResources().catch(() => ({ data: [] }));
          if (resRes.data) setResources(resRes.data);
        } else {
          const srvRes = await serviceClient.getPublicServices();
          if (srvRes.data) setServices(srvRes.data);
        }
      } catch {
        // Silently continue
      }
    };
    fetchAuxiliary();
  }, [isOrganiser, isAdmin]);

  // Load bookings based on active role and filters
  const loadBookings = useCallback(
    async (options?: { silent?: boolean }) => {
      const isSilent = Boolean(options?.silent);
      if (!isSilent) {
        setIsLoading(true);
      }
      try {
        const filters: BookingFilters = {
          limit: 100,
        };

        // Status filter from active tab
        if (activeTab === 'pending') {
          filters.status = 'pending';
        } else if (activeTab === 'confirmed') {
          filters.status = 'confirmed';
        } else if (activeTab === 'cancelled') {
          filters.status = 'cancelled';
        } else if (activeTab === 'payment-failed') {
          filters.status = 'payment-failed';
        } else if (activeTab === 'upcoming') {
          filters.timeFilter = 'upcoming';
        }

        // Time filter override if specified
        if (selectedTimeFilter !== 'all' && activeTab !== 'upcoming') {
          filters.timeFilter = selectedTimeFilter;
        }

        // Dropdown filters
        if (selectedServiceId !== 'all') {
          filters.serviceId = selectedServiceId;
        }
        if (selectedResourceId !== 'all') {
          filters.resourceId = selectedResourceId;
        }
        if (isAdmin && adminOrganiserFilter.trim()) {
          filters.organiserId = adminOrganiserFilter.trim();
        }

        let res;
        if (isAdmin) {
          res = await bookingClient.getAdminBookings(filters);
        } else if (isOrganiser) {
          res = await bookingClient.getOrganiserBookings(filters);
        } else {
          res = await bookingClient.getCustomerBookings(filters);
        }

        if (res.data) {
          setBookings(res.data);
        }
      } catch (err: unknown) {
        if (!isSilent) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve reservations';
          toast.error('Network Warning', msg);
        }
      } finally {
        if (!isSilent) {
          setIsLoading(false);
        }
      }
    },
    [
      activeTab,
      selectedTimeFilter,
      selectedServiceId,
      selectedResourceId,
      adminOrganiserFilter,
      isAdmin,
      isOrganiser,
      toast,
    ]
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // Background polling for bookings list updates (every 15s)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && !isWizardOpen) {
        loadBookings({ silent: true });
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [loadBookings, isWizardOpen]);

  // Client-side text search over returned bookings
  const filteredBookings = useMemo(() => {
    if (!searchTerm.trim()) return bookings;
    const s = searchTerm.toLowerCase();
    return bookings.filter((b) => {
      return (
        b.bookingReference.toLowerCase().includes(s) ||
        b.serviceName.toLowerCase().includes(s) ||
        (b.resourceName && b.resourceName.toLowerCase().includes(s)) ||
        (b.customerName && b.customerName.toLowerCase().includes(s)) ||
        (b.customerEmail && b.customerEmail.toLowerCase().includes(s)) ||
        (b.customerPhone && b.customerPhone.toLowerCase().includes(s)) ||
        (b.organiserId && b.organiserId.toLowerCase().includes(s))
      );
    });
  }, [bookings, searchTerm]);

  // Compute status summary metrics
  const metrics = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === 'confirmed').length;
    const pending = bookings.filter((b) => b.status === 'pending').length;
    const failed = bookings.filter(
      (b) => b.status === 'payment-failed' || b.status === 'payment_failed'
    ).length;
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    return { total, confirmed, pending, failed, cancelled };
  }, [bookings]);

  // Confirm booking action
  const handleConfirmAction = async () => {
    if (!selectedBookingForConfirm) return;
    setIsConfirming(true);
    try {
      const res = await bookingClient.confirmBooking(selectedBookingForConfirm.id, {
        notes: confirmNotes.trim() || undefined,
        markPaymentPaid,
      });
      if (res.data) {
        toast.success(
          'Reservation Confirmed',
          `Booking ${selectedBookingForConfirm.bookingReference} status changed to confirmed.`
        );
        setSelectedBookingForConfirm(null);
        setConfirmNotes('');
        setMarkPaymentPaid(false);
        loadBookings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Confirmation failed';
      toast.error('Error', msg);
    } finally {
      setIsConfirming(false);
    }
  };

  // Cancel booking action
  const handleCancelAction = async () => {
    if (!selectedBookingForCancel) return;
    setIsCancelling(true);
    try {
      const res = await bookingClient.cancelBooking(selectedBookingForCancel.id, cancelReason.trim() || undefined);
      if (res.data) {
        toast.success(
          'Reservation Cancelled',
          `Booking ${selectedBookingForCancel.bookingReference} has been cancelled and slot released.`
        );
        setSelectedBookingForCancel(null);
        setCancelReason('');
        loadBookings();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed';
      toast.error('Error', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // Navigation to detailed booking view
  const handleViewDetails = (bookingId: string) => {
    if (isAdmin) {
      navigate(`/admin/bookings/${bookingId}`);
    } else if (isOrganiser) {
      navigate(`/organiser/bookings/${bookingId}`);
    } else {
      navigate(`/customer/bookings/${bookingId}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="emerald" dot>Confirmed</Badge>;
      case 'pending':
        return <Badge variant="amber" dot>Pending</Badge>;
      case 'in_progress':
        return <Badge variant="blue" dot>In Progress</Badge>;
      case 'completed':
        return <Badge variant="purple" dot>Completed</Badge>;
      case 'payment-failed':
      case 'payment_failed':
        return <Badge variant="rose" dot>Payment Failed</Badge>;
      case 'cancelled':
        return <Badge variant="rose" dot>Cancelled</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Pending</span>;
      case 'unpaid':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">Unpaid</span>;
      case 'failed':
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Failed</span>;
      default:
        return <span className="text-[10px] text-slate-500 capitalize">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              {isAdmin
                ? 'Platform Reservations Governance'
                : isOrganiser
                ? 'Facility Reservations Ledger'
                : 'My Appointments & Reservations'}
            </h2>
            <Badge variant={isAdmin ? 'purple' : isOrganiser ? 'blue' : 'emerald'}>
              {isAdmin ? 'Global Admin Console' : isOrganiser ? 'Organiser Workspace' : 'Customer Portal'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Platform-wide reservations ledger, capacity tracking, and multi-tenant governance across all facilities.'
              : isOrganiser
              ? 'Manage incoming customer reservations, confirm pending requests, and track slot allocation.'
              : 'Review your upcoming scheduled bookings, access service receipts, and manage appointment details.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadBookings()}
            disabled={isLoading}
            title="Refresh bookings ledger"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsWizardOpen(true)}
            className="shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Book Reservation
          </Button>
        </div>
      </div>

      {/* Quick Metrics Bar for Organiser / Admin */}
      {isOrganiserOrAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Total Loaded</span>
              <span className="text-xl font-bold text-slate-900">{metrics.total}</span>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-700 font-medium block">Confirmed</span>
              <span className="text-xl font-bold text-emerald-700">{metrics.confirmed}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-700 font-medium block">Pending Approval</span>
              <span className="text-xl font-bold text-amber-700">{metrics.pending}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-rose-700 font-medium block">Cancelled / Failed</span>
              <span className="text-xl font-bold text-rose-700">{metrics.cancelled + metrics.failed}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs and Advanced Filter Bar */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 space-y-3.5">
          {/* Status View Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Bookings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'upcoming'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === 'pending'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Pending</span>
              {metrics.pending > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                  {metrics.pending}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('confirmed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'confirmed'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Confirmed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payment-failed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'payment-failed'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Failed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cancelled')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'cancelled'
                  ? 'bg-white text-indigo-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancelled
            </button>
          </div>

          {/* Filtering Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search reference, customer, or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            {/* Service Filter */}
            <Select
              selectSize="sm"
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              options={[
                { value: 'all', label: 'All Services' },
                ...services.map((s) => ({ value: s.id, label: s.name })),
              ]}
              className="text-xs h-9"
            />

            {/* Resource Filter */}
            <Select
              selectSize="sm"
              value={selectedResourceId}
              onChange={(e) => setSelectedResourceId(e.target.value)}
              options={[
                { value: 'all', label: 'All Providers / Resources' },
                ...resources.map((r) => ({ value: r.id, label: `${r.name} (${r.resourceType})` })),
              ]}
              className="text-xs h-9"
            />

            {/* Time Filter */}
            <Select
              selectSize="sm"
              value={selectedTimeFilter}
              onChange={(e) => setSelectedTimeFilter(e.target.value as any)}
              options={[
                { value: 'all', label: 'All Time Range' },
                { value: 'today', label: 'Today' },
                { value: 'this_week', label: 'This Week' },
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past / Completed' },
              ]}
              className="text-xs h-9"
            />
          </div>

          {/* Admin Multi-Tenant Organiser Filter */}
          {isAdmin && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
              <Building className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-slate-700">Filter by Organiser ID:</span>
              <Input
                placeholder="e.g. usr_organiser_002"
                value={adminOrganiserFilter}
                onChange={(e) => setAdminOrganiserFilter(e.target.value)}
                className="text-xs h-8 max-w-xs"
              />
              {adminOrganiserFilter && (
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setAdminOrganiserFilter('')}
                  className="text-xs text-slate-500"
                >
                  Clear
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bookings Table or Empty State */}
      {isLoading ? (
        <Card className="overflow-hidden border-slate-200 shadow-sm p-4 space-y-3">
          <div className="h-9 bg-slate-100 rounded-xl animate-pulse w-full mb-3" />
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3.5 px-3 border-b border-slate-100 last:border-0 animate-pulse"
            >
              <div className="flex items-center gap-3 w-1/4">
                <div className="h-4 w-24 bg-slate-200 rounded" />
              </div>
              <div className="h-4 w-28 bg-slate-100 rounded" />
              <div className="h-4 w-32 bg-slate-100 rounded hidden sm:block" />
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
              <div className="h-7 w-16 bg-slate-100 rounded-lg ml-auto" />
            </div>
          ))}
        </Card>
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          preset="no-results"
          variant="card"
          title={
            activeTab === 'pending'
              ? 'No Pending Reservations'
              : activeTab === 'confirmed'
              ? 'No Confirmed Bookings'
              : activeTab === 'payment-failed'
              ? 'No Payment Failures'
              : 'No Reservations Found'
          }
          description="No bookings match your current filter parameters or search keyword."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsWizardOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Book New Reservation
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="font-bold text-slate-700 text-xs">Reference</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Customer</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Service</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Provider / Venue</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Date & Time</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Pricing & Ledger</TableHead>
                <TableHead className="font-bold text-slate-700 text-xs">Status</TableHead>
                {isAdmin && (
                  <TableHead className="font-bold text-slate-700 text-xs">Owner</TableHead>
                )}
                <TableHead className="text-right font-bold text-slate-700 text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((b) => {
                const startDate = new Date(b.startTime);
                const endDate = new Date(b.endTime);

                const dateStr = startDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                const timeStr = `${startDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })} - ${endDate.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`;

                const isPending = b.status === 'pending';
                const canCancel = b.status !== 'cancelled';

                return (
                  <TableRow key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Booking Reference */}
                    <TableCell className="font-mono text-xs font-bold text-indigo-950 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span>{b.bookingReference}</span>
                        <span className="text-[10px] text-slate-400 font-sans font-normal">
                          {b.attendeeCount} {b.attendeeCount === 1 ? 'seat' : 'seats'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Customer */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {(b.customerName || 'G')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate max-w-[140px]">
                            {b.customerName || 'Guest User'}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                            {b.customerEmail || 'No email'}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Service */}
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900 truncate max-w-[150px]">
                        {b.serviceName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b.serviceCategory || 'General'} • {b.serviceDurationMinutes || 60}m
                      </div>
                    </TableCell>

                    {/* Provider / Venue */}
                    <TableCell>
                      <div className="text-xs text-slate-800 font-medium truncate max-w-[130px]">
                        {b.resourceName || 'Allocated Resource'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[130px]">
                        {b.resourceLocation || 'Main Campus'}
                      </div>
                    </TableCell>

                    {/* Date & Schedule */}
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-slate-900 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{timeStr}</span>
                      </div>
                    </TableCell>

                    {/* Pricing & Ledger */}
                    <TableCell className="whitespace-nowrap">
                      <div className="text-xs font-bold text-slate-900">
                        {b.totalPrice === 0
                          ? 'Free'
                          : `${b.priceCurrency} ${b.totalPrice.toFixed(2)}`}
                      </div>
                      <div className="mt-0.5">{getPaymentBadge(b.paymentStatus)}</div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getStatusBadge(b.status)}</TableCell>

                    {/* Admin Service Owner */}
                    {isAdmin && (
                      <TableCell className="text-[11px] font-mono text-slate-600">
                        {b.organiserId || '—'}
                      </TableCell>
                    )}

                    {/* Actions */}
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Confirm Button for Organiser/Admin */}
                        {isOrganiserOrAdmin && isPending && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                            onClick={() => setSelectedBookingForConfirm(b)}
                            title="Confirm reservation"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                          </Button>
                        )}

                        {/* View Details Page */}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleViewDetails(b.id)}
                          title="Open full booking details page"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View
                        </Button>

                        {/* Cancel Button */}
                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            onClick={() => setSelectedBookingForCancel(b)}
                            title="Cancel reservation and release slot"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Booking Wizard Modal */}
      <BookingWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onBookingSuccess={() => {
          loadBookings();
        }}
      />

      {/* Confirm Modal */}
      {selectedBookingForConfirm && (
        <Modal
          isOpen={true}
          onClose={() => !isConfirming && setSelectedBookingForConfirm(null)}
          title="Confirm Booking Reservation"
          description={`Verify reservation ${selectedBookingForConfirm.bookingReference} for ${selectedBookingForConfirm.customerName || 'customer'}`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBookingForConfirm(null)}
                disabled={isConfirming}
              >
                Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAction}
                isLoading={isConfirming}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Confirm Reservation
              </Button>
            </div>
          }
        >
          <div className="space-y-3.5 text-xs font-sans">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                Confirming this booking updates the reservation status to <strong>Confirmed</strong> and secures the reserved slot capacity.
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Internal Note (optional)
              </label>
              <Input
                placeholder="e.g. Verified client payment in-person, seat assigned"
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
              />
            </div>

            {selectedBookingForConfirm.paymentStatus !== 'paid' && selectedBookingForConfirm.totalPrice > 0 && (
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={markPaymentPaid}
                  onChange={(e) => setMarkPaymentPaid(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Mark payment status as Paid</span>
              </label>
            )}
          </div>
        </Modal>
      )}

      {/* Cancel Modal */}
      {selectedBookingForCancel && (
        <Modal
          isOpen={true}
          onClose={() => !isCancelling && setSelectedBookingForCancel(null)}
          title="Cancel Reservation"
          description={`Release appointment ${selectedBookingForCancel.bookingReference}?`}
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBookingForCancel(null)}
                disabled={isCancelling}
              >
                Keep Booking
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelAction}
                isLoading={isCancelling}
              >
                Confirm Cancellation
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs font-sans">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Releasing this slot will update the availability engine and immediately make this timeslot available for other customers.
              </div>
            </div>

            <Input
              label="Cancellation Reason (optional)"
              placeholder="e.g. Customer request, emergency maintenance..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};
