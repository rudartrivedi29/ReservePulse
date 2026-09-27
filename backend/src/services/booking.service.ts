import crypto from 'crypto';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  SlotUnavailableError,
  ForbiddenError,
  ValidationError,
} from '../utils/errors';
import {
  BookingEntity,
  BookingResponse,
  BookingAnswerEntity,
  BookingStatus,
  PaymentStatus,
  PaymentIntentResponse,
  PaymentSummaryResponse,
} from '../models/booking.model';
import { CreateBookingInput, ListBookingsQuery, ConfirmBookingInput } from '../validators/booking.validator';
import { ServiceService } from './service.service';
import { ResourceService } from './resource.service';
import { QuestionService } from './question.service';
import { SlotEngineService } from './slot-engine.service';
import { PaymentService } from './payment/payment.service';
import { AuthUserPayload } from '../middleware/auth.middleware';

// In-Memory Storage for bookings & answers
const inMemoryBookings: Map<string, BookingEntity> = new Map();
const inMemoryAnswers: Map<string, BookingAnswerEntity[]> = new Map();

// Idempotency cache and in-flight locks to prevent duplicate submissions
const idempotencyCache = new Map<string, { response: BookingResponse; timestamp: number }>();
const inFlightLocks = new Set<string>();

/**
 * Concurrency Mutex Manager: ensures strict serialization of concurrent booking
 * attempts targeting the same resource, preventing race conditions and capacity overruns.
 */
class ResourceLockManager {
  private static locks: Map<string, Promise<void>> = new Map();

  public static async runExclusive<T>(resourceId: string, fn: () => Promise<T>): Promise<T> {
    const key = resourceId;
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.locks.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolveLock();
    }
  }
}

// Clean up expired idempotency keys periodically (60 second TTL)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > 60000) {
      idempotencyCache.delete(key);
    }
  }
}, 30000);

// Seed initial demo customer appointments
const seedDemoBookings = () => {
  if (inMemoryBookings.size > 0) return;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setUTCHours(10, 0, 0, 0);

  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  dayAfter.setUTCHours(14, 0, 0, 0);

  const pastDate = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  pastDate.setUTCHours(9, 30, 0, 0);

  const demoList: { booking: BookingEntity; answers: BookingAnswerEntity[] }[] = [
    {
      booking: {
        id: 'bk_demo_001',
        booking_reference: 'BK-20260926-E4A19',
        service_id: 'srv_comp_001',
        slot_id: 'slt_res_h100_node1_2026-09-26_1000_1100',
        customer_id: 'usr_cust_001',
        resource_id: 'res_h100_node1',
        start_time: tomorrow,
        end_time: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        attendee_count: 2,
        status: 'confirmed',
        payment_status: 'unpaid',
        total_price: 240.0,
        price_currency: 'USD',
        guest_name: 'Alex Morgan',
        guest_email: 'customer@reservepulse.com',
        guest_phone: '+1 555-0201',
        notes: 'Accelerated batch checkpointing for distributed transformer model.',
        created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      answers: [
        {
          id: 'ans_demo_001',
          booking_id: 'bk_demo_001',
          question_id: 'qst_comp_001',
          answer_text: 'PyTorch 2.4.0 + CUDA 12.4 + FlashAttention-3',
          created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        },
        {
          id: 'ans_demo_002',
          booking_id: 'bk_demo_001',
          question_id: 'qst_comp_002',
          answer_text: '500',
          created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        },
        {
          id: 'ans_demo_003',
          booking_id: 'bk_demo_001',
          question_id: 'qst_comp_003',
          answer_text: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleCustomerKey2026',
          created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000),
        },
      ],
    },
    {
      booking: {
        id: 'bk_demo_002',
        booking_reference: 'BK-20260927-B9C82',
        service_id: 'srv_suite_002',
        slot_id: 'slt_res_pod_private_1_2026-09-27_1400_1445',
        customer_id: 'usr_cust_001',
        resource_id: 'res_pod_private_1',
        start_time: dayAfter,
        end_time: new Date(dayAfter.getTime() + 45 * 60 * 1000),
        attendee_count: 1,
        status: 'pending',
        payment_status: 'unpaid',
        total_price: 75.0,
        price_currency: 'USD',
        guest_name: 'Alex Morgan',
        guest_email: 'customer@reservepulse.com',
        guest_phone: '+1 555-0201',
        notes: 'Architecture review of distributed vector storage.',
        created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      },
      answers: [
        {
          id: 'ans_demo_004',
          booking_id: 'bk_demo_002',
          question_id: 'qst_suite_001',
          answer_text: 'Enterprise Multi-tenant Reservation Engine Architecture Sign-off',
          created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        },
        {
          id: 'ans_demo_005',
          booking_id: 'bk_demo_002',
          question_id: 'qst_suite_002',
          answer_text: 'Hybrid Video Conference (Zoom/Teams)',
          created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        },
      ],
    },
    {
      booking: {
        id: 'bk_demo_003',
        booking_reference: 'BK-20260922-A1D77',
        service_id: 'srv_comp_001',
        slot_id: null,
        customer_id: 'usr_cust_001',
        resource_id: 'res_h100_node1',
        start_time: pastDate,
        end_time: new Date(pastDate.getTime() + 60 * 60 * 1000),
        attendee_count: 1,
        status: 'completed',
        payment_status: 'paid',
        total_price: 120.0,
        price_currency: 'USD',
        guest_name: 'Alex Morgan',
        guest_email: 'customer@reservepulse.com',
        guest_phone: '+1 555-0201',
        notes: 'Initial inference benchmark on 8x H100 cluster node.',
        created_at: new Date(pastDate.getTime() - 24 * 60 * 60 * 1000),
        updated_at: new Date(pastDate.getTime() + 2 * 60 * 60 * 1000),
      },
      answers: [],
    },
  ];

  for (const item of demoList) {
    inMemoryBookings.set(item.booking.id, item.booking);
    inMemoryAnswers.set(item.booking.id, item.answers);

    // Register active demo bookings with SlotEngineService so capacity is properly accounted for
    if (['pending', 'confirmed', 'in_progress'].includes(item.booking.status) && item.booking.resource_id) {
      SlotEngineService.addTestBooking({
        id: item.booking.id,
        booking_reference: item.booking.booking_reference,
        service_id: item.booking.service_id,
        resource_id: item.booking.resource_id,
        start_time: item.booking.start_time,
        end_time: item.booking.end_time,
        attendee_count: item.booking.attendee_count,
        status: item.booking.status,
      });
    }
  }

  logger.info('In-memory demo customer bookings initialized', { count: demoList.length });
};

seedDemoBookings();

export class BookingService {
  private static dbConnectedCache: { connected: boolean; checkedAt: number } | null = null;

  public static async isDbConnected(): Promise<boolean> {
    const now = Date.now();
    if (this.dbConnectedCache && now - this.dbConnectedCache.checkedAt < 5000) {
      return this.dbConnectedCache.connected;
    }
    try {
      const res = await db.query('SELECT 1');
      const isOk = Boolean(res);
      this.dbConnectedCache = { connected: isOk, checkedAt: now };
      return isOk;
    } catch {
      this.dbConnectedCache = { connected: false, checkedAt: now };
      return false;
    }
  }

  /**
   * Helper: format BookingEntity and its answers to BookingResponse
   */
  public static async formatBooking(
    entity: BookingEntity,
    answersList?: BookingAnswerEntity[],
    paymentIntentOverride?: PaymentIntentResponse | null
  ): Promise<BookingResponse> {
    // Resolve Service Details
    let serviceName = 'Reserved Service';
    let serviceCategory = 'General';
    let serviceDurationMinutes = 60;
    let serviceOrganiserId: string | undefined = undefined;
    try {
      const srv = await ServiceService.getServiceById(entity.service_id);
      serviceName = srv.name;
      serviceCategory = srv.category;
      serviceDurationMinutes = srv.durationMinutes;
      serviceOrganiserId = srv.organiserId;
    } catch {
      // Graceful fallback
    }

    // Resolve Resource Details
    let resourceName = 'Allocated Resource';
    let resourceType = 'Resource';
    let resourceLocation = '';
    if (entity.resource_id) {
      try {
        const res = await ResourceService.getResourceById(entity.resource_id);
        resourceName = res.name;
        resourceType = res.resourceType;
        resourceLocation = res.location || '';
      } catch {
        // Graceful fallback
      }
    }

    // Resolve Answers
    let answers: BookingAnswerEntity[] = answersList || [];
    if (!answersList) {
      if (await this.isDbConnected()) {
        try {
          const res = await db.query<BookingAnswerEntity>(
            `SELECT * FROM booking_answers WHERE booking_id = $1`,
            [entity.id]
          );
          answers = res.rows;
        } catch {
          answers = inMemoryAnswers.get(entity.id) || [];
        }
      } else {
        answers = inMemoryAnswers.get(entity.id) || [];
      }
    }

    // Fetch questions to attach question text to answers
    const questions = await QuestionService.getQuestionsForService(entity.service_id);
    const questionTextMap = new Map(questions.map((q) => [q.id, q.questionText]));

    const formattedAnswers = answers.map((ans) => ({
      questionId: ans.question_id,
      questionText: questionTextMap.get(ans.question_id) || 'Service Question',
      answerText: ans.answer_text,
    }));

    // Resolve Payment Details
    let paymentSummary: PaymentSummaryResponse | null = null;
    let paymentIntent: PaymentIntentResponse | null =
      paymentIntentOverride !== undefined ? paymentIntentOverride : null;

    try {
      const paymentInfo = await PaymentService.getPaymentDetailsForBooking(entity.id);
      if (paymentInfo.paymentSummary) {
        paymentSummary = paymentInfo.paymentSummary;
      }
      if (paymentIntent === null && paymentInfo.activeIntent) {
        paymentIntent = paymentInfo.activeIntent;
      }
    } catch {
      // Graceful fallback
    }

    return {
      id: entity.id,
      bookingReference: entity.booking_reference,
      serviceId: entity.service_id,
      serviceName,
      serviceCategory,
      serviceDurationMinutes,
      organiserId: serviceOrganiserId,
      resourceId: entity.resource_id,
      resourceName,
      resourceType,
      resourceLocation,
      customerId: entity.customer_id,
      customerName: entity.guest_name || undefined,
      customerEmail: entity.guest_email || undefined,
      customerPhone: entity.guest_phone || undefined,
      startTime: entity.start_time.toISOString(),
      endTime: entity.end_time.toISOString(),
      attendeeCount: Number(entity.attendee_count),
      status: entity.status,
      paymentStatus: entity.payment_status,
      totalPrice: Number(entity.total_price),
      priceCurrency: entity.price_currency,
      notes: entity.notes,
      cancellationReason: entity.cancellation_reason,
      cancelledAt: entity.cancelled_at ? entity.cancelled_at.toISOString() : undefined,
      answers: formattedAnswers,
      paymentIntent,
      paymentSummary,
      createdAt: entity.created_at.toISOString(),
      updatedAt: entity.updated_at.toISOString(),
    };
  }

  /**
   * 1. Create a Customer Booking with Server-Side Availability Double Validation
   * Enforces duplicate submission prevention, re-checks real-time slot availability,
   * validates intake questions, and commits records only after availability verification.
   */
  public static async createBooking(
    input: CreateBookingInput,
    authUser?: AuthUserPayload
  ): Promise<BookingResponse> {
    const {
      serviceId,
      resourceId,
      startDateTime,
      attendeeCount = 1,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      answers = [],
      idempotencyKey,
    } = input;

    // A. Duplicate Submission Prevention: Idempotency Key check
    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      logger.info('Duplicate submission intercepted via idempotency key', { idempotencyKey });
      return idempotencyCache.get(idempotencyKey)!.response;
    }

    // B. Duplicate Submission Prevention: In-Flight Lock
    const effectiveEmail = authUser?.email || customerEmail || 'guest';
    const effectiveName = authUser?.fullName || customerName || 'Valued Guest';
    const effectiveCustomerId = authUser?.id || null;

    const lockKey = `${effectiveEmail}:${resourceId}:${startDateTime}`;
    if (inFlightLocks.has(lockKey)) {
      throw new ConflictError(
        'A reservation request for this time slot is already being processed. Please wait a moment.'
      );
    }
    inFlightLocks.add(lockKey);

    try {
      // 1. Validate Service
      const service = await ServiceService.getServiceById(serviceId);
      if (!service.isActive) {
        throw new BadRequestError('The requested service is currently unpublished or inactive.');
      }

      // 2. Validate Resource
      const resource = await ResourceService.getResourceById(resourceId);
      if (!resource.isActive || (resource.status !== 'active' && resource.status !== 'operational')) {
        throw new BadRequestError('The selected provider or resource is currently not operational.');
      }

      const startDateObj = new Date(startDateTime);
      if (isNaN(startDateObj.getTime())) {
        throw new BadRequestError('Invalid start date/time format.');
      }
      const dateStr = startDateObj.toISOString().split('T')[0];

      // 3. Validate Intake Questions
      const serviceQuestions = await QuestionService.getQuestionsForService(serviceId);
      const answerMap = new Map(answers.map((a) => [a.questionId, a.answerText]));

      for (const q of serviceQuestions) {
        const rawVal = answerMap.get(q.id);
        const val = rawVal !== undefined ? rawVal.trim() : '';

        // Check required fields
        if (q.isRequired && val.length === 0) {
          throw new BadRequestError(`Missing required booking answer: "${q.questionText}"`);
        }

        // Validate type-specific answers when supplied
        if (val.length > 0) {
          if (q.questionType === 'select' && Array.isArray(q.options) && q.options.length > 0) {
            if (!q.options.includes(val)) {
              throw new BadRequestError(
                `Invalid option "${val}" selected for question "${q.questionText}". Must be one of: ${q.options.join(', ')}`
              );
            }
          } else if (q.questionType === 'number') {
            const num = Number(val);
            if (isNaN(num)) {
              throw new BadRequestError(
                `Numerical answer required for question "${q.questionText}". Received: "${val}"`
              );
            }
          }
        }
      }

      // Compute pricing
      let totalPrice = service.priceAmount;
      if (service.capacityType === 'group') {
        totalPrice = service.priceAmount * attendeeCount;
      }
      if (service.paymentSetting === 'free') {
        totalPrice = 0.0;
      }

      // Calculate end time
      const endDateObj = input.endDateTime
        ? new Date(input.endDateTime)
        : new Date(startDateObj.getTime() + service.durationMinutes * 60 * 1000);

      // Footprint includes service buffers
      const bufferBefore = service.bufferBeforeMinutes || 0;
      const bufferAfter = service.bufferAfterMinutes || 0;
      const footprintStart = new Date(startDateObj.getTime() - bufferBefore * 60 * 1000);
      const footprintEnd = new Date(endDateObj.getTime() + bufferAfter * 60 * 1000);

      // Compute resource/service capacity limit
      let maxCapacity = service.defaultCapacity;
      if (service.capacityType === 'individual') {
        maxCapacity = 1;
      } else if (service.capacityType === 'resource_constrained') {
        maxCapacity = Math.min(service.defaultCapacity, resource.capacity);
      }

      // 4. ATOMIC CRITICAL SECTION: Serialize concurrent reservation attempts for this resource
      return await ResourceLockManager.runExclusive(resourceId, async () => {
        // A. If PostgreSQL is connected: Execute transactional row-locking and in-transaction recheck
        if (await this.isDbConnected()) {
          try {
            return await db.transaction(async (client) => {
              // Row lock the resource to serialize concurrent bookings on this resource
              await client.query(
                `SELECT id, capacity, status FROM resources WHERE id = $1 FOR UPDATE`,
                [resourceId]
              );

              // Row lock the slot if it exists in slots table
              if (input.slotId) {
                await client.query(
                  `SELECT id, max_capacity, current_capacity, status FROM slots WHERE id = $1 FOR UPDATE`,
                  [input.slotId]
                );
              }

              // RECHECK AVAILABILITY INSIDE THE TRANSACTION IMMEDIATELY BEFORE INSERTING
              const overlapRes = await client.query<{ booked_capacity: string }>(
                `SELECT COALESCE(SUM(attendee_count), 0) AS booked_capacity
                 FROM bookings
                 WHERE resource_id = $1
                   AND status IN ('pending', 'confirmed', 'in_progress')
                   AND end_time > $2
                   AND start_time < $3`,
                [resourceId, footprintStart, footprintEnd]
              );

              const currentBooked = Number(overlapRes.rows[0]?.booked_capacity || 0);
              const remaining = Math.max(0, maxCapacity - currentBooked);

              if (remaining < attendeeCount) {
                throw new SlotUnavailableError(
                  'The selected time slot is no longer available. Another customer just reserved this slot. Please choose another time.',
                  {
                    slotUnavailable: true,
                    serviceId,
                    resourceId,
                    startDateTime,
                    remainingCapacity: remaining,
                    requestedAttendees: attendeeCount,
                  }
                );
              }

              // Generate booking reference & ID
              const datePart = dateStr.replace(/-/g, '');
              const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
              const bookingReference = `BK-${datePart}-${randomHex}`;
              const bookingId = `bk_${crypto.randomUUID()}`;

              // Determine booking status and payment status based on advance payment requirement
              const isAdvancePaymentRequired = PaymentService.isAdvancePaymentRequired(
                service.paymentSetting,
                totalPrice
              );

              const status: BookingStatus = !isAdvancePaymentRequired
                ? (service.requiresManualConfirmation ? 'pending' : 'confirmed')
                : 'pending';

              const paymentStatus: PaymentStatus = !isAdvancePaymentRequired
                ? (service.paymentSetting === 'free' ? 'paid' : 'unpaid')
                : 'pending';

              const bookingEntity: BookingEntity = {
                id: bookingId,
                booking_reference: bookingReference,
                service_id: serviceId,
                slot_id: input.slotId || null,
                customer_id: effectiveCustomerId,
                resource_id: resourceId,
                start_time: startDateObj,
                end_time: endDateObj,
                attendee_count: attendeeCount,
                status,
                payment_status: paymentStatus,
                total_price: totalPrice,
                price_currency: service.priceCurrency || 'USD',
                guest_name: effectiveName,
                guest_email: effectiveEmail,
                guest_phone: customerPhone || null,
                notes: notes || null,
                created_at: new Date(),
                updated_at: new Date(),
              };

              // Insert booking
              await client.query(
                `INSERT INTO bookings (
                  id, booking_reference, service_id, slot_id, customer_id, resource_id,
                  start_time, end_time, attendee_count, status, payment_status,
                  total_price, price_currency, guest_name, guest_email, guest_phone, notes,
                  created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
                [
                  bookingEntity.id,
                  bookingEntity.booking_reference,
                  bookingEntity.service_id,
                  bookingEntity.slot_id,
                  bookingEntity.customer_id,
                  bookingEntity.resource_id,
                  bookingEntity.start_time,
                  bookingEntity.end_time,
                  bookingEntity.attendee_count,
                  bookingEntity.status,
                  bookingEntity.payment_status,
                  bookingEntity.total_price,
                  bookingEntity.price_currency,
                  bookingEntity.guest_name,
                  bookingEntity.guest_email,
                  bookingEntity.guest_phone,
                  bookingEntity.notes,
                  bookingEntity.created_at,
                  bookingEntity.updated_at,
                ]
              );

              // Insert intake answers
              const bookingAnswerEntities: BookingAnswerEntity[] = answers.map((a) => ({
                id: `bka_${crypto.randomUUID()}`,
                booking_id: bookingId,
                question_id: a.questionId,
                answer_text: a.answerText,
                created_at: new Date(),
              }));

              for (const ans of bookingAnswerEntities) {
                await client.query(
                  `INSERT INTO booking_answers (id, booking_id, question_id, answer_text, created_at)
                   VALUES ($1, $2, $3, $4, $5)`,
                  [ans.id, ans.booking_id, ans.question_id, ans.answer_text, ans.created_at]
                );
              }

              // Update slots table capacity if slot exists
              if (input.slotId) {
                await client.query(
                  `UPDATE slots 
                   SET current_capacity = current_capacity + $1,
                       status = CASE WHEN current_capacity + $1 >= max_capacity THEN 'booked' ELSE 'available' END,
                       updated_at = CURRENT_TIMESTAMP
                   WHERE id = $2`,
                  [attendeeCount, input.slotId]
                );
              }

              // Sync in-memory cache and SlotEngineService
              inMemoryBookings.set(bookingId, bookingEntity);
              inMemoryAnswers.set(bookingId, bookingAnswerEntities);
              SlotEngineService.addTestBooking({
                id: bookingEntity.id,
                booking_reference: bookingEntity.booking_reference,
                service_id: bookingEntity.service_id,
                resource_id: bookingEntity.resource_id!,
                start_time: bookingEntity.start_time,
                end_time: bookingEntity.end_time,
                attendee_count: bookingEntity.attendee_count,
                status: bookingEntity.status,
              });

              // Create payment intent if advance payment is enabled
              let paymentIntent: PaymentIntentResponse | null = null;
              if (isAdvancePaymentRequired) {
                paymentIntent = await PaymentService.createPaymentIntentForBooking(
                  bookingEntity,
                  service.paymentSetting
                );
              }

              const response = await this.formatBooking(bookingEntity, bookingAnswerEntities, paymentIntent);
              if (idempotencyKey) {
                idempotencyCache.set(idempotencyKey, { response, timestamp: Date.now() });
              }
              return response;
            });
          } catch (dbErr: any) {
            // Check for trigger or check constraint violation
            if (
              dbErr.code === '23P01' ||
              dbErr.code === '23514' ||
              (dbErr.message && dbErr.message.includes('CAPACITY_OVERRUN'))
            ) {
              throw new SlotUnavailableError(
                'The selected time slot is no longer available. Another customer just reserved this slot. Please choose another time.',
                {
                  slotUnavailable: true,
                  serviceId,
                  resourceId,
                  startDateTime,
                  error: dbErr.message,
                }
              );
            }
            if (dbErr instanceof SlotUnavailableError || dbErr instanceof ConflictError) {
              throw dbErr;
            }
            logger.warn('Database transaction failed, falling back to atomic in-memory critical section', {
              error: dbErr.message,
            });
          }
        }

        // B. In-Memory Critical Section (Dual-Mode / Local Development)
        // RECHECK AVAILABILITY IMMEDIATELY INSIDE THE CRITICAL SECTION
        let bookedCapacity = 0;
        for (const b of inMemoryBookings.values()) {
          if (
            b.resource_id === resourceId &&
            ['pending', 'confirmed', 'in_progress'].includes(b.status) &&
            b.end_time.getTime() > footprintStart.getTime() &&
            b.start_time.getTime() < footprintEnd.getTime()
          ) {
            bookedCapacity += b.attendee_count || 1;
          }
        }

        const remaining = Math.max(0, maxCapacity - bookedCapacity);
        if (remaining < attendeeCount) {
          throw new SlotUnavailableError(
            'The selected time slot is no longer available. Another customer just reserved this slot. Please choose another time.',
            {
              slotUnavailable: true,
              serviceId,
              resourceId,
              startDateTime,
              remainingCapacity: remaining,
              requestedAttendees: attendeeCount,
            }
          );
        }

        // Generate booking record
        const datePart = dateStr.replace(/-/g, '');
        const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
        const bookingReference = `BK-${datePart}-${randomHex}`;
        const bookingId = `bk_${crypto.randomUUID()}`;

        // Determine booking status and payment status based on advance payment requirement
        const isAdvancePaymentRequired = PaymentService.isAdvancePaymentRequired(
          service.paymentSetting,
          totalPrice
        );

        const status: BookingStatus = !isAdvancePaymentRequired
          ? (service.requiresManualConfirmation ? 'pending' : 'confirmed')
          : 'pending';

        const paymentStatus: PaymentStatus = !isAdvancePaymentRequired
          ? (service.paymentSetting === 'free' ? 'paid' : 'unpaid')
          : 'pending';

        const bookingEntity: BookingEntity = {
          id: bookingId,
          booking_reference: bookingReference,
          service_id: serviceId,
          slot_id: input.slotId || null,
          customer_id: effectiveCustomerId,
          resource_id: resourceId,
          start_time: startDateObj,
          end_time: endDateObj,
          attendee_count: attendeeCount,
          status,
          payment_status: paymentStatus,
          total_price: totalPrice,
          price_currency: service.priceCurrency || 'USD',
          guest_name: effectiveName,
          guest_email: effectiveEmail,
          guest_phone: customerPhone || null,
          notes: notes || null,
          created_at: new Date(),
          updated_at: new Date(),
        };

        const bookingAnswerEntities: BookingAnswerEntity[] = answers.map((a) => ({
          id: `bka_${crypto.randomUUID()}`,
          booking_id: bookingId,
          question_id: a.questionId,
          answer_text: a.answerText,
          created_at: new Date(),
        }));

        inMemoryBookings.set(bookingId, bookingEntity);
        inMemoryAnswers.set(bookingId, bookingAnswerEntities);

        SlotEngineService.addTestBooking({
          id: bookingEntity.id,
          booking_reference: bookingEntity.booking_reference,
          service_id: bookingEntity.service_id,
          resource_id: bookingEntity.resource_id!,
          start_time: bookingEntity.start_time,
          end_time: bookingEntity.end_time,
          attendee_count: bookingEntity.attendee_count,
          status: bookingEntity.status,
        });

        // Create payment intent if advance payment is enabled
        let paymentIntent: PaymentIntentResponse | null = null;
        if (isAdvancePaymentRequired) {
          paymentIntent = await PaymentService.createPaymentIntentForBooking(
            bookingEntity,
            service.paymentSetting
          );
        }

        const response = await this.formatBooking(bookingEntity, bookingAnswerEntities, paymentIntent);
        if (idempotencyKey) {
          idempotencyCache.set(idempotencyKey, { response, timestamp: Date.now() });
        }

        logger.info('Customer reservation created with hardened concurrency protection', {
          reference: bookingReference,
          resourceId,
          attendeeCount,
          status,
          paymentStatus,
        });

        return response;
      });
    } finally {
      inFlightLocks.delete(lockKey);
    }
  }

  /**
   * 2. Retrieve Bookings List (Customer Portal, Organiser Queue & Admin Platform View)
   * Supports filtering by customerId/customerEmail, organiserId, serviceId, resourceId,
   * search query (customer name, email, booking reference, service), status, and time window.
   */
  public static async getBookings(options: {
    customerId?: string;
    customerEmail?: string;
    organiserId?: string;
    isAdmin?: boolean;
    query?: ListBookingsQuery;
  }): Promise<{ bookings: BookingResponse[]; total: number; page: number; limit: number }> {
    const { customerId, customerEmail, organiserId, isAdmin, query } = options;
    const status = query?.status || 'all';
    const timeFilter = query?.timeFilter || 'all';
    const search = query?.search?.trim() || '';
    const serviceId = query?.serviceId;
    const resourceId = query?.resourceId;
    const targetOrganiserId = !isAdmin ? organiserId : (query?.organiserId || undefined);
    const startDate = query?.startDate ? new Date(query.startDate) : undefined;
    const endDate = query?.endDate ? new Date(query.endDate) : undefined;
    const page = Math.max(1, query?.page || 1);
    const limit = Math.min(100, Math.max(1, query?.limit || 50));
    const now = new Date();

    let allEntities: BookingEntity[] = [];

    // Query DB if available
    if (await this.isDbConnected()) {
      try {
        let sql = `
          SELECT b.* FROM bookings b
          LEFT JOIN services s ON b.service_id = s.id
          WHERE 1=1
        `;
        const params: unknown[] = [];

        if (targetOrganiserId) {
          params.push(targetOrganiserId);
          sql += ` AND s.organiser_id = $${params.length}`;
        }

        if (customerId) {
          params.push(customerId);
          sql += ` AND (b.customer_id = $${params.length}`;
          if (customerEmail) {
            params.push(customerEmail);
            sql += ` OR b.guest_email ILIKE $${params.length}`;
          }
          sql += `)`;
        } else if (customerEmail) {
          params.push(customerEmail);
          sql += ` AND b.guest_email ILIKE $${params.length}`;
        }

        if (status !== 'all') {
          if (status === 'payment-failed' || status === 'payment_failed') {
            sql += ` AND b.status IN ('payment-failed', 'payment_failed')`;
          } else {
            params.push(status);
            sql += ` AND b.status = $${params.length}`;
          }
        }

        if (serviceId) {
          params.push(serviceId);
          sql += ` AND b.service_id = $${params.length}`;
        }

        if (resourceId) {
          params.push(resourceId);
          sql += ` AND b.resource_id = $${params.length}`;
        }

        if (startDate && !isNaN(startDate.getTime())) {
          params.push(startDate);
          sql += ` AND b.start_time >= $${params.length}`;
        }

        if (endDate && !isNaN(endDate.getTime())) {
          params.push(endDate);
          sql += ` AND b.end_time <= $${params.length}`;
        }

        if (search) {
          params.push(`%${search}%`);
          const pIdx = params.length;
          sql += ` AND (
            b.booking_reference ILIKE $${pIdx} OR 
            b.guest_name ILIKE $${pIdx} OR 
            b.guest_email ILIKE $${pIdx} OR 
            b.guest_phone ILIKE $${pIdx} OR 
            s.name ILIKE $${pIdx}
          )`;
        }

        if (timeFilter === 'upcoming') {
          params.push(now);
          sql += ` AND b.end_time >= $${params.length} AND b.status NOT IN ('cancelled', 'payment-failed', 'payment_failed') ORDER BY b.start_time ASC`;
        } else if (timeFilter === 'past') {
          params.push(now);
          sql += ` AND (b.end_time < $${params.length} OR b.status = 'completed') ORDER BY b.start_time DESC`;
        } else if (timeFilter === 'today') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          params.push(startOfDay, endOfDay);
          sql += ` AND b.start_time >= $${params.length - 1} AND b.start_time <= $${params.length} ORDER BY b.start_time ASC`;
        } else if (timeFilter === 'this_week') {
          const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          params.push(startOfDay, in7Days);
          sql += ` AND b.start_time >= $${params.length - 1} AND b.start_time <= $${params.length} ORDER BY b.start_time ASC`;
        } else {
          sql += ` ORDER BY b.start_time DESC`;
        }

        const res = await db.query<BookingEntity>(sql, params);
        allEntities = res.rows;
      } catch (err) {
        logger.warn('Failed to query bookings from database, falling back to in-memory store', { error: err });
      }
    }

    // In-memory fallback
    if (allEntities.length === 0) {
      allEntities = Array.from(inMemoryBookings.values());

      // If filtering by organiserId
      if (targetOrganiserId) {
        const filteredByOrg: BookingEntity[] = [];
        for (const b of allEntities) {
          try {
            const srv = await ServiceService.getServiceById(b.service_id);
            if (srv.organiserId === targetOrganiserId) {
              filteredByOrg.push(b);
            }
          } catch {
            // Service not found
          }
        }
        allEntities = filteredByOrg;
      }

      if (customerId || customerEmail) {
        allEntities = allEntities.filter((b) => {
          const matchCustId = customerId && b.customer_id === customerId;
          const matchEmail =
            customerEmail && b.guest_email?.toLowerCase() === customerEmail.toLowerCase();
          return matchCustId || matchEmail;
        });
      }

      if (status !== 'all') {
        if (status === 'payment-failed' || status === 'payment_failed') {
          allEntities = allEntities.filter((b) => b.status === 'payment-failed' || b.status === 'payment_failed');
        } else {
          allEntities = allEntities.filter((b) => b.status === status);
        }
      }

      if (serviceId) {
        allEntities = allEntities.filter((b) => b.service_id === serviceId);
      }

      if (resourceId) {
        allEntities = allEntities.filter((b) => b.resource_id === resourceId);
      }

      if (startDate && !isNaN(startDate.getTime())) {
        allEntities = allEntities.filter((b) => b.start_time.getTime() >= startDate.getTime());
      }

      if (endDate && !isNaN(endDate.getTime())) {
        allEntities = allEntities.filter((b) => b.end_time.getTime() <= endDate.getTime());
      }

      if (search) {
        const sLower = search.toLowerCase();
        const searchMatches: BookingEntity[] = [];
        for (const b of allEntities) {
          const matchBasic =
            b.booking_reference.toLowerCase().includes(sLower) ||
            (b.guest_name && b.guest_name.toLowerCase().includes(sLower)) ||
            (b.guest_email && b.guest_email.toLowerCase().includes(sLower)) ||
            (b.guest_phone && b.guest_phone.toLowerCase().includes(sLower));
          if (matchBasic) {
            searchMatches.push(b);
            continue;
          }
          try {
            const srv = await ServiceService.getServiceById(b.service_id);
            if (srv.name.toLowerCase().includes(sLower)) {
              searchMatches.push(b);
            }
          } catch {
            // Ignore
          }
        }
        allEntities = searchMatches;
      }

      if (timeFilter === 'upcoming') {
        allEntities = allEntities
          .filter((b) => b.end_time.getTime() >= now.getTime() && !['cancelled', 'payment-failed', 'payment_failed'].includes(b.status))
          .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
      } else if (timeFilter === 'past') {
        allEntities = allEntities
          .filter((b) => b.end_time.getTime() < now.getTime() || b.status === 'completed')
          .sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
      } else if (timeFilter === 'today') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        allEntities = allEntities
          .filter((b) => b.start_time.getTime() >= startOfDay.getTime() && b.start_time.getTime() <= endOfDay.getTime())
          .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
      } else if (timeFilter === 'this_week') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        allEntities = allEntities
          .filter((b) => b.start_time.getTime() >= startOfDay.getTime() && b.start_time.getTime() <= in7Days.getTime())
          .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());
      } else {
        allEntities.sort((a, b) => b.start_time.getTime() - a.start_time.getTime());
      }
    }

    const total = allEntities.length;
    const startIndex = (page - 1) * limit;
    const paginatedEntities = allEntities.slice(startIndex, startIndex + limit);

    const formattedList = await Promise.all(
      paginatedEntities.map((entity) => this.formatBooking(entity))
    );

    return {
      bookings: formattedList,
      total,
      page,
      limit,
    };
  }

  /**
   * 3. Get Booking Details by ID or Reference
   * Enforces role and ownership checks when authenticated.
   */
  public static async getBookingByIdOrReference(
    idOrReference: string,
    user?: AuthUserPayload
  ): Promise<BookingResponse> {
    let entity: BookingEntity | undefined;

    if (await this.isDbConnected()) {
      try {
        const res = await db.query<BookingEntity>(
          `SELECT * FROM bookings WHERE id = $1 OR booking_reference = $1 LIMIT 1`,
          [idOrReference]
        );
        if (res.rows.length > 0) {
          entity = res.rows[0];
        }
      } catch {
        // Fallback to in-memory
      }
    }

    if (!entity) {
      entity = Array.from(inMemoryBookings.values()).find(
        (b) => b.id === idOrReference || b.booking_reference === idOrReference
      );
    }

    if (!entity) {
      throw new NotFoundError(`Booking reservation "${idOrReference}" not found`);
    }

    // Role & Ownership enforcement
    if (user) {
      const userRole = (user.role || '').toUpperCase();
      if (userRole === 'ORGANISER') {
        const service = await ServiceService.getServiceById(entity.service_id);
        if (service.organiserId !== user.id) {
          throw new ForbiddenError('Access denied: You do not have permission to access bookings for this service');
        }
      } else if (userRole === 'CUSTOMER') {
        const isOwner =
          entity.customer_id === user.id ||
          (entity.guest_email && entity.guest_email.toLowerCase() === user.email.toLowerCase());
        if (!isOwner) {
          throw new ForbiddenError('Access denied: You can only view your own reservations');
        }
      }
    }

    return this.formatBooking(entity);
  }

  /**
   * 4. Confirm a Booking Reservation (Organiser / Admin)
   * Validates role & ownership, enforces status transition rules,
   * updates DB & memory, and synchronizes SlotEngineService.
   */
  public static async confirmBooking(
    idOrReference: string,
    user: AuthUserPayload,
    input?: ConfirmBookingInput
  ): Promise<BookingResponse> {
    const userRole = (user.role || '').toUpperCase();
    if (userRole === 'CUSTOMER') {
      throw new ForbiddenError('Customers cannot manually confirm reservations');
    }

    let entity: BookingEntity | undefined;
    if (await this.isDbConnected()) {
      try {
        const res = await db.query<BookingEntity>(
          `SELECT * FROM bookings WHERE id = $1 OR booking_reference = $1 LIMIT 1`,
          [idOrReference]
        );
        if (res.rows.length > 0) {
          entity = res.rows[0];
        }
      } catch {
        // Fallback
      }
    }

    if (!entity) {
      entity = Array.from(inMemoryBookings.values()).find(
        (b) => b.id === idOrReference || b.booking_reference === idOrReference
      );
    }

    if (!entity) {
      throw new NotFoundError(`Booking reservation "${idOrReference}" not found`);
    }

    // Role & Ownership enforcement
    if (userRole === 'ORGANISER') {
      const service = await ServiceService.getServiceById(entity.service_id);
      if (service.organiserId !== user.id) {
        throw new ForbiddenError('Access denied: You do not have permission to manage bookings for this service');
      }
    }

    if (entity.status === 'confirmed') {
      return this.formatBooking(entity);
    }

    if (entity.status === 'cancelled') {
      throw new BadRequestError('Cannot confirm a cancelled reservation');
    }

    const now = new Date();
    const newPaymentStatus: PaymentStatus = input?.markPaymentPaid ? 'paid' : entity.payment_status;
    const updatedNotes = input?.notes
      ? (entity.notes ? `${entity.notes}\n[Confirmed]: ${input.notes}` : input.notes)
      : entity.notes;

    if (await this.isDbConnected()) {
      try {
        await db.query(
          `UPDATE bookings 
           SET status = 'confirmed',
               payment_status = $1,
               notes = $2,
               updated_at = $3
           WHERE id = $4`,
          [newPaymentStatus, updatedNotes, now, entity.id]
        );
      } catch (err) {
        logger.warn('Failed to confirm booking in DB', { error: err });
      }
    }

    const inMem = inMemoryBookings.get(entity.id);
    if (inMem) {
      inMem.status = 'confirmed';
      inMem.payment_status = newPaymentStatus;
      inMem.notes = updatedNotes;
      inMem.updated_at = now;
      inMemoryBookings.set(entity.id, inMem);
    }

    entity.status = 'confirmed';
    entity.payment_status = newPaymentStatus;
    entity.notes = updatedNotes;
    entity.updated_at = now;

    // SlotEngineService synchronization
    SlotEngineService.updateBookingStatus(entity.id, 'confirmed');

    logger.info('Booking confirmed by organiser/admin', {
      bookingId: entity.id,
      reference: entity.booking_reference,
      confirmedBy: user.id,
      role: user.role,
    });

    return this.formatBooking(entity);
  }

  /**
   * 5. Cancel a Booking Reservation
   * Releases slot capacity in database and SlotEngineService.
   * Enforces role and ownership permissions.
   */
  public static async cancelBooking(
    idOrReference: string,
    reason?: string,
    cancelledBy?: AuthUserPayload
  ): Promise<BookingResponse> {
    let entity: BookingEntity | undefined;
    if (await this.isDbConnected()) {
      try {
        const res = await db.query<BookingEntity>(
          `SELECT * FROM bookings WHERE id = $1 OR booking_reference = $1 LIMIT 1`,
          [idOrReference]
        );
        if (res.rows.length > 0) {
          entity = res.rows[0];
        }
      } catch {
        // Fallback
      }
    }

    if (!entity) {
      entity = Array.from(inMemoryBookings.values()).find(
        (b) => b.id === idOrReference || b.booking_reference === idOrReference
      );
    }

    if (!entity) {
      throw new NotFoundError(`Booking reservation "${idOrReference}" not found`);
    }

    // Role & Ownership checks
    if (cancelledBy) {
      const userRole = (cancelledBy.role || '').toUpperCase();
      if (userRole === 'CUSTOMER') {
        const isOwner =
          entity.customer_id === cancelledBy.id ||
          (entity.guest_email && entity.guest_email.toLowerCase() === cancelledBy.email.toLowerCase());
        if (!isOwner) {
          throw new ForbiddenError('You can only cancel your own reservations');
        }
      } else if (userRole === 'ORGANISER') {
        const service = await ServiceService.getServiceById(entity.service_id);
        if (service.organiserId !== cancelledBy.id) {
          throw new ForbiddenError('Access denied: You do not own the service for this reservation');
        }
      }
    }

    if (entity.status === 'cancelled') {
      return this.formatBooking(entity);
    }

    const now = new Date();
    const effectiveReason =
      reason || (cancelledBy?.role === 'CUSTOMER' ? 'Cancelled by customer' : 'Cancelled by organiser');

    if (await this.isDbConnected()) {
      try {
        await db.query(
          `UPDATE bookings 
           SET status = 'cancelled', 
               cancellation_reason = $1, 
               cancelled_at = $2, 
               cancelled_by = $3, 
               updated_at = $2
           WHERE id = $4`,
          [effectiveReason, now, cancelledBy?.id || null, entity.id]
        );
      } catch (err) {
        logger.warn('Failed to update booking status in DB', { error: err });
      }
    }

    // Update in-memory booking
    const inMem = inMemoryBookings.get(entity.id);
    if (inMem) {
      inMem.status = 'cancelled';
      inMem.cancellation_reason = effectiveReason;
      inMem.cancelled_at = now;
      inMem.cancelled_by = cancelledBy?.id || null;
      inMem.updated_at = now;
      inMemoryBookings.set(entity.id, inMem);
    }

    entity.status = 'cancelled';
    entity.cancellation_reason = effectiveReason;
    entity.cancelled_at = now;
    entity.cancelled_by = cancelledBy?.id || null;
    entity.updated_at = now;

    // Release capacity in SlotEngineService
    SlotEngineService.updateBookingStatus(entity.id, 'cancelled');

    logger.info('Booking cancelled and slot capacity released', {
      bookingId: entity.id,
      reference: entity.booking_reference,
      reason: effectiveReason,
      cancelledBy: cancelledBy?.id,
    });

    return this.formatBooking(entity);
  }

  /**
   * 5. Update Booking Payment and Status
   * Updates payment_status and optionally booking status in DB and memory.
   */
  public static async updateBookingPaymentState(
    bookingId: string,
    paymentStatus: PaymentStatus,
    status?: BookingStatus
  ): Promise<void> {
    const now = new Date();
    if (await this.isDbConnected()) {
      try {
        if (status) {
          await db.query(
            `UPDATE bookings SET payment_status = $1, status = $2, updated_at = $3 WHERE id = $4`,
            [paymentStatus, status, now, bookingId]
          );
        } else {
          await db.query(
            `UPDATE bookings SET payment_status = $1, updated_at = $2 WHERE id = $3`,
            [paymentStatus, now, bookingId]
          );
        }
      } catch (err) {
        logger.warn('Failed to update booking payment state in DB', { error: err });
      }
    }

    const inMem = inMemoryBookings.get(bookingId);
    if (inMem) {
      inMem.payment_status = paymentStatus;
      if (status) {
        inMem.status = status;
      }
      inMem.updated_at = now;
      inMemoryBookings.set(bookingId, inMem);
    }
  }

  /**
   * Access in-memory bookings storage for resilient aggregation when DB is unavailable
   */
  public static getRawInMemoryBookings(): Map<string, BookingEntity> {
    return inMemoryBookings;
  }
}

