import React, { useState } from 'react';
import {
  Modal,
  Button,
  Badge,
  Input,
  useToast,
} from '../ui';
import {
  type BookingItem,
  bookingClient,
} from '../../services/booking.service';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CreditCard,
  FileText,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

interface BookingDetailsModalProps {
  booking: BookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelled?: (cancelledBooking: BookingItem) => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  onCancelled,
}) => {
  const { toast } = useToast();
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!booking) return null;

  const handleCopyReference = () => {
    navigator.clipboard.writeText(booking.bookingReference);
    setCopied(true);
    toast.success('Copied to Clipboard', `Reference ${booking.bookingReference} copied.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCancelBooking = async () => {
    setIsCancelling(true);
    try {
      const res = await bookingClient.cancelBooking(booking.id, cancelReason);
      if (res.data) {
        toast.success(
          'Reservation Cancelled',
          `Your appointment ${booking.bookingReference} has been cancelled and the slot released.`
        );
        setIsCancelConfirmOpen(false);
        if (onCancelled) {
          onCancelled(res.data);
        }
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel reservation';
      toast.error('Cancellation Error', msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const startDate = new Date(booking.startTime);
  const endDate = new Date(booking.endTime);

  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = `${startDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })} - ${endDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="emerald" dot>Confirmed</Badge>;
      case 'pending':
        return <Badge variant="amber" dot>Pending Approval</Badge>;
      case 'in_progress':
        return <Badge variant="blue" dot>In Progress</Badge>;
      case 'completed':
        return <Badge variant="purple" dot>Completed</Badge>;
      case 'cancelled':
        return <Badge variant="rose" dot>Cancelled</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  const canCancel = booking.status === 'confirmed' || booking.status === 'pending';

  return (
    <>
      <Modal
        isOpen={isOpen && !isCancelConfirmOpen}
        onClose={onClose}
        title="Reservation Details"
        description={`Reference Code: ${booking.bookingReference}`}
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {canCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  onClick={() => setIsCancelConfirmOpen(true)}
                >
                  Cancel Reservation
                </Button>
              )}
            </div>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-6 font-sans">
          {/* Header Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs uppercase tracking-wider text-indigo-300 font-semibold">
                    {booking.serviceCategory || 'Service'}
                  </span>
                  {getStatusBadge(booking.status)}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {booking.serviceName}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopyReference}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition-colors self-start sm:self-auto border border-white/10"
                title="Click to copy reference"
              >
                <span>{booking.bookingReference}</span>
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              </button>
            </div>
          </div>

          {/* Time & Resource Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Date & Schedule</span>
              </div>
              <div className="text-sm font-bold text-slate-900">{formattedDate}</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedTime}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>Resource / Facility</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {booking.resourceName || 'Assigned Resource'}
              </div>
              <div className="text-xs text-slate-600">
                {booking.resourceLocation || 'Main Campus'} {booking.resourceType ? `• Type: ${booking.resourceType}` : ''}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Attendees & Reserved Capacity</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {booking.attendeeCount} {booking.attendeeCount === 1 ? 'Attendee' : 'Attendees'}
              </div>
              <div className="text-xs text-slate-600">
                Reserved for {booking.customerName || 'Customer'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <span>Billing Contract</span>
              </div>
              <div className="text-sm font-bold text-slate-900">
                {booking.totalPrice === 0 ? 'Free of Charge' : `${booking.priceCurrency} ${booking.totalPrice.toFixed(2)}`}
              </div>
              <div className="text-xs text-amber-600 font-medium">
                Payment Deferred (No payment collected yet)
              </div>
            </div>
          </div>

          {/* Cancellation Notice if cancelled */}
          {booking.status === 'cancelled' && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <div className="font-bold text-rose-950">This reservation was cancelled</div>
                <div className="text-rose-700 mt-0.5">
                  Reason: {booking.cancellationReason || 'Cancelled by customer'}
                </div>
                {booking.cancelledAt && (
                  <div className="text-rose-500 mt-1">
                    On {new Date(booking.cancelledAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Intake Questions & Answers */}
          {booking.answers && booking.answers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Service Intake Questions & Responses</span>
              </h4>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
                {booking.answers.map((ans, idx) => (
                  <div key={idx} className="p-3 space-y-1">
                    <div className="font-semibold text-slate-700">{ans.questionText}</div>
                    <div className="text-slate-900 bg-slate-50 p-2 rounded-lg font-mono text-[11px] whitespace-pre-wrap">
                      {ans.answerText || 'None provided'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-500">Customer Notes:</span>
              <p className="text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {booking.notes}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="Confirm Reservation Cancellation"
        description={`Are you sure you want to cancel reservation ${booking.bookingReference}?`}
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={isCancelling}
            >
              Keep Reservation
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelBooking}
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
              Releasing this reservation will free up the time slot on{' '}
              <span className="font-bold">{formattedDate}</span> for other customers to book.
            </div>
          </div>

          <Input
            label="Reason for cancellation (optional)"
            placeholder="e.g. Schedule conflict, project postponed..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
};
