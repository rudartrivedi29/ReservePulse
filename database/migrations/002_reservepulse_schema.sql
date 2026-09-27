-- ReservePulse Core Reservation & Resource Schema Migration
-- Migration: 002_reservepulse_schema
-- Created: 2026-09-25

-- ============================================================================
-- 1. Enhance Users Table (Idempotent Alterations)
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Index on user role & status for rapid authorization filters
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================================================
-- 2. Services Table
-- Defines bookable services, appointment capacity type, duration and pricing
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(36) PRIMARY KEY,
    organiser_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general' NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    buffer_before_minutes INT DEFAULT 0 NOT NULL CHECK (buffer_before_minutes >= 0),
    buffer_after_minutes INT DEFAULT 0 NOT NULL CHECK (buffer_after_minutes >= 0),
    price_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (price_amount >= 0),
    price_currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    capacity_type VARCHAR(50) DEFAULT 'individual' NOT NULL 
        CHECK (capacity_type IN ('individual', 'group', 'resource_constrained')),
    default_capacity INT DEFAULT 1 NOT NULL CHECK (default_capacity > 0),
    max_advance_booking_days INT DEFAULT 30 NOT NULL CHECK (max_advance_booking_days > 0),
    min_lead_time_hours INT DEFAULT 1 NOT NULL CHECK (min_lead_time_hours >= 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_services_organiser_slug UNIQUE (organiser_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_services_organiser ON services(organiser_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);

-- ============================================================================
-- 3. Resources Table
-- Physical suites, compute clusters, consultation pods, equipment & personnel
-- ============================================================================
CREATE TABLE IF NOT EXISTS resources (
    id VARCHAR(36) PRIMARY KEY,
    organiser_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    capacity INT DEFAULT 1 NOT NULL CHECK (capacity > 0),
    status VARCHAR(50) DEFAULT 'operational' NOT NULL 
        CHECK (status IN ('operational', 'maintenance', 'decommissioned')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resources_organiser ON resources(organiser_id);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_resources_status ON resources(status);

-- ============================================================================
-- 4. Service Resources (Many-to-Many Mapping)
-- Links bookable services to the physical or computational resources required
-- ============================================================================
CREATE TABLE IF NOT EXISTS service_resources (
    id VARCHAR(36) PRIMARY KEY,
    service_id VARCHAR(36) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    resource_id VARCHAR(36) NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT true NOT NULL,
    allocation_quantity INT DEFAULT 1 NOT NULL CHECK (allocation_quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_service_resources UNIQUE (service_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_service_resources_service ON service_resources(service_id);
CREATE INDEX IF NOT EXISTS idx_service_resources_resource ON service_resources(resource_id);

-- ============================================================================
-- 5. Working Hours Table
-- Recurring weekly schedule rules for providers (organisers) and resources
-- ============================================================================
CREATE TABLE IF NOT EXISTS working_hours (
    id VARCHAR(36) PRIMARY KEY,
    organiser_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    resource_id VARCHAR(36) REFERENCES resources(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_working_hours_owner CHECK (organiser_id IS NOT NULL OR resource_id IS NOT NULL),
    CONSTRAINT chk_working_hours_time CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_working_hours_organiser ON working_hours(organiser_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_working_hours_resource ON working_hours(resource_id, day_of_week);

-- ============================================================================
-- 6. Slots Table
-- Granular timeslots with capacity limits and distributed concurrency lock fields
-- ============================================================================
CREATE TABLE IF NOT EXISTS slots (
    id VARCHAR(36) PRIMARY KEY,
    service_id VARCHAR(36) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    resource_id VARCHAR(36) REFERENCES resources(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_capacity INT DEFAULT 1 NOT NULL CHECK (max_capacity > 0),
    current_capacity INT DEFAULT 0 NOT NULL CHECK (current_capacity >= 0 AND current_capacity <= max_capacity),
    status VARCHAR(50) DEFAULT 'available' NOT NULL 
        CHECK (status IN ('available', 'locked', 'booked', 'cancelled', 'unavailable')),
    lock_token VARCHAR(255),
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_slot_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_slots_service_start ON slots(service_id, start_time);
CREATE INDEX IF NOT EXISTS idx_slots_resource_start ON slots(resource_id, start_time);
CREATE INDEX IF NOT EXISTS idx_slots_status ON slots(status);
CREATE INDEX IF NOT EXISTS idx_slots_lock_query ON slots(lock_token, locked_until);
CREATE INDEX IF NOT EXISTS idx_slots_time_range ON slots(start_time, end_time);

-- ============================================================================
-- 7. Questions Table
-- Custom service intake form fields collected during checkout
-- ============================================================================
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(36) PRIMARY KEY,
    service_id VARCHAR(36) NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text' NOT NULL 
        CHECK (question_type IN ('text', 'textarea', 'select', 'checkbox', 'number')),
    options JSONB DEFAULT '[]'::jsonb,
    is_required BOOLEAN DEFAULT false NOT NULL,
    order_index INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_questions_service_order ON questions(service_id, order_index);

-- ============================================================================
-- 8. Bookings Table
-- Central reservation contracts linking customers, slots, resources and pricing
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    booking_reference VARCHAR(50) UNIQUE NOT NULL,
    service_id VARCHAR(36) NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    slot_id VARCHAR(36) REFERENCES slots(id) ON DELETE SET NULL,
    customer_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    resource_id VARCHAR(36) REFERENCES resources(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendee_count INT DEFAULT 1 NOT NULL CHECK (attendee_count > 0),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    payment_status VARCHAR(50) DEFAULT 'unpaid' NOT NULL 
        CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'partially_refunded', 'failed')),
    total_price NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (total_price >= 0),
    price_currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    guest_name VARCHAR(255),
    guest_email VARCHAR(255),
    guest_phone VARCHAR(50),
    notes TEXT,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancelled_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_booking_time_range CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_service ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_start_end ON bookings(start_time, end_time);

-- ============================================================================
-- 9. Booking Answers Table
-- Customer responses to service intake questions
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_answers (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    question_id VARCHAR(36) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_booking_answers UNIQUE (booking_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_answers_booking ON booking_answers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_answers_question ON booking_answers(question_id);

-- ============================================================================
-- 10. Payments Table
-- Financial ledger tracking transactions, payment methods, and refund audits
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'credit_card' NOT NULL,
    transaction_reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    refund_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (refund_amount >= 0),
    gateway_response JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- ============================================================================
-- 11. Automatic Updated At Trigger Function
-- Ensures updated_at timestamps are automatically maintained on modification
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    -- Apply trigger to tables with updated_at if not already attached
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_services_updated_at') THEN
        CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_resources_updated_at') THEN
        CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_working_hours_updated_at') THEN
        CREATE TRIGGER trg_working_hours_updated_at BEFORE UPDATE ON working_hours FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_slots_updated_at') THEN
        CREATE TRIGGER trg_slots_updated_at BEFORE UPDATE ON slots FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_questions_updated_at') THEN
        CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bookings_updated_at') THEN
        CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_updated_at') THEN
        CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;
