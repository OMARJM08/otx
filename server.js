require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");

const productRoutes = require("./routes/products");
const adminRoutes = require("./routes/admin");
const orderRoutes = require("./routes/orders");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "uploads")
  : path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled: page loads fonts/pdf.js from CDNs
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic protection against brute-forcing the admin login
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use("/api/admin/login", loginLimiter);

// General API rate limit
app.use("/api/", rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Uploaded product images / PDFs are served as static files
app.use("/uploads", express.static(UPLOAD_DIR));

// API routes (backed by the real SQLite database in db.js)
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

// Storefront + admin dashboard (static frontend that talks to the API above)
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`OTX ELIXIR server running on http://localhost:${PORT}`);
});
