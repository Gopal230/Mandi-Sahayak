-- One-off recovery for the "meeeee" / Paddy / 2026-09-22 booking whose
-- payment was BLOCKED with MSP_AMBIGUOUS because the quality check recorded
-- no grade (bug fixed in WeighmentPage.jsx — this script repairs the one
-- booking that went through before the fix).
--
-- Run against PRODUCTION. Take a backup/snapshot first. Review the SELECT
-- output before running the UPDATE section.

BEGIN;

-- 1. Locate the booking/procurement/payment.
WITH target AS (
  SELECT b.id AS booking_id, pr.id AS procurement_id, pay.id AS payment_id,
         pr.accepted_quantity_kg, b.crop_id, b.season_id, b.marketing_year
    FROM bookings b
    JOIN users u ON u.id = b.farmer_id
    JOIN procurements pr ON pr.booking_id = b.id
    JOIN payments pay ON pay.procurement_id = pr.id
   WHERE u.full_name ILIKE '%meeeee%'
     AND b.service_date = '2026-09-22'
     AND b.status = 'PAYMENT_PENDING'
     AND pay.status = 'BLOCKED'
)
SELECT * FROM target;
-- ^ Confirm this returns EXACTLY ONE row before continuing. If it returns
-- zero or more than one, stop and narrow the WHERE clause (e.g. add the
-- booking_code once you have it from the row above).

-- 2. Record the grade that was actually determined at the centre.
UPDATE procurements pr
   SET grade = 'Common',
       updated_at = now()
  FROM bookings b, users u
 WHERE pr.booking_id = b.id
   AND u.id = b.farmer_id
   AND u.full_name ILIKE '%meeeee%'
   AND b.service_date = '2026-09-22'
   AND b.status = 'PAYMENT_PENDING';

-- 3. Resolve the matching ACTIVE MSP rate for "Common" and re-price the
--    payment the same way officer.repository.ts#insertResolvedPayment does,
--    then move it out of BLOCKED.
WITH target AS (
  SELECT b.id AS booking_id, pr.id AS procurement_id, pay.id AS payment_id,
         pr.accepted_quantity_kg, b.crop_id, b.season_id, b.marketing_year
    FROM bookings b
    JOIN users u ON u.id = b.farmer_id
    JOIN procurements pr ON pr.booking_id = b.id
    JOIN payments pay ON pay.procurement_id = pr.id
   WHERE u.full_name ILIKE '%meeeee%'
     AND b.service_date = '2026-09-22'
     AND b.status = 'PAYMENT_PENDING'
),
rate AS (
  SELECT r.id, r.rate_per_quintal_paise
    FROM msp_rates r, target t
   WHERE r.crop_id = t.crop_id
     AND r.season_id = t.season_id
     AND r.marketing_year = t.marketing_year
     AND r.status = 'ACTIVE'
     AND r.variety_or_grade ILIKE 'Common'
)
UPDATE payments pay
   SET msp_rate_id = rate.id,
       rate_per_quintal_paise_snapshot = rate.rate_per_quintal_paise,
       base_amount_paise = ROUND(target.accepted_quantity_kg / 100.0 * rate.rate_per_quintal_paise)::bigint,
       amount_paise = GREATEST(
         ROUND(target.accepted_quantity_kg / 100.0 * rate.rate_per_quintal_paise)::bigint - pay.deductions_paise,
         0),
       status = 'PENDING',
       blocked_reason = NULL,
       updated_at = now()
  FROM target, rate
 WHERE pay.id = target.payment_id;

-- 4. Verify before committing.
SELECT pay.id, pay.status, pay.blocked_reason, pay.amount_paise,
       pay.rate_per_quintal_paise_snapshot, pr.grade
  FROM payments pay
  JOIN procurements pr ON pr.id = pay.procurement_id
  JOIN bookings b ON b.id = pr.booking_id
  JOIN users u ON u.id = b.farmer_id
 WHERE u.full_name ILIKE '%meeeee%'
   AND b.service_date = '2026-09-22';

-- If it looks right (status PENDING, blocked_reason NULL, a non-zero
-- amount_paise), run: COMMIT;
-- Otherwise: ROLLBACK;
