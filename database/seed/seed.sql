-- ReservePulse Comprehensive Development Seed Script
-- Populates foundation users, multiple providers/organisers, resources, services,
-- working hours, slots with concurrency locks, intake questions, bookings, answers and payments.
-- Idempotent: Uses ON CONFLICT DO NOTHING for safe repeated execution.

-- ============================================================================
-- 1. Seed Users (Admins, Organisers/Providers, and Customers)
-- ============================================================================
INSERT INTO users (id, email, full_name, role, phone, timezone, status, created_at, updated_at)
VALUES 
    -- Admin
    ('usr_admin_001', 'admin@reservepulse.platform', 'Morgan Reed', 'admin', '+1-555-0100', 'UTC', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Organisers / Service Providers
    ('usr_org_001', 'jordan.vance@reservepulse.local', 'Jordan Vance', 'organiser', '+1-555-0101', 'America/New_York', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('usr_org_002', 'aris.thorne@reservepulse.local', 'Dr. Aris Thorne', 'organiser', '+1-555-0102', 'America/Los_Angeles', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Customers
    ('usr_cust_001', 'alex.morgan@clientcorp.com', 'Alex Morgan', 'customer', '+1-555-0201', 'America/New_York', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('usr_cust_002', 'sarah.jenkins@biotech.org', 'Sarah Jenkins', 'customer', '+1-555-0202', 'America/Chicago', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('usr_cust_003', 'elena.rostova@ai-lab.io', 'Elena Rostova', 'customer', '+1-555-0203', 'Europe/London', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone;

-- ============================================================================
-- 2. Seed Resources
-- Diverse fleet of physical workspaces, GPU compute nodes, and consultation pods
-- ============================================================================
INSERT INTO resources (id, organiser_id, name, resource_type, description, location, capacity, status, created_at, updated_at)
VALUES
    ('res_boardroom_alpha', 'usr_org_001', 'Executive Boardroom Alpha', 'room', 'Soundproof executive suite with dual 85" 4K displays and Logitech Rally telepresence.', 'Building A, Floor 4, Suite 401', 16, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res_boardroom_beta', 'usr_org_001', 'Team Strategy Boardroom Beta', 'room', 'Modular conference suite with interactive digital whiteboards.', 'Building A, Floor 3, Suite 305', 10, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res_pod_01', 'usr_org_001', 'Private Advisory Pod 1', 'pod', 'Acoustically isolated pod tailored for confidential 1-on-1 consultations.', 'Atrium East Wing, Ground Floor', 2, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res_pod_02', 'usr_org_001', 'Private Advisory Pod 2', 'pod', 'Compact sound-dampened booth for private video conferencing and interviews.', 'Atrium West Wing, Ground Floor', 2, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res_gpu_h100_01', 'usr_org_002', 'GPU Cluster Node 01 (8x H100)', 'compute', 'Dedicated node with 8x NVIDIA H100 80GB SXM5 interconnected via NVLink.', 'Ashburn Data Center Rack 12', 8, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res_gpu_h100_02', 'usr_org_002', 'GPU Cluster Node 02 (8x H100)', 'compute', 'Secondary distributed training cluster node for high-concurrency model fine-tuning.', 'Ashburn Data Center Rack 14', 8, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('res_studio_01', 'usr_org_001', 'Creative Audio & Video Lab', 'studio', 'Multi-camera broadcast studio with Blackmagic ATEM switcher and Shure SM7B microphones.', 'Media Center, Sub-Level 1', 4, 'operational', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. Seed Services
-- Bookable service products across multiple domains and providers
-- ============================================================================
INSERT INTO services (id, organiser_id, name, slug, description, category, duration_minutes, buffer_before_minutes, buffer_after_minutes, price_amount, price_currency, is_active, capacity_type, default_capacity, max_advance_booking_days, min_lead_time_hours, created_at, updated_at)
VALUES
    (
        'srv_boardroom_exec',
        'usr_org_001',
        'Executive Boardroom Session',
        'executive-boardroom-session',
        'Full access to Executive Boardroom Alpha with telepresence, presentation support, and beverage setup.',
        'workspace',
        90,
        15,
        15,
        180.00,
        'USD',
        true,
        'individual',
        16,
        30,
        2,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'srv_gpu_training',
        'usr_org_002',
        'GPU Cloud Training Node Slice',
        'gpu-cloud-training-node-slice',
        'Dedicated reservation of 8x H100 GPU compute slice with pre-configured PyTorch and CUDA 12 environment.',
        'compute',
        180,
        10,
        10,
        73.50,
        'USD',
        true,
        'individual',
        1,
        60,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'srv_consultation_private',
        'usr_org_001',
        'Confidential Advisory Consultation',
        'confidential-advisory-consultation',
        'One-on-one session in Private Advisory Pod 1 with high-definition audio/video privacy.',
        'consultation',
        60,
        10,
        10,
        45.00,
        'USD',
        true,
        'individual',
        2,
        14,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'srv_studio_recording',
        'usr_org_001',
        'Broadcast Studio Media Recording',
        'broadcast-studio-media-recording',
        'Professional recording studio access with multi-track audio capture and 4K cinema cameras.',
        'hardware',
        180,
        30,
        30,
        540.00,
        'USD',
        true,
        'group',
        4,
        30,
        4,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. Seed Service Resources (Many-to-Many Bindings)
-- ============================================================================
INSERT INTO service_resources (id, service_id, resource_id, is_required, allocation_quantity, created_at)
VALUES
    ('sr_001', 'srv_boardroom_exec', 'res_boardroom_alpha', true, 1, CURRENT_TIMESTAMP),
    ('sr_002', 'srv_gpu_training', 'res_gpu_h100_01', true, 1, CURRENT_TIMESTAMP),
    ('sr_003', 'srv_consultation_private', 'res_pod_01', true, 1, CURRENT_TIMESTAMP),
    ('sr_004', 'srv_studio_recording', 'res_studio_01', true, 1, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. Seed Working Hours
-- Operating hours (Monday - Friday 08:00 - 18:00, Saturday 10:00 - 16:00)
-- ============================================================================
INSERT INTO working_hours (id, organiser_id, resource_id, day_of_week, start_time, end_time, is_available, created_at, updated_at)
VALUES
    -- Jordan Vance (Campus Ops) Mon-Fri
    ('wh_001', 'usr_org_001', NULL, 1, '08:00:00', '18:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_002', 'usr_org_001', NULL, 2, '08:00:00', '18:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_003', 'usr_org_001', NULL, 3, '08:00:00', '18:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_004', 'usr_org_001', NULL, 4, '08:00:00', '18:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_005', 'usr_org_001', NULL, 5, '08:00:00', '18:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Dr. Aris Thorne (HPC) 24/7 Mon-Sat
    ('wh_006', 'usr_org_002', NULL, 1, '00:00:00', '23:59:59', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_007', 'usr_org_002', NULL, 2, '00:00:00', '23:59:59', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_008', 'usr_org_002', NULL, 3, '00:00:00', '23:59:59', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_009', 'usr_org_002', NULL, 4, '00:00:00', '23:59:59', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('wh_010', 'usr_org_002', NULL, 5, '00:00:00', '23:59:59', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

    -- Boardroom Alpha Specific Saturday Window
    ('wh_011', NULL, 'res_boardroom_alpha', 6, '10:00:00', '16:00:00', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. Seed Slots
-- Concrete time intervals with appointment capacities & concurrency lock tokens
-- ============================================================================
INSERT INTO slots (id, service_id, resource_id, start_time, end_time, max_capacity, current_capacity, status, lock_token, locked_until, created_at, updated_at)
VALUES
    -- Boardroom Slots
    (
        'slt_001',
        'srv_boardroom_exec',
        'res_boardroom_alpha',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hours',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '10 hours 30 minutes',
        16,
        1,
        'booked',
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'slt_002',
        'srv_boardroom_exec',
        'res_boardroom_alpha',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '11 hours',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '12 hours 30 minutes',
        16,
        0,
        'available',
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'slt_003',
        'srv_boardroom_exec',
        'res_boardroom_alpha',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '14 hours',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '15 hours 30 minutes',
        16,
        1,
        'locked',
        'lck_token_temp_9921',
        CURRENT_TIMESTAMP + INTERVAL '5 minutes',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),

    -- GPU Compute Slots
    (
        'slt_004',
        'srv_gpu_training',
        'res_gpu_h100_01',
        CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '13 hours',
        CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '16 hours',
        1,
        1,
        'booked',
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'slt_005',
        'srv_gpu_training',
        'res_gpu_h100_01',
        CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '17 hours',
        CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '20 hours',
        1,
        0,
        'available',
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),

    -- Consultation Pod Slots
    (
        'slt_006',
        'srv_consultation_private',
        'res_pod_01',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '10 hours',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '11 hours',
        2,
        0,
        'available',
        NULL,
        NULL,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. Seed Intake Questions
-- ============================================================================
INSERT INTO questions (id, service_id, question_text, question_type, options, is_required, order_index, created_at, updated_at)
VALUES
    (
        'qst_001',
        'srv_boardroom_exec',
        'What is the meeting agenda or presentation title?',
        'text',
        '[]'::jsonb,
        true,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'qst_002',
        'srv_boardroom_exec',
        'Required display and telepresence setup',
        'select',
        '["Dual 4K Presentation Mode", "Zoom / Teams Hybrid Conference", "Audio Recording Only"]'::jsonb,
        false,
        2,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'qst_003',
        'srv_gpu_training',
        'Base Docker container or PyTorch runtime tag',
        'text',
        '[]'::jsonb,
        true,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'qst_004',
        'srv_consultation_private',
        'Brief topic description for advisory preparation',
        'textarea',
        '[]'::jsonb,
        false,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. Seed Bookings
-- Demonstrating confirmed, in-progress, pending, and cancelled states
-- ============================================================================
INSERT INTO bookings (id, booking_reference, service_id, slot_id, customer_id, resource_id, start_time, end_time, attendee_count, status, payment_status, total_price, price_currency, guest_name, guest_email, guest_phone, notes, created_at, updated_at)
VALUES
    (
        'bk_001',
        'BK-20260925-001',
        'srv_boardroom_exec',
        'slt_001',
        'usr_cust_001',
        'res_boardroom_alpha',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '9 hours',
        CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '10 hours 30 minutes',
        8,
        'confirmed',
        'paid',
        180.00,
        'USD',
        'Alex Morgan',
        'alex.morgan@clientcorp.com',
        '+1-555-0201',
        'Executive Q3 Strategy Session with remote stakeholders.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'bk_002',
        'BK-20260925-002',
        'srv_gpu_training',
        'slt_004',
        'usr_cust_003',
        'res_gpu_h100_01',
        CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '13 hours',
        CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '16 hours',
        1,
        'confirmed',
        'paid',
        73.50,
        'USD',
        'Elena Rostova',
        'elena.rostova@ai-lab.io',
        '+1-555-0203',
        'Vision-Language Model checkpoint fine-tuning evaluation batch.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'bk_003',
        'BK-20260925-003',
        'srv_consultation_private',
        'slt_006',
        'usr_cust_002',
        'res_pod_01',
        CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '10 hours',
        CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '11 hours',
        1,
        'pending',
        'pending',
        45.00,
        'USD',
        'Sarah Jenkins',
        'sarah.jenkins@biotech.org',
        '+1-555-0202',
        'Regulatory compliance consultation intake.',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'bk_004',
        'BK-20260924-004',
        'srv_studio_recording',
        NULL,
        'usr_cust_001',
        'res_studio_01',
        CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '14 hours',
        CURRENT_TIMESTAMP - INTERVAL '1 day' + INTERVAL '17 hours',
        4,
        'cancelled',
        'refunded',
        540.00,
        'USD',
        'Alex Morgan',
        'alex.morgan@clientcorp.com',
        '+1-555-0201',
        'Rescheduled to subsequent quarter due to talent availability.',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    )
ON CONFLICT (booking_reference) DO NOTHING;

-- ============================================================================
-- 9. Seed Booking Answers
-- Customer responses linked to specific bookings and intake questions
-- ============================================================================
INSERT INTO booking_answers (id, booking_id, question_id, answer_text, created_at)
VALUES
    ('bka_001', 'bk_001', 'qst_001', 'Enterprise Infrastructure Scalability Roadmap for Q4', CURRENT_TIMESTAMP),
    ('bka_002', 'bk_001', 'qst_002', 'Dual 4K Presentation Mode', CURRENT_TIMESTAMP),
    ('bka_003', 'bk_002', 'qst_003', 'pytorch/pytorch:2.4.0-cuda12.4-cudnn9-runtime', CURRENT_TIMESTAMP),
    ('bka_004', 'bk_003', 'qst_004', 'FDA Phase II Clinical Data Governance compliance audit', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. Seed Payments
-- Transaction ledger entries audit trail
-- ============================================================================
INSERT INTO payments (id, booking_id, amount, currency, payment_method, transaction_reference, status, refund_amount, gateway_response, paid_at, created_at, updated_at)
VALUES
    (
        'pmt_001',
        'bk_001',
        180.00,
        'USD',
        'stripe',
        'ch_3OqF422eZvKYlo2C17hXpA1B',
        'completed',
        0.00,
        '{"status": "succeeded", "network": "visa", "last4": "4242"}'::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'pmt_002',
        'bk_002',
        73.50,
        'USD',
        'stripe',
        'ch_3OqG192eZvKYlo2C08kJrM9Y',
        'completed',
        0.00,
        '{"status": "succeeded", "network": "mastercard", "last4": "8899"}'::jsonb,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'pmt_003',
        'bk_004',
        540.00,
        'USD',
        'stripe',
        'ch_3OqD882eZvKYlo2C01jKpN2Z',
        'refunded',
        540.00,
        '{"status": "refunded", "refund_reason": "requested_by_customer"}'::jsonb,
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '2 days',
        CURRENT_TIMESTAMP - INTERVAL '1 day'
    )
ON CONFLICT (id) DO NOTHING;
