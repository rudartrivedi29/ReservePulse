# Database Migrations

This directory contains versioned SQL migration scripts for ReservePulse.

## Directory Structure
- `001_initial_schema.sql` - Base schema tables for foundation (users, audit logs).
- `002_reservepulse_schema.sql` - Complete schema for users, services, resources, service_resources, working_hours, slots, questions, bookings, booking_answers, and payments.


## Guidelines
- All migrations must be idempotent where possible (`CREATE TABLE IF NOT EXISTS`, etc.).
- Never modify an already executed migration in production; create a new migration instead.
- Include corresponding rollback instructions or down-migrations when introducing complex state changes.
