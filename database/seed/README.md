# Database Seeding

This directory contains baseline and mock datasets for local development and test environments.

## Files
- `seed.sql`: Baseline system seeds, default admin users, and foundational audit rows.

## Usage
To execute against a local PostgreSQL database:
```bash
psql -U postgres -d reservepulse_dev -f database/seed/seed.sql
```
Or via future database CLI tooling / ORM scripts configured in `package.json`.
