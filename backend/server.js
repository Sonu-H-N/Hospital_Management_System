require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./src/routes/auth.routes");
const patientRoutes = require("./src/routes/patients.routes");
const doctorRoutes = require("./src/routes/doctors.routes");
const appointmentRoutes = require("./src/routes/appointments.routes");
const billingRoutes = require("./src/routes/billing.routes");
const pharmacyRoutes = require("./src/routes/pharmacy.routes");
const wardRoutes = require("./src/routes/wards.routes");
const dashboardRoutes = require("./src/routes/dashboard.routes");
const reportsRoutes = require("./src/routes/reports.routes");
const { notFound, errorHandler } = require("./src/middleware/errorHandler");

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes("replace_this")) {
  console.error("FATAL: JWT_SECRET is not set (or still the placeholder) in your .env file.");
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(express.json({ limit: "150kb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/pharmacy", pharmacyRoutes);
app.use("/api/wards", wardRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);

app.use("/api", notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 4100;
app.listen(PORT, () => {
  console.log(`MediCore HMS API listening on http://localhost:${PORT}`);
});
