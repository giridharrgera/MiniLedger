# MiniLedger

A full-stack, mobile-first personal lending tracker. Record money you lend to friends, see what is still outstanding or overdue, and mark a loan repaid in full.

MiniLedger is a real client/server application: the Expo app talks to an Express API, which reads and writes PostgreSQL. There is no fake local-only data layer. Login is a development-only OTP flow; the code is printed in the API terminal and is never returned by the API.

> **Framework:** React Native with Expo SDK 58 and Expo Router. The browser target is a preview of the same React Native app, not a separate React web application.

**No loan data is mocked or seeded in the client.** Every loan, repayment, and summary value comes from PostgreSQL through the authenticated API. The only intentionally mocked element is OTP delivery, because the assignment requires a terminal-only code instead of an SMS provider.

---

## Features

- **Phone + OTP login** with a fixed `+91` prefix, six-digit mock OTP, 30-second resend cooldown, expiry, attempt limits, one-time use, and JWT access tokens.
- **Dashboard** with Total Lent, Total Repaid, Overdue Amount, an urgency-sorted loan list, overdue highlighting, pull-to-refresh, a refresh button, empty state, loading state, and retryable error state.
- **Add Loan** form with friend's name, INR amount, native iOS/Android date picker, inline validation, duplicate-submit prevention, success toast, and automatic dashboard refresh.
- **Full repayment** with a confirmation dialog, an atomic database update, and immediate summary refresh.
- **Session persistence** using Expo SecureStore on iOS/Android, with a localStorage fallback on the web demo.
- **Logout** that clears the local session and returns to the protected login screen.
- **Per-user isolation**: every loan read and write is scoped to the user ID inside the verified JWT, never to a client-supplied user ID.

### UI direction

Light sage background, deep green/navy-charcoal text, emerald actions, red overdue accents, white rounded cards, and a calm, polished finance-app layout. The dashboard and forms are mobile-first and also render responsively on the web.

---

## Technology

| Layer | Technology |
| --- | --- |
| Mobile | React Native 0.88, Expo SDK 58, React 19.3, TypeScript, Expo Router 58 |
| Mobile storage | Expo SecureStore (native), localStorage (web demo only) |
| API | Node.js 24, Express 5.3, TypeScript, Zod 4.6 |
| Auth | `jsonwebtoken` HS256, HMAC-SHA256 OTP hashes |
| Database | PostgreSQL 17, `pg` 8.23, `NUMERIC(12,2)` money columns |
| Tests | Vitest 5, Supertest 7, real PostgreSQL test database |

Node 24.22.1 and PostgreSQL 17.9 were used while building this project. The Docker setup uses PostgreSQL 17 Alpine.

---

## Architecture

```text
┌─────────────────────────────────────────────┐
│ Expo / React Native app                     │
│                                             │
│  Login ──► SecureStore (native)             │
│  Dashboard ──► API client ──► Bearer JWT    │
│  Add Loan / Mark Repaid                     │
└──────────────────────┬──────────────────────┘
                       │ HTTPS/HTTP + JSON
                       ▼
┌─────────────────────────────────────────────┐
│ Express API                                 │
│                                             │
│  Zod request validation                     │
│  requireAuth ──► userId from JWT subject    │
│  /api/auth/*   /api/loans/*                 │
└──────────────────────┬──────────────────────┘
                       │ parameterized SQL (pg)
                       ▼
┌─────────────────────────────────────────────┐
│ PostgreSQL                                  │
│                                             │
│  users   loans   otps                       │
│  FKs, checks, indexes, numeric amounts      │
└─────────────────────────────────────────────┘

Mock OTP delivery:

  request OTP ──► hash stored in otps
          └────► plaintext printed only to the API terminal
```

### Request lifecycle (beginner view)

1. A screen calls a function in `mobile/src/api/client.ts`.
2. The client sends JSON to `http://<host>:4000/api/...`. Authenticated requests include `Authorization: Bearer <token>`.
3. In Express, Zod validates the request body or route parameter. Invalid input becomes a `400` with field-level details.
4. `requireAuth` verifies the JWT signature, issuer, audience, and subject. It places `userId` on the request.
5. The route runs parameterized SQL through `pg`, always filtering by `user_id = $1` for loans.
6. PostgreSQL constraints (foreign keys, `CHECK`s, `NUMERIC`) provide a second line of defense.
7. The API returns `{ success: true, data: ... }`. Errors return `{ success: false, error: { code, message, details? } }`.
8. The mobile UI updates, shows a toast, or signs the user out if the API returns `401`.

### OTP login

- `POST /api/auth/request-otp` validates an E.164 phone number.
- A random six-digit code is generated with `crypto.randomInt`.
- Only an HMAC-SHA256 hash of `phone:otp` is stored. The plaintext OTP is printed to the API terminal for the mock flow.
- Requests are serialized per phone number with a PostgreSQL advisory transaction lock, so concurrent requests cannot both bypass the cooldown/rate limit.
- Old unused codes are invalidated when a new code is requested.
- The code expires after 5 minutes. There is a 30-second resend cooldown, a maximum of 5 requests per hour, and a maximum of 5 verification attempts.
- `POST /api/auth/verify-otp` locks the latest OTP row, checks expiry and the hash with a timing-safe comparison, consumes the code, and creates the user if this is their first login.
- A code can only be used once. A successful or failed-after-max-attempts code is marked consumed.
- On success the API signs a JWT whose `sub` is the user's UUID. No OTP is ever included in an API response.

### User isolation

Every route under `/api/loans` runs through `requireAuth`:

```ts
req.auth = { userId: payload.sub, phoneNumber: payload.phoneNumber };
```

The loan queries use `req.auth!.userId`, for example:

```sql
SELECT ... FROM loans WHERE user_id = $1 ...
UPDATE loans SET status = 'repaid' ...
WHERE id = $1 AND user_id = $2 AND status = 'unpaid'
```

The API does not accept a `userId` from the mobile client. Trying to read or repay another user's loan returns an empty list or `404 LOAN_NOT_FOUND`. This is covered by an integration test.

### Money and dates

- Amounts live in `NUMERIC(12,2)` columns and are returned as strings such as `"1500.50"`; JavaScript floating-point arithmetic is never used for storage or summation.
- The summary SQL casts totals to `numeric(20,2)::text`, so even zero is `"0.00"`.
- The mobile client sends a date-only string (`YYYY-MM-DD`) and uses local-date helpers to avoid UTC shifts. Both client and server validate the calendar date.

---

## Project layout

```text
.
├── backend/
│   ├── db/schema.sql              # users, loans, otps + constraints/indexes
│   ├── src/
│   │   ├── app.ts                 # Express app, CORS, health, routers
│   │   ├── server.ts              # HTTP listener + graceful shutdown
│   │   ├── config/env.ts          # Zod-validated environment
│   │   ├── db/pool.ts             # pg connection pool
│   │   ├── db/init.ts             # applies db/schema.sql
│   │   ├── lib/
│   │   │   ├── otp.ts             # OTP request/verification transactions
│   │   │   ├── auth.ts            # JWT signing/verification
│   │   │   ├── schemas.ts         # Zod request schemas
│   │   │   └── validation.ts      # validation errors
│   │   ├── middleware/
│   │   │   ├── require-auth.ts
│   │   │   └── error-handler.ts
│   │   └── routes/
│   │       ├── auth.ts
│   │       └── loans.ts
│   ├── tests/api.test.ts          # 9 integration tests
│   └── vitest.config.ts
├── mobile/
│   ├── src/app/                   # Expo Router routes
│   │   ├── _layout.tsx            # auth-aware protected stack
│   │   ├── login.tsx
│   │   └── (app)/
│   │       ├── index.tsx          # dashboard
│   │       └── add-loan.tsx
│   ├── src/api/client.ts
│   ├── src/auth/                  # AuthContext + token storage
│   ├── src/components/            # cards, fields, buttons, toasts, states
│   ├── src/utils/                 # dates, INR formatting, confirmation
│   └── src/theme.ts
├── docker-compose.yml
├── docker/postgres-init.sql       # creates the separate test database
└── README.md
```

---

## Local setup

### Prerequisites

- Node.js 20+ (Node 24 recommended)
- npm
- Docker Desktop (or a local PostgreSQL 17 instance)
- Optional: Expo Go on a phone, or an iOS/Android simulator

### 1. Start PostgreSQL

From the project root:

```bash
docker compose up -d db
```

This creates:

- user `miniledger`
- password `miniledger`
- database `miniledger` on port `5432`
- database `miniledger_test` (used by the automated tests)
- a named volume so data persists

The test database is created by `docker/postgres-init.sql` only when the volume is initialized for the first time. If you reuse an older volume, create it once manually:

```bash
docker compose exec db createdb -U miniledger miniledger_test
```

If you already run PostgreSQL locally, create equivalent databases and point `DATABASE_URL`/`TEST_DATABASE_URL` at them.

### 2. Run the API

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

- Replace both secrets with long random values (at least 32 characters each). For example:
  ```bash
  openssl rand -hex 32
  ```
- Keep `DATABASE_URL` aligned with your database.
- `CORS_ORIGIN` is a comma-separated allowlist used when `NODE_ENV=production`. In development, any origin is allowed for convenience.

Install and initialize:

```bash
npm install
npm run db:init
npm run dev
```

The API listens on `http://localhost:4000` by default. Check it:

```bash
curl http://localhost:4000/api/health
```

Expected:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-10-23T12:00:00.000Z"
  }
}
```

After requesting an OTP, the API terminal prints something like:

```text
[DEV OTP] +919876543210 -> 123456 (expires in 5 min)
```

The OTP is not returned to the app. That is intentional.

### 3. Run the mobile app

In a second terminal:

```bash
cd mobile
npm install
```

API URL behavior:

- **Web and iOS simulator:** `http://localhost:4000` is used when `EXPO_PUBLIC_API_URL` is unset.
- **Android emulator:** `http://10.0.2.2:4000` is used automatically.
- **Physical phone with Expo Go:** `localhost` points at the phone, not your computer. Copy `mobile/.env.example` to `mobile/.env` and set your computer's LAN IP:
  ```dotenv
  EXPO_PUBLIC_API_URL=http://192.168.1.100:4000
  ```
  Keep the phone and computer on the same Wi-Fi, allow port 4000 through the firewall, and restart Expo after changing the env file.

Start Expo:

```bash
npm start
```

Then press `w` for web, `i` for the iOS simulator, `a` for the Android emulator, or scan the QR code with Expo Go.

For the web demo only:

```bash
npm run web
```

Sign in with any valid 10-digit Indian mobile number, for example `98765 43210`. Read the generated OTP from the API terminal.

> The web build stores the JWT in localStorage because SecureStore is native-only. That fallback exists only to make the web demo testable. On iOS/Android the token is stored with Expo SecureStore.

---

## API reference

Base URL: `http://localhost:4000/api`

Successful responses use:

```json
{ "success": true, "data": { } }
```

Errors use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": [{ "field": "amount", "message": "..." }]
  }
}
```

### `GET /health`

Checks the API and database. Returns `200` when PostgreSQL responds, `503` otherwise.

### `POST /auth/request-otp`

```json
{ "phoneNumber": "+919876543210" }
```

Returns `200`:

```json
{
  "success": true,
  "data": {
    "message": "OTP generated successfully.",
    "expiresInSeconds": 300,
    "resendAfterSeconds": 30
  }
}
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Phone is not valid E.164. |
| 429 | `OTP_COOLDOWN` | A code was generated too recently. |
| 429 | `OTP_RATE_LIMITED` | More than 5 requests in one hour. |
| 503 | `OTP_UNAVAILABLE` | Mock OTP was invoked with `NODE_ENV=production`. |

### `POST /auth/verify-otp`

```json
{ "phoneNumber": "+919876543210", "otp": "123456" }
```

Returns `200`:

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "tokenType": "Bearer",
    "expiresInSeconds": 604800,
    "user": {
      "id": "<uuid>",
      "phoneNumber": "+919876543210"
    }
  }
}
```

Invalid, expired, consumed, or attempt-locked codes return `401 INVALID_OTP`.

### Authenticated requests

Send:

```http
Authorization: Bearer <jwt>
```

Without a valid token, loan routes return `401 UNAUTHORIZED`.

### `GET /loans`

Returns only the current user's loans. Ordering is:

1. overdue unpaid loans by due date ascending,
2. upcoming unpaid loans by due date ascending,
3. repaid loans by creation time descending.

```json
{
  "success": true,
  "data": {
    "loans": [
      {
        "id": "7f5f72e0-58ab-4b0a-bc2b-c9f9eff2ef23",
        "friendName": "Ravi Kumar",
        "amount": "999.90",
        "dueDate": "2026-10-20",
        "status": "unpaid",
        "repaidAt": null,
        "createdAt": "2026-10-20T10:00:00.000Z"
      }
    ]
  }
}
```

### `GET /loans/summary`

```json
{
  "success": true,
  "data": {
    "totalLent": "2500.40",
    "totalRepaid": "0.00",
    "overdueAmount": "999.90"
  }
}
```

Definitions:

- **Total Lent** is the all-time amount across all of the user's loans, including repaid loans.
- **Total Repaid** is the sum of loans with status `repaid`.
- **Overdue Amount** is the sum of unpaid loans whose due date is before today.

### `POST /loans`

```json
{
  "friendName": "Anita Sharma",
  "amount": "1200",
  "dueDate": "2026-11-01"
}
```

Amount accepts a number or string, must be positive, and supports at most two decimal places. It is normalized to two decimals (`"1200.00"`). The response is `201`:

```json
{
  "success": true,
  "data": {
    "loan": {
      "id": "<uuid>",
      "friendName": "Anita Sharma",
      "amount": "1200.00",
      "dueDate": "2026-11-01",
      "status": "unpaid",
      "repaidAt": null,
      "createdAt": "2026-10-23T12:00:00.000Z"
    }
  }
}
```

Invalid names, amounts, and calendar dates return `400 VALIDATION_ERROR`.

### `PATCH /loans/:id/repay`

Marks the whole loan repaid. It is atomic:

```sql
UPDATE loans
SET status = 'repaid', repaid_at = NOW()
WHERE id = $1 AND user_id = $2 AND status = 'unpaid'
```

- `200` with the updated loan on success.
- `404 LOAN_NOT_FOUND` if the loan does not exist or belongs to someone else.
- `409 LOAN_ALREADY_REPAID` if it was already repaid.

A repeated repayment cannot change `repaid_at` again.

### Example authenticated request

```bash
TOKEN="<token returned by verify-otp>"

curl -s http://localhost:4000/api/loans \
  -H "Authorization: Bearer $TOKEN"

curl -s http://localhost:4000/api/loans/summary \
  -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:4000/api/loans \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"friendName":"Anita Sharma","amount":"1200","dueDate":"2026-11-01"}'
```

---

## Database design

`backend/db/schema.sql` is idempotent and is applied by `npm run db:init`. The tests apply the same schema to the test database.

### `users`

- UUID primary key.
- Unique `phone_number` with an E.164 `CHECK`.
- `created_at`.

### `loans`

- UUID primary key.
- `user_id` foreign key to `users`, `ON DELETE CASCADE`.
- `friend_name` trimmed and constrained to 1–80 characters.
- `amount NUMERIC(12,2)` with a positive-value check.
- `due_date DATE`.
- `status` constrained to `unpaid` or `repaid`.
- `repaid_at` consistency check: unpaid loans have no repaid timestamp; repaid loans must have one.
- Index `(user_id, status, due_date)` for list/urgency queries.
- Index `(user_id, created_at DESC)` for per-user ordering.
- Indexes lead with `user_id`, matching the mandatory ownership filter.

### `otps`

- UUID primary key.
- Phone number (E.164 checked).
- `otp_hash` — HMAC-SHA256, never the plaintext code.
- `expires_at`, `consumed_at`, `attempts`, `created_at`.
- Index `(phone_number, created_at DESC)` for fetching the latest code and checking rate limits.

### Why these choices

- **Parameterized queries** prevent SQL injection.
- **Server-derived ownership** prevents a modified client from reading another user's rows.
- **Database constraints** prevent invalid amounts and repayment states even if application code changes.
- **Transactions and row locks** make OTP verification and repayment race-safe.
- **Numeric money** avoids floating-point rounding errors.
- **Hashed OTPs** mean a database read does not expose a usable login code.

---

## Tests and verification

### Automated integration tests

Run from `backend/`:

```bash
npm test
```

The suite uses a real PostgreSQL database (not mocks) and covers:

1. API/database health.
2. Invalid phone validation and unauthenticated loan access.
3. OTP generated but never returned in the response.
4. One-time OTP consumption and JWT issuance.
5. Resend cooldown enforcement.
6. Attempt-limit invalidation.
7. Expired OTP rejection and consumption.
8. Loan creation, trimming, amount normalization, summary math, ordered listing, repayment, and repeat-repayment conflict.
9. Invalid loan payloads and cross-user read/repay isolation.

Current result: **9 tests passed**.

The test database defaults to:

```text
postgresql://miniledger:miniledger@localhost:5432/miniledger_test
```

Override it with `TEST_DATABASE_URL` if needed:

```bash
TEST_DATABASE_URL=postgresql://user:pass@host:5432/test_db npm test
```

> Tests run `TRUNCATE TABLE otps, loans, users CASCADE` before each test. Do not point `TEST_DATABASE_URL` at a database whose data you want to keep.

### Other checks

```bash
# backend
cd backend
npm run typecheck
npm run build

# mobile
cd mobile
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform web
```

Results in this build environment:

- Backend TypeScript check: passed.
- Backend production build: passed.
- Backend integration tests: 9/9 passed against PostgreSQL 17.
- Mobile TypeScript check: passed.
- Expo lint: passed.
- Expo Doctor: 20/20 checks passed.
- Production web export: passed.

### Manual end-to-end run (Expo web)

The following was exercised in a browser against the real local API and PostgreSQL:

- Login with `+91 98765 43210`; the OTP was read from the API terminal.
- Empty dashboard state.
- Add-loan validation for missing/invalid fields.
- Created an overdue loan (Ravi Kumar, ₹2,500.50) and an upcoming loan (Anita Sharma, ₹1,200.00).
- Dashboard totals: Total Lent ₹3,700.50, Total Repaid ₹0.00, Overdue ₹2,500.50; both loans rendered; overdue card highlighted.
- Marked the overdue loan repaid; Total Repaid became ₹2,500.50, Overdue became ₹0.00, and the card switched to Repaid/Settled.
- Logout cleared the token and returned to login.
- Signing back in restored the stored ledger.
- Reloading the web page preserved the session.
- An invalid stored token caused a `401`, which signed the user out and returned to login.
- Stopping the API produced a retryable offline error state; restarting the API and pressing **Try again** restored the dashboard.

### Not verified here

- Native iOS or Android runtime behavior was not executed in this environment (no simulator/device run).
- The native SecureStore path, iOS inline date picker, and Android calendar dialog are implemented with the platform APIs but should be smoke-tested on a real device or simulator.
- No automated React Native UI tests are included; UI verification was performed through the Expo web target and the automated API suite.
- `npm audit` reports transitive advisories in the Expo/Metro toolchain. They were not force-upgraded, because `npm audit fix --force` can break Expo SDK compatibility.

---

## Interview walkthrough: important files

### Backend

**`backend/db/schema.sql`**
The source of truth for data integrity. Start here to explain the three tables, foreign keys, status/repaid consistency check, numeric money, and indexes that match the queries.

**`backend/src/lib/otp.ts`**
The most security-sensitive file.

- `requestOtp` opens a transaction, acquires a per-phone advisory lock, checks the cooldown and hourly limit, invalidates old codes, hashes the new code, stores it with an expiry, commits, and only then prints the plaintext code to the terminal.
- `verifyOtpAndGetUser` opens a transaction, selects the newest OTP `FOR UPDATE`, rejects missing/consumed/expired codes, increments failed attempts with automatic consumption at the limit, consumes all unused codes on success, and upserts the user.
- Hashing uses HMAC-SHA256 with a secret; comparison uses `timingSafeEqual`.

**`backend/src/middleware/require-auth.ts`**
Parses `Bearer <token>`, verifies the JWT (including issuer/audience/algorithm), and attaches `req.auth`. Every loan route uses this middleware.

**`backend/src/routes/loans.ts`**

- `GET /` orders overdue → upcoming → repaid and filters by `req.auth!.userId`.
- `GET /summary` uses filtered aggregate SQL (`FILTER (WHERE ...)`) and returns two-decimal money strings.
- `POST /` validates, inserts, and returns `201`.
- `PATCH /:id/repay` is an atomic conditional update. If no row is changed, it distinguishes a missing/foreign loan (`404`) from an already-repaid loan (`409`).

**`backend/src/lib/schemas.ts` and `validation.ts`**
Zod validates phone numbers, six-digit OTPs, real calendar dates, positive amounts with at most two decimals, names, and UUIDs. Validation failures are normalized into a consistent error envelope.

**`backend/src/app.ts`**
Shows middleware ordering (request logging in development, CORS, JSON limit, health, routers, not-found, error handler) and the distinction between development CORS behavior and a production allowlist.

### Mobile

**`mobile/src/app/_layout.tsx`**
Uses Expo Router's `Stack.Protected`. While the session is hydrating, a loading screen is shown. Authenticated users see the `(app)` stack; unauthenticated users see `login`. This makes protected navigation declarative rather than manual redirects.

**`mobile/src/auth/AuthContext.tsx` and `tokenStorage.ts`**
Hydrates the token on launch, exposes `status`, and provides `signIn`/`signOut`. SecureStore is used on iOS/Android; the localStorage branch exists for web demos.

**`mobile/src/api/client.ts`**
Small typed API layer. It builds the correct base URL per platform, adds the Bearer token, enforces a 15-second timeout with `AbortController`, parses the success/error envelopes, and exposes `isUnauthorized` so screens can sign out on `401`.

**`mobile/src/app/login.tsx`**
The two-stage phone/OTP screen. It validates ten digits, formats `+91` display text, requests and verifies the OTP, enforces a visible resend countdown, shows inline errors, prevents double submission, and shows the demo-mode note.

**`mobile/src/app/(app)/index.tsx`**
Dashboard orchestration. It fetches loans and summary in parallel with `Promise.all`, uses request IDs to ignore stale responses, refreshes on focus (so adding a loan updates the dashboard), exposes pull-to-refresh and a refresh button, handles loading/error/empty states, and performs repayment with confirmation and a toast.

**`mobile/src/app/(app)/add-loan.tsx`**
Form validation mirrors the server, amount input is sanitized, duplicate submits are blocked, and the API result drives a success toast and back navigation. The dashboard refreshes when it regains focus.

**`mobile/src/components/DateField.tsx` and `DateField.web.tsx`**
Platform-specific date input. Native uses `@react-native-community/datetimepicker` (Android dialog, inline iOS picker); web uses a native HTML date input so the browser demo is testable. Resolver picks the platform-specific file automatically.

**`mobile/src/components/SummaryCards.tsx`, `LoanCard.tsx`**
Presentation components for totals and loan states. They distinguish unpaid, due-today, overdue, and repaid, and show explicit unavailable state when totals cannot load.

**`backend/tests/api.test.ts`**
A good interview example of testing behavior rather than implementation: OTP leakage, one-time codes, cooldowns, expiry, ownership isolation, validation, summary math, and idempotency/conflict behavior against a real PostgreSQL schema.

---

## Design decisions and assumptions

- **Single currency (INR).** The assignment is personal lending in India; amounts are stored as `NUMERIC(12,2)` and displayed with `Intl.NumberFormat('en-IN')`.
- **Full repayment only.** There is no partial repayment or repayment history; marking repaid is a one-way state transition. The UI states this.
- **Past due dates are allowed.** This supports recording an existing overdue debt. The server derives overdue status from the due date instead of asking the client.
- **Total Lent is all-time.** It includes repaid loans. Total Repaid is a separate cumulative figure, and Overdue is the current unpaid overdue subset.
- **The user ID never comes from the client.** The JWT subject is the only source of ownership. Even a tampered loan ID cannot cross accounts.
- **Mock OTP is intentionally non-production.** When `NODE_ENV=production`, the request-OTP endpoint returns `503 OTP_UNAVAILABLE` so a deployment cannot accidentally expose a terminal-only login flow. Run the demo in development.
- **No SMS provider.** This avoids paid services and matches the assignment requirement.
- **No partial updates or deletes.** The assignment only requires creating, listing, summarizing, and repaying loans; keeping the API surface small reduces risk.

---

## Known limitations

- JWT sign-out is client-side only; there is no refresh-token rotation or server denylist.
- OTP rows are not periodically purged. A scheduled cleanup would be appropriate in production.
- The list has no pagination or search; suitable for a small personal ledger.
- Web token storage uses localStorage for the demo; a production web app would prefer an httpOnly cookie or a native-only deployment.
- The mock OTP flow is disabled when `NODE_ENV=production`.
- Native device execution, native date pickers, and SecureStore behavior still need a real iOS/Android smoke test.
- The Expo toolchain has transitive dependency audit warnings; no breaking forced upgrades were applied.
- No CI pipeline is committed; all commands above were run locally.

---

## Troubleshooting

**`ECONNREFUSED` / "Could not reach MiniLedger"**
Start PostgreSQL and the API. Check `curl http://localhost:4000/api/health`. Confirm the mobile `.env` URL points to the machine running the API.

**`Invalid environment configuration` on API start**
`backend/.env` is missing a required value, or a secret is shorter than 32 characters. Copy `.env.example` and set both secrets.

**Expo Go on a physical phone cannot reach the API**
`localhost` on the phone is the phone. Set `EXPO_PUBLIC_API_URL` to your computer's LAN IP, use the same Wi-Fi network, allow port 4000, and restart Expo.

**Android emulator cannot reach localhost**
The client already defaults to `10.0.2.2:4000` for Android. If you override `EXPO_PUBLIC_API_URL`, use `http://10.0.2.2:4000`.

**OTP request returns 503**
The API is running with `NODE_ENV=production`. This project intentionally disables the mock OTP endpoint there. Use development for the demo.

**Tests fail connecting to PostgreSQL**
Start the Docker database, confirm the test database exists, or set:
```bash
TEST_DATABASE_URL=postgresql://miniledger:miniledger@localhost:5432/miniledger_test npm test
```

**Tests wiped data**
The suite truncates the configured test database before each test. Never point it at your development database.

---

## Summary

MiniLedger demonstrates a complete, security-conscious slice of a real product: a typed Expo client, a validated Express API, and a constrained PostgreSQL schema. Authentication is genuinely server-verified, ownership is derived from the JWT, money is decimal-safe, OTPs are hashed and one-time, and the UI covers the practical states a user will hit. The build and integration tests are reproducible from the commands above, and the native runtime checks that could not be performed here are explicitly listed rather than assumed.
