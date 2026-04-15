const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { insert, list } = require("../store");
const { authRequired } = require("../middleware/auth");
const config = require("../config");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, role = "student", password } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ error: "name_and_password_required" });
  }
  const exists = list("users", (u) => u.name === name)[0];
  if (exists) {
    return res.status(409).json({ error: "user_exists" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = insert("users", { name, role, passwordHash });
  return res.json({ id: user.id, name: user.name, role: user.role });
});

router.post("/login", async (req, res) => {
  const { name, password } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ error: "name_and_password_required" });
  }
  const user = list("users", (u) => u.name === name)[0];
  if (!user) return res.status(401).json({ error: "invalid_credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash || "");
  if (!ok) return res.status(401).json({ error: "invalid_credentials" });

  const token = jwt.sign(
    {
      userId: user.id,
      name: user.name,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role
    }
  });
});

router.get("/me", authRequired, (req, res) => {
  return res.json({
    userId: req.user.userId,
    name: req.user.name,
    role: req.user.role
  });
});

module.exports = router;
