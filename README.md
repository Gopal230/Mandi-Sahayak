# Mandi Sahayak (मंडी सहायक)

**Smart India Hackathon — Problem Statement 26032**

> *"Farmers often face long waiting times, lack of information regarding procurement schedules and uncertainty about procurement status."*

**Mandi Sahayak** is a production-ready slot-booking and queue-management platform for agricultural procurement centres (mandis). It eliminates chaotic physical queues by providing farmers with scheduled, quantity-calibrated time slots on specific lanes, real-time queue tracking, and complete visibility through arrival, weighing, quality assessment, MSP calculation, and payment status.

---

## 🌟 What Exists Today

| Capability | Implementation & Status |
|---|---|
| **Farmer Authentication** | Passwordless phone + OTP authentication with session cookies, rate-limiting, and demo OTP reveal. |
| **Slot Booking Engine** | Capacity-aware booking engine: lane-based time intervals sized to grain volume with GiST exclusion constraints to prevent overlaps. |
| **Proximity & Mandi Resolution** | Centers tagged with proximity indicators (`(In your district)` / district info) with full nationwide district coverage. |
| **Live Queue Status & ETA** | Real-time queue position and ETA calculations derived directly from state without stale cache drifts. |
| **Gate Pass & Digital Token** | Verified booking token, scheduled time window, crop details, and QR code for entry verification. |
| **Farmer Dashboard** | Complete tracking of current bookings, procurement history, payment status, and notifications. |
| **Officer Portal** | Dedicated staff workspace with morning setup, dashboard metrics, queue management, weighment station, payments, and reporting. |
| **Weighbridge & Weighment** | Gross weight, tare weight (kg), and bag weight (kg) with automatic net weight calculation in quintals. |
| **Quality Assessment** | Official QC with accepted crop limit capped to calculated net weight, real-time auto-calculation of rejected quantity, moisture tracking, and reason logging. |
| **MSP & Payment Resolution** | Official MSP rates (RMS/KMS) snapshotted upon completion, with automated payment amount calculations and status tracking. |
| **Storage Management** | Crop-wise capacity tracking with live remaining storage, on-hand storage calculation, and inline editing. |
| **Multilingual Support** | Fully localized in **7 Indian languages**: English (en), हिन्दी (hi), मराठी (mr), বাংলা (bn), தமிழ் (ta), తెలుగు (te), ਪੰਜਾਬੀ (pa). |
| **Notifications Feed** | In-app notification feed with localized updates for booking confirmation, arrival, quality recording, and payments. |

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, i18next (7 languages).
- **Backend API**: Node.js (≥ 22.18), Express 5, TypeScript, PostgreSQL 17 (`pg`).
- **Database Engineering**: 22+ migrations, table-driven state machine triggers, GiST exclusion constraints on interval lanes, append-only audit logging, and database-backed rate-limit buckets.
- **Serverless / Monolith Hybrid**: Operates as a standard Node.js server or bundles cleanly for serverless deployment (`api/index.js` via `scripts/build-api.mjs`).

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: `v22.18` or higher
- **PostgreSQL**: `17` or higher

### 2. Environment Configuration
Create a `.env` file in `server/.env`:
```env
DATABASE_URL="postgres://<user>:<password>@localhost:5432/farmqueue"
PORT=3000
NODE_ENV=development
DEMO_MODE=true
OTP_PEPPER="demo-otp-pepper-for-local-testing-32chars"
SESSION_PEPPER="demo-session-pepper-for-local-testing"
CSRF_PEPPER="demo-csrf-pepper-for-local-testing-32chars"
DEV_OTP_TOKEN="demo-secret-token"
```

### 3. Database Provisioning & Seed Data
```bash
# Provision database schema & migrations from scratch
bash server/scripts/provision-database.sh --recreate

# Import official demonstration geography, MSP rates, and demo accounts
psql "$DATABASE_URL" -f server/imports/0001_msp_rms_2026_27_kms_2026_27.sql
psql "$DATABASE_URL" -f server/imports/0002_up_demonstration_geography.sql
psql "$DATABASE_URL" -f server/imports/0004_up_mandi_parishad_mandis.sql
psql "$DATABASE_URL" -f server/imports/0005_demo_officer_accounts.sql
```

### 4. Running the Application
From the project root:
```bash
# Install dependencies
npm install
npm --prefix server install

# Run frontend (Vite :5173) and backend (Express :3000) concurrently
npm run dev
```

Visit **http://localhost:5173** to access the web application.

---

## 🧪 Testing & Verification

```bash
# Run frontend unit & integration tests (Vitest)
npm test

# Run backend API test suite (Node test runner against PostgreSQL)
cd server && npm test

# Run code style & lint checks
npm run lint

# Production build check
npm run build
```

---

## 📱 Portals & Application Flow

### 🌾 1. Farmer Portal
- **Language & Portal Select** (`/`, `/portal`): Select preferred language and role.
- **Registration & Sign-In** (`/register`, `/login`, `/verify-otp`): Mobile OTP verification with auto-fill in demo mode.
- **Farmer Dashboard** (`/dashboard`): Live status card, active token, queue status overview, quick actions, and notifications summary.
- **Book Slot** (`/book-slot`): Select crop, nearby procurement centre (tagged by proximity/district), preferred date, and lane-scheduled time window.
- **Booking Confirmation** (`/booking-confirmation`): Downloadable digital booking slip with QR token code and mandi guidance.
- **My Bookings & Queue** (`/my-booking`, `/queue`): View booking history, lane position, vehicle reporting details, and dynamic queue ETA.
- **Procurement & Payments** (`/procurement`, `/payment`): Weight slip breakdowns (gross, tare, bags, net), QC acceptance results, MSP payment calculation, and disbursement tracking.

### 🏛️ 2. Officer & Mandi Portal
- **Staff Authentication** (`/staff-login`, `/staff-register`): Login via verified staff mobile or register for centre allocation.
  - **Demo Officers**:
    - Aligarh Centre: `9999900001` (OTP: `1111`)
    - Mathura Centre: `9999900002` (OTP: `1111`)
    - Hathras Centre: `9999900003` (OTP: `1111`)
    - Bulandshahr Centre: `9999900004` (OTP: `1111`)
- **Procurement Overview & Storage** (`/officer`): Real-time metrics, weighbridge operational toggles, active slot counts, crop-wise storage limits with inline capacity updates, and live MSP lookups.
- **Live Queue Monitoring** (`/officer/queue`): Filter active queue by status and crop, mark farmer arrivals at the gate, and send farmers to weighbridge.
- **Weighment & Quality Station** (`/officer/weighment`):
  - Enter gross weight (quintals), tare weight (kg), and bag tare (kg).
  - Net weight computed automatically.
  - Quality check enforces that accepted crop quantity cannot exceed calculated net weight.
  - Rejected crop automatically calculates (`netWeight - accepted`).
  - Mandatory rejection reason logging if rejected weight > 0, plus moisture percentage.
  - Single-action completion and state transition.
- **Payments Management** (`/officer/payments`): Filter transactions by date and status (`Pending`, `Initiated`, `Paid`), and record transaction reference numbers.
- **Operational Reports** (`/officer/reports`): Daily summaries, throughput metrics, and weighment record logs.

---

## 🔒 Security & Data Principles

1. **Deterministic Capacity**: Lane capacity is modeled as discrete intervals with duration proportional to harvest volume. GiST exclusion constraints make double-booking impossible.
2. **No Data Hallucinations**: Queue estimates and ETAs are computed on-the-fly from actual lane states, never cached or mocked.
3. **Financial Precision**: All monetary values are handled in integer paise and PostgreSQL `numeric` to avoid floating-point inaccuracies. MSP rates are snapshotted permanently at procurement completion.
4. **Defensive Rate-Limiting**: Database-backed rate limit counters isolate IPs and phone numbers against abuse without cross-worker race conditions.
5. **Role-Based Access Control**: Route registry checks all endpoints on every request; session tokens are stored in `HttpOnly`, `SameSite=Lax` cookies with strict CSRF tokens required on writes.

---

## 📂 Codebase Structure

```
mandisahayak/
├── api/                      # Vercel serverless bundled entrypoint
├── docs/                     # Design specs, API contracts & hackathon reports
├── public/
│   └── locales/              # i18n JSON translations (en, hi, mr, bn, ta, te, pa)
├── scripts/                  # Bundling and utility scripts
├── server/
│   ├── imports/              # Official SQL datasets (MSP, Mandis, Demo Accounts)
│   ├── migrations/           # Database schema migrations (0001 - 0022)
│   └── src/
│       ├── core/             # DB connection, RBAC, config, errors, audit & rate limits
│       ├── engines/          # Scheduling engine & notification providers
│       └── modules/          # Auth, Bookings, Officer, Queue, Reference
└── src/
    ├── auth/                 # React authentication context & role guards
    ├── components/           # Reusable UI controls, layout wrappers & error boundaries
    ├── hooks/                # Operational queue hooks & API resource managers
    ├── lib/                  # API client, error code translators, formatting utilities
    └── pages/
        ├── farmer/           # Farmer portal screens (Register, Book, Queue, Payment)
        └── officer/          # Officer portal screens (Dashboard, Queue, Weighing, Reports)
```

---

## 📜 Official Data Sources & Caveats

- **Mandi Geography**: Demonstration mandis are mapped from official Rajya Krishi Utpadan Mandi Parishad records.
- **MSP Pricing**: Official rates are derived from PIB Cabinet announcements (RMS/KMS 2026-27).
- **Payment & SMS Handling**: The system tracks payment states and transaction reference IDs but does not process banking transactions directly. SMS notifications utilize a local demo outbox adapter during evaluation.
