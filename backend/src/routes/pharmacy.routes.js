const express = require("express");
const { body, param, query } = require("express-validator");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { nextId } = require("../services/idGenerator");

const router = express.Router();
router.use(requireAuth);

router.get(
  "/",
  [query("q").optional().trim().isLength({ max: 200 }), query("stock").optional().isIn(["low", "ok"])],
  handleValidation,
  (req, res, next) => {
    try {
      const clauses = [];
      const params = {};
      if (req.query.q) {
        clauses.push("(name LIKE @q OR category LIKE @q)");
        params.q = `%${req.query.q}%`;
      }
      if (req.query.stock === "low") clauses.push("stock <= min_stock");
      if (req.query.stock === "ok") clauses.push("stock > min_stock");

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rows = db.prepare(`SELECT * FROM medicines ${where} ORDER BY name ASC`).all(params);
      res.json({ data: rows });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  [
    body("name").trim().isLength({ min: 1, max: 100 }).withMessage("Name is required."),
    body("category").trim().isLength({ min: 1, max: 60 }).withMessage("Category is required."),
    body("stock").isInt({ min: 0 }),
    body("min_stock").isInt({ min: 0 }),
    body("price").isFloat({ min: 0 }),
    body("unit").optional().trim().isLength({ max: 20 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { name, category, stock, min_stock, price, unit } = req.body;
      const id = nextId("M", "medicines");
      db.prepare(`INSERT INTO medicines (id, name, category, stock, min_stock, price, unit) VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(id, name, category, stock, min_stock, price, unit || "Strip");
      res.status(201).json({ data: db.prepare("SELECT * FROM medicines WHERE id = ?").get(id) });
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
    body("category").trim().isLength({ min: 1, max: 60 }),
    body("stock").isInt({ min: 0 }),
    body("min_stock").isInt({ min: 0 }),
    body("price").isFloat({ min: 0 }),
    body("unit").optional().trim().isLength({ max: 20 }),
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare("SELECT id FROM medicines WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Medicine not found." });

      const { name, category, stock, min_stock, price, unit } = req.body;
      db.prepare(
        `UPDATE medicines SET name=?, category=?, stock=?, min_stock=?, price=?, unit=?, updated_at=datetime('now') WHERE id=?`
      ).run(name, category, stock, min_stock, price, unit || "Strip", req.params.id);

      res.json({ data: db.prepare("SELECT * FROM medicines WHERE id = ?").get(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
);

// Dispense: decrease stock (cannot go below zero — protects against overselling)
router.patch(
  "/:id/dispense",
  [param("id").trim().notEmpty(), body("quantity").isInt({ min: 1 }).withMessage("Enter a quantity of at least 1.")],
  handleValidation,
  (req, res, next) => {
    try {
      const med = db.prepare("SELECT * FROM medicines WHERE id = ?").get(req.params.id);
      if (!med) return res.status(404).json({ error: "Medicine not found." });
      if (req.body.quantity > med.stock) {
        return res.status(400).json({ error: `Only ${med.stock} units in stock.` });
      }
      db.prepare(`UPDATE medicines SET stock = stock - ?, updated_at=datetime('now') WHERE id=?`).run(req.body.quantity, req.params.id);
      res.json({ data: db.prepare("SELECT * FROM medicines WHERE id = ?").get(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
);

// Restock: increase stock
router.patch(
  "/:id/restock",
  [param("id").trim().notEmpty(), body("quantity").isInt({ min: 1 }).withMessage("Enter a quantity of at least 1.")],
  handleValidation,
  (req, res, next) => {
    try {
      const med = db.prepare("SELECT id FROM medicines WHERE id = ?").get(req.params.id);
      if (!med) return res.status(404).json({ error: "Medicine not found." });
      db.prepare(`UPDATE medicines SET stock = stock + ?, updated_at=datetime('now') WHERE id=?`).run(req.body.quantity, req.params.id);
      res.json({ data: db.prepare("SELECT * FROM medicines WHERE id = ?").get(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireRole("Admin"), [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM medicines WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Medicine not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
