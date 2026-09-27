-- ReservePulse Payment-Ready Flow & Booking States Migration
-- Migration: 007_payment_ready_flow
-- Created: 2026-09-25

-- 1. Update bookings status check constraint to support 'payment-failed' and 'payment_failed'
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN (
        'pending',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'payment-failed',
        'payment_failed'
    ));

-- 2. Ensure payments table has optimal indexes and constraints
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_reference);

-- 3. Add comment for ledger auditability
COMMENT ON TABLE payments IS 'Financial transactions ledger for advance and terminal booking payments';
