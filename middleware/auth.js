const jwt = require("jsonwebtoken");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "يجب تسجيل الدخول كأدمن للقيام بهذا الإجراء" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "جلسة الدخول منتهية، الرجاء تسجيل الدخول مجدداً" });
  }
}

module.exports = { requireAdmin };
