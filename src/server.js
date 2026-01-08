require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

/* =====================================================
   DATABASE CONNECTION
===================================================== */

connectDB();

/* =====================================================
   START SERVER
===================================================== */

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
});

/* =====================================================
   GRACEFUL SHUTDOWN
===================================================== */

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("👋 SIGINT received. Shutting down gracefully...");
  server.close(() => process.exit(0));
});
