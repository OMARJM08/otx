const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// One admin account, configured via environment variables (see .env.example).
// The password is hashed in memory at startup - it is never stored in plain text anywhere.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@otxelixir.com";
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "changeme", 10);

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== ADMIN_EMAIL || !bcrypt.compareSync(password || "", ADMIN_PASSWORD_HASH)) {
    return res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
  }

  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.json({ token });
});

router.get("/settings", (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp'").get();
  res.json({ whatsapp: row ? row.value : "" });
});

router.put("/settings", requireAdmin, (req, res) => {
  const { whatsapp } = req.body;
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('whatsapp', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(whatsapp || "");
  res.json({ ok: true });
});

module.exports = router;
