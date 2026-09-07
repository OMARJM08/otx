const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "uploads")
  : path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = Date.now() + "-" + file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "pdf" && file.mimetype !== "application/pdf") {
      return cb(new Error("PDF files only"));
    }
    cb(null, true);
  },
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB
});

function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    oldPrice: row.old_price,
    swatch: row.swatch,
    image: row.image_path ? `/uploads/${path.basename(row.image_path)}` : null,
    pdf: row.pdf_path ? `/uploads/${path.basename(row.pdf_path)}` : null,
    top: row.top_notes ? row.top_notes.split(",") : [],
    heart: row.heart_notes ? row.heart_notes.split(",") : [],
    base: row.base_notes ? row.base_notes.split(",") : []
  };
}

// Public: list all products
router.get("/", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
  res.json(rows.map(rowToProduct));
});

// Public: get one product
router.get("/:id", (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "المنتج غير موجود" });
  res.json(rowToProduct(row));
});

// Admin: create product (with optional image + PDF upload)
router.post(
  "/",
  requireAdmin,
  upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 1 }]),
  (req, res) => {
    const { name, category, price, oldPrice, swatch, top, heart, base } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "الاسم والسعر مطلوبان" });
    }

    const imagePath = req.files?.image?.[0]?.filename || null;
    const pdfPath = req.files?.pdf?.[0]?.filename || null;

    const result = db
      .prepare(
        `INSERT INTO products (name, category, price, old_price, swatch, image_path, pdf_path, top_notes, heart_notes, base_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        category || "",
        parseFloat(price),
        oldPrice ? parseFloat(oldPrice) : null,
        swatch || "linear-gradient(160deg,#444,#111)",
        imagePath,
        pdfPath,
        top || "",
        heart || "",
        base || ""
      );

    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(rowToProduct(row));
  }
);

// Admin: update product
router.put(
  "/:id",
  requireAdmin,
  upload.fields([{ name: "image", maxCount: 1 }, { name: "pdf", maxCount: 1 }]),
  (req, res) => {
    const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });

    const { name, category, price, oldPrice, swatch, top, heart, base } = req.body;
    const imagePath = req.files?.image?.[0]?.filename || existing.image_path;
    const pdfPath = req.files?.pdf?.[0]?.filename || existing.pdf_path;

    db.prepare(
      `UPDATE products SET name=?, category=?, price=?, old_price=?, swatch=?, image_path=?, pdf_path=?, top_notes=?, heart_notes=?, base_notes=?
       WHERE id=?`
    ).run(
      name ?? existing.name,
      category ?? existing.category,
      price ? parseFloat(price) : existing.price,
      oldPrice ? parseFloat(oldPrice) : existing.old_price,
      swatch ?? existing.swatch,
      imagePath,
      pdfPath,
      top ?? existing.top_notes,
      heart ?? existing.heart_notes,
      base ?? existing.base_notes,
      req.params.id
    );

    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    res.json(rowToProduct(row));
  }
);

// Admin: delete product
router.delete("/:id", requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "المنتج غير موجود" });

  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);

  [existing.image_path, existing.pdf_path].forEach((f) => {
    if (f) {
      const p = path.join(UPLOAD_DIR, f);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  res.json({ ok: true });
});

module.exports = router;
