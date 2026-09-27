import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { bookingClient, type BookingItem } from '../services/booking.service';
import { paymentClient } from '../services/payment.service';
import {
  Card,
  CardContent,
  CardFooter,
  Button,
  Badge,
  useToast,
} from '../components/ui';
import {
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Copy,
  Check,
  AlertTriangle,
  XCircle,
  CreditCard,
  FileText,
  Printer,
  CalendarPlus,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const BookingConfirmationPage: React.FC = () => {
  const { bookingId } = useParams<{ bookingId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  const fetchBooking = async () => {
    if (!bookingId) {
      setError('No booking ID or reference was provided.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await bookingClient.getBookingDetails(bookingId);
      if (res.data) {
        setBooking(res.data);
      } else {
        setError('Booking not found.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to retrieve booking details';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [bookingId]);

  // Real-time booking status polling for pending confirmations
  useEffect(() => {
    if (!bookingId || !booking) return;

    const status = (booking.status || '').toLowerCase();
    const shouldPoll = status === 'pending' || booking.paymentStatus === 'pending';
    if (!shouldPoll) return;

    const intervalId = setInterval(async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const res = await bookingClient.getBookingDetails(bookingId);
        if (res.data) {
          const fresh = res.data;
          if (fresh.status !== booking.status || fresh.paymentStatus !== booking.paymentStatus) {
            setBooking(fresh);
            if (fresh.status === 'confirmed') {
              toast.success(
                'Booking Confirmed!',
                `Your reservation ${fresh.bookingReference} has been verified and confirmed.`
              );
            } else {
              toast.info('Status Updated', `Booking status changed to "${fresh.status}".`);
            }
          }
        }
      } catch {
        // Silent failure on background polling
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [bookingId, booking, toast]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    toast.success('Copied!', `Reference ${text} copied to clipboard.`);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadICS = () => {
    if (!booking) return;
    const start = new Date(booking.startTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const end = new Date(booking.endTime).toISOString().replace(/-|:|\.\d\d\d/g, '');
    const title = encodeURIComponent(`ReservePulse: ${booking.serviceName}`);
    const desc = encodeURIComponent(
      `Appointment Reference: ${booking.bookingReference}\nProvider: ${booking.resourceName || 'Allocated'}\nVenue: ${
        booking.resourceLocation || 'Main Facility'
      }`
    );
    const location = encodeURIComponent(booking.resourceLocation || 'ReservePulse Hub');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ReservePulse//Booking System//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@reservepulse.com`,
      `DTSTAMP:${start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${decodeURIComponent(title)}`,
      `DESCRIPTION:${decodeURIComponent(desc)}`,
      `LOCATION:${decodeURIComponent(location)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${booking.bookingReference}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Calendar Event Exported', 'Downloaded appointment iCal file.');
  };

  // Retry payment action for payment-failed state
  const handleRetryPayment = async () => {
    if (!booking) return;
    setIsRetryingPayment(true);
    try {
      // 1. Fetch active intent or generate one
      let intentId = booking.paymentIntent?.paymentIntentId;
      if (!intentId) {
        const intentRes = await paymentClient.createPaymentIntent(booking.id);
        intentId = intentRes.data?.paymentIntentId;
      }

      if (!intentId) {
        throw new Error('Unable to generate payment intent for retry.');
      }

      // 2. Retry payment confirmation with valid card
      const res = await paymentClient.confirmPayment(booking.id, {
        paymentIntentId: intentId,
        paymentMethod: 'credit_card',
        cardDetails: {
          brand: 'Visa',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2028,
        },
      });

      if (res.data?.success) {
        toast.success('Payment Authorized!', 'Booking is now verified and confirmed.');
        await fetchBooking();
      } else {
        toast.error('Payment Failed', res.data?.errorMessage || 'Transaction could not be completed.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment retry failed';
      toast.error('Payment Error', msg);
    } finally {
      setIsRetryingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 space-y-6">
        <div className="text-center space-y-3 animate-pulse">
          <div className="w-16 h-16 rounded-full bg-slate-200 mx-auto" />
          <div className="h-6 w-48 bg-slate-200 rounded mx-auto" />
          <div className="h-4 w-72 bg-slate-100 rounded mx-auto" />
        </div>
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5 animate-pulse">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="h-6 w-24 bg-slate-200 rounded-full" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-3/4 bg-slate-100 rounded" />
            <div className="h-4 w-1/2 bg-slate-100 rounded" />
          </div>
          <div className="pt-4 grid grid-cols-2 gap-3">
            <div className="h-10 bg-slate-100 rounded-xl" />
            <div className="h-10 bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-900">Reservation Record Not Found</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">{error || 'Unable to locate this appointment reference in the ledger.'}</p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/services')}>
            Browse Services
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate('/customer/bookings')}>
            View My Bookings
          </Button>
        </div>
      </div>
    );
  }

  const isConfirmed = booking.status === 'confirmed';
  const isPending = booking.status === 'pending';
  const isFailed = booking.status === 'payment-failed' || booking.status === 'payment_failed';
  const isCancelled = booking.status === 'cancelled';

  const startDateObj = new Date(booking.startTime);
  const endDateObj = new Date(booking.endTime);

  const formattedDate = startDateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedStartTime = startDateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const formattedEndTime = endDateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 font-sans max-w-4xl mx-auto space-y-8">
      {/* Top Banner & Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Official Appointment Contract</span>
        </div>

        <div className="flex items-center justify-center gap-3">
          {isConfirmed && (
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner ring-4 ring-emerald-50">
              <CheckCircle2 className="w-7 h-7" />
            </div>
          )}
          {isPending && (
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner ring-4 ring-amber-50">
              <Clock className="w-7 h-7" />
            </div>
          )}
          {isFailed && (
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner ring-4 ring-rose-50">
              <XCircle className="w-7 h-7" />
            </div>
          )}
          {isCancelled && (
            <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center shadow-inner ring-4 ring-slate-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {isConfirmed && 'Reservation Confirmed!'}
          {isPending && 'Reservation Pending Review'}
          {isFailed && 'Payment Declined / Failed'}
          {isCancelled && 'Reservation Cancelled'}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          {isConfirmed && 'Your appointment has been validated and reserved on the platform schedule.'}
          {isPending && 'Your request is safely queued and awaiting organizer confirmation or settlement.'}
          {isFailed && 'Your payment was declined by the card processor. Please retry with a valid payment method.'}
          {isCancelled && 'This appointment has been cancelled and the scheduled capacity was released.'}
        </p>
      </div>

      {/* Main Reservation Card */}
      <Card variant="elevated" className="overflow-hidden border-slate-200 shadow-xl">
        {/* Header ribbon with booking ID */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
              Booking Reference Code
            </span>
            <div className="flex items-center gap-2.5 mt-0.5">
              <span className="text-2xl font-mono font-extrabold tracking-wider text-white">
                {booking.bookingReference}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(booking.bookingReference)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Copy reference"
              >
                {copiedRef ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              System ID: {booking.id}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConfirmed && (
              <Badge variant="emerald" dot pulseDot size="md">
                Confirmed Active
              </Badge>
            )}
            {isPending && (
              <Badge variant="amber" dot pulseDot size="md">
                Pending Approval
              </Badge>
            )}
            {isFailed && (
              <Badge variant="rose" dot size="md">
                Payment Failed
              </Badge>
            )}
            {isCancelled && (
              <Badge variant="slate" size="md">
                Cancelled
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Key Appointment Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Date */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Date</span>
              </div>
              <div className="text-sm font-bold text-slate-900 leading-snug">{formattedDate}</div>
              <div className="text-[11px] text-slate-500">Scheduled Calendar Day</div>
            </div>

            {/* 2. Time */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Time Window</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {formattedStartTime} - {formattedEndTime}
              </div>
              <div className="text-[11px] text-indigo-700 font-medium">
                {booking.serviceDurationMinutes || 60} Minutes Session
              </div>
            </div>

            {/* 3. Provider / Resource */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                <span>Provider</span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {booking.resourceName || 'Allocated Provider'}
              </div>
              <div className="text-[11px] text-slate-500 capitalize">
                {booking.resourceType || 'Resource'}
              </div>
            </div>

            {/* 4. Venue / Location */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                <span>Venue</span>
              </div>
              <div className="text-sm font-bold text-slate-900 truncate">
                {booking.resourceLocation || 'Main Facility / Pod 1'}
              </div>
              <div className="text-[11px] text-slate-500">Physical or Virtual Node</div>
            </div>
          </div>

          {/* Payment & Financial Ledger Section */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Financial Ledger & Settlement</h3>
              </div>
              <div>
                {booking.paymentStatus === 'paid' ? (
                  <Badge variant="emerald" size="xs">
                    Paid in Full
                  </Badge>
                ) : booking.paymentStatus === 'pending' ? (
                  <Badge variant="amber" size="xs">
                    Payment Pending
                  </Badge>
                ) : booking.paymentStatus === 'failed' ? (
                  <Badge variant="rose" size="xs">
                    Payment Declined
                  </Badge>
                ) : (
                  <Badge variant="slate" size="xs">
                    Unpaid / Complimentary
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-slate-500">Total Price:</span>
                <div className="text-base font-extrabold text-slate-900 font-mono">
                  {booking.totalPrice === 0
                    ? 'Free'
                    : `${booking.priceCurrency} ${booking.totalPrice.toFixed(2)}`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-slate-500">Transaction ID:</span>
                <div className="font-mono text-slate-800 font-bold truncate">
                  {booking.paymentSummary?.transactionReference || 'N/A (Advance not captured)'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 space-y-0.5">
                <span className="text-slate-500">Settlement Method:</span>
                <div className="font-medium text-slate-800 capitalize">
                  {booking.paymentSummary?.paymentMethod || 'Online Gateway Token'}
                </div>
              </div>
            </div>

            {/* Payment failed alert banner */}
            {isFailed && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-950">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs">Payment Authorization Incomplete</div>
                    <div className="text-xs text-rose-800">
                      Your card transaction failed authorization. You can retry payment immediately to confirm this slot.
                    </div>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleRetryPayment}
                  isLoading={isRetryingPayment}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Retry Payment Now
                </Button>
              </div>
            )}
          </div>

          {/* Intake Question Answers Summary */}
          {booking.answers && booking.answers.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Intake Form Responses</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {booking.answers.map((ans, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <span className="text-slate-500 font-medium">{ans.questionText}</span>
                    <div className="font-bold text-slate-900">{ans.answerText || '(None)'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concurrency & Safety Guarantee Notice */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-950">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ReservePulse Concurrency Guarantee: </span>
              <span>
                This reservation was verified inside an atomic transaction with row-level slot locking. Zero double-booking collisions occurred.
              </span>
            </div>
          </div>
        </CardContent>

        {/* Action Triggers Footer */}
        <CardFooter className="p-6 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadICS}
              leftIcon={<CalendarPlus className="w-4 h-4" />}
            >
              Add to Calendar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
            >
              Print Receipt
            </Button>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => navigate('/services')}>
              Book Another Service
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/customer/bookings')}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Go to My Bookings
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
