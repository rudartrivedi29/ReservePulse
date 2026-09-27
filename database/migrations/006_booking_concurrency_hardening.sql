-- ============================================================================
-- ReservePulse Booking Concurrency Hardening & Capacity Constraints
-- Migration: 006_booking_concurrency_hardening
-- Created: 2026-09-25
-- ============================================================================

-- 1. Index on active bookings by resource and time window for fast row-locking & overlap checks
CREATE INDEX IF NOT EXISTS idx_bookings_concurrency_range
ON bookings (resource_id, start_time, end_time)
WHERE status IN ('pending', 'confirmed', 'in_progress');

-- 2. Index on slots by service, resource, and time range for FOR UPDATE row locking
CREATE INDEX IF NOT EXISTS idx_slots_concurrency_lookup
ON slots (service_id, resource_id, start_time, end_time);

-- 3. Database Trigger Function to prevent double bookings and capacity overruns
-- Validates that overlapping active bookings for the resource never exceed maximum capacity
CREATE OR REPLACE FUNCTION check_booking_capacity_overrun()
RETURNS TRIGGER AS $$
DECLARE
    v_max_capacity INT;
    v_booked_capacity INT;
    v_buffer_before INT;
    v_buffer_after INT;
    v_footprint_start TIMESTAMP WITH TIME ZONE;
    v_footprint_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only check active reservation contracts
    IF NEW.status NOT IN ('pending', 'confirmed', 'in_progress') THEN
        RETURN NEW;
    END IF;

    -- If no resource assigned, allow
    IF NEW.resource_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Fetch service capacity and buffers
    SELECT default_capacity, buffer_before_minutes, buffer_after_minutes
    INTO v_max_capacity, v_buffer_before, v_buffer_after
    FROM services
    WHERE id = NEW.service_id;

    IF v_max_capacity IS NULL THEN
        v_max_capacity := 1;
    END IF;

    v_footprint_start := NEW.start_time - (COALESCE(v_buffer_before, 0) || ' minutes')::INTERVAL;
    v_footprint_end := NEW.end_time + (COALESCE(v_buffer_after, 0) || ' minutes')::INTERVAL;

    -- Calculate current active booked capacity overlapping this window
    SELECT COALESCE(SUM(attendee_count), 0)
    INTO v_booked_capacity
    FROM bookings
    WHERE resource_id = NEW.resource_id
      AND id != COALESCE(NEW.id, '')
      AND status IN ('pending', 'confirmed', 'in_progress')
      AND end_time > v_footprint_start
      AND start_time < v_footprint_end;

    -- Check capacity constraint
    IF (v_booked_capacity + NEW.attendee_count) > v_max_capacity THEN
        RAISE EXCEPTION 'CAPACITY_OVERRUN: The selected time slot is no longer available. Another customer just reserved this slot.'
            USING ERRCODE = '23P01'; -- exclusion_violation
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger before insert or update on bookings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_booking_capacity') THEN
        CREATE TRIGGER trg_check_booking_capacity
        BEFORE INSERT OR UPDATE OF start_time, end_time, attendee_count, status, resource_id
        ON bookings
        FOR EACH ROW
        EXECUTE FUNCTION check_booking_capacity_overrun();
    END IF;
END $$;
