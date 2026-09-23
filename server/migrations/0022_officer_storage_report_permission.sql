-- =============================================================================
-- 0022: officer storage-report permission
--
-- 0011 deliberately withheld every storage.* permission from OFFICER — the
-- boundary comment at the end of that migration says so explicitly, and it
-- was correct at the time: officers had no storage write of any kind.
--
-- 0021 gave officers something narrower than admin's storage.configure: only
-- confirming the currently-available figure for a crop their own centre
-- already handles, never creating storage facilities or setting capacity.
-- That narrower action gets its own permission rather than reusing
-- storage.configure, so the boundary 0011 documented stays true for the
-- capability it was actually protecting (capacity/facility configuration),
-- and this migration is what visibly widens OFFICER, not a silent grant of
-- the admin permission.
-- =============================================================================

BEGIN;

INSERT INTO permissions (code, description)
VALUES (
    'storage.report_available',
    'Report the currently-available storage for one crop at the officer''s own assigned centre.'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'storage.report_available'
WHERE r.code = 'OFFICER'
ON CONFLICT DO NOTHING;

INSERT INTO schema_migrations (version, name)
VALUES ('0022', 'officer_storage_report_permission');

COMMIT;
