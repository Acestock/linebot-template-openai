const crypto = require('crypto');

// In-memory session store: token → expiresAt (ms timestamp)
const sessions = new Map();

function createToken() {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return token;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  // EventSource (SSE) cannot set custom headers — accept token via query param
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.query.token;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const expiresAt = sessions.get(token);
  if (!expiresAt || Date.now() > expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ error: 'Token expired' });
  }
  next();
}

module.exports = { authMiddleware, createToken, sessions };
