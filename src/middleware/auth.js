const jwt = require('jsonwebtoken');

/**
 * Middleware to verify a JWT token from the Authorization header.
 * Sets req.user = { id, email, role } on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: 'Token expiré ou invalide.' });
  }
}

/**
 * Middleware to restrict access to admin users only.
 * Must be used after `authenticate`.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
