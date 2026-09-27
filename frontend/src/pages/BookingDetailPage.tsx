import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookingClient, type BookingItem } from '../services/booking.service';
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
  Input,
  useToast,
} from '../components/ui';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Mail,
  Phone,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  CreditCard,
  FileText,
  Copy,
  Check,
  Building,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const BookingDetailPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  // Modals state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [markPaymentPaid, setMarkPaymentPaid] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const role = (user?.role || 'customer').toLowerCase();
  const isOrganiserOrAdmin = role === 'organiser' || role === 'admin';

  // Load booking details
  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingClient.getBookingDetails(bookingId);
      if (res.data) {
        setBooking(res.data);
      } else {
        setError('Booking reservation details could not be found.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to retrieve reservation details';
      setError(msg);
      toast.error('Error', msg);
    } finally {
      setIsLoading(false);
    }
  }, [bookingId, toast]);

  // Initial load
  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  // Real-time booking status polling for pending or in_progress bookings
  useEffect(() => {
    if (!bookingId || !booking) return;

    const status = (booking.status || '').toLowerCase();
    const shouldPoll = status === 'pending' || status === 'in_progress';
    if (!shouldPoll) return;

    const intervalId = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const res = await bookingClient.getBookingDetails(bookingId);
        if (res.data) {
          const fresh = res.data;
          if (fresh.status !== booking.status || fresh.paymentStatus !== booking.paymentStatus) {
            setBooking(fresh);
            toast.info(
              'Booking Status Updated',
              `Reservation status is now "${fresh.status}" (Payment: ${fresh.paymentStatus}).`
            );
          }
        }
      } catch {
        // Silent failure on background polling
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [bookingId, booking, toast]);

  const handleCopyReference = () => {
    if (!booking?.bookingReference) return;
    navigator.clipboard.writeText(booking.bookingReference);
    setCopiedRef(true);
    toast.success('Copied', 'Booking reference copied to clipboard');
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleBack = () => {
    if (role === 'admin') {
      navigate('/admin/bookings');
    } else if (role === 'organiser') {
      navigate('/organiser/bookings');
    } else {
      navigate('/customer/bookings');
    }
  };

  // Confirm booking handler
  const handleConfirmReservation = async () => {
    if (!booking) return;
    setIsConfirming(true);
    try {
      const res = await bookingClient.confirmBooking(booking.id, {
        notes: confirmNotes.trim() || undefined,
        markPaymentPaid,
      });
      if (res.data) {
        setBooking(res.data);
        setIsConfirmModalOpen(false);
        setConfirmNotes('');
        toast.success(
          'Reservation Confirmed',
          `Booking ${res.data.bookingReference} status changed to confirmed.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to confirm reservation';
      toast.error('Confirmation Failed', msg);
    } finally {
      setIsConfirming(false);
    }
  };

  // Cancel booking handler
  const handleCancelReservation = async () => {
    if (!booking) return;
    setIsCancelling(true);
    try {
      const res = await bookingClient.cancelBooking(booking.id, cancelReason.trim() || undefined);
      if (res.data) {
        setBooking(res.data);
        setIsCancelModalOpen(false);
        setCancelReason('');
        toast.success(
          'Reservation Cancelled',
          `Booking ${res.data.bookingReference} has been cancelled and slot released.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel reservation';
      toast.error('Cancellation Failed', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between pb-6 border-b border-slate-200 animate-pulse">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded-md" />
            <div className="h-4 w-64 bg-slate-100 rounded-md" />
          </div>
          <div className="h-8 w-24 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-4 animate-pulse">
              <div className="h-5 w-36 bg-slate-200 rounded" />
              <div className="h-12 w-full bg-slate-100 rounded-xl" />
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="h-16 bg-slate-50 rounded-xl" />
                <div className="h-16 bg-slate-50 rounded-xl" />
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3 animate-pulse">
              <div className="h-5 w-40 bg-slate-200 rounded" />
              <div className="h-20 bg-slate-50 rounded-xl" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm space-y-3 animate-pulse">
              <div className="h-5 w-28 bg-slate-200 rounded" />
              <div className="h-24 bg-slate-50 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Reservation Not Found</h2>
        <p className="text-slate-600 mb-6">{error || 'The requested booking could not be located.'}</p>
        <Button variant="primary" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Bookings
        </Button>
      </div>
    );
  }

  // Format dates & times
  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedStartTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const formattedEndTime = endDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Top Bar with Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {booking.bookingReference}
              </h1>
              <button
                onClick={handleCopyReference}
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                title="Copy Reference"
              >
                {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Created on {new Date(booking.createdAt).toLocaleString('en-US')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/booking/confirmation/${booking.id}`, '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-1.5" /> Customer View
          </Button>

          {isOrganiserOrAdmin && booking.status === 'pending' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsConfirmModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Confirm Booking
            </Button>
          )}

          {booking.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <XCircle className="w-4 h-4 mr-1.5" /> Cancel Reservation
            </Button>
          )}
        </div>
      </div>

      {/* Status Highlights Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-slate-50/70 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Reservation Status
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  booking.status === 'confirmed'
                    ? 'emerald'
                    : booking.status === 'pending'
                    ? 'amber'
                    : booking.status === 'cancelled' || booking.status === 'payment-failed'
                    ? 'rose'
                    : 'slate'
                }
              >
                {booking.status.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/70 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Payment Status
            </span>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  booking.paymentStatus === 'paid'
                    ? 'emerald'
                    : booking.paymentStatus === 'pending'
                    ? 'amber'
                    : booking.paymentStatus === 'failed'
                    ? 'rose'
                    : 'slate'
                }
              >
                {booking.paymentStatus.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/70 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Attendees
            </span>
            <p className="text-lg font-bold text-slate-800">
              {booking.attendeeCount} {booking.attendeeCount === 1 ? 'Person' : 'People'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50/70 border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Amount
            </span>
            <p className="text-lg font-bold text-indigo-700">
              {booking.totalPrice === 0
                ? 'Free'
                : `${booking.priceCurrency} ${booking.totalPrice.toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Customer & Service Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info Card */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Customer Details</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {booking.customerId ? `ID: ${booking.customerId}` : 'Guest Booking'}
              </span>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Customer Name</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {booking.customerName || 'Anonymous Guest'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Email Address</span>
                  <div className="flex items-center gap-1.5 text-sm text-slate-800">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <a
                      href={`mailto:${booking.customerEmail}`}
                      className="text-indigo-600 hover:underline"
                    >
                      {booking.customerEmail || 'No email provided'}
                    </a>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Phone Number</span>
                  <div className="flex items-center gap-1.5 text-sm text-slate-800">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{booking.customerPhone || 'Not provided'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Attendee Seats</span>
                  <p className="text-sm font-semibold text-slate-900">{booking.attendeeCount}</p>
                </div>
              </div>

              {booking.notes && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs text-slate-400 block mb-1">Booking Notes / Remarks</span>
                  <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-line">
                    {booking.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Service & Resource Card */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Service & Resource Information</h3>
              </div>
              <Badge variant="slate">{booking.serviceCategory || 'Service'}</Badge>
            </div>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Service Name</span>
                  <p className="text-sm font-semibold text-slate-900">{booking.serviceName}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Allocated Provider / Resource</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {booking.resourceName || 'Auto-Assigned Resource'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Duration</span>
                  <p className="text-sm text-slate-800">
                    {booking.serviceDurationMinutes || 60} Minutes
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-0.5">Location / Venue</span>
                  <div className="flex items-center gap-1.5 text-sm text-slate-800">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{booking.resourceLocation || 'Virtual / ReservePulse Suite'}</span>
                  </div>
                </div>
              </div>

              {role === 'admin' && booking.organiserId && (
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Service Owner (Organiser ID):</span>
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    {booking.organiserId}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configurable Intake Question Answers Card */}
          {booking.answers && booking.answers.length > 0 && (
            <Card className="shadow-sm border-slate-200">
              <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Intake Responses ({booking.answers.length})
                </h3>
              </div>
              <CardContent className="p-5">
                <div className="space-y-4">
                  {booking.answers.map((ans, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-100">
                      <span className="text-xs font-semibold text-slate-600 block mb-1">
                        {ans.questionText}
                      </span>
                      <p className="text-sm text-slate-900 font-medium whitespace-pre-line">
                        {ans.answerText || <span className="text-slate-400 italic">No answer provided</span>}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Schedule, Payment, Audit */}
        <div className="space-y-6">
          {/* Schedule Card */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Schedule & Time</h3>
            </div>
            <CardContent className="p-5 space-y-4">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Date</span>
                <p className="text-sm font-bold text-slate-900">{formattedDate}</p>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Time Window</span>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  <span>
                    {formattedStartTime} – {formattedEndTime}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment & Financial Ledger Card */}
          <Card className="shadow-sm border-slate-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Payment Ledger</h3>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <CardContent className="p-5 space-y-3.5 text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Fee:</span>
                <span className="font-semibold text-slate-900">
                  {booking.totalPrice === 0
                    ? 'Free'
                    : `${booking.priceCurrency} ${booking.totalPrice.toFixed(2)}`}
                </span>
              </div>

              {booking.paymentSummary && (
                <>
                  <div className="flex justify-between items-center text-slate-600">
                    <span>Payment Method:</span>
                    <Badge variant="slate" className="capitalize">
                      {booking.paymentSummary.paymentMethod || 'Credit Card'}
                    </Badge>
                  </div>
                  {booking.paymentSummary.transactionReference && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Tx Reference:</span>
                      <span className="font-mono text-xs text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                        {booking.paymentSummary.transactionReference}
                      </span>
                    </div>
                  )}
                  {booking.paymentSummary.paidAt && (
                    <div className="flex justify-between items-center text-slate-600 text-xs">
                      <span>Paid Timestamp:</span>
                      <span>{new Date(booking.paymentSummary.paidAt).toLocaleTimeString()}</span>
                    </div>
                  )}
                </>
              )}

              {booking.paymentIntent && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex justify-between items-center">
                    <span>Intent Status:</span>
                    <span className="font-medium text-slate-700 capitalize">
                      {booking.paymentIntent.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cancellation History if cancelled */}
          {booking.status === 'cancelled' && (
            <Card className="shadow-sm border-rose-200 bg-rose-50/40">
              <div className="p-4 border-b border-rose-100 flex items-center gap-2 text-rose-800 font-bold">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Cancellation Information</span>
              </div>
              <CardContent className="p-4 space-y-2 text-sm">
                <div>
                  <span className="text-xs text-rose-500 block mb-0.5">Reason</span>
                  <p className="font-medium text-rose-900">
                    {booking.cancellationReason || 'No specific reason provided'}
                  </p>
                </div>
                {booking.cancelledAt && (
                  <div className="text-xs text-rose-600">
                    <span>Cancelled At: </span>
                    <span>{new Date(booking.cancelledAt).toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !isConfirming && setIsConfirmModalOpen(false)}
        title="Confirm Booking Reservation"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Confirming this reservation will verify the customer's appointment and update their booking status to{' '}
            <strong className="text-emerald-700">Confirmed</strong>.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Internal Confirmation Note (Optional)
            </label>
            <Input
              value={confirmNotes}
              onChange={(e) => setConfirmNotes(e.target.value)}
              placeholder="e.g. Approved by organizer, VIP hospitality requested"
            />
          </div>

          {booking.paymentStatus !== 'paid' && booking.totalPrice > 0 && (
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={markPaymentPaid}
                onChange={(e) => setMarkPaymentPaid(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Mark payment status as Paid (payment collected in person/externally)</span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmReservation}
              isLoading={isConfirming}
              disabled={isConfirming}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Reservation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => !isCancelling && setIsCancelModalOpen(false)}
        title="Cancel Booking Reservation"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to cancel booking{' '}
            <strong className="text-slate-900">{booking.bookingReference}</strong>? The reserved time slot
            capacity will be released immediately so other customers can book.
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Reason for Cancellation (Required)
            </label>
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Scheduling conflict, customer request, facility maintenance"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelModalOpen(false)}
              disabled={isCancelling}
            >
              Keep Reservation
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelReservation}
              isLoading={isCancelling}
              disabled={isCancelling || !cancelReason.trim()}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
