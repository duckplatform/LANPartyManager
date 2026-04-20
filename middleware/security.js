/**
 * Configuration de la sécurité applicative
 * Helmet, rate limiting
 */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

/**
 * Configuration Helmet avec CSP adaptée
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
});

/**
 * Rate limiter général
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de requêtes, veuillez réessayer dans 15 minutes.',
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit dépassé: ${req.ip} -> ${req.path}`);
    res.status(429).send(options.message);
  }
});

/**
 * Rate limiter strict pour l'authentification
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit dépassé: ${req.ip}`);
    req.flash('error', options.message);
    res.redirect(req.get('Referrer') || '/auth/login');
  }
});

/**
 * Rate limiter pour l'installation
 */
const installLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: "Trop de tentatives d'installation."
});

module.exports = { helmetConfig, generalLimiter, authLimiter, installLimiter };
