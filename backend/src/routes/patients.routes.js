const express = require("express");
const { body, param, query } = require("express-validator");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { nextId } = require("../services/idGenerator");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["Active", "Admitted", "Critical", "Discharged"];
const GENDERS = ["Male", "Female", "Other"];

function withDoctorName(row) {
  if (!row) return row;
  const doc = row.doctor_id ? db.prepare("SELECT name FROM doctors WHERE id = ?").get(row.doctor_id) : null;
  return { ...row, doctor: doc ? doc.name : null };
}

router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("pageSize").optional().isInt({ min: 1, max: 200 }).toInt(),
    query("q").optional().trim().isLength({ max: 200 }),
    query("status").optional().isIn(STATUSES),
    query("dept").optional().trim(),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const page = req.query.page || 1;
      const pageSize = req.query.pageSize || 8;

      const clauses = [];
      const params = {};
      if (req.query.q) {
        clauses.push("(p.name LIKE @q OR p.id LIKE @q OR p.dept LIKE @q)");
        params.q = `%${req.query.q}%`;
      }
      if (req.query.status) {
        clauses.push("p.status = @status");
        params.status = req.query.status;
      }
      if (req.query.dept) {
        clauses.push("p.dept = @dept");
        params.dept = req.query.dept;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

      const total = db.prepare(`SELECT COUNT(*) AS n FROM patients p ${where}`).get(params).n;

      const rows = db
        .prepare(
          `SELECT p.*, d.name AS doctor
           FROM patients p LEFT JOIN doctors d ON d.id = p.doctor_id
           ${where}
           ORDER BY p.created_at DESC
           LIMIT @limit OFFSET @offset`
        )
        .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

      res.json({ data: rows, pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/:id", [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const row = db
      .prepare(`SELECT p.*, d.name AS doctor FROM patients p LEFT JOIN doctors d ON d.id=p.doctor_id WHERE p.id=?`)
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: "Patient not found." });
    res.json({ data: row });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  [
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name is required."),
    body("age").isInt({ min: 0, max: 130 }).withMessage("Enter a valid age."),
    body("gender").isIn(GENDERS),
    body("blood_group").optional({ nullable: true }).trim().isLength({ max: 5 }),
    body("phone").optional({ nullable: true }).trim().isLength({ max: 20 }),
    body("dept").trim().isLength({ min: 1, max: 60 }).withMessage("Department is required."),
    body("doctor_id").optional({ nullable: true }).trim(),
    body("status").optional().isIn(STATUSES),
    body("admitted_on").optional().isISO8601(),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { name, age, gender, blood_group, phone, dept, doctor_id, status, notes } = req.body;
      const admitted_on = req.body.admitted_on || new Date().toISOString().slice(0, 10);
      const id = nextId("P", "patients");

      db.prepare(
        `INSERT INTO patients (id, name, age, gender, blood_group, phone, dept, doctor_id, status, admitted_on, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, name, age, gender, blood_group || null, phone || null, dept, doctor_id || null, status || "Active", admitted_on, notes || null);

      const row = db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
      res.status(201).json({ data: withDoctorName(row) });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/:id",
  [
    param("id").trim().notEmpty(),
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("age").isInt({ min: 0, max: 130 }),
    body("gender").isIn(GENDERS),
    body("blood_group").optional({ nullable: true }).trim().isLength({ max: 5 }),
    body("phone").optional({ nullable: true }).trim().isLength({ max: 20 }),
    body("dept").trim().isLength({ min: 1, max: 60 }),
    body("doctor_id").optional({ nullable: true }).trim(),
    body("status").optional().isIn(STATUSES),
    body("admitted_on").optional().isISO8601(),
    body("notes").optional({ nullable: true }).trim().isLength({ max: 1000 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare("SELECT id FROM patients WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Patient not found." });

      const { name, age, gender, blood_group, phone, dept, doctor_id, status, notes } = req.body;
      const admitted_on = req.body.admitted_on || undefined;

      db.prepare(
        `UPDATE patients SET name=?, age=?, gender=?, blood_group=?, phone=?, dept=?, doctor_id=?, status=?, notes=?,
           admitted_on=COALESCE(?, admitted_on), updated_at=datetime('now')
         WHERE id=?`
      ).run(name, age, gender, blood_group || null, phone || null, dept, doctor_id || null, status || "Active", notes || null, admitted_on, req.params.id);

      const row = db.prepare("SELECT * FROM patients WHERE id = ?").get(req.params.id);
      res.json({ data: withDoctorName(row) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireRole("Admin"), [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM patients WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Patient not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
