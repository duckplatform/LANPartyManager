/**
 * Middleware d'authentification
 * Vérifie que l'utilisateur est connecté
 */
const { BASE_PATH } = require('../config/appConfig');

/**
 * Protège les routes qui nécessitent une authentification
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Vous devez être connecté pour accéder à cette page.');
  res.redirect(BASE_PATH + '/auth/login');
}

/**
 * Redirige les utilisateurs déjà connectés
 * (ex : pages login/register)
 */
function redirectIfAuthenticated(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect(BASE_PATH + '/profile');
  }
  next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
