const express = require("express");
const { body, param, query } = require("express-validator");
const db = require("../db");
const { requireAuth, requireRole } = require("../middleware/auth");
const { handleValidation } = require("../middleware/errorHandler");
const { nextId } = require("../services/idGenerator");

const router = express.Router();
router.use(requireAuth);

function loadItems(billId) {
  return db.prepare("SELECT id, name, fee FROM bill_items WHERE bill_id = ?").all(billId);
}

function loadBill(id) {
  const bill = db
    .prepare(`SELECT b.*, p.name AS patient FROM bills b JOIN patients p ON p.id = b.patient_id WHERE b.id = ?`)
    .get(id);
  if (!bill) return null;
  return { ...bill, paid: Boolean(bill.paid), items: loadItems(id) };
}

const itemsValidator = body("items")
  .isArray({ min: 1 })
  .withMessage("Add at least one bill item.")
  .custom(items => items.every(i => i && typeof i.name === "string" && i.name.trim() && Number(i.fee) >= 0))
  .withMessage("Each item needs a name and a non-negative fee.");

router.get(
  "/",
  [query("q").optional().trim().isLength({ max: 200 }), query("paid").optional().isIn(["true", "false"])],
  handleValidation,
  (req, res, next) => {
    try {
      const clauses = [];
      const params = {};
      if (req.query.q) {
        clauses.push("(p.name LIKE @q OR b.id LIKE @q)");
        params.q = `%${req.query.q}%`;
      }
      if (req.query.paid !== undefined) {
        clauses.push("b.paid = @paid");
        params.paid = req.query.paid === "true" ? 1 : 0;
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const bills = db
        .prepare(`SELECT b.*, p.name AS patient FROM bills b JOIN patients p ON p.id=b.patient_id ${where} ORDER BY b.bill_date DESC`)
        .all(params);

      const data = bills.map(b => ({ ...b, paid: Boolean(b.paid), items: loadItems(b.id) }));
      res.json({ data });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  [
    body("patient_id").trim().notEmpty().withMessage("Select a patient."),
    body("bill_date").optional().isISO8601(),
    body("paid").optional().isBoolean(),
    body("pay_mode").optional({ nullable: true }).trim().isLength({ max: 30 }),
    itemsValidator,
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const { patient_id, paid, pay_mode, items } = req.body;
      const bill_date = req.body.bill_date || new Date().toISOString().slice(0, 10);

      const patient = db.prepare("SELECT id FROM patients WHERE id = ?").get(patient_id);
      if (!patient) return res.status(400).json({ error: "Selected patient does not exist." });

      const id = nextId("B", "bills");
      const run = db.transaction(() => {
        db.prepare(`INSERT INTO bills (id, patient_id, bill_date, paid, pay_mode) VALUES (?, ?, ?, ?, ?)`)
          .run(id, patient_id, bill_date, paid ? 1 : 0, paid ? pay_mode || null : null);
        const insertItem = db.prepare("INSERT INTO bill_items (bill_id, name, fee) VALUES (?, ?, ?)");
        for (const item of items) insertItem.run(id, item.name.trim(), Number(item.fee));
      });
      run();

      res.status(201).json({ data: loadBill(id) });
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
    body("bill_date").optional().isISO8601(),
    body("paid").optional().isBoolean(),
    body("pay_mode").optional({ nullable: true }).trim().isLength({ max: 30 }),
    itemsValidator,
  ],
  handleValidation,
  (req, res, next) => {
    try {
      const existing = db.prepare("SELECT id FROM bills WHERE id = ?").get(req.params.id);
      if (!existing) return res.status(404).json({ error: "Bill not found." });

      const { patient_id, paid, pay_mode, items } = req.body;
      const bill_date = req.body.bill_date || undefined;

      const run = db.transaction(() => {
        db.prepare(
          `UPDATE bills SET patient_id=?, paid=?, pay_mode=?, bill_date=COALESCE(?, bill_date), updated_at=datetime('now') WHERE id=?`
        ).run(patient_id, paid ? 1 : 0, paid ? pay_mode || null : null, bill_date, req.params.id);
        db.prepare("DELETE FROM bill_items WHERE bill_id = ?").run(req.params.id);
        const insertItem = db.prepare("INSERT INTO bill_items (bill_id, name, fee) VALUES (?, ?, ?)");
        for (const item of items) insertItem.run(req.params.id, item.name.trim(), Number(item.fee));
      });
      run();

      res.json({ data: loadBill(req.params.id) });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/:id", requireRole("Admin"), [param("id").trim().notEmpty()], handleValidation, (req, res, next) => {
  try {
    const result = db.prepare("DELETE FROM bills WHERE id = ?").run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: "Bill not found." });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
