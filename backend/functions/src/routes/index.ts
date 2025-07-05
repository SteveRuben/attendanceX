import {Router} from "express";
// Routes
import {authRoutes} from "./auth.routes";
import {userRoutes} from "./users.routes";
import {eventRoutes} from "./events.routes";
import {attendanceRoutes} from "./attendances.routes";
import {notificationRoutes} from "./notifications.routes";
import {reportRoutes} from "./reports.routes";
const router = Router();
// ❤️ Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// 📊 API Info endpoint
router.get("/api", (req, res) => {
  res.json({
    name: "Attendance-X API",
    version: "1.0.0",
    description: "API complète pour la gestion de présence avec IA",
    documentation: "/api/docs",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      events: "/api/events",
      attendances: "/api/attendances",
      notifications: "/api/notifications",
      reports: "/api/reports",
    },
  });
});

// 🛣️ API Routes
router.use("/api/auth", authRoutes);
router.use("/api/users", userRoutes);
router.use("/api/events", eventRoutes);
router.use("/api/attendances", attendanceRoutes);
router.use("/api/notifications", notificationRoutes);
router.use("/api/reports", reportRoutes);

// 🔍 404 handler
router.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
    method: req.method,
  });
});
