# MediCore — Hospital Management System

A hospital-wide staff system: manage patients, doctors, appointments,
billing, pharmacy inventory, and ward/bed occupancy, with a live
dashboard and analytics. Multiple staff members (Admin, Doctor,
Receptionist, Pharmacist) can be logged in at once, all working from
the same shared, persistent hospital data.

This was upgraded from a single-user, browser-only demo (fake login,
all data in `localStorage`) into a real client/server application with
multi-role staff accounts, a persistent database, and a secured API.

---

## Architecture

```
medicore-hms/
├── backend/                  Node.js + Express + SQLite API
│   ├── server.js             App entrypoint, security middleware
│   ├── src/
│   │   ├── db/                 schema.sql, connection, seed script
│   │   ├── middleware/          auth (JWT + roles), validation, errors
│   │   ├── routes/              patients, doctors, appointments,
│   │   │                        billing, pharmacy, wards, dashboard,
│   │   │                        reports, auth
│   │   └── services/            friendly-ID generator (P-1001, D-001…)
│   └── data/                   medicore.db (SQLite file, gitignored)
│
└── frontend/                  Static HTML/CSS/vanilla JS (no build step)
    ├── index.html              Dashboard
    ├── login.html / register.html
    ├── pages/                  patients, doctors, appointments,
    │                           billing, pharmacy, wards, reports
    ├── css/                    Design system (unchanged visual identity)
    └── js/
        ├── api.js               fetch wrapper, session storage
        ├── ui.js                 toasts, confirm dialogs, formatters
        ├── auth-guard.js          per-page login check + role-based UI
        └── <page>.js              one file per page, calls the API
```

**Why this stack:** the original project was vanilla HTML/CSS/JS with
no backend — a real hospital system can't run on browser storage
shared by nobody. The frontend keeps its original look and stays
framework-free; the new backend is Express + `better-sqlite3`, a
single-file database with nothing extra to provision.

---

## Running it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env       # then edit JWT_SECRET (see below)
npm run seed                 # creates 4 demo staff accounts + sample data
npm start                    # http://localhost:4100
```

Generate a real secret instead of the placeholder:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start if `JWT_SECRET` is left as the placeholder.

### 2. Frontend

```bash
cd frontend
python3 -m http.server 5600     # or: npx serve .
```

Open `http://localhost:5600/login.html`. `frontend/js/config.js` points
the UI at `http://localhost:4100/api` on localhost, and at
`<same-origin>/api` otherwise — edit it if your deployment differs.

### 3. Log in

Register a new staff account, or use a seeded demo account:

| Role | Email | Password |
|---|---|---|
| Admin | admin@medicore.in | admin1234 |
| Doctor | priya.nair@medicore.in | doctor1234 |
| Receptionist | reception@medicore.in | reception1234 |
| Pharmacist | pharmacy@medicore.in | pharmacy1234 |

---

## Roles & permissions

All logged-in staff can view and manage patients, appointments,
billing, pharmacy stock, and wards. Two actions are restricted to
**Admin** only, enforced server-side (not just hidden in the UI):

- Deleting any record (patient, doctor, appointment, bill, medicine, ward)
- Adding or editing the doctor roster

This models a realistic hospital workflow: front-desk and clinical
staff handle day-to-day records, but only administrators change who's
on staff or permanently remove data. Non-admin roles simply don't see
those buttons, and the API rejects the request even if someone calls
it directly.

---

## Environment variables (`backend/.env`)

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | API port | No (default 4100) |
| `NODE_ENV` | `development` or `production` | No |
| `JWT_SECRET` | Signs auth tokens — must be a long random string | **Yes** |
| `JWT_EXPIRES_IN` | Session length, e.g. `7d` | No (default `7d`) |
| `CORS_ORIGIN` | Comma-separated allowed origins for the frontend | **Yes** in production |
| `DB_PATH` | SQLite file location | No (default `./data/medicore.db`) |
| `AUTH_RATE_LIMIT_MAX` | Login/register attempts per 15 min per IP | No (default 10) |
| `API_RATE_LIMIT_MAX` | General API requests per 15 min per IP | No (default 300) |

No secrets are hardcoded anywhere — `.env` is gitignored, and
`.env.example` documents every variable without real values.

---

## Database

SQLite via `better-sqlite3`, one file (`backend/data/medicore.db`). The
schema (`backend/src/db/schema.sql`) applies automatically and
idempotently on every server start. Tables:

- **users** — staff accounts: name, email (unique), bcrypt hash, role
- **doctors** — roster; patient counts are computed via query, not stored
- **patients** — linked to an optional attending doctor
- **appointments** — linked to a patient and a doctor
- **bills** / **bill_items** — one bill can have many line items
- **medicines** — pharmacy inventory with stock and reorder threshold
- **wards** — bed capacity and current occupancy
- **counters** — backs the friendly sequential IDs (P-1001, D-001, …),
  incremented atomically inside each insert's transaction so concurrent
  requests from different staff never collide

Foreign keys cascade sensibly: deleting a doctor un-assigns (doesn't
delete) their patients; deleting a patient removes their appointments
and bills.

---

## What was added

### Multi-role staff accounts & real auth
The original had one hardcoded "Dr. Admin" login with everything in
`localStorage` — no real access control, and data didn't survive a
cleared browser. Now: registration, bcrypt-hashed passwords, JWT
sessions, and a role system (Admin/Doctor/Receptionist/Pharmacist)
enforced on the server, not just cosmetically in the UI.

### Persistent, shared backend
All hospital data now lives in one SQLite database behind a real API,
so every staff member — on any device — sees the same live records
instead of whatever happened to be in their own browser's storage.

### Role-based access control (RBAC)
New. Deletions and doctor-roster management are Admin-only, checked in
Express middleware on every request. Verified during development that
a Receptionist token gets a 403 even when calling the API directly.

### Search, filter, sort, pagination
Patient and appointment lists now support real server-side search,
filtering, and (for patients) pagination, instead of rendering every
row from an in-memory array.

### Real dashboard notifications
The original dashboard had three hardcoded example notifications. They
now reflect actual hospital state: critical patients and low-stock
medicines, pulled live from the database.

### Reports & analytics on real data
KPIs, patient status/department breakdowns, appointment-type
distribution, billing summary, and ward occupancy are all computed
from live records via SQL aggregation, not static numbers.

### Better pharmacy workflow
Restocking used to be a raw `window.prompt()`. It's now a proper modal
matching the dispense flow, and the server enforces that you can't
dispense more units than are actually in stock.

### Security hardening
- Passwords hashed with bcrypt (cost factor 12), never logged
- JWT-based auth on every protected route, role checks where relevant
- `helmet` for standard security headers
- CORS locked to an explicit origin allowlist (env-configured)
- Rate limiting: tighter on auth endpoints, looser on general API use
- Input validation (`express-validator`) on every write endpoint, with
  field-level error messages surfaced in the UI
- Centralized error handler — logs full detail server-side, never
  leaks stack traces or internals to the client
- No secrets in source control

### UI/UX polish
Confirm-before-delete modals replaced `window.confirm()`, toasts for
every action, field-level validation errors, loading skeletons, and
empty states across every list. Fully responsive down to a 360px
mobile viewport with a collapsible sidebar drawer. The original's
"Clinical Luxury" visual identity (dark navy, DM Serif Display/DM Sans,
teal/rose/amber/violet accents) is unchanged.

---

## Known limitations / recommended next steps

- **Single SQLite file** — fine for one hospital instance; for a
  multi-hospital SaaS product, add a `hospital_id` scope to every table
  and swap in Postgres for concurrent write load.
- **No audit log** — for a real clinical system, tracking who changed
  what (especially for patient records) would be a natural next step.
- **No password reset flow** — needs an email provider (Resend, SES).
- **Dispense isn't linked to a specific patient/bill** — the dispense
  modal lets staff optionally note which patient it's for, but stock
  deduction is inventory-only; wiring dispensed medicines into that
  patient's bill automatically would be a good enhancement.
- **No automated test suite** — verified manually here via curl
  (API) and Playwright (UI flows, RBAC, mobile layout); adding
  Jest/Supertest and Playwright tests would help long-term.
- **No CI/CD config.**

---

## Deploying

- **Backend**: any Node host (Render, Railway, Fly.io, a VPS). Set the
  env vars above; mount a persistent volume for `data/`.
- **Frontend**: any static host (Netlify, Vercel, GitHub Pages, S3+CDN).
  Update `frontend/js/config.js` to point at your deployed backend, or
  serve both behind one reverse-proxied domain.
