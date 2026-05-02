'use strict';

/**
 * Middleware d'authentification
 * Vérifie que l'utilisateur est connecté
 */

const AppSettings = require('../models/AppSettings');

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
 * Inclut également les paramètres d'application (AppSettings) pour avoir
 * accès à la configuration personnalisée (logo, nom, liens communautés, etc.)
 * Doit être enregistré avant les routes.
 */
async function injectLocals(req, res, next) {
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

  // Injecte les paramètres d'application pour l'identité et les liens communautés
  try {
    const appSettings = await AppSettings.getAll();
    res.locals.appSettings = {
      organization_name: appSettings.organization_name || 'LANPartyManager',
      organization_logo: appSettings.organization_logo || null,
      organization_slogan: appSettings.organization_slogan || null,
      community_link_discord: appSettings.community_link_discord || null,
      community_link_twitter: appSettings.community_link_twitter || null,
      community_link_twitch: appSettings.community_link_twitch || null,
      community_link_youtube: appSettings.community_link_youtube || null,
      community_link_website: appSettings.community_link_website || null,
    };
  } catch (err) {
    // En cas d'erreur (DB indisponible), on utilise les valeurs par défaut
    res.locals.appSettings = {
      organization_name: 'LANPartyManager',
      organization_logo: null,
      organization_slogan: null,
      community_link_discord: null,
      community_link_twitter: null,
      community_link_twitch: null,
      community_link_youtube: null,
      community_link_website: null,
    };
  }

  next();
}

module.exports = { requireAuth, requireAdmin, requireModerator, injectLocals };
