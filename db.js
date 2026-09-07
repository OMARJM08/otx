// Real, persistent SQLite database (file-based, ACID-compliant relational DB).
// The .db file lives on disk in /data (or the project root) and survives restarts.
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, "otx.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL NOT NULL,
    old_price REAL,
    swatch TEXT,
    image_path TEXT,
    pdf_path TEXT,
    top_notes TEXT,
    heart_notes TEXT,
    base_notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    product_name TEXT,
    price REAL,
    customer_name TEXT,
    customer_phone TEXT,
    status TEXT DEFAULT 'جديد',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed with the original three products the first time the DB is created.
const productCount = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (productCount === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, category, price, old_price, swatch, top_notes, heart_notes, base_notes)
    VALUES (@name, @category, @price, @old_price, @swatch, @top_notes, @heart_notes, @base_notes)
  `);
  const seed = [
    {
      name: "Purple Heart Diamond",
      category: "زهري خشبي — للجنسين",
      price: 28,
      old_price: 35,
      swatch: "linear-gradient(160deg,#5a1d2c,#2c0d15)",
      top_notes: "زهر البرتقال,الكمثرى,الفانيليا",
      heart_notes: "الفلفل الوردي,الياسمين,اللوز",
      base_notes: "خشب الكشمير,خشب الأرز,الباتشولي"
    },
    {
      name: "Amber Oud Royale",
      category: "شرقي عودي — للرجال",
      price: 32,
      old_price: null,
      swatch: "linear-gradient(160deg,#c4661f,#3a1e08)",
      top_notes: "الزعفران,البرغموت,الفلفل الأسود",
      heart_notes: "العود,خشب الصندل,القرنفل",
      base_notes: "العنبر,المسك,الفانيليا"
    },
    {
      name: "Emerald Musk",
      category: "مسكي منعش — للنساء",
      price: 26,
      old_price: null,
      swatch: "linear-gradient(160deg,#3a4a3f,#101512)",
      top_notes: "البرغموت,النعناع,الليمون",
      heart_notes: "الياسمين,زهرة اللوتس,الفريزيا",
      base_notes: "المسك الأبيض,خشب الأرز,العنبر"
    }
  ];
  const insertMany = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
  insertMany(seed);
}

// Seed the WhatsApp setting from .env the first time.
const hasWhatsapp = db.prepare("SELECT value FROM settings WHERE key = 'whatsapp'").get();
if (!hasWhatsapp) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('whatsapp', ?)").run(
    process.env.WHATSAPP_NUMBER || ""
  );
}

// Additional products added later — inserted here (not just in the initial seed block)
// so they also appear on stores that were already deployed before these were added.
// Matched by name to avoid creating duplicates on every restart.
const newProducts = [
  {
    name: "Arrogate Pink Diva",
    category: "فاكهي زهري — للنساء",
    price: 30,
    old_price: null,
    swatch: "linear-gradient(160deg,#8a9a7a,#33402c)",
    top_notes: "برتقال,توت العليق,خوخ",
    heart_notes: "الورد,الأيرس,الغاردينيا",
    base_notes: "خشب الصندل,المسك,الباتشولي"
  },
  {
    name: "Addict Blue",
    category: "حمضي عنبري — للجنسين",
    price: 29,
    old_price: null,
    swatch: "linear-gradient(160deg,#1c2b3a,#050a10)",
    top_notes: "البرغموت,البرتقال",
    heart_notes: "زهر البرتقال,الغيرانيوم",
    base_notes: "فول التونكا,العنبر الجاف"
  },
  {
    name: "IBRAQ Tobacco Collection",
    category: "تشكيلة اكتشاف — 9 عطور تبغ عالمية",
    price: 45,
    old_price: null,
    swatch: "linear-gradient(160deg,#8a6a3a,#2b1d10)",
    top_notes: "أوراق التبغ,البرغموت",
    heart_notes: "القهوة,الكراميل المملح,الورد",
    base_notes: "العنبر,الأخشاب,المسك"
  }
];

const findProductByName = db.prepare("SELECT id FROM products WHERE name = ?");
const insertProduct = db.prepare(`
  INSERT INTO products (name, category, price, old_price, swatch, top_notes, heart_notes, base_notes)
  VALUES (@name, @category, @price, @old_price, @swatch, @top_notes, @heart_notes, @base_notes)
`);
newProducts.forEach((p) => {
  if (!findProductByName.get(p.name)) insertProduct.run(p);
});

module.exports = db;
