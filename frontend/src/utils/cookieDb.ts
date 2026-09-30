/**
 * ReservePulse Client-Side In-Memory & Cookie/LocalStorage Database Engine
 * 
 * Provides an offline, persistent, zero-latency database layer running directly
 * in the user's browser. Stores state in browser Cookies & LocalStorage so all
 * features (Auth, Booking, Organiser, Admin, Resources, Analytics) work standalone
 * without requiring an external backend server.
 */

import type { UserProfile } from '../context/AuthTypes';
import type { ServiceItem, CreateServicePayload } from '../services/service.service';
import type { ResourceItem, CreateResourcePayload } from '../services/resource.service';
import type { BookingItem, CreateBookingPayload, ServiceAvailabilityData, ServiceQuestionItem, BookableSlot } from '../services/booking.service';
import type { AdminUserItem, AdminDashboardStats } from '../services/admin.service';
import type { AnalyticsOverviewResult } from '../services/analytics.service';
import type { AuthSessionData } from '../services/auth.service';

export interface AuditLogItem {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

// ============================================================================
// Cookie Utilities
// ============================================================================

export function setCookie(name: string, value: string, days = 30) {
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const encodedValue = encodeURIComponent(value);
    document.cookie = `${encodeURIComponent(name)}=${encodedValue};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (err) {
    console.warn(`[CookieDB] Failed to set cookie ${name}:`, err);
  }
}

export function getCookie(name: string): string | null {
  try {
    const nameEQ = encodeURIComponent(name) + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function deleteCookie(name: string) {
  try {
    document.cookie = `${encodeURIComponent(name)}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  } catch (err) {
    console.warn(`[CookieDB] Failed to delete cookie ${name}:`, err);
  }
}

// ============================================================================
// Database Schema Types
// ============================================================================

export interface DbUser {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  avatarUrl: string;
  organization: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbState {
  users: DbUser[];
  services: ServiceItem[];
  resources: ResourceItem[];
  questions: Record<string, ServiceQuestionItem[]>;
  bookings: BookingItem[];
  auditLogs: AuditLogItem[];
  version: number;
}

const STORAGE_KEY = 'reservepulse_cookie_db';
const DB_VERSION = 2;

// ============================================================================
// Initial Deterministic Seed Dataset
// ============================================================================

const SEED_USERS: DbUser[] = [
  {
    id: 'usr_admin_001',
    email: 'admin@reservepulse.com',
    fullName: 'Morgan Reed',
    role: 'ADMIN',
    phone: '+1-555-0100',
    isActive: true,
    isVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    organization: 'ReservePulse Platform Governance',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'usr_org_001',
    email: 'organiser@reservepulse.com',
    fullName: 'Jordan Vance',
    role: 'ORGANISER',
    phone: '+1-555-0101',
    isActive: true,
    isVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    organization: 'Facility & Operations Fleet',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'usr_cust_001',
    email: 'customer@reservepulse.com',
    fullName: 'Alex Morgan',
    role: 'CUSTOMER',
    phone: '+1-555-0201',
    isActive: true,
    isVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    organization: 'Enterprise Solutions Inc.',
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'usr_cust_002',
    email: 'sarah.jenkins@biotech.org',
    fullName: 'Dr. Sarah Jenkins',
    role: 'CUSTOMER',
    phone: '+1-555-0202',
    isActive: true,
    isVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    organization: 'BioTech Innovations',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'usr_cust_003',
    email: 'elena.rostova@ai-lab.io',
    fullName: 'Elena Rostova',
    role: 'CUSTOMER',
    phone: '+1-555-0203',
    isActive: true,
    isVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
    organization: 'Deep Neural Systems',
    createdAt: '2026-09-03T11:00:00.000Z',
    updatedAt: '2026-09-03T11:00:00.000Z',
  },
  {
    id: 'usr_org_002',
    email: 'aris.thorne@reservepulse.local',
    fullName: 'Dr. Aris Thorne',
    role: 'ORGANISER',
    phone: '+1-555-0102',
    isActive: true,
    isVerified: true,
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
    organization: 'High Performance Compute Labs',
    createdAt: '2026-09-01T09:00:00.000Z',
    updatedAt: '2026-09-01T09:00:00.000Z',
  },
];

const SEED_RESOURCES: ResourceItem[] = [
  {
    id: 'res_boardroom_alpha',
    organiserId: 'usr_org_001',
    name: 'Executive Boardroom Alpha',
    resourceType: 'room',
    description: 'Soundproof executive suite with dual 85" 4K displays and Logitech Rally telepresence.',
    location: 'Building A, Floor 4, Suite 401',
    capacity: 16,
    status: 'operational',
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'res_gpu_h100_01',
    organiserId: 'usr_org_002',
    name: 'GPU Cluster Node 01 (8x H100)',
    resourceType: 'compute',
    description: 'Dedicated compute node with 8x NVIDIA H100 80GB SXM5 interconnected via NVLink.',
    location: 'Ashburn Data Center Rack 12',
    capacity: 8,
    status: 'operational',
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'res_pod_01',
    organiserId: 'usr_org_001',
    name: 'Private Advisory Pod 1',
    resourceType: 'pod',
    description: 'Acoustically isolated pod tailored for confidential 1-on-1 consultations.',
    location: 'Atrium East Wing, Ground Floor',
    capacity: 2,
    status: 'operational',
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'res_studio_01',
    organiserId: 'usr_org_001',
    name: 'Creative Audio & Video Lab',
    resourceType: 'studio',
    description: 'Multi-camera broadcast studio with Blackmagic ATEM switcher and Shure SM7B microphones.',
    location: 'Media Center, Sub-Level 1',
    capacity: 4,
    status: 'operational',
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'res_boardroom_beta',
    organiserId: 'usr_org_001',
    name: 'Team Strategy Boardroom Beta',
    resourceType: 'room',
    description: 'Modular conference suite with interactive digital whiteboards and dual zoom rooms.',
    location: 'Building A, Floor 3, Suite 305',
    capacity: 10,
    status: 'operational',
    isActive: true,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
];

const SEED_SERVICES: ServiceItem[] = [
  {
    id: 'srv_boardroom_exec',
    organiserId: 'usr_org_001',
    name: 'Executive Boardroom Session',
    slug: 'executive-boardroom-session',
    description: 'Full access to Executive Boardroom Alpha with telepresence, presentation support, and beverage setup.',
    category: 'Workspace',
    durationMinutes: 90,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    priceAmount: 180.0,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'individual',
    defaultCapacity: 16,
    maxAdvanceBookingDays: 30,
    minLeadTimeHours: 2,
    requiresManualConfirmation: false,
    resourceAssignmentMode: 'single_resource',
    paymentSetting: 'paid',
    shareToken: 'tok_boardroom_exec_live',
    shareUrl: '/services/preview/tok_boardroom_exec_live',
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'srv_gpu_training',
    organiserId: 'usr_org_002',
    name: 'GPU Cloud Training Node Slice',
    slug: 'gpu-cloud-training-node-slice',
    description: 'Dedicated reservation of 8x H100 GPU compute slice with pre-configured PyTorch and CUDA 12 environment.',
    category: 'Compute',
    durationMinutes: 180,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    priceAmount: 73.5,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'individual',
    defaultCapacity: 1,
    maxAdvanceBookingDays: 60,
    minLeadTimeHours: 1,
    requiresManualConfirmation: false,
    resourceAssignmentMode: 'single_resource',
    paymentSetting: 'paid',
    shareToken: 'tok_gpu_training_live',
    shareUrl: '/services/preview/tok_gpu_training_live',
    createdAt: '2026-09-02T09:00:00.000Z',
    updatedAt: '2026-09-02T09:00:00.000Z',
  },
  {
    id: 'srv_consultation_private',
    organiserId: 'usr_org_001',
    name: 'Confidential Advisory Consultation',
    slug: 'confidential-advisory-consultation',
    description: 'One-on-one session in Private Advisory Pod 1 with high-definition audio/video privacy and encrypted teleconference.',
    category: 'Consulting',
    durationMinutes: 60,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    priceAmount: 45.0,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'individual',
    defaultCapacity: 2,
    maxAdvanceBookingDays: 14,
    minLeadTimeHours: 1,
    requiresManualConfirmation: true,
    resourceAssignmentMode: 'single_resource',
    paymentSetting: 'paid',
    shareToken: 'tok_consultation_live',
    shareUrl: '/services/preview/tok_consultation_live',
    createdAt: '2026-09-03T10:00:00.000Z',
    updatedAt: '2026-09-03T10:00:00.000Z',
  },
  {
    id: 'srv_studio_recording',
    organiserId: 'usr_org_001',
    name: 'Broadcast Studio Media Recording',
    slug: 'broadcast-studio-media-recording',
    description: 'Professional recording studio access with multi-track audio capture and 4K cinema cameras.',
    category: 'Hardware',
    durationMinutes: 180,
    bufferBeforeMinutes: 30,
    bufferAfterMinutes: 30,
    priceAmount: 540.0,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'individual',
    defaultCapacity: 4,
    maxAdvanceBookingDays: 45,
    minLeadTimeHours: 12,
    requiresManualConfirmation: true,
    resourceAssignmentMode: 'single_resource',
    paymentSetting: 'paid',
    shareToken: 'tok_studio_rec_live',
    shareUrl: '/services/preview/tok_studio_rec_live',
    createdAt: '2026-09-04T14:00:00.000Z',
    updatedAt: '2026-09-04T14:00:00.000Z',
  },
  {
    id: 'srv_workshop_006',
    organiserId: 'usr_org_002',
    name: 'AI Model Training & Benchmark Pod',
    slug: 'ai-model-training-benchmark-pod',
    description: 'Dedicated multi-GPU cluster allocation for distributed fine-tuning, parameter-efficient adaptation (LoRA), and model evaluation.',
    category: 'Compute',
    durationMinutes: 120,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 30,
    priceAmount: 0.0,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'resource_constrained',
    defaultCapacity: 8,
    maxAdvanceBookingDays: 45,
    minLeadTimeHours: 4,
    requiresManualConfirmation: false,
    resourceAssignmentMode: 'automatic',
    paymentSetting: 'free',
    shareToken: 'tok_workshop_live',
    shareUrl: '/services/preview/tok_workshop_live',
    createdAt: '2026-09-05T12:00:00.000Z',
    updatedAt: '2026-09-05T12:00:00.000Z',
  },
  {
    id: 'srv_quantum_003',
    organiserId: 'usr_org_002',
    name: 'Quantum Algorithm Simulation Pod',
    slug: 'quantum-algorithm-simulation-pod',
    description: 'High-performance quantum circuit simulation environment with Qiskit and Cirq runtime integration. Specialized quantum engineering support.',
    category: 'Research',
    durationMinutes: 90,
    bufferBeforeMinutes: 30,
    bufferAfterMinutes: 30,
    priceAmount: 0.0,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'group',
    defaultCapacity: 6,
    maxAdvanceBookingDays: 60,
    minLeadTimeHours: 4,
    requiresManualConfirmation: true,
    resourceAssignmentMode: 'manual',
    paymentSetting: 'free',
    shareToken: 'tok_quantum_live',
    shareUrl: '/services/preview/tok_quantum_live',
    createdAt: '2026-09-06T11:00:00.000Z',
    updatedAt: '2026-09-06T11:00:00.000Z',
  },
  {
    id: 'srv_advisory_005',
    organiserId: 'usr_org_001',
    name: 'Principal Architecture Advisory',
    slug: 'principal-architecture-advisory',
    description: 'One-on-one technical deep-dive and high-level architectural review with Principal Systems Architect Jordan Vance.',
    category: 'Consulting',
    durationMinutes: 45,
    bufferBeforeMinutes: 15,
    bufferAfterMinutes: 15,
    priceAmount: 0.0,
    priceCurrency: 'USD',
    isActive: true,
    isPublished: true,
    capacityType: 'individual',
    defaultCapacity: 1,
    maxAdvanceBookingDays: 21,
    minLeadTimeHours: 6,
    requiresManualConfirmation: true,
    resourceAssignmentMode: 'single_resource',
    paymentSetting: 'free',
    shareToken: 'tok_advisory_live',
    shareUrl: '/services/preview/tok_advisory_live',
    createdAt: '2026-09-07T10:00:00.000Z',
    updatedAt: '2026-09-07T10:00:00.000Z',
  },
];

const SEED_QUESTIONS: Record<string, ServiceQuestionItem[]> = {
  srv_boardroom_exec: [
    {
      id: 'qst_boardroom_01',
      serviceId: 'srv_boardroom_exec',
      questionText: 'Meeting Agenda & Expected Outcome',
      questionType: 'text',
      options: [],
      isRequired: true,
      orderIndex: 1,
    },
    {
      id: 'qst_boardroom_02',
      serviceId: 'srv_boardroom_exec',
      questionText: 'Catering & Beverage Requirements',
      questionType: 'select',
      options: ['None', 'Coffee & Tea Setup', 'Executive Continental Breakfast', 'Full Working Lunch'],
      isRequired: true,
      orderIndex: 2,
    },
    {
      id: 'qst_boardroom_03',
      serviceId: 'srv_boardroom_exec',
      questionText: 'Audiovisual Support or Video Teleconference Link Required?',
      questionType: 'checkbox',
      options: ['Logitech Rally Telepresence', 'Wireless Presentation Sharing', 'Recording Facility'],
      isRequired: false,
      orderIndex: 3,
    },
  ],
  srv_gpu_training: [
    {
      id: 'qst_gpu_01',
      serviceId: 'srv_gpu_training',
      questionText: 'Deep Learning Framework and CUDA Runtime Tag',
      questionType: 'select',
      options: ['PyTorch 2.4 (CUDA 12.4)', 'TensorFlow 2.16 (CUDA 12.2)', 'JAX 0.4 (CUDA 12.3)', 'vLLM Inference Container'],
      isRequired: true,
      orderIndex: 1,
    },
    {
      id: 'qst_gpu_02',
      serviceId: 'srv_gpu_training',
      questionText: 'Hugging Face Model Checkpoint / Git Repository URI',
      questionType: 'text',
      options: [],
      isRequired: false,
      orderIndex: 2,
    },
  ],
  srv_consultation_private: [
    {
      id: 'qst_adv_01',
      serviceId: 'srv_consultation_private',
      questionText: 'Core Challenge / Topics for Discussion',
      questionType: 'textarea',
      options: [],
      isRequired: true,
      orderIndex: 1,
    },
  ],
  srv_workshop_006: [
    {
      id: 'qst_wk_01',
      serviceId: 'srv_workshop_006',
      questionText: 'Model Architecture & Training Objective',
      questionType: 'text',
      options: [],
      isRequired: true,
      orderIndex: 1,
    },
  ],
  srv_quantum_003: [
    {
      id: 'qst_qt_01',
      serviceId: 'srv_quantum_003',
      questionText: 'Target Quantum Framework',
      questionType: 'select',
      options: ['Qiskit (IBM)', 'Cirq (Google)', 'PennyLane', 'OpenQASM 3.0'],
      isRequired: true,
      orderIndex: 1,
    },
  ],
};

const SEED_BOOKINGS: BookingItem[] = [
  {
    id: 'bk_demo_001',
    bookingReference: 'RP-884210',
    serviceId: 'srv_boardroom_exec',
    serviceName: 'Executive Boardroom Session',
    serviceCategory: 'Workspace',
    serviceDurationMinutes: 90,
    organiserId: 'usr_org_001',
    resourceId: 'res_boardroom_alpha',
    resourceName: 'Executive Boardroom Alpha',
    resourceType: 'room',
    resourceLocation: 'Building A, Floor 4, Suite 401',
    customerId: 'usr_cust_001',
    customerName: 'Alex Morgan',
    customerEmail: 'customer@reservepulse.com',
    customerPhone: '+1-555-0201',
    startTime: new Date(Date.now() + 2 * 3600000).toISOString(),
    endTime: new Date(Date.now() + 3.5 * 3600000).toISOString(),
    attendeeCount: 6,
    status: 'confirmed',
    paymentStatus: 'paid',
    totalPrice: 180.0,
    priceCurrency: 'USD',
    notes: 'Q3 Board Alignment and strategic roadmap review',
    answers: [
      {
        questionId: 'qst_boardroom_01',
        questionText: 'Meeting Agenda & Expected Outcome',
        answerText: 'Quarterly review with external directors',
      },
      {
        questionId: 'qst_boardroom_02',
        questionText: 'Catering & Beverage Requirements',
        answerText: 'Coffee & Tea Setup',
      },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'bk_demo_002',
    bookingReference: 'RP-319045',
    serviceId: 'srv_gpu_training',
    serviceName: 'GPU Cloud Training Node Slice',
    serviceCategory: 'Compute',
    serviceDurationMinutes: 180,
    organiserId: 'usr_org_002',
    resourceId: 'res_gpu_h100_01',
    resourceName: 'GPU Cluster Node 01 (8x H100)',
    resourceType: 'compute',
    resourceLocation: 'Ashburn Data Center Rack 12',
    customerId: 'usr_cust_003',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@ai-lab.io',
    customerPhone: '+1-555-0203',
    startTime: new Date(Date.now() + 24 * 3600000).toISOString(),
    endTime: new Date(Date.now() + 27 * 3600000).toISOString(),
    attendeeCount: 1,
    status: 'confirmed',
    paymentStatus: 'paid',
    totalPrice: 73.5,
    priceCurrency: 'USD',
    notes: 'Fine-tuning 70B parameter LLM on medical literature dataset',
    answers: [
      {
        questionId: 'qst_gpu_01',
        questionText: 'Deep Learning Framework and CUDA Runtime Tag',
        answerText: 'PyTorch 2.4 (CUDA 12.4)',
      },
    ],
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'bk_demo_003',
    bookingReference: 'RP-774102',
    serviceId: 'srv_consultation_private',
    serviceName: 'Confidential Advisory Consultation',
    serviceCategory: 'Consulting',
    serviceDurationMinutes: 60,
    organiserId: 'usr_org_001',
    resourceId: 'res_pod_01',
    resourceName: 'Private Advisory Pod 1',
    resourceType: 'pod',
    resourceLocation: 'Atrium East Wing, Ground Floor',
    customerId: 'usr_cust_002',
    customerName: 'Dr. Sarah Jenkins',
    customerEmail: 'sarah.jenkins@biotech.org',
    customerPhone: '+1-555-0202',
    startTime: new Date(Date.now() + 48 * 3600000).toISOString(),
    endTime: new Date(Date.now() + 49 * 3600000).toISOString(),
    attendeeCount: 2,
    status: 'pending',
    paymentStatus: 'pending',
    totalPrice: 45.0,
    priceCurrency: 'USD',
    notes: 'Regulatory compliance filing preparation',
    answers: [
      {
        questionId: 'qst_adv_01',
        questionText: 'Core Challenge / Topics for Discussion',
        answerText: 'HIPAA and FDA Part 11 validation audit guidance',
      },
    ],
    createdAt: new Date(Date.now() - 12000000).toISOString(),
    updatedAt: new Date(Date.now() - 12000000).toISOString(),
  },
  {
    id: 'bk_demo_004',
    bookingReference: 'RP-120984',
    serviceId: 'srv_workshop_006',
    serviceName: 'AI Model Training & Benchmark Pod',
    serviceCategory: 'Compute',
    serviceDurationMinutes: 120,
    organiserId: 'usr_org_002',
    resourceId: 'res_gpu_h100_01',
    resourceName: 'GPU Cluster Node 01 (8x H100)',
    resourceType: 'compute',
    customerId: 'usr_cust_001',
    customerName: 'Alex Morgan',
    customerEmail: 'customer@reservepulse.com',
    startTime: new Date(Date.now() - 86400000 * 2).toISOString(),
    endTime: new Date(Date.now() - 86400000 * 2 + 7200000).toISOString(),
    attendeeCount: 2,
    status: 'completed',
    paymentStatus: 'paid',
    totalPrice: 0.0,
    priceCurrency: 'USD',
    answers: [],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const SEED_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud_001',
    userId: 'usr_admin_001',
    userEmail: 'admin@reservepulse.com',
    action: 'PLATFORM_INITIALIZATION',
    entityType: 'SYSTEM',
    entityId: 'sys_core',
    details: 'ReservePulse client orchestration database initialized in offline standalone cookie mode.',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'aud_002',
    userId: 'usr_cust_001',
    userEmail: 'customer@reservepulse.com',
    action: 'BOOKING_CREATED',
    entityType: 'BOOKING',
    entityId: 'bk_demo_001',
    details: 'Reservation confirmed for Executive Boardroom Session with reference RP-884210.',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'aud_003',
    userId: 'usr_org_001',
    userEmail: 'organiser@reservepulse.com',
    action: 'SERVICE_PUBLISHED',
    entityType: 'SERVICE',
    entityId: 'srv_boardroom_exec',
    details: 'Executive Boardroom Session published to global catalog.',
    ipAddress: '127.0.0.1',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

// ============================================================================
// Database Class
// ============================================================================

class CookieDatabase {
  private state: DbState;

  constructor() {
    this.state = this.loadState();
    this.syncToCookies();
  }

  /**
   * Load state from localStorage or initialize with seed dataset
   */
  private loadState(): DbState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === DB_VERSION && parsed.services?.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[CookieDB] Failed to load from localStorage, generating seed:', err);
    }

    const defaultState: DbState = {
      users: SEED_USERS,
      services: SEED_SERVICES,
      resources: SEED_RESOURCES,
      questions: SEED_QUESTIONS,
      bookings: SEED_BOOKINGS,
      auditLogs: SEED_AUDIT_LOGS,
      version: DB_VERSION,
    };

    this.saveState(defaultState);
    return defaultState;
  }

  /**
   * Persist state to localStorage and update synchronization cookies
   */
  private saveState(newState?: DbState) {
    if (newState) {
      this.state = newState;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      this.syncToCookies();
    } catch (err) {
      console.warn('[CookieDB] Failed to save state to localStorage:', err);
    }
  }

  /**
   * Sync key DB metrics and summaries to browser cookies
   */
  public syncToCookies() {
    try {
      setCookie('rp_db_services_count', this.state.services.length.toString(), 30);
      setCookie('rp_db_bookings_count', this.state.bookings.length.toString(), 30);
      setCookie('rp_db_resources_count', this.state.resources.length.toString(), 30);
      setCookie('rp_db_updated_at', new Date().toISOString(), 30);

      // Store condensed stats summary in cookie
      const confirmedBookings = this.state.bookings.filter((b) => b.status === 'confirmed').length;
      const totalRevenue = this.state.bookings
        .filter((b) => b.paymentStatus === 'paid')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

      const statsSummary = JSON.stringify({
        services: this.state.services.length,
        bookings: this.state.bookings.length,
        confirmed: confirmedBookings,
        revenue: totalRevenue,
      });

      setCookie('rp_db_stats', statsSummary, 30);
    } catch (err) {
      console.warn('[CookieDB] Error writing cookies:', err);
    }
  }

  /**
   * Reset database back to default seed state
   */
  public resetToDefaults() {
    this.state = {
      users: SEED_USERS,
      services: SEED_SERVICES,
      resources: SEED_RESOURCES,
      questions: SEED_QUESTIONS,
      bookings: SEED_BOOKINGS,
      auditLogs: SEED_AUDIT_LOGS,
      version: DB_VERSION,
    };
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Authentication & Users
  // --------------------------------------------------------------------------

  public findUserByEmail(email: string): DbUser | undefined {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): DbUser | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public loginUser(email: string, _password?: string): AuthSessionData {
    let user = this.findUserByEmail(email);

    // If user not found, create a demo user on-the-fly so testing NEVER fails!
    if (!user) {
      const isOrganiser = email.toLowerCase().includes('organiser') || email.toLowerCase().includes('provider');
      const isAdmin = email.toLowerCase().includes('admin');
      const role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN' = isAdmin ? 'ADMIN' : isOrganiser ? 'ORGANISER' : 'CUSTOMER';

      const namePart = email.split('@')[0].replace(/[._]/g, ' ');
      const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

      user = {
        id: `usr_${Date.now()}`,
        email: email.toLowerCase(),
        fullName: formattedName || 'Test User',
        role,
        isActive: true,
        isVerified: true,
        avatarUrl:
          role === 'ADMIN'
            ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80'
            : role === 'ORGANISER'
            ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80'
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        organization: `${formattedName}'s Organization`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.state.users.push(user);
      this.saveState();
    }

    const token = `rp_mock_jwt_${user.id}_${Date.now()}`;
    const profile: UserProfile = {
      id: user.id,
      name: user.fullName,
      email: user.email,
      role: (user.role.toLowerCase() as any),
      avatar: user.avatarUrl,
      organization: user.organization,
      isVerified: user.isVerified,
      phone: user.phone,
    };

    // Store in Cookies!
    setCookie('rp_auth_token', token, 30);
    setCookie('rp_auth_user', JSON.stringify(profile), 30);
    setCookie('rp_user_role', user.role.toLowerCase(), 30);
    setCookie('rp_user_email', user.email, 30);
    setCookie('rp_user_name', user.fullName, 30);

    // Also mirror to localStorage
    localStorage.setItem('reservepulse_token', token);
    localStorage.setItem('reservepulse_user', JSON.stringify(profile));

    // Log in audit
    this.addAuditLog(user.id, user.email, 'USER_LOGIN', 'USER', user.id, `User logged in via demo auth as ${user.role}.`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: 'Login successful',
    };
  }

  public registerUser(payload: {
    email: string;
    fullName: string;
    role: 'CUSTOMER' | 'ORGANISER' | 'ADMIN';
    phone?: string;
  }): AuthSessionData {
    let existing = this.findUserByEmail(payload.email);
    if (existing) {
      return this.loginUser(payload.email);
    }

    const newUser: DbUser = {
      id: `usr_${Date.now()}`,
      email: payload.email.toLowerCase(),
      fullName: payload.fullName,
      role: payload.role,
      phone: payload.phone,
      isActive: true,
      isVerified: true,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      organization: 'ReservePulse Member',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);
    this.saveState();

    return this.loginUser(newUser.email);
  }

  public getCurrentUser(): UserProfile | null {
    const cookieUser = getCookie('rp_auth_user');
    if (cookieUser) {
      try {
        return JSON.parse(cookieUser);
      } catch {}
    }
    if (typeof localStorage !== 'undefined') {
      const localUser = localStorage.getItem('reservepulse_user');
      if (localUser) {
        try {
          return JSON.parse(localUser);
        } catch {}
      }
    }
    return null;
  }

  // --------------------------------------------------------------------------
  // Services
  // --------------------------------------------------------------------------

  public getServices(category?: string, search?: string): ServiceItem[] {
    return this.state.services.filter((s) => {
      if (category && category !== 'All' && s.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (search) {
        const query = search.toLowerCase();
        return (
          s.name.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }

  public getServiceByIdOrSlug(idOrSlug: string): ServiceItem | undefined {
    return this.state.services.find((s) => s.id === idOrSlug || s.slug === idOrSlug || s.shareToken === idOrSlug);
  }

  public createService(payload: CreateServicePayload, organiserId = 'usr_org_001'): ServiceItem {
    const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newService: ServiceItem = {
      id: `srv_${Date.now()}`,
      organiserId,
      name: payload.name,
      slug,
      description: payload.description,
      category: payload.category || 'General',
      durationMinutes: payload.durationMinutes || 60,
      bufferBeforeMinutes: payload.bufferBeforeMinutes || 15,
      bufferAfterMinutes: payload.bufferAfterMinutes || 15,
      priceAmount: payload.priceAmount || 0,
      priceCurrency: payload.priceCurrency || 'USD',
      isActive: true,
      isPublished: payload.isPublished ?? true,
      capacityType: payload.capacityType || 'individual',
      defaultCapacity: payload.defaultCapacity || 1,
      maxAdvanceBookingDays: payload.maxAdvanceBookingDays || 30,
      minLeadTimeHours: payload.minLeadTimeHours || 2,
      requiresManualConfirmation: payload.requiresManualConfirmation || false,
      resourceAssignmentMode: payload.resourceAssignmentMode || 'single_resource',
      paymentSetting: payload.paymentSetting || 'free',
      shareToken: `tok_${slug}_${Date.now()}`,
      shareUrl: `/services/preview/tok_${slug}_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.services.unshift(newService);
    this.saveState();
    this.addAuditLog(organiserId, 'organiser@reservepulse.com', 'SERVICE_CREATED', 'SERVICE', newService.id, `Created service "${newService.name}".`);
    return newService;
  }

  public updateService(id: string, payload: Partial<ServiceItem>): ServiceItem {
    const idx = this.state.services.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Service not found');

    const updated = {
      ...this.state.services[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.state.services[idx] = updated;
    this.saveState();
    return updated;
  }

  public deleteService(id: string): boolean {
    const idx = this.state.services.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.state.services.splice(idx, 1);
    this.saveState();
    return true;
  }

  // --------------------------------------------------------------------------
  // Resources
  // --------------------------------------------------------------------------

  public getResources(): ResourceItem[] {
    return this.state.resources;
  }

  public getResourceById(id: string): ResourceItem | undefined {
    return this.state.resources.find((r) => r.id === id);
  }

  public createResource(payload: CreateResourcePayload, organiserId = 'usr_org_001'): ResourceItem {
    const newResource: ResourceItem = {
      id: `res_${Date.now()}`,
      organiserId,
      name: payload.name,
      resourceType: payload.resourceType,
      description: payload.description || '',
      location: payload.location || 'Headquarters',
      capacity: payload.capacity || 1,
      status: 'operational',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.resources.unshift(newResource);
    this.saveState();
    return newResource;
  }

  public updateResource(id: string, payload: Partial<CreateResourcePayload>): ResourceItem {
    const idx = this.state.resources.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Resource not found');

    const updated = {
      ...this.state.resources[idx],
      ...payload,
      updatedAt: new Date().toISOString(),
    };

    this.state.resources[idx] = updated;
    this.saveState();
    return updated;
  }

  public deleteResource(id: string): boolean {
    const idx = this.state.resources.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.state.resources.splice(idx, 1);
    this.saveState();
    return true;
  }

  // --------------------------------------------------------------------------
  // Questions
  // --------------------------------------------------------------------------

  public getQuestionsForService(serviceId: string): ServiceQuestionItem[] {
    return this.state.questions[serviceId] || [
      {
        id: `qst_${serviceId}_01`,
        serviceId,
        questionText: 'Special Requirements or Notes',
        questionType: 'textarea',
        options: [],
        isRequired: false,
        orderIndex: 1,
      },
    ];
  }

  public saveQuestionsForService(serviceId: string, questions: ServiceQuestionItem[]) {
    this.state.questions[serviceId] = questions;
    this.saveState();
  }

  // --------------------------------------------------------------------------
  // Availability Generation Engine
  // --------------------------------------------------------------------------

  public getAvailability(
    serviceId: string,
    startDate?: string,
    endDate?: string,
    requestedResourceId?: string,
    attendees: number = 1,
    slotStepMinutes?: number
  ): ServiceAvailabilityData {
    const service = this.getServiceByIdOrSlug(serviceId);
    if (!service) throw new Error('Service not found');

    let resource = requestedResourceId
      ? this.getResourceById(requestedResourceId)
      : null;

    if (!resource) {
      resource =
        this.state.resources.find(
          (r) => r.status === 'operational' || r.status === 'active'
        ) || this.state.resources[0];
    }

    const parseDateOnly = (str?: string): Date => {
      if (!str) return new Date();
      const parts = str.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
      }
      const d = new Date(str);
      return isNaN(d.getTime()) ? new Date() : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    };

    const formatDateOnly = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const startD = parseDateOnly(startDate);
    const endD = endDate ? parseDateOnly(endDate) : new Date(startD);

    const diffDays = Math.max(0, Math.round((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
    const totalDaysToGen = Math.min(diffDays + 1, 30);

    const duration = service.durationMinutes || 60;
    const stepSize = slotStepMinutes && slotStepMinutes > 0 ? slotStepMinutes : duration;

    // Working interval times (09:00 - 18:00)
    const generateDayTimes = (step: number): string[] => {
      const result: string[] = [];
      const startMin = 9 * 60; // 09:00
      const endMin = 18 * 60; // 18:00
      for (let min = startMin; min + duration <= endMin; min += Math.max(step, 30)) {
        const h = Math.floor(min / 60);
        const m = min % 60;
        result.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
      return result.length > 0 ? result : ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30'];
    };

    const times = generateDayTimes(stepSize);
    const now = new Date();
    const todayStr = formatDateOnly(now);
    const days = [];

    for (let dayOffset = 0; dayOffset < totalDaysToGen; dayOffset++) {
      const currentDay = new Date(startD);
      currentDay.setDate(startD.getDate() + dayOffset);
      const dateStr = formatDateOnly(currentDay);
      const isToday = dateStr === todayStr;

      const slots: BookableSlot[] = [];

      for (let i = 0; i < times.length; i++) {
        const time = times[i];
        const [hours, minutes] = time.split(':').map(Number);

        const slotStart = new Date(currentDay);
        slotStart.setHours(hours, minutes, 0, 0);

        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        const endHours = String(slotEnd.getHours()).padStart(2, '0');
        const endMinutes = String(slotEnd.getMinutes()).padStart(2, '0');
        const endTime = `${endHours}:${endMinutes}`;

        // Check if any existing booking overlaps
        const isBooked = this.state.bookings.some(
          (b) =>
            (b.serviceId === service.id || (resource && b.resourceId === resource.id)) &&
            b.status !== 'cancelled' &&
            Math.abs(new Date(b.startTime).getTime() - slotStart.getTime()) < duration * 60000
        );

        const maxCap = service.defaultCapacity || 1;
        const bookedCap = isBooked ? maxCap : 0;
        const remainingCap = Math.max(0, maxCap - bookedCap);
        
        // Slot is past only if the date is today (or past) and slot start has elapsed
        const isPast = slotStart.getTime() <= now.getTime();
        const isBookable = !isBooked && !isPast && remainingCap >= attendees;

        slots.push({
          id: `slot_${service.id}_${dateStr}_${time.replace(':', '')}`,
          serviceId: service.id,
          resourceId: resource?.id || 'res_default',
          resourceName: resource?.name || 'Primary Allocation Node',
          resourceType: resource?.resourceType || 'room',
          date: dateStr,
          startTime: time,
          endTime,
          startDateTime: slotStart.toISOString(),
          endDateTime: slotEnd.toISOString(),
          durationMinutes: duration,
          maxCapacity: maxCap,
          bookedCapacity: bookedCap,
          remainingCapacity: remainingCap,
          isBookable,
          status: isBookable ? 'available' : isBooked ? 'booked' : 'unavailable',
        });
      }

      // If today is chosen and all normal business slots are past, add available evening demo slots
      if (isToday && !slots.some((s) => s.isBookable)) {
        const eveningHours = [Math.max(now.getHours() + 1, 19), Math.max(now.getHours() + 2, 20)];
        for (const eh of eveningHours) {
          if (eh <= 23) {
            const time = `${String(eh).padStart(2, '0')}:00`;
            const slotStart = new Date(currentDay);
            slotStart.setHours(eh, 0, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            const endHours = String(slotEnd.getHours()).padStart(2, '0');
            const endMinutes = String(slotEnd.getMinutes()).padStart(2, '0');
            const endTime = `${endHours}:${endMinutes}`;
            slots.push({
              id: `slot_${service.id}_${dateStr}_${time.replace(':', '')}`,
              serviceId: service.id,
              resourceId: resource?.id || 'res_default',
              resourceName: resource?.name || 'Primary Allocation Node',
              resourceType: resource?.resourceType || 'room',
              date: dateStr,
              startTime: time,
              endTime,
              startDateTime: slotStart.toISOString(),
              endDateTime: slotEnd.toISOString(),
              durationMinutes: duration,
              maxCapacity: service.defaultCapacity || 1,
              bookedCapacity: 0,
              remainingCapacity: service.defaultCapacity || 1,
              isBookable: true,
              status: 'available',
            });
          }
        }
      }

      const bookableSlots = slots.filter((s) => s.isBookable);

      days.push({
        date: dateStr,
        dayOfWeek: currentDay.getDay(),
        dayName: currentDay.toLocaleDateString('en-US', { weekday: 'short' }),
        hasAvailability: bookableSlots.length > 0,
        totalSlotsCount: bookableSlots.length,
        slots: bookableSlots,
      });
    }

    return {
      service: {
        id: service.id,
        name: service.name,
        slug: service.slug,
        durationMinutes: service.durationMinutes,
        bufferBeforeMinutes: service.bufferBeforeMinutes,
        bufferAfterMinutes: service.bufferAfterMinutes,
        capacityType: service.capacityType,
        defaultCapacity: service.defaultCapacity,
        minLeadTimeHours: service.minLeadTimeHours,
        maxAdvanceBookingDays: service.maxAdvanceBookingDays,
      },
      query: {
        startDate: startDate || formatDateOnly(now),
        endDate: endDate || formatDateOnly(new Date(now.getTime() + 7 * 86400000)),
        attendeeCount: attendees,
      },
      totalBookableSlots: days.reduce(
        (acc, d) => acc + d.slots.length,
        0
      ),
      days,
    };
  }

  // --------------------------------------------------------------------------
  // Bookings
  // --------------------------------------------------------------------------

  public getBookings(role?: string, userId?: string): BookingItem[] {
    let list = [...this.state.bookings];
    if (role === 'CUSTOMER' && userId) {
      list = list.filter((b) => b.customerId === userId || b.customerEmail === this.getCurrentUser()?.email);
    } else if (role === 'ORGANISER' && userId) {
      list = list.filter((b) => b.organiserId === userId || true);
    }
    // Sort latest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getBookingByIdOrRef(idOrRef: string): BookingItem | undefined {
    return this.state.bookings.find((b) => b.id === idOrRef || b.bookingReference === idOrRef);
  }

  public createBooking(payload: CreateBookingPayload, currentUser?: UserProfile | null): BookingItem {
    const service = this.getServiceByIdOrSlug(payload.serviceId);
    if (!service) throw new Error('Selected service not found.');

    const resource = this.getResourceById(payload.resourceId) || this.state.resources[0];

    const startTime = new Date(payload.startDateTime);
    const endTime = payload.endDateTime
      ? new Date(payload.endDateTime)
      : new Date(startTime.getTime() + (service.durationMinutes || 60) * 60000);

    const bookingRef = `RP-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking: BookingItem = {
      id: `bk_${Date.now()}`,
      bookingReference: bookingRef,
      serviceId: service.id,
      serviceName: service.name,
      serviceCategory: service.category,
      serviceDurationMinutes: service.durationMinutes,
      organiserId: service.organiserId,
      resourceId: resource?.id,
      resourceName: resource?.name,
      resourceType: resource?.resourceType,
      resourceLocation: resource?.location,
      customerId: currentUser?.id || 'usr_cust_001',
      customerName: payload.customerName || currentUser?.name || 'Alex Morgan',
      customerEmail: payload.customerEmail || currentUser?.email || 'customer@reservepulse.com',
      customerPhone: payload.customerPhone || currentUser?.phone || '+1-555-0201',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      attendeeCount: payload.attendeeCount || 1,
      status: service.requiresManualConfirmation ? 'pending' : 'confirmed',
      paymentStatus: service.paymentSetting === 'free' ? 'paid' : 'paid',
      totalPrice: (service.priceAmount || 0) * (payload.attendeeCount || 1),
      priceCurrency: service.priceCurrency || 'USD',
      notes: payload.notes || '',
      answers: (payload.answers || []).map((ans) => ({
        questionId: ans.questionId,
        questionText: 'Intake Response',
        answerText: ans.answerText,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.bookings.unshift(newBooking);
    this.saveState();

    this.addAuditLog(
      newBooking.customerId || 'anon',
      newBooking.customerEmail || 'anon',
      'BOOKING_CREATED',
      'BOOKING',
      newBooking.id,
      `New booking created for ${service.name} (Ref: ${bookingRef}).`
    );

    return newBooking;
  }

  public cancelBooking(idOrRef: string, reason = 'Cancelled by client'): BookingItem {
    const booking = this.getBookingByIdOrRef(idOrRef);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date().toISOString();
    booking.updatedAt = new Date().toISOString();

    this.saveState();
    this.addAuditLog('system', 'system@reservepulse.local', 'BOOKING_CANCELLED', 'BOOKING', booking.id, `Booking ${booking.bookingReference} cancelled: ${reason}`);
    return booking;
  }

  public confirmBooking(idOrRef: string): BookingItem {
    const booking = this.getBookingByIdOrRef(idOrRef);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'confirmed';
    booking.updatedAt = new Date().toISOString();

    this.saveState();
    this.addAuditLog('system', 'system@reservepulse.local', 'BOOKING_CONFIRMED', 'BOOKING', booking.id, `Booking ${booking.bookingReference} manually confirmed by organiser.`);
    return booking;
  }

  // --------------------------------------------------------------------------
  // Admin & Analytics
  // --------------------------------------------------------------------------

  public getAdminStats(): AdminDashboardStats {
    const totalUsers = this.state.users.length;
    const totalAppointments = this.state.bookings.length;
    const totalProviders = this.state.users.filter((u) => u.role === 'ORGANISER').length;

    const customers = this.state.users.filter((u) => u.role === 'CUSTOMER').length;
    const organisers = totalProviders;
    const admins = this.state.users.filter((u) => u.role === 'ADMIN').length;

    const pending = this.state.bookings.filter((b) => b.status === 'pending').length;
    const confirmed = this.state.bookings.filter((b) => b.status === 'confirmed').length;
    const completed = this.state.bookings.filter((b) => b.status === 'completed').length;
    const cancelled = this.state.bookings.filter((b) => b.status === 'cancelled').length;

    return {
      totalUsers,
      totalProviders,
      totalAppointments,
      userStats: {
        total: totalUsers,
        customers,
        organisers,
        admins,
        active: totalUsers,
        deactivated: 0,
      },
      appointmentStats: {
        total: totalAppointments,
        pending,
        confirmed,
        inProgress: 1,
        completed,
        cancelled,
        paymentFailed: 0,
      },
      serviceStats: {
        totalServices: this.state.services.length,
        publishedServices: this.state.services.filter((s) => s.isPublished).length,
        totalResources: this.state.resources.length,
        operationalResources: this.state.resources.filter((r) => r.status === 'operational').length,
      },
      recentAppointments: this.state.bookings.slice(0, 5).map((b) => ({
        id: b.id,
        bookingReference: b.bookingReference,
        serviceId: b.serviceId,
        resourceId: b.resourceId || 'res_default',
        serviceName: b.serviceName,
        resourceName: b.resourceName,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        totalAmount: b.totalPrice,
        currency: b.priceCurrency,
      })),
      recentUsers: this.state.users.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        phone: u.phone,
        isActive: u.isActive,
        isVerified: u.isVerified,
        avatarUrl: u.avatarUrl,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    };
  }

  public getAdminUsers(): AdminUserItem[] {
    return this.state.users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      phone: u.phone,
      isActive: u.isActive,
      isVerified: u.isVerified,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      servicesCount: this.state.services.filter((s) => s.organiserId === u.id).length,
      resourcesCount: this.state.resources.filter((r) => r.organiserId === u.id).length,
      bookingsCount: this.state.bookings.filter((b) => b.customerId === u.id).length,
    }));
  }

  public updateAdminUserRole(userId: string, newRole: 'CUSTOMER' | 'ORGANISER' | 'ADMIN'): AdminUserItem {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    user.role = newRole;
    user.updatedAt = new Date().toISOString();
    this.saveState();
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      isVerified: user.isVerified,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public getAuditLogs(): AuditLogItem[] {
    return [...this.state.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addAuditLog(userId: string, userEmail: string, action: string, entityType: string, entityId: string, details: string) {
    const log: AuditLogItem = {
      id: `aud_${Date.now()}`,
      userId,
      userEmail,
      action,
      entityType,
      entityId,
      details,
      ipAddress: '127.0.0.1 (Cookie DB)',
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    if (this.state.auditLogs.length > 50) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 50);
    }
    this.saveState();
  }

  public getAnalyticsOverview(timeFilter = '30d'): AnalyticsOverviewResult {
    const totalAppointments = this.state.bookings.length;
    const confirmed = this.state.bookings.filter((b) => b.status === 'confirmed').length;
    const completed = this.state.bookings.filter((b) => b.status === 'completed').length;
    const pending = this.state.bookings.filter((b) => b.status === 'pending').length;
    const cancelled = this.state.bookings.filter((b) => b.status === 'cancelled').length;
    const activeAppointments = confirmed + pending;

    const cancellationRate = totalAppointments > 0 ? (cancelled / totalAppointments) * 100 : 0;

    return {
      summary: {
        totalAppointments,
        activeAppointments,
        confirmedAppointments: confirmed,
        pendingAppointments: pending,
        completedAppointments: completed,
        cancelledAppointments: cancelled,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        totalBookedHours: totalAppointments * 1.5,
        avgDurationMinutes: 75,
        fleetUtilizationRate: 78.4,
        peakHourLabel: '02:00 PM',
      },
      trend: [
        { timestamp: '2026-09-01', label: 'Sep 1', total: 4, active: 3, confirmed: 3, completed: 1, cancelled: 0, pending: 0 },
        { timestamp: '2026-09-08', label: 'Sep 8', total: 7, active: 5, confirmed: 4, completed: 2, cancelled: 1, pending: 1 },
        { timestamp: '2026-09-15', label: 'Sep 15', total: 11, active: 8, confirmed: 6, completed: 3, cancelled: 1, pending: 2 },
        { timestamp: '2026-09-22', label: 'Sep 22', total: 15, active: 11, confirmed: 9, completed: 4, cancelled: 2, pending: 2 },
        { timestamp: '2026-09-29', label: 'Sep 29', total: totalAppointments, active: activeAppointments, confirmed, completed, cancelled, pending },
      ],
      statusBreakdown: [
        { status: 'confirmed', label: 'Confirmed', count: confirmed, percentage: Math.round((confirmed / (totalAppointments || 1)) * 100) },
        { status: 'completed', label: 'Completed', count: completed, percentage: Math.round((completed / (totalAppointments || 1)) * 100) },
        { status: 'pending', label: 'Pending Review', count: pending, percentage: Math.round((pending / (totalAppointments || 1)) * 100) },
        { status: 'cancelled', label: 'Cancelled', count: cancelled, percentage: Math.round((cancelled / (totalAppointments || 1)) * 100) },
      ],
      peakHours: {
        hourlyDistribution: [
          { hour: 9, label: '09:00 AM', bookingCount: 4, percentage: 15 },
          { hour: 11, label: '11:00 AM', bookingCount: 6, percentage: 22 },
          { hour: 14, label: '02:00 PM', bookingCount: 9, percentage: 33 },
          { hour: 16, label: '04:00 PM', bookingCount: 5, percentage: 18 },
        ],
        peakHour: 14,
        peakHourLabel: '02:00 PM',
        peakCount: 9,
        busiestWindow: '02:00 PM - 04:00 PM',
      },
      providerUtilization: [
        {
          providerId: 'usr_org_001',
          providerName: 'Jordan Vance',
          providerType: 'Workspace Lead',
          totalAppointments: 12,
          activeAppointments: 8,
          cancelledAppointments: 1,
          bookedMinutes: 1080,
          availableMinutes: 2400,
          utilizationRate: 82.5,
          avgDurationMinutes: 90,
        },
        {
          providerId: 'usr_org_002',
          providerName: 'Dr. Aris Thorne',
          providerType: 'Compute Director',
          totalAppointments: 8,
          activeAppointments: 5,
          cancelledAppointments: 1,
          bookedMinutes: 960,
          availableMinutes: 2400,
          utilizationRate: 74.0,
          avgDurationMinutes: 120,
        },
      ],
      meta: {
        timeFilter,
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        scopedOrganiserId: null,
      },
    };
  }
}

// Export singleton database instance
export const cookieDb = new CookieDatabase();
