-- =============================================================================
-- FarmQueue — 0020_officer_registration_pending_and_demo
--
-- WHY THIS MIGRATION EXISTS
--   0017 built `officer_registration_requests` so a self-registration could
--   never create a live account. `submitOfficerRegistration` did not use it —
--   it inserted straight into `users`, `officers`, `user_roles` and
--   `officer_centre_assignments`, so any visitor who could reach the public
--   registration form left it as an active OFFICER, at whichever centre they
--   picked from the dropdown. That is the bug this migration and its paired
--   service change close.
--
-- WHAT CHANGES HERE
--   1. `officer_registration_requests` gains the columns the real registration
--      form actually collects (district, crops, per-crop storage), because
--      0017 was shaped for a password-based application this project never
--      built. `username`, `employee_code` and `password_hash` are made
--      nullable to match: staff sign-in here is phone + OTP, the same as a
--      farmer's, so nothing chooses a username or password at request time.
--
--   2. `officers.is_demo` marks the handful of seeded demonstration accounts
--      (see server/imports for the seed) so they can be told apart from real
--      officers an administrator provisions later — for support tooling and
--      for the fixed demo OTP, never for authorization.
--
-- FORWARD-ONLY.
-- =============================================================================

BEGIN;

ALTER TABLE officer_registration_requests
    ALTER COLUMN username      DROP NOT NULL,
    ALTER COLUMN employee_code DROP NOT NULL,
    ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE officer_registration_requests
    DROP CONSTRAINT officer_registration_requests_username_format;

ALTER TABLE officer_registration_requests
    ADD CONSTRAINT officer_registration_requests_username_format
        CHECK (username IS NULL OR username ~ '^[a-z0-9._-]{3,64}$');

ALTER TABLE officer_registration_requests
    ADD COLUMN requested_district_id    uuid REFERENCES districts (id) ON DELETE RESTRICT,
    ADD COLUMN requested_crop_ids       uuid[],
    ADD COLUMN crop_storage_quintals    jsonb;

COMMENT ON COLUMN officer_registration_requests.requested_district_id IS
    'The district named alongside the requested centre. Recorded so an '
    'administrator reviewing the request does not have to look the centre up.';

COMMENT ON COLUMN officer_registration_requests.requested_crop_ids IS
    'Crops the applicant says they handle. Applied to the centre only on '
    'approval, never before — a pending request configures nothing.';

COMMENT ON COLUMN officer_registration_requests.crop_storage_quintals IS
    'Per-crop storage capacity (quintals) the applicant declared, keyed by '
    'crop id as text. Carried over to centre_crop_configurations on approval.';

ALTER TABLE officers
    ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN officers.is_demo IS
    'True only for the seeded SIH demonstration officers. Never set by any '
    'application code path — it identifies demo data for support tooling and '
    'the fixed demo OTP, and carries no authorization meaning of its own.';

INSERT INTO schema_migrations (version, name)
VALUES ('0020', 'officer_registration_pending_and_demo');

COMMIT;
