const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/analytics", (req, res, next) => {
  try {
    const kpis = {
      patients: db.prepare("SELECT COUNT(*) AS n FROM patients").get().n,
      doctors: db.prepare("SELECT COUNT(*) AS n FROM doctors").get().n,
      appointments: db.prepare("SELECT COUNT(*) AS n FROM appointments").get().n,
      bills: db.prepare("SELECT COUNT(*) AS n FROM bills").get().n,
      medicines: db.prepare("SELECT COUNT(*) AS n FROM medicines").get().n,
    };

    const revenueRow = db
      .prepare(
        `SELECT COALESCE(SUM(bi.fee),0) AS revenue FROM bills b JOIN bill_items bi ON bi.bill_id=b.id WHERE b.paid=1`
      )
      .get();
    kpis.revenue = revenueRow.revenue;

    const statusBreakdown = db
      .prepare("SELECT status AS label, COUNT(*) AS value FROM patients GROUP BY status ORDER BY value DESC")
      .all();

    const deptBreakdown = db
      .prepare("SELECT dept AS label, COUNT(*) AS value FROM patients GROUP BY dept ORDER BY value DESC LIMIT 8")
      .all();

    const apptTypeBreakdown = db
      .prepare("SELECT type AS label, COUNT(*) AS value FROM appointments GROUP BY type ORDER BY value DESC")
      .all();

    const billing = db
      .prepare(
        `SELECT
           COALESCE(SUM(CASE WHEN b.paid=1 THEN bi.fee ELSE 0 END),0) AS paid,
           COALESCE(SUM(CASE WHEN b.paid=0 THEN bi.fee ELSE 0 END),0) AS unpaid,
           (SELECT COUNT(*) FROM bills) AS count
         FROM bills b JOIN bill_items bi ON bi.bill_id = b.id`
      )
      .get();

    const wards = db.prepare("SELECT id, name, type, capacity, occupied, floor FROM wards ORDER BY floor ASC, name ASC").all();

    res.json({ kpis, statusBreakdown, deptBreakdown, apptTypeBreakdown, billing, wards });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
