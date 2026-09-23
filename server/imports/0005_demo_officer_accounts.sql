-- =============================================================================
-- FarmQueue — Phase X: seeded demonstration officer accounts
--
-- WHY THIS FILE EXISTS
--   The SIH prototype needs officers a judge can sign in as without an
--   administrator provisioning one live during the demo. These four accounts
--   are created the same way an administrator's `officer.create` would create
--   one — a real `users` row, a real `officers` row, the `OFFICER` role, one
--   live centre assignment — so the officer portal exercises its real code
--   paths, not a mocked one. `officers.is_demo = true` marks them as seeded,
--   never as a source of authorization.
--
--   Phone numbers are an obviously synthetic 9999900NNN block: valid against
--   the Indian-mobile format the app validates, but not a number a real
--   person could be assigned by a telecom operator. Each is unique to one
--   demonstration centre so `officer.centreIds` scoping (0005_centres.sql,
--   `officer_centre_assignments`) is exercised exactly as it would be for a
--   real officer, one centre per account, not a shared login for all four.
--
--   No password is set: staff sign-in here is phone + OTP, identical to a
--   farmer's, so `password_hash` stays NULL as it does for every officer
--   created without one.
--
-- CENTRES
--   These reference the fixed ids from 0002_up_demonstration_geography.sql.
--   Run that import first; this one is a no-op (ON CONFLICT DO NOTHING) if
--   run again, and does nothing if the centre it targets is missing.
-- =============================================================================

BEGIN;

CREATE TEMP TABLE _demo_officers (
    phone_e164     text,
    full_name      text,
    employee_code  text,
    centre_id      uuid
) ON COMMIT DROP;

INSERT INTO _demo_officers (phone_e164, full_name, employee_code, centre_id) VALUES
    ('+919999900001', 'Aligarh Demonstration Officer',     'OFF-ALI-001', '55555555-0000-4000-a000-000000000001'),
    ('+919999900002', 'Mathura Demonstration Officer',     'OFF-MAT-001', '55555555-0000-4000-a000-000000000004'),
    ('+919999900003', 'Hathras Demonstration Officer',     'OFF-HAT-001', '55555555-0000-4000-a000-000000000003'),
    ('+919999900004', 'Bulandshahr Demonstration Officer', 'OFF-BUL-001', '55555555-0000-4000-a000-000000000005');

INSERT INTO users (full_name, phone_e164, phone_verified_at, status)
SELECT d.full_name, d.phone_e164, now(), 'ACTIVE'
FROM _demo_officers d
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.phone_e164 = d.phone_e164)
ON CONFLICT (phone_e164) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM _demo_officers d
JOIN users u ON u.phone_e164 = d.phone_e164
JOIN roles r ON r.code = 'OFFICER'
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
);

INSERT INTO officers (user_id, employee_code, designation, is_demo)
SELECT u.id, d.employee_code, 'Demonstration Officer', true
FROM _demo_officers d
JOIN users u ON u.phone_e164 = d.phone_e164
WHERE NOT EXISTS (SELECT 1 FROM officers o WHERE o.user_id = u.id)
ON CONFLICT (employee_code) DO NOTHING;

INSERT INTO officer_centre_assignments (officer_id, centre_id)
SELECT o.id, d.centre_id
FROM _demo_officers d
JOIN users u ON u.phone_e164 = d.phone_e164
JOIN officers o ON o.user_id = u.id
WHERE d.centre_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM officer_centre_assignments a
     WHERE a.officer_id = o.id AND a.centre_id = d.centre_id AND a.revoked_at IS NULL
  );

COMMIT;
