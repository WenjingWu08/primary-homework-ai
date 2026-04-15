const jwt = require("jsonwebtoken");
const config = require("../config");

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    return next();
  } catch (e) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

module.exports = { authRequired };
