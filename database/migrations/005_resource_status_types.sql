-- ============================================================================
-- 005_resource_status_types.sql
-- Extend resources status check constraint to support active/inactive alongside operational/maintenance/decommissioned
-- ============================================================================

DO $$
BEGIN
    -- Drop existing check constraint if present
    ALTER TABLE resources DROP CONSTRAINT IF EXISTS resources_status_check;
    
    -- Re-create check constraint supporting active, inactive, operational, maintenance, decommissioned
    ALTER TABLE resources ADD CONSTRAINT resources_status_check 
        CHECK (status IN ('active', 'inactive', 'operational', 'maintenance', 'decommissioned'));
        
    -- Set default to 'active'
    ALTER TABLE resources ALTER COLUMN status SET DEFAULT 'active';
END $$;
