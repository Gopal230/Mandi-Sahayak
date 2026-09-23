/**
 * Authentication flows.
 *
 * Every state change here runs inside one transaction together with its audit
 * row (P-9). Roles are assigned by the server from the flow that created the
 * account — a farmer registration can only ever produce the FARMER role, so no
 * request payload can escalate privilege.
 */
import type { PoolClient } from "pg";
import { getConfig } from "../../core/config.ts";
import { sha256 } from "../../core/crypto.ts";
import {
  AppError,
  ErrorCodes,
  conflict,
  unprocessable,
  unauthenticated,
} from "../../core/errors.ts";
import { withTransaction } from "../../core/db.ts";
import { writeAudit, AuditActions } from "../../core/audit.ts";
import { createSession, revokeSession } from "../../core/session.ts";
import type { CreatedSession } from "../../core/session.ts";
import { issueChallenge, verifyChallenge } from "./otp.service.ts";
import type { ChallengeRow, ChallengeView } from "./otp.service.ts";
import type { RegisterStartInput, StaffRegisterInput } from "./auth.schemas.ts";
import { findKnownDistrict } from "../../data/allDistricts.ts";

export type RequestCtx = {
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
};

// ---------------------------------------------------------------------------
// Farmer registration
// ---------------------------------------------------------------------------

export async function startRegistration(
  client: PoolClient,
  input: RegisterStartInput,
  ctx: RequestCtx,
): Promise<ChallengeView> {
  const cfg = getConfig();

  const existing = await client.query(
    "SELECT id FROM users WHERE phone_e164 = $1",
    [input.phone],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    /*
     * DISCLOSED TRADE-OFF.
     * This reveals that a phone is registered, which is an enumeration oracle.
     * It is accepted here because registration needs a usable "you already have
     * an account" path, and the endpoint is rate-limited to 3 per phone per 15
     * minutes and 10 per IP per hour. LOGIN, which is the more sensitive
     * surface, is fully enumeration-resistant (see startFarmerLogin).
     */
    await writeAudit(client, {
      action: AuditActions.REGISTRATION_STARTED,
      entityType: "registration",
      actorRole: "SYSTEM",
      actorIp: ctx.ip,
      requestId: ctx.requestId,
      metadata: { outcome: "DUPLICATE_PHONE", phone: input.phone },
    });
    throw conflict(
      ErrorCodes.PHONE_ALREADY_REGISTERED,
      "Phone already registered",
    );
  }

  let district = await client.query(
    "SELECT id, state_id FROM districts WHERE id = $1",
    [input.districtId],
  );

  if (district.rowCount === 0) {
    const known = findKnownDistrict(input.districtId);
    if (known) {
      let stateRow = await client.query(
        "SELECT id FROM states WHERE lower(name) = lower($1)",
        [known.state],
      );
      if (stateRow.rowCount === 0) {
        const fallback = await client.query(
          "SELECT id FROM states ORDER BY created_at LIMIT 1",
        );
        stateRow = fallback;
      }
      if (stateRow.rowCount && stateRow.rowCount > 0) {
        const stateId = stateRow.rows[0].id;
        await client.query(
          `INSERT INTO districts (id, state_id, name, data_type)
           VALUES ($1, $2, $3, 'CONFIGURED')
           ON CONFLICT DO NOTHING`,
          [known.id, stateId, known.name],
        );
        district = await client.query(
          "SELECT id, state_id FROM districts WHERE id = $1 OR (state_id = $2 AND lower(btrim(name)) = lower(btrim($3)))",
          [known.id, stateId, known.name],
        );
      }
    }
  }

  if (district.rowCount === 0) {
    throw unprocessable(ErrorCodes.DISTRICT_NOT_FOUND, "District not found");
  }

  const resolvedDistrictId = district.rows[0].id;

  if (input.villageId) {
    const village = await client.query(
      "SELECT id FROM villages WHERE id = $1 AND district_id = $2",
      [input.villageId, resolvedDistrictId],
    );
    if (village.rowCount === 0) {
      throw unprocessable(
        ErrorCodes.VILLAGE_NOT_IN_DISTRICT,
        "Village is not in that district",
      );
    }
  }

  // No users/farmers row exists until the phone is verified: an unverified
  // person creates no identity.
  const pending = await client.query<{ id: string }>(
    `INSERT INTO pending_registrations
       (phone_e164, full_name, district_id, village_id, locale,
        consent_policy_version, consent_text_hash, expires_at, created_ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      input.phone,
      input.fullName,
      resolvedDistrictId,
      input.villageId ?? null,
      input.locale,
      input.consent.policyVersion,
      sha256(`${input.consent.policyVersion}:accepted`),
      new Date(Date.now() + cfg.PENDING_REGISTRATION_TTL_SECONDS * 1000),
      ctx.ip,
    ],
  );

  const { view } = await issueChallenge(client, {
    purpose: "FARMER_REGISTER",
    phone: input.phone,
    pendingRegistrationId: pending.rows[0].id,
    ip: ctx.ip,
  });

  await writeAudit(client, {
    action: AuditActions.REGISTRATION_STARTED,
    entityType: "pending_registration",
    entityId: pending.rows[0].id,
    actorRole: "SYSTEM",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
    metadata: { outcome: "OTP_ISSUED", districtId: input.districtId },
  });

  return view;
}

// ---------------------------------------------------------------------------
// Farmer login
// ---------------------------------------------------------------------------

/**
 * ENUMERATION-RESISTANT.
 *
 * An unknown phone still gets a challenge row and an identical response; the
 * difference is only that no OTP is delivered, and verification can therefore
 * never succeed. Response shape, status and timing are the same either way.
 */
export async function startFarmerLogin(
  client: PoolClient,
  phone: string,
  ctx: RequestCtx,
): Promise<ChallengeView> {
  const user = await client.query<{ id: string; status: string }>(
    `SELECT u.id, u.status FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id AND r.code = 'FARMER'
     WHERE u.phone_e164 = $1`,
    [phone],
  );

  const row = user.rows[0];
  const deliverable = Boolean(row) && row.status === "ACTIVE";

  const { view } = await issueChallenge(client, {
    purpose: "FARMER_LOGIN",
    phone,
    userId: row?.id ?? null,
    ip: ctx.ip,
    decoy: !deliverable,
  });

  await writeAudit(client, {
    action: AuditActions.LOGIN_OTP_REQUESTED,
    entityType: "user",
    entityId: row?.id ?? null,
    actorRole: "SYSTEM",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
    metadata: { delivered: deliverable, phone },
  });

  return view;
}

// ---------------------------------------------------------------------------
// Officer self-registration
// ---------------------------------------------------------------------------

export type RegistrationRequestSubmitted = {
  requestId: string;
  status: 'PENDING';
};

/**
 * Records an officer account APPLICATION. Creates no account.
 *
 * THE BUG THIS REPLACES: this function used to insert directly into `users`,
 * `officers`, `user_roles` and `officer_centre_assignments` — so anyone who
 * could reach this public, unauthenticated endpoint left it as a live OFFICER
 * at whichever centre they picked from the dropdown, verified by nothing but
 * an OTP to a phone they own. That is not an authorization check; it is a
 * self-service privilege grant. Migration 0017 built
 * `officer_registration_requests` specifically so this could not happen, and
 * this function now uses it: a submission here creates one PENDING row and
 * nothing else. No user, no role, no centre assignment, no centre
 * configuration write. An administrator with `officer.create` is the only
 * path from a request to an account (admin.routes.ts, POST
 * /admin/officer-registration-requests/:id/approve).
 */
export async function submitOfficerRegistration(
  client: PoolClient,
  input: StaffRegisterInput,
  ctx: RequestCtx,
): Promise<RegistrationRequestSubmitted> {
  // The centre must exist, be active, and actually sit in the district the
  // applicant named. Trusting the pair would let a mismatched request through
  // and leave an administrator to spot it by eye.
  const centre = await client.query<{
    id: string;
    district_id: string;
    status: string;
  }>(`SELECT id, district_id, status FROM procurement_centres WHERE id = $1`, [
    input.centreId,
  ]);

  const row = centre.rows[0];

  if (!row || row.status !== "ACTIVE") {
    throw unprocessable(
      ErrorCodes.CENTRE_NOT_AVAILABLE,
      "That centre is not available.",
    );
  }

  if (row.district_id !== input.districtId) {
    throw unprocessable(
      ErrorCodes.CENTRE_NOT_IN_DISTRICT,
      "That centre is not in the selected district.",
    );
  }

  const activeCrops = await client.query<{ id: string }>(
    `SELECT id FROM crops WHERE id = ANY($1::uuid[]) AND is_active = true`,
    [input.cropIds],
  );

  const activeCropIds = new Set(activeCrops.rows.map((row) => row.id));
  const invalidCropIds = input.cropIds.filter((id) => !activeCropIds.has(id));

  if (invalidCropIds.length > 0) {
    throw unprocessable(
      ErrorCodes.CROP_ID_INVALID,
      "One or more selected crops are not valid active crops.",
    );
  }

  // A phone already holding a live account cannot apply again — sign in
  // instead. A phone with a request already PENDING is blocked by the partial
  // unique index (officer_registration_requests_one_pending_phone); that
  // constraint violation is caught below and turned into the same
  // user-facing conflict, so the two "already in flight" cases read alike.
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM users WHERE phone_e164 = $1`,
    [input.phone],
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw conflict(
      ErrorCodes.PHONE_ALREADY_REGISTERED,
      "Phone already registered.",
    );
  }

  // SAVEPOINT, not a bare try/query: a unique_violation aborts the enclosing
  // transaction in Postgres. Without rolling back to a savepoint first, the
  // writeAudit call below would run against an already-aborted transaction
  // and fail with "current transaction is aborted", masking the real
  // (perfectly ordinary) conflict behind a 500.
  let requestId: string;
  await client.query("SAVEPOINT staff_register_insert");
  try {
    const request = await client.query<{ id: string }>(
      `INSERT INTO officer_registration_requests
         (full_name, phone_e164, requested_centre_id, requested_district_id,
          requested_crop_ids, crop_storage_quintals)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        input.fullName,
        input.phone,
        input.centreId,
        input.districtId,
        input.cropIds,
        JSON.stringify(input.cropStorageQuintals),
      ],
    );
    requestId = request.rows[0].id;
  } catch (error) {
    await client.query("ROLLBACK TO SAVEPOINT staff_register_insert");

    // Postgres unique_violation. A second application for a phone that
    // already has one PENDING is a conflict, not a validation failure — the
    // applicant needs to know an application already exists, not that this
    // one was malformed.
    if ((error as { code?: string }).code === "23505") {
      throw conflict(
        ErrorCodes.PHONE_ALREADY_REGISTERED,
        "An application for this phone number is already pending review.",
      );
    }
    throw error;
  }

  // NOTHING ELSE HAPPENS HERE. No user, no officer, no role, no centre
  // assignment, no centre_crop_configurations write, and — because there is
  // no account yet to verify — no OTP challenge. `startStaffLogin` reads
  // `users` by phone; a pending request has no row there and so cannot sign
  // in, which is the whole point.
  await writeAudit(client, {
    action: AuditActions.OFFICER_REGISTRATION_REQUESTED,
    entityType: "officer_registration_request",
    entityId: requestId,
    actorRole: "SYSTEM",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
    metadata: {
      requestedCentreId: input.centreId,
      cropIds: input.cropIds,
      approvalRequired: true,
    },
  });

  return { requestId, status: "PENDING" };
}

// ---------------------------------------------------------------------------
// Staff login: mobile OTP
// ---------------------------------------------------------------------------

export async function startStaffLogin(
  client: PoolClient,
  phone: string,
  ctx: RequestCtx,
): Promise<ChallengeView> {
  const res = await client.query<{
    id: string;
    phone_e164: string | null;
    status: string;
    roles: string[] | null;
  }>(
    `SELECT u.id, u.phone_e164, u.status,
            (SELECT array_agg(r.code) FROM user_roles ur JOIN roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id) AS roles
       FROM users u WHERE u.phone_e164 = $1`,
    [phone],
  );

  const user = res.rows[0];
  const roles = user?.roles ?? [];
  const isStaff = roles.includes("OFFICER") || roles.includes("ADMIN");

  if (!user || !isStaff || user.status !== "ACTIVE" || !user.phone_e164) {
    await writeAudit(client, {
      action: AuditActions.STAFF_LOGIN_REJECTED,
      entityType: "user",
      entityId: user?.id ?? null,
      actorRole: "SYSTEM",
      actorIp: ctx.ip,
      requestId: ctx.requestId,
      metadata: {
        phone,
        reason: !user
          ? "NO_SUCH_USER"
          : !isStaff
            ? "NOT_STAFF"
            : user.status !== "ACTIVE"
              ? "INACTIVE"
              : "NO_PHONE_FOR_2FA",
      },
    });
    throw unauthenticated(
      ErrorCodes.INVALID_CREDENTIALS,
      "Invalid credentials",
    );
  }

  await writeAudit(client, {
    action: AuditActions.STAFF_LOGIN_ACCEPTED,
    entityType: "user",
    entityId: user.id,
    actorUserId: user.id,
    actorRole: roles.includes("ADMIN") ? "ADMIN" : "OFFICER",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
    metadata: { phone, secondFactor: "OTP" },
  });

  const { view } = await issueChallenge(client, {
    purpose: "STAFF_2FA",
    phone: user.phone_e164,
    userId: user.id,
    ip: ctx.ip,
  });

  return view;
}

// ---------------------------------------------------------------------------
// OTP verification -> session
// ---------------------------------------------------------------------------

export type VerifyResult = {
  session: CreatedSession;
  userId: string;
  roles: string[];
};

/**
 * TWO TRANSACTIONS, DELIBERATELY.
 *
 * The first commits the verification bookkeeping — the attempt increment, the
 * EXPIRED/FAILED status transition, the consumption of a valid challenge, and
 * the audit row. The second creates the identity and the session.
 *
 * They cannot share a transaction. A failed OTP must THROW, and a throw rolls
 * the transaction back — which would undo the very attempt counter that the
 * five-attempt limit depends on. With one transaction an attacker gets
 * unlimited OTP guesses, because every wrong guess erases its own evidence.
 * (The same reasoning is why rate limiting runs on its own connection.)
 *
 * The trade-off is that a challenge can be consumed without a session being
 * created, if the second transaction fails. That direction is fail-closed: the
 * farmer requests a new OTP. The reverse — a session without a consumed
 * challenge — would be a replay hole.
 */
export async function verifyOtpAndCreateSession(
  challengeId: string,
  otp: string,
  ctx: RequestCtx,
): Promise<VerifyResult> {
  const outcome = await withTransaction(async (client) => {
    const result = await verifyChallenge(client, challengeId, otp);
    if (!result.ok) {
      await writeAudit(client, {
        action:
          result.reason === "EXHAUSTED"
            ? AuditActions.OTP_ATTEMPTS_EXHAUSTED
            : AuditActions.OTP_FAILED,
        entityType: "otp_challenge",
        entityId: challengeId,
        actorRole: "SYSTEM",
        actorIp: ctx.ip,
        requestId: ctx.requestId,
        metadata: { reason: result.reason },
      });
    }
    return result;
  });

  if (!outcome.ok) {
    // One opaque code for every failure mode.
    throw new AppError(
      400,
      ErrorCodes.OTP_INVALID,
      "OTP invalid, expired or already used",
    );
  }

  return withTransaction((client) => completeLogin(client, outcome.row, ctx));
}

async function completeLogin(
  client: PoolClient,
  row: ChallengeRow,
  ctx: RequestCtx,
): Promise<VerifyResult> {
  let userId: string;

  if (row.purpose === "FARMER_REGISTER") {
    userId = await completeRegistration(
      client,
      row.pending_registration_id,
      ctx,
    );
  } else {
    if (!row.user_id) {
      // A decoy login challenge that somehow verified. Cannot happen — a decoy's
      // OTP is never delivered — but failing closed is the only safe response.
      throw new AppError(400, ErrorCodes.OTP_INVALID, "OTP invalid");
    }
    userId = row.user_id;
  }

  const roleRes = await client.query<{ code: string }>(
    `SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [userId],
  );
  const roles = roleRes.rows.map((r) => r.code);
  const isStaff = roles.includes("OFFICER") || roles.includes("ADMIN");

  const session = await createSession(
    client,
    userId,
    isStaff,
    ctx.ip,
    ctx.userAgent,
  );

  await client.query("UPDATE users SET last_login_at = now() WHERE id = $1", [
    userId,
  ]);

  await writeAudit(client, {
    action: AuditActions.LOGIN_SUCCEEDED,
    entityType: "session",
    entityId: session.sessionId,
    actorUserId: userId,
    actorRole: roles.includes("ADMIN")
      ? "ADMIN"
      : roles.includes("OFFICER")
        ? "OFFICER"
        : "FARMER",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
    metadata: { purpose: row.purpose, roles },
  });

  return { session, userId, roles };
}

/**
 * Creates the identity. Runs inside the verification transaction, so a farmer,
 * their FARMER role, their consent record and their session all commit together
 * or not at all.
 */
async function completeRegistration(
  client: PoolClient,
  pendingId: string | null,
  ctx: RequestCtx,
): Promise<string> {
  if (!pendingId)
    throw new AppError(400, ErrorCodes.OTP_INVALID, "OTP invalid");

  const res = await client.query<{
    id: string;
    phone_e164: string;
    full_name: string;
    district_id: string | null;
    village_id: string | null;
    locale: string;
    consent_policy_version: string;
    consent_text_hash: Buffer;
    expires_at: Date;
    created_ip: string | null;
  }>("SELECT * FROM pending_registrations WHERE id = $1 FOR UPDATE", [
    pendingId,
  ]);

  const pending = res.rows[0];
  if (!pending || pending.expires_at <= new Date()) {
    throw new AppError(400, ErrorCodes.OTP_INVALID, "Registration expired");
  }

  // Re-check uniqueness inside the transaction: someone may have registered the
  // same number between start and verify.
  const dup = await client.query("SELECT id FROM users WHERE phone_e164 = $1", [
    pending.phone_e164,
  ]);
  if (dup.rowCount && dup.rowCount > 0) {
    throw conflict(
      ErrorCodes.PHONE_ALREADY_REGISTERED,
      "Phone already registered",
    );
  }

  const user = await client.query<{ id: string }>(
    `INSERT INTO users (full_name, phone_e164, locale, phone_verified_at)
     VALUES ($1,$2,$3, now()) RETURNING id`,
    [pending.full_name, pending.phone_e164, pending.locale],
  );
  const userId = user.rows[0].id;

  // Role is assigned by the SERVER from the flow, never from the request.
  await client.query(
    `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE code = 'FARMER'`,
    [userId],
  );

  await client.query(
    `INSERT INTO farmers (user_id, district_id, village_id) VALUES ($1,$2,$3)`,
    [userId, pending.district_id, pending.village_id],
  );

  await client.query(
    `INSERT INTO consents (user_id, purpose, policy_version, policy_text_hash, granted_ip)
     VALUES ($1,'SERVICE_USE',$2,$3,$4), ($1,'SMS_NOTIFICATIONS',$2,$3,$4)`,
    [
      userId,
      pending.consent_policy_version,
      pending.consent_text_hash,
      pending.created_ip,
    ],
  );

  await client.query("DELETE FROM pending_registrations WHERE id = $1", [
    pendingId,
  ]);

  await writeAudit(client, {
    action: AuditActions.REGISTRATION_COMPLETED,
    entityType: "user",
    entityId: userId,
    actorUserId: userId,
    actorRole: "FARMER",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
    metadata: { consentVersion: pending.consent_policy_version },
  });

  return userId;
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

export async function logout(
  client: PoolClient,
  sessionId: string,
  userId: string,
  roles: string[],
  ctx: RequestCtx,
): Promise<void> {
  await revokeSession(client, sessionId, "LOGOUT");
  await writeAudit(client, {
    action: AuditActions.LOGOUT,
    entityType: "session",
    entityId: sessionId,
    actorUserId: userId,
    actorRole: roles.includes("ADMIN")
      ? "ADMIN"
      : roles.includes("OFFICER")
        ? "OFFICER"
        : "FARMER",
    actorIp: ctx.ip,
    requestId: ctx.requestId,
  });
}
