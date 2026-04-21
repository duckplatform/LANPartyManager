'use strict';

/**
 * Middleware de limitation du taux de requêtes (rate limiting)
 * Protège contre les attaques par force brute et DDoS basiques
 */

const rateLimit = require('express-rate-limit');

/**
 * Limite globale : 200 requêtes par IP toutes les 15 minutes
 */
const globalLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             200,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
});

/**
 * Limite stricte pour les routes d'authentification : 10 tentatives / 15 min
 */
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
  skipSuccessfulRequests: true,
});

module.exports = { globalLimiter, authLimiter };
