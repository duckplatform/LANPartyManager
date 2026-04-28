'use strict';

/**
 * Routes d'authentification : inscription, connexion, déconnexion, OAuth Discord
 */

const https     = require('https');
const { randomBytes } = require('crypto');
const express   = require('express');
const { body, validationResult } = require('express-validator');
const router    = express.Router();
const User      = require('../models/User');
const logger    = require('../config/logger');
const { authLimiter } = require('../middleware/rateLimiter');

// ─── Configuration Discord OAuth2 ─────────────────────────────────────────
// Variables d'environnement (définies dans cPanel en production) :
//   DISCORD_CLIENT_ID      — ID de l'application Discord
//   DISCORD_CLIENT_SECRET  — Secret de l'application Discord
//   APP_URL                — URL publique du site (ex: https://lanparty.example.com)

const DISCORD_AUTH_URL    = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL   = 'https://discord.com/api/oauth2/token';
const DISCORD_USER_URL    = 'https://discord.com/api/users/@me';
const DISCORD_SCOPES      = 'identify email';

/**
 * Retourne l'URI de redirection Discord calculée depuis APP_URL.
 * @returns {string}
 */
function getDiscordRedirectUri() {
  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  return appUrl ? `${appUrl}/auth/discord/callback` : '';
}

/**
 * Effectue une requête HTTPS POST et retourne le corps JSON.
 * @param {string} urlStr
 * @param {Object} params  — champs du formulaire (application/x-www-form-urlencoded)
 * @returns {Promise<Object>}
 */
function discordPost(urlStr, params) {
  return new Promise((resolve, reject) => {
    const body = new URLSearchParams(params).toString();
    const url  = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'Accept':         'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Réponse Discord invalide (token): ${data}`)); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Effectue une requête HTTPS GET authentifiée et retourne le corps JSON.
 * @param {string} urlStr
 * @param {string} accessToken  — Bearer token Discord
 * @returns {Promise<Object>}
 */
function discordGet(urlStr, accessToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      path:     url.pathname,
      method:   'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept':        'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Réponse Discord invalide (user): ${data}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Règles de validation ──────────────────────────────────────────────────

const registerRules = [
  body('nom')
    .trim().notEmpty().withMessage('Le nom est obligatoire.')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères.'),
  body('prenom')
    .trim().notEmpty().withMessage('Le prénom est obligatoire.')
    .isLength({ max: 100 }).withMessage('Le prénom ne peut pas dépasser 100 caractères.'),
  body('pseudo')
    .trim().notEmpty().withMessage('Le pseudo est obligatoire.')
    .isLength({ min: 2, max: 50 }).withMessage('Le pseudo doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Le pseudo contient des caractères non autorisés.'),
  body('email')
    .trim().normalizeEmail().isEmail().withMessage('Adresse e-mail invalide.'),
  body('password')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères.')
    .matches(/[A-Z]/).withMessage('Le mot de passe doit contenir au moins une majuscule.')
    .matches(/[0-9]/).withMessage('Le mot de passe doit contenir au moins un chiffre.'),
  body('password_confirm')
    .custom((value, { req }) => {
      if (value !== req.body.password) throw new Error('Les mots de passe ne correspondent pas.');
      return true;
    }),
];

const loginRules = [
  body('email').trim().normalizeEmail().isEmail().withMessage('Adresse e-mail invalide.'),
  body('password').notEmpty().withMessage('Mot de passe requis.'),
];

// ─── GET /auth/login ───────────────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/login', {
    title:     'Connexion',
    pageClass: 'page-auth',
    errors:    [],
    old:       {},
  });
});

// ─── POST /auth/login ──────────────────────────────────────────────────────

router.post('/login', authLimiter, loginRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', {
      title:     'Connexion',
      pageClass: 'page-auth',
      errors:    errors.array(),
      old:       { email: req.body.email },
    });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findByEmail(email);

    if (!user || !(await User.verifyPassword(password, user.password))) {
      logger.warn(`[AUTH] Tentative de connexion échouée pour : ${email}`);
      return res.render('auth/login', {
        title:     'Connexion',
        pageClass: 'page-auth',
        errors:    [{ msg: 'Email ou mot de passe incorrect.' }],
        old:       { email: req.body.email },
      });
    }

    // Régénère la session pour prévenir la fixation de session
    req.session.regenerate((err) => {
      if (err) {
        logger.error('[AUTH] Erreur régénération session :', err);
        req.flash('error', 'Erreur interne. Veuillez réessayer.');
        return res.redirect('/auth/login');
      }
      req.session.userId       = user.id;
      req.session.pseudo       = user.pseudo;
      req.session.isAdmin      = !!user.is_admin;
      req.session.isModerator  = !!user.is_moderator;
      logger.info(`[AUTH] Connexion réussie pour l'utilisateur #${user.id} (${user.email})`);
      req.flash('success', `Bienvenue, ${user.pseudo} !`);
      return res.redirect('/');
    });
  } catch (err) {
    logger.error('[AUTH] Erreur lors de la connexion :', err);
    req.flash('error', 'Une erreur est survenue. Veuillez réessayer.');
    return res.redirect('/auth/login');
  }
});

// ─── GET /auth/register ────────────────────────────────────────────────────

router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/register', {
    title:     'Inscription',
    pageClass: 'page-auth',
    errors:    [],
    old:       {},
  });
});

// ─── POST /auth/register ───────────────────────────────────────────────────

router.post('/register', authLimiter, registerRules, async (req, res) => {
  const errors = validationResult(req);
  const old    = {
    nom:    req.body.nom,
    prenom: req.body.prenom,
    pseudo: req.body.pseudo,
    email:  req.body.email,
  };

  if (!errors.isEmpty()) {
    return res.render('auth/register', {
      title:     'Inscription',
      pageClass: 'page-auth',
      errors:    errors.array(),
      old,
    });
  }

  try {
    const { nom, prenom, pseudo, email, password } = req.body;

    // Vérifie l'unicité de l'email
    if (await User.emailExists(email)) {
      return res.render('auth/register', {
        title:     'Inscription',
        pageClass: 'page-auth',
        errors:    [{ msg: 'Cette adresse e-mail est déjà utilisée.' }],
        old,
      });
    }

    const newId = await User.create({ nom, prenom, pseudo, email, password });
    logger.info(`[AUTH] Nouvel utilisateur créé #${newId} (${email})`);

    // Connexion automatique après inscription
    req.session.regenerate((err) => {
      if (err) {
        logger.error('[AUTH] Erreur régénération session après inscription :', err);
        req.flash('error', 'Inscription réussie, veuillez vous connecter.');
        return res.redirect('/auth/login');
      }
      req.session.userId       = newId;
      req.session.pseudo       = pseudo;
      req.session.isAdmin      = false;
      req.session.isModerator  = false;
      req.flash('success', 'Compte créé avec succès. Bienvenue !');
      return res.redirect('/');
    });
  } catch (err) {
    logger.error('[AUTH] Erreur lors de l\'inscription :', err);
    req.flash('error', 'Une erreur est survenue lors de l\'inscription.');
    return res.redirect('/auth/register');
  }
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────

router.post('/logout', (req, res) => {
  const userId = req.session.userId;
  req.session.destroy((err) => {
    if (err) {
      logger.error('[AUTH] Erreur lors de la déconnexion :', err);
    } else {
      logger.info(`[AUTH] Utilisateur #${userId} déconnecté.`);
    }
    res.clearCookie('sid');
    return res.redirect('/');
  });
});

// ─── GET /auth/discord ─────────────────────────────────────────────────────
// Démarre le flux OAuth2 Discord en redirigeant vers la page d'autorisation.

router.get('/discord', (req, res) => {
  if (req.session.userId) return res.redirect('/');

  const clientId     = process.env.DISCORD_CLIENT_ID     || '';
  const redirectUri  = getDiscordRedirectUri();

  if (!clientId || !redirectUri) {
    logger.warn('[AUTH DISCORD] DISCORD_CLIENT_ID ou APP_URL non configuré — OAuth Discord désactivé.');
    req.flash('error', 'La connexion via Discord n\'est pas disponible actuellement.');
    return res.redirect('/auth/login');
  }

  // Génère un état aléatoire (256 bits) pour protéger contre le CSRF sur le callback OAuth
  const state = randomBytes(32).toString('hex');
  req.session.discordOauthState = state;

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         DISCORD_SCOPES,
    state,
  });

  return res.redirect(`${DISCORD_AUTH_URL}?${params.toString()}`);
});

// ─── GET /auth/discord/callback ────────────────────────────────────────────
// Reçoit le code OAuth2 de Discord, échange le token, identifie l'utilisateur.

router.get('/discord/callback', async (req, res) => {
  try {
    const { code, state, error: discordError } = req.query;

    // Erreur explicite renvoyée par Discord (ex: accès refusé)
    if (discordError) {
      logger.warn(`[AUTH DISCORD] Erreur OAuth Discord renvoyée par le serveur: ${discordError}`);
      req.flash('error', 'Autorisation Discord refusée ou annulée.');
      return res.redirect('/auth/login');
    }

    // Validation du state (protection CSRF)
    if (!state || state !== req.session.discordOauthState) {
      logger.warn('[AUTH DISCORD] State OAuth invalide (possible tentative CSRF).');
      req.flash('error', 'Requête invalide. Veuillez réessayer.');
      return res.redirect('/auth/login');
    }
    delete req.session.discordOauthState;

    if (!code) {
      req.flash('error', 'Code d\'autorisation Discord manquant.');
      return res.redirect('/auth/login');
    }

    const clientId     = process.env.DISCORD_CLIENT_ID     || '';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    const redirectUri  = getDiscordRedirectUri();

    if (!clientId || !clientSecret || !redirectUri) {
      req.flash('error', 'La connexion via Discord n\'est pas disponible actuellement.');
      return res.redirect('/auth/login');
    }

    // Échange le code contre un token d'accès
    const tokenData = await discordPost(DISCORD_TOKEN_URL, {
      client_id:     clientId,
      client_secret: clientSecret,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  redirectUri,
    });

    if (!tokenData.access_token) {
      logger.error('[AUTH DISCORD] Échec de l\'échange du code:', JSON.stringify(tokenData));
      req.flash('error', 'Erreur lors de la connexion avec Discord. Veuillez réessayer.');
      return res.redirect('/auth/login');
    }

    // Récupère les informations du compte Discord
    const discordUser = await discordGet(DISCORD_USER_URL, tokenData.access_token);

    if (!discordUser.id) {
      logger.error('[AUTH DISCORD] Réponse utilisateur Discord invalide:', JSON.stringify(discordUser));
      req.flash('error', 'Impossible de récupérer les informations Discord. Veuillez réessayer.');
      return res.redirect('/auth/login');
    }

    // Cas 1 : le compte Discord est déjà lié à un compte local → connexion directe
    const existingByDiscord = await User.findByDiscordId(discordUser.id);
    if (existingByDiscord) {
      return req.session.regenerate((err) => {
        if (err) {
          logger.error('[AUTH DISCORD] Erreur régénération session :', err);
          req.flash('error', 'Erreur interne. Veuillez réessayer.');
          return res.redirect('/auth/login');
        }
        req.session.userId      = existingByDiscord.id;
        req.session.pseudo      = existingByDiscord.pseudo;
        req.session.isAdmin     = !!existingByDiscord.is_admin;
        req.session.isModerator = !!existingByDiscord.is_moderator;
        logger.info(`[AUTH DISCORD] Connexion via Discord pour l'utilisateur #${existingByDiscord.id}`);
        req.flash('success', `Bienvenue, ${existingByDiscord.pseudo} !`);
        return res.redirect('/');
      });
    }

    // Cas 2 : l'e-mail Discord est déjà enregistré → liaison automatique du compte
    if (discordUser.email && discordUser.verified) {
      const existingByEmail = await User.findByEmail(discordUser.email);
      if (existingByEmail) {
        await User.linkDiscord(existingByEmail.id, discordUser.id);
        return req.session.regenerate((err) => {
          if (err) {
            logger.error('[AUTH DISCORD] Erreur régénération session :', err);
            req.flash('error', 'Erreur interne. Veuillez réessayer.');
            return res.redirect('/auth/login');
          }
          req.session.userId      = existingByEmail.id;
          req.session.pseudo      = existingByEmail.pseudo;
          req.session.isAdmin     = !!existingByEmail.is_admin;
          req.session.isModerator = !!existingByEmail.is_moderator;
          logger.info(`[AUTH DISCORD] Discord lié automatiquement au compte #${existingByEmail.id} (${existingByEmail.email})`);
          req.flash('success', `Compte Discord lié avec succès. Bienvenue, ${existingByEmail.pseudo} !`);
          return res.redirect('/');
        });
      }
    }

    // Cas 3 : nouvel utilisateur → stocke les infos Discord en session et redirige vers le formulaire
    // global_name = nom d'affichage Discord (ex: "Jean Dupont"), username = handle unique (ex: "jeandupont42")
    req.session.discordPending = {
      id:         discordUser.id,
      username:   discordUser.username   || '',
      globalName: discordUser.global_name || '',
      email:      (discordUser.email && discordUser.verified) ? discordUser.email : null,
    };
    logger.info(`[AUTH DISCORD] Nouvel utilisateur Discord en attente d'inscription: ${discordUser.id}`);
    return res.redirect('/auth/discord/complete');

  } catch (err) {
    logger.error('[AUTH DISCORD] Erreur dans le callback OAuth:', err);
    req.flash('error', 'Une erreur est survenue lors de la connexion avec Discord.');
    return res.redirect('/auth/login');
  }
});

// ─── Règles de validation : finalisation d'inscription Discord ────────────

const discordCompleteRules = [
  body('nom')
    .trim().notEmpty().withMessage('Le nom est obligatoire.')
    .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères.'),
  body('prenom')
    .trim().notEmpty().withMessage('Le prénom est obligatoire.')
    .isLength({ max: 100 }).withMessage('Le prénom ne peut pas dépasser 100 caractères.'),
  body('pseudo')
    .trim().notEmpty().withMessage('Le pseudo est obligatoire.')
    .isLength({ min: 2, max: 50 }).withMessage('Le pseudo doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Le pseudo contient des caractères non autorisés.'),
  body('email')
    .trim().normalizeEmail().isEmail().withMessage('Adresse e-mail invalide.'),
];

// ─── GET /auth/discord/complete ────────────────────────────────────────────
// Affiche le formulaire de finalisation d'inscription après l'OAuth Discord.

router.get('/discord/complete', (req, res) => {
  if (req.session.userId)      return res.redirect('/');
  if (!req.session.discordPending) return res.redirect('/auth/register');

  const { username, globalName, email } = req.session.discordPending;

  // Pseudo suggéré : priorité au nom d'affichage Discord (global_name), sinon handle unique
  const pseudoSuggestion = globalName || username || '';

  res.render('auth/discord-complete', {
    title:     'Finaliser mon inscription',
    pageClass: 'page-auth',
    errors:    [],
    old: {
      pseudo: pseudoSuggestion,
      email:  email   || '',
      nom:    '',
      prenom: '',
    },
  });
});

// ─── POST /auth/discord/complete ───────────────────────────────────────────
// Crée le compte utilisateur après validation du formulaire de complétion Discord.

router.post('/discord/complete', authLimiter, discordCompleteRules, async (req, res) => {
  if (!req.session.discordPending) {
    req.flash('error', 'Session expirée. Veuillez recommencer l\'inscription.');
    return res.redirect('/auth/register');
  }

  const { id: discordId } = req.session.discordPending;

  const errors = validationResult(req);
  const old = {
    nom:    req.body.nom,
    prenom: req.body.prenom,
    pseudo: req.body.pseudo,
    email:  req.body.email,
  };

  if (!errors.isEmpty()) {
    return res.render('auth/discord-complete', {
      title:     'Finaliser mon inscription',
      pageClass: 'page-auth',
      errors:    errors.array(),
      old,
    });
  }

  try {
    const { nom, prenom, pseudo, email } = req.body;

    // Vérification de l'unicité de l'e-mail
    if (await User.emailExists(email)) {
      return res.render('auth/discord-complete', {
        title:     'Finaliser mon inscription',
        pageClass: 'page-auth',
        errors:    [{ msg: 'Cette adresse e-mail est déjà utilisée. Si vous avez déjà un compte, connectez-vous par e-mail pour lier votre Discord.' }],
        old,
      });
    }

    const newId = await User.createFromDiscord({ nom, prenom, pseudo, email, discordId });
    delete req.session.discordPending;

    logger.info(`[AUTH DISCORD] Nouvel utilisateur créé via Discord #${newId} (${email})`);

    req.session.regenerate((err) => {
      if (err) {
        logger.error('[AUTH DISCORD] Erreur régénération session après inscription :', err);
        req.flash('error', 'Inscription réussie, veuillez vous connecter.');
        return res.redirect('/auth/login');
      }
      req.session.userId      = newId;
      req.session.pseudo      = pseudo.trim();
      req.session.isAdmin     = false;
      req.session.isModerator = false;
      req.flash('success', 'Compte créé avec succès via Discord. Bienvenue !');
      return res.redirect('/');
    });

  } catch (err) {
    // ER_DUP_ENTRY (code 1062) : contrainte UNIQUE discord_user_id ou email violée en concurrence
    if (err.code === 'ER_DUP_ENTRY') {
      logger.warn('[AUTH DISCORD] Tentative de création avec discord_user_id ou email déjà présent (race condition) :', err.message);
      req.flash('error', 'Ce compte Discord ou cette adresse e-mail est déjà associé à un compte. Veuillez vous connecter.');
      return res.redirect('/auth/login');
    }
    logger.error('[AUTH DISCORD] Erreur lors de la création du compte Discord :', err);
    req.flash('error', 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.');
    return res.redirect('/auth/discord/complete');
  }
});

module.exports = router;
