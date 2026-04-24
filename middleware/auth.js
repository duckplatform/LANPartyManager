'use strict';

/**
 * Middleware d'authentification
 * Vérifie que l'utilisateur est connecté
 */

/**
 * Exige que l'utilisateur soit authentifié.
 * Redirige vers /auth/login sinon.
 */
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  req.flash('error', 'Vous devez être connecté pour accéder à cette page.');
  return res.redirect('/auth/login');
}

/**
 * Exige que l'utilisateur soit administrateur.
 * Redirige vers la page d'accueil sinon.
 */
function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.isAdmin) {
    return next();
  }
  req.flash('error', 'Accès refusé : droits administrateur requis.');
  return res.redirect('/');
}

/**
 * Exige que l'utilisateur soit modérateur ou administrateur.
 * Redirige vers la page d'accueil sinon.
 */
function requireModerator(req, res, next) {
  if (req.session && req.session.userId && (req.session.isAdmin || req.session.isModerator)) {
    return next();
  }
  req.flash('error', 'Accès refusé : droits modérateur requis.');
  return res.redirect('/');
}

/**
 * Injecte les infos de session dans res.locals pour les vues.
 * Doit être enregistré avant les routes.
 */
function injectLocals(req, res, next) {
  res.locals.currentUser = req.session.userId
    ? {
        id:          req.session.userId,
        pseudo:      req.session.pseudo,
        isAdmin:     req.session.isAdmin,
        isModerator: req.session.isModerator,
      }
    : null;
  res.locals.flashSuccess = req.flash('success');
  res.locals.flashError   = req.flash('error');
  res.locals.flashInfo    = req.flash('info');
  // Rend csrfToken disponible globalement dans les vues (ex: logout form dans le header)
  res.locals.csrfToken    = () => (req.csrfToken ? req.csrfToken() : '');
  next();
}

module.exports = { requireAuth, requireAdmin, requireModerator, injectLocals };
