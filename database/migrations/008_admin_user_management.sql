-- ReservePulse Admin Dashboard & User/Provider Governance Schema
-- Migration: 008_admin_user_management
-- Created: 2026-09-25

-- 1. Ensure is_active flag exists on users table (defaults to true)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true NOT NULL;

-- 2. Indexes for fast status and role administration
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
