import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Modal,
  Button,
  Badge,
  Input,
  Select,
  Calendar,
  Spinner,
  useToast,
  EmptyState,
} from '../ui';
import {
  serviceClient,
  type ServiceItem,
} from '../../services/service.service';
import {
  bookingClient,
  type BookableSlot,
  type ServiceQuestionItem,
  type BookingItem,
} from '../../services/booking.service';
import type { ResourceItem } from '../../services/resource.service';
import { ApiError } from '../../services/api';
import { useAuth } from '../../context/useAuth';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Clock,
  FileQuestion,
  CheckCircle2,
  Sparkles,
  Info,
  AlertCircle,
  Copy,
  Cpu,
  Building,
  User,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export interface BookingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedServiceId?: string;
  preSelectedResourceId?: string;
  onBookingSuccess?: (booking: BookingItem) => void;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  isOpen,
  onClose,
  preSelectedServiceId,
  preSelectedResourceId,
  onBookingSuccess,
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step state: 1 to 7
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Service selection
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Step 2: Provider / Resource selection
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [selectedResource, setSelectedResource] = useState<ResourceItem | null>(null); // null = "Any available"
  const [isLoadingResources, setIsLoadingResources] = useState(false);

  // Helper to format local date without UTC shift
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Step 3 & 4: Date & Real-time Slots selection
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // Default to tomorrow
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [availableSlots, setAvailableSlots] = useState<BookableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSilentRefreshing, setIsSilentRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [slotFetchError, setSlotFetchError] = useState<string | null>(null);
  const [slotConflictMessage, setSlotConflictMessage] = useState<string | null>(null);

  // Step 5: Capacity (Attendee Count)
  const [attendeeCount, setAttendeeCount] = useState<number>(1);

  // Synchronization refs to keep callbacks stable and eliminate circular re-render loops
  const selectedSlotRef = useRef<BookableSlot | null>(selectedSlot);
  selectedSlotRef.current = selectedSlot;

  const currentStepRef = useRef<number>(currentStep);
  currentStepRef.current = currentStep;

  const attendeeCountRef = useRef<number>(attendeeCount);
  attendeeCountRef.current = attendeeCount;

  // Step 6: Intake Questions & Customer Info
  const [questions, setQuestions] = useState<ServiceQuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [bookingNotes, setBookingNotes] = useState('');

  // Step 7: Confirmation & Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<BookingItem | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());





  // Update user profile fields if user changes or logs in
  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.email && !customerEmail) setCustomerEmail(user.email);
    if (user?.phone && !customerPhone) setCustomerPhone(user.phone);
  }, [user, customerName, customerEmail, customerPhone]);

  // Load published services
  useEffect(() => {
    if (!isOpen) return;
    const fetchServices = async () => {
      setIsLoadingServices(true);
      try {
        const res = await serviceClient.getPublicServices();
        if (res.data) {
          const published = res.data.filter((s) => s.isActive);
          setServices(published);

          // If preselected service exists
          if (preSelectedServiceId) {
            const found = published.find((s) => s.id === preSelectedServiceId);
            if (found) {
              setSelectedService(found);
              setCurrentStep(2);
            }
          }
        }
      } catch (err: unknown) {
        toast.error('Network Error', 'Failed to retrieve available services');
      } finally {
        setIsLoadingServices(false);
      }
    };
    fetchServices();
  }, [isOpen, preSelectedServiceId, toast]);

  // Load resources when a service is selected
  useEffect(() => {
    if (!selectedService) return;
    const fetchResources = async () => {
      setIsLoadingResources(true);
      try {
        const res = await bookingClient.getServiceResources(selectedService.id);
        if (res.data) {
          setResources(res.data);
          if (preSelectedResourceId) {
            const pre = res.data.find((r) => r.id === preSelectedResourceId);
            if (pre) setSelectedResource(pre);
          }
        }
      } catch {
        setResources([]);
      } finally {
        setIsLoadingResources(false);
      }
    };
    fetchResources();
  }, [selectedService, preSelectedResourceId]);

  // Load intake questions when a service is selected
  useEffect(() => {
    if (!selectedService) return;
    const fetchQuestions = async () => {
      setIsLoadingQuestions(true);
      try {
        const res = await bookingClient.getServiceQuestions(selectedService.id);
        if (res.data) {
          setQuestions(res.data);
        }
      } catch {
        setQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    fetchQuestions();
  }, [selectedService]);

  // Load real-time slots when selectedService, selectedDate, or selectedResource changes
  const fetchRealTimeSlots = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!selectedService || !selectedDate) return;
      const isSilent = Boolean(options?.silent);

      if (!isSilent) {
        setIsLoadingSlots(true);
        setSlotFetchError(null);
      } else {
        setIsSilentRefreshing(true);
      }

      const dateStr = formatLocalDate(selectedDate);

      try {
        const res = await bookingClient.getServiceAvailability(selectedService.id, {
          startDate: dateStr,
          endDate: dateStr,
          resourceId: selectedResource?.id,
          attendees: attendeeCountRef.current,
        });

        const matchingDay =
          res.data?.days?.find((d) => d.date === dateStr) || res.data?.days?.[0];
        const daySlots = matchingDay?.slots || [];
        setAvailableSlots(daySlots);
        setLastRefreshedAt(new Date());

        // Validate or synchronize currently selected slot against fresh slots without wiping
        const currentSelected = selectedSlotRef.current;
        if (currentSelected) {
          const matchingSlot = daySlots.find(
            (s) =>
              s.id === currentSelected.id ||
              (s.startDateTime === currentSelected.startDateTime && s.resourceId === currentSelected.resourceId)
          );

          if (!matchingSlot || matchingSlot.remainingCapacity < attendeeCountRef.current) {
            // Stale slot selection detected
            setSelectedSlot(null);
            const notice = `The slot at ${currentSelected.startTime} is no longer available. Another customer just reserved it.`;
            setSlotConflictMessage(notice);
            toast.warning('Slot Taken', 'Your selected slot was taken by another user. Schedule refreshed.');
            if (currentStepRef.current > 4) {
              setCurrentStep(4);
            }
          } else {
            // Keep current selection with latest remaining capacity
            setSelectedSlot(matchingSlot);
          }
        }
      } catch (err: unknown) {
        if (!isSilent) {
          const msg = err instanceof Error ? err.message : 'Failed to query real-time availability';
          setSlotFetchError(msg);
          setAvailableSlots([]);
        }
      } finally {
        if (!isSilent) {
          setIsLoadingSlots(false);
        } else {
          setIsSilentRefreshing(false);
        }
      }
    },
    [selectedService?.id, selectedDate, selectedResource?.id, toast]
  );

  useEffect(() => {
    if (currentStep === 3 || currentStep === 4) {
      fetchRealTimeSlots();
    }
  }, [currentStep, fetchRealTimeSlots]);

  // Real-time background availability polling every 12 seconds
  useEffect(() => {
    if (!isOpen || !selectedService || !selectedDate || completedBooking || isSubmitting) {
      return;
    }

    if (currentStep < 3 || currentStep > 7) {
      return;
    }

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRealTimeSlots({ silent: true });
      }
    }, 12000);

    return () => clearInterval(intervalId);
  }, [isOpen, selectedService, selectedDate, completedBooking, isSubmitting, currentStep, fetchRealTimeSlots]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    services.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats);
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchCat =
        selectedCategory === 'All' || s.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.description.toLowerCase().includes(serviceSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [services, selectedCategory, serviceSearch]);

  // Navigation handlers
  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!selectedService) {
        toast.error('Selection Required', 'Please select a service to proceed.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3 || currentStep === 4) {
      if (!selectedDate) {
        toast.error('Date Required', 'Please choose an appointment date on the calendar.');
        return;
      }
      if (!selectedSlot) {
        toast.error('Slot Required', 'Please select an available appointment time slot.');
        return;
      }
      setCurrentStep(5);
    } else if (currentStep === 5) {
      if (attendeeCount < 1) {
        toast.error('Capacity Error', 'Attendee count must be at least 1.');
        return;
      }
      if (selectedSlot && attendeeCount > selectedSlot.remainingCapacity) {
        toast.error(
          'Capacity Exceeded',
          `The selected slot has only ${selectedSlot.remainingCapacity} seats remaining.`
        );
        return;
      }
      setCurrentStep(6);
    } else if (currentStep === 6) {
      // Validate customer info
      if (!customerName.trim()) {
        toast.error('Input Required', 'Please provide your full name.');
        return;
      }
      if (!customerEmail.trim() || !customerEmail.includes('@')) {
        toast.error('Input Required', 'Please provide a valid contact email address.');
        return;
      }

      // Validate intake questions
      for (const q of questions) {
        const val = answers[q.id]?.trim() || '';
        if (q.isRequired && !val) {
          toast.error(
            'Required Question',
            q.questionType === 'select'
              ? `Please select an option for: "${q.questionText}"`
              : `Please answer: "${q.questionText}"`
          );
          return;
        }

        if (val && q.questionType === 'number' && isNaN(Number(val))) {
          toast.error('Invalid Number', `Please provide a numeric value for: "${q.questionText}"`);
          return;
        }
      }
      setSubmitError(null);
      setCurrentStep(7);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setSubmitError(null);
      setCurrentStep(currentStep - 1);
    }
  };

  // Final Confirmation: Submit reservation with double validation and duplicate prevention
  const handleConfirmReservation = async () => {
    if (!selectedService || !selectedSlot) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const answersPayload = Object.entries(answers).map(([qId, val]) => ({
      questionId: qId,
      answerText: val,
    }));

    try {
      const res = await bookingClient.createBooking({
        serviceId: selectedService.id,
        resourceId: selectedSlot.resourceId,
        startDateTime: selectedSlot.startDateTime,
        endDateTime: selectedSlot.endDateTime,
        slotId: selectedSlot.id,
        attendeeCount,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: bookingNotes.trim() || undefined,
        answers: answersPayload,
        idempotencyKey,
      });

      if (res.data) {
        const finalBooking = res.data;
        setCompletedBooking(finalBooking);

        toast.success(
          'Booking Confirmed!',
          `Reservation ${finalBooking.bookingReference} has been verified and registered.`
        );

        if (onBookingSuccess) {
          onBookingSuccess(finalBooking);
        }
      }
    } catch (err: unknown) {
      const isConflict =
        (err instanceof ApiError && (err.statusCode === 409 || err.code === 'SLOT_UNAVAILABLE')) ||
        (err instanceof Error && (
          err.message.toLowerCase().includes('no longer available') ||
          err.message.toLowerCase().includes('capacity overrun') ||
          err.message.toLowerCase().includes('insufficient remaining capacity') ||
          err.message.toLowerCase().includes('already being processed') ||
          err.message.toLowerCase().includes('conflict')
        ));

      if (isConflict) {
        const conflictDetail =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'The selected time slot is no longer available. Another customer just reserved this slot.';

        setSlotConflictMessage(conflictDetail);
        setSelectedSlot(null);
        setIdempotencyKey(crypto.randomUUID());
        toast.error(
          'Slot No Longer Available',
          'Another customer just booked this slot. We have refreshed the availability schedule.'
        );
        fetchRealTimeSlots();
        setCurrentStep(4);
        return;
      }

      const message = err instanceof Error ? err.message : 'Reservation submission failed';
      setSubmitError(message);
      toast.error('Booking Verification Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyReference = () => {
    if (!completedBooking) return;
    navigator.clipboard.writeText(completedBooking.bookingReference);
    setCopiedRef(true);
    toast.success('Copied!', `Reference ${completedBooking.bookingReference} copied to clipboard.`);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedService(null);
    setSelectedResource(null);
    setSelectedSlot(null);
    setAttendeeCount(1);
    setAnswers({});
    setBookingNotes('');
    setCompletedBooking(null);
    setSubmitError(null);
    setSlotConflictMessage(null);
    setIdempotencyKey(crypto.randomUUID());
  };

  const stepTitles = [
    'Service',
    'Provider',
    'Date',
    'Time Slot',
    'Capacity',
    'Intake Form',
    'Confirm',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      className="p-0 overflow-hidden"
    >
      <div className="flex flex-col h-full max-h-[85vh] font-sans">
        {/* Top Header & Progress Stepper */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>ReservePulse Appointment Concierge</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-0.5">
                {completedBooking
                  ? 'Reservation Confirmed'
                  : `Step ${currentStep} of 7: ${stepTitles[currentStep - 1]}`}
              </h2>
            </div>
            {!completedBooking && (
              <Badge variant="blue" className="bg-white/10 text-indigo-200 border-white/10 self-start sm:self-auto">
                No Payment Required Today
              </Badge>
            )}
          </div>

          {/* Stepper Pill Bar */}
          {!completedBooking && (
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-2">
              {stepTitles.map((title, idx) => {
                const stepNum = idx + 1;
                const isPassed = currentStep > stepNum;
                const isCurrent = currentStep === stepNum;
                return (
                  <div key={title} className="flex flex-col items-center">
                    <div
                      className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        isPassed
                          ? 'bg-emerald-400'
                          : isCurrent
                          ? 'bg-indigo-400 shadow-sm shadow-indigo-500/50'
                          : 'bg-white/15'
                      }`}
                    />
                    <span
                      className={`text-[10px] hidden sm:block mt-1 font-medium truncate w-full text-center ${
                        isPassed
                          ? 'text-emerald-300'
                          : isCurrent
                          ? 'text-white font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {title}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/60">
          {/* ============================================================ */}
          {/* SUCCESS SCREEN */}
          {/* ============================================================ */}
          {completedBooking ? (
            <div className="py-6 sm:py-10 max-w-lg mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-600 font-bold">
                  Double Validation Verified
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">
                  You're Booked!
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Your reservation contract has been locked and registered in the platform ledger.
                </p>
              </div>

              {/* Reference Box */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                <span className="text-xs text-slate-500 font-medium">Your Booking Reference</span>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl font-mono font-bold tracking-wider text-indigo-950">
                    {completedBooking.bookingReference}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyReference}
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Copy reference code"
                  >
                    {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Appointment summary card */}
              <div className="p-4 rounded-2xl bg-slate-100/80 text-left text-xs space-y-2 border border-slate-200/80">
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Service:</span>
                  <span className="font-bold text-slate-900">{completedBooking.serviceName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Resource:</span>
                  <span className="font-bold text-slate-900">{completedBooking.resourceName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Start Time:</span>
                  <span className="font-bold text-slate-900">
                    {new Date(completedBooking.startTime).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200">
                  <span className="text-slate-500">Attendees:</span>
                  <span className="font-bold text-slate-900">{completedBooking.attendeeCount}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Total Price:</span>
                  <span className="font-bold text-slate-900">
                    {completedBooking.totalPrice === 0
                      ? 'Free'
                      : `${completedBooking.priceCurrency} ${completedBooking.totalPrice.toFixed(2)}`}{' '}
                    {completedBooking.paymentStatus === 'paid' ? (
                      <span className="text-[11px] font-semibold text-emerald-600">(Paid in Full)</span>
                    ) : completedBooking.paymentStatus === 'failed' ? (
                      <span className="text-[11px] font-semibold text-rose-600">(Payment Failed)</span>
                    ) : (
                      <span className="text-[11px] font-normal text-amber-600">(Pending Settlement)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    onClose();
                    navigate(`/booking/confirmation/${completedBooking.id}`);
                  }}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  View Final Confirmation Page
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    onClose();
                    navigate('/customer/bookings');
                  }}
                >
                  My Bookings
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  className="w-full sm:w-auto"
                  onClick={handleReset}
                >
                  Book Another
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ============================================================ */}
              {/* STEP 1: SELECT SERVICE */}
              {/* ============================================================ */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <Input
                      placeholder="Search services by keyword..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="sm:w-72"
                    />

                    {/* Category tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                            selectedCategory === cat
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {isLoadingServices ? (
                    <div className="py-16 text-center">
                      <Spinner size="lg" className="mx-auto mb-2 text-indigo-600" />
                      <span className="text-xs text-slate-500">Loading catalog services...</span>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <EmptyState
                      preset="no-results"
                      title="No Services Found"
                      description="No bookable services match your filter."
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredServices.map((service) => {
                        const isSelected = selectedService?.id === service.id;
                        return (
                          <div
                            key={service.id}
                            onClick={() => setSelectedService(service)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative text-left group ${
                              isSelected
                                ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}

                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="blue">{service.category}</Badge>
                              <Badge variant="slate">{service.durationMinutes} mins</Badge>
                              <Badge variant="emerald">
                                {service.paymentSetting === 'free'
                                  ? 'Free'
                                  : `${service.priceCurrency} ${service.priceAmount}`}
                              </Badge>
                            </div>

                            <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {service.name}
                            </h4>

                            <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">
                              {service.description}
                            </p>

                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                              <span>
                                {service.capacityType === 'individual'
                                  ? '1-on-1 Consultation'
                                  : `Capacity: up to ${service.defaultCapacity} attendees`}
                              </span>
                              <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                                {isSelected ? 'Selected' : 'Select Service'} &rarr;
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 2: SELECT PROVIDER / RESOURCE */}
              {/* ============================================================ */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      Choose a dedicated provider or resource, or select{' '}
                      <span className="font-bold">"Any Available Resource"</span> to let the
                      platform automatically match you with the first available operational unit.
                    </div>
                  </div>

                  {isLoadingResources ? (
                    <div className="py-16 text-center">
                      <Spinner size="lg" className="mx-auto mb-2 text-indigo-600" />
                      <span className="text-xs text-slate-500">
                        Querying assigned resources & providers...
                      </span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Option: Any Available Resource */}
                      <div
                        onClick={() => setSelectedResource(null)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative text-left group ${
                          selectedResource === null
                            ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        {selectedResource === null && (
                          <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">
                          Any Available Provider / Resource
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Maximize appointment availability by dynamically allocating any eligible unit.
                        </p>
                        <Badge variant="purple" className="mt-3">
                          Fastest Availability
                        </Badge>
                      </div>

                      {/* Specific Resources */}
                      {resources.map((res) => {
                        const isSelected = selectedResource?.id === res.id;
                        return (
                          <div
                            key={res.id}
                            onClick={() => setSelectedResource(res)}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 relative text-left group ${
                              isSelected
                                ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            )}

                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                              {res.resourceType === 'compute' ? (
                                <Cpu className="w-5 h-5 text-indigo-600" />
                              ) : res.resourceType === 'staff' ? (
                                <User className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <Building className="w-5 h-5 text-blue-600" />
                              )}
                            </div>

                            <h4 className="text-sm font-bold text-slate-900">{res.name}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                              {res.description || res.location || 'Operational Resource'}
                            </p>

                            <div className="flex items-center gap-2 mt-3">
                              <Badge variant="slate">{res.resourceType}</Badge>
                              <Badge variant="emerald">Capacity: {res.capacity}</Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 3 & 4: SELECT DATE & REAL-TIME SLOTS */}
              {/* ============================================================ */}
              {(currentStep === 3 || currentStep === 4) && (
                <div className="space-y-5">
                  {/* Friendly Slot Conflict Banner */}
                  {slotConflictMessage && (
                    <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs shadow-sm flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-full bg-amber-200/80 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="w-5 h-5 text-amber-700" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="font-bold text-sm text-amber-900 flex items-center gap-2">
                          <span>Slot No Longer Available</span>
                          <Badge variant="amber" className="text-[10px] bg-amber-200 text-amber-900">
                            Schedule Refreshed
                          </Badge>
                        </div>
                        <p className="text-amber-800 leading-relaxed">
                          {slotConflictMessage}
                        </p>
                        <div className="text-[11px] text-amber-700 flex items-center gap-1.5 pt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            Your customer details and intake responses have been preserved. Please select another slot below to continue.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSlotConflictMessage(null)}
                        className="p-1 rounded-lg text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-colors"
                        title="Dismiss notice"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Calendar Column */}
                    <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-indigo-600" />
                          <span>1. Select Appointment Date</span>
                        </span>
                        <Badge variant="blue">
                          {selectedDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Badge>
                      </div>

                      <Calendar
                        selectedDate={selectedDate}
                        onSelectDate={(d) => {
                          setSelectedDate(d);
                          if (currentStep === 3) setCurrentStep(4);
                        }}
                        minDate={new Date()}
                        maxDate={
                          selectedService
                            ? new Date(
                                Date.now() +
                                  (selectedService.maxAdvanceBookingDays || 30) * 24 * 60 * 60 * 1000
                              )
                            : undefined
                        }
                      />
                    </div>

                    {/* Real-time Slots Column */}
                    <div className="lg:col-span-6 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-indigo-600" />
                          <span>2. Real-Time Bookable Slots</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title={lastRefreshedAt ? `Last synced: ${lastRefreshedAt.toLocaleTimeString()}` : 'Live updates active'}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Sync Active
                          </span>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => fetchRealTimeSlots({ silent: false })}
                            disabled={isLoadingSlots || isSilentRefreshing}
                            className="text-xs flex items-center gap-1"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isSilentRefreshing ? 'animate-spin text-indigo-600' : ''}`}
                            />
                            {isSilentRefreshing ? 'Syncing...' : 'Refresh'}
                          </Button>
                        </div>
                      </div>

                      {isLoadingSlots ? (
                        <div className="space-y-2 py-2">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 animate-pulse flex items-center justify-between"
                            >
                              <div className="space-y-2">
                                <div className="h-4 w-32 bg-slate-200 rounded" />
                                <div className="h-3 w-40 bg-slate-100 rounded" />
                              </div>
                              <div className="h-6 w-20 bg-slate-200 rounded-full" />
                            </div>
                          ))}
                        </div>
                      ) : slotFetchError ? (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                          {slotFetchError}
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            No bookable slots on this date
                          </div>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            Operating hours, lead-time rules, or existing bookings prevent slot emission.
                            Please choose another date on the calendar.
                          </p>
                          <div className="pt-1">
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                              onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                tomorrow.setHours(0, 0, 0, 0);
                                setSelectedDate(tomorrow);
                              }}
                            >
                              Check Tomorrow&apos;s Availability &rarr;
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                          {availableSlots.map((slot) => {
                            const isSelected = selectedSlot?.id === slot.id;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setSlotConflictMessage(null);
                                }}
                                onDoubleClick={() => {
                                  setSelectedSlot(slot);
                                  setSlotConflictMessage(null);
                                  setCurrentStep(5);
                                }}
                                className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50/90 border-indigo-600 text-indigo-950 shadow-md ring-2 ring-indigo-500/50'
                                    : 'bg-slate-50/70 border-slate-200/90 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="text-sm font-bold flex items-center gap-2">
                                    <span>
                                      {slot.startTime} - {slot.endTime}
                                    </span>
                                    {isSelected && (
                                      <Badge variant="blue" className="bg-indigo-600 text-white font-semibold">
                                        ✓ Selected
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 font-medium">
                                    {slot.resourceName}
                                  </div>
                                </div>

                                <div className="text-right">
                                  <Badge
                                    variant={
                                      slot.remainingCapacity === 1
                                        ? 'amber'
                                        : 'emerald'
                                    }
                                  >
                                    {slot.remainingCapacity}{' '}
                                    {slot.remainingCapacity === 1 ? 'seat left' : 'seats left'}
                                  </Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 5: SELECT CAPACITY */}
              {/* ============================================================ */}
              {currentStep === 5 && selectedSlot && selectedService && (
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">
                      Select Attendee Capacity & Attendees
                    </h3>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-700">Attendees Count</div>
                        <div className="text-[11px] text-slate-500">
                          Maximum available in this slot: {selectedSlot.remainingCapacity}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setAttendeeCount(Math.max(1, attendeeCount - 1))}
                          disabled={attendeeCount <= 1}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-50 disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="text-base font-bold text-slate-900 w-6 text-center">
                          {attendeeCount}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setAttendeeCount(
                              Math.min(selectedSlot.remainingCapacity, attendeeCount + 1)
                            )
                          }
                          disabled={attendeeCount >= selectedSlot.remainingCapacity}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold text-sm hover:bg-slate-50 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Direct Booking confirmation notice */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold text-emerald-950">Free Direct Booking</span>
                      </div>
                      <Badge variant="emerald">100% Free</Badge>
                    </div>

                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      No payment or credit card is required. Your slot capacity is guaranteed upon reservation confirmation.
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 6: INTAKE QUESTIONS & CONTACT INFO */}
              {/* ============================================================ */}
              {currentStep === 6 && (
                <div className="max-w-xl mx-auto space-y-6">
                  {/* Contact Information */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-600" />
                      <span>Customer Contact Information</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Full Name *"
                        placeholder="e.g. Alex Morgan"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                      <Input
                        label="Email Address *"
                        type="email"
                        placeholder="e.g. customer@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                      />
                    </div>

                    <Input
                      label="Phone Number (optional)"
                      placeholder="e.g. +1 555-0190"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                    />
                  </div>

                  {/* Service Intake Questions */}
                  {isLoadingQuestions ? (
                    <div className="py-6 text-center bg-white rounded-2xl border border-slate-200">
                      <Spinner size="sm" className="mx-auto text-indigo-600 mb-1" />
                      <span className="text-[11px] text-slate-500">Loading intake questions...</span>
                    </div>
                  ) : questions.length > 0 && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileQuestion className="w-4 h-4 text-indigo-600" />
                        <span>Service Intake Questions</span>
                      </h3>

                      <div className="space-y-4">
                        {questions.map((q) => {
                          const val = answers[q.id] || '';
                          return (
                            <div key={q.id} className="space-y-1.5 text-xs">
                              <label className="font-semibold text-slate-800 flex items-center gap-1">
                                <span>{q.questionText}</span>
                                {q.isRequired && <span className="text-rose-600 font-bold">*</span>}
                              </label>

                              {q.questionType === 'select' ? (
                                <Select
                                  value={val}
                                  onChange={(e) =>
                                    setAnswers({ ...answers, [q.id]: e.target.value })
                                  }
                                  options={[
                                    { value: '', label: '-- Select an option --' },
                                    ...(Array.isArray(q.options) ? q.options : []).map((opt) => ({ value: opt, label: opt })),
                                  ]}
                                />
                              ) : q.questionType === 'textarea' ? (
                                <textarea
                                  rows={3}
                                  value={val}
                                  onChange={(e) =>
                                    setAnswers({ ...answers, [q.id]: e.target.value })
                                  }
                                  placeholder="Enter details..."
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                                />
                              ) : q.questionType === 'number' ? (
                                <Input
                                  type="number"
                                  value={val}
                                  onChange={(e) =>
                                    setAnswers({ ...answers, [q.id]: e.target.value })
                                  }
                                  placeholder="e.g. 100"
                                />
                              ) : (
                                <Input
                                  value={val}
                                  onChange={(e) =>
                                    setAnswers({ ...answers, [q.id]: e.target.value })
                                  }
                                  placeholder="Your answer..."
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Optional Notes */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
                    <label className="text-xs font-semibold text-slate-800">
                      Additional Session Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      placeholder="Any additional instructions or context for the provider..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 7: REVIEW SUMMARY & CONFIRM */}
              {/* ============================================================ */}
              {currentStep === 7 && selectedService && selectedSlot && (
                <div className="max-w-xl mx-auto space-y-5">
                  {submitError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-1.5">
                        <div className="font-bold">Reservation Verification Notice</div>
                        <div>{submitError}</div>
                        <div className="pt-1">
                          <Button
                            variant="outline"
                            size="xs"
                            className="bg-white border-rose-300 text-rose-800 hover:bg-rose-100"
                            onClick={() => {
                              fetchRealTimeSlots();
                              setCurrentStep(4);
                            }}
                          >
                            Select Another Time Slot
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                          Summary Review
                        </span>
                        <h3 className="text-lg font-bold text-slate-900">
                          {selectedService.name}
                        </h3>
                      </div>
                      <Badge variant="blue">{selectedService.category}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-slate-500 font-medium">Provider / Resource</span>
                        <div className="font-bold text-slate-900">{selectedSlot.resourceName}</div>
                        <div className="text-[11px] text-slate-500">{selectedSlot.resourceType}</div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-slate-500 font-medium">Date & Time</span>
                        <div className="font-bold text-slate-900">
                          {selectedSlot.date}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {selectedSlot.startTime} - {selectedSlot.endTime} (
                          {selectedSlot.durationMinutes} mins)
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-slate-500 font-medium">Reserved Capacity</span>
                        <div className="font-bold text-slate-900">
                          {attendeeCount} {attendeeCount === 1 ? 'Attendee' : 'Attendees'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Customer: {customerName}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                        <span className="text-slate-500 font-medium">Reservation Fee</span>
                        <div className="font-bold text-emerald-700 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Free / Direct Booking</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          No payment or card required
                        </div>
                      </div>
                    </div>

                    {/* Answers overview */}
                    {questions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <span className="text-xs font-bold text-slate-700">
                          Intake Responses
                        </span>
                        <div className="space-y-1 text-xs">
                          {questions.map((q) => (
                            <div key={q.id} className="text-slate-600">
                              <span className="font-medium text-slate-800">{q.questionText}:</span>{' '}
                              <span className="italic">{answers[q.id] || '(None)'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Anti-duplicate & Double-validation notice */}
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-950">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Real-Time Concurrency Guard: </span>
                        <span>
                          Upon clicking confirm, the platform re-validates current availability on the
                          server before generating records to ensure no double bookings occur.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        {!completedBooking && (
          <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                  disabled={isSubmitting}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>

              {currentStep < 7 ? (
                <Button variant="primary" size="sm" onClick={handleNextStep}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmReservation}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md px-6 py-2"
                >
                  {isSubmitting ? 'Confirming Reservation...' : 'Confirm Reservation'}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
