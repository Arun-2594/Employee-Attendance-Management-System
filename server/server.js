// server/server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/* =======================
   CORS CONFIG (PERMANENT)
======================= */

// ✅ ONLY keep real frontend domains
const allowedOrigins = [
  "http://localhost:3000",
  "https://employee-attendance-management-syst-ashy.vercel.app"
];

// 🔍 Debug: log incoming origin
app.use((req, res, next) => {
  console.log("🌍 Incoming Request Origin:", req.headers.origin);
  next();
});

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / Postman / health checks
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error("❌ CORS Blocked Origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

/* =======================
   MIDDLEWARE
======================= */
app.use(express.json());

/* =======================
   DATABASE
======================= */
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
  });

/* =======================
   ROUTES
======================= */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/employees", require("./routes/employeeRoutes"));
app.use("/api/departments", require("./routes/departmentRoutes"));
app.use("/api/leaves", require("./routes/leaveRoutes"));
app.use("/api/salaries", require("./routes/salaryRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));

/* =======================
   DEFAULT ROUTES
======================= */
app.get("/", (req, res) => {
  res.json({
    message: "Employee Attendance Management System API",
    version: "1.0.0",
    status: "Running"
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    time: new Date().toISOString()
  });
});

/* =======================
   SERVER
======================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
