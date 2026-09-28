const express = require("express");
const { body, param, query } = require("express-validator");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { nextId } = require("../services/idGenerator");

const router = express.Router();
router.use(requireAuth);

const STATUSES = ["Active", "On Leave", "Inactive"];

router.get(
  "/",
  [
    query("q").optional().trim().isLength({ max: 200 }),
    query("dept").optional().trim(),
    query("status").optional().isIn(STATUSES),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const clauses = [];
      const params = {};

      if (req.query.q) {
        clauses.push("(name LIKE @q OR id LIKE @q OR specialization LIKE @q)");
        params.q = `%${req.query.q}%`;
      }
      if (req.query.dept) {
        clauses.push("dept = @dept");
        params.dept = req.query.dept;
      }
      if (req.query.status) {
        clauses.push("status = @status");
        params.status = req.query.status;
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rows = db
        .prepare(
          `SELECT d.*, (SELECT COUNT(*) FROM patients p WHERE p.doctor_id = d.id) AS patients
           FROM doctors d ${where} ORDER BY d.name ASC`
        )
        .all(params);

      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  requireRole("Admin"),
  [
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name is required."),
    body("specialization").trim().isLength({ min: 1, max: 60 }).withMessage("Specialization is required."),
    body("dept").trim().isLength({ min: 1, max: 60 }).withMessage("Department is required."),
    body("phone").optional({ nullable: true }).trim().isLength({ max: 20 }),
    body("email").optional({ nullable: true }).trim().isEmail().withMessage("Enter a valid email."),
    body("experience").optional().isInt({ min: 0, max: 60 }),
    body("status").optional().isIn(STATUSES),
    body("fee").optional().isFloat({ min: 0 }),
    body("schedule").optional({ nullable: true }).trim().isLength({ max: 40 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { name, specialization, dept, phone, email, experience, status, fee, schedule } = req.body;
      const id = nextId("D", "doctors");

      db.prepare(
        `INSERT INTO doctors (id, name, specialization, dept, phone, email, experience, status, fee, schedule)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(id, name, specialization, dept, phone || null, email || null, experience || 0, status || "Active", fee || 0, schedule || null);

      const doctor = db.prepare("SELECT *, 0 AS patients FROM doctors WHERE id = ?").get(id);
      res.status(201).json({ data: doctor });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/:id",
  requireRole("Admin"),
  [
    param("id").trim().notEmpty(),
    body("name").trim().isLength({ min: 1, max: 100 }),
    body("specialization").trim().isLength({ min: 1, max: 60 }),
    body("dept").trim().isLength({ min: 1, max: 60 }),
    body("phone").optional({ nullable: true }).trim().isLength({ max: 20 }),
    body("email").optional({ nullable: true }).trim().isEmail(),
    body("experience").optional().isInt({ min: 0, max: 60 }),
    body("status").optional().isIn(STATUSES),
    body("fee").optional().isFloat({ min: 0 }),
    body("schedule").optional({ nullable: true }).trim().isLength({ max: 40 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare("SELECT id FROM doctors WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Doctor not found." });

      const { name, specialization, dept, phone, email, experience, status, fee, schedule } = req.body;
      db.prepare(
        `UPDATE doctors SET name=?, specialization=?, dept=?, phone=?, email=?, experience=?, status=?, fee=?, schedule=?, updated_at=datetime('now')
         WHERE id=?`
      ).run(name, specialization, dept, phone || null, email || null, experience || 0, status || "Active", fee || 0, schedule || null, req.params.id);

      const doctor = db
        .prepare(`SELECT d.*, (SELECT COUNT(*) FROM patients p WHERE p.doctor_id=d.id) AS patients FROM doctors d WHERE d.id=?`)
        .get(req.params.id);
      res.json({ data: doctor });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireRole("Admin"), [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM doctors WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Doctor not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
