function requireRoles(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "forbidden" });
    }
    return next();
  };
}

module.exports = { requireRoles };
