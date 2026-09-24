-- =============================================================================
-- FarmQueue — 0023_configured_state_codes
--
-- WHY THIS MIGRATION EXISTS
--   0003 declared states.lgd_code NOT NULL, and 0012 deliberately left it that
--   way: at the time the only state in the system was Uttar Pradesh, whose LGD
--   code (9) was read directly from the official LGD portal, so no configured
--   state was needed.
--
--   Extending the demonstration geography past Uttar Pradesh breaks that
--   assumption. The LGD bulk download is still CAPTCHA-protected and the
--   data.gov.in API still requires a registered key; neither has been
--   circumvented, so the LGD codes for the remaining states have not been
--   retrieved. The old schema offered two ways out and both are forbidden:
--   write down state codes from memory as though they had been sourced, or
--   relax integrity across the board.
--
--   This migration takes the third option, which 0012 already established for
--   districts: record the absence honestly. A CONFIGURED state has no LGD code
--   — not "an unknown one" — and the column now permits that.
--
-- THIS IS NOT A WEAKENING.
--   For OFFICIAL rows the requirement is unchanged: an OFFICIAL state still
--   cannot exist without an LGD code. The NOT NULL becomes a conditional CHECK
--   enforcing exactly the same rule where it applies, mirroring
--   districts_official_requires_lgd_code from 0012 and the
--   data_type <> 'OFFICIAL' OR source_id IS NOT NULL pattern used on every
--   provenanced table.
--
--   Uttar Pradesh is untouched. It remains OFFICIAL and keeps lgd_code '9'.
-- =============================================================================

BEGIN;

ALTER TABLE states
    ALTER COLUMN lgd_code DROP NOT NULL;

ALTER TABLE states
    ADD CONSTRAINT states_official_requires_lgd_code
    CHECK (data_type <> 'OFFICIAL' OR lgd_code IS NOT NULL);

COMMENT ON COLUMN states.lgd_code IS
    'Local Government Directory state code. Mandatory for OFFICIAL rows '
    '(states_official_requires_lgd_code). NULL for CONFIGURED states, whose '
    'LGD codes were not retrievable and are recorded as absent rather than '
    'reconstructed from memory.';

-- The existing UNIQUE (lgd_code) still applies. In PostgreSQL a NULL never
-- equals another NULL, so many CONFIGURED states may each carry a NULL code
-- without colliding, while two OFFICIAL states still cannot share one.
--
-- Configured states need their own uniqueness, on name, so repeated runs of a
-- geography import cannot accumulate duplicate states.
CREATE UNIQUE INDEX states_name_unique
    ON states (lower(btrim(name)));

INSERT INTO schema_migrations (version, name) VALUES ('0023', 'configured_state_codes');

COMMIT;
