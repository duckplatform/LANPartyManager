/**
 * Routes d'authentification
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const logger = require('../config/logger');

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/login', { title: 'Connexion', errors: [] });
});

// POST /auth/login
router.post('/login', authLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/login', { title: 'Connexion', errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);

    if (!user || !(await User.verifyPassword(password, user.password_hash))) {
      logger.warn(`Tentative de connexion échouée: ${email} depuis ${req.ip}`);
      return res.render('auth/login', {
        title: 'Connexion',
        errors: [{ msg: 'Email ou mot de passe incorrect.' }]
      });
    }

    if (!user.is_active) {
      return res.render('auth/login', {
        title: 'Connexion',
        errors: [{ msg: 'Compte désactivé. Contactez un administrateur.' }]
      });
    }

    // Régénérer la session pour prévenir la fixation de session
    req.session.regenerate((err) => {
      if (err) {
        logger.error('Erreur régénération session:', err);
        return res.render('auth/login', { title: 'Connexion', errors: [{ msg: 'Erreur serveur.' }] });
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar
      };

      logger.info(`Connexion: ${user.username} (${user.role})`);
      req.flash('success', `Bienvenue, ${user.username} !`);

      const redirect = req.session.returnTo || (user.role === 'admin' ? '/admin' : '/');
      delete req.session.returnTo;
      res.redirect(redirect);
    });
  } catch (err) {
    logger.error('Erreur connexion:', err);
    res.render('auth/login', { title: 'Connexion', errors: [{ msg: 'Erreur serveur. Réessayez.' }] });
  }
});

// GET /auth/register
router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('auth/register', { title: 'Inscription', errors: [] });
});

// POST /auth/register
router.post('/register', authLimiter, [
  body('username').trim().isLength({ min: 3, max: 30 })
    .withMessage("Nom d'utilisateur: 3 à 30 caractères")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Caractères alphanumériques, tirets et underscores uniquement'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe: minimum 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Doit contenir majuscule, minuscule et chiffre'),
  body('password_confirm').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Les mots de passe ne correspondent pas');
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/register', { title: 'Inscription', errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    const [existingEmail, existingUsername] = await Promise.all([
      User.findByEmail(email),
      User.findByUsername(username)
    ]);

    if (existingEmail) {
      return res.render('auth/register', {
        title: 'Inscription',
        errors: [{ msg: 'Cet email est déjà utilisé.' }]
      });
    }
    if (existingUsername) {
      return res.render('auth/register', {
        title: 'Inscription',
        errors: [{ msg: 'Ce nom d\'utilisateur est déjà pris.' }]
      });
    }

    await User.create({ username, email, password, role: 'user' });
    logger.info(`Nouvel utilisateur inscrit: ${username}`);
    req.flash('success', 'Compte créé ! Vous pouvez maintenant vous connecter.');
    res.redirect('/auth/login');
  } catch (err) {
    logger.error('Erreur inscription:', err);
    res.render('auth/register', {
      title: 'Inscription',
      errors: [{ msg: 'Erreur lors de la création du compte.' }]
    });
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  const username = req.session.user?.username;
  req.session.destroy((err) => {
    if (err) logger.error('Erreur destruction session:', err);
    if (username) logger.info(`Déconnexion: ${username}`);
    res.redirect('/auth/login');
  });
});

// GET /auth/profile
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    res.render('auth/profile', { title: 'Mon profil', user, errors: [] });
  } catch (err) {
    logger.error('Erreur profil:', err);
    res.redirect('/');
  }
});

// POST /auth/profile
router.post('/profile', isAuthenticated, [
  body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio: maximum 500 caractères'),
  body('new_password').optional({ checkFalsy: true }).isLength({ min: 8 })
    .withMessage('Nouveau mot de passe: minimum 8 caractères'),
  body('password_confirm').optional({ checkFalsy: true }).custom((val, { req }) => {
    if (req.body.new_password && val !== req.body.new_password) {
      throw new Error('Les mots de passe ne correspondent pas');
    }
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  const user = await User.findById(req.session.user.id);

  if (!errors.isEmpty()) {
    return res.render('auth/profile', { title: 'Mon profil', user, errors: errors.array() });
  }

  const { bio, current_password, new_password } = req.body;
  const updateData = { bio };

  if (new_password) {
    if (!current_password) {
      return res.render('auth/profile', {
        title: 'Mon profil', user,
        errors: [{ msg: 'Mot de passe actuel requis pour le modifier.' }]
      });
    }

    const valid = await User.verifyPassword(current_password, user.password_hash);
    if (!valid) {
      return res.render('auth/profile', {
        title: 'Mon profil', user,
        errors: [{ msg: 'Mot de passe actuel incorrect.' }]
      });
    }
    updateData.password = new_password;
  }

  try {
    await User.update(req.session.user.id, updateData);
    req.session.user.bio = bio;
    req.flash('success', 'Profil mis à jour.');
    res.redirect('/auth/profile');
  } catch (err) {
    logger.error('Erreur mise à jour profil:', err);
    res.render('auth/profile', {
      title: 'Mon profil', user,
      errors: [{ msg: 'Erreur lors de la mise à jour.' }]
    });
  }
});

module.exports = router;
