import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);

// server/src/core/config.ts
import { z } from "zod";
var bool = z.string().optional().transform((v) => v === "true" || v === "1");
var int = (fallback) => z.string().optional().transform((v) => v === void 0 || v === "" ? fallback : Number(v)).refine((n) => Number.isInteger(n) && n > 0, "must be a positive integer");
var ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: int(3e3),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /**
   * Secrets. These are REQUIRED — there is deliberately no default, because a
   * default pepper is the same as no pepper.
   */
  OTP_PEPPER: z.string().min(16, "OTP_PEPPER must be at least 16 characters"),
  SESSION_PEPPER: z.string().min(16, "SESSION_PEPPER must be at least 16 characters"),
  CSRF_PEPPER: z.string().min(16, "CSRF_PEPPER must be at least 16 characters"),
  /**
   * OTP policy.
   *
   * FOUR digits, by product decision. The length is served to the client in
   * every challenge (`otpLength`), so the UI renders the right number of boxes
   * from this one value — it is never hardcoded on the client.
   *
   * SECURITY NOTE: four digits is a 10,000-value space against six digits'
   * 1,000,000. What bounds a guessing attack here is therefore NOT the length
   * but OTP_MAX_ATTEMPTS (5 per challenge), OTP_TTL_SECONDS (5 minutes),
   * OTP_MAX_RESENDS, and the per-phone / per-IP buckets in core/rateLimit.ts.
   * Those controls must not be relaxed while the OTP is this short.
   */
  OTP_LENGTH: int(4),
  OTP_TTL_SECONDS: int(300),
  OTP_MAX_ATTEMPTS: int(5),
  OTP_RESEND_COOLDOWN_SECONDS: int(60),
  OTP_MAX_RESENDS: int(3),
  /** Session lifetimes, in seconds. Staff sessions are deliberately shorter. */
  FARMER_SESSION_IDLE_SECONDS: int(12 * 60 * 60),
  FARMER_SESSION_ABSOLUTE_SECONDS: int(7 * 24 * 60 * 60),
  STAFF_SESSION_IDLE_SECONDS: int(30 * 60),
  STAFF_SESSION_ABSOLUTE_SECONDS: int(12 * 60 * 60),
  PENDING_REGISTRATION_TTL_SECONDS: int(15 * 60),
  /**
   * How soon the server tells a queue client to poll again (architecture §14.5:
   * "pollAfterSeconds is set by the server, so cadence is an operational
   * decision and is not hardcoded in the UI").
   *
   * CONFIGURED, not OFFICIAL. It is an operational tuning knob and changes no
   * computed value — only the hint returned to the client. The default of 5 is
   * architecture §14.4's stated default for QUEUE_CACHE_TTL_SECONDS, which the
   * same section ties the polling cadence to. The queue rate limits in
   * core/rateLimit.ts are derived from this number.
   */
  QUEUE_POLL_AFTER_SECONDS: int(5),
  /**
   * DEMO_MODE surfaces OTPs to the server log and a token-protected dev
   * endpoint. It NEVER puts an OTP in an authentication response body.
   */
  DEMO_MODE: bool,
  ALLOW_DEMO_IN_PRODUCTION: bool,
  DEV_TOOLS_TOKEN: z.string().optional(),
  /** Cookies must be Secure in production; over plain HTTP in dev they cannot be. */
  COOKIE_SECURE: z.string().optional().transform((v) => v === void 0 ? void 0 : v === "true")
});
var cached = null;
function loadConfig(env = process.env) {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:
${detail}`);
  }
  const c = parsed.data;
  const isProduction = c.NODE_ENV === "production";
  if (c.DEMO_MODE && isProduction && !c.ALLOW_DEMO_IN_PRODUCTION) {
    throw new Error(
      "DEMO_MODE is enabled with NODE_ENV=production. Refusing to start. Set ALLOW_DEMO_IN_PRODUCTION=true only if this is genuinely intended."
    );
  }
  if (c.DEMO_MODE && !c.DEV_TOOLS_TOKEN) {
    throw new Error("DEMO_MODE requires DEV_TOOLS_TOKEN to protect the dev OTP endpoint.");
  }
  const config = {
    ...c,
    isProduction,
    // __Host- cookies REQUIRE Secure, so in production this is forced on.
    cookieSecure: c.COOKIE_SECURE ?? isProduction
  };
  cached = config;
  return config;
}
function getConfig() {
  if (!cached) throw new Error("Configuration has not been loaded yet.");
  return cached;
}

// server/src/app.ts
import express from "express";

// server/src/core/errors.ts
var ErrorCodes = {
  // 400
  VALIDATION_FAILED: "VALIDATION_FAILED",
  MALFORMED_JSON: "MALFORMED_JSON",
  // 401
  UNAUTHENTICATED: "UNAUTHENTICATED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  SESSION_REVOKED: "SESSION_REVOKED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  // 403
  FORBIDDEN: "FORBIDDEN",
  CSRF_TOKEN_INVALID: "CSRF_TOKEN_INVALID",
  ACCOUNT_INACTIVE: "ACCOUNT_INACTIVE",
  // 404
  NOT_FOUND: "NOT_FOUND",
  // 409
  PHONE_ALREADY_REGISTERED: "PHONE_ALREADY_REGISTERED",
  // 410 / 422
  OTP_INVALID: "OTP_INVALID",
  OTP_CHALLENGE_NOT_FOUND: "OTP_CHALLENGE_NOT_FOUND",
  OTP_RESEND_COOLDOWN: "OTP_RESEND_COOLDOWN",
  OTP_RESEND_LIMIT_REACHED: "OTP_RESEND_LIMIT_REACHED",
  DISTRICT_NOT_FOUND: "DISTRICT_NOT_FOUND",
  VILLAGE_NOT_IN_DISTRICT: "VILLAGE_NOT_IN_DISTRICT",
  CROP_ID_INVALID: "CROP_ID_INVALID",
  // Booking (Phase 7)
  CENTRE_NOT_AVAILABLE: "CENTRE_NOT_AVAILABLE",
  CROP_NOT_CONFIGURED_AT_CENTRE: "CROP_NOT_CONFIGURED_AT_CENTRE",
  CENTRE_CLOSED_ON_DATE: "CENTRE_CLOSED_ON_DATE",
  OUTSIDE_BOOKING_HORIZON: "OUTSIDE_BOOKING_HORIZON",
  NO_AVAILABILITY: "NO_AVAILABILITY",
  SLOT_NO_LONGER_AVAILABLE: "SLOT_NO_LONGER_AVAILABLE",
  DUPLICATE_ACTIVE_BOOKING: "DUPLICATE_ACTIVE_BOOKING",
  FARMER_TIME_CONFLICT: "FARMER_TIME_CONFLICT",
  IDEMPOTENCY_KEY_REQUIRED: "IDEMPOTENCY_KEY_REQUIRED",
  IDEMPOTENCY_KEY_REUSED: "IDEMPOTENCY_KEY_REUSED",
  INVALID_STATE_TRANSITION: "INVALID_STATE_TRANSITION",
  CANCELLATION_WINDOW_CLOSED: "CANCELLATION_WINDOW_CLOSED",
  // Officer operations and payment (Phase 8)
  PROCUREMENT_NOT_STARTED: "PROCUREMENT_NOT_STARTED",
  WEIGHT_ALREADY_RECORDED: "WEIGHT_ALREADY_RECORDED",
  QUANTITY_EXCEEDS_GROSS: "QUANTITY_EXCEEDS_GROSS",
  REJECTION_REASON_REQUIRED: "REJECTION_REASON_REQUIRED",
  REJECTION_REASON_NOT_APPLICABLE: "REJECTION_REASON_NOT_APPLICABLE",
  PAYMENT_NOT_READY: "PAYMENT_NOT_READY",
  PAYMENT_BLOCKED: "PAYMENT_BLOCKED",
  PAYMENT_REFERENCE_REQUIRED: "PAYMENT_REFERENCE_REQUIRED",
  INVALID_PAYMENT_TRANSITION: "INVALID_PAYMENT_TRANSITION",
  // Admin configuration (Phase 13)
  CENTRE_CODE_TAKEN: "CENTRE_CODE_TAKEN",
  CENTRE_HAS_ACTIVE_BOOKINGS: "CENTRE_HAS_ACTIVE_BOOKINGS",
  LANE_HAS_ACTIVE_BOOKINGS: "LANE_HAS_ACTIVE_BOOKINGS",
  DATE_HAS_ACTIVE_BOOKINGS: "DATE_HAS_ACTIVE_BOOKINGS",
  OFFICER_INACTIVE: "OFFICER_INACTIVE",
  // Officer provisioning (Phase 14)
  USERNAME_TAKEN: "USERNAME_TAKEN",
  EMPLOYEE_CODE_TAKEN: "EMPLOYEE_CODE_TAKEN",
  // Officer self-registration
  REGISTRATION_REQUEST_PENDING: "REGISTRATION_REQUEST_PENDING",
  REGISTRATION_REQUEST_DECIDED: "REGISTRATION_REQUEST_DECIDED",
  CENTRE_NOT_IN_DISTRICT: "CENTRE_NOT_IN_DISTRICT",
  // 429
  RATE_LIMITED: "RATE_LIMITED",
  // 500 / 503
  INTERNAL_ERROR: "INTERNAL_ERROR"
};
var AppError = class extends Error {
  status;
  code;
  fields;
  details;
  constructor(status, code, message, opts = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.fields = opts.fields;
    this.details = opts.details;
  }
};
var badRequest = (code, message, fields) => new AppError(400, code, message, { fields });
var unauthenticated = (code = ErrorCodes.UNAUTHENTICATED, message = "Authentication required") => new AppError(401, code, message);
var forbidden = (code = ErrorCodes.FORBIDDEN, message = "Not permitted", details) => new AppError(403, code, message, { details });
var notFound = (message = "Not found") => new AppError(404, ErrorCodes.NOT_FOUND, message);
var conflict = (code, message, details) => new AppError(409, code, message, { details });
var unprocessable = (code, message, details) => new AppError(422, code, message, { details });
var rateLimited = (retryAfterSeconds) => new AppError(429, ErrorCodes.RATE_LIMITED, "Rate limit exceeded", {
  details: { retryAfterSeconds }
});

// server/src/core/logging.ts
var SECRET_KEY_PATTERN = /(otp|password|passwd|secret|pepper|token|authorization|cookie|csrf|session|hash|aadhaar|ifsc|account_number)/i;
var PHONE_PATTERN = /(\+?\d[\d\s-]{7,}\d)/g;
function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***";
  return `***${digits.slice(-2)}`;
}
function redact(value, depth = 0) {
  if (depth > 6) return "[depth-limit]";
  if (value === null || value === void 0) return value;
  if (typeof value === "string") {
    return value.replace(PHONE_PATTERN, (m) => maskPhone(m) ?? "***");
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return "[buffer]";
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SECRET_KEY_PATTERN.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      if (k === "phone" || k === "phoneE164" || k === "phone_e164") {
        out[k] = maskPhone(String(v));
        continue;
      }
      out[k] = redact(v, depth + 1);
    }
    return out;
  }
  return "[unserialisable]";
}
function emit(level, msg, meta) {
  const line = JSON.stringify({
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    level,
    msg,
    ...meta ? redact(meta) : {}
  });
  if (level === "error") console.error(line);
  else console.log(line);
}
var log = {
  debug: (msg, meta) => emit("debug", msg, meta),
  info: (msg, meta) => emit("info", msg, meta),
  warn: (msg, meta) => emit("warn", msg, meta),
  error: (msg, meta) => emit("error", msg, meta)
};

// server/src/core/crypto.ts
import {
  createHmac,
  createHash,
  randomBytes,
  randomInt,
  scryptSync,
  timingSafeEqual
} from "node:crypto";
var SCRYPT_N = 16384;
var SCRYPT_R = 8;
var SCRYPT_P = 1;
var SCRYPT_KEYLEN = 64;
var SCRYPT_MAXMEM = 128 * SCRYPT_N * SCRYPT_R * 2;
function safeEqual(a, b) {
  if (a.length !== b.length) {
    timingSafeEqual(a, a);
    return false;
  }
  return timingSafeEqual(a, b);
}
function generateOtp(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) out += String(randomInt(0, 10));
  return out;
}
function hashOtp(otp, pepper) {
  return createHmac("sha256", pepper).update(otp, "utf8").digest();
}
function verifyOtp(otp, pepper, stored) {
  return safeEqual(hashOtp(otp, pepper), stored);
}
function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}
function hashSessionToken(token) {
  return createHash("sha256").update(token, "utf8").digest();
}
function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM
  });
  return [
    "scrypt",
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString("base64"),
    derived.toString("base64")
  ].join("$");
}
function issueCsrfToken(pepper) {
  const nonce = randomBytes(18).toString("base64url");
  const mac = createHmac("sha256", pepper).update(nonce, "utf8").digest("base64url");
  return `${nonce}.${mac}`;
}
function isValidCsrfToken(token, pepper) {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx <= 0) return false;
  const nonce = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  const expected = createHmac("sha256", pepper).update(nonce, "utf8").digest("base64url");
  return safeEqual(Buffer.from(mac), Buffer.from(expected));
}
function tokensMatch(a, b) {
  if (!a || !b) return false;
  return safeEqual(Buffer.from(a), Buffer.from(b));
}
function sha256(input) {
  return createHash("sha256").update(input, "utf8").digest();
}
function randomId() {
  return randomBytes(16).toString("hex");
}

// server/src/core/db.ts
import pg from "pg";
var pool = null;
function getPool() {
  if (!pool) {
    const connStr = getConfig().DATABASE_URL;
    const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
    pool = new pg.Pool({
      connectionString: connStr,
      max: 10,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: 1e4,
      ...isLocal ? {} : { ssl: { rejectUnauthorized: false } }
    });
    pool.on("error", (err) => {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "idle pg client error",
          err: err.message
        })
      );
    });
  }
  return pool;
}
async function withTransaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
    }
    throw err;
  } finally {
    client.release();
  }
}
async function query(text, params = []) {
  return getPool().query(text, params);
}

// server/src/core/session.ts
function sessionCookieName() {
  return getConfig().cookieSecure ? "__Host-fq_session" : "fq_session";
}
var CSRF_COOKIE = "fq_csrf";
var CSRF_HEADER = "x-csrf-token";
async function createSession(client, userId, isStaff, ip, userAgent) {
  const cfg = getConfig();
  const idle = isStaff ? cfg.STAFF_SESSION_IDLE_SECONDS : cfg.FARMER_SESSION_IDLE_SECONDS;
  const absolute = isStaff ? cfg.STAFF_SESSION_ABSOLUTE_SECONDS : cfg.FARMER_SESSION_ABSOLUTE_SECONDS;
  const token = generateSessionToken();
  const now = /* @__PURE__ */ new Date();
  const expiresAt = new Date(now.getTime() + idle * 1e3);
  const absoluteExpiresAt = new Date(now.getTime() + absolute * 1e3);
  const res = await client.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, absolute_expires_at, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [userId, hashSessionToken(token), expiresAt, absoluteExpiresAt, ip, userAgent]
  );
  return { token, sessionId: res.rows[0].id, expiresAt };
}
async function resolveSession(token) {
  const res = await query(
    `SELECT s.id                AS session_id,
            u.id                AS user_id,
            u.full_name,
            u.locale,
            u.status,
            s.expires_at,
            s.absolute_expires_at,
            s.revoked_at,
            (SELECT array_agg(r.code)
               FROM user_roles ur JOIN roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id)                                   AS roles,
            (SELECT array_agg(DISTINCT p.code)
               FROM user_roles ur
               JOIN role_permissions rp ON rp.role_id = ur.role_id
               JOIN permissions p ON p.id = rp.permission_id
              WHERE ur.user_id = u.id)                                   AS permissions,
            (SELECT array_agg(oca.centre_id)
               FROM officers o
               JOIN officer_centre_assignments oca ON oca.officer_id = o.id
              WHERE o.user_id = u.id AND oca.revoked_at IS NULL AND o.status = 'ACTIVE')
                                                                          AS centre_ids
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`,
    [hashSessionToken(token)]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (row.revoked_at) return null;
  const now = /* @__PURE__ */ new Date();
  if (row.expires_at <= now || row.absolute_expires_at <= now) return null;
  if (row.status !== "ACTIVE") return null;
  const roles = row.roles ?? [];
  return {
    userId: row.user_id,
    sessionId: row.session_id,
    fullName: row.full_name,
    locale: row.locale,
    status: row.status,
    roles,
    permissions: new Set(row.permissions ?? []),
    centreIds: row.centre_ids ?? [],
    isStaff: roles.includes("OFFICER") || roles.includes("ADMIN")
  };
}
async function touchSession(sessionId, isStaff) {
  const cfg = getConfig();
  const idle = isStaff ? cfg.STAFF_SESSION_IDLE_SECONDS : cfg.FARMER_SESSION_IDLE_SECONDS;
  await query(
    `UPDATE sessions
        SET last_seen_at = now(),
            expires_at   = LEAST(now() + ($2 || ' seconds')::interval, absolute_expires_at)
      WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId, String(idle)]
  );
}
async function revokeSession(client, sessionId, reason) {
  await client.query(
    `UPDATE sessions SET revoked_at = now(), revoked_reason = $2
      WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId, reason]
  );
}
function sessionCookieOptions(expiresAt) {
  const cfg = getConfig();
  return {
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt
  };
}
function clearedSessionCookieOptions() {
  const cfg = getConfig();
  return {
    httpOnly: true,
    secure: cfg.cookieSecure,
    sameSite: "lax",
    path: "/",
    expires: /* @__PURE__ */ new Date(0)
  };
}

// server/src/core/audit.ts
var AuditActions = {
  REGISTRATION_STARTED: "auth.registration_started",
  REGISTRATION_COMPLETED: "auth.registration_completed",
  LOGIN_OTP_REQUESTED: "auth.login_otp_requested",
  LOGIN_SUCCEEDED: "auth.login_succeeded",
  LOGIN_FAILED: "auth.login_failed",
  OTP_REQUESTED: "auth.otp_requested",
  OTP_VERIFIED: "auth.otp_verified",
  OTP_FAILED: "auth.otp_failed",
  OTP_RESENT: "auth.otp_resent",
  OTP_ATTEMPTS_EXHAUSTED: "auth.otp_attempts_exhausted",
  /*
   * Staff sign-in outcomes. Named for the PASSWORD era and renamed when that
   * factor was removed: an auditor reading "staff_password_verified" would
   * reasonably conclude a password had been checked, and none is. Rows written
   * before this rename carry the old `auth.staff_password_verified` /
   * `auth.staff_password_failed` strings — query both when reading history.
   */
  STAFF_LOGIN_ACCEPTED: "auth.staff_login_accepted",
  STAFF_LOGIN_REJECTED: "auth.staff_login_rejected",
  LOGOUT: "auth.logout",
  SESSION_REVOKED: "auth.session_revoked",
  AUTHORIZATION_DENIED: "auth.authorization_denied",
  CSRF_REJECTED: "auth.csrf_rejected",
  RATE_LIMIT_EXCEEDED: "auth.rate_limit_exceeded",
  DEMO_OTP_REVEALED: "auth.demo_otp_revealed",
  PROFILE_UPDATED: "profile.updated",
  BOOKING_CREATED: "booking.created",
  BOOKING_CANCELLED: "booking.cancelled",
  BOOKING_ARRIVED: "booking.arrived",
  BOOKING_NO_SHOW: "booking.no_show",
  BOOKING_CANCELLED_AT_CENTRE: "booking.cancelled_at_centre",
  WEIGHING_STARTED: "procurement.weighing_started",
  WEIGHT_RECORDED: "procurement.weight_recorded",
  QUALITY_RECORDED: "procurement.quality_recorded",
  PROCUREMENT_COMPLETED: "procurement.completed",
  PAYMENT_COMPUTED: "payment.computed",
  PAYMENT_BLOCKED: "payment.blocked",
  PAYMENT_STATUS_UPDATED: "payment.status_updated",
  NOTIFICATION_DISPATCHED: "notification.dispatched",
  CENTRE_CREATED: "centre.created",
  CENTRE_UPDATED: "centre.updated",
  CENTRE_LANE_CONFIGURED: "centre.lane_configured",
  CENTRE_HOURS_CONFIGURED: "centre.hours_configured",
  CENTRE_HOLIDAY_SET: "centre.holiday_set",
  CENTRE_CROP_CONFIGURED: "centre.crop_configured",
  CENTRE_SLOT_CONFIGURED: "centre.slot_configured",
  OFFICER_ASSIGNED: "officer.assigned",
  OFFICER_ASSIGNMENT_REVOKED: "officer.assignment_revoked",
  OFFICER_CREATED: "officer.created",
  OFFICER_DEACTIVATED: "officer.deactivated",
  OFFICER_REACTIVATED: "officer.reactivated",
  OFFICER_REGISTRATION_REQUESTED: "officer.registration_requested",
  OFFICER_REGISTRATION_APPROVED: "officer.registration_approved",
  OFFICER_REGISTRATION_REJECTED: "officer.registration_rejected"
};
async function writeAudit(client, entry) {
  await client.query(
    `INSERT INTO audit_logs
       (actor_user_id, actor_role, actor_ip, request_id,
        action, entity_type, entity_id, before_state, after_state, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      entry.actorUserId ?? null,
      entry.actorRole ?? null,
      entry.actorIp ?? null,
      entry.requestId ?? null,
      entry.action,
      entry.entityType,
      entry.entityId ?? null,
      entry.before === void 0 ? null : JSON.stringify(redact(entry.before)),
      entry.after === void 0 ? null : JSON.stringify(redact(entry.after)),
      JSON.stringify(redact(entry.metadata ?? {}))
    ]
  );
}

// server/src/core/http.ts
function sendData(res, status, data, meta) {
  res.status(status).json(meta === void 0 ? { data } : { data, meta });
}
var requestContext = (req, res, next) => {
  req.requestId = randomId();
  req.clientIp = req.ip ?? null;
  res.setHeader("X-Request-Id", req.requestId);
  next();
};
var parseCookies = (req, _res, next) => {
  const header = req.headers.cookie;
  const jar = {};
  if (header) {
    for (const part of header.split(";")) {
      const idx = part.indexOf("=");
      if (idx <= 0) continue;
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      if (k) jar[k] = decodeURIComponent(v);
    }
  }
  req.cookies = jar;
  next();
};
function cookies(req) {
  return req.cookies ?? {};
}
var securityHeaders = (_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  res.setHeader("Cache-Control", "no-store");
  if (getConfig().cookieSecure) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
};
var attachActor = async (req, _res, next) => {
  try {
    const token = cookies(req)[sessionCookieName()];
    if (!token) return next();
    const actor = await resolveSession(token);
    if (!actor) return next();
    req.actor = actor;
    void touchSession(actor.sessionId, actor.isStaff).catch(() => {
    });
    next();
  } catch (err) {
    next(err);
  }
};
var issueCsrf = (req, res, next) => {
  const cfg = getConfig();
  const existing = cookies(req)[CSRF_COOKIE];
  if (!isValidCsrfToken(existing, cfg.CSRF_PEPPER)) {
    const token = issueCsrfToken(cfg.CSRF_PEPPER);
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      secure: cfg.cookieSecure,
      sameSite: "lax",
      path: "/"
    });
    req.issuedCsrf = token;
  }
  next();
};
function requireCsrf() {
  return (req, _res, next) => {
    const cfg = getConfig();
    const cookieToken = cookies(req)[CSRF_COOKIE];
    const headerToken = req.header(CSRF_HEADER) ?? void 0;
    const ok = isValidCsrfToken(cookieToken, cfg.CSRF_PEPPER) && tokensMatch(cookieToken, headerToken);
    if (!ok) {
      void withTransaction(
        (client) => writeAudit(client, {
          action: AuditActions.CSRF_REJECTED,
          entityType: "request",
          actorUserId: req.actor?.userId ?? null,
          actorRole: req.actor ? req.actor.roles[0] ?? null : "SYSTEM",
          actorIp: req.clientIp ?? null,
          requestId: req.requestId ?? null,
          metadata: {
            method: req.method,
            path: req.path,
            hadCookie: Boolean(cookieToken),
            hadHeader: Boolean(headerToken)
          }
        })
      ).catch(() => {
      });
      return next(new AppError(403, ErrorCodes.CSRF_TOKEN_INVALID, "CSRF token missing or invalid"));
    }
    next();
  };
}
var errorHandler = (err, req, res, _next) => {
  const requestId = req.requestId ?? null;
  if (err instanceof AppError) {
    if (err.status >= 500) {
      log.error("request failed", { requestId, code: err.code, err: err.message });
    }
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...err.fields ? { fields: err.fields } : {},
        ...err.details ? { details: err.details } : {},
        requestId
      }
    });
    return;
  }
  const maybe = err;
  if (maybe?.type === "entity.parse.failed") {
    res.status(400).json({
      error: { code: ErrorCodes.MALFORMED_JSON, message: "Request body is not valid JSON", requestId }
    });
    return;
  }
  log.error("unhandled error", {
    requestId,
    err: maybe?.message ?? String(err),
    stack: err?.stack
  });
  res.status(500).json({
    error: { code: ErrorCodes.INTERNAL_ERROR, message: "Internal server error", requestId }
  });
};
var notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: ErrorCodes.NOT_FOUND,
      message: "No such endpoint",
      requestId: req.requestId ?? null
    }
  });
};
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// server/src/core/rbac.ts
var registry = [];
function declareRoute(decl) {
  registry.push(decl);
  return decl;
}
var requireAuth = (req, _res, next) => {
  if (!req.actor) return next(unauthenticated());
  next();
};
function requirePermission(permission) {
  return (req, _res, next) => {
    const actor = req.actor;
    if (!actor) return next(unauthenticated());
    if (!actor.permissions.has(permission)) {
      void withTransaction(
        (client) => writeAudit(client, {
          action: AuditActions.AUTHORIZATION_DENIED,
          entityType: "route",
          entityId: null,
          actorUserId: actor.userId,
          actorRole: actor.roles[0] ?? null,
          actorIp: req.clientIp ?? null,
          requestId: req.requestId ?? null,
          metadata: {
            method: req.method,
            path: req.route?.path ?? req.path,
            requiredPermission: permission,
            actorRoles: actor.roles
          }
        })
      ).catch(() => {
      });
      return next(forbidden(ErrorCodes.FORBIDDEN, "Missing required permission"));
    }
    next();
  };
}
function actorMayActOnCentre(actor, centreId) {
  if (actor.roles.includes("ADMIN")) return true;
  return actor.centreIds.includes(centreId);
}

// server/src/modules/auth/auth.routes.ts
import { Router } from "express";
import "zod";

// server/src/core/rateLimit.ts
var RateLimits = {
  OTP_SEND_PER_PHONE: { name: "otp_send_phone", limit: 3, windowSeconds: 15 * 60 },
  OTP_SEND_PER_PHONE_DAILY: { name: "otp_send_phone_daily", limit: 10, windowSeconds: 24 * 60 * 60 },
  OTP_SEND_PER_IP: { name: "otp_send_ip", limit: 20, windowSeconds: 60 * 60 },
  OTP_VERIFY_PER_IP: { name: "otp_verify_ip", limit: 30, windowSeconds: 15 * 60 },
  REGISTER_PER_IP: { name: "register_ip", limit: 10, windowSeconds: 60 * 60 },
  /*
   * Staff sign-in is per PHONE now, not per username — the endpoint takes
   * no username. The per-account bucket is therefore OTP_SEND_PER_PHONE
   * above (3 per 15 minutes), which is stricter than the per-username
   * limit it replaces, so removing that bucket loosened nothing.
   */
  STAFF_LOGIN_PER_IP: { name: "staff_login_ip", limit: 30, windowSeconds: 60 * 60 },
  // Officer registration is a public write, so it stays limited — flooding it
  // from one source is the realistic abuse. An hour window rather than a day
  // keeps a shared NAT or a demo from locking everyone out until tomorrow,
  // which a 24h window did in practice.
  STAFF_REGISTER_PER_IP: { name: "staff_register_ip", limit: 20, windowSeconds: 60 * 60 },
  SESSION_PER_IP: { name: "session_ip", limit: 60, windowSeconds: 15 * 60 },
  BOOKING_CREATE_PER_FARMER: { name: "booking_create_farmer", limit: 10, windowSeconds: 60 * 60 },
  AVAILABILITY_PER_SESSION: { name: "availability_session", limit: 120, windowSeconds: 15 * 60 },
  // Officer search accepts a phone number, which makes it an enumeration
  // surface even in authenticated staff hands. The limit is deliberately far
  // above what a busy centre needs, so it bounds scripted probing without ever
  // interrupting real work.
  OFFICER_SEARCH_PER_SESSION: { name: "officer_search_session", limit: 240, windowSeconds: 15 * 60 },
  /**
   * Queue polling (Phase 9).
   *
   * THREAT MODEL: these endpoints are authenticated, ownership-scoped and
   * centre-scoped, and an unknown or foreign booking code returns 404
   * identically — so they are not enumeration oracles. The risk is resource
   * exhaustion: the SERVER advertises a 5-second poll cadence, so a compliant
   * client is a high-frequency client and a looping one looks identical until
   * it is counted.
   *
   * The limits are DERIVED, not picked. A 15-minute window is 900 seconds; at
   * the advertised pollAfterSeconds = 5 one compliant client issues 180
   * requests per window. 400 gives a farmer 2.2x headroom (a refresh, a second
   * tab, clock jitter); 900 gives an officer 5x, because a dashboard
   * legitimately watches a whole centre from more than one screen and blocking
   * it would stop the centre working.
   *
   * Neither limit can be reached by a client obeying pollAfterSeconds. That is
   * the design requirement: bound abuse without ever making the system
   * unusable.
   */
  QUEUE_READ_PER_SESSION: { name: "queue_read_session", limit: 400, windowSeconds: 15 * 60 },
  OFFICER_QUEUE_PER_SESSION: { name: "officer_queue_session", limit: 900, windowSeconds: 15 * 60 },
  /**
   * Notification feed (Phase 10). Ownership-scoped and authenticated, so not an
   * enumeration oracle; the risk is a client polling the feed in a loop. Sized
   * like the queue buckets: comfortably above any realistic UI refresh rate, so
   * it bounds abuse without ever interrupting a farmer checking their updates.
   */
  NOTIFICATION_READ_PER_SESSION: { name: "notification_read_session", limit: 400, windowSeconds: 15 * 60 },
  /**
   * Public reference reads (districts only).
   *
   * The registration form must be able to list districts BEFORE a session
   * exists, so that one endpoint is unauthenticated. It returns public
   * government geography and no personal data, but an unauthenticated endpoint
   * still deserves a bound: a registration form loads it once, so 120 per 15
   * minutes per IP is far above legitimate use and well below abuse.
   */
  PUBLIC_REFERENCE_PER_IP: { name: "public_reference_ip", limit: 120, windowSeconds: 15 * 60 }
};
function windowStart(windowSeconds, now) {
  const ms = windowSeconds * 1e3;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}
async function consume(rule, subject, now = /* @__PURE__ */ new Date()) {
  const start = windowStart(rule.windowSeconds, now);
  const expires = new Date(start.getTime() + rule.windowSeconds * 1e3);
  const key = `${rule.name}:${subject}`;
  const res = await query(
    `INSERT INTO rate_limit_buckets (bucket_key, window_started_at, hits, expires_at)
     VALUES ($1, $2, 1, $3)
     ON CONFLICT (bucket_key, window_started_at)
     DO UPDATE SET hits = rate_limit_buckets.hits + 1
     RETURNING hits`,
    [key, start, expires]
  );
  const hits = res.rows[0]?.hits ?? 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((expires.getTime() - now.getTime()) / 1e3));
  return { allowed: hits <= rule.limit, rule, hits, retryAfterSeconds };
}
async function consumeAll(entries) {
  for (const { rule, subject } of entries) {
    const outcome = await consume(rule, subject);
    if (!outcome.allowed) return outcome;
  }
  return null;
}
function toError(outcome) {
  return rateLimited(outcome.retryAfterSeconds);
}

// server/src/modules/auth/auth.schemas.ts
import { z as z2 } from "zod";
var PhoneSchema = z2.string().trim().transform((raw) => raw.replace(/[\s()-]/g, "")).superRefine((v, ctx2) => {
  const digits = v.replace(/^\+/, "");
  if (!/^\d+$/.test(digits)) {
    ctx2.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "PHONE_NOT_NUMERIC"
    });
  }
}).transform((v) => {
  let d = v.replace(/^\+/, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return `+${d}`;
}).refine((v) => /^\+91[6-9]\d{9}$/.test(v), {
  message: "PHONE_INVALID_INDIAN_MOBILE"
});
var FullNameSchema = z2.string().trim().min(2, "NAME_TOO_SHORT").max(120, "NAME_TOO_LONG").refine(
  (v) => /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(v),
  "NAME_INVALID_CHARACTERS"
);
var LocaleSchema = z2.enum(["en", "hi"]);
var ConsentSchema = z2.object({
  policyVersion: z2.string().trim().min(1, "CONSENT_VERSION_REQUIRED").max(32),
  accepted: z2.literal(true, {
    errorMap: () => ({ message: "CONSENT_REQUIRED" })
  })
});
var RegisterStartSchema = z2.object({
  fullName: FullNameSchema,
  phone: PhoneSchema,
  districtId: z2.string().uuid("DISTRICT_ID_INVALID"),
  villageId: z2.string().uuid("VILLAGE_ID_INVALID").optional().nullable(),
  locale: LocaleSchema.default("en"),
  consent: ConsentSchema
});
var LoginStartSchema = z2.object({
  phone: PhoneSchema
});
var OtpVerifySchema = z2.object({
  challengeId: z2.string().uuid("CHALLENGE_ID_INVALID"),
  otp: z2.string().trim().regex(/^\d{4,8}$/, "OTP_FORMAT_INVALID")
});
var OtpResendSchema = z2.object({
  challengeId: z2.string().uuid("CHALLENGE_ID_INVALID")
});
var StaffLoginSchema = z2.object({
  phone: PhoneSchema
});
var StaffRegisterSchema = z2.object({
  fullName: FullNameSchema,
  phone: PhoneSchema,
  districtId: z2.string().uuid("DISTRICT_ID_INVALID"),
  centreId: z2.string().uuid("CENTRE_ID_INVALID"),
  cropIds: z2.array(z2.string().uuid("CROP_ID_INVALID")).min(1, "CROP_ID_INVALID"),
  consent: ConsentSchema
});
var UpdateMeSchema = z2.object({
  fullName: FullNameSchema.optional(),
  locale: LocaleSchema.optional(),
  districtId: z2.string().uuid("DISTRICT_ID_INVALID").optional(),
  villageId: z2.string().uuid("VILLAGE_ID_INVALID").nullable().optional()
}).refine((v) => Object.keys(v).length > 0, "NO_FIELDS_TO_UPDATE");
function zodFields(err) {
  const out = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// server/src/modules/auth/demoOtpStore.ts
var store = /* @__PURE__ */ new Map();
var MAX_ENTRIES = 200;
function recordDemoOtp(phone, otp) {
  if (!getConfig().DEMO_MODE) return;
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(phone, { otp, issuedAt: Date.now() });
}
function readDemoOtp(phone) {
  if (!getConfig().DEMO_MODE) return null;
  const entry = store.get(phone);
  if (!entry) return null;
  if (Date.now() - entry.issuedAt > getConfig().OTP_TTL_SECONDS * 1e3) {
    store.delete(phone);
    return null;
  }
  return entry.otp;
}

// server/src/modules/auth/otp.service.ts
function attachDemoOtp(view, deliveredOtp, demoMode) {
  if (!demoMode) return view;
  return { ...view, devOtp: deliveredOtp };
}
function isDecoyChallenge(row) {
  return row.purpose !== "FARMER_REGISTER" && row.user_id === null;
}
function deliverOtp(phone, otp, purpose) {
  const cfg = getConfig();
  if (cfg.DEMO_MODE) {
    recordDemoOtp(phone, otp);
    log.warn(`DEMO_MODE OTP for ${maskPhone(phone)} (${purpose}): ${otp}`);
  } else {
    log.info("OTP issued", { purpose, phoneMasked: maskPhone(phone) });
  }
}
function toView(row) {
  const cfg = getConfig();
  return {
    challengeId: row.id,
    expiresAt: row.expires_at.toISOString(),
    resendAvailableAt: new Date(
      row.last_sent_at.getTime() + cfg.OTP_RESEND_COOLDOWN_SECONDS * 1e3
    ).toISOString(),
    attemptsRemaining: Math.max(0, row.max_attempts - row.attempts),
    otpLength: cfg.OTP_LENGTH
  };
}
async function issueChallenge(client, opts) {
  const cfg = getConfig();
  const otp = generateOtp(cfg.OTP_LENGTH);
  const expiresAt = new Date(Date.now() + cfg.OTP_TTL_SECONDS * 1e3);
  const res = await client.query(
    `INSERT INTO otp_challenges
       (purpose, phone_e164, user_id, pending_registration_id, otp_hash,
        expires_at, max_attempts, max_resends, created_ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id, expires_at, last_sent_at, attempts, max_attempts`,
    [
      opts.purpose,
      opts.phone,
      opts.userId ?? null,
      opts.pendingRegistrationId ?? null,
      hashOtp(otp, cfg.OTP_PEPPER),
      expiresAt,
      cfg.OTP_MAX_ATTEMPTS,
      cfg.OTP_MAX_RESENDS,
      opts.ip ?? null
    ]
  );
  if (!opts.decoy) deliverOtp(opts.phone, otp, opts.purpose);
  const delivered = opts.decoy ? null : otp;
  return {
    view: attachDemoOtp(toView(res.rows[0]), delivered, cfg.DEMO_MODE),
    otp: delivered
  };
}
async function loadChallengeForUpdate(client, challengeId) {
  const res = await client.query(
    `SELECT * FROM otp_challenges WHERE id = $1 FOR UPDATE`,
    [challengeId]
  );
  return res.rows[0] ?? null;
}
async function verifyChallenge(client, challengeId, otp) {
  const cfg = getConfig();
  const row = await loadChallengeForUpdate(client, challengeId);
  if (!row) return { ok: false, reason: "NOT_FOUND" };
  if (row.consumed_at || row.status === "CONSUMED") return { ok: false, reason: "CONSUMED" };
  if (row.status === "FAILED" || row.attempts >= row.max_attempts) {
    return { ok: false, reason: "EXHAUSTED" };
  }
  if (row.expires_at <= /* @__PURE__ */ new Date() || row.status === "EXPIRED") {
    await client.query(`UPDATE otp_challenges SET status = 'EXPIRED' WHERE id = $1`, [row.id]);
    return { ok: false, reason: "EXPIRED" };
  }
  if (!verifyOtp(otp, cfg.OTP_PEPPER, row.otp_hash)) {
    const attempts = row.attempts + 1;
    const exhausted = attempts >= row.max_attempts;
    await client.query(
      `UPDATE otp_challenges SET attempts = $2, status = CASE WHEN $3 THEN 'FAILED' ELSE status END
        WHERE id = $1`,
      [row.id, attempts, exhausted]
    );
    return { ok: false, reason: exhausted ? "EXHAUSTED" : "WRONG" };
  }
  await client.query(
    `UPDATE otp_challenges SET status = 'CONSUMED', consumed_at = now() WHERE id = $1`,
    [row.id]
  );
  return { ok: true, row };
}
async function resendChallenge(client, challengeId) {
  const cfg = getConfig();
  const row = await loadChallengeForUpdate(client, challengeId);
  if (!row || row.consumed_at || row.status !== "PENDING") {
    throw new AppError(400, ErrorCodes.OTP_CHALLENGE_NOT_FOUND, "Challenge not resendable");
  }
  const cooldownEnds = new Date(row.last_sent_at.getTime() + cfg.OTP_RESEND_COOLDOWN_SECONDS * 1e3);
  if (cooldownEnds > /* @__PURE__ */ new Date()) {
    throw unprocessable(ErrorCodes.OTP_RESEND_COOLDOWN, "Resend cooldown active", {
      retryAfterSeconds: Math.ceil((cooldownEnds.getTime() - Date.now()) / 1e3)
    });
  }
  if (row.resend_count >= row.max_resends) {
    throw unprocessable(ErrorCodes.OTP_RESEND_LIMIT_REACHED, "Resend limit reached");
  }
  const otp = generateOtp(cfg.OTP_LENGTH);
  const res = await client.query(
    `UPDATE otp_challenges
        SET otp_hash = $2,
            expires_at = $3,
            resend_count = resend_count + 1,
            last_sent_at = now()
      WHERE id = $1
      RETURNING id, expires_at, last_sent_at, attempts, max_attempts`,
    [row.id, hashOtp(otp, cfg.OTP_PEPPER), new Date(Date.now() + cfg.OTP_TTL_SECONDS * 1e3)]
  );
  const decoy = isDecoyChallenge(row);
  if (!decoy) deliverOtp(row.phone_e164, otp, row.purpose);
  return attachDemoOtp(toView(res.rows[0]), decoy ? null : otp, cfg.DEMO_MODE);
}

// server/src/modules/auth/auth.service.ts
async function startRegistration(client, input, ctx2) {
  const cfg = getConfig();
  const existing = await client.query(
    "SELECT id FROM users WHERE phone_e164 = $1",
    [input.phone]
  );
  if (existing.rowCount && existing.rowCount > 0) {
    await writeAudit(client, {
      action: AuditActions.REGISTRATION_STARTED,
      entityType: "registration",
      actorRole: "SYSTEM",
      actorIp: ctx2.ip,
      requestId: ctx2.requestId,
      metadata: { outcome: "DUPLICATE_PHONE", phone: input.phone }
    });
    throw conflict(
      ErrorCodes.PHONE_ALREADY_REGISTERED,
      "Phone already registered"
    );
  }
  const district = await client.query(
    "SELECT id, state_id FROM districts WHERE id = $1",
    [input.districtId]
  );
  if (district.rowCount === 0) {
    throw unprocessable(ErrorCodes.DISTRICT_NOT_FOUND, "District not found");
  }
  if (input.villageId) {
    const village = await client.query(
      "SELECT id FROM villages WHERE id = $1 AND district_id = $2",
      [input.villageId, input.districtId]
    );
    if (village.rowCount === 0) {
      throw unprocessable(
        ErrorCodes.VILLAGE_NOT_IN_DISTRICT,
        "Village is not in that district"
      );
    }
  }
  const pending = await client.query(
    `INSERT INTO pending_registrations
       (phone_e164, full_name, district_id, village_id, locale,
        consent_policy_version, consent_text_hash, expires_at, created_ip)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [
      input.phone,
      input.fullName,
      input.districtId,
      input.villageId ?? null,
      input.locale,
      input.consent.policyVersion,
      sha256(`${input.consent.policyVersion}:accepted`),
      new Date(Date.now() + cfg.PENDING_REGISTRATION_TTL_SECONDS * 1e3),
      ctx2.ip
    ]
  );
  const { view } = await issueChallenge(client, {
    purpose: "FARMER_REGISTER",
    phone: input.phone,
    pendingRegistrationId: pending.rows[0].id,
    ip: ctx2.ip
  });
  await writeAudit(client, {
    action: AuditActions.REGISTRATION_STARTED,
    entityType: "pending_registration",
    entityId: pending.rows[0].id,
    actorRole: "SYSTEM",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    metadata: { outcome: "OTP_ISSUED", districtId: input.districtId }
  });
  return view;
}
async function startFarmerLogin(client, phone, ctx2) {
  const user = await client.query(
    `SELECT u.id, u.status FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      JOIN roles r ON r.id = ur.role_id AND r.code = 'FARMER'
     WHERE u.phone_e164 = $1`,
    [phone]
  );
  const row = user.rows[0];
  const deliverable = Boolean(row) && row.status === "ACTIVE";
  const { view } = await issueChallenge(client, {
    purpose: "FARMER_LOGIN",
    phone,
    userId: row?.id ?? null,
    ip: ctx2.ip,
    decoy: !deliverable
  });
  await writeAudit(client, {
    action: AuditActions.LOGIN_OTP_REQUESTED,
    entityType: "user",
    entityId: row?.id ?? null,
    actorRole: "SYSTEM",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    metadata: { delivered: deliverable, phone }
  });
  return view;
}
async function submitOfficerRegistration(client, input, ctx2) {
  const centre = await client.query(`SELECT id, district_id, status FROM procurement_centres WHERE id = $1`, [
    input.centreId
  ]);
  const row = centre.rows[0];
  if (!row || row.status !== "ACTIVE") {
    throw unprocessable(
      ErrorCodes.CENTRE_NOT_AVAILABLE,
      "That centre is not available."
    );
  }
  if (row.district_id !== input.districtId) {
    throw unprocessable(
      ErrorCodes.CENTRE_NOT_IN_DISTRICT,
      "That centre is not in the selected district."
    );
  }
  const activeCrops = await client.query(
    `SELECT id FROM crops WHERE id = ANY($1::uuid[]) AND is_active = true`,
    [input.cropIds]
  );
  const activeCropIds = new Set(activeCrops.rows.map((row2) => row2.id));
  const invalidCropIds = input.cropIds.filter((id) => !activeCropIds.has(id));
  if (invalidCropIds.length > 0) {
    throw unprocessable(
      ErrorCodes.CROP_ID_INVALID,
      "One or more selected crops are not valid active crops."
    );
  }
  const existing = await client.query(
    `SELECT id FROM users WHERE phone_e164 = $1`,
    [input.phone]
  );
  if ((existing.rowCount ?? 0) > 0) {
    throw conflict(
      ErrorCodes.PHONE_ALREADY_REGISTERED,
      "Phone already registered."
    );
  }
  const user = await client.query(
    `INSERT INTO users (full_name, phone_e164, locale)
     VALUES ($1, $2, 'en') RETURNING id`,
    [input.fullName, input.phone]
  );
  const userId = user.rows[0].id;
  const officer = await client.query(
    `INSERT INTO officers (user_id, created_by_user_id)
     VALUES ($1, NULL) RETURNING id`,
    [userId]
  );
  await client.query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE code = 'OFFICER'`,
    [userId]
  );
  await client.query(
    `INSERT INTO officer_centre_assignments (officer_id, centre_id)
     VALUES ($1, $2)`,
    [officer.rows[0].id, input.centreId]
  );
  for (const cropId of input.cropIds) {
    const existingConfig = await client.query(
      `SELECT id FROM centre_crop_configurations
        WHERE centre_id = $1 AND crop_id = $2 AND is_active = true
          AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`,
      [input.centreId, cropId]
    );
    if ((existingConfig.rowCount ?? 0) === 0) {
      const rateInfo = await client.query(
        `SELECT season_id, marketing_year FROM msp_rates
         WHERE crop_id = $1
         ORDER BY (status = 'ACTIVATED') DESC, effective_from DESC NULLS LAST
         LIMIT 1`,
        [cropId]
      );
      let seasonId = rateInfo.rows[0]?.season_id;
      const marketingYear = rateInfo.rows[0]?.marketing_year ?? "2026-27";
      if (!seasonId) {
        const defaultSeason = await client.query(
          `SELECT id FROM seasons ORDER BY code ASC LIMIT 1`
        );
        seasonId = defaultSeason.rows[0]?.id;
      }
      if (seasonId) {
        await client.query(
          `INSERT INTO centre_crop_configurations (
             centre_id, crop_id, season_id, marketing_year, is_active,
             effective_from, effective_to, data_type, configured_by_user_id, configuration_note
           ) VALUES ($1, $2, $3, $4, true, CURRENT_DATE, NULL, 'CONFIGURED', $5, 'Configured during officer registration')`,
          [input.centreId, cropId, seasonId, marketingYear, userId]
        );
      }
    }
  }
  await client.query(
    `UPDATE reference_versions SET version = version + 1, updated_at = now()
     WHERE resource = 'procurement_centres'`
  );
  const { view } = await issueChallenge(client, {
    purpose: "STAFF_2FA",
    phone: input.phone,
    userId,
    ip: ctx2.ip
  });
  await writeAudit(client, {
    action: AuditActions.OFFICER_REGISTRATION_REQUESTED,
    entityType: "officer",
    entityId: officer.rows[0].id,
    actorUserId: userId,
    actorRole: "SYSTEM",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    metadata: {
      requestedCentreId: input.centreId,
      cropIds: input.cropIds,
      approvalRequired: false
    }
  });
  return view;
}
async function startStaffLogin(client, phone, ctx2) {
  const res = await client.query(
    `SELECT u.id, u.phone_e164, u.status,
            (SELECT array_agg(r.code) FROM user_roles ur JOIN roles r ON r.id = ur.role_id
              WHERE ur.user_id = u.id) AS roles
       FROM users u WHERE u.phone_e164 = $1`,
    [phone]
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
      actorIp: ctx2.ip,
      requestId: ctx2.requestId,
      metadata: {
        phone,
        reason: !user ? "NO_SUCH_USER" : !isStaff ? "NOT_STAFF" : user.status !== "ACTIVE" ? "INACTIVE" : "NO_PHONE_FOR_2FA"
      }
    });
    throw unauthenticated(
      ErrorCodes.INVALID_CREDENTIALS,
      "Invalid credentials"
    );
  }
  await writeAudit(client, {
    action: AuditActions.STAFF_LOGIN_ACCEPTED,
    entityType: "user",
    entityId: user.id,
    actorUserId: user.id,
    actorRole: roles.includes("ADMIN") ? "ADMIN" : "OFFICER",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    metadata: { phone, secondFactor: "OTP" }
  });
  const { view } = await issueChallenge(client, {
    purpose: "STAFF_2FA",
    phone: user.phone_e164,
    userId: user.id,
    ip: ctx2.ip
  });
  return view;
}
async function verifyOtpAndCreateSession(challengeId, otp, ctx2) {
  const outcome = await withTransaction(async (client) => {
    const result = await verifyChallenge(client, challengeId, otp);
    if (!result.ok) {
      await writeAudit(client, {
        action: result.reason === "EXHAUSTED" ? AuditActions.OTP_ATTEMPTS_EXHAUSTED : AuditActions.OTP_FAILED,
        entityType: "otp_challenge",
        entityId: challengeId,
        actorRole: "SYSTEM",
        actorIp: ctx2.ip,
        requestId: ctx2.requestId,
        metadata: { reason: result.reason }
      });
    }
    return result;
  });
  if (!outcome.ok) {
    throw new AppError(
      400,
      ErrorCodes.OTP_INVALID,
      "OTP invalid, expired or already used"
    );
  }
  return withTransaction((client) => completeLogin(client, outcome.row, ctx2));
}
async function completeLogin(client, row, ctx2) {
  let userId;
  if (row.purpose === "FARMER_REGISTER") {
    userId = await completeRegistration(
      client,
      row.pending_registration_id,
      ctx2
    );
  } else {
    if (!row.user_id) {
      throw new AppError(400, ErrorCodes.OTP_INVALID, "OTP invalid");
    }
    userId = row.user_id;
  }
  const roleRes = await client.query(
    `SELECT r.code FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = $1`,
    [userId]
  );
  const roles = roleRes.rows.map((r) => r.code);
  const isStaff = roles.includes("OFFICER") || roles.includes("ADMIN");
  const session = await createSession(
    client,
    userId,
    isStaff,
    ctx2.ip,
    ctx2.userAgent
  );
  await client.query("UPDATE users SET last_login_at = now() WHERE id = $1", [
    userId
  ]);
  await writeAudit(client, {
    action: AuditActions.LOGIN_SUCCEEDED,
    entityType: "session",
    entityId: session.sessionId,
    actorUserId: userId,
    actorRole: roles.includes("ADMIN") ? "ADMIN" : roles.includes("OFFICER") ? "OFFICER" : "FARMER",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    metadata: { purpose: row.purpose, roles }
  });
  return { session, userId, roles };
}
async function completeRegistration(client, pendingId, ctx2) {
  if (!pendingId)
    throw new AppError(400, ErrorCodes.OTP_INVALID, "OTP invalid");
  const res = await client.query("SELECT * FROM pending_registrations WHERE id = $1 FOR UPDATE", [
    pendingId
  ]);
  const pending = res.rows[0];
  if (!pending || pending.expires_at <= /* @__PURE__ */ new Date()) {
    throw new AppError(400, ErrorCodes.OTP_INVALID, "Registration expired");
  }
  const dup = await client.query("SELECT id FROM users WHERE phone_e164 = $1", [
    pending.phone_e164
  ]);
  if (dup.rowCount && dup.rowCount > 0) {
    throw conflict(
      ErrorCodes.PHONE_ALREADY_REGISTERED,
      "Phone already registered"
    );
  }
  const user = await client.query(
    `INSERT INTO users (full_name, phone_e164, locale, phone_verified_at)
     VALUES ($1,$2,$3, now()) RETURNING id`,
    [pending.full_name, pending.phone_e164, pending.locale]
  );
  const userId = user.rows[0].id;
  await client.query(
    `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE code = 'FARMER'`,
    [userId]
  );
  await client.query(
    `INSERT INTO farmers (user_id, district_id, village_id) VALUES ($1,$2,$3)`,
    [userId, pending.district_id, pending.village_id]
  );
  await client.query(
    `INSERT INTO consents (user_id, purpose, policy_version, policy_text_hash, granted_ip)
     VALUES ($1,'SERVICE_USE',$2,$3,$4), ($1,'SMS_NOTIFICATIONS',$2,$3,$4)`,
    [
      userId,
      pending.consent_policy_version,
      pending.consent_text_hash,
      pending.created_ip
    ]
  );
  await client.query("DELETE FROM pending_registrations WHERE id = $1", [
    pendingId
  ]);
  await writeAudit(client, {
    action: AuditActions.REGISTRATION_COMPLETED,
    entityType: "user",
    entityId: userId,
    actorUserId: userId,
    actorRole: "FARMER",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    metadata: { consentVersion: pending.consent_policy_version }
  });
  return userId;
}
async function logout(client, sessionId, userId, roles, ctx2) {
  await revokeSession(client, sessionId, "LOGOUT");
  await writeAudit(client, {
    action: AuditActions.LOGOUT,
    entityType: "session",
    entityId: sessionId,
    actorUserId: userId,
    actorRole: roles.includes("ADMIN") ? "ADMIN" : roles.includes("OFFICER") ? "OFFICER" : "FARMER",
    actorIp: ctx2.ip,
    requestId: ctx2.requestId
  });
}

// server/src/modules/auth/auth.routes.ts
var BASE = "/api/v1";
function ctxOf(req) {
  return {
    ip: req.clientIp ?? null,
    userAgent: req.header("user-agent") ?? null,
    requestId: req.requestId ?? null
  };
}
function parse(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw badRequest(
      ErrorCodes.VALIDATION_FAILED,
      "Request validation failed",
      zodFields(result.error)
    );
  }
  return result.data;
}
async function rejectRateLimited(req, outcome) {
  await withTransaction(
    (client) => writeAudit(client, {
      action: AuditActions.RATE_LIMIT_EXCEEDED,
      entityType: "request",
      actorUserId: req.actor?.userId ?? null,
      actorRole: "SYSTEM",
      actorIp: req.clientIp ?? null,
      requestId: req.requestId ?? null,
      metadata: { rule: outcome.rule.name, hits: outcome.hits, path: req.path }
    })
  ).catch(() => {
  });
  return toError(outcome);
}
function buildAuthRouter() {
  const router = Router();
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/farmer/register/start-otp`,
    auth: { kind: "public", reason: "Registration precedes any identity." },
    csrf: true,
    summary: "Begin farmer registration and issue an OTP challenge."
  });
  router.post(
    "/auth/farmer/register/start-otp",
    asyncHandler(async (req, res) => {
      const input = parse(RegisterStartSchema, req.body);
      const limited = await consumeAll([
        {
          rule: RateLimits.REGISTER_PER_IP,
          subject: req.clientIp ?? "unknown"
        },
        { rule: RateLimits.OTP_SEND_PER_PHONE, subject: input.phone },
        { rule: RateLimits.OTP_SEND_PER_PHONE_DAILY, subject: input.phone },
        {
          rule: RateLimits.OTP_SEND_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw await rejectRateLimited(req, limited);
      const view = await withTransaction(
        (client) => startRegistration(client, input, ctxOf(req))
      );
      sendData(res, 201, view);
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/farmer/login/start-otp`,
    auth: { kind: "public", reason: "Login is by definition unauthenticated." },
    csrf: true,
    summary: "Issue a login OTP challenge. Enumeration-resistant."
  });
  router.post(
    "/auth/farmer/login/start-otp",
    asyncHandler(async (req, res) => {
      const input = parse(LoginStartSchema, req.body);
      const limited = await consumeAll([
        { rule: RateLimits.OTP_SEND_PER_PHONE, subject: input.phone },
        { rule: RateLimits.OTP_SEND_PER_PHONE_DAILY, subject: input.phone },
        {
          rule: RateLimits.OTP_SEND_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw await rejectRateLimited(req, limited);
      const view = await withTransaction(
        (client) => startFarmerLogin(client, input.phone, ctxOf(req))
      );
      sendData(res, 201, view);
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/staff/register`,
    auth: {
      kind: "public",
      reason: "Applying for an officer account must be possible without one. Creates a review request only \u2014 no user, no role, no assignment, and it cannot authenticate."
    },
    csrf: true,
    summary: "Submit an officer account application for administrator review."
  });
  router.post(
    "/auth/staff/register",
    asyncHandler(async (req, res) => {
      const input = parse(StaffRegisterSchema, req.body);
      const limited = await consumeAll([
        {
          rule: RateLimits.STAFF_REGISTER_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw await rejectRateLimited(req, limited);
      const result = await withTransaction(
        (client) => submitOfficerRegistration(client, input, ctxOf(req))
      );
      sendData(res, 201, result);
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/staff/login`,
    auth: { kind: "public", reason: "First factor of staff authentication." },
    csrf: true,
    summary: "Verify staff password and issue the OTP second factor."
  });
  router.post(
    "/auth/staff/login",
    asyncHandler(async (req, res) => {
      const input = parse(StaffLoginSchema, req.body);
      const limited = await consumeAll([
        { rule: RateLimits.OTP_SEND_PER_PHONE, subject: input.phone },
        {
          rule: RateLimits.STAFF_LOGIN_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw await rejectRateLimited(req, limited);
      const view = await withTransaction(
        (client) => startStaffLogin(client, input.phone, ctxOf(req))
      );
      sendData(res, 201, view);
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/otp/verify`,
    auth: {
      kind: "public",
      reason: "Completes authentication; a session does not exist yet."
    },
    csrf: true,
    summary: "Verify an OTP challenge and create a session."
  });
  router.post(
    "/auth/otp/verify",
    asyncHandler(async (req, res) => {
      const input = parse(OtpVerifySchema, req.body);
      const limited = await consumeAll([
        {
          rule: RateLimits.OTP_VERIFY_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw await rejectRateLimited(req, limited);
      const result = await verifyOtpAndCreateSession(
        input.challengeId,
        input.otp,
        ctxOf(req)
      );
      res.cookie(
        sessionCookieName(),
        result.session.token,
        sessionCookieOptions(result.session.expiresAt)
      );
      sendData(res, 201, {
        userId: result.userId,
        roles: result.roles,
        expiresAt: result.session.expiresAt.toISOString()
      });
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/otp/resend`,
    auth: {
      kind: "public",
      reason: "Operates on an unauthenticated challenge."
    },
    csrf: true,
    summary: "Resend an OTP, subject to cooldown and resend limit."
  });
  router.post(
    "/auth/otp/resend",
    asyncHandler(async (req, res) => {
      const input = parse(OtpResendSchema, req.body);
      const limited = await consumeAll([
        {
          rule: RateLimits.OTP_SEND_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw await rejectRateLimited(req, limited);
      const view = await withTransaction(async (client) => {
        const v = await resendChallenge(client, input.challengeId);
        await writeAudit(client, {
          action: AuditActions.OTP_RESENT,
          entityType: "otp_challenge",
          entityId: input.challengeId,
          actorRole: "SYSTEM",
          actorIp: req.clientIp ?? null,
          requestId: req.requestId ?? null
        });
        return v;
      });
      sendData(res, 200, view);
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE}/auth/logout`,
    auth: { kind: "authenticated" },
    csrf: true,
    summary: "Revoke the current session server-side and clear the cookie."
  });
  router.post(
    "/auth/logout",
    requireAuth,
    asyncHandler(async (req, res) => {
      const actor = req.actor;
      await withTransaction(
        (client) => logout(
          client,
          actor.sessionId,
          actor.userId,
          actor.roles,
          ctxOf(req)
        )
      );
      res.cookie(sessionCookieName(), "", clearedSessionCookieOptions());
      sendData(res, 200, { loggedOut: true });
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE}/auth/csrf`,
    auth: {
      kind: "public",
      reason: "Issues the CSRF token needed before any authenticated write."
    },
    csrf: false,
    summary: "Return the current CSRF token (also set as a readable cookie)."
  });
  router.get("/auth/csrf", (req, res) => {
    const issued = req.issuedCsrf;
    const current = issued ?? req.cookies?.fq_csrf;
    sendData(res, 200, { csrfToken: current ?? null });
  });
  declareRoute({
    method: "GET",
    path: `${BASE}/dev/last-otp`,
    auth: {
      kind: "public",
      reason: "DEMO_MODE only; guarded by a static dev token and audited."
    },
    csrf: false,
    summary: "Reveal the last demo OTP for a phone. Never available in production."
  });
  router.get(
    "/dev/last-otp",
    asyncHandler(async (req, res) => {
      const cfg = getConfig();
      if (!cfg.DEMO_MODE)
        throw forbidden(ErrorCodes.FORBIDDEN, "Not available");
      const provided = req.header("x-dev-token");
      if (!provided || provided !== cfg.DEV_TOOLS_TOKEN) {
        throw unauthenticated(ErrorCodes.UNAUTHENTICATED, "Dev token required");
      }
      const phoneRaw = String(req.query.phone ?? "");
      const parsed = LoginStartSchema.safeParse({ phone: phoneRaw });
      if (!parsed.success) {
        throw badRequest(
          ErrorCodes.VALIDATION_FAILED,
          "phone required",
          zodFields(parsed.error)
        );
      }
      const otp = readDemoOtp(parsed.data.phone);
      await withTransaction(
        (client) => writeAudit(client, {
          action: AuditActions.DEMO_OTP_REVEALED,
          entityType: "otp_challenge",
          actorRole: "SYSTEM",
          actorIp: req.clientIp ?? null,
          requestId: req.requestId ?? null,
          metadata: { phone: parsed.data.phone, found: otp !== null }
        })
      );
      sendData(res, 200, { otp });
    })
  );
  return router;
}

// server/src/modules/identity/identity.routes.ts
import { Router as Router2 } from "express";
var BASE2 = "/api/v1";
function buildIdentityRouter() {
  const router = Router2();
  declareRoute({
    method: "GET",
    path: `${BASE2}/me`,
    auth: { kind: "permission", permission: "profile.read.own" },
    csrf: false,
    summary: "Return the authenticated actor\u2019s own profile."
  });
  router.get(
    "/me",
    requirePermission("profile.read.own"),
    asyncHandler(async (req, res) => {
      const actor = req.actor;
      const result = await query(
        `SELECT u.full_name, u.phone_e164, u.locale, u.status,
                f.district_id, d.name AS district_name,
                f.village_id,  v.name AS village_name
           FROM users u
           LEFT JOIN farmers f  ON f.user_id = u.id
           LEFT JOIN districts d ON d.id = f.district_id
           LEFT JOIN villages  v ON v.id = f.village_id
          WHERE u.id = $1`,
        [actor.userId]
      );
      const row = result.rows[0];
      if (!row) throw notFound();
      sendData(res, 200, {
        userId: actor.userId,
        fullName: row.full_name,
        // The full number is never returned; the client already knows it.
        phoneMasked: maskPhone(row.phone_e164),
        locale: row.locale,
        status: row.status,
        roles: actor.roles,
        permissions: [...actor.permissions].sort(),
        district: row.district_id ? { id: row.district_id, name: row.district_name } : null,
        village: row.village_id ? { id: row.village_id, name: row.village_name } : null,
        centreIds: actor.centreIds
      });
    })
  );
  declareRoute({
    method: "PATCH",
    path: `${BASE2}/me`,
    auth: { kind: "permission", permission: "profile.update.own" },
    csrf: true,
    summary: "Update permitted fields of the authenticated actor\u2019s own profile."
  });
  router.patch(
    "/me",
    requirePermission("profile.update.own"),
    asyncHandler(async (req, res) => {
      const actor = req.actor;
      const parsed = UpdateMeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "Validation failed", zodFields(parsed.error));
      }
      const input = parsed.data;
      await withTransaction(async (client) => {
        const before = await client.query(
          `SELECT u.full_name, u.locale, f.district_id, f.village_id
             FROM users u LEFT JOIN farmers f ON f.user_id = u.id
            WHERE u.id = $1 FOR UPDATE OF u`,
          [actor.userId]
        );
        if (before.rowCount === 0) throw notFound();
        if (input.districtId) {
          const d = await client.query("SELECT id FROM districts WHERE id = $1", [input.districtId]);
          if (d.rowCount === 0) {
            throw badRequest(ErrorCodes.DISTRICT_NOT_FOUND, "District not found");
          }
        }
        if (input.villageId) {
          const districtId = input.districtId ?? before.rows[0].district_id;
          const v = await client.query(
            "SELECT id FROM villages WHERE id = $1 AND district_id = $2",
            [input.villageId, districtId]
          );
          if (v.rowCount === 0) {
            throw badRequest(ErrorCodes.VILLAGE_NOT_IN_DISTRICT, "Village is not in that district");
          }
        }
        if (input.fullName !== void 0 || input.locale !== void 0) {
          await client.query(
            `UPDATE users
                SET full_name = COALESCE($2, full_name),
                    locale    = COALESCE($3, locale)
              WHERE id = $1`,
            [actor.userId, input.fullName ?? null, input.locale ?? null]
          );
        }
        if (input.districtId !== void 0 || input.villageId !== void 0) {
          await client.query(
            `UPDATE farmers
                SET district_id = COALESCE($2, district_id),
                    village_id  = CASE WHEN $4 THEN $3 ELSE village_id END
              WHERE user_id = $1`,
            [
              actor.userId,
              input.districtId ?? null,
              input.villageId ?? null,
              input.villageId !== void 0
            ]
          );
        }
        const after = await client.query(
          `SELECT u.full_name, u.locale, f.district_id, f.village_id
             FROM users u LEFT JOIN farmers f ON f.user_id = u.id
            WHERE u.id = $1`,
          [actor.userId]
        );
        await writeAudit(client, {
          action: AuditActions.PROFILE_UPDATED,
          entityType: "user",
          entityId: actor.userId,
          actorUserId: actor.userId,
          actorRole: actor.roles[0] ?? null,
          actorIp: req.clientIp ?? null,
          requestId: req.requestId ?? null,
          before: before.rows[0],
          after: after.rows[0]
        });
      });
      sendData(res, 200, { updated: true });
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE2}/officer/centres`,
    auth: { kind: "permission", permission: "booking.read.centre" },
    csrf: false,
    summary: "List the centres the authenticated officer is assigned to."
  });
  router.get(
    "/officer/centres",
    requirePermission("booking.read.centre"),
    asyncHandler(async (req, res) => {
      const actor = req.actor;
      const result = await query(
        `SELECT pc.id, pc.code, pc.name, pc.data_type
           FROM procurement_centres pc
          WHERE pc.id = ANY($1::uuid[])
          ORDER BY pc.code`,
        [actor.centreIds]
      );
      sendData(res, 200, result.rows);
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE2}/admin/farmers`,
    auth: { kind: "permission", permission: "farmer.read" },
    csrf: false,
    summary: "List farmers for administration. Phone numbers are masked."
  });
  router.get(
    "/admin/farmers",
    requirePermission("farmer.read"),
    asyncHandler(async (_req, res) => {
      const result = await query(
        `SELECT f.id, u.full_name, u.phone_e164, f.status, d.name AS district_name
           FROM farmers f
           JOIN users u ON u.id = f.user_id
           LEFT JOIN districts d ON d.id = f.district_id
          ORDER BY u.created_at DESC
          LIMIT 100`
      );
      sendData(
        res,
        200,
        result.rows.map((r) => ({
          farmerId: r.id,
          fullName: r.full_name,
          phoneMasked: maskPhone(r.phone_e164),
          status: r.status,
          district: r.district_name
        }))
      );
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE2}/admin/audit-logs`,
    auth: { kind: "permission", permission: "audit.read" },
    csrf: false,
    summary: "Read recent audit log entries."
  });
  router.get(
    "/admin/audit-logs",
    requirePermission("audit.read"),
    asyncHandler(async (req, res) => {
      const limit3 = Math.min(Number(req.query.limit ?? 50) || 50, 200);
      const result = await query(
        `SELECT id, occurred_at, actor_user_id, actor_role, action, entity_type, entity_id, metadata
           FROM audit_logs
          ORDER BY occurred_at DESC, id DESC
          LIMIT $1`,
        [limit3]
      );
      sendData(res, 200, result.rows);
    })
  );
  return router;
}

// server/src/modules/reference/reference.routes.ts
import { Router as Router3 } from "express";

// server/src/domain/quantity.ts
import { z as z4 } from "zod";
var KG_PER_QUINTAL = 100;
var MIN_QUANTITY_KG = 2500;
var MAX_QUANTITY_KG = 5e3;
var MIN_QUANTITY_QUINTAL = MIN_QUANTITY_KG / KG_PER_QUINTAL;
var MAX_QUANTITY_QUINTAL = MAX_QUANTITY_KG / KG_PER_QUINTAL;
var QuantityKgSchema = z4.number({ invalid_type_error: "QUANTITY_NOT_INTEGER" }).int("QUANTITY_NOT_INTEGER").min(MIN_QUANTITY_KG, "QUANTITY_BELOW_MINIMUM").max(MAX_QUANTITY_KG, "QUANTITY_ABOVE_MAXIMUM");
var MAX_MEASURED_KG = 9999999999e-3;
var threeDecimals = (v) => Number.isInteger(Math.round(v * 1e3)) && Math.abs(v * 1e3 - Math.round(v * 1e3)) < 1e-6;
var WeighedKgSchema = z4.number({ invalid_type_error: "QUANTITY_NOT_A_NUMBER" }).finite("QUANTITY_NOT_FINITE").positive("QUANTITY_NOT_POSITIVE").max(MAX_MEASURED_KG, "QUANTITY_ABOVE_MAXIMUM").refine(threeDecimals, "QUANTITY_TOO_PRECISE");
var MeasuredKgSchema = z4.number({ invalid_type_error: "QUANTITY_NOT_A_NUMBER" }).finite("QUANTITY_NOT_FINITE").min(0, "QUANTITY_NEGATIVE").max(MAX_MEASURED_KG, "QUANTITY_ABOVE_MAXIMUM").refine(threeDecimals, "QUANTITY_TOO_PRECISE");
function bookingConstraints() {
  return {
    quantity: {
      unit: "kg",
      minKg: MIN_QUANTITY_KG,
      maxKg: MAX_QUANTITY_KG,
      // Provided for display only. The wire field is always quantityKg.
      minQuintal: MIN_QUANTITY_QUINTAL,
      maxQuintal: MAX_QUANTITY_QUINTAL,
      kgPerQuintal: KG_PER_QUINTAL,
      integerOnly: true
    }
  };
}

// server/src/modules/reference/reference.routes.ts
var BASE3 = "/api/v1";
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function buildReferenceRouter() {
  const router = Router3();
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/districts`,
    auth: {
      kind: "public",
      reason: "Registration is public and requires a districtId; districts are public government geography with no personal data."
    },
    csrf: false,
    summary: "Districts available for registration and centre selection."
  });
  router.get(
    "/reference/districts",
    asyncHandler(async (req, res) => {
      const limited = await consumeAll([
        {
          rule: RateLimits.PUBLIC_REFERENCE_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw toError(limited);
      const result = await query(
        `SELECT d.id, d.name, d.lgd_code, d.data_type,
                s.name AS state_name, s.lgd_code AS state_lgd_code
           FROM districts d JOIN states s ON s.id = d.state_id
          ORDER BY d.name`
      );
      sendData(
        res,
        200,
        result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          lgdCode: r.lgd_code,
          dataType: r.data_type,
          state: { name: r.state_name, lgdCode: r.state_lgd_code }
        }))
      );
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/registration-centres`,
    auth: {
      kind: "public",
      reason: "Officer registration is public and requires a centreId. Exposes name and district only \u2014 operational detail stays behind reference.read."
    },
    csrf: false,
    summary: "Minimal active-centre list for the officer registration form."
  });
  router.get(
    "/reference/registration-centres",
    asyncHandler(async (req, res) => {
      const limited = await consumeAll([
        {
          rule: RateLimits.PUBLIC_REFERENCE_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw toError(limited);
      const districtId = req.query.districtId ? String(req.query.districtId) : null;
      if (districtId && !UUID.test(districtId)) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "districtId invalid", {
          districtId: "DISTRICT_ID_INVALID"
        });
      }
      const result = await query(
        `SELECT pc.id, pc.code, pc.name, d.id AS district_id, d.name AS district_name,
                c.id AS crop_id, c.canonical_name AS crop_name
           FROM procurement_centres pc
           JOIN districts d ON d.id = pc.district_id
           LEFT JOIN centre_crop_configurations ccc
             ON ccc.centre_id = pc.id
            AND ccc.is_active = true
            AND ccc.effective_from <= CURRENT_DATE
            AND (ccc.effective_to IS NULL OR ccc.effective_to >= CURRENT_DATE)
           LEFT JOIN crops c ON c.id = ccc.crop_id
          WHERE pc.status = 'ACTIVE'
            AND ($1::uuid IS NULL OR pc.district_id = $1::uuid)
          ORDER BY pc.name, c.canonical_name`,
        [districtId]
      );
      sendData(
        res,
        200,
        Object.values(
          result.rows.reduce((centres, r) => {
            const centre = centres[r.id] ??= {
              id: r.id,
              code: r.code,
              name: r.name,
              district: { id: r.district_id, name: r.district_name },
              acceptedCrops: []
            };
            if (r.crop_id && r.crop_name) {
              centre.acceptedCrops.push({ id: r.crop_id, name: r.crop_name });
            }
            return centres;
          }, {})
        )
      );
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/registration-crops`,
    auth: {
      kind: "public",
      reason: "Officer registration is public and requires cropIds. Exposes canonical name only \u2014 MSP and operational detail stay behind reference.read."
    },
    csrf: false,
    summary: "Minimal active-crop list for the officer registration form."
  });
  router.get(
    "/reference/registration-crops",
    asyncHandler(async (req, res) => {
      const limited = await consumeAll([
        {
          rule: RateLimits.PUBLIC_REFERENCE_PER_IP,
          subject: req.clientIp ?? "unknown"
        }
      ]);
      if (limited) throw toError(limited);
      let result = await query(
        `SELECT id, canonical_name FROM crops WHERE is_active ORDER BY canonical_name`
      );
      if (result.rows.length === 0) {
        await query(`
          INSERT INTO crops (code, canonical_name, data_type) VALUES
            ('WHEAT',              'Wheat',              'CONFIGURED'),
            ('BARLEY',             'Barley',             'CONFIGURED'),
            ('GRAM',               'Gram',               'CONFIGURED'),
            ('LENTIL_MASUR',       'Lentil (Masur)',     'CONFIGURED'),
            ('RAPESEED_MUSTARD',   'Rapeseed & Mustard', 'CONFIGURED'),
            ('SAFFLOWER',          'Safflower',          'CONFIGURED'),
            ('PADDY',              'Paddy',              'CONFIGURED'),
            ('JOWAR',              'Jowar',              'CONFIGURED'),
            ('BAJRA',              'Bajra',              'CONFIGURED'),
            ('RAGI',               'Ragi',               'CONFIGURED'),
            ('MAIZE',              'Maize',              'CONFIGURED'),
            ('TUR_ARHAR',          'Tur (Arhar)',        'CONFIGURED'),
            ('MOONG',              'Moong',              'CONFIGURED'),
            ('URAD',               'Urad',               'CONFIGURED'),
            ('GROUNDNUT',          'Groundnut',          'CONFIGURED'),
            ('SUNFLOWER_SEED',     'Sunflower Seed',     'CONFIGURED'),
            ('SOYBEAN_YELLOW',     'Soybean (Yellow)',   'CONFIGURED'),
            ('SESAMUM',            'Sesamum',            'CONFIGURED'),
            ('NIGERSEED',          'Nigerseed',          'CONFIGURED'),
            ('COTTON',             'Cotton',             'CONFIGURED')
          ON CONFLICT (code) DO UPDATE SET is_active = true
        `);
        result = await query(
          `SELECT id, canonical_name FROM crops WHERE is_active ORDER BY canonical_name`
        );
      }
      sendData(
        res,
        200,
        result.rows.map((r) => ({ id: r.id, canonicalName: r.canonical_name }))
      );
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/villages`,
    auth: { kind: "permission", permission: "reference.read" },
    csrf: false,
    summary: "Villages within a district. Currently empty \u2014 see the note below."
  });
  router.get(
    "/reference/villages",
    requirePermission("reference.read"),
    asyncHandler(async (req, res) => {
      const districtId = String(req.query.districtId ?? "");
      if (!UUID.test(districtId)) {
        throw badRequest(
          ErrorCodes.VALIDATION_FAILED,
          "districtId is required",
          {
            districtId: "DISTRICT_ID_INVALID"
          }
        );
      }
      const result = await query(
        `SELECT id, name, lgd_code, data_type FROM villages WHERE district_id = $1 ORDER BY name`,
        [districtId]
      );
      sendData(res, 200, {
        districtId,
        available: result.rowCount > 0,
        reasonCode: result.rowCount > 0 ? null : "NO_VILLAGE_DATA_FOR_DISTRICT",
        villages: result.rows.map((r) => ({
          id: r.id,
          name: r.name,
          lgdCode: r.lgd_code,
          dataType: r.data_type
        }))
      });
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/crops`,
    auth: { kind: "permission", permission: "reference.read" },
    csrf: false,
    summary: "Crops with their official season and marketing year."
  });
  router.get(
    "/reference/crops",
    requirePermission("reference.read"),
    asyncHandler(async (_req, res) => {
      const result = await query(
        `SELECT c.id, c.code, c.canonical_name, c.data_type,
                s.code AS season_code, s.name AS season_name,
                m.marketing_year,
                array_remove(array_agg(DISTINCT m.variety_or_grade), NULL) AS grades,
                (SELECT count(*)::int
                   FROM centre_crop_configurations ccc
                  WHERE ccc.crop_id = c.id AND ccc.is_active) AS centre_count
           FROM crops c
           LEFT JOIN msp_rates m ON m.crop_id = c.id AND m.status = 'ACTIVE'
           LEFT JOIN seasons  s ON s.id = m.season_id
          WHERE c.is_active
          GROUP BY c.id, c.code, c.canonical_name, c.data_type,
                   s.code, s.name, m.marketing_year
          ORDER BY c.canonical_name`
      );
      sendData(
        res,
        200,
        result.rows.map((r) => ({
          id: r.id,
          code: r.code,
          // The government's own wording. Do NOT translate this in the frontend
          // bundle: renaming an official crop misrepresents the source.
          canonicalName: r.canonical_name,
          dataType: r.data_type,
          season: r.season_code ? { code: r.season_code, name: r.season_name } : null,
          marketingYear: r.marketing_year,
          // Present when the source publishes per-variety rates (e.g. Paddy
          // Common / Grade A). A grade-less lookup for such a crop is ambiguous
          // by design — see D-9.
          grades: (r.grades ?? []).sort(),
          eligibleCentreCount: r.centre_count
        }))
      );
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/centres`,
    auth: { kind: "permission", permission: "reference.read" },
    csrf: false,
    summary: "Active procurement centres, optionally filtered by district and crop."
  });
  router.get(
    "/reference/centres",
    requirePermission("reference.read"),
    asyncHandler(async (req, res) => {
      const districtId = req.query.districtId ? String(req.query.districtId) : null;
      const cropId = req.query.cropId ? String(req.query.cropId) : null;
      if (districtId && !UUID.test(districtId)) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "districtId invalid", {
          districtId: "DISTRICT_ID_INVALID"
        });
      }
      if (cropId && !UUID.test(cropId)) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "cropId invalid", {
          cropId: "CROP_ID_INVALID"
        });
      }
      const result = await query(
        `SELECT pc.id, pc.code, pc.name, pc.data_type, pc.timezone, pc.storage_check_mode,
                d.name AS district_name, d.id AS district_id,
                m.name AS mandi_name, m.grade AS mandi_grade, m.data_type AS mandi_data_type,
                ds.publisher AS mandi_publisher, ds.source_url AS mandi_source_url,
                (SELECT count(*)::int FROM centre_service_lanes l
                  WHERE l.centre_id = pc.id AND l.is_active) AS lane_count,
                (SELECT array_agg(DISTINCT cr.canonical_name)
                   FROM centre_crop_configurations ccc
                   JOIN crops cr ON cr.id = ccc.crop_id
                  WHERE ccc.centre_id = pc.id AND ccc.is_active) AS crops
           FROM procurement_centres pc
           JOIN districts d ON d.id = pc.district_id
           LEFT JOIN mandis m ON m.id = pc.mandi_id
           LEFT JOIN data_sources ds ON ds.id = m.source_id
          WHERE pc.status = 'ACTIVE'
            AND ($1::uuid IS NULL OR pc.district_id = $1::uuid)
            AND ($2::uuid IS NULL OR EXISTS (
                  SELECT 1 FROM centre_crop_configurations ccc
                   WHERE ccc.centre_id = pc.id AND ccc.crop_id = $2::uuid AND ccc.is_active))
          ORDER BY pc.name`,
        [districtId, cropId]
      );
      sendData(
        res,
        200,
        result.rows.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          dataType: r.data_type,
          district: { id: r.district_id, name: r.district_name },
          /*
           * The market the centre sits in, when one is published.
           *
           * A mandi is NOT a procurement centre, so this never changes the
           * centre's own dataType. It is exposed separately, with its own
           * dataType and publisher, so a client can show what is officially
           * sourced without implying the centre is. Null means the publishing
           * authority lists no market in that district — an absence, recorded.
           */
          mandi: r.mandi_name ? {
            name: r.mandi_name,
            grade: r.mandi_grade,
            dataType: r.mandi_data_type,
            publisher: r.mandi_publisher,
            sourceUrl: r.mandi_source_url
          } : null,
          timezone: r.timezone,
          laneCount: r.lane_count,
          acceptedCrops: (r.crops ?? []).sort(),
          /*
           * D-10: no official centre-level storage capacity exists. The centre is
           * in ADVISORY mode, so the honest answer is a reason code rather than
           * an invented headroom figure.
           */
          storage: {
            checkMode: r.storage_check_mode,
            status: "NOT_AVAILABLE",
            reasonCode: "NO_CAPACITY_DATA_FOR_CENTRE"
          }
        }))
      );
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE3}/reference/booking-constraints`,
    auth: { kind: "permission", permission: "reference.read" },
    csrf: false,
    summary: "Quantity rules, so the UI never hardcodes the range."
  });
  router.get(
    "/reference/booking-constraints",
    requirePermission("reference.read"),
    asyncHandler(async (_req, res) => {
      sendData(res, 200, bookingConstraints());
    })
  );
  return router;
}

// server/src/modules/bookings/bookings.routes.ts
import { Router as Router4 } from "express";
import { z as z5 } from "zod";

// server/src/modules/bookings/bookings.service.ts
import { createHash as createHash2 } from "node:crypto";

// server/src/engines/scheduling.ts
function roundHalfAwayFromZero(n) {
  return n < 0 ? -Math.round(-n) : Math.round(n);
}
function processingMinutes(quantityKg, cfg) {
  if (cfg.referenceQuantityKg <= 0) {
    throw new Error("referenceQuantityKg must be positive");
  }
  const raw = roundHalfAwayFromZero(
    cfg.referenceProcessingMinutes * (quantityKg / cfg.referenceQuantityKg)
  );
  return Math.min(Math.max(raw, cfg.minimumProcessingMinutes), cfg.maximumProcessingMinutes);
}
function durationBreakdown(quantityKg, cfg) {
  const processing = processingMinutes(quantityKg, cfg);
  return {
    processingMinutes: processing,
    bufferMinutes: cfg.transitionBufferMinutes,
    occupancyMinutes: processing + cfg.transitionBufferMinutes
  };
}
function zoneOffsetMs(date, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const parts = dtf.formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  const hour = get("hour") % 24;
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asIfUtc - date.getTime();
}
function zonedToUtc(serviceDate, localTime2, timeZone) {
  const [y, m, d] = serviceDate.split("-").map(Number);
  const [hh, mm] = localTime2.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
  let ts = naive - zoneOffsetMs(new Date(naive), timeZone);
  ts = naive - zoneOffsetMs(new Date(ts), timeZone);
  return new Date(ts);
}
function dayOfWeekFor(serviceDate, timeZone) {
  const noon = zonedToUtc(serviceDate, "12:00", timeZone);
  const name = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}
function addDays(serviceDate, days) {
  const [y, m, d] = serviceDate.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 864e5;
  const dt = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
function localDateOf(instant, timeZone) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return dtf.format(instant);
}
var MIN_MS = 6e4;
function snapUp(instant, origin, granularityMinutes) {
  if (granularityMinutes <= 0) return instant;
  const step = granularityMinutes * MIN_MS;
  const delta = instant.getTime() - origin.getTime();
  if (delta <= 0) return new Date(origin.getTime());
  return new Date(origin.getTime() + Math.ceil(delta / step) * step);
}
function freeIntervals(working, occupied) {
  const busy = occupied.filter((o) => o.endAt > working.startAt && o.startAt < working.endAt).map((o) => ({
    startAt: new Date(Math.max(o.startAt.getTime(), working.startAt.getTime())),
    endAt: new Date(Math.min(o.endAt.getTime(), working.endAt.getTime()))
  })).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const merged = [];
  for (const b of busy) {
    const last = merged[merged.length - 1];
    if (last && b.startAt.getTime() <= last.endAt.getTime()) {
      if (b.endAt > last.endAt) last.endAt = b.endAt;
    } else {
      merged.push({ startAt: new Date(b.startAt), endAt: new Date(b.endAt) });
    }
  }
  const free = [];
  let cursor = working.startAt;
  for (const b of merged) {
    if (b.startAt > cursor) free.push({ startAt: cursor, endAt: b.startAt });
    if (b.endAt > cursor) cursor = b.endAt;
  }
  if (cursor < working.endAt) free.push({ startAt: cursor, endAt: working.endAt });
  return free;
}
function earliestOnLane(working, occupied, durationMinutes, notBefore, granularityMinutes) {
  const needed = durationMinutes * MIN_MS;
  for (const gap of freeIntervals(working, occupied)) {
    const lowerBound = new Date(Math.max(gap.startAt.getTime(), notBefore.getTime()));
    const start = snapUp(lowerBound, working.startAt, granularityMinutes);
    if (start.getTime() + needed <= gap.endAt.getTime()) return start;
  }
  return null;
}
function earliestOnDay(day, quantityKg, cfg, notBefore) {
  if (day.holidays.has(day.serviceDate)) return null;
  if (day.lanes.length === 0) return null;
  const dow = dayOfWeekFor(day.serviceDate, day.timeZone);
  const todaysHours = day.hours.filter((h) => h.dayOfWeek === dow);
  if (todaysHours.length === 0) return null;
  const { processingMinutes: proc, bufferMinutes, occupancyMinutes: occ } = durationBreakdown(
    quantityKg,
    cfg
  );
  let best = null;
  for (const h of todaysHours) {
    const working = {
      startAt: zonedToUtc(day.serviceDate, h.opensAt.slice(0, 5), day.timeZone),
      endAt: zonedToUtc(day.serviceDate, h.closesAt.slice(0, 5), day.timeZone)
    };
    if (working.endAt <= working.startAt) continue;
    for (const laneNo of [...day.lanes].sort((a, b) => a - b)) {
      const occupied = day.existing.filter((e) => e.laneNo === laneNo);
      const start = earliestOnLane(working, occupied, occ, notBefore, cfg.slotGranularityMinutes);
      if (!start) continue;
      if (!best || start < best.startAt || start.getTime() === best.startAt.getTime() && laneNo < best.laneNo) {
        best = {
          laneNo,
          serviceDate: day.serviceDate,
          startAt: start,
          endAt: new Date(start.getTime() + occ * MIN_MS),
          processingEndAt: new Date(start.getTime() + proc * MIN_MS),
          processingMinutes: proc,
          bufferMinutes,
          occupancyMinutes: occ
        };
      }
    }
  }
  return best;
}
async function findEarliest(fromDate, horizonDays, quantityKg, cfg, notBefore, loadDay2) {
  let anyOpenDay = false;
  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const serviceDate = addDays(fromDate, offset);
    const day = await loadDay2(serviceDate);
    const dow = dayOfWeekFor(serviceDate, day.timeZone);
    const open = !day.holidays.has(serviceDate) && day.hours.some((h) => h.dayOfWeek === dow);
    if (open) anyOpenDay = true;
    const candidate = earliestOnDay(day, quantityKg, cfg, notBefore);
    if (candidate) return { found: true, candidate };
  }
  return {
    found: false,
    reason: anyOpenDay ? "ALL_DAYS_FULL" : "CENTRE_CLOSED_ON_DATE",
    daysSearched: horizonDays + 1
  };
}

// server/src/modules/bookings/bookings.repository.ts
import { randomInt as randomInt2 } from "node:crypto";
async function loadCentreContext(centreId, onDate, db = null) {
  const run = db ? db.query.bind(db) : query;
  const centre = await run(
    `SELECT pc.id, pc.code, pc.name, pc.timezone, pc.status, pc.storage_check_mode,
            pc.data_type, d.name AS district_name
       FROM procurement_centres pc JOIN districts d ON d.id = pc.district_id
      WHERE pc.id = $1`,
    [centreId]
  );
  if (centre.rowCount === 0) return null;
  const c = centre.rows[0];
  const cfg = await run(
    `SELECT id, reference_quantity_kg, reference_processing_minutes,
            minimum_processing_minutes, maximum_processing_minutes,
            transition_buffer_minutes, slot_granularity_minutes,
            booking_horizon_days, cancellation_cutoff_hours, max_daily_processing_kg
       FROM centre_slot_configurations
      WHERE centre_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to > $2::date)`,
    [centreId, onDate]
  );
  if (cfg.rowCount === 0) return null;
  const s = cfg.rows[0];
  const hours = await run(
    `SELECT day_of_week, opens_at::text AS opens_at, closes_at::text AS closes_at
       FROM centre_operating_hours
      WHERE centre_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to > $2::date)`,
    [centreId, onDate]
  );
  const holidays = await run(
    `SELECT holiday_date::text AS d FROM centre_holidays WHERE centre_id = $1`,
    [centreId]
  );
  const lanes = await run(
    `SELECT lane_no FROM centre_service_lanes WHERE centre_id = $1 AND is_active ORDER BY lane_no`,
    [centreId]
  );
  return {
    centreId: c.id,
    code: c.code,
    name: c.name,
    timezone: c.timezone,
    status: c.status,
    storageCheckMode: c.storage_check_mode,
    dataType: c.data_type,
    districtName: c.district_name,
    lanes: lanes.rows.map((r) => Number(r.lane_no)),
    slotConfigId: String(s.id),
    config: {
      referenceQuantityKg: Number(s.reference_quantity_kg),
      referenceProcessingMinutes: Number(s.reference_processing_minutes),
      minimumProcessingMinutes: Number(s.minimum_processing_minutes),
      maximumProcessingMinutes: Number(s.maximum_processing_minutes),
      transitionBufferMinutes: Number(s.transition_buffer_minutes),
      slotGranularityMinutes: Number(s.slot_granularity_minutes),
      bookingHorizonDays: Number(s.booking_horizon_days),
      cancellationCutoffHours: Number(s.cancellation_cutoff_hours),
      maxDailyProcessingKg: s.max_daily_processing_kg === null ? null : Number(s.max_daily_processing_kg)
    },
    hours: hours.rows.map(
      (r) => ({ dayOfWeek: Number(r.day_of_week), opensAt: r.opens_at, closesAt: r.closes_at })
    ),
    holidays: new Set(holidays.rows.map((r) => r.d))
  };
}
var ACTIVE_STATUSES = [
  "CONFIRMED",
  "ARRIVED",
  "WEIGHING",
  "QUALITY_CHECK",
  "PROCUREMENT_RECORDED",
  "PAYMENT_PENDING"
];
async function loadDayOccupancy(centreId, serviceDate, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(
    `SELECT lane_no, scheduled_start_at, scheduled_end_at
       FROM bookings
      WHERE centre_id = $1 AND service_date = $2::date
        AND status = ANY($3::text[])
      ORDER BY scheduled_start_at`,
    [centreId, serviceDate, ACTIVE_STATUSES]
  );
  return res.rows.map((r) => ({
    laneNo: Number(r.lane_no),
    startAt: r.scheduled_start_at,
    endAt: r.scheduled_end_at
  }));
}
async function lockDailyCapacity(client, centreId, serviceDate) {
  await client.query(
    `INSERT INTO centre_daily_capacity (centre_id, service_date)
     VALUES ($1, $2::date) ON CONFLICT (centre_id, service_date) DO NOTHING`,
    [centreId, serviceDate]
  );
  const res = await client.query(
    `SELECT booked_quantity_kg, booked_minutes, booking_count
       FROM centre_daily_capacity
      WHERE centre_id = $1 AND service_date = $2::date
      FOR UPDATE`,
    [centreId, serviceDate]
  );
  const r = res.rows[0];
  return {
    bookedQuantityKg: Number(r.booked_quantity_kg),
    bookedMinutes: Number(r.booked_minutes),
    bookingCount: Number(r.booking_count)
  };
}
async function nextTokenNumber(client, centreId, serviceDate) {
  const res = await client.query(
    `SELECT COALESCE(MAX(token_number), 0) + 1 AS next
       FROM bookings WHERE centre_id = $1 AND service_date = $2::date`,
    [centreId, serviceDate]
  );
  return Number(res.rows[0].next);
}
function generateBookingCode(serviceDate) {
  const year = serviceDate.slice(0, 4);
  let digits = "";
  for (let i = 0; i < 7; i += 1) digits += String(randomInt2(0, 10));
  return `FQ-${year}-${digits}`;
}
async function insertBooking(client, input) {
  const res = await client.query(
    `INSERT INTO bookings
       (booking_code, farmer_id, centre_id, crop_id, season_id, marketing_year,
        lane_no, requested_quantity_kg, service_date, scheduled_start_at,
        scheduled_end_at, estimated_processing_minutes, occupancy_minutes,
        token_number, slot_config_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::date,$10,$11,$12,$13,$14,$15,'CONFIRMED')
     RETURNING id, booking_code, token_number, lane_no, service_date::text AS service_date,
               scheduled_start_at, scheduled_end_at, estimated_processing_minutes,
               occupancy_minutes, status, requested_quantity_kg, marketing_year`,
    [
      input.bookingCode,
      input.farmerId,
      input.centreId,
      input.cropId,
      input.seasonId,
      input.marketingYear,
      input.laneNo,
      input.quantityKg,
      input.serviceDate,
      input.startAt,
      input.endAt,
      input.processingMinutes,
      input.occupancyMinutes,
      input.tokenNumber,
      input.slotConfigId
    ]
  );
  return res.rows[0];
}
async function bumpDailyCapacity(client, centreId, serviceDate, quantityKg, occupancyMinutes, direction) {
  await client.query(
    `UPDATE centre_daily_capacity
        SET booked_quantity_kg = booked_quantity_kg + ($3::numeric * $4::int),
            booked_minutes     = booked_minutes     + ($5::int * $4::int),
            booking_count      = booking_count      + $4::int,
            updated_at = now()
      WHERE centre_id = $1 AND service_date = $2::date`,
    [centreId, serviceDate, quantityKg, direction, occupancyMinutes]
  );
}
async function recordStatusChange(client, bookingId, from, to, changedByUserId, reason) {
  await client.query(
    `INSERT INTO booking_status_history (booking_id, from_status, to_status, changed_by_user_id, reason)
     VALUES ($1,$2,$3,$4,$5)`,
    [bookingId, from, to, changedByUserId, reason]
  );
}
var BOOKING_SELECT = `
  SELECT b.id, b.centre_id, b.crop_id, b.season_id,
         b.booking_code, b.token_number, b.lane_no, b.service_date::text AS service_date,
         -- The SAME date, uncast. Filtering on service_date (text) puts a cast
         -- on the indexed column and makes bookings_centre_date_start_idx
         -- unusable for the date component; a predicate must use this one.
         b.service_date AS service_date_on,
         b.scheduled_start_at, b.scheduled_end_at, b.estimated_processing_minutes,
         b.occupancy_minutes, b.status, b.requested_quantity_kg, b.marketing_year,
         b.cancelled_at, b.cancellation_reason, b.farmer_id,
         (b.occupancy_minutes - b.estimated_processing_minutes) AS buffer_minutes,
         pc.code AS centre_code, pc.name AS centre_name, pc.timezone AS centre_timezone,
         pc.storage_check_mode AS centre_storage_check_mode, pc.data_type AS centre_data_type,
         d.name AS district_name,
         cr.code AS crop_code, cr.canonical_name AS crop_name, s.code AS season_code
    FROM bookings b
    JOIN procurement_centres pc ON pc.id = b.centre_id
    JOIN districts d ON d.id = pc.district_id
    JOIN crops cr ON cr.id = b.crop_id
    JOIN seasons s ON s.id = b.season_id`;
async function findOwnedByCode(bookingCode, farmerId, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(`${BOOKING_SELECT} WHERE b.booking_code = $1 AND b.farmer_id = $2`, [
    bookingCode,
    farmerId
  ]);
  return res.rows[0] ?? null;
}
async function findOwnedByCodeForUpdate(client, bookingCode, farmerId) {
  const res = await client.query(
    `${BOOKING_SELECT} WHERE b.booking_code = $1 AND b.farmer_id = $2 FOR UPDATE OF b`,
    [bookingCode, farmerId]
  );
  return res.rows[0] ?? null;
}
async function listForFarmer(farmerId, includeInactive) {
  const res = await query(
    `${BOOKING_SELECT}
      WHERE b.farmer_id = $1
        AND ($2::boolean OR b.status = ANY($3::text[]))
      ORDER BY b.scheduled_start_at DESC
      LIMIT 100`,
    [farmerId, includeInactive, ACTIVE_STATUSES]
  );
  return res.rows;
}
async function farmerIdForUser(userId, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run("SELECT id FROM farmers WHERE user_id = $1", [userId]);
  return res.rows[0]?.id ?? null;
}
async function resolveCropAtCentre(centreId, cropId, onDate, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(
    `SELECT ccc.season_id, s.code AS season_code, ccc.marketing_year, cr.canonical_name
       FROM centre_crop_configurations ccc
       JOIN seasons s ON s.id = ccc.season_id
       JOIN crops cr ON cr.id = ccc.crop_id
      WHERE ccc.centre_id = $1 AND ccc.crop_id = $2 AND ccc.is_active
        AND ccc.effective_from <= $3::date
        AND (ccc.effective_to IS NULL OR ccc.effective_to > $3::date)
      LIMIT 1`,
    [centreId, cropId, onDate]
  );
  const r = res.rows[0];
  return r ? {
    seasonId: r.season_id,
    seasonCode: r.season_code,
    marketingYear: r.marketing_year,
    cropName: r.canonical_name
  } : null;
}
async function claimIdempotencyKey(client, key, userId, endpoint, requestHash) {
  const inserted = await client.query(
    `INSERT INTO idempotency_keys (key, user_id, endpoint, request_hash, expires_at)
     VALUES ($1,$2,$3,$4, now() + interval '24 hours')
     ON CONFLICT (key) DO NOTHING
     RETURNING key`,
    [key, userId, endpoint, requestHash]
  );
  if (inserted.rowCount === 1) return { kind: "fresh" };
  const existing = await client.query(
    `SELECT request_hash, response_status, response_body
       FROM idempotency_keys WHERE key = $1 FOR UPDATE`,
    [key]
  );
  const row = existing.rows[0];
  if (!row) return { kind: "fresh" };
  if (!row.request_hash.equals(requestHash)) return { kind: "conflict" };
  if (row.response_status === null) return { kind: "conflict" };
  return { kind: "replay", status: row.response_status, body: row.response_body };
}
async function storeIdempotentResponse(client, key, status, body) {
  await client.query(
    `UPDATE idempotency_keys SET response_status = $2, response_body = $3 WHERE key = $1`,
    [key, status, JSON.stringify(body)]
  );
}

// server/src/engines/notifications.ts
function normaliseLocale(value) {
  return value === "hi" ? "hi" : "en";
}
function dedupeKeyFor(event, ids) {
  switch (event) {
    case "BOOKING_CONFIRMED":
    case "BOOKING_ARRIVED":
    case "PROCUREMENT_COMPLETED":
      return `booking:${ids.bookingId}:${event}`;
    case "PAYMENT_BLOCKED":
      return `payment:${ids.paymentId}:PAYMENT_BLOCKED`;
    case "PAYMENT_UPDATED":
      return `payment:${ids.paymentId}:PAYMENT_UPDATED:${ids.status}`;
    case "QUEUE_APPROACHING":
      return `booking:${ids.bookingId}:QUEUE_APPROACHING:${ids.serviceDate}`;
  }
}
var TITLES = {
  BOOKING_CONFIRMED: { en: "Booking confirmed", hi: "\u092C\u0941\u0915\u093F\u0902\u0917 \u0915\u0940 \u092A\u0941\u0937\u094D\u091F\u093F \u0939\u0941\u0908" },
  BOOKING_ARRIVED: { en: "Arrival recorded", hi: "\u0906\u0917\u092E\u0928 \u0926\u0930\u094D\u091C \u0915\u093F\u092F\u093E \u0917\u092F\u093E" },
  PROCUREMENT_COMPLETED: { en: "Procurement recorded", hi: "\u0916\u0930\u0940\u0926 \u0926\u0930\u094D\u091C \u0915\u0940 \u0917\u0908" },
  PAYMENT_BLOCKED: { en: "Payment needs attention", hi: "\u092D\u0941\u0917\u0924\u093E\u0928 \u092A\u0930 \u0927\u094D\u092F\u093E\u0928 \u0926\u0947\u0928\u093E \u0906\u0935\u0936\u094D\u092F\u0915" },
  PAYMENT_UPDATED: { en: "Payment status updated", hi: "\u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0940 \u0938\u094D\u0925\u093F\u0924\u093F \u0905\u092A\u0921\u0947\u091F \u0939\u0941\u0908" },
  QUEUE_APPROACHING: { en: "Your turn is approaching", hi: "\u0906\u092A\u0915\u0940 \u092C\u093E\u0930\u0940 \u0928\u091C\u093C\u0926\u0940\u0915 \u0939\u0948" }
};
var BLOCKED_REASON = {
  MSP_AMBIGUOUS: {
    en: "the grade of your crop has not been recorded yet, so the support price cannot be determined",
    hi: "\u0906\u092A\u0915\u0940 \u092B\u0938\u0932 \u0915\u093E \u0917\u094D\u0930\u0947\u0921 \u0905\u092D\u0940 \u0926\u0930\u094D\u091C \u0928\u0939\u0940\u0902 \u0939\u0941\u0906 \u0939\u0948, \u0907\u0938\u0932\u093F\u090F \u0938\u092E\u0930\u094D\u0925\u0928 \u092E\u0942\u0932\u094D\u092F \u0924\u092F \u0928\u0939\u0940\u0902 \u0915\u093F\u092F\u093E \u091C\u093E \u0938\u0915\u093E"
  },
  NO_ACTIVE_MSP: {
    en: "no active support price is available for this crop and grade",
    hi: "\u0907\u0938 \u092B\u0938\u0932 \u0914\u0930 \u0917\u094D\u0930\u0947\u0921 \u0915\u0947 \u0932\u093F\u090F \u0915\u094B\u0908 \u0938\u0915\u094D\u0930\u093F\u092F \u0938\u092E\u0930\u094D\u0925\u0928 \u092E\u0942\u0932\u094D\u092F \u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948"
  },
  AWAITING_QUALITY: {
    en: "the quality assessment is still pending",
    hi: "\u0917\u0941\u0923\u0935\u0924\u094D\u0924\u093E \u091C\u093E\u0901\u091A \u0905\u092D\u0940 \u092C\u093E\u0915\u0940 \u0939\u0948"
  },
  POLICY_HOLD: {
    en: "the payment is on hold under current policy",
    hi: "\u0935\u0930\u094D\u0924\u092E\u093E\u0928 \u0928\u0940\u0924\u093F \u0915\u0947 \u0924\u0939\u0924 \u092D\u0941\u0917\u0924\u093E\u0928 \u0930\u094B\u0915\u093E \u0917\u092F\u093E \u0939\u0948"
  }
};
function blockedReasonText(code, locale) {
  const entry = code ? BLOCKED_REASON[code] : void 0;
  if (entry) return entry[locale];
  return locale === "hi" ? "\u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0940 \u0917\u0923\u0928\u093E \u0905\u092D\u0940 \u0928\u0939\u0940\u0902 \u0915\u0940 \u091C\u093E \u0938\u0915\u0940" : "the payment could not be calculated yet";
}
function renderNotification(event, locale, c) {
  const title = TITLES[event][locale];
  const code = c.bookingCode ?? "";
  const crop = c.cropName ?? "";
  const centre = c.centreName ?? "";
  let body;
  switch (event) {
    case "BOOKING_CONFIRMED":
      body = locale === "hi" ? `\u0906\u092A\u0915\u0940 ${crop} \u0915\u0940 \u092C\u0941\u0915\u093F\u0902\u0917 ${code} ${centre} \u092A\u0930 ${c.serviceDate} \u0915\u094B ${c.scheduledStartLocal} \u092C\u091C\u0947 \u0915\u0947 \u0932\u093F\u090F \u092A\u0915\u094D\u0915\u0940 \u0939\u094B \u0917\u0908 \u0939\u0948\u0964 \u091F\u094B\u0915\u0928 ${c.tokenNumber}\u0964` : `Your ${crop} booking ${code} is confirmed at ${centre} on ${c.serviceDate} at ${c.scheduledStartLocal}. Token ${c.tokenNumber}.`;
      break;
    case "BOOKING_ARRIVED":
      body = locale === "hi" ? `${centre} \u092A\u0930 \u0906\u092A\u0915\u093E \u0906\u0917\u092E\u0928 \u0926\u0930\u094D\u091C \u0915\u0930 \u0932\u093F\u092F\u093E \u0917\u092F\u093E \u0939\u0948\u0964 \u092C\u0941\u0915\u093F\u0902\u0917 ${code}, \u091F\u094B\u0915\u0928 ${c.tokenNumber}\u0964 \u0915\u0943\u092A\u092F\u093E \u0905\u092A\u0928\u0940 \u092C\u093E\u0930\u0940 \u0915\u0940 \u092A\u094D\u0930\u0924\u0940\u0915\u094D\u0937\u093E \u0915\u0930\u0947\u0902\u0964` : `Your arrival at ${centre} has been recorded. Booking ${code}, token ${c.tokenNumber}. Please wait for your turn.`;
      break;
    case "PROCUREMENT_COMPLETED":
      body = locale === "hi" ? `\u092C\u0941\u0915\u093F\u0902\u0917 ${code} \u0915\u0947 \u0932\u093F\u090F \u0906\u092A\u0915\u0940 \u0909\u092A\u091C \u0915\u0940 \u0916\u0930\u0940\u0926 \u0926\u0930\u094D\u091C \u0915\u0930 \u0932\u0940 \u0917\u0908 \u0939\u0948\u0964 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0940 \u0938\u094D\u0925\u093F\u0924\u093F: ${c.paymentStatus}\u0964` : `Procurement for booking ${code} has been recorded. Payment status: ${c.paymentStatus}.`;
      break;
    case "PAYMENT_BLOCKED":
      body = locale === "hi" ? `\u092C\u0941\u0915\u093F\u0902\u0917 ${code} \u0915\u093E \u092D\u0941\u0917\u0924\u093E\u0928 \u0905\u092D\u0940 \u0930\u0941\u0915\u093E \u0939\u0941\u0906 \u0939\u0948 \u0915\u094D\u092F\u094B\u0902\u0915\u093F ${blockedReasonText(c.blockedReason, "hi")}\u0964 \u0915\u0943\u092A\u092F\u093E \u0916\u0930\u0940\u0926 \u0915\u0947\u0902\u0926\u094D\u0930 \u0938\u0947 \u0938\u0902\u092A\u0930\u094D\u0915 \u0915\u0930\u0947\u0902\u0964` : `Payment for booking ${code} is on hold because ${blockedReasonText(c.blockedReason, "en")}. Please contact the procurement centre.`;
      break;
    case "PAYMENT_UPDATED":
      body = c.amountRupees != null ? locale === "hi" ? `\u092C\u0941\u0915\u093F\u0902\u0917 ${code} \u0915\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0940 \u0938\u094D\u0925\u093F\u0924\u093F \u0905\u092C ${c.paymentStatus} \u0939\u0948\u0964 \u0930\u093E\u0936\u093F \u20B9${c.amountRupees}\u0964` : `Payment for booking ${code} is now ${c.paymentStatus}. Amount \u20B9${c.amountRupees}.` : locale === "hi" ? `\u092C\u0941\u0915\u093F\u0902\u0917 ${code} \u0915\u0947 \u092D\u0941\u0917\u0924\u093E\u0928 \u0915\u0940 \u0938\u094D\u0925\u093F\u0924\u093F \u0905\u092C ${c.paymentStatus} \u0939\u0948\u0964` : `Payment for booking ${code} is now ${c.paymentStatus}.`;
      break;
    case "QUEUE_APPROACHING":
      body = locale === "hi" ? `${centre} \u092A\u0930 \u0906\u092A\u0915\u0940 \u092C\u093E\u0930\u0940 \u0928\u091C\u093C\u0926\u0940\u0915 \u0939\u0948\u0964 \u092C\u0941\u0915\u093F\u0902\u0917 ${code}, \u091F\u094B\u0915\u0928 ${c.tokenNumber}, \u0915\u0924\u093E\u0930 \u092E\u0947\u0902 \u0938\u094D\u0925\u093E\u0928 ${c.queuePosition}\u0964` : `Your turn at ${centre} is approaching. Booking ${code}, token ${c.tokenNumber}, queue position ${c.queuePosition}.`;
      break;
  }
  return { title, body };
}
function titleFor(event, locale) {
  const t = TITLES[event];
  return t ? t[locale] : event;
}
var PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g;
function renderTemplate(template, vars) {
  const missing = [];
  const body = template.replace(PLACEHOLDER, (_m, name) => {
    const v = vars[name];
    if (v === void 0 || v === null || v === "") {
      missing.push(name);
      return "";
    }
    return String(v);
  });
  return missing.length > 0 ? { ok: false, missing } : { ok: true, body };
}
function templateVarsFor(locale, c) {
  const amount = c.amountRupees == null ? "" : locale === "hi" ? ` \u0930\u093E\u0936\u093F \u20B9${c.amountRupees}\u0964` : ` Amount \u20B9${c.amountRupees}.`;
  return {
    bookingCode: c.bookingCode,
    cropName: c.cropName,
    centreName: c.centreName,
    serviceDate: c.serviceDate,
    scheduledStartLocal: c.scheduledStartLocal,
    tokenNumber: c.tokenNumber,
    queuePosition: c.queuePosition,
    paymentStatus: c.paymentStatus,
    amountRupees: c.amountRupees,
    // Always non-empty so `{amountSuffix}` never counts as missing.
    amountSuffix: amount === "" ? " " : amount,
    blockedReasonText: blockedReasonText(c.blockedReason, locale)
  };
}

// server/src/modules/notifications/notifications.repository.ts
async function enqueue(client, input) {
  const res = await client.query(
    `INSERT INTO notifications
       (user_id, booking_id, event_key, channel, locale, dedupe_key,
        rendered_body, to_phone_e164, template_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'QUEUED')
     ON CONFLICT (dedupe_key) DO NOTHING
     RETURNING id`,
    [
      input.userId,
      input.bookingId,
      input.eventKey,
      input.channel,
      input.locale,
      input.dedupeKey,
      input.renderedBody,
      input.toPhoneE164,
      input.templateId ?? null
    ]
  );
  return res.rows[0]?.id ?? null;
}
async function bookingNotificationContext(client, bookingId) {
  const res = await client.query(
    `SELECT u.id AS user_id, u.locale, u.phone_e164 AS phone,
            b.booking_code, cr.canonical_name AS crop_name,
            pc.name AS centre_name, pc.timezone AS centre_timezone,
            b.service_date::text AS service_date, b.scheduled_start_at, b.token_number
       FROM bookings b
       JOIN farmers f ON f.id = b.farmer_id
       JOIN users u ON u.id = f.user_id
       JOIN crops cr ON cr.id = b.crop_id
       JOIN procurement_centres pc ON pc.id = b.centre_id
      WHERE b.id = $1`,
    [bookingId]
  );
  const r = res.rows[0];
  if (!r) return null;
  return {
    userId: String(r.user_id),
    locale: String(r.locale),
    phone: r.phone ?? null,
    bookingCode: String(r.booking_code),
    cropName: String(r.crop_name),
    centreName: String(r.centre_name),
    centreTimezone: String(r.centre_timezone),
    serviceDate: String(r.service_date),
    scheduledStartAt: r.scheduled_start_at,
    tokenNumber: Number(r.token_number)
  };
}
var FEED_SELECT = `
  SELECT n.id, n.event_key, n.channel, n.locale, n.rendered_body, n.status,
         n.read_at, n.created_at, n.sent_at, n.attempts, n.max_attempts,
         n.provider_message_id, b.booking_code
    FROM notifications n
    LEFT JOIN bookings b ON b.id = n.booking_id`;
async function listForUser(userId, opts) {
  const res = await query(
    `${FEED_SELECT}
      WHERE n.user_id = $1
        AND (NOT $2::boolean OR n.read_at IS NULL)
      ORDER BY n.created_at DESC
      LIMIT $3::int`,
    [userId, opts.unreadOnly, opts.limit]
  );
  return res.rows;
}
async function unreadCountForUser(userId) {
  const res = await query(
    `SELECT count(*)::text AS n FROM notifications
      WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return Number(res.rows[0].n);
}
async function markRead(userId, notificationId) {
  const res = await query(
    `UPDATE notifications
        SET read_at = now()
      WHERE id = $1 AND user_id = $2 AND read_at IS NULL
      RETURNING id`,
    [notificationId, userId]
  );
  if (res.rowCount && res.rowCount > 0) return true;
  const owned = await query(
    "SELECT 1 FROM notifications WHERE id = $1 AND user_id = $2",
    [notificationId, userId]
  );
  return (owned.rowCount ?? 0) > 0;
}
async function markAllRead(userId) {
  const res = await query(
    `UPDATE notifications SET read_at = now()
      WHERE user_id = $1 AND read_at IS NULL`,
    [userId]
  );
  return res.rowCount ?? 0;
}
async function activeTemplate(client, eventKey, channel, locale) {
  const res = await client.query(
    `SELECT id, body_template FROM notification_templates
      WHERE event_key = $1 AND channel = $2 AND locale = $3 AND status = 'ACTIVE'
      LIMIT 1`,
    [eventKey, channel, locale]
  );
  return res.rows[0] ?? null;
}
async function listPreferences(userId) {
  const res = await query(
    `SELECT channel, event_key, enabled FROM notification_preferences
      WHERE user_id = $1 ORDER BY channel, event_key NULLS FIRST`,
    [userId]
  );
  return res.rows;
}
async function setPreference(userId, channel, eventKey, enabled) {
  await query(
    `INSERT INTO notification_preferences (user_id, channel, event_key, enabled)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (user_id, channel, COALESCE(event_key, ''))
     DO UPDATE SET enabled = EXCLUDED.enabled`,
    [userId, channel, eventKey, enabled]
  );
}

// server/src/modules/notifications/notifications.service.ts
var CHANNEL = "IN_APP";
function localTime(at, timeZone) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  }).format(at);
}
async function enqueueForBooking(client, bookingId, event, extra = {}, dedupeIds = {}) {
  const ctx2 = await bookingNotificationContext(client, bookingId);
  if (!ctx2) return null;
  const locale = normaliseLocale(ctx2.locale);
  const renderContext = {
    bookingCode: ctx2.bookingCode,
    cropName: ctx2.cropName,
    centreName: ctx2.centreName,
    serviceDate: ctx2.serviceDate,
    scheduledStartLocal: localTime(ctx2.scheduledStartAt, ctx2.centreTimezone),
    tokenNumber: ctx2.tokenNumber,
    ...extra
  };
  const tpl = await activeTemplate(client, event, CHANNEL, locale);
  let body;
  let templateId = null;
  if (tpl) {
    const r = renderTemplate(tpl.body_template, templateVarsFor(locale, renderContext));
    if (r.ok) {
      body = r.body;
      templateId = tpl.id;
    } else {
      log.warn(
        `notification template ${event}/${CHANNEL}/${locale} missing variables: ${r.missing.join(",")} \u2014 using built-in copy`
      );
      body = renderNotification(event, locale, renderContext).body;
    }
  } else {
    body = renderNotification(event, locale, renderContext).body;
  }
  const rendered = { body };
  return enqueue(client, {
    userId: ctx2.userId,
    bookingId,
    eventKey: event,
    channel: CHANNEL,
    locale,
    dedupeKey: dedupeKeyFor(event, {
      bookingId,
      serviceDate: ctx2.serviceDate,
      ...dedupeIds
    }),
    renderedBody: rendered.body,
    templateId,
    // IN_APP needs no phone; the schema only requires one for SMS.
    toPhoneE164: null
  });
}
function notifyBookingConfirmed(client, bookingId) {
  return enqueueForBooking(client, bookingId, "BOOKING_CONFIRMED");
}
function notifyBookingArrived(client, bookingId) {
  return enqueueForBooking(client, bookingId, "BOOKING_ARRIVED");
}
function notifyProcurementCompleted(client, bookingId, paymentStatus) {
  return enqueueForBooking(client, bookingId, "PROCUREMENT_COMPLETED", { paymentStatus });
}
function notifyPaymentBlocked(client, bookingId, paymentId, blockedReason) {
  return enqueueForBooking(
    client,
    bookingId,
    "PAYMENT_BLOCKED",
    { blockedReason },
    { paymentId }
  );
}
function notifyPaymentUpdated(client, bookingId, paymentId, paymentStatus, amountRupees) {
  return enqueueForBooking(
    client,
    bookingId,
    "PAYMENT_UPDATED",
    { paymentStatus, amountRupees },
    { paymentId, status: paymentStatus }
  );
}
function toView2(r) {
  const locale = normaliseLocale(r.locale);
  return {
    // The notification's own id is the address of the resource, so it is
    // exposed. No other identifier is: the booking appears as its public code,
    // and user_id / booking_id / template_id never leave the server.
    id: r.id,
    type: r.event_key,
    title: titleFor(r.event_key, locale),
    message: r.rendered_body,
    bookingCode: r.booking_code,
    locale,
    read: r.read_at !== null,
    readAt: r.read_at?.toISOString() ?? null,
    createdAt: r.created_at.toISOString(),
    delivery: {
      channel: r.channel,
      status: r.status,
      sentAt: r.sent_at?.toISOString() ?? null,
      attempts: r.attempts,
      // Stated on every row so no reader can mistake a DEMO record for a real
      // message having reached a phone.
      demo: r.provider_message_id === null ? null : r.provider_message_id.startsWith("DEMO-"),
      realSmsDelivered: false
    }
  };
}
async function listMine(userId, opts) {
  const rows = await listForUser(userId, opts);
  return {
    count: rows.length,
    unreadCount: await unreadCountForUser(userId),
    notifications: rows.map(toView2)
  };
}
async function unreadCount(userId) {
  return { unreadCount: await unreadCountForUser(userId) };
}
async function markRead2(userId, notificationId) {
  const ok = await markRead(userId, notificationId);
  return ok ? { id: notificationId, read: true } : null;
}
async function markAllRead2(userId) {
  return { updated: await markAllRead(userId) };
}
async function getPreferences(userId) {
  const rows = await listPreferences(userId);
  return {
    // Stated explicitly so a client never has to guess what an absent row means.
    defaultWhenUnset: "ENABLED",
    note: "Every notification Mandi Sahayak sends is transactional and about your own booking, procurement or payment.",
    preferences: rows.map((r) => ({
      channel: r.channel,
      event: r.event_key,
      scope: r.event_key === null ? "CHANNEL" : "EVENT",
      enabled: r.enabled
    }))
  };
}
async function updatePreference(userId, channel, event, enabled) {
  await setPreference(userId, channel, event, enabled);
  return getPreferences(userId);
}

// server/src/modules/bookings/bookings.service.ts
var MAX_BOOKING_ATTEMPTS = 3;
async function requireCentre(centreId, onDate, db = null) {
  const centre = await loadCentreContext(centreId, onDate, db);
  if (!centre || centre.status !== "ACTIVE") {
    throw unprocessable(ErrorCodes.CENTRE_NOT_AVAILABLE, "Centre is not available");
  }
  if (centre.lanes.length === 0) {
    throw unprocessable(ErrorCodes.CENTRE_NOT_AVAILABLE, "Centre has no active service lane");
  }
  return centre;
}
async function requireCropAtCentre(centreId, cropId, onDate, db = null) {
  const crop = await resolveCropAtCentre(centreId, cropId, onDate, db);
  if (!crop) {
    throw unprocessable(
      ErrorCodes.CROP_NOT_CONFIGURED_AT_CENTRE,
      "This centre does not accept that crop for the current season"
    );
  }
  return crop;
}
function centreToday(centre, now) {
  return localDateOf(now, centre.timezone);
}
async function resolveCentreForDate(centreId, requestedDate, now, db) {
  const todayUtc = localDateOf(now, "UTC");
  const asOfToday = await requireCentre(centreId, todayUtc, db);
  const fromDate = requestedDate ?? centreToday(asOfToday, now);
  assertWithinHorizon(asOfToday, fromDate, now);
  const centre = fromDate === todayUtc ? asOfToday : await requireCentre(centreId, fromDate, db);
  return { centre, fromDate };
}
function assertWithinHorizon(centre, fromDate, now) {
  const today = centreToday(centre, now);
  if (fromDate < today) {
    throw unprocessable(ErrorCodes.OUTSIDE_BOOKING_HORIZON, "Date is in the past");
  }
  const last = addDays(today, centre.config.bookingHorizonDays);
  if (fromDate > last) {
    throw unprocessable(ErrorCodes.OUTSIDE_BOOKING_HORIZON, "Date is beyond the booking horizon", {
      horizonDays: centre.config.bookingHorizonDays,
      latestDate: last
    });
  }
}
function storageCheckFor(centre) {
  if (centre.storageCheckMode === "DISABLED") {
    return { checkMode: "DISABLED", status: "NOT_EVALUATED", reasonCode: null };
  }
  return {
    checkMode: centre.storageCheckMode,
    status: "NOT_AVAILABLE",
    reasonCode: "NO_CAPACITY_DATA_FOR_CENTRE"
  };
}
async function findAvailability(input) {
  const now = input.now ?? /* @__PURE__ */ new Date();
  const db = input.db ?? null;
  const { centre, fromDate } = await resolveCentreForDate(input.centreId, input.fromDate, now, db);
  const crop = await requireCropAtCentre(input.centreId, input.cropId, fromDate, db);
  const loadDay2 = async (serviceDate) => ({
    serviceDate,
    timeZone: centre.timezone,
    hours: centre.hours,
    holidays: centre.holidays,
    lanes: centre.lanes,
    existing: await loadDayOccupancy(centre.centreId, serviceDate, db)
  });
  const result = await findEarliest(
    fromDate,
    centre.config.bookingHorizonDays,
    input.quantityKg,
    centre.config,
    now,
    loadDay2
  );
  const duration = durationBreakdown(input.quantityKg, centre.config);
  return { centre, crop, result, duration, storageCheck: storageCheckFor(centre), now };
}
function candidateToView(candidate, centre) {
  return {
    serviceDate: candidate.serviceDate,
    laneNo: candidate.laneNo,
    scheduledStartAt: candidate.startAt.toISOString(),
    // Deliberately equal to the start: no arrival lead time is configured, so
    // none is invented (design §11).
    estimatedApproachAt: candidate.startAt.toISOString(),
    processingEndAt: candidate.processingEndAt.toISOString(),
    windowEndAt: candidate.endAt.toISOString(),
    processingMinutes: candidate.processingMinutes,
    bufferMinutes: candidate.bufferMinutes,
    occupancyMinutes: candidate.occupancyMinutes,
    centreTimezone: centre.timezone
  };
}
function hashRequest(body) {
  return createHash2("sha256").update(JSON.stringify(body ?? null)).digest();
}
async function createBooking(input, ctx2) {
  let lastConflict = null;
  for (let attempt = 1; attempt <= MAX_BOOKING_ATTEMPTS; attempt += 1) {
    try {
      return await attemptCreate(input, ctx2, attempt);
    } catch (err) {
      if (err instanceof AppError && err.code === ErrorCodes.SLOT_NO_LONGER_AVAILABLE) {
        lastConflict = err;
        continue;
      }
      throw err;
    }
  }
  throw lastConflict ?? conflict(ErrorCodes.SLOT_NO_LONGER_AVAILABLE, "Could not secure a window after several attempts");
}
async function attemptCreate(input, ctx2, attempt) {
  return withTransaction(async (client) => {
    const claim = await claimIdempotencyKey(
      client,
      input.idempotencyKey,
      ctx2.userId,
      "POST /api/v1/bookings",
      input.requestHash
    );
    if (claim.kind === "replay") return { status: claim.status, body: claim.body };
    if (claim.kind === "conflict") {
      throw conflict(
        ErrorCodes.IDEMPOTENCY_KEY_REUSED,
        "This Idempotency-Key was already used with a different request"
      );
    }
    const farmerId = await farmerIdForUser(ctx2.userId, client);
    if (!farmerId) throw notFound("No farmer profile for this account");
    const now = /* @__PURE__ */ new Date();
    const { centre, fromDate } = await resolveCentreForDate(
      input.centreId,
      input.preferredDate,
      now,
      client
    );
    const crop = await requireCropAtCentre(input.centreId, input.cropId, fromDate, client);
    await lockDailyCapacity(client, centre.centreId, fromDate);
    const storageCheck = storageCheckFor(centre);
    const search2 = await findEarliest(
      fromDate,
      centre.config.bookingHorizonDays,
      input.quantityKg,
      centre.config,
      now,
      async (serviceDate) => ({
        serviceDate,
        timeZone: centre.timezone,
        hours: centre.hours,
        holidays: centre.holidays,
        lanes: centre.lanes,
        existing: await loadDayOccupancy(centre.centreId, serviceDate, client)
      })
    );
    if (!search2.found) {
      throw unprocessable(ErrorCodes.NO_AVAILABILITY, "No available window within the horizon", {
        reasonCode: search2.reason,
        horizonDays: centre.config.bookingHorizonDays
      });
    }
    const candidate = search2.candidate;
    if (candidate.serviceDate !== fromDate) {
      await lockDailyCapacity(client, centre.centreId, candidate.serviceDate);
    }
    const tokenNumber = await nextTokenNumber(client, centre.centreId, candidate.serviceDate);
    let row;
    try {
      row = await insertBooking(client, {
        bookingCode: generateBookingCode(candidate.serviceDate),
        farmerId,
        centreId: centre.centreId,
        cropId: input.cropId,
        seasonId: crop.seasonId,
        marketingYear: crop.marketingYear,
        laneNo: candidate.laneNo,
        quantityKg: input.quantityKg,
        serviceDate: candidate.serviceDate,
        startAt: candidate.startAt,
        endAt: candidate.endAt,
        processingMinutes: candidate.processingMinutes,
        occupancyMinutes: candidate.occupancyMinutes,
        tokenNumber,
        slotConfigId: centre.slotConfigId
      });
    } catch (err) {
      throw translateInsertError(err, attempt);
    }
    await bumpDailyCapacity(
      client,
      centre.centreId,
      candidate.serviceDate,
      input.quantityKg,
      candidate.occupancyMinutes,
      1
    );
    await recordStatusChange(client, row.id, null, "CONFIRMED", ctx2.userId, "Booking created");
    await writeAudit(client, {
      action: AuditActions.BOOKING_CREATED,
      entityType: "booking",
      entityId: row.id,
      actorUserId: ctx2.userId,
      actorRole: "FARMER",
      actorIp: ctx2.ip,
      requestId: ctx2.requestId,
      after: {
        bookingCode: row.booking_code,
        centre: centre.code,
        serviceDate: candidate.serviceDate,
        laneNo: candidate.laneNo,
        quantityKg: input.quantityKg,
        processingMinutes: candidate.processingMinutes,
        occupancyMinutes: candidate.occupancyMinutes
      },
      metadata: { attempt }
    });
    await notifyBookingConfirmed(client, row.id);
    const body = {
      data: bookingResponse(row, centre, crop.cropName, crop.seasonCode, storageCheck)
    };
    await storeIdempotentResponse(client, input.idempotencyKey, 201, body);
    return { status: 201, body };
  });
}
function translateInsertError(err, attempt) {
  const e = err;
  if (e.code === "23P01") {
    if (e.constraint === "bookings_no_farmer_overlap") {
      return conflict(
        ErrorCodes.FARMER_TIME_CONFLICT,
        "This overlaps another of your active bookings"
      );
    }
    return conflict(
      ErrorCodes.SLOT_NO_LONGER_AVAILABLE,
      `Window was taken during booking (attempt ${attempt})`
    );
  }
  if (e.code === "23505") {
    if (e.constraint === "bookings_no_duplicate_active_per_farmer_centre_crop_date") {
      return conflict(
        ErrorCodes.DUPLICATE_ACTIVE_BOOKING,
        "You already have an active booking for this crop at this centre on that date"
      );
    }
    return conflict(ErrorCodes.SLOT_NO_LONGER_AVAILABLE, "Identifier collision; retrying");
  }
  if (e.code === "23514") {
    return new AppError(400, ErrorCodes.VALIDATION_FAILED, "Booking violates a database constraint");
  }
  throw err;
}
function bookingResponse(row, centre, cropName, seasonCode, storageCheck) {
  const start = new Date(row.scheduled_start_at);
  const processingEnd = new Date(
    start.getTime() + Number(row.estimated_processing_minutes) * 6e4
  );
  return {
    bookingCode: row.booking_code,
    tokenNumber: row.token_number,
    status: row.status,
    displayStatus: displayStatusFor(row.status),
    centre: {
      code: centre.code,
      name: centre.name,
      district: centre.districtName ?? null,
      timezone: centre.timezone,
      dataType: centre.dataType ?? null
    },
    crop: { name: cropName, season: seasonCode, marketingYear: row.marketing_year },
    quantityKg: Number(row.requested_quantity_kg),
    serviceDate: row.service_date,
    laneNo: row.lane_no,
    scheduledStartAt: start.toISOString(),
    estimatedApproachAt: start.toISOString(),
    processingEndAt: processingEnd.toISOString(),
    windowEndAt: new Date(row.scheduled_end_at).toISOString(),
    processingMinutes: Number(row.estimated_processing_minutes),
    bufferMinutes: Number(row.occupancy_minutes) - Number(row.estimated_processing_minutes),
    occupancyMinutes: Number(row.occupancy_minutes),
    storageCheck
  };
}
function displayStatusFor(status) {
  switch (status) {
    case "CONFIRMED":
      return "BOOKED";
    case "ARRIVED":
      return "WAITING";
    default:
      return status;
  }
}
function viewToResponse(v) {
  return bookingResponse(
    v,
    {
      code: v.centre_code,
      name: v.centre_name,
      timezone: v.centre_timezone,
      districtName: v.district_name,
      dataType: v.centre_data_type
    },
    v.crop_name,
    v.season_code,
    v.centre_storage_check_mode === "DISABLED" ? { checkMode: "DISABLED", status: "NOT_EVALUATED", reasonCode: null } : {
      checkMode: v.centre_storage_check_mode,
      status: "NOT_AVAILABLE",
      reasonCode: "NO_CAPACITY_DATA_FOR_CENTRE"
    }
  );
}
async function listMyBookings(userId, includeInactive) {
  const farmerId = await farmerIdForUser(userId);
  if (!farmerId) throw notFound("No farmer profile for this account");
  const rows = await listForFarmer(farmerId, includeInactive);
  return rows.map(viewToResponse);
}
async function getMyBooking(userId, bookingCode) {
  const farmerId = await farmerIdForUser(userId);
  if (!farmerId) throw notFound("No farmer profile for this account");
  const row = await findOwnedByCode(bookingCode, farmerId);
  if (!row) throw notFound("Booking not found");
  return viewToResponse(row);
}
async function cancelBooking(userId, bookingCode, reason, ctx2) {
  return withTransaction(async (client) => {
    const farmerId = await farmerIdForUser(userId, client);
    if (!farmerId) throw notFound("No farmer profile for this account");
    const booking = await findOwnedByCodeForUpdate(client, bookingCode, farmerId);
    if (!booking) throw notFound("Booking not found");
    if (booking.status !== "CONFIRMED") {
      throw conflict(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `A booking in state ${booking.status} cannot be cancelled by the farmer`
      );
    }
    const centre = await loadCentreContext(
      (await client.query("SELECT centre_id FROM bookings WHERE booking_code = $1", [bookingCode])).rows[0].centre_id,
      booking.service_date,
      client
    );
    const cutoffHours = centre?.config.cancellationCutoffHours ?? 24;
    const deadline = new Date(
      new Date(booking.scheduled_start_at).getTime() - cutoffHours * 36e5
    );
    if (/* @__PURE__ */ new Date() >= deadline) {
      throw conflict(ErrorCodes.CANCELLATION_WINDOW_CLOSED, "The cancellation window has closed", {
        cutoffHours,
        deadline: deadline.toISOString()
      });
    }
    const updated = await client.query(
      `UPDATE bookings
          SET status = 'CANCELLED', cancelled_at = now(),
              cancellation_reason = $2, cancelled_by_user_id = $3
        WHERE booking_code = $1
        RETURNING id`,
      [bookingCode, reason, userId]
    );
    const bookingId = updated.rows[0].id;
    await bumpDailyCapacity(
      client,
      centre.centreId,
      booking.service_date,
      Number(booking.requested_quantity_kg),
      Number(booking.occupancy_minutes),
      -1
    );
    await recordStatusChange(client, bookingId, "CONFIRMED", "CANCELLED", userId, reason);
    await writeAudit(client, {
      action: AuditActions.BOOKING_CANCELLED,
      entityType: "booking",
      entityId: bookingId,
      actorUserId: userId,
      actorRole: "FARMER",
      actorIp: ctx2.ip,
      requestId: ctx2.requestId,
      before: { status: "CONFIRMED" },
      after: { status: "CANCELLED", reason }
    });
    return { bookingCode, status: "CANCELLED", displayStatus: "CANCELLED" };
  });
}

// server/src/modules/bookings/bookings.routes.ts
var BASE4 = "/api/v1";
var DateSchema = z5.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DATE_INVALID").optional();
var AvailabilitySchema = z5.object({
  centreId: z5.string().uuid("CENTRE_ID_INVALID"),
  cropId: z5.string().uuid("CROP_ID_INVALID"),
  quantityKg: QuantityKgSchema,
  fromDate: DateSchema
});
var CreateSchema = z5.object({
  centreId: z5.string().uuid("CENTRE_ID_INVALID"),
  cropId: z5.string().uuid("CROP_ID_INVALID"),
  quantityKg: QuantityKgSchema,
  preferredDate: DateSchema
});
var CancelSchema = z5.object({
  reason: z5.string().trim().max(280).optional()
});
var BookingCodeSchema = z5.string().regex(/^FQ-\d{4}-\d{7}$/, "BOOKING_CODE_INVALID");
function parse2(schema, body) {
  const r = schema.safeParse(body);
  if (!r.success) {
    const fields = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] = i.message;
    throw badRequest(ErrorCodes.VALIDATION_FAILED, "Request validation failed", fields);
  }
  return r.data;
}
function ctxOf2(req) {
  return {
    ip: req.clientIp ?? null,
    requestId: req.requestId ?? null,
    userId: req.actor.userId
  };
}
async function rejectRateLimited2(req, outcome) {
  await withTransaction(
    (client) => writeAudit(client, {
      action: AuditActions.RATE_LIMIT_EXCEEDED,
      entityType: "request",
      actorUserId: req.actor?.userId ?? null,
      actorRole: "FARMER",
      actorIp: req.clientIp ?? null,
      requestId: req.requestId ?? null,
      metadata: { rule: outcome.rule.name, hits: outcome.hits, path: req.path }
    })
  ).catch(() => {
  });
  return toError(outcome);
}
function buildBookingsRouter() {
  const router = Router4();
  declareRoute({
    method: "POST",
    path: `${BASE4}/bookings/availability`,
    auth: { kind: "permission", permission: "slot.query" },
    csrf: true,
    summary: "Find the earliest bookable window for a crop and quantity."
  });
  router.post(
    "/bookings/availability",
    requirePermission("slot.query"),
    asyncHandler(async (req, res) => {
      const input = parse2(AvailabilitySchema, req.body);
      const limited = await consumeAll([
        { rule: RateLimits.AVAILABILITY_PER_SESSION, subject: req.actor.sessionId }
      ]);
      if (limited) throw await rejectRateLimited2(req, limited);
      const { centre, crop, result, duration, storageCheck } = await findAvailability({
        centreId: input.centreId,
        cropId: input.cropId,
        quantityKg: input.quantityKg,
        fromDate: input.fromDate
      });
      sendData(res, 200, {
        centre: {
          code: centre.code,
          name: centre.name,
          district: centre.districtName,
          timezone: centre.timezone,
          laneCount: centre.lanes.length,
          dataType: centre.dataType
        },
        crop: { name: crop.cropName, season: crop.seasonCode, marketingYear: crop.marketingYear },
        quantityKg: input.quantityKg,
        duration,
        available: result.found,
        window: result.found ? candidateToView(result.candidate, centre) : null,
        reasonCode: result.found ? null : result.reason,
        horizonDays: centre.config.bookingHorizonDays,
        storageCheck
      });
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE4}/bookings`,
    auth: { kind: "permission", permission: "booking.create.own" },
    csrf: true,
    summary: "Reserve the earliest available window. Idempotent."
  });
  router.post(
    "/bookings",
    requirePermission("booking.create.own"),
    asyncHandler(async (req, res) => {
      const input = parse2(CreateSchema, req.body);
      const key = req.header("idempotency-key");
      if (!key || key.trim().length < 8 || key.length > 200) {
        throw badRequest(
          ErrorCodes.IDEMPOTENCY_KEY_REQUIRED,
          "An Idempotency-Key header of 8-200 characters is required"
        );
      }
      const limited = await consumeAll([
        { rule: RateLimits.BOOKING_CREATE_PER_FARMER, subject: req.actor.userId }
      ]);
      if (limited) throw await rejectRateLimited2(req, limited);
      const result = await createBooking(
        {
          centreId: input.centreId,
          cropId: input.cropId,
          quantityKg: input.quantityKg,
          preferredDate: input.preferredDate,
          idempotencyKey: key.trim(),
          requestHash: hashRequest(input)
        },
        ctxOf2(req)
      );
      res.status(result.status).json(result.body);
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE4}/bookings/me`,
    auth: { kind: "permission", permission: "booking.read.own" },
    csrf: false,
    summary: "List the authenticated farmer\u2019s own bookings."
  });
  router.get(
    "/bookings/me",
    requirePermission("booking.read.own"),
    asyncHandler(async (req, res) => {
      const includeInactive = String(req.query.includeInactive ?? "") === "true";
      sendData(res, 200, await listMyBookings(req.actor.userId, includeInactive));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE4}/bookings/:bookingCode`,
    auth: { kind: "permission", permission: "booking.read.own" },
    csrf: false,
    summary: "Fetch one of the authenticated farmer\u2019s own bookings by code."
  });
  router.get(
    "/bookings/:bookingCode",
    requirePermission("booking.read.own"),
    asyncHandler(async (req, res) => {
      const code = parse2(BookingCodeSchema, req.params.bookingCode);
      sendData(res, 200, await getMyBooking(req.actor.userId, code));
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE4}/bookings/:bookingCode/cancel`,
    auth: { kind: "permission", permission: "booking.cancel.own" },
    csrf: true,
    summary: "Cancel one of the authenticated farmer\u2019s own bookings."
  });
  router.post(
    "/bookings/:bookingCode/cancel",
    requirePermission("booking.cancel.own"),
    asyncHandler(async (req, res) => {
      const code = parse2(BookingCodeSchema, req.params.bookingCode);
      const body = parse2(CancelSchema, req.body ?? {});
      sendData(
        res,
        200,
        await cancelBooking(req.actor.userId, code, body.reason ?? null, ctxOf2(req))
      );
    })
  );
  return router;
}

// server/src/modules/officer/officer.routes.ts
import { Router as Router5 } from "express";
import { z as z6 } from "zod";

// server/src/modules/officer/officer.repository.ts
var OFFICER_SELECT = `
  SELECT v.*, u.full_name AS farmer_name, u.phone_e164 AS farmer_phone,
         vl.name AS village_name
    FROM ( ${BOOKING_SELECT} ) v
    JOIN farmers f ON f.id = v.farmer_id
    JOIN users u ON u.id = f.user_id
    LEFT JOIN villages vl ON vl.id = f.village_id`;
async function findByCodeInCentres(bookingCode, scope, db = null) {
  if (scope !== null && scope.length === 0) return null;
  const run = db ? db.query.bind(db) : query;
  const res = await run(
    `${OFFICER_SELECT}
      WHERE v.booking_code = $1
        AND ($2::uuid[] IS NULL OR v.centre_id = ANY($2::uuid[]))`,
    [bookingCode, scope]
  );
  return res.rows[0] ?? null;
}
async function listCentreDay(centreId, serviceDate, statuses) {
  const res = await query(
    `${OFFICER_SELECT}
      WHERE v.centre_id = $1 AND v.service_date_on = $2::date
        AND ($3::text[] IS NULL OR v.status = ANY($3::text[]))
      ORDER BY v.scheduled_start_at, v.token_number
      LIMIT 500`,
    [centreId, serviceDate, statuses]
  );
  return res.rows;
}
async function searchInCentres(scope, by) {
  if (scope !== null && scope.length === 0) return [];
  const res = await query(
    `${OFFICER_SELECT}
      WHERE ($1::uuid[] IS NULL OR v.centre_id = ANY($1::uuid[]))
        AND ( ($2::text IS NOT NULL AND v.booking_code = $2::text)
           OR ($3::int  IS NOT NULL AND v.token_number = $3::int)
           OR ($4::text IS NOT NULL AND u.phone_e164   = $4::text) )
      ORDER BY v.scheduled_start_at DESC
      LIMIT 50`,
    [
      scope,
      by.bookingCode ?? null,
      by.tokenNumber ?? null,
      by.phoneE164 ?? null
    ]
  );
  return res.rows;
}
async function lockBooking(client, bookingCode, scope) {
  if (scope !== null && scope.length === 0) return null;
  const res = await client.query(
    `SELECT id, centre_id, status
       FROM bookings
      WHERE booking_code = $1
        AND ($2::uuid[] IS NULL OR centre_id = ANY($2::uuid[]))
      FOR UPDATE`,
    [bookingCode, scope]
  );
  return res.rows[0] ?? null;
}
async function setBookingStatus(client, bookingId, to) {
  await client.query("UPDATE bookings SET status = $2 WHERE id = $1", [bookingId, to]);
}
async function markNoShow(client, bookingId, userId) {
  await client.query(
    `UPDATE bookings
        SET status = 'NO_SHOW', no_show_at = now(), no_show_by_user_id = $2
      WHERE id = $1`,
    [bookingId, userId]
  );
}
async function cancelAtCentre(client, bookingId, userId, reason) {
  await client.query(
    `UPDATE bookings
        SET status = 'CANCELLED', cancelled_at = now(),
            cancellation_reason = $3, cancelled_by_user_id = $2
      WHERE id = $1`,
    [bookingId, userId, reason]
  );
}
async function centreTimezone(centreId) {
  const res = await query(
    "SELECT timezone FROM procurement_centres WHERE id = $1",
    [centreId]
  );
  return res.rows[0]?.timezone ?? null;
}
async function centreDaySetup(centreId, serviceDate) {
  const res = await query(
    `SELECT pc.name, pc.code, pc.data_type, pc.storage_check_mode,
            h.opens_at::text  AS opens_at,
            h.closes_at::text AS closes_at,
            (SELECT count(*)::int FROM centre_service_lanes l
              WHERE l.centre_id = pc.id AND l.is_active) AS lane_count,
            s.reference_quantity_kg::text        AS reference_quantity_kg,
            s.reference_processing_minutes       AS reference_processing_minutes,
            s.max_daily_processing_kg::text      AS max_daily_processing_kg
       FROM procurement_centres pc
       LEFT JOIN centre_operating_hours h
              ON h.centre_id = pc.id
             AND h.day_of_week = EXTRACT(dow FROM $2::date)::int
             AND h.effective_from <= $2::date
             AND (h.effective_to IS NULL OR h.effective_to >= $2::date)
       LEFT JOIN centre_slot_configurations s
              ON s.centre_id = pc.id
             AND s.effective_from <= $2::date
             AND (s.effective_to IS NULL OR s.effective_to >= $2::date)
      WHERE pc.id = $1
      LIMIT 1`,
    [centreId, serviceDate]
  );
  return res.rows[0] ?? null;
}
async function centreCropRates(centreId) {
  const res = await query(
    `SELECT c.id AS crop_id, c.canonical_name,
            m.variety_or_grade,
            m.rate_per_quintal_paise::text AS rate_per_quintal_paise,
            m.marketing_year,
            m.data_type
       FROM centre_crop_configurations ccc
       JOIN crops c ON c.id = ccc.crop_id
       LEFT JOIN msp_rates m
              ON m.crop_id = ccc.crop_id
             AND m.status = 'ACTIVE'
             AND (ccc.marketing_year IS NULL OR m.marketing_year = ccc.marketing_year)
      WHERE ccc.centre_id = $1 AND ccc.is_active
      ORDER BY c.canonical_name, m.variety_or_grade NULLS FIRST`,
    [centreId]
  );
  return res.rows;
}
async function createProcurement(client, bookingId, centreId, officerUserId) {
  const res = await client.query(
    `INSERT INTO procurements (booking_id, centre_id, officer_user_id, arrived_at)
     VALUES ($1,$2,$3, now())
     RETURNING *`,
    [bookingId, centreId, officerUserId]
  );
  return res.rows[0];
}
async function findProcurement(bookingId, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run("SELECT * FROM procurements WHERE booking_id = $1", [bookingId]);
  return res.rows[0] ?? null;
}
async function startWeighing(client, bookingId) {
  await client.query(
    `UPDATE procurements SET service_started_at = now() WHERE booking_id = $1`,
    [bookingId]
  );
}
async function recordGross(client, bookingId, grossKg) {
  await client.query(
    `UPDATE procurements SET gross_quantity_kg = $2::numeric WHERE booking_id = $1`,
    [bookingId, grossKg]
  );
}
async function recordQuality(client, bookingId, input) {
  await client.query(
    `UPDATE procurements
        SET accepted_quantity_kg = $2::numeric,
            rejected_quantity_kg = $3::numeric,
            grade                = $4,
            moisture_percent     = $5::numeric,
            quality_status       = $6,
            rejection_reason     = $7
      WHERE booking_id = $1`,
    [
      bookingId,
      input.acceptedKg,
      input.rejectedKg,
      input.grade,
      input.moisturePercent,
      input.qualityStatus,
      input.rejectionReason
    ]
  );
}
async function completeProcurement(client, bookingId) {
  const res = await client.query(
    `UPDATE procurements
        SET status = 'COMPLETED', completed_at = now(), service_ended_at = now()
      WHERE booking_id = $1
      RETURNING *`,
    [bookingId]
  );
  return res.rows[0];
}
async function activeMspCandidates(cropId, seasonId, marketingYear, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(
    `SELECT id, rate_per_quintal_paise::text AS rate, variety_or_grade
       FROM msp_rates
      WHERE crop_id = $1 AND season_id = $2 AND marketing_year = $3
        AND status = 'ACTIVE'
      ORDER BY variety_or_grade NULLS FIRST`,
    [cropId, seasonId, marketingYear]
  );
  return res.rows.map(
    (r) => ({
      id: r.id,
      ratePerQuintalPaise: Number(r.rate),
      varietyOrGrade: r.variety_or_grade
    })
  );
}
async function insertResolvedPayment(client, procurementId, mspRateId, deductionsPaise = 0) {
  const res = await client.query(
    `INSERT INTO payments (
         procurement_id, msp_rate_id, rate_per_quintal_paise_snapshot,
         base_amount_paise, deductions_paise, amount_paise, status)
     SELECT p.id,
            r.id,
            r.rate_per_quintal_paise,
            ROUND(p.accepted_quantity_kg / 100.0 * r.rate_per_quintal_paise)::bigint,
            $3::bigint,
            GREATEST(
              ROUND(p.accepted_quantity_kg / 100.0 * r.rate_per_quintal_paise)::bigint - $3::bigint,
              0),
            'PENDING'
       FROM procurements p
       JOIN msp_rates r ON r.id = $2
      WHERE p.id = $1
     RETURNING *`,
    [procurementId, mspRateId, deductionsPaise]
  );
  return res.rows[0];
}
async function insertBlockedPayment(client, procurementId, reason) {
  const res = await client.query(
    `INSERT INTO payments (procurement_id, status, blocked_reason)
     VALUES ($1, 'BLOCKED', $2)
     RETURNING *`,
    [procurementId, reason]
  );
  return res.rows[0];
}
async function findPayment(procurementId, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run("SELECT * FROM payments WHERE procurement_id = $1", [procurementId]);
  return res.rows[0] ?? null;
}
async function lockPayment(client, procurementId) {
  const res = await client.query("SELECT * FROM payments WHERE procurement_id = $1 FOR UPDATE", [
    procurementId
  ]);
  return res.rows[0] ?? null;
}
async function updatePaymentStatus(client, paymentId, status, reference, userId) {
  const res = await client.query(
    `UPDATE payments
        SET status = $2,
            payment_reference = COALESCE($3, payment_reference),
            paid_at = CASE WHEN $2 = 'PAID' THEN now() ELSE paid_at END,
            updated_by_user_id = $4
      WHERE id = $1
      RETURNING *`,
    [paymentId, status, reference, userId]
  );
  return res.rows[0];
}
async function findOwnProcurement(farmerUserId, bookingCode) {
  const res = await query(
    `SELECT pr.*, b.booking_code
       FROM procurements pr
       JOIN bookings b ON b.id = pr.booking_id
       JOIN farmers f ON f.id = b.farmer_id
      WHERE b.booking_code = $1 AND f.user_id = $2`,
    [bookingCode, farmerUserId]
  );
  const row = res.rows[0];
  if (!row) return null;
  return { ...row, payment: await findPayment(row.id) };
}

// server/src/engines/procurement.ts
function deriveQualityStatus(grossKg, acceptedKg, rejectedKg) {
  if (acceptedKg === 0) return "REJECTED";
  if (rejectedKg === 0 && acceptedKg === grossKg) return "ACCEPTED";
  return "PARTIALLY_ACCEPTED";
}
function gradesMatch(a, b) {
  const norm = (v) => (v ?? "").trim().toLowerCase();
  return norm(a) === norm(b);
}
function resolveMspRate(candidates, recordedGrade) {
  const grades = candidates.map((c) => c.varietyOrGrade).filter((g) => g !== null);
  if (candidates.length === 0) {
    return { resolved: false, reason: "NO_ACTIVE_MSP", candidateGrades: [] };
  }
  if (candidates.length === 1) {
    return { resolved: true, rate: candidates[0] };
  }
  const grade = recordedGrade?.trim() ?? "";
  if (grade === "") {
    return { resolved: false, reason: "MSP_AMBIGUOUS", candidateGrades: grades };
  }
  const matches = candidates.filter((c) => gradesMatch(c.varietyOrGrade, grade));
  if (matches.length === 1) return { resolved: true, rate: matches[0] };
  if (matches.length === 0) {
    return { resolved: false, reason: "NO_ACTIVE_MSP", candidateGrades: grades };
  }
  return { resolved: false, reason: "MSP_AMBIGUOUS", candidateGrades: grades };
}
function paiseToRupeeString(paise) {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

// server/src/modules/officer/officer.service.ts
function toOfficerView(row) {
  return {
    bookingCode: row.booking_code,
    tokenNumber: row.token_number,
    status: row.status,
    displayStatus: displayStatusFor(row.status),
    farmer: {
      name: row.farmer_name,
      phone: row.farmer_phone,
      village: row.village_name,
      district: row.district_name
    },
    crop: {
      name: row.crop_name,
      season: row.season_code,
      marketingYear: row.marketing_year
    },
    centre: { code: row.centre_code, name: row.centre_name, timezone: row.centre_timezone },
    requestedQuantityKg: Number(row.requested_quantity_kg),
    serviceDate: row.service_date,
    laneNo: row.lane_no,
    scheduledStartAt: new Date(row.scheduled_start_at).toISOString(),
    windowEndAt: new Date(row.scheduled_end_at).toISOString(),
    processingMinutes: Number(row.estimated_processing_minutes)
  };
}
function num(v) {
  return v === null ? null : Number(v);
}
function toProcurementView(p) {
  return {
    status: p.status,
    qualityStatus: p.quality_status,
    arrivedAt: p.arrived_at?.toISOString() ?? null,
    serviceStartedAt: p.service_started_at?.toISOString() ?? null,
    serviceEndedAt: p.service_ended_at?.toISOString() ?? null,
    completedAt: p.completed_at?.toISOString() ?? null,
    grossQuantityKg: num(p.gross_quantity_kg),
    acceptedQuantityKg: num(p.accepted_quantity_kg),
    rejectedQuantityKg: num(p.rejected_quantity_kg),
    grade: p.grade,
    moisturePercent: num(p.moisture_percent),
    rejectionReason: p.rejection_reason
  };
}
function toPaymentView(p) {
  if (!p) return null;
  const amount = num(p.amount_paise);
  return {
    status: p.status,
    blockedReason: p.blocked_reason,
    currency: p.currency,
    ratePerQuintalPaise: num(p.rate_per_quintal_paise_snapshot),
    baseAmountPaise: num(p.base_amount_paise),
    deductionsPaise: Number(p.deductions_paise),
    deductionBreakdown: p.deduction_breakdown,
    amountPaise: amount,
    amountRupees: amount === null ? null : paiseToRupeeString(amount),
    paymentReference: p.payment_reference,
    paidAt: p.paid_at?.toISOString() ?? null
  };
}
async function lockInState(client, bookingCode, ctx2, allowedFrom) {
  const booking = await lockBooking(client, bookingCode, ctx2.scope);
  if (!booking) throw notFound("Booking not found");
  if (!allowedFrom.includes(booking.status)) {
    throw conflict(
      ErrorCodes.INVALID_STATE_TRANSITION,
      `A booking in state ${booking.status} does not accept this operation`,
      { currentStatus: booking.status, expected: allowedFrom }
    );
  }
  return booking;
}
async function audit(client, ctx2, action, bookingId, before, after, metadata = {}) {
  await writeAudit(client, {
    action,
    entityType: "booking",
    entityId: bookingId,
    actorUserId: ctx2.userId,
    actorRole: ctx2.role,
    actorIp: ctx2.ip,
    requestId: ctx2.requestId,
    before,
    after,
    metadata
  });
}
async function viewAfter(client, bookingCode, ctx2) {
  const row = await findByCodeInCentres(bookingCode, ctx2.scope, client);
  return toOfficerView(row);
}
async function requireProcurement(bookingId, client = null) {
  const p = await findProcurement(bookingId, client);
  if (!p) {
    throw notFound("No procurement record for this booking");
  }
  return p;
}
async function getBooking(bookingCode, ctx2) {
  const row = await findByCodeInCentres(bookingCode, ctx2.scope);
  if (!row) throw notFound("Booking not found");
  const procurement = await findProcurement(row.id);
  return {
    booking: toOfficerView(row),
    procurement: procurement ? toProcurementView(procurement) : null,
    payment: procurement ? toPaymentView(await findPayment(procurement.id)) : null
  };
}
async function listDay(centreId, serviceDate, statuses) {
  const rows = await listCentreDay(centreId, serviceDate, statuses);
  return {
    centreId,
    serviceDate,
    count: rows.length,
    bookings: rows.map(toOfficerView)
  };
}
async function search(q, ctx2) {
  const trimmed = q.trim();
  const by = {};
  if (/^FQ-\d{4}-\d{7}$/.test(trimmed)) by.bookingCode = trimmed;
  else if (/^\d{1,6}$/.test(trimmed)) by.tokenNumber = Number(trimmed);
  else if (/^\d{10}$/.test(trimmed)) by.phoneE164 = `+91${trimmed}`;
  else return { query: trimmed, count: 0, bookings: [] };
  const rows = await searchInCentres(ctx2.scope, by);
  return { query: trimmed, count: rows.length, bookings: rows.map(toOfficerView) };
}
async function recordArrival(bookingCode, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["CONFIRMED"]);
    await setBookingStatus(client, booking.id, "ARRIVED");
    const procurement = await createProcurement(
      client,
      booking.id,
      booking.centre_id,
      ctx2.userId
    );
    await recordStatusChange(client, booking.id, "CONFIRMED", "ARRIVED", ctx2.userId, null);
    await audit(client, ctx2, AuditActions.BOOKING_ARRIVED, booking.id, { status: "CONFIRMED" }, {
      status: "ARRIVED"
    });
    await notifyBookingArrived(client, booking.id);
    return {
      booking: await viewAfter(client, bookingCode, ctx2),
      procurement: toProcurementView(procurement)
    };
  });
}
async function markNoShow2(bookingCode, reason, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["CONFIRMED"]);
    const view = await findByCodeInCentres(bookingCode, ctx2.scope, client);
    await markNoShow(client, booking.id, ctx2.userId);
    await bumpDailyCapacity(
      client,
      booking.centre_id,
      view.service_date,
      Number(view.requested_quantity_kg),
      Number(view.occupancy_minutes),
      -1
    );
    await recordStatusChange(client, booking.id, "CONFIRMED", "NO_SHOW", ctx2.userId, reason);
    await audit(
      client,
      ctx2,
      AuditActions.BOOKING_NO_SHOW,
      booking.id,
      { status: "CONFIRMED" },
      { status: "NO_SHOW", reason }
    );
    return { booking: await viewAfter(client, bookingCode, ctx2) };
  });
}
async function cancelAtCentre2(bookingCode, reason, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, [
      "ARRIVED",
      "WEIGHING",
      "QUALITY_CHECK"
    ]);
    const view = await findByCodeInCentres(bookingCode, ctx2.scope, client);
    const from = booking.status;
    await cancelAtCentre(client, booking.id, ctx2.userId, reason);
    await bumpDailyCapacity(
      client,
      booking.centre_id,
      view.service_date,
      Number(view.requested_quantity_kg),
      Number(view.occupancy_minutes),
      -1
    );
    await recordStatusChange(client, booking.id, from, "CANCELLED", ctx2.userId, reason);
    await audit(
      client,
      ctx2,
      AuditActions.BOOKING_CANCELLED_AT_CENTRE,
      booking.id,
      { status: from },
      { status: "CANCELLED", reason }
    );
    return { booking: await viewAfter(client, bookingCode, ctx2) };
  });
}
async function startWeighing2(bookingCode, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["ARRIVED"]);
    await requireProcurement(booking.id, client);
    await setBookingStatus(client, booking.id, "WEIGHING");
    await startWeighing(client, booking.id);
    await recordStatusChange(client, booking.id, "ARRIVED", "WEIGHING", ctx2.userId, null);
    await audit(client, ctx2, AuditActions.WEIGHING_STARTED, booking.id, { status: "ARRIVED" }, {
      status: "WEIGHING"
    });
    return {
      booking: await viewAfter(client, bookingCode, ctx2),
      procurement: toProcurementView(await requireProcurement(booking.id, client))
    };
  });
}
async function recordWeight(bookingCode, grossKg, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["WEIGHING"]);
    const procurement = await requireProcurement(booking.id, client);
    if (procurement.gross_quantity_kg !== null) {
      throw conflict(ErrorCodes.WEIGHT_ALREADY_RECORDED, "Gross weight is already recorded");
    }
    await recordGross(client, booking.id, grossKg);
    await setBookingStatus(client, booking.id, "QUALITY_CHECK");
    await recordStatusChange(client, booking.id, "WEIGHING", "QUALITY_CHECK", ctx2.userId, null);
    await audit(
      client,
      ctx2,
      AuditActions.WEIGHT_RECORDED,
      booking.id,
      { grossQuantityKg: null },
      { grossQuantityKg: grossKg }
    );
    return {
      booking: await viewAfter(client, bookingCode, ctx2),
      procurement: toProcurementView(await requireProcurement(booking.id, client))
    };
  });
}
async function recordQuality2(bookingCode, input, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["QUALITY_CHECK"]);
    const procurement = await requireProcurement(booking.id, client);
    const gross = Number(procurement.gross_quantity_kg);
    if (input.acceptedKg + input.rejectedKg > gross) {
      throw badRequest(
        ErrorCodes.QUANTITY_EXCEEDS_GROSS,
        "Accepted plus rejected exceeds the recorded gross weight"
      );
    }
    if (input.rejectedKg > 0 && !input.rejectionReason) {
      throw badRequest(
        ErrorCodes.REJECTION_REASON_REQUIRED,
        "A rejection reason is required when any quantity is rejected"
      );
    }
    if (input.rejectedKg === 0 && input.rejectionReason) {
      throw badRequest(
        ErrorCodes.REJECTION_REASON_NOT_APPLICABLE,
        "A rejection reason is not applicable when nothing is rejected"
      );
    }
    const qualityStatus = deriveQualityStatus(gross, input.acceptedKg, input.rejectedKg);
    await recordQuality(client, booking.id, { ...input, qualityStatus });
    await setBookingStatus(client, booking.id, "PROCUREMENT_RECORDED");
    await recordStatusChange(
      client,
      booking.id,
      "QUALITY_CHECK",
      "PROCUREMENT_RECORDED",
      ctx2.userId,
      null
    );
    await audit(
      client,
      ctx2,
      AuditActions.QUALITY_RECORDED,
      booking.id,
      { qualityStatus: procurement.quality_status },
      {
        qualityStatus,
        acceptedQuantityKg: input.acceptedKg,
        rejectedQuantityKg: input.rejectedKg,
        grade: input.grade
      }
    );
    return {
      booking: await viewAfter(client, bookingCode, ctx2),
      procurement: toProcurementView(await requireProcurement(booking.id, client))
    };
  });
}
async function completeProcurement2(bookingCode, ctx2) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["PROCUREMENT_RECORDED"]);
    const view = await findByCodeInCentres(bookingCode, ctx2.scope, client);
    const procurement = await requireProcurement(booking.id, client);
    const completed = await completeProcurement(client, booking.id);
    const candidates = await activeMspCandidates(
      view.crop_id,
      view.season_id,
      view.marketing_year,
      client
    );
    const resolution = resolveMspRate(candidates, procurement.grade);
    let payment;
    if (resolution.resolved) {
      payment = await insertResolvedPayment(client, completed.id, resolution.rate.id);
      await audit(
        client,
        ctx2,
        AuditActions.PAYMENT_COMPUTED,
        booking.id,
        null,
        {
          mspRateId: resolution.rate.id,
          ratePerQuintalPaise: resolution.rate.ratePerQuintalPaise,
          amountPaise: Number(payment.amount_paise)
        },
        { grade: procurement.grade }
      );
    } else {
      payment = await insertBlockedPayment(client, completed.id, resolution.reason);
      await audit(client, ctx2, AuditActions.PAYMENT_BLOCKED, booking.id, null, {
        blockedReason: resolution.reason
      }, { grade: procurement.grade, candidateGrades: resolution.candidateGrades });
    }
    await setBookingStatus(client, booking.id, "PAYMENT_PENDING");
    await recordStatusChange(
      client,
      booking.id,
      "PROCUREMENT_RECORDED",
      "PAYMENT_PENDING",
      ctx2.userId,
      null
    );
    await audit(
      client,
      ctx2,
      AuditActions.PROCUREMENT_COMPLETED,
      booking.id,
      { status: "PROCUREMENT_RECORDED" },
      { status: "PAYMENT_PENDING" }
    );
    await notifyProcurementCompleted(client, booking.id, payment.status);
    if (payment.status === "BLOCKED") {
      await notifyPaymentBlocked(client, booking.id, payment.id, payment.blocked_reason);
    }
    return {
      booking: await viewAfter(client, bookingCode, ctx2),
      procurement: toProcurementView(completed),
      payment: toPaymentView(payment)
    };
  });
}
var PAYMENT_TRANSITIONS = {
  BLOCKED: [],
  PENDING: ["INITIATED", "ON_HOLD", "FAILED"],
  INITIATED: ["PAID", "FAILED", "ON_HOLD"],
  ON_HOLD: ["PENDING", "INITIATED", "FAILED"],
  FAILED: ["PENDING", "INITIATED"],
  PAID: []
};
async function updatePaymentStatus2(bookingCode, to, reference, ctx2, grade = null) {
  return withTransaction(async (client) => {
    const booking = await lockInState(client, bookingCode, ctx2, ["PAYMENT_PENDING"]);
    const procurement = await requireProcurement(booking.id, client);
    let payment = await lockPayment(client, procurement.id);
    if (!payment) throw conflict(ErrorCodes.PAYMENT_NOT_READY, "No payment record for this booking");
    if (payment.status === "BLOCKED") {
      const view2 = await findByCodeInCentres(bookingCode, ctx2.scope, client);
      const candidates = await activeMspCandidates(view2.crop_id, view2.season_id, view2.marketing_year, client);
      const targetGrade = grade || procurement.grade;
      const resolution = resolveMspRate(candidates, targetGrade);
      if (resolution.resolved) {
        const unblocked = await client.query(
          `UPDATE payments
              SET msp_rate_id = $2,
                  rate_per_quintal_paise_snapshot = r.rate_per_quintal_paise,
                  base_amount_paise = ROUND(p.accepted_quantity_kg / 100.0 * r.rate_per_quintal_paise)::bigint,
                  amount_paise = GREATEST(
                    ROUND(p.accepted_quantity_kg / 100.0 * r.rate_per_quintal_paise)::bigint - COALESCE(payments.deductions_paise, 0),
                    0
                  ),
                  status = 'PENDING',
                  blocked_reason = NULL,
                  updated_at = now()
             FROM procurements p
             JOIN msp_rates r ON r.id = $2
            WHERE payments.id = $1 AND p.id = payments.procurement_id
            RETURNING payments.*`,
          [payment.id, resolution.rate.id]
        );
        if (unblocked.rows.length > 0) {
          payment = unblocked.rows[0];
          if (grade) {
            await client.query(
              "UPDATE procurements SET grade = $2 WHERE id = $1",
              [procurement.id, grade]
            );
          }
        }
      } else {
        throw conflict(ErrorCodes.PAYMENT_BLOCKED, "This payment is blocked and cannot be advanced", {
          blockedReason: payment.blocked_reason
        });
      }
    }
    if (!(PAYMENT_TRANSITIONS[payment.status] ?? []).includes(to)) {
      throw conflict(
        ErrorCodes.INVALID_PAYMENT_TRANSITION,
        `A payment in state ${payment.status} cannot move to ${to}`,
        { currentStatus: payment.status }
      );
    }
    if (to === "PAID" && !reference && !payment.payment_reference) {
      throw badRequest(
        ErrorCodes.PAYMENT_REFERENCE_REQUIRED,
        "A payment reference is required to mark a payment PAID"
      );
    }
    const updated = await updatePaymentStatus(client, payment.id, to, reference, ctx2.userId);
    await writeAudit(client, {
      action: AuditActions.PAYMENT_STATUS_UPDATED,
      entityType: "payment",
      entityId: payment.id,
      actorUserId: ctx2.userId,
      actorRole: ctx2.role,
      actorIp: ctx2.ip,
      requestId: ctx2.requestId,
      before: { status: payment.status },
      after: { status: to, paymentReference: updated.payment_reference }
    });
    if (to === "PAID") {
      await setBookingStatus(client, booking.id, "COMPLETED");
      await recordStatusChange(
        client,
        booking.id,
        "PAYMENT_PENDING",
        "COMPLETED",
        ctx2.userId,
        null
      );
      await audit(
        client,
        ctx2,
        AuditActions.PROCUREMENT_COMPLETED,
        booking.id,
        { status: "PAYMENT_PENDING" },
        { status: "COMPLETED" }
      );
    }
    const view = toPaymentView(updated);
    await notifyPaymentUpdated(client, booking.id, payment.id, to, view.amountRupees);
    return {
      booking: await viewAfter(client, bookingCode, ctx2),
      payment: view
    };
  });
}
async function centreOverview(centreId, serviceDate, timezone) {
  const [setup, rates] = await Promise.all([
    centreDaySetup(centreId, serviceDate),
    centreCropRates(centreId)
  ]);
  if (!setup) throw notFound("Centre not found");
  const open = setup.opens_at !== null && setup.closes_at !== null;
  return {
    centre: {
      id: centreId,
      name: setup.name,
      code: setup.code,
      dataType: setup.data_type,
      timezone
    },
    serviceDate,
    /*
     * No operating-hours row for this weekday means the centre is closed that
     * day, not that its hours are unknown. `reasonCode` says which, so the
     * dashboard never renders an empty shift as "00:00 - 00:00".
     */
    hours: {
      open,
      opensAt: setup.opens_at,
      closesAt: setup.closes_at,
      reasonCode: open ? null : "NO_OPERATING_HOURS_FOR_DATE"
    },
    /*
     * Where capacity comes from. Null values mean no slot configuration is
     * effective on this date — the scheduler has nothing to divide the shift
     * by, so the dashboard must say so rather than imply unlimited capacity.
     */
    capacity: {
      laneCount: setup.lane_count,
      referenceQuantityKg: num(setup.reference_quantity_kg),
      referenceProcessingMinutes: setup.reference_processing_minutes,
      maxDailyProcessingKg: num(setup.max_daily_processing_kg),
      configured: setup.reference_processing_minutes !== null,
      reasonCode: setup.reference_processing_minutes !== null ? null : "NO_SLOT_CONFIGURATION_FOR_DATE"
    },
    crops: rates.map((r) => {
      const paise = num(r.rate_per_quintal_paise);
      return {
        cropId: r.crop_id,
        // The government's own wording; never translated or re-cased.
        canonicalName: r.canonical_name,
        varietyOrGrade: r.variety_or_grade,
        ratePerQuintalPaise: paise,
        ratePerQuintalRupees: paise === null ? null : paiseToRupeeString(paise),
        marketingYear: r.marketing_year,
        dataType: r.data_type,
        reasonCode: paise === null ? "NO_ACTIVE_MSP_RATE_FOR_CROP" : null
      };
    }),
    /*
     * D-10: no official centre-level capacity figure exists, and
     * 0006_storage.sql seeds none. A dashboard printing 0 kg, or inventing a
     * ceiling, would state a fact nobody published — so this reports a reason
     * instead of a number, exactly as availability does.
     */
    storage: setup.storage_check_mode === "DISABLED" ? { checkMode: "DISABLED", status: "NOT_EVALUATED", reasonCode: null } : {
      checkMode: setup.storage_check_mode,
      status: "NOT_AVAILABLE",
      reasonCode: "NO_CAPACITY_DATA_FOR_CENTRE"
    }
  };
}
async function getOwnProcurement(farmerUserId, bookingCode) {
  const row = await findOwnProcurement(farmerUserId, bookingCode);
  if (!row) throw notFound("No procurement record for this booking");
  return {
    bookingCode: row.booking_code,
    procurement: toProcurementView(row),
    payment: toPaymentView(row.payment)
  };
}
async function getOwnPayment(farmerUserId, bookingCode) {
  const row = await findOwnProcurement(farmerUserId, bookingCode);
  if (!row || !row.payment) throw notFound("No payment record for this booking");
  return { bookingCode: row.booking_code, payment: toPaymentView(row.payment) };
}

// server/src/modules/officer/officer.routes.ts
var BASE5 = "/api/v1";
var BookingCodeSchema2 = z6.string().regex(/^FQ-\d{4}-\d{7}$/, "BOOKING_CODE_INVALID");
var ReasonSchema = z6.object({ reason: z6.string().trim().max(280).optional() });
var WeightSchema = z6.object({ grossQuantityKg: WeighedKgSchema });
var QualitySchema = z6.object({
  acceptedQuantityKg: MeasuredKgSchema,
  rejectedQuantityKg: MeasuredKgSchema,
  grade: z6.string().trim().min(1).max(64).optional(),
  moisturePercent: z6.number().min(0, "MOISTURE_OUT_OF_RANGE").max(100, "MOISTURE_OUT_OF_RANGE").optional(),
  rejectionReason: z6.string().trim().min(1).max(280).optional()
});
var PaymentSchema = z6.object({
  status: z6.enum(["PENDING", "INITIATED", "PAID", "FAILED", "ON_HOLD"]),
  paymentReference: z6.string().trim().min(1).max(120).optional(),
  grade: z6.string().trim().min(1).max(64).optional()
});
function parse3(schema, body) {
  const r = schema.safeParse(body);
  if (!r.success) {
    const fields = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] = i.message;
    throw badRequest(ErrorCodes.VALIDATION_FAILED, "Request validation failed", fields);
  }
  return r.data;
}
function ctxOf3(req) {
  const actor = req.actor;
  const isAdmin = actor.roles.includes("ADMIN");
  return {
    userId: actor.userId,
    ip: req.clientIp ?? null,
    requestId: req.requestId ?? null,
    scope: isAdmin ? null : actor.centreIds,
    role: isAdmin ? "ADMIN" : "OFFICER"
  };
}
function buildOfficerRouter() {
  const router = Router5();
  const code = (req) => parse3(BookingCodeSchema2, req.params.bookingCode);
  declareRoute({
    method: "GET",
    path: `${BASE5}/officer/centres/:centreId/bookings`,
    auth: { kind: "permission", permission: "booking.read.centre" },
    csrf: false,
    summary: "List one day of bookings at an assigned centre, in service order."
  });
  router.get(
    "/officer/centres/:centreId/bookings",
    requirePermission("booking.read.centre"),
    asyncHandler(async (req, res) => {
      const centreId = parse3(z6.string().uuid("CENTRE_ID_INVALID"), req.params.centreId);
      if (!actorMayActOnCentre(req.actor, centreId)) throw notFound("Centre not found");
      const timezone = await centreTimezone(centreId);
      if (!timezone) throw notFound("Centre not found");
      const date = req.query.date ? parse3(z6.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DATE_INVALID"), req.query.date) : localDateOf(/* @__PURE__ */ new Date(), timezone);
      const statusParam = typeof req.query.status === "string" ? req.query.status : "";
      const statuses = statusParam ? statusParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) : null;
      sendData(res, 200, await listDay(centreId, date, statuses));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE5}/officer/centres/:centreId/overview`,
    auth: { kind: "permission", permission: "booking.read.centre" },
    csrf: false,
    summary: "Shift hours, lane/slot capacity, accepted crops with MSP, and storage position."
  });
  router.get(
    "/officer/centres/:centreId/overview",
    requirePermission("booking.read.centre"),
    asyncHandler(async (req, res) => {
      const centreId = parse3(z6.string().uuid("CENTRE_ID_INVALID"), req.params.centreId);
      if (!actorMayActOnCentre(req.actor, centreId)) throw notFound("Centre not found");
      const timezone = await centreTimezone(centreId);
      if (!timezone) throw notFound("Centre not found");
      const date = req.query.date ? parse3(z6.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DATE_INVALID"), req.query.date) : localDateOf(/* @__PURE__ */ new Date(), timezone);
      sendData(res, 200, await centreOverview(centreId, date, timezone));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE5}/officer/bookings/search`,
    auth: { kind: "permission", permission: "booking.search.centre" },
    csrf: false,
    summary: "Find bookings at assigned centres by code, token or phone."
  });
  router.get(
    "/officer/bookings/search",
    requirePermission("booking.search.centre"),
    asyncHandler(async (req, res) => {
      const q = parse3(z6.string().trim().min(1).max(40), req.query.q);
      const limited = await consumeAll([
        { rule: RateLimits.OFFICER_SEARCH_PER_SESSION, subject: req.actor.sessionId }
      ]);
      if (limited) {
        await withTransaction(
          (client) => writeAudit(client, {
            action: AuditActions.RATE_LIMIT_EXCEEDED,
            entityType: "request",
            actorUserId: req.actor.userId,
            actorRole: "OFFICER",
            actorIp: req.clientIp ?? null,
            requestId: req.requestId ?? null,
            metadata: { rule: limited.rule.name, hits: limited.hits, path: req.path }
          })
        ).catch(() => {
        });
        throw toError(limited);
      }
      sendData(res, 200, await search(q, ctxOf3(req)));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE5}/officer/bookings/:bookingCode`,
    auth: { kind: "permission", permission: "booking.read.centre" },
    csrf: false,
    summary: "Read one booking with its procurement and payment record."
  });
  router.get(
    "/officer/bookings/:bookingCode",
    requirePermission("booking.read.centre"),
    asyncHandler(async (req, res) => {
      sendData(res, 200, await getBooking(code(req), ctxOf3(req)));
    })
  );
  const transition = (path, permission, summary, handler2) => {
    declareRoute({
      method: "POST",
      path: `${BASE5}/officer/bookings/:bookingCode/${path}`,
      auth: { kind: "permission", permission },
      csrf: true,
      summary
    });
    router.post(
      `/officer/bookings/:bookingCode/${path}`,
      requirePermission(permission),
      asyncHandler(async (req, res) => {
        sendData(res, 200, await handler2(req));
      })
    );
  };
  transition(
    "arrive",
    "booking.advance_state",
    "Record the farmer arriving at the centre.",
    (req) => recordArrival(code(req), ctxOf3(req))
  );
  transition("no-show", "booking.mark_no_show", "Record that the farmer did not arrive.", (req) => {
    const body = parse3(ReasonSchema, req.body ?? {});
    return markNoShow2(code(req), body.reason ?? null, ctxOf3(req));
  });
  transition(
    "weighing",
    "booking.advance_state",
    "Begin weighing.",
    (req) => startWeighing2(code(req), ctxOf3(req))
  );
  transition("weight", "procurement.record_weight", "Record the gross weight.", (req) => {
    const body = parse3(WeightSchema, req.body);
    return recordWeight(code(req), body.grossQuantityKg, ctxOf3(req));
  });
  transition("quality", "procurement.record_quality", "Record the quality assessment.", (req) => {
    const body = parse3(QualitySchema, req.body);
    return recordQuality2(
      code(req),
      {
        acceptedKg: body.acceptedQuantityKg,
        rejectedKg: body.rejectedQuantityKg,
        grade: body.grade ?? null,
        moisturePercent: body.moisturePercent ?? null,
        rejectionReason: body.rejectionReason ?? null
      },
      ctxOf3(req)
    );
  });
  transition(
    "complete",
    "procurement.complete",
    "Close the procurement and compute the MSP entitlement.",
    (req) => completeProcurement2(code(req), ctxOf3(req))
  );
  transition("cancel", "booking.advance_state", "Cancel a booking at the centre.", (req) => {
    const body = parse3(ReasonSchema, req.body ?? {});
    return cancelAtCentre2(code(req), body.reason ?? null, ctxOf3(req));
  });
  transition("payment", "payment.update_status", "Update the payment status.", (req) => {
    const body = parse3(PaymentSchema, req.body);
    return updatePaymentStatus2(
      code(req),
      body.status,
      body.paymentReference ?? null,
      ctxOf3(req),
      body.grade ?? null
    );
  });
  declareRoute({
    method: "GET",
    path: `${BASE5}/bookings/:bookingCode/procurement`,
    auth: { kind: "permission", permission: "procurement.read.own" },
    csrf: false,
    summary: "Read the procurement record for one of the farmer\u2019s own bookings."
  });
  router.get(
    "/bookings/:bookingCode/procurement",
    requirePermission("procurement.read.own"),
    asyncHandler(async (req, res) => {
      sendData(res, 200, await getOwnProcurement(req.actor.userId, code(req)));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE5}/bookings/:bookingCode/payment`,
    auth: { kind: "permission", permission: "payment.read.own" },
    csrf: false,
    summary: "Read the payment record for one of the farmer\u2019s own bookings."
  });
  router.get(
    "/bookings/:bookingCode/payment",
    requirePermission("payment.read.own"),
    asyncHandler(async (req, res) => {
      sendData(res, 200, await getOwnPayment(req.actor.userId, code(req)));
    })
  );
  return router;
}

// server/src/modules/queue/queue.routes.ts
import { Router as Router6 } from "express";
import { z as z7 } from "zod";

// server/src/engines/queue.ts
var TERMINAL = /* @__PURE__ */ new Set(["CANCELLED", "NO_SHOW", "COMPLETED"]);
function queueStateOf(m) {
  if (TERMINAL.has(m.status)) return "NOT_IN_QUEUE";
  if (m.serviceEndedAt !== null) return "NOT_IN_QUEUE";
  if (m.serviceStartedAt !== null) return "IN_SERVICE";
  return "WAITING";
}
function isInQueue(m) {
  return queueStateOf(m) !== "NOT_IN_QUEUE";
}
var MS_PER_MINUTE = 6e4;
function addMinutes(at, minutes) {
  return new Date(at.getTime() + minutes * MS_PER_MINUTE);
}
function minutesBetween(from, to) {
  return Math.ceil((to.getTime() - from.getTime()) / MS_PER_MINUTE);
}
function laterOf(a, b) {
  return a.getTime() >= b.getTime() ? a : b;
}
function byScheduleThenLaneThenToken(a, b) {
  const t = a.scheduledStartAt.getTime() - b.scheduledStartAt.getTime();
  if (t !== 0) return t;
  if (a.laneNo !== b.laneNo) return a.laneNo - b.laneNo;
  return a.tokenNumber - b.tokenNumber;
}
function projectQueue(members, now, config, isFutureDate = false) {
  const active = members.filter(isInQueue).sort(byScheduleThenLaneThenToken);
  const laneFreeAt = /* @__PURE__ */ new Map();
  const projected = [];
  for (const m of active) {
    const state = queueStateOf(m);
    let projectedStartAt;
    let projectedEndAt;
    let etaConfidence;
    if (state === "IN_SERVICE") {
      const elapsed = minutesBetween(m.serviceStartedAt, now);
      const remaining = Math.max(config.minimumProcessingMinutes, m.processingMinutes - elapsed);
      projectedStartAt = m.serviceStartedAt;
      projectedEndAt = addMinutes(now, remaining);
      etaConfidence = "OBSERVED";
    } else {
      const laneFree = laneFreeAt.get(m.laneNo) ?? now;
      projectedStartAt = laterOf(m.scheduledStartAt, laneFree);
      projectedEndAt = addMinutes(projectedStartAt, m.processingMinutes);
      etaConfidence = isFutureDate ? "SCHEDULED" : "PROJECTED";
    }
    laneFreeAt.set(m.laneNo, addMinutes(projectedEndAt, config.transitionBufferMinutes));
    projected.push({
      bookingCode: m.bookingCode,
      tokenNumber: m.tokenNumber,
      laneNo: m.laneNo,
      status: m.status,
      queueState: state,
      scheduledStartAt: m.scheduledStartAt,
      processingMinutes: m.processingMinutes,
      projectedStartAt,
      projectedEndAt,
      waitMinutes: Math.max(0, minutesBetween(now, projectedStartAt)),
      etaConfidence
    });
  }
  projected.sort((a, b) => {
    const t = a.projectedStartAt.getTime() - b.projectedStartAt.getTime();
    if (t !== 0) return t;
    if (a.laneNo !== b.laneNo) return a.laneNo - b.laneNo;
    return a.tokenNumber - b.tokenNumber;
  });
  const seenOnLane = /* @__PURE__ */ new Map();
  return projected.map((p, i) => {
    const aheadOnLane = seenOnLane.get(p.laneNo) ?? 0;
    seenOnLane.set(p.laneNo, aheadOnLane + 1);
    return { ...p, position: i + 1, aheadAtCentre: i, aheadOnLane };
  });
}
function laneViews(projectedMembers, lanes) {
  return [...lanes].sort((a, b) => a - b).map((laneNo) => {
    const onLane = projectedMembers.filter((m) => m.laneNo === laneNo);
    const waiting = onLane.filter((m) => m.queueState === "WAITING");
    return {
      laneNo,
      nowServing: onLane.find((m) => m.queueState === "IN_SERVICE") ?? null,
      next: waiting[0] ?? null,
      waitingCount: waiting.length
    };
  });
}
function servingTokenOnLane(projectedMembers, laneNo) {
  const serving = projectedMembers.find(
    (m) => m.laneNo === laneNo && m.queueState === "IN_SERVICE"
  );
  return serving ? serving.tokenNumber : null;
}
function etaUnavailableReason(m, serviceDate, todayAtCentre2) {
  if (TERMINAL.has(m.status)) return "BOOKING_NOT_ACTIVE";
  if (m.serviceEndedAt !== null) return "SERVICE_COMPLETE";
  if (serviceDate < todayAtCentre2) return "SERVICE_DATE_PAST";
  return null;
}
function etaBasisFor(confidence) {
  switch (confidence) {
    case "OBSERVED":
      return "Service has started; the remaining time is the configured processing time for this booking less elapsed time, floored at the configured minimum.";
    case "PROJECTED":
      return "Configured processing time for this booking's quantity, advanced along this lane by observed service timestamps.";
    case "SCHEDULED":
      return "The reserved window. The service date is in the future, so no arrival or service has been recorded and this is not a live estimate.";
    // falls through to UNAVAILABLE
    default:
      return "No estimate is available.";
  }
}

// server/src/modules/queue/queue.repository.ts
async function loadCentreDay(centreId, serviceDate, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(
    `SELECT b.booking_code, b.token_number, b.lane_no, b.status,
            b.scheduled_start_at, b.estimated_processing_minutes,
            b.farmer_id,
            pr.service_started_at, pr.service_ended_at,
            u.full_name AS farmer_name, u.phone_e164 AS farmer_phone
       FROM bookings b
       LEFT JOIN procurements pr ON pr.booking_id = b.id
       JOIN farmers f ON f.id = b.farmer_id
       JOIN users u ON u.id = f.user_id
      WHERE b.centre_id = $1 AND b.service_date = $2::date
      ORDER BY b.scheduled_start_at, b.lane_no, b.token_number`,
    [centreId, serviceDate]
  );
  return res.rows.map((r) => ({
    bookingCode: r.booking_code,
    tokenNumber: Number(r.token_number),
    laneNo: Number(r.lane_no),
    status: r.status,
    scheduledStartAt: r.scheduled_start_at,
    processingMinutes: Number(r.estimated_processing_minutes),
    serviceStartedAt: r.service_started_at,
    serviceEndedAt: r.service_ended_at,
    farmerId: r.farmer_id,
    farmerName: r.farmer_name,
    farmerPhone: r.farmer_phone
  }));
}
async function findOwnBookingForQueue(farmerUserId, bookingCode) {
  const res = await query(
    `SELECT b.centre_id, b.service_date::text AS service_date, b.farmer_id
       FROM bookings b
       JOIN farmers f ON f.id = b.farmer_id
      WHERE b.booking_code = $1 AND f.user_id = $2`,
    [bookingCode, farmerUserId]
  );
  const r = res.rows[0];
  return r ? { centreId: r.centre_id, serviceDate: r.service_date, farmerId: r.farmer_id } : null;
}

// server/src/modules/queue/queue.service.ts
async function loadDay(centreId, serviceDate, now) {
  const identity = await loadCentreContext(centreId, localDateOf(now, "UTC"));
  if (!identity) return null;
  const todayAtCentreDate = localDateOf(now, identity.timezone);
  const onDate = serviceDate === localDateOf(now, "UTC") ? identity : await loadCentreContext(centreId, serviceDate);
  const rows = await loadCentreDay(centreId, serviceDate);
  const config = onDate ? {
    minimumProcessingMinutes: onDate.config.minimumProcessingMinutes,
    transitionBufferMinutes: onDate.config.transitionBufferMinutes
  } : null;
  const isFutureDate = serviceDate > todayAtCentreDate;
  return {
    centre: identity,
    rows,
    config,
    todayAtCentre: todayAtCentreDate,
    isFutureDate,
    projected: config ? projectQueue(rows, now, config, isFutureDate) : []
  };
}
function iso(d) {
  return d === null ? null : d.toISOString();
}
async function getOwnQueue(farmerUserId, bookingCode) {
  const owned = await findOwnBookingForQueue(farmerUserId, bookingCode);
  if (!owned) throw notFound("Booking not found");
  const now = /* @__PURE__ */ new Date();
  const day = await loadDay(owned.centreId, owned.serviceDate, now);
  if (!day) throw notFound("Booking not found");
  const row = day.rows.find((r) => r.bookingCode === bookingCode);
  if (!row) throw notFound("Booking not found");
  const pollAfterSeconds = getConfig().QUEUE_POLL_AFTER_SECONDS;
  const state = queueStateOf(row);
  const unavailable = etaUnavailableReason(row, owned.serviceDate, day.todayAtCentre) ?? (day.config === null ? "CENTRE_CONFIGURATION_UNAVAILABLE" : null);
  const me = day.projected.find(
    (p) => p.bookingCode === bookingCode
  );
  const showQueue = unavailable === null && me !== void 0;
  const confidence = showQueue ? me.etaConfidence : "UNAVAILABLE";
  return {
    bookingCode: row.bookingCode,
    tokenNumber: row.tokenNumber,
    status: row.status,
    displayStatus: displayStatusFor(row.status),
    queueState: state,
    inQueue: isInQueue(row),
    queuePosition: showQueue ? me.position : null,
    aheadAtCentre: showQueue ? me.aheadAtCentre : null,
    aheadOnLane: showQueue ? me.aheadOnLane : null,
    activeQueueSize: day.config === null ? null : day.projected.length,
    laneNo: row.laneNo,
    laneCount: day.centre.lanes.length,
    currentlyServingToken: servingTokenOnLane(day.projected, row.laneNo),
    estimatedStartAt: showQueue ? iso(me.projectedStartAt) : null,
    estimatedEndAt: showQueue ? iso(me.projectedEndAt) : null,
    estimatedWaitMinutes: showQueue ? me.waitMinutes : null,
    etaConfidence: confidence,
    etaUnavailableReason: unavailable,
    etaBasis: etaBasisFor(confidence),
    scheduledStartAt: iso(row.scheduledStartAt),
    serviceDate: owned.serviceDate,
    centreTimezone: day.centre.timezone,
    observedAt: now.toISOString(),
    serverTime: now.toISOString(),
    pollAfterSeconds
  };
}
function memberView(p, rows) {
  const row = rows.find((r) => r.bookingCode === p.bookingCode);
  return {
    position: p.position,
    bookingCode: p.bookingCode,
    tokenNumber: p.tokenNumber,
    laneNo: p.laneNo,
    status: p.status,
    displayStatus: displayStatusFor(p.status),
    queueState: p.queueState,
    aheadOnLane: p.aheadOnLane,
    // An officer calling the next farmer has to be able to identify them.
    // Same disclosure as /officer/centres/:centreId/bookings, already shipped.
    farmer: { name: row.farmerName, phone: row.farmerPhone },
    scheduledStartAt: iso(p.scheduledStartAt),
    projectedStartAt: iso(p.projectedStartAt),
    projectedEndAt: iso(p.projectedEndAt),
    waitMinutes: p.waitMinutes,
    etaConfidence: p.etaConfidence
  };
}
function brief(p) {
  if (!p) return null;
  return {
    bookingCode: p.bookingCode,
    tokenNumber: p.tokenNumber,
    projectedStartAt: iso(p.projectedStartAt),
    projectedEndAt: iso(p.projectedEndAt)
  };
}
async function getCentreQueue(centreId, serviceDate) {
  const now = /* @__PURE__ */ new Date();
  const day = await loadDay(centreId, serviceDate, now);
  if (!day) throw notFound("Centre not found");
  if (day.config === null) {
    throw unprocessable(
      ErrorCodes.CENTRE_NOT_AVAILABLE,
      "No centre configuration is in force on that date",
      { serviceDate }
    );
  }
  const lanes = laneViews(day.projected, day.centre.lanes);
  return {
    centreCode: day.centre.code,
    centreName: day.centre.name,
    serviceDate,
    centreTimezone: day.centre.timezone,
    activeQueueSize: day.projected.length,
    lanes: lanes.map((l) => ({
      laneNo: l.laneNo,
      nowServing: brief(l.nowServing),
      next: brief(l.next),
      waitingCount: l.waitingCount
    })),
    queue: day.projected.map((p) => memberView(p, day.rows)),
    observedAt: now.toISOString(),
    serverTime: now.toISOString(),
    pollAfterSeconds: getConfig().QUEUE_POLL_AFTER_SECONDS
  };
}
async function todayAtCentre(centreId) {
  const now = /* @__PURE__ */ new Date();
  const probe = localDateOf(now, "UTC");
  const centre = await loadCentreContext(centreId, probe);
  if (!centre) return null;
  return localDateOf(now, centre.timezone);
}

// server/src/modules/queue/queue.routes.ts
var BASE6 = "/api/v1";
var BookingCodeSchema3 = z7.string().regex(/^FQ-\d{4}-\d{7}$/, "BOOKING_CODE_INVALID");
var CentreIdSchema = z7.string().uuid("CENTRE_ID_INVALID");
var DateSchema2 = z7.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DATE_INVALID");
function parse4(schema, value) {
  const r = schema.safeParse(value);
  if (!r.success) {
    const fields = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] = i.message;
    throw badRequest(ErrorCodes.VALIDATION_FAILED, "Request validation failed", fields);
  }
  return r.data;
}
async function limit(req, rule, role) {
  const outcome = await consumeAll([{ rule, subject: req.actor.sessionId }]);
  if (!outcome) return;
  await withTransaction(
    (client) => writeAudit(client, {
      action: AuditActions.RATE_LIMIT_EXCEEDED,
      entityType: "request",
      actorUserId: req.actor.userId,
      actorRole: role,
      actorIp: req.clientIp ?? null,
      requestId: req.requestId ?? null,
      metadata: { rule: outcome.rule.name, hits: outcome.hits, path: req.path }
    })
  ).catch(() => {
  });
  throw toError(outcome);
}
function buildQueueRouter() {
  const router = Router6();
  declareRoute({
    method: "GET",
    path: `${BASE6}/bookings/:bookingCode/queue`,
    auth: { kind: "permission", permission: "queue.read.own" },
    csrf: false,
    summary: "Live queue position and ETA for one of the farmer\u2019s own bookings."
  });
  router.get(
    "/bookings/:bookingCode/queue",
    requirePermission("queue.read.own"),
    asyncHandler(async (req, res) => {
      const code = parse4(BookingCodeSchema3, req.params.bookingCode);
      await limit(req, RateLimits.QUEUE_READ_PER_SESSION, "FARMER");
      sendData(res, 200, await getOwnQueue(req.actor.userId, code));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE6}/officer/centres/:centreId/queue`,
    auth: { kind: "permission", permission: "queue.read.centre" },
    csrf: false,
    summary: "Live per-lane queue for an assigned centre."
  });
  router.get(
    "/officer/centres/:centreId/queue",
    requirePermission("queue.read.centre"),
    asyncHandler(async (req, res) => {
      const centreId = parse4(CentreIdSchema, req.params.centreId);
      if (!actorMayActOnCentre(req.actor, centreId)) throw notFound("Centre not found");
      await limit(req, RateLimits.OFFICER_QUEUE_PER_SESSION, "OFFICER");
      const today = await todayAtCentre(centreId);
      if (!today) throw notFound("Centre not found");
      const date = req.query.date ? parse4(DateSchema2, req.query.date) : today;
      sendData(res, 200, await getCentreQueue(centreId, date));
    })
  );
  return router;
}

// server/src/modules/notifications/notifications.routes.ts
import { Router as Router7 } from "express";
import { z as z8 } from "zod";
var BASE7 = "/api/v1";
var IdSchema = z8.string().uuid("NOTIFICATION_ID_INVALID");
var LimitSchema = z8.coerce.number().int().min(1).max(100).default(50);
var PreferenceSchema = z8.object({
  channel: z8.enum(["SMS", "IN_APP"]),
  /** Omitted or null = a channel-wide preference. */
  event: z8.enum([
    "BOOKING_CONFIRMED",
    "BOOKING_ARRIVED",
    "BOOKING_CANCELLED",
    "ONE_DAY_REMINDER",
    "QUEUE_APPROACHING",
    "TURN_APPROACHING",
    "PROCUREMENT_COMPLETED",
    "PAYMENT_UPDATED",
    "PAYMENT_BLOCKED",
    "NO_SHOW_RECORDED"
  ]).nullable().optional(),
  enabled: z8.boolean()
});
function parse5(schema, value) {
  const r = schema.safeParse(value);
  if (!r.success) {
    const fields = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] = i.message;
    throw badRequest(ErrorCodes.VALIDATION_FAILED, "Request validation failed", fields);
  }
  return r.data;
}
async function limit2(req) {
  const outcome = await consumeAll([
    { rule: RateLimits.NOTIFICATION_READ_PER_SESSION, subject: req.actor.sessionId }
  ]);
  if (!outcome) return;
  await withTransaction(
    (client) => writeAudit(client, {
      action: AuditActions.RATE_LIMIT_EXCEEDED,
      entityType: "request",
      actorUserId: req.actor.userId,
      actorRole: "FARMER",
      actorIp: req.clientIp ?? null,
      requestId: req.requestId ?? null,
      metadata: { rule: outcome.rule.name, hits: outcome.hits, path: req.path }
    })
  ).catch(() => {
  });
  throw toError(outcome);
}
function buildNotificationsRouter() {
  const router = Router7();
  declareRoute({
    method: "GET",
    path: `${BASE7}/notifications`,
    auth: { kind: "permission", permission: "notification.read.own" },
    csrf: false,
    summary: "List the authenticated farmer\u2019s own notifications."
  });
  router.get(
    "/notifications",
    requirePermission("notification.read.own"),
    asyncHandler(async (req, res) => {
      await limit2(req);
      const unreadOnly = String(req.query.unread ?? "") === "true";
      const lim = parse5(LimitSchema, req.query.limit ?? 50);
      sendData(res, 200, await listMine(req.actor.userId, { unreadOnly, limit: lim }));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE7}/notifications/unread-count`,
    auth: { kind: "permission", permission: "notification.read.own" },
    csrf: false,
    summary: "Count the authenticated farmer\u2019s unread notifications."
  });
  router.get(
    "/notifications/unread-count",
    requirePermission("notification.read.own"),
    asyncHandler(async (req, res) => {
      await limit2(req);
      sendData(res, 200, await unreadCount(req.actor.userId));
    })
  );
  declareRoute({
    method: "GET",
    path: `${BASE7}/notifications/preferences`,
    auth: { kind: "permission", permission: "notification.read.own" },
    csrf: false,
    summary: "Read the authenticated farmer\u2019s own notification preferences."
  });
  router.get(
    "/notifications/preferences",
    requirePermission("notification.read.own"),
    asyncHandler(async (req, res) => {
      sendData(res, 200, await getPreferences(req.actor.userId));
    })
  );
  declareRoute({
    method: "PUT",
    path: `${BASE7}/notifications/preferences`,
    auth: { kind: "permission", permission: "notification.update.own" },
    csrf: true,
    summary: "Set one of the authenticated farmer\u2019s own notification preferences."
  });
  router.put(
    "/notifications/preferences",
    requirePermission("notification.update.own"),
    asyncHandler(async (req, res) => {
      const body = parse5(PreferenceSchema, req.body);
      sendData(
        res,
        200,
        await updatePreference(req.actor.userId, body.channel, body.event ?? null, body.enabled)
      );
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE7}/notifications/read-all`,
    auth: { kind: "permission", permission: "notification.update.own" },
    csrf: true,
    summary: "Mark all of the authenticated farmer\u2019s notifications read."
  });
  router.post(
    "/notifications/read-all",
    requirePermission("notification.update.own"),
    asyncHandler(async (req, res) => {
      sendData(res, 200, await markAllRead2(req.actor.userId));
    })
  );
  declareRoute({
    method: "POST",
    path: `${BASE7}/notifications/:id/read`,
    auth: { kind: "permission", permission: "notification.update.own" },
    csrf: true,
    summary: "Mark one of the authenticated farmer\u2019s notifications read."
  });
  router.post(
    "/notifications/:id/read",
    requirePermission("notification.update.own"),
    asyncHandler(async (req, res) => {
      const id = parse5(IdSchema, req.params.id);
      const result = await markRead2(req.actor.userId, id);
      if (!result) throw notFound("Notification not found");
      sendData(res, 200, result);
    })
  );
  return router;
}

// server/src/modules/admin/admin.routes.ts
import { Router as Router8 } from "express";
import { z as z9 } from "zod";

// server/src/modules/admin/admin.repository.ts
var CONFIGURED = "CONFIGURED";
var CENTRE_SELECT = `
  SELECT pc.id, pc.code, pc.name, pc.status, pc.timezone, pc.data_type,
         pc.storage_check_mode, d.name AS district_name,
         (SELECT count(*) FROM centre_service_lanes l
           WHERE l.centre_id = pc.id AND l.is_active)::int AS lane_count
    FROM procurement_centres pc
    JOIN districts d ON d.id = pc.district_id`;
async function listCentres(includeInactive) {
  const res = await query(
    `${CENTRE_SELECT}
      WHERE ($1::boolean OR pc.status = 'ACTIVE')
      ORDER BY pc.code`,
    [includeInactive]
  );
  return res.rows;
}
async function findCentre(centreId, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(`${CENTRE_SELECT} WHERE pc.id = $1`, [centreId]);
  return res.rows[0] ?? null;
}
async function centreCodeExists(client, code) {
  const r = await client.query("SELECT 1 FROM procurement_centres WHERE code = $1", [code]);
  return (r.rowCount ?? 0) > 0;
}
async function createCentre(client, input) {
  const res = await client.query(
    `INSERT INTO procurement_centres
       (code, name, state_id, district_id, address, timezone, status,
        storage_check_mode, data_type, source_id)
     SELECT $1, $2, d.state_id, d.id, $5, $4, 'ACTIVE', 'ADVISORY', $6, NULL
       FROM districts d WHERE d.id = $3
     RETURNING id`,
    [input.code, input.name, input.districtId, input.timezone, input.address, CONFIGURED]
  );
  const row = res.rows[0];
  if (!row) throw new Error("DISTRICT_NOT_FOUND");
  return row.id;
}
async function updateCentre(client, centreId, patch) {
  await client.query(
    `UPDATE procurement_centres
        SET name     = COALESCE($2, name),
            address  = COALESCE($3, address),
            status   = COALESCE($4, status),
            timezone = COALESCE($5, timezone)
      WHERE id = $1`,
    [centreId, patch.name ?? null, patch.address ?? null, patch.status ?? null, patch.timezone ?? null]
  );
}
async function activeBookingCount(client, centreId) {
  const res = await client.query(
    `SELECT count(*)::text AS n FROM bookings
      WHERE centre_id = $1
        AND status IN ('CONFIRMED','ARRIVED','WEIGHING','QUALITY_CHECK',
                       'PROCUREMENT_RECORDED','PAYMENT_PENDING')`,
    [centreId]
  );
  return Number(res.rows[0].n);
}
async function listLanes(centreId) {
  const res = await query(
    `SELECT lane_no, name, is_active FROM centre_service_lanes
      WHERE centre_id = $1 ORDER BY lane_no`,
    [centreId]
  );
  return res.rows;
}
async function upsertLane(client, centreId, laneNo, name, isActive) {
  await client.query(
    `INSERT INTO centre_service_lanes (centre_id, lane_no, name, is_active)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (centre_id, lane_no)
     DO UPDATE SET name = EXCLUDED.name, is_active = EXCLUDED.is_active`,
    [centreId, laneNo, name, isActive]
  );
}
async function activeBookingsOnLane(client, centreId, laneNo) {
  const res = await client.query(
    `SELECT count(*)::text AS n FROM bookings
      WHERE centre_id = $1 AND lane_no = $2
        AND status IN ('CONFIRMED','ARRIVED','WEIGHING','QUALITY_CHECK',
                       'PROCUREMENT_RECORDED','PAYMENT_PENDING')`,
    [centreId, laneNo]
  );
  return Number(res.rows[0].n);
}
async function listHours(centreId, onDate) {
  const res = await query(
    `SELECT day_of_week, opens_at::text AS opens_at, closes_at::text AS closes_at,
            effective_from::text AS effective_from, effective_to::text AS effective_to
       FROM centre_operating_hours
      WHERE centre_id = $1
        AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to > $2::date)
      ORDER BY day_of_week`,
    [centreId, onDate]
  );
  return res.rows;
}
async function setHours(client, centreId, dayOfWeek, opensAt, closesAt, effectiveFrom, userId) {
  await client.query(
    `UPDATE centre_operating_hours
        SET effective_to = $3::date
      WHERE centre_id = $1 AND day_of_week = $2 AND effective_to IS NULL`,
    [centreId, dayOfWeek, effectiveFrom]
  );
  await client.query(
    `INSERT INTO centre_operating_hours
       (centre_id, day_of_week, opens_at, closes_at, effective_from,
        data_type, configured_by_user_id)
     VALUES ($1,$2,$3::time,$4::time,$5::date,$6,$7)`,
    [centreId, dayOfWeek, opensAt, closesAt, effectiveFrom, CONFIGURED, userId]
  );
}
async function closeWeekday(client, centreId, dayOfWeek, effectiveFrom) {
  await client.query(
    `UPDATE centre_operating_hours
        SET effective_to = $3::date
      WHERE centre_id = $1 AND day_of_week = $2 AND effective_to IS NULL`,
    [centreId, dayOfWeek, effectiveFrom]
  );
}
async function listHolidays(centreId) {
  const res = await query(
    `SELECT holiday_date::text AS holiday_date, reason FROM centre_holidays
      WHERE centre_id = $1 ORDER BY holiday_date`,
    [centreId]
  );
  return res.rows;
}
async function addHoliday(client, centreId, date, reason, userId) {
  const res = await client.query(
    `INSERT INTO centre_holidays (centre_id, holiday_date, reason, data_type, configured_by_user_id)
     VALUES ($1,$2::date,$3,$4,$5)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [centreId, date, reason, CONFIGURED, userId]
  );
  return (res.rowCount ?? 0) > 0;
}
async function removeHoliday(client, centreId, date) {
  const res = await client.query(
    "DELETE FROM centre_holidays WHERE centre_id = $1 AND holiday_date = $2::date",
    [centreId, date]
  );
  return (res.rowCount ?? 0) > 0;
}
async function bookingsOnDate(client, centreId, date) {
  const res = await client.query(
    `SELECT count(*)::text AS n FROM bookings
      WHERE centre_id = $1 AND service_date = $2::date
        AND status IN ('CONFIRMED','ARRIVED','WEIGHING','QUALITY_CHECK',
                       'PROCUREMENT_RECORDED','PAYMENT_PENDING')`,
    [centreId, date]
  );
  return Number(res.rows[0].n);
}
async function listCropConfig(centreId) {
  const res = await query(
    `SELECT cr.code AS crop_code, cr.canonical_name AS crop_name, s.code AS season_code,
            ccc.marketing_year, ccc.is_active,
            ccc.effective_from::text AS effective_from, ccc.effective_to::text AS effective_to
       FROM centre_crop_configurations ccc
       JOIN crops cr ON cr.id = ccc.crop_id
       JOIN seasons s ON s.id = ccc.season_id
      WHERE ccc.centre_id = $1
      ORDER BY cr.code`,
    [centreId]
  );
  return res.rows;
}
async function setCropEligibility(client, centreId, cropId, seasonId, marketingYear, isActive, effectiveFrom, userId) {
  await client.query(
    `UPDATE centre_crop_configurations
        SET effective_to = $4::date
      WHERE centre_id = $1 AND crop_id = $2 AND season_id = $3 AND effective_to IS NULL`,
    [centreId, cropId, seasonId, effectiveFrom]
  );
  await client.query(
    `INSERT INTO centre_crop_configurations
       (centre_id, crop_id, season_id, marketing_year, is_active, effective_from,
        data_type, configured_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8)`,
    [centreId, cropId, seasonId, marketingYear, isActive, effectiveFrom, CONFIGURED, userId]
  );
}
async function currentSlotConfig(centreId, onDate) {
  const res = await query(
    `SELECT reference_quantity_kg, reference_processing_minutes,
            minimum_processing_minutes, maximum_processing_minutes,
            transition_buffer_minutes, slot_granularity_minutes,
            booking_horizon_days, cancellation_cutoff_hours,
            effective_from::text AS effective_from, effective_to::text AS effective_to
       FROM centre_slot_configurations
      WHERE centre_id = $1 AND effective_from <= $2::date
        AND (effective_to IS NULL OR effective_to > $2::date)`,
    [centreId, onDate]
  );
  return res.rows[0] ?? null;
}
async function setSlotConfig(client, centreId, cfg, effectiveFrom, userId) {
  await client.query(
    `UPDATE centre_slot_configurations
        SET effective_to = $2::date
      WHERE centre_id = $1 AND effective_to IS NULL`,
    [centreId, effectiveFrom]
  );
  await client.query(
    `INSERT INTO centre_slot_configurations
       (centre_id, reference_quantity_kg, reference_processing_minutes,
        minimum_processing_minutes, maximum_processing_minutes,
        transition_buffer_minutes, slot_granularity_minutes,
        booking_horizon_days, cancellation_cutoff_hours,
        effective_from, data_type, configured_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::date,$11,$12)`,
    [
      centreId,
      cfg.referenceQuantityKg,
      cfg.referenceProcessingMinutes,
      cfg.minimumProcessingMinutes,
      cfg.maximumProcessingMinutes,
      cfg.transitionBufferMinutes,
      cfg.slotGranularityMinutes,
      cfg.bookingHorizonDays,
      cfg.cancellationCutoffHours,
      effectiveFrom,
      CONFIGURED,
      userId
    ]
  );
}
async function listAssignments(centreId) {
  const res = await query(
    `SELECT u.full_name, o.employee_code, o.status AS officer_status,
            a.assigned_at, a.revoked_at
       FROM officer_centre_assignments a
       JOIN officers o ON o.id = a.officer_id
       JOIN users u ON u.id = o.user_id
      WHERE a.centre_id = $1
      ORDER BY a.assigned_at DESC`,
    [centreId]
  );
  return res.rows;
}
async function officerByEmployeeCode(client, employeeCode) {
  const res = await client.query(
    "SELECT id, status FROM officers WHERE employee_code = $1",
    [employeeCode]
  );
  return res.rows[0] ?? null;
}
async function assignOfficer(client, officerId, centreId, byUserId) {
  const res = await client.query(
    `INSERT INTO officer_centre_assignments (officer_id, centre_id, assigned_by_user_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (officer_id, centre_id) WHERE revoked_at IS NULL
     DO NOTHING
     RETURNING id`,
    [officerId, centreId, byUserId]
  );
  return (res.rowCount ?? 0) > 0;
}
async function revokeAssignment(client, officerId, centreId, byUserId) {
  const res = await client.query(
    `UPDATE officer_centre_assignments
        SET revoked_at = now(), revoked_by_user_id = $3
      WHERE officer_id = $1 AND centre_id = $2 AND revoked_at IS NULL`,
    [officerId, centreId, byUserId]
  );
  return (res.rowCount ?? 0) > 0;
}
async function createOfficer(client, input) {
  const user = await client.query(
    `INSERT INTO users (full_name, username, password_hash, phone_e164, phone_verified_at, status)
     VALUES ($1,$2,$3,$4, now(), 'ACTIVE')
     RETURNING id`,
    [input.fullName, input.username, input.passwordHash, input.phoneE164]
  );
  const userId = user.rows[0].id;
  await client.query(
    `INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE code = 'OFFICER'`,
    [userId]
  );
  const officer = await client.query(
    `INSERT INTO officers (user_id, employee_code, designation, created_by_user_id)
     VALUES ($1,$2,$3,$4) RETURNING id`,
    [userId, input.employeeCode, input.designation, input.createdByUserId]
  );
  return { userId, officerId: officer.rows[0].id };
}
async function usernameTaken(client, username) {
  const r = await client.query("SELECT 1 FROM users WHERE username = $1", [username]);
  return (r.rowCount ?? 0) > 0;
}
async function phoneTaken(client, phoneE164) {
  const r = await client.query("SELECT 1 FROM users WHERE phone_e164 = $1", [phoneE164]);
  return (r.rowCount ?? 0) > 0;
}
async function employeeCodeTaken(client, code) {
  const r = await client.query("SELECT 1 FROM officers WHERE employee_code = $1", [code]);
  return (r.rowCount ?? 0) > 0;
}
async function listOfficers(includeInactive) {
  const res = await query(
    `SELECT o.employee_code, o.designation, o.status, o.deactivated_at,
            u.full_name, u.username, u.status AS user_status,
            (SELECT count(*) FROM officer_centre_assignments a
              WHERE a.officer_id = o.id AND a.revoked_at IS NULL)::int AS active_assignments
       FROM officers o JOIN users u ON u.id = o.user_id
      WHERE ($1::boolean OR o.status = 'ACTIVE')
      ORDER BY o.employee_code`,
    [includeInactive]
  );
  return res.rows;
}
async function officerDetail(employeeCode, db = null) {
  const run = db ? db.query.bind(db) : query;
  const res = await run(
    `SELECT o.id, o.user_id, o.status, o.designation, o.deactivated_at,
            u.full_name, u.username, u.status AS user_status
       FROM officers o JOIN users u ON u.id = o.user_id
      WHERE o.employee_code = $1`,
    [employeeCode]
  );
  return res.rows[0] ?? null;
}
async function setOfficerStatus(client, officerId, active) {
  await client.query(
    `UPDATE officers
        SET status = $2, deactivated_at = CASE WHEN $2 = 'INACTIVE' THEN now() ELSE NULL END
      WHERE id = $1`,
    [officerId, active ? "ACTIVE" : "INACTIVE"]
  );
}
async function setUserStatus(client, userId, status) {
  await client.query("UPDATE users SET status = $2 WHERE id = $1", [userId, status]);
}
async function revokeSessions(client, userId, reason) {
  const res = await client.query(
    `UPDATE sessions SET revoked_at = now(), revoked_reason = $2
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason]
  );
  return res.rowCount ?? 0;
}
async function revokeAllAssignments(client, officerId, byUserId) {
  const res = await client.query(
    `UPDATE officer_centre_assignments
        SET revoked_at = now(), revoked_by_user_id = $2
      WHERE officer_id = $1 AND revoked_at IS NULL`,
    [officerId, byUserId]
  );
  return res.rowCount ?? 0;
}
async function assignmentsForOfficer(employeeCode) {
  const res = await query(
    `SELECT pc.code AS centre_code, pc.name AS centre_name,
            a.assigned_at, a.revoked_at
       FROM officer_centre_assignments a
       JOIN officers o ON o.id = a.officer_id
       JOIN procurement_centres pc ON pc.id = a.centre_id
      WHERE o.employee_code = $1
      ORDER BY a.assigned_at DESC`,
    [employeeCode]
  );
  return res.rows;
}
async function listRegistrationRequests(client, status) {
  const res = await client.query(
    `SELECT r.id, r.full_name, r.phone_e164, r.username, r.employee_code, r.designation,
            r.requested_centre_id, pc.name AS centre_name, d.name AS district_name,
            r.status, r.created_at, r.decided_at, r.decision_note
       FROM officer_registration_requests r
       JOIN procurement_centres pc ON pc.id = r.requested_centre_id
       JOIN districts d ON d.id = pc.district_id
      WHERE ($1::text IS NULL OR r.status = $1::text)
      ORDER BY r.created_at DESC
      LIMIT 200`,
    [status]
  );
  return res.rows;
}
async function registrationRequestById(client, id) {
  const res = await client.query(
    `SELECT r.id, r.full_name, r.phone_e164, r.username, r.employee_code, r.designation,
            r.requested_centre_id, pc.name AS centre_name, d.name AS district_name,
            r.status, r.created_at, r.decided_at, r.decision_note, r.password_hash
       FROM officer_registration_requests r
       JOIN procurement_centres pc ON pc.id = r.requested_centre_id
       JOIN districts d ON d.id = pc.district_id
      WHERE r.id = $1`,
    [id]
  );
  return res.rows[0] ?? null;
}
async function settleRegistrationRequest(client, id, status, byUserId, note, createdOfficerId) {
  await client.query(
    `UPDATE officer_registration_requests
        SET status = $2, decided_at = now(), decided_by_user_id = $3,
            decision_note = $4, created_officer_id = $5
      WHERE id = $1`,
    [id, status, byUserId, note, createdOfficerId]
  );
}

// server/src/modules/admin/admin.routes.ts
var BASE8 = "/api/v1";
var Uuid = z9.string().uuid("ID_INVALID");
var DateStr = z9.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DATE_INVALID");
var TimeStr = z9.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "TIME_INVALID");
var CreateCentreSchema = z9.object({
  code: z9.string().trim().regex(/^[A-Z0-9-]{4,40}$/, "CODE_INVALID"),
  name: z9.string().trim().min(3).max(200),
  districtId: Uuid,
  timezone: z9.string().trim().min(3).max(64).default("Asia/Kolkata"),
  address: z9.string().trim().max(300).nullable().optional()
});
var UpdateCentreSchema = z9.object({
  name: z9.string().trim().min(3).max(200).optional(),
  address: z9.string().trim().max(300).nullable().optional(),
  status: z9.enum(["ACTIVE", "INACTIVE"]).optional(),
  timezone: z9.string().trim().min(3).max(64).optional()
});
var LaneSchema = z9.object({
  laneNo: z9.number().int().min(1).max(50),
  name: z9.string().trim().max(80).nullable().optional(),
  isActive: z9.boolean()
});
var HoursSchema = z9.object({
  dayOfWeek: z9.number().int().min(0).max(6),
  opensAt: TimeStr.nullable(),
  closesAt: TimeStr.nullable(),
  effectiveFrom: DateStr
});
var HolidaySchema = z9.object({
  date: DateStr,
  reason: z9.string().trim().max(200).nullable().optional()
});
var CropSchema = z9.object({
  cropId: Uuid,
  seasonId: Uuid,
  marketingYear: z9.string().trim().regex(/^\d{4}-\d{2}$/, "MARKETING_YEAR_INVALID"),
  isActive: z9.boolean(),
  effectiveFrom: DateStr
});
var SlotConfigSchema = z9.object({
  referenceQuantityKg: z9.number().int().positive(),
  referenceProcessingMinutes: z9.number().int().positive(),
  minimumProcessingMinutes: z9.number().int().positive(),
  maximumProcessingMinutes: z9.number().int().positive(),
  transitionBufferMinutes: z9.number().int().min(0),
  slotGranularityMinutes: z9.number().int().positive(),
  bookingHorizonDays: z9.number().int().positive(),
  cancellationCutoffHours: z9.number().int().min(0),
  effectiveFrom: DateStr
});
var AssignSchema = z9.object({
  employeeCode: z9.string().trim().min(1).max(64)
});
var UsernameSchema = z9.string().trim().transform((v) => v.toLowerCase()).refine((v) => /^[a-z0-9._-]{3,64}$/.test(v), "USERNAME_INVALID");
var EmployeeCodeSchema = z9.string().trim().regex(/^[A-Za-z0-9._-]{3,64}$/, "EMPLOYEE_CODE_INVALID");
var InitialPasswordSchema = z9.string().min(12, "PASSWORD_TOO_SHORT").max(512, "PASSWORD_TOO_LONG").refine((v) => /[a-z]/.test(v) && /[A-Z]/.test(v) && /\d/.test(v), "PASSWORD_TOO_WEAK");
var CreateOfficerSchema = z9.object({
  fullName: FullNameSchema,
  username: UsernameSchema,
  password: InitialPasswordSchema,
  phone: PhoneSchema,
  employeeCode: EmployeeCodeSchema,
  designation: z9.string().trim().min(1).max(120).nullable().optional()
});
var DeactivateSchema = z9.object({
  reason: z9.string().trim().min(1).max(280).optional()
});
function parse6(schema, value) {
  const r = schema.safeParse(value);
  if (!r.success) {
    const fields = {};
    for (const i of r.error.issues) fields[i.path.join(".") || "_"] = i.message;
    throw badRequest(ErrorCodes.VALIDATION_FAILED, "Request validation failed", fields);
  }
  return r.data;
}
function ctx(req) {
  return {
    userId: req.actor.userId,
    ip: req.clientIp ?? null,
    requestId: req.requestId ?? null
  };
}
async function auditConfig(client, req, action, entityId, before, after) {
  const c = ctx(req);
  await writeAudit(client, {
    action,
    entityType: "centre_configuration",
    entityId,
    actorUserId: c.userId,
    actorRole: "ADMIN",
    actorIp: c.ip,
    requestId: c.requestId,
    before,
    after
  });
}
async function auditOfficer(client, req, action, officerId, before, after) {
  const c = ctx(req);
  await writeAudit(client, {
    action,
    entityType: "officer",
    entityId: officerId,
    actorUserId: c.userId,
    actorRole: "ADMIN",
    actorIp: c.ip,
    requestId: c.requestId,
    before,
    after
  });
}
async function requireCentre2(centreId) {
  const centre = await findCentre(centreId);
  if (!centre) throw notFound("Centre not found");
  return centre;
}
function buildAdminRouter() {
  const router = Router8();
  const declare = (method, path, permission, summary) => {
    declareRoute({
      method,
      path: `${BASE8}${path}`,
      auth: { kind: "permission", permission },
      csrf: method !== "GET",
      summary
    });
  };
  declare("GET", "/admin/centres", "centre.update", "List all procurement centres.");
  router.get(
    "/admin/centres",
    requirePermission("centre.update"),
    asyncHandler(async (req, res) => {
      const includeInactive = String(req.query.includeInactive ?? "") === "true";
      const rows = await listCentres(includeInactive);
      sendData(res, 200, {
        count: rows.length,
        centres: rows.map((c) => ({
          centreId: c.id,
          code: c.code,
          name: c.name,
          district: c.district_name,
          status: c.status,
          timezone: c.timezone,
          laneCount: c.lane_count,
          // Surfaced deliberately: an operator must be able to see that a
          // centre is demonstration data, not an official government facility.
          dataType: c.data_type,
          storageCheckMode: c.storage_check_mode
        }))
      });
    })
  );
  declare("POST", "/admin/centres", "centre.create", "Create a CONFIGURED procurement centre.");
  router.post(
    "/admin/centres",
    requirePermission("centre.create"),
    asyncHandler(async (req, res) => {
      const input = parse6(CreateCentreSchema, req.body);
      const result = await withTransaction(async (client) => {
        if (await centreCodeExists(client, input.code)) {
          throw conflict(ErrorCodes.CENTRE_CODE_TAKEN, "A centre with that code already exists");
        }
        let id;
        try {
          id = await createCentre(client, {
            code: input.code,
            name: input.name,
            districtId: input.districtId,
            timezone: input.timezone,
            address: input.address ?? null
          });
        } catch (e) {
          if (e instanceof Error && e.message === "DISTRICT_NOT_FOUND") {
            throw badRequest(ErrorCodes.DISTRICT_NOT_FOUND, "District not found");
          }
          throw e;
        }
        await auditConfig(client, req, AuditActions.CENTRE_CREATED, id, null, {
          code: input.code,
          name: input.name,
          dataType: "CONFIGURED"
        });
        return id;
      });
      sendData(res, 201, {
        centreId: result,
        code: input.code,
        dataType: "CONFIGURED",
        note: "Created as CONFIGURED demonstration data. It is not an official government centre."
      });
    })
  );
  declare("PATCH", "/admin/centres/:centreId", "centre.update", "Update a centre.");
  router.patch(
    "/admin/centres/:centreId",
    requirePermission("centre.update"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const patch = parse6(UpdateCentreSchema, req.body);
      const before = await requireCentre2(centreId);
      await withTransaction(async (client) => {
        if (patch.status === "INACTIVE") {
          const active = await activeBookingCount(client, centreId);
          if (active > 0) {
            throw conflict(
              ErrorCodes.CENTRE_HAS_ACTIVE_BOOKINGS,
              "The centre still has active bookings and cannot be deactivated",
              { activeBookings: active }
            );
          }
        }
        await updateCentre(client, centreId, patch);
        await auditConfig(
          client,
          req,
          AuditActions.CENTRE_UPDATED,
          centreId,
          { name: before.name, status: before.status },
          patch
        );
      });
      sendData(res, 200, { centreId, updated: true });
    })
  );
  declare("GET", "/admin/centres/:centreId/lanes", "centre.configure", "List service lanes.");
  router.get(
    "/admin/centres/:centreId/lanes",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      await requireCentre2(centreId);
      const lanes = await listLanes(centreId);
      sendData(res, 200, { centreId, lanes });
    })
  );
  declare("PUT", "/admin/centres/:centreId/lanes", "centre.configure", "Add or update a lane.");
  router.put(
    "/admin/centres/:centreId/lanes",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const input = parse6(LaneSchema, req.body);
      await requireCentre2(centreId);
      await withTransaction(async (client) => {
        if (!input.isActive) {
          const held = await activeBookingsOnLane(client, centreId, input.laneNo);
          if (held > 0) {
            throw conflict(
              ErrorCodes.LANE_HAS_ACTIVE_BOOKINGS,
              "The lane still holds active bookings and cannot be deactivated",
              { activeBookings: held }
            );
          }
        }
        await upsertLane(client, centreId, input.laneNo, input.name ?? null, input.isActive);
        await auditConfig(client, req, AuditActions.CENTRE_LANE_CONFIGURED, centreId, null, input);
      });
      sendData(res, 200, { centreId, lane: input.laneNo, isActive: input.isActive });
    })
  );
  declare("GET", "/admin/centres/:centreId/hours", "centre.configure", "Read operating hours.");
  router.get(
    "/admin/centres/:centreId/hours",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      await requireCentre2(centreId);
      const onDate = req.query.date ? parse6(DateStr, req.query.date) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      sendData(res, 200, { centreId, onDate, hours: await listHours(centreId, onDate) });
    })
  );
  declare("PUT", "/admin/centres/:centreId/hours", "centre.configure", "Set hours for a weekday.");
  router.put(
    "/admin/centres/:centreId/hours",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const input = parse6(HoursSchema, req.body);
      await requireCentre2(centreId);
      const closing = input.opensAt === null || input.closesAt === null;
      if (!closing && input.opensAt >= input.closesAt) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "Opening time must precede closing time", {
          opensAt: "MUST_PRECEDE_CLOSES_AT"
        });
      }
      await withTransaction(async (client) => {
        if (closing) {
          await closeWeekday(client, centreId, input.dayOfWeek, input.effectiveFrom);
        } else {
          await setHours(
            client,
            centreId,
            input.dayOfWeek,
            input.opensAt,
            input.closesAt,
            input.effectiveFrom,
            req.actor.userId
          );
        }
        await auditConfig(client, req, AuditActions.CENTRE_HOURS_CONFIGURED, centreId, null, input);
      });
      sendData(res, 200, { centreId, dayOfWeek: input.dayOfWeek, closed: closing });
    })
  );
  declare("GET", "/admin/centres/:centreId/holidays", "centre.configure", "List holidays.");
  router.get(
    "/admin/centres/:centreId/holidays",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      await requireCentre2(centreId);
      sendData(res, 200, { centreId, holidays: await listHolidays(centreId) });
    })
  );
  declare("POST", "/admin/centres/:centreId/holidays", "centre.configure", "Declare a holiday.");
  router.post(
    "/admin/centres/:centreId/holidays",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const input = parse6(HolidaySchema, req.body);
      await requireCentre2(centreId);
      const added = await withTransaction(async (client) => {
        const booked = await bookingsOnDate(client, centreId, input.date);
        if (booked > 0) {
          throw conflict(
            ErrorCodes.DATE_HAS_ACTIVE_BOOKINGS,
            "Bookings already exist on that date; cancel them before declaring a holiday",
            { activeBookings: booked }
          );
        }
        const ok = await addHoliday(
          client,
          centreId,
          input.date,
          input.reason ?? null,
          req.actor.userId
        );
        if (ok) {
          await auditConfig(client, req, AuditActions.CENTRE_HOLIDAY_SET, centreId, null, input);
        }
        return ok;
      });
      sendData(res, added ? 201 : 200, { centreId, date: input.date, added });
    })
  );
  declare("DELETE", "/admin/centres/:centreId/holidays/:date", "centre.configure", "Remove a holiday.");
  router.delete(
    "/admin/centres/:centreId/holidays/:date",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const date = parse6(DateStr, req.params.date);
      await requireCentre2(centreId);
      const removed = await withTransaction(async (client) => {
        const ok = await removeHoliday(client, centreId, date);
        if (ok) {
          await auditConfig(client, req, AuditActions.CENTRE_HOLIDAY_SET, centreId, { date }, null);
        }
        return ok;
      });
      if (!removed) throw notFound("Holiday not found");
      sendData(res, 200, { centreId, date, removed: true });
    })
  );
  declare("GET", "/admin/centres/:centreId/crops", "centre.configure", "List crop eligibility.");
  router.get(
    "/admin/centres/:centreId/crops",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      await requireCentre2(centreId);
      sendData(res, 200, { centreId, crops: await listCropConfig(centreId) });
    })
  );
  declare("PUT", "/admin/centres/:centreId/crops", "centre.configure", "Set crop eligibility.");
  router.put(
    "/admin/centres/:centreId/crops",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const input = parse6(CropSchema, req.body);
      await requireCentre2(centreId);
      await withTransaction(async (client) => {
        await setCropEligibility(
          client,
          centreId,
          input.cropId,
          input.seasonId,
          input.marketingYear,
          input.isActive,
          input.effectiveFrom,
          req.actor.userId
        );
        await auditConfig(client, req, AuditActions.CENTRE_CROP_CONFIGURED, centreId, null, input);
      });
      sendData(res, 200, { centreId, configured: true });
    })
  );
  declare("GET", "/admin/centres/:centreId/slot-config", "centre.configure", "Read slot configuration.");
  router.get(
    "/admin/centres/:centreId/slot-config",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      await requireCentre2(centreId);
      const onDate = req.query.date ? parse6(DateStr, req.query.date) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      sendData(res, 200, { centreId, onDate, slotConfig: await currentSlotConfig(centreId, onDate) });
    })
  );
  declare("PUT", "/admin/centres/:centreId/slot-config", "centre.configure", "Set slot configuration.");
  router.put(
    "/admin/centres/:centreId/slot-config",
    requirePermission("centre.configure"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const input = parse6(SlotConfigSchema, req.body);
      await requireCentre2(centreId);
      if (input.maximumProcessingMinutes < input.minimumProcessingMinutes) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "Maximum must not be below minimum", {
          maximumProcessingMinutes: "BELOW_MINIMUM"
        });
      }
      await withTransaction(async (client) => {
        await setSlotConfig(client, centreId, input, input.effectiveFrom, req.actor.userId);
        await auditConfig(client, req, AuditActions.CENTRE_SLOT_CONFIGURED, centreId, null, input);
      });
      sendData(res, 200, { centreId, effectiveFrom: input.effectiveFrom });
    })
  );
  declare("GET", "/admin/centres/:centreId/officers", "officer.assign_centre", "List assignments.");
  router.get(
    "/admin/centres/:centreId/officers",
    requirePermission("officer.assign_centre"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      await requireCentre2(centreId);
      const rows = await listAssignments(centreId);
      sendData(res, 200, {
        centreId,
        assignments: rows.map((r) => ({
          name: r.full_name,
          employeeCode: r.employee_code,
          officerStatus: r.officer_status,
          assignedAt: r.assigned_at.toISOString(),
          revokedAt: r.revoked_at ? r.revoked_at.toISOString() : null,
          active: r.revoked_at === null
        }))
      });
    })
  );
  declare("POST", "/admin/centres/:centreId/officers", "officer.assign_centre", "Assign an officer.");
  router.post(
    "/admin/centres/:centreId/officers",
    requirePermission("officer.assign_centre"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const input = parse6(AssignSchema, req.body);
      await requireCentre2(centreId);
      const assigned = await withTransaction(async (client) => {
        const officer = await officerByEmployeeCode(client, input.employeeCode);
        if (!officer) throw notFound("Officer not found");
        if (officer.status !== "ACTIVE") {
          throw conflict(ErrorCodes.OFFICER_INACTIVE, "That officer is not active");
        }
        const ok = await assignOfficer(client, officer.id, centreId, req.actor.userId);
        if (ok) {
          await auditConfig(client, req, AuditActions.OFFICER_ASSIGNED, centreId, null, {
            employeeCode: input.employeeCode
          });
        }
        return ok;
      });
      sendData(res, assigned ? 201 : 200, {
        centreId,
        employeeCode: input.employeeCode,
        assigned
      });
    })
  );
  declare(
    "DELETE",
    "/admin/centres/:centreId/officers/:employeeCode",
    "officer.assign_centre",
    "Revoke an assignment."
  );
  router.delete(
    "/admin/centres/:centreId/officers/:employeeCode",
    requirePermission("officer.assign_centre"),
    asyncHandler(async (req, res) => {
      const centreId = parse6(Uuid, req.params.centreId);
      const employeeCode = parse6(z9.string().trim().min(1).max(64), req.params.employeeCode);
      await requireCentre2(centreId);
      const revoked = await withTransaction(async (client) => {
        const officer = await officerByEmployeeCode(client, employeeCode);
        if (!officer) throw notFound("Officer not found");
        const ok = await revokeAssignment(client, officer.id, centreId, req.actor.userId);
        if (ok) {
          await auditConfig(
            client,
            req,
            AuditActions.OFFICER_ASSIGNMENT_REVOKED,
            centreId,
            { employeeCode },
            null
          );
        }
        return ok;
      });
      if (!revoked) throw notFound("Active assignment not found");
      sendData(res, 200, { centreId, employeeCode, revoked: true });
    })
  );
  declare("GET", "/admin/officers", "officer.create", "List officer accounts.");
  router.get(
    "/admin/officers",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const includeInactive = String(req.query.includeInactive ?? "") === "true";
      const rows = await listOfficers(includeInactive);
      sendData(res, 200, {
        count: rows.length,
        officers: rows.map((o) => ({
          employeeCode: o.employee_code,
          fullName: o.full_name,
          username: o.username,
          designation: o.designation,
          status: o.status,
          // The officer row and the login it hangs off are separate records.
          // Showing both makes a half-applied deactivation visible instead of
          // leaving an officer who reads as INACTIVE but can still sign in.
          loginStatus: o.user_status,
          activeAssignments: o.active_assignments,
          deactivatedAt: o.deactivated_at ? o.deactivated_at.toISOString() : null
        }))
      });
    })
  );
  declare("POST", "/admin/officers", "officer.create", "Create an officer account.");
  router.post(
    "/admin/officers",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const input = parse6(CreateOfficerSchema, req.body);
      await withTransaction(async (client) => {
        if (await usernameTaken(client, input.username)) {
          throw conflict(ErrorCodes.USERNAME_TAKEN, "That username is already in use");
        }
        if (await phoneTaken(client, input.phone)) {
          throw conflict(
            ErrorCodes.PHONE_ALREADY_REGISTERED,
            "That phone number already belongs to an account"
          );
        }
        if (await employeeCodeTaken(client, input.employeeCode)) {
          throw conflict(ErrorCodes.EMPLOYEE_CODE_TAKEN, "That employee code is already in use");
        }
        const ids = await createOfficer(client, {
          fullName: input.fullName,
          username: input.username,
          passwordHash: hashPassword(input.password),
          phoneE164: input.phone,
          employeeCode: input.employeeCode,
          designation: input.designation ?? null,
          createdByUserId: req.actor.userId
        });
        await auditOfficer(client, req, AuditActions.OFFICER_CREATED, ids.officerId, null, {
          employeeCode: input.employeeCode,
          username: input.username,
          fullName: input.fullName,
          designation: input.designation ?? null
        });
      });
      sendData(res, 201, {
        employeeCode: input.employeeCode,
        username: input.username,
        fullName: input.fullName,
        status: "ACTIVE",
        // Said plainly because a new officer who can see no bookings otherwise
        // looks like a defect rather than an unfinished provisioning step.
        note: "The officer can sign in, but holds no centre assignment yet and can act on nothing until assigned."
      });
    })
  );
  declare("GET", "/admin/officers/:employeeCode", "officer.create", "Read one officer.");
  router.get(
    "/admin/officers/:employeeCode",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const employeeCode = parse6(EmployeeCodeSchema, req.params.employeeCode);
      const officer = await officerDetail(employeeCode);
      if (!officer) throw notFound("Officer not found");
      const assignments = await assignmentsForOfficer(employeeCode);
      sendData(res, 200, {
        employeeCode,
        fullName: officer.full_name,
        username: officer.username,
        designation: officer.designation,
        status: officer.status,
        loginStatus: officer.user_status,
        deactivatedAt: officer.deactivated_at ? officer.deactivated_at.toISOString() : null,
        assignments: assignments.map((a) => ({
          centreCode: a.centre_code,
          centreName: a.centre_name,
          assignedAt: a.assigned_at.toISOString(),
          revokedAt: a.revoked_at ? a.revoked_at.toISOString() : null,
          active: a.revoked_at === null
        }))
      });
    })
  );
  declare(
    "POST",
    "/admin/officers/:employeeCode/deactivate",
    "officer.deactivate",
    "Deactivate an officer, revoking their sessions and centre assignments."
  );
  router.post(
    "/admin/officers/:employeeCode/deactivate",
    requirePermission("officer.deactivate"),
    asyncHandler(async (req, res) => {
      const employeeCode = parse6(EmployeeCodeSchema, req.params.employeeCode);
      const input = parse6(DeactivateSchema, req.body ?? {});
      const result = await withTransaction(async (client) => {
        const officer = await officerDetail(employeeCode, client);
        if (!officer) throw notFound("Officer not found");
        if (officer.status !== "ACTIVE") {
          return { deactivated: false, sessionsRevoked: 0, assignmentsRevoked: 0 };
        }
        await setOfficerStatus(client, officer.id, false);
        await setUserStatus(client, officer.user_id, "INACTIVE");
        const sessionsRevoked = await revokeSessions(
          client,
          officer.user_id,
          "officer_deactivated"
        );
        const assignmentsRevoked = await revokeAllAssignments(
          client,
          officer.id,
          req.actor.userId
        );
        await auditOfficer(
          client,
          req,
          AuditActions.OFFICER_DEACTIVATED,
          officer.id,
          { status: "ACTIVE" },
          {
            status: "INACTIVE",
            reason: input.reason ?? null,
            sessionsRevoked,
            assignmentsRevoked
          }
        );
        return { deactivated: true, sessionsRevoked, assignmentsRevoked };
      });
      sendData(res, 200, { employeeCode, ...result });
    })
  );
  declare(
    "POST",
    "/admin/officers/:employeeCode/reactivate",
    "officer.create",
    "Reactivate a deactivated officer. Centre assignments are NOT restored."
  );
  router.post(
    "/admin/officers/:employeeCode/reactivate",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const employeeCode = parse6(EmployeeCodeSchema, req.params.employeeCode);
      const reactivated = await withTransaction(async (client) => {
        const officer = await officerDetail(employeeCode, client);
        if (!officer) throw notFound("Officer not found");
        if (officer.status === "ACTIVE") return false;
        await setOfficerStatus(client, officer.id, true);
        await setUserStatus(client, officer.user_id, "ACTIVE");
        await auditOfficer(
          client,
          req,
          AuditActions.OFFICER_REACTIVATED,
          officer.id,
          { status: "INACTIVE" },
          { status: "ACTIVE" }
        );
        return true;
      });
      sendData(res, 200, {
        employeeCode,
        reactivated,
        // Deliberate: deactivation revoked the assignments, and reactivation
        // does not guess that the same postings are still the right ones.
        note: "Centre assignments are not restored. Assign the officer to a centre explicitly."
      });
    })
  );
  declare(
    "GET",
    "/admin/officer-registrations",
    "officer.create",
    "List officer account applications awaiting review."
  );
  router.get(
    "/admin/officer-registrations",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const status = req.query.status ? String(req.query.status).toUpperCase() : "PENDING";
      if (!["PENDING", "APPROVED", "REJECTED", "ALL"].includes(status)) {
        throw badRequest(ErrorCodes.VALIDATION_FAILED, "status invalid", {
          status: "STATUS_INVALID"
        });
      }
      const rows = await withTransaction(
        (client) => listRegistrationRequests(client, status === "ALL" ? null : status)
      );
      sendData(res, 200, {
        requests: rows.map((r) => ({
          id: r.id,
          fullName: r.full_name,
          phone: r.phone_e164,
          username: r.username,
          employeeCode: r.employee_code,
          designation: r.designation,
          requestedCentre: { id: r.requested_centre_id, name: r.centre_name },
          district: r.district_name,
          status: r.status,
          submittedAt: r.created_at.toISOString(),
          decidedAt: r.decided_at ? r.decided_at.toISOString() : null,
          decisionNote: r.decision_note
        }))
      });
    })
  );
  declare(
    "POST",
    "/admin/officer-registrations/:id/approve",
    "officer.create",
    "Approve an application: creates the officer and assigns the requested centre."
  );
  router.post(
    "/admin/officer-registrations/:id/approve",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const id = parse6(Uuid, req.params.id);
      const note = req.body?.note ? String(req.body.note).slice(0, 500) : null;
      const result = await withTransaction(async (client) => {
        const request = await registrationRequestById(client, id);
        if (!request) throw notFound("Registration request not found");
        if (request.status !== "PENDING") {
          throw conflict(
            ErrorCodes.REGISTRATION_REQUEST_DECIDED,
            "That application has already been decided"
          );
        }
        if (await usernameTaken(client, request.username)) {
          throw conflict(ErrorCodes.USERNAME_TAKEN, "That username is already in use");
        }
        if (await phoneTaken(client, request.phone_e164)) {
          throw conflict(
            ErrorCodes.PHONE_ALREADY_REGISTERED,
            "That phone number already belongs to an account"
          );
        }
        if (await employeeCodeTaken(client, request.employee_code)) {
          throw conflict(ErrorCodes.EMPLOYEE_CODE_TAKEN, "That employee code is already in use");
        }
        const ids = await createOfficer(client, {
          fullName: request.full_name,
          username: request.username,
          passwordHash: request.password_hash,
          phoneE164: request.phone_e164,
          employeeCode: request.employee_code,
          designation: request.designation,
          createdByUserId: req.actor.userId
        });
        const assigned = await assignOfficer(
          client,
          ids.officerId,
          request.requested_centre_id,
          req.actor.userId
        );
        await settleRegistrationRequest(
          client,
          id,
          "APPROVED",
          req.actor.userId,
          note,
          ids.officerId
        );
        await auditOfficer(client, req, AuditActions.OFFICER_REGISTRATION_APPROVED, ids.officerId, null, {
          requestId: id,
          employeeCode: request.employee_code,
          username: request.username,
          centreId: request.requested_centre_id,
          assigned
        });
        return { employeeCode: request.employee_code, username: request.username, assigned };
      });
      sendData(res, 201, {
        ...result,
        status: "ACTIVE",
        note: "The officer can now sign in and is assigned to the centre they applied for."
      });
    })
  );
  declare(
    "POST",
    "/admin/officer-registrations/:id/reject",
    "officer.create",
    "Reject an application. No account is created."
  );
  router.post(
    "/admin/officer-registrations/:id/reject",
    requirePermission("officer.create"),
    asyncHandler(async (req, res) => {
      const id = parse6(Uuid, req.params.id);
      const note = req.body?.note ? String(req.body.note).slice(0, 500) : null;
      await withTransaction(async (client) => {
        const request = await registrationRequestById(client, id);
        if (!request) throw notFound("Registration request not found");
        if (request.status !== "PENDING") {
          throw conflict(
            ErrorCodes.REGISTRATION_REQUEST_DECIDED,
            "That application has already been decided"
          );
        }
        await settleRegistrationRequest(client, id, "REJECTED", req.actor.userId, note, null);
        await writeAudit(client, {
          action: AuditActions.OFFICER_REGISTRATION_REJECTED,
          entityType: "officer_registration_request",
          entityId: id,
          actorUserId: req.actor.userId,
          actorRole: "ADMIN",
          actorIp: ctx(req).ip,
          requestId: ctx(req).requestId,
          metadata: { employeeCode: request.employee_code, username: request.username }
        });
      });
      sendData(res, 200, { id, status: "REJECTED" });
    })
  );
  return router;
}

// server/src/app.ts
var MUTATING = /* @__PURE__ */ new Set(["POST", "PATCH", "PUT", "DELETE"]);
function buildApp() {
  const app2 = express();
  app2.set("trust proxy", true);
  app2.disable("x-powered-by");
  app2.use(requestContext);
  app2.use(securityHeaders);
  app2.use(express.json({ limit: "32kb" }));
  app2.use(parseCookies);
  app2.use(issueCsrf);
  app2.use(attachActor);
  app2.use((req, res, next) => {
    if (!MUTATING.has(req.method)) return next();
    return requireCsrf()(req, res, next);
  });
  declareRoute({
    method: "GET",
    path: "/healthz",
    auth: { kind: "public", reason: "Liveness probe; exposes no data." },
    csrf: false,
    summary: "Process liveness."
  });
  app2.get("/healthz", (_req, res) => {
    res.json({ data: { status: "ok" } });
  });
  declareRoute({
    method: "GET",
    path: "/readyz",
    auth: { kind: "public", reason: "Readiness probe; reports only migration state." },
    csrf: false,
    summary: "Database reachability and applied migration count."
  });
  app2.get("/readyz", (_req, res) => {
    query("SELECT count(*)::text AS count FROM schema_migrations").then((r) => res.json({ data: { status: "ready", migrations: Number(r.rows[0].count) } })).catch(() => res.status(503).json({ error: { code: "MAINTENANCE", message: "Database unavailable" } }));
  });
  app2.use("/api/v1", buildAuthRouter());
  app2.use("/api/v1", buildIdentityRouter());
  app2.use("/api/v1", buildReferenceRouter());
  app2.use("/api/v1", buildBookingsRouter());
  app2.use("/api/v1", buildOfficerRouter());
  app2.use("/api/v1", buildQueueRouter());
  app2.use("/api/v1", buildNotificationsRouter());
  app2.use("/api/v1", buildAdminRouter());
  app2.use(notFoundHandler);
  app2.use(errorHandler);
  return app2;
}

// scripts/vercel-entry.ts
var app = null;
var initError = null;
try {
  loadConfig();
  app = buildApp();
} catch (err) {
  initError = err instanceof Error ? err : new Error(String(err));
}
function handler(req, res) {
  if (initError || !app) {
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: {
          code: "CONFIG_ERROR",
          message: initError?.message || "Server initialization failed"
        }
      })
    );
    return;
  }
  app(req, res);
}
export {
  handler as default
};
