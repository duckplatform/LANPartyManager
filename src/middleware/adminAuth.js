/**
 * Middleware d'authentification administrateur
 * Vérifie que l'utilisateur connecté est un administrateur
 */

/**
 * Protège les routes d'administration
 */
function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.flash('error', 'Accès refusé. Connexion requise.');
    return res.redirect('/auth/login');
  }
  if (req.session.userRole !== 'admin') {
    req.flash('error', 'Accès refusé. Droits administrateur requis.');
    return res.redirect('/');
  }
  next();
}

module.exports = { requireAdmin };
