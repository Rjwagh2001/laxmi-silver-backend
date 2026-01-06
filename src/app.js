const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const errorHandler = require("./middlewares/error.middleware");
const notFound = require("./middlewares/notFound.middleware");

const app = express();

/* =====================================================
   SECURITY MIDDLEWARES
===================================================== */

// Secure HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Rate limiting (applies only to API routes)
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Too many requests from this IP, please try again later",
});
app.use("/api", limiter);

/* =====================================================
   🔥 PAYMENT WEBHOOK (ADDED – MUST BE BEFORE express.json)
===================================================== */

app.use(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/payment.routes")
);

/* =====================================================
   BODY PARSING & COOKIES
===================================================== */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

/* =====================================================
   DATA SANITIZATION & PERFORMANCE
===================================================== */

// Custom sanitization middleware (NoSQL injection + XSS prevention)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (obj && typeof obj === "object") {
      Object.keys(obj).forEach((key) => {
        if (/^\$/.test(key) || key.includes(".")) {
          delete obj[key];
        } else if (typeof obj[key] === "string") {
          obj[key] = obj[key]
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;")
            .replace(/\//g, "&#x2F;");
        } else if (typeof obj[key] === "object") {
          sanitize(obj[key]);
        }
      });
    }
  };

  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
});

// Gzip compression
app.use(compression());

/* =====================================================
   LOGGING
===================================================== */

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* =====================================================
   HEALTH CHECK & ROOT ROUTE
===================================================== */

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Laxmi Silver Backend running 🚀",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laxmi Silver Backend is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

/* =====================================================
   API ROUTES
===================================================== */

// 🔐 Authentication
app.use("/api/v1/auth", require("./routes/auth.routes"));

// 🧑 Users
// app.use("/api/v1/users", require("./routes/user.routes"));

// 🛍 Products
app.use("/api/v1/products", require("./routes/product.routes"));

// 🛒 Cart  ✅ ADDED
app.use("/api/v1/cart", require("./routes/cart.routes"));

// 📦 Orders ✅ ADDED
app.use("/api/v1/orders", require("./routes/order.routes"));

// 🗂 Categories
app.use("/api/v1/categories", require("./routes/category.routes"));

// 🛒 Cart (old commented – kept as-is)
// app.use("/api/v1/cart", require("./routes/cart.routes"));

// 📦 Orders (old commented – kept as-is)
// app.use("/api/v1/orders", require("./routes/order.routes"));

// 💳 Payments (NORMAL ROUTES – keep commented for now if you want)
 app.use("/api/v1/payments", require("./routes/payment.routes"));

// 🛠 Admin
// app.use("/api/v1/admin", require("./routes/admin.routes"));

/* =====================================================
   ERROR HANDLING
===================================================== */

// 404 handler (must be AFTER routes)
app.use(notFound);

// Global error handler (must be LAST)
app.use(errorHandler);

module.exports = app;
