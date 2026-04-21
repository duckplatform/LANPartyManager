'use strict';

/**
 * Routes du profil utilisateur : consultation et modification
 */

const express   = require('express');
const { body, validationResult } = require('express-validator');
const router    = express.Router();
const User      = require('../models/User');
const logger    = require('../config/logger');
const { requireAuth } = require('../middleware/auth');

// ─── GET /profile ──────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }
    res.render('profile', {
      title:     'Mon profil',
      pageClass: 'page-profile',
      user,
      errors:    [],
    });
  } catch (err) {
    logger.error('[PROFILE] Erreur chargement profil :', err);
    req.flash('error', 'Erreur lors du chargement du profil.');
    return res.redirect('/');
  }
});

// ─── POST /profile ─────────────────────────────────────────────────────────

const updateRules = [
  body('nom')
    .trim().notEmpty().withMessage('Le nom est obligatoire.')
    .isLength({ max: 100 }).withMessage('Nom trop long (max 100 caractères).'),
  body('prenom')
    .trim().notEmpty().withMessage('Le prénom est obligatoire.')
    .isLength({ max: 100 }).withMessage('Prénom trop long (max 100 caractères).'),
  body('pseudo')
    .trim().notEmpty().withMessage('Le pseudo est obligatoire.')
    .isLength({ min: 2, max: 50 }).withMessage('Le pseudo doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Le pseudo contient des caractères non autorisés.'),
  body('email')
    .trim().normalizeEmail().isEmail().withMessage('Adresse e-mail invalide.'),
];

router.post('/', requireAuth, updateRules, async (req, res) => {
  const errors = validationResult(req);
  const user   = await User.findById(req.session.userId).catch(() => null);

  if (!errors.isEmpty()) {
    return res.render('profile', {
      title:     'Mon profil',
      pageClass: 'page-profile',
      user:      { ...user, ...req.body },
      errors:    errors.array(),
    });
  }

  try {
    const { nom, prenom, pseudo, email } = req.body;

    // Vérification d'unicité e-mail
    if (await User.emailExists(email, req.session.userId)) {
      return res.render('profile', {
        title:     'Mon profil',
        pageClass: 'page-profile',
        user:      { ...user, ...req.body },
        errors:    [{ msg: 'Cette adresse e-mail est déjà utilisée.' }],
      });
    }

    await User.update(req.session.userId, { nom, prenom, pseudo, email });
    // Met à jour la session avec le nouveau pseudo
    req.session.pseudo = pseudo;
    logger.info(`[PROFILE] Utilisateur #${req.session.userId} a mis à jour son profil.`);
    req.flash('success', 'Profil mis à jour avec succès.');
    return res.redirect('/profile');
  } catch (err) {
    logger.error('[PROFILE] Erreur mise à jour profil :', err);
    req.flash('error', 'Erreur lors de la mise à jour du profil.');
    return res.redirect('/profile');
  }
});

// ─── POST /profile/password ────────────────────────────────────────────────

const passwordRules = [
  body('current_password').notEmpty().withMessage('Mot de passe actuel requis.'),
  body('new_password')
    .isLength({ min: 8 }).withMessage('Le nouveau mot de passe doit faire au moins 8 caractères.')
    .matches(/[A-Z]/).withMessage('Le nouveau mot de passe doit contenir au moins une majuscule.')
    .matches(/[0-9]/).withMessage('Le nouveau mot de passe doit contenir au moins un chiffre.'),
  body('new_password_confirm')
    .custom((value, { req }) => {
      if (value !== req.body.new_password) throw new Error('Les mots de passe ne correspondent pas.');
      return true;
    }),
];

router.post('/password', requireAuth, passwordRules, async (req, res) => {
  const errors = validationResult(req);
  const user   = await User.findById(req.session.userId).catch(() => null);

  if (!errors.isEmpty()) {
    return res.render('profile', {
      title:     'Mon profil',
      pageClass: 'page-profile',
      user,
      errors:    errors.array(),
      activeTab: 'password',
    });
  }

  try {
    // Récupère le mot de passe avec son hash
    const userWithPass = await User.findByEmail(user.email);
    const isValid = await User.verifyPassword(req.body.current_password, userWithPass.password);

    if (!isValid) {
      return res.render('profile', {
        title:     'Mon profil',
        pageClass: 'page-profile',
        user,
        errors:    [{ msg: 'Mot de passe actuel incorrect.' }],
        activeTab: 'password',
      });
    }

    await User.updatePassword(req.session.userId, req.body.new_password);
    logger.info(`[PROFILE] Utilisateur #${req.session.userId} a changé son mot de passe.`);
    req.flash('success', 'Mot de passe modifié avec succès.');
    return res.redirect('/profile');
  } catch (err) {
    logger.error('[PROFILE] Erreur changement mot de passe :', err);
    req.flash('error', 'Erreur lors du changement de mot de passe.');
    return res.redirect('/profile');
  }
});

module.exports = router;
