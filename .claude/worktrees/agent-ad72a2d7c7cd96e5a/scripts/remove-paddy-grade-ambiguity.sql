-- Removes the grade requirement for Paddy pricing and repairs the two
-- bookings ("meeeee" and "Zainab Khan") that got stuck BLOCKED because of it.
--
-- Paddy currently has two ACTIVE MSP rates per (season, marketing_year) --
-- "Common" and "Grade A" -- so the pricing engine cannot pick one without a
-- recorded grade (see server/src/engines/procurement.ts#resolveMspRate). The
-- app's quality-check screen no longer asks for a grade at all, so as long as
-- two ACTIVE rates exist for the same crop/season/year, every future Paddy
-- payment will block the same way. This keeps ONE active rate ("Common")
-- and supersedes the other, then re-prices the two already-blocked payments.
--
-- Run against PRODUCTION. Take a backup/snapshot first. Review each SELECT
-- before running the UPDATE that follows it.

BEGIN;

-- 1. Show every (crop, season, marketing_year) with more than one ACTIVE
--    Paddy rate -- confirm this matches what you expect before continuing.
SELECT r.id, r.crop_id, r.season_id, r.marketing_year, r.variety_or_grade,
       r.rate_per_quintal_paise
  FROM msp_rates r
  JOIN crops c ON c.id = r.crop_id
 WHERE c.canonical_name ILIKE 'paddy'
   AND r.status = 'ACTIVE'
 ORDER BY r.season_id, r.marketing_year, r.variety_or_grade NULLS FIRST;

-- 2. Supersede every ACTIVE Paddy rate EXCEPT "Common", per (season,
--    marketing_year). Adjust the ILIKE pattern first if the kept grade
--    should be something other than "Common".
WITH paddy_active AS (
  SELECT r.id
    FROM msp_rates r
    JOIN crops c ON c.id = r.crop_id
   WHERE c.canonical_name ILIKE 'paddy'
     AND r.status = 'ACTIVE'
     AND (r.variety_or_grade IS NULL OR r.variety_or_grade NOT ILIKE 'common')
)
UPDATE msp_rates
   SET status = 'SUPERSEDED',
       updated_at = now()
 WHERE id IN (SELECT id FROM paddy_active);

-- 3. Re-price the two bookings that were BLOCKED by the ambiguity, now that
--    exactly one ACTIVE Paddy rate remains per (season, marketing_year).
WITH targets AS (
  SELECT b.id AS booking_id, pr.id AS procurement_id, pay.id AS payment_id,
         pr.accepted_quantity_kg, b.crop_id, b.season_id, b.marketing_year
    FROM bookings b
    JOIN users u ON u.id = b.farmer_id
    JOIN procurements pr ON pr.booking_id = b.id
    JOIN payments pay ON pay.procurement_id = pr.id
   WHERE b.status = 'PAYMENT_PENDING'
     AND pay.status = 'BLOCKED'
     AND (u.full_name = 'meeeee' OR u.full_name ILIKE '%zainab khan%')
),
rate AS (
  SELECT t.payment_id, r.id AS rate_id, r.rate_per_quintal_paise
    FROM targets t
    JOIN msp_rates r
      ON r.crop_id = t.crop_id
     AND r.season_id = t.season_id
     AND r.marketing_year = t.marketing_year
     AND r.status = 'ACTIVE'
)
UPDATE payments pay
   SET msp_rate_id = rate.rate_id,
       rate_per_quintal_paise_snapshot = rate.rate_per_quintal_paise,
       base_amount_paise = ROUND(t.accepted_quantity_kg / 100.0 * rate.rate_per_quintal_paise)::bigint,
       amount_paise = GREATEST(
         ROUND(t.accepted_quantity_kg / 100.0 * rate.rate_per_quintal_paise)::bigint - pay.deductions_paise,
         0),
       status = 'PENDING',
       blocked_reason = NULL,
       updated_at = now()
  FROM targets t, rate
 WHERE pay.id = t.payment_id
   AND rate.payment_id = t.payment_id;

-- 4. Verify before committing: exactly one ACTIVE Paddy rate per
--    season/marketing_year, and both payments PENDING with a real amount.
SELECT r.season_id, r.marketing_year, count(*) AS active_rates
  FROM msp_rates r
  JOIN crops c ON c.id = r.crop_id
 WHERE c.canonical_name ILIKE 'paddy'
   AND r.status = 'ACTIVE'
 GROUP BY r.season_id, r.marketing_year;
-- ^ every row here should show active_rates = 1.

SELECT u.full_name, pay.status, pay.blocked_reason, pay.amount_paise
  FROM payments pay
  JOIN procurements pr ON pr.id = pay.procurement_id
  JOIN bookings b ON b.id = pr.booking_id
  JOIN users u ON u.id = b.farmer_id
 WHERE u.full_name = 'meeeee' OR u.full_name ILIKE '%zainab khan%';

-- If both look right (status PENDING, blocked_reason NULL, non-zero
-- amount_paise), run: COMMIT;
-- Otherwise: ROLLBACK;
