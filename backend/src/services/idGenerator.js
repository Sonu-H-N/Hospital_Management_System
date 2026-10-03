const db = require("../db");

// Patients/bills start their sequence at 1001 to match the original app's
// seed data style; everything else starts at 1. Padding width also varies
// to match (D-001 vs P-1001).
const START = { patients: 1000, doctors: 0, appointments: 0, bills: 1000, medicines: 0, wards: 0 };
const PAD = { patients: 4, doctors: 3, appointments: 3, bills: 4, medicines: 3, wards: 3 };

const bump = db.prepare(`
  INSERT INTO counters (entity, value) VALUES (@entity, @start + 1)
  ON CONFLICT(entity) DO UPDATE SET value = value + 1
  RETURNING value
`);

/**
 * Returns the next friendly ID for an entity, e.g. nextId('P', 'patients') -> 'P-1001'.
 * Atomic via the counters table, so concurrent requests never collide.
 */
function nextId(prefix, entity) {
  const row = bump.get({ entity, start: START[entity] ?? 0 });
  const width = PAD[entity] ?? 3;
  return `${prefix}-${String(row.value).padStart(width, "0")}`;
}

module.exports = { nextId };
