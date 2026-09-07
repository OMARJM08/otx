const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Public: customer triggers this right before being sent to WhatsApp,
// so every order attempt is logged in the real database first.
router.post("/", (req, res) => {
  const { productId, productName, price, customerName, customerPhone } = req.body;

  if (!productName || price === undefined) {
    return res.status(400).json({ error: "بيانات الطلب غير مكتملة" });
  }

  const result = db
    .prepare(
      `INSERT INTO orders (product_id, product_name, price, customer_name, customer_phone)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(productId || null, productName, price, customerName || null, customerPhone || null);

  res.status(201).json({ id: result.lastInsertRowid });
});

// Admin: view all orders, newest first
router.get("/", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
  res.json(rows);
});

// Admin: update an order's status (e.g. جديد -> تم التواصل -> مكتمل)
router.put("/:id/status", requireAdmin, (req, res) => {
  const { status } = req.body;
  const existing = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "الطلب غير موجود" });

  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
