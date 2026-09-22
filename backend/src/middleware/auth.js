const jwt = require("jsonwebtoken");

/** Verifies the Bearer token and attaches { id, email, name, role } to req.user. */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, name: payload.name, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
}

/**
 * Restricts a route to specific staff roles. Use after requireAuth.
 * e.g. router.delete('/:id', requireAuth, requireRole('Admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to perform this action." });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
