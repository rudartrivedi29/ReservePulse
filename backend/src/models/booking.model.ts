export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'payment-failed'
  | 'payment_failed';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'paid'
  | 'refunded'
  | 'partially_refunded'
  | 'failed';

export interface BookingAnswerEntity {
  id: string;
  booking_id: string;
  question_id: string;
  answer_text: string;
  created_at: Date;
}

export interface BookingEntity {
  id: string;
  booking_reference: string;
  service_id: string;
  slot_id?: string | null;
  customer_id?: string | null;
  resource_id?: string | null;
  start_time: Date;
  end_time: Date;
  attendee_count: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  total_price: number;
  price_currency: string;
  guest_name?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  notes?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: Date | null;
  cancelled_by?: string | null;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface BookingAnswerResponse {
  questionId: string;
  questionText: string;
  answerText: string;
}

export interface PaymentIntentResponse {
  paymentIntentId: string;
  clientSecret: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  requiresAdvancePayment: boolean;
}

export interface PaymentSummaryResponse {
  id?: string;
  transactionReference?: string;
  paymentMethod?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: string;
}

export interface BookingResponse {
  id: string;
  bookingReference: string;
  serviceId: string;
  serviceName: string;
  serviceCategory?: string;
  serviceDurationMinutes?: number;
  organiserId?: string;
  resourceId?: string | null;
  resourceName?: string;
  resourceType?: string;
  resourceLocation?: string;
  customerId?: string | null;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  attendeeCount: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  priceCurrency: string;
  notes?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  answers: BookingAnswerResponse[];
  paymentIntent?: PaymentIntentResponse | null;
  paymentSummary?: PaymentSummaryResponse | null;
  createdAt: string;
  updatedAt: string;
}
