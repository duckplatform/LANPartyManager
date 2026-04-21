'use strict';

/**
 * Routes d'authentification : inscription, connexion, déconnexion
 */

const express   = require('express');
const { body, validationResult } = require('express-validator');
const router    = express.Router();
const User      = require('../models/User');
const logger    = require('../config/logger');
const { authLimiter } = require('../middleware/rateLimiter');

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
      req.session.userId  = user.id;
      req.session.pseudo  = user.pseudo;
      req.session.isAdmin = !!user.is_admin;
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
      req.session.userId  = newId;
      req.session.pseudo  = pseudo;
      req.session.isAdmin = false;
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

module.exports = router;
