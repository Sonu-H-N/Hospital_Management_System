const express = require("express");
const { body, param } = require("express-validator");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { nextId } = require("../services/idGenerator");

const router = express.Router();
router.use(requireAuth);

const TYPES = ["General", "ICU", "Maternity", "Pediatric", "Specialty", "Private"];

router.get("/", (req, res, next) => {
  try {
    res.json({ data: db.prepare("SELECT * FROM wards ORDER BY floor ASC, name ASC").all() });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/",
  [
    body("name").trim().isLength({ min: 1, max: 80 }).withMessage("Ward name is required."),
    body("type").isIn(TYPES),
    body("capacity").isInt({ min: 1 }).withMessage("Capacity must be at least 1."),
    body("occupied").isInt({ min: 0 }).withMessage("Occupied beds can't be negative."),
    body("floor").isInt({ min: 0 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { name, type, capacity, occupied, floor } = req.body;
      if (occupied > capacity) {
        return res.status(400).json({ error: "Occupied beds can't exceed capacity." });
      }
      const id = nextId("W", "wards");
      db.prepare(`INSERT INTO wards (id, name, type, capacity, occupied, floor) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, name, type, capacity, occupied, floor);
      res.status(201).json({ data: db.prepare("SELECT * FROM wards WHERE id = ?").get(id) });
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/:id",
  [
    param("id").trim().notEmpty(),
    body("name").trim().isLength({ min: 1, max: 80 }),
    body("type").isIn(TYPES),
    body("capacity").isInt({ min: 1 }),
    body("occupied").isInt({ min: 0 }),
    body("floor").isInt({ min: 0 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare("SELECT id FROM wards WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Ward not found." });

      const { name, type, capacity, occupied, floor } = req.body;
      if (occupied > capacity) {
        return res.status(400).json({ error: "Occupied beds can't exceed capacity." });
      }
      db.prepare(
        `UPDATE wards SET name=?, type=?, capacity=?, occupied=?, floor=?, updated_at=datetime('now') WHERE id=?`
      ).run(name, type, capacity, occupied, floor, req.params.id);
      res.json({ data: db.prepare("SELECT * FROM wards WHERE id = ?").get(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireRole("Admin"), [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM wards WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Ward not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
