-- MediCore HMS — SQLite schema
-- Applied automatically and idempotently on every server start.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('Admin','Doctor','Receptionist','Pharmacist')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Generates friendly sequential IDs (P-1001, D-001, ...) without race
-- conditions: increment happens inside the same transaction as the insert.
CREATE TABLE IF NOT EXISTS counters (
  entity TEXT PRIMARY KEY,
  value  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS doctors (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  specialization TEXT NOT NULL,
  dept           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  experience     INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','On Leave','Inactive')),
  fee            REAL NOT NULL DEFAULT 0,
  schedule       TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patients (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  age          INTEGER NOT NULL CHECK (age BETWEEN 0 AND 130),
  gender       TEXT NOT NULL CHECK (gender IN ('Male','Female','Other')),
  blood_group  TEXT,
  phone        TEXT,
  dept         TEXT NOT NULL,
  doctor_id    TEXT REFERENCES doctors(id) ON DELETE SET NULL,
  status       TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Admitted','Critical','Discharged')),
  admitted_on  TEXT NOT NULL DEFAULT (date('now')),
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_dept ON patients(dept);
CREATE INDEX IF NOT EXISTS idx_patients_doctor ON patients(doctor_id);

CREATE TABLE IF NOT EXISTS appointments (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id   TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  dept        TEXT NOT NULL,
  appt_date   TEXT NOT NULL,
  appt_time   TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'Consultation' CHECK (type IN ('Consultation','Follow-up','Emergency','Routine')),
  status      TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Confirmed','Cancelled','Completed')),
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appt_date);
CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_id);

CREATE TABLE IF NOT EXISTS bills (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  bill_date  TEXT NOT NULL DEFAULT (date('now')),
  paid       INTEGER NOT NULL DEFAULT 0,
  pay_mode   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bills_patient ON bills(patient_id);
CREATE INDEX IF NOT EXISTS idx_bills_paid ON bills(paid);

CREATE TABLE IF NOT EXISTS bill_items (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  name    TEXT NOT NULL,
  fee     REAL NOT NULL CHECK (fee >= 0)
);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);

CREATE TABLE IF NOT EXISTS medicines (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  stock      INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock  INTEGER NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  price      REAL NOT NULL DEFAULT 0,
  unit       TEXT NOT NULL DEFAULT 'Strip',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wards (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('General','ICU','Maternity','Pediatric','Specialty','Private')),
  capacity   INTEGER NOT NULL CHECK (capacity > 0),
  occupied   INTEGER NOT NULL DEFAULT 0 CHECK (occupied >= 0),
  floor      INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
