/**
 * Middleware d'authentification administrateur
 * Vérifie que l'utilisateur connecté est un administrateur
 */
const { BASE_PATH } = require('../config/appConfig');

/**
 * Protège les routes d'administration
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.flash('error', 'Accès refusé. Connexion requise.');
    return res.redirect(BASE_PATH + '/auth/login');
  }
  if (req.session.userRole !== 'admin') {
    req.flash('error', 'Accès refusé. Droits administrateur requis.');
    return res.redirect(BASE_PATH + '/');
  }
  next();
}

module.exports = { requireAdmin };
