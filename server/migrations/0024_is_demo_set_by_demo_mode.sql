-- =============================================================================
-- FarmQueue — 0024_is_demo_set_by_demo_mode
--
-- WHY THIS MIGRATION EXISTS
--   0020 added officers.is_demo and commented it:
--
--       'True only for the seeded SIH demonstration officers. Never set by any
--        application code path — it identifies demo data for support tooling
--        and the fixed demo OTP, and carries no authorization meaning of its
--        own.'
--
--   The middle clause stopped being true. Officer self-registration now
--   activates itself when the server runs with DEMO_MODE, and marks the
--   account it creates is_demo = true (auth.service.ts,
--   submitOfficerRegistration). A column comment that contradicts the code is
--   worse than no comment, because the next reader trusts it.
--
--   Nothing about the column's meaning or its lack of authorization weight
--   changes. Only the claim about who writes it.
--
-- NO DATA CHANGES. Comment only.
-- =============================================================================

BEGIN;

COMMENT ON COLUMN officers.is_demo IS
    'True for the seeded SIH demonstration officers, and for accounts that '
    'officer self-registration activated itself while the server ran with '
    'DEMO_MODE. Identifies demo data for support tooling and the fixed demo '
    'OTP. Carries no authorization meaning of its own: nothing grants or '
    'refuses a permission by reading it.';

INSERT INTO schema_migrations (version, name) VALUES ('0024', 'is_demo_set_by_demo_mode');

COMMIT;
