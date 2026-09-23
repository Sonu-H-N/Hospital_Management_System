const express = require("express");
const { body, param, query } = require("express-validator");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { nextId } = require("../services/idGenerator");

const router = express.Router();
router.use(requireAuth);

const TYPES = ["Consultation", "Follow-up", "Emergency", "Routine"];
const STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed"];

const SELECT = `
  SELECT a.*, p.name AS patient, d.name AS doctor
  FROM appointments a
  JOIN patients p ON p.id = a.patient_id
  JOIN doctors d ON d.id = a.doctor_id
`;

router.get(
  "/",
  [
    query("q").optional().trim().isLength({ max: 200 }),
    query("status").optional().isIn(STATUSES),
    query("date").optional().isISO8601(),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const clauses = [];
      const params = {};
      if (req.query.q) {
        clauses.push("(p.name LIKE @q OR a.id LIKE @q OR d.name LIKE @q)");
        params.q = `%${req.query.q}%`;
      }
      if (req.query.status) {
        clauses.push("a.status = @status");
        params.status = req.query.status;
      }
      if (req.query.date) {
        clauses.push("a.appt_date = @date");
        params.date = req.query.date;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rows = db.prepare(`${SELECT} ${where} ORDER BY a.appt_date ASC, a.appt_time ASC`).all(params);
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  [
    body("patient_id").trim().notEmpty().withMessage("Select a patient."),
    body("doctor_id").trim().notEmpty().withMessage("Select a doctor."),
    body("dept").trim().isLength({ min: 1, max: 60 }),
    body("appt_date").isISO8601().withMessage("Enter a valid date."),
    body("appt_time").matches(/^\d{2}:\d{2}$/).withMessage("Enter a valid time (HH:MM)."),
    body("type").optional().isIn(TYPES),
    body("status").optional().isIn(STATUSES),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 500 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { patient_id, doctor_id, dept, appt_date, appt_time, type, status, notes } = req.body;

      const patient = db.prepare("SELECT id FROM patients WHERE id = ?").get(patient_id);
      if (!patient) return res.status(400).json({ error: "Selected patient does not exist." });
      const doctor = db.prepare("SELECT id FROM doctors WHERE id = ?").get(doctor_id);
      if (!doctor) return res.status(400).json({ error: "Selected doctor does not exist." });

      const id = nextId("A", "appointments");
      db.prepare(
        `INSERT INTO appointments (id, patient_id, doctor_id, dept, appt_date, appt_time, type, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, patient_id, doctor_id, dept, appt_date, appt_time, type || "Consultation", status || "Pending", notes || null);

      const row = db.prepare(`${SELECT} WHERE a.id = ?`).get(id);
      res.status(201).json({ data: row });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/:id",
  [
    param("id").trim().notEmpty(),
    body("patient_id").trim().notEmpty(),
    body("doctor_id").trim().notEmpty(),
    body("dept").trim().isLength({ min: 1, max: 60 }),
    body("appt_date").isISO8601(),
    body("appt_time").matches(/^\d{2}:\d{2}$/),
    body("type").optional().isIn(TYPES),
    body("status").optional().isIn(STATUSES),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 500 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare("SELECT id FROM appointments WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Appointment not found." });

      const { patient_id, doctor_id, dept, appt_date, appt_time, type, status, notes } = req.body;
      db.prepare(
        `UPDATE appointments SET patient_id=?, doctor_id=?, dept=?, appt_date=?, appt_time=?, type=?, status=?, notes=?, updated_at=datetime('now')
         WHERE id=?`
      ).run(patient_id, doctor_id, dept, appt_date, appt_time, type || "Consultation", status || "Pending", notes || null, req.params.id);

      const row = db.prepare(`${SELECT} WHERE a.id = ?`).get(req.params.id);
      res.json({ data: row });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireRole("Admin"), [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM appointments WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Appointment not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
