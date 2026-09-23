-- =============================================================================
-- 0021: officer-reported available storage
--
-- The dashboard's "Available Space" column (0019) is computed purely from
-- COMPLETED bookings against the recorded capacity — accurate for what the
-- app itself has procured, but blind to anything that moves grain outside
-- the app (private lifting, spoilage, an FCI pickup). This adds a SEPARATE,
-- officer-reported figure the officer confirms periodically, so the
-- dashboard can show both: what the app computed, and what the officer last
-- physically confirmed. NULL until the officer has reported at least once —
-- that absence is what the dashboard badge/reminder watches for.
-- =============================================================================

BEGIN;

ALTER TABLE centre_crop_configurations
    ADD COLUMN IF NOT EXISTS officer_reported_available_kg numeric(14,3);

ALTER TABLE centre_crop_configurations
    ADD COLUMN IF NOT EXISTS officer_reported_at timestamptz;

ALTER TABLE centre_crop_configurations
    ADD COLUMN IF NOT EXISTS officer_reported_by_user_id uuid REFERENCES users(id);

ALTER TABLE centre_crop_configurations
    ADD CONSTRAINT centre_crop_configurations_reported_available_nonnegative
        CHECK (officer_reported_available_kg IS NULL OR officer_reported_available_kg >= 0);

INSERT INTO schema_migrations (version, name)
VALUES ('0021', 'officer_reported_storage');

COMMIT;
