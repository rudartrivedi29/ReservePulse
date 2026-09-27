-- ReservePulse Service & Appointment Management Enhancements
-- Migration: 004_service_management
-- Created: 2026-09-25

-- 1. Add fields for manual confirmation, resource assignment mode, payment setting, and unpublished share tokens
ALTER TABLE services ADD COLUMN IF NOT EXISTS requires_manual_confirmation BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS resource_assignment_mode VARCHAR(50) DEFAULT 'automatic' NOT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS payment_setting VARCHAR(50) DEFAULT 'free' NOT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE;

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_services_share_token ON services(share_token);
CREATE INDEX IF NOT EXISTS idx_services_payment_setting ON services(payment_setting);
