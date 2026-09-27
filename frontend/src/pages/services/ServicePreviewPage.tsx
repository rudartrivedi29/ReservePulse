import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  EmptyState,
  Spinner,
  useToast,
} from '../../components/ui';
import { serviceClient, type ServiceItem } from '../../services/service.service';
import { BookingWizard } from '../../components/booking';
import { useAuth } from '../../context/useAuth';

export const ServicePreviewPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [service, setService] = useState<ServiceItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchPreview = async () => {
      if (!shareToken) {
        setError('Missing share token parameter.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await serviceClient.previewByShareToken(shareToken);
        if (res.data) {
          setService(res.data);
        } else {
          setError(res.message || 'Service preview not available.');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Invalid or expired preview share link.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [shareToken]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Share Link Copied', 'Confidential preview URL has been copied to your clipboard.');
  };

  const handlePublishService = async () => {
    if (!service) return;
    setIsPublishing(true);
    try {
      const res = await serviceClient.publishService(service.id);
      if (res.data) {
        setService(res.data);
        toast.success('Service Published!', `"${service.name}" is now live and listed in the catalog.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to publish service';
      toast.error('Publication Failed', message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Spinner size="lg" color="emerald" />
        <p className="text-sm font-semibold text-slate-600 animate-pulse">
          Loading confidential service preview...
        </p>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <EmptyState
          preset="no-results"
          variant="card"
          title="Service Preview Unavailable"
          description={error || 'This service share link is invalid, expired, or has been revoked by the organiser.'}
          action={
            <Button variant="primary" size="sm" onClick={() => navigate('/services')}>
              Browse Public Catalog
            </Button>
          }
          secondaryAction={
            user.role === 'organiser' || user.role === 'admin' ? (
              <Button variant="outline" size="sm" onClick={() => navigate('/organiser/services')}>
                Back to Organiser Dashboard
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const isDraft = !service.isPublished;
  const isOwner = user.role === 'admin' || (user.role === 'organiser' && (!service.organiserId || service.organiserId === user.id));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 font-sans space-y-6">
      {/* Top Banner Alert */}
      <div
        className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs ${
          isDraft
            ? 'bg-amber-50/90 border-amber-200/90 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-200/90 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
              isDraft ? 'bg-amber-200/70 text-amber-800' : 'bg-emerald-200/70 text-emerald-800'
            }`}
          >
            {isDraft ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              {isDraft ? 'Unpublished Service Preview' : 'Live Service Preview'}
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              {isDraft
                ? 'This service is currently saved as a draft. It is visible only to people with this secret preview share link.'
                : 'This service is currently published and open for scheduling.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            variant="secondary"
            size="xs"
            onClick={handleCopyLink}
            leftIcon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
          >
            Copy Share Link
          </Button>

          {isOwner && isDraft && (
            <Button
              variant="primary"
              size="xs"
              isLoading={isPublishing}
              onClick={handlePublishService}
            >
              Publish Now
            </Button>
          )}
        </div>
      </div>

      {/* Main Service Presentation Card */}
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="border-b border-slate-100/80 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                  {service.category || 'General'}
                </span>
                <Badge variant={isDraft ? 'amber' : 'emerald'} size="xs" dot>
                  {isDraft ? 'Draft (Unpublished)' : 'Active (Published)'}
                </Badge>
                {service.requiresManualConfirmation && (
                  <Badge variant="blue" size="xs">
                    Manual Confirmation
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl sm:text-3xl text-slate-900 font-extrabold tracking-tight">
                {service.name}
              </CardTitle>
            </div>

            <div className="text-right sm:text-right shrink-0">
              <div className="text-2xl font-black text-slate-900">
                {service.paymentSetting === 'free'
                  ? 'Free'
                  : `${service.priceCurrency} ${Number(service.priceAmount).toFixed(2)}`}
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {service.paymentSetting === 'free'
                  ? 'Complimentary session'
                  : service.paymentSetting === 'paid'
                  ? 'Paid upfront online'
                  : 'Pay in person upon arrival'}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Overview &amp; Details
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              {service.description}
            </p>
          </div>

          {/* Specifications Grid */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Service Specifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-[11px] font-semibold text-slate-500 block">Duration</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {service.durationMinutes} minutes
                </span>
                <span className="text-[10px] text-slate-400">Scheduled session block</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-[11px] font-semibold text-slate-500 block">Appointment Type</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block capitalize">
                  {service.capacityType === 'individual'
                    ? '1-on-1 Individual'
                    : service.capacityType === 'group'
                    ? 'Group Session'
                    : 'Resource Constrained'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Capacity: {service.defaultCapacity} {service.defaultCapacity === 1 ? 'attendee' : 'attendees'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-[11px] font-semibold text-slate-500 block">Resource Assignment</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block capitalize">
                  {service.resourceAssignmentMode.replace('_', ' ')}
                </span>
                <span className="text-[10px] text-slate-400">Automatic room/staff allocation</span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-[11px] font-semibold text-slate-500 block">Booking Policy</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                  {service.requiresManualConfirmation ? 'Requires Organiser Approval' : 'Instant Confirmation'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {service.requiresManualConfirmation ? 'Manual review before lock' : 'Confirmed immediately upon selection'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-[11px] font-semibold text-slate-500 block">Payment Setting</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block capitalize">
                  {service.paymentSetting.replace(/_/g, ' ')}
                </span>
                <span className="text-[10px] text-slate-400">
                  {service.paymentSetting === 'free' ? 'No payment gateway required' : 'Stripe & local payment ready'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200/80 bg-white">
                <span className="text-[11px] font-semibold text-slate-500 block">Preview Secret Token</span>
                <span className="text-xs font-mono text-slate-600 truncate mt-1 block">
                  {service.shareToken.substring(0, 16)}...
                </span>
                <span className="text-[10px] text-slate-400">Protected unpublished link</span>
              </div>
            </div>
          </div>

          {/* Booking Engine Preview / Launch */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-slate-100 border border-indigo-100 text-center space-y-3">
            <h5 className="text-sm font-bold text-slate-900">Live Reservation Engine</h5>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Test real-time slot generation, provider capacity, and double-validation checkout flow for this service.
            </p>
            <div>
              <Button
                variant="primary"
                size="md"
                onClick={() => setIsWizardOpen(true)}
              >
                Launch Booking Flow &rarr;
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Booking Wizard */}
      {isWizardOpen && (
        <BookingWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          preSelectedServiceId={service.id}
          onBookingSuccess={(booking) => {
            setIsWizardOpen(false);
            toast.success(
              'Reservation Created',
              `Verified booking ${booking.bookingReference} registered.`
            );
          }}
        />
      )}

      {/* Navigation footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (user.role === 'organiser' || user.role === 'admin') {
              navigate('/organiser/services');
            } else {
              navigate('/services');
            }
          }}
          leftIcon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          }
        >
          {user.role === 'organiser' || user.role === 'admin' ? 'Back to Services Management' : 'Back to Catalog'}
        </Button>
      </div>
    </div>
  );
};
