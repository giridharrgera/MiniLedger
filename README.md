# MiniLedger

A mobile-first personal lending tracker. Record money you lend to friends, see what is outstanding or overdue, and mark a loan repaid in full.

MiniLedger is a real client/server application: a React Native app built with Expo talks to an Express + TypeScript API backed by PostgreSQL. Loan data is never mocked. Only OTP delivery is simulated: the code is printed in the API terminal and is never returned by the API.

**Repository:** https://github.com/giridharrgera/MiniLedger

---

## Run locally

### Prerequisites

- Node.js 24 (tested with 24.22.1) and npm
- Docker Desktop, or PostgreSQL 17 running locally
- Optional: Expo Go on a phone, or an iOS/Android simulator

### 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d db
```

This creates:

- user `miniledger` / password `miniledger`
- database `miniledger` on port `5432`
- database `miniledger_test` for the automated tests
- a named volume so data persists

The test database is created only when the volume is first initialized. On an existing volume, create it once:

```bash
docker compose exec db createdb -U miniledger miniledger_test
```

Using your own PostgreSQL? Create both databases and point `DATABASE_URL` and `TEST_DATABASE_URL` at them.

### 2. Start the API

```bash
cd backend
cp .env.example .env
```

Set `JWT_SECRET` and `OTP_HASH_SECRET` to two different random values of at least 32 characters:

```bash
openssl rand -hex 32
```

Then install, initialize the schema, and run:

```bash
npm install
npm run db:init
npm run dev
```

The API listens on `http://localhost:4000`. Verify it:

```bash
curl http://localhost:4000/api/health
```

When you request an OTP, the API terminal prints it:

```text
[DEV OTP] +919876543210 -> 123456 (expires in 5 min)
```

The OTP is never included in the API response.

### 3. Start the mobile app

In a second terminal:

```bash
cd mobile
npm install
npm start
```

Press `w` for web, `i` for the iOS simulator, `a` for the Android emulator, or scan the QR code with Expo Go.

API URL behavior:

- **Web / iOS simulator:** defaults to `http://localhost:4000`.
- **Android emulator:** defaults to `http://10.0.2.2:4000`.
- **Physical phone:** copy `mobile/.env.example` to `mobile/.env` and set your computer's LAN IP:
  ```dotenv
  EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
  ```
  Keep the phone and computer on the same Wi-Fi, allow port 4000, and restart Expo after changing the file.

Sign in with any valid 10-digit Indian number (for example `98765 43210`) and enter the OTP from the API terminal. On iOS/Android the JWT is stored in Expo SecureStore; the web demo uses localStorage.

### Quick fixes

- **"Could not reach MiniLedger" / `ECONNREFUSED`:** start PostgreSQL and the API, check `/api/health`, and confirm the mobile API URL.
- **"Invalid environment configuration":** set both 32+ character secrets in `backend/.env`.
- **OTP request returns `503`:** the API is running with `NODE_ENV=production`, where mock OTP is intentionally disabled.
- **Tests cannot connect or wiped data:** set `TEST_DATABASE_URL`. The suite truncates that database, so never point it at development data.

---

## Features

- **Phone + OTP login:** fixed `+91` prefix, six-digit mock OTP, 30-second resend cooldown, 5-minute expiry, 5 attempts, 5 requests per hour, one-time use, JWT session.
- **Dashboard:** Total Lent, Total Repaid, Overdue Amount, urgency-sorted loans, overdue highlighting, pull-to-refresh, refresh button, loading/error/empty states.
- **Add Loan:** friend's name, INR amount, native date picker, inline validation, duplicate-submit prevention, success toast.
- **Repayment:** confirmation dialog, atomic database update, immediate summary refresh.
- **Session:** SecureStore on iOS/Android, localStorage fallback on web, logout.
- **Isolation:** every loan read and write is scoped to the user ID in the verified JWT, never to a client-supplied ID.

The UI uses a light sage background, deep green/navy text, emerald actions, red overdue accents, and white rounded cards in a responsive, mobile-first layout.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Mobile | React Native 0.88, Expo SDK 58, Expo Router 58, React 19.3, TypeScript |
| Storage | Expo SecureStore (native), localStorage (web demo) |
| API | Node.js 24, Express 5.3, TypeScript, Zod 4.6 |
| Auth | `jsonwebtoken` HS256, HMAC-SHA256 OTP hashes |
| Database | PostgreSQL 17, `pg` 8.23, `NUMERIC(12,2)` money |
| Tests | Vitest 5, Supertest 7, real PostgreSQL test database |

Node 24.22.1 and PostgreSQL 17.9 were used while building this project. The Docker image is PostgreSQL 17 Alpine.

---

## API

Base URL: `http://localhost:4000/api`

Success responses use `{ "success": true, "data": ... }`. Errors use:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [] }
}
```

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | No | API and database health |
| `POST` | `/auth/request-otp` | No | Generate and print a mock OTP |
| `POST` | `/auth/verify-otp` | No | Consume OTP and return a JWT |
| `GET` | `/loans` | Bearer | List the current user's loans |
| `GET` | `/loans/summary` | Bearer | Totals for the current user |
| `POST` | `/loans` | Bearer | Create a loan |
| `PATCH` | `/loans/:id/repay` | Bearer | Mark a loan fully repaid |

All loan routes require `Authorization: Bearer <jwt>`. Ownership comes from the JWT subject, never from the request body.

- **Loan order:** overdue unpaid (due date ascending), upcoming unpaid (due date ascending), then repaid (newest first).
- **Total Lent:** all-time amount across all loans, including repaid loans.
- **Total Repaid:** sum of repaid loans.
- **Overdue Amount:** sum of unpaid loans whose due date is before today.
- **Repayment:** `404 LOAN_NOT_FOUND` for a missing or foreign loan, `409 LOAN_ALREADY_REPAID` if already settled.
- **Auth errors:** invalid, expired, consumed, or attempt-locked OTPs return `401 INVALID_OTP`; unknown loan IDs never reveal another user's data.

---

## Architecture and security

```text
Expo / React Native ──Bearer JWT──► Express API ──parameterized SQL──► PostgreSQL
        │                              │
        └── SecureStore / localStorage │── Zod validation
                                       └── dev OTP printed to terminal
```

- OTPs are random six-digit codes stored only as HMAC-SHA256 hashes. Verification uses `timingSafeEqual`, transactions, and a per-phone advisory lock. Codes are single-use and expire after five minutes.
- JWT signatures, issuer, audience, and algorithm are verified. `requireAuth` derives `userId` from the token subject.
- Every loan query filters by the JWT-derived user ID, including repayment. Cross-user access returns an empty list or `404`.
- Money is stored as `NUMERIC(12,2)` and returned as strings, avoiding floating-point errors.
- PostgreSQL `CHECK` constraints enforce positive amounts, valid status, and repayment consistency.
- Parameterized SQL prevents injection; Zod validates every request.
- Mock OTP is disabled when `NODE_ENV=production`, so a deployment cannot expose terminal-only login.

---

## Database

`schema.sql` is idempotent and applied by `npm run db:init`; tests apply the same schema.

- **`users`:** UUID key, unique E.164 phone number, creation timestamp.
- **`loans`:** UUID key, `user_id` foreign key with cascade delete, trimmed name (1–80 chars), positive `NUMERIC(12,2)` amount, due date, `unpaid`/`repaid` status, and a repayment timestamp consistency check. Indexes cover `(user_id, status, due_date)` and `(user_id, created_at DESC)`.
- **`otps`:** phone number, HMAC hash, expiry, consumption timestamp, attempts, and a `(phone_number, created_at DESC)` index.

---

## Tests and verification

Run from `backend/`:

```bash
npm test
```

The 9 integration tests run against a real PostgreSQL database and cover health, phone validation, unauthenticated access, OTP non-leakage, one-time use, cooldowns, attempt limits, expiry, loan creation/normalization, summary math, ordering, repayment conflicts, validation, and cross-user isolation.

The default test database is `postgresql://miniledger:miniledger@localhost:5432/miniledger_test`. Override it with `TEST_DATABASE_URL`; the suite truncates it before each test.

Other checks:

```bash
# backend
cd backend && npm run typecheck && npm run build

# mobile
cd mobile && npm run typecheck && npm run lint && npx expo-doctor
```

Results in this environment: 9/9 API tests passed; backend typecheck and build passed; mobile typecheck and lint passed; Expo Doctor 20/20; production web export passed.

The full journey was manually exercised against the real API and PostgreSQL: login with a terminal OTP, empty state, validation, creating overdue and upcoming loans, correct totals, overdue highlighting, repayment, session restore, logout, sign-out on `401`, and offline retry.

**Not verified here:** native iOS/Android execution. SecureStore, the iOS inline date picker, and the Android calendar dialog use platform APIs but still need a device or simulator smoke test. No automated React Native UI tests are included.

---

## Key files

| File | Role |
| --- | --- |
| `backend/db/schema.sql` | Tables, constraints, indexes |
| `backend/src/lib/otp.ts` | OTP request/verify transactions, hashing, cooldown and attempt limits |
| `backend/src/middleware/require-auth.ts` | JWT verification and server-derived user ID |
| `backend/src/routes/loans.ts` | Scoped queries, summary aggregates, atomic repayment |
| `backend/src/lib/schemas.ts` | Zod request validation |
| `mobile/src/api/client.ts` | Typed API client, auth header, timeout, error envelopes |
| `mobile/src/auth/` | Session hydration and SecureStore/localStorage persistence |
| `mobile/src/app/(app)/index.tsx` | Dashboard fetching, refresh, states, repayment |
| `mobile/src/app/(app)/add-loan.tsx` | Loan form, validation, submission |
| `backend/tests/api.test.ts` | End-to-end API and isolation tests |

---

## Notes and limitations

- Single currency (INR), full repayment only; partial payments are not supported.
- Past due dates are allowed so existing overdue debts can be recorded.
- JWT sign-out is client-side only; there is no refresh-token rotation or server denylist.
- OTP rows are not periodically purged.
- The loan list has no pagination or search.
- The web demo stores the token in localStorage; a production web app should prefer httpOnly cookies.
- Native runtime checks and a CI pipeline are not included; all checks above were run locally.
