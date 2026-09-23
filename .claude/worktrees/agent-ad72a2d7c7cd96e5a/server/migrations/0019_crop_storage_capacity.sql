-- =============================================================================
-- 0019: crop storage capacity
--
-- Officer registration asks for the crops an applicant handles at their
-- centre, but had nowhere to record how much of each the centre can store.
-- The dashboard's crop-wise storage table therefore had no real capacity to
-- show and fell back to hardcoded prototype numbers.
--
-- storage_capacity_kg lives on centre_crop_configurations (not a new table):
-- it is a property of "this centre handles this crop this season", the same
-- row that already carries who configured it and when.
-- =============================================================================

BEGIN;

ALTER TABLE centre_crop_configurations
    ADD COLUMN IF NOT EXISTS storage_capacity_kg numeric(14,3);

ALTER TABLE centre_crop_configurations
    ADD CONSTRAINT centre_crop_configurations_storage_capacity_nonnegative
        CHECK (storage_capacity_kg IS NULL OR storage_capacity_kg >= 0);

INSERT INTO schema_migrations (version, name)
VALUES ('0019', 'crop_storage_capacity');

COMMIT;
