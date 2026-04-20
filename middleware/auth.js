/**
 * Middlewares d'authentification et d'autorisation
 */
const logger = require('../config/logger');

/**
 * Vérifie que l'utilisateur est connecté
 */
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  req.session.returnTo = req.originalUrl;
  req.flash('error', 'Vous devez être connecté pour accéder à cette page.');
  res.redirect('/auth/login');
};

/**
 * Vérifie que l'utilisateur est administrateur
 */
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  logger.warn(`Tentative d'accès admin non autorisée: ${req.session?.user?.username || 'anonyme'} -> ${req.path}`);
  req.flash('error', 'Accès refusé. Privilèges administrateur requis.');
  res.redirect('/');
};

/**
 * Vérifie que l'utilisateur est modérateur ou admin
 */
const isModerator = (req, res, next) => {
  if (req.session && req.session.user &&
    (req.session.user.role === 'admin' || req.session.user.role === 'moderator')) {
    return next();
  }
  logger.warn(`Tentative d'accès modérateur non autorisée: ${req.session?.user?.username || 'anonyme'} -> ${req.path}`);
  req.flash('error', 'Accès refusé. Privilèges modérateur requis.');
  res.redirect('/');
};

module.exports = { isAuthenticated, isAdmin, isModerator };
