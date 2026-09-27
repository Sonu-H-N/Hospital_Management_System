const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

router.get("/summary", (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const totalPatients = db.prepare("SELECT COUNT(*) AS n FROM patients").get().n;
    const activeDoctors = db.prepare("SELECT COUNT(*) AS n FROM doctors WHERE status = 'Active'").get().n;
    const todayApptsTotal = db.prepare("SELECT COUNT(*) AS n FROM appointments WHERE appt_date = ?").get(today).n;
    const todayApptsCancelled = db
      .prepare("SELECT COUNT(*) AS n FROM appointments WHERE appt_date = ? AND status = 'Cancelled'")
      .get(today).n;

    const bedTotals = db.prepare("SELECT COALESCE(SUM(capacity),0) AS capacity, COALESCE(SUM(occupied),0) AS occupied FROM wards").get();
    const occupancyPct = bedTotals.capacity > 0 ? Math.round((bedTotals.occupied / bedTotals.capacity) * 100) : 0;

    const recentAppointments = db
      .prepare(
        `SELECT a.id, a.appt_time, a.status, a.dept, p.name AS patient, d.name AS doctor
         FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN doctors d ON d.id=a.doctor_id
         WHERE a.appt_date = ? ORDER BY a.appt_time ASC LIMIT 6`
      )
      .all(today);

    const recentPatients = db
      .prepare("SELECT id, name, dept, status FROM patients ORDER BY created_at DESC LIMIT 5")
      .all();

    const deptRows = db
      .prepare("SELECT dept, COUNT(*) AS n FROM patients GROUP BY dept ORDER BY n DESC LIMIT 6")
      .all();
    const deptMax = deptRows.length ? Math.max(...deptRows.map(d => d.n)) : 1;
    const deptLoad = deptRows.map(d => ({ name: d.dept, count: d.n, pct: Math.round((d.n / deptMax) * 100) }));

    const monthlyRevenue = db
      .prepare(
        `SELECT strftime('%Y-%m', b.bill_date) AS month, COALESCE(SUM(bi.fee),0) AS revenue
         FROM bills b JOIN bill_items bi ON bi.bill_id = b.id
         WHERE b.paid = 1 AND b.bill_date >= date('now','-11 months','start of month')
         GROUP BY month ORDER BY month ASC`
      )
      .all();

    res.json({
      totalPatients,
      activeDoctors,
      todayAppts: { total: todayApptsTotal, cancelled: todayApptsCancelled },
      beds: { ...bedTotals, occupancyPct },
      recentAppointments,
      recentPatients,
      deptLoad,
      monthlyRevenue,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
