export type AppointmentType = 'individual' | 'group' | 'resource_constrained';

export type PaymentSetting = 'free' | 'paid' | 'pay_in_person';

export type ResourceAssignmentMode = 'automatic' | 'manual' | 'any_available' | 'single_resource';

export interface ServiceEntity {
  id: string;
  organiser_id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  duration_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  price_amount: number;
  price_currency: string;
  is_active: boolean;
  capacity_type: AppointmentType;
  default_capacity: number;
  max_advance_booking_days: number;
  min_lead_time_hours: number;
  requires_manual_confirmation: boolean;
  resource_assignment_mode: ResourceAssignmentMode;
  payment_setting: PaymentSetting;
  share_token: string;
  metadata?: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface ServiceResponse {
  id: string;
  organiserId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  priceAmount: number;
  priceCurrency: string;
  isActive: boolean;
  isPublished: boolean;
  capacityType: AppointmentType;
  defaultCapacity: number;
  maxAdvanceBookingDays: number;
  minLeadTimeHours: number;
  requiresManualConfirmation: boolean;
  resourceAssignmentMode: ResourceAssignmentMode;
  paymentSetting: PaymentSetting;
  shareToken: string;
  shareUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
