// Every visitor gets a random session id generated client-side (stored in
// localStorage) and sent on every request via the X-Session-Id header.
// This is what keeps one visitor's uploaded dataset invisible to everyone else.
function sessionMiddleware(req, res, next) {
  const sessionId = req.header("X-Session-Id") || req.query.sessionId;
  if (!sessionId || typeof sessionId !== "string" || sessionId.length > 100) {
    return res.status(400).json({ error: "Missing or invalid X-Session-Id header" });
  }
  req.sessionId = sessionId;
  next();
}

module.exports = { sessionMiddleware };
