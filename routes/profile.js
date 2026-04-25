'use strict';

/**
 * Routes du profil utilisateur : consultation et modification
 */

const express   = require('express');
const { body, validationResult } = require('express-validator');
const router    = express.Router();
const QRCode    = require('qrcode');
const User              = require('../models/User');
const Event             = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const logger    = require('../config/logger');
const { requireAuth } = require('../middleware/auth');

// ─── Aide : charge les données événement pour le rendu du profil ───────────

async function loadEventData(userId) {
  const [activeEvent, userRegistrations] = await Promise.all([
    Event.findActive(),
    EventRegistration.findByUser(userId),
  ]);

  let isRegistered     = false;
  let registrationOpen = false;

  if (activeEvent) {
    registrationOpen = EventRegistration.isRegistrationOpen(activeEvent);
    isRegistered     = await EventRegistration.isRegistered(activeEvent.id, userId);
  }

  return { activeEvent, userRegistrations, isRegistered, registrationOpen };
}

// ─── GET /profile ──────────────────────────────────────────────────────────

router.get('/', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }

    const eventData = await loadEventData(req.session.userId);

    res.render('profile', {
      title:     'Mon profil',
      pageClass: 'page-profile',
      user,
      errors:    [],
      ...eventData,
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
  body('discord_user_id')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\d{15,20}$/).withMessage('L\'ID Discord doit être un nombre de 15 à 20 chiffres.'),
];

router.post('/', requireAuth, updateRules, async (req, res) => {
  const errors = validationResult(req);
  const user   = await User.findById(req.session.userId).catch(() => null);

  if (!errors.isEmpty()) {
    const eventData = await loadEventData(req.session.userId).catch(() => ({
      activeEvent: null, userRegistrations: [], isRegistered: false, registrationOpen: false,
    }));
    return res.render('profile', {
      title:     'Mon profil',
      pageClass: 'page-profile',
      user:      { ...user, ...req.body },
      errors:    errors.array(),
      ...eventData,
    });
  }

  try {
    const { nom, prenom, pseudo, email, discord_user_id } = req.body;

    // Vérification d'unicité e-mail
    if (await User.emailExists(email, req.session.userId)) {
      const eventData = await loadEventData(req.session.userId).catch(() => ({
        activeEvent: null, userRegistrations: [], isRegistered: false, registrationOpen: false,
      }));
      return res.render('profile', {
        title:     'Mon profil',
        pageClass: 'page-profile',
        user:      { ...user, ...req.body },
        errors:    [{ msg: 'Cette adresse e-mail est déjà utilisée.' }],
        ...eventData,
      });
    }

    await User.update(req.session.userId, { nom, prenom, pseudo, email, discord_user_id });
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
    const eventData = await loadEventData(req.session.userId).catch(() => ({
      activeEvent: null, userRegistrations: [], isRegistered: false, registrationOpen: false,
    }));
    return res.render('profile', {
      title:     'Mon profil',
      pageClass: 'page-profile',
      user,
      errors:    errors.array(),
      activeTab: 'password',
      ...eventData,
    });
  }

  try {
    // Récupère le mot de passe avec son hash
    const userWithPass = await User.findByEmail(user.email);
    const isValid = await User.verifyPassword(req.body.current_password, userWithPass.password);

    if (!isValid) {
      const eventData = await loadEventData(req.session.userId).catch(() => ({
        activeEvent: null, userRegistrations: [], isRegistered: false, registrationOpen: false,
      }));
      return res.render('profile', {
        title:     'Mon profil',
        pageClass: 'page-profile',
        user,
        errors:    [{ msg: 'Mot de passe actuel incorrect.' }],
        activeTab: 'password',
        ...eventData,
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

// ─── POST /profile/events/:id/register ────────────────────────────────────
// Inscription d'un utilisateur à un événement depuis son profil

router.post('/events/:id/register', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  try {
    const event = await Event.findById(eventId);
    if (!event || event.statut === 'termine') {
      req.flash('error', 'Événement introuvable ou terminé.');
      return res.redirect('/profile');
    }

    // Vérifie si les inscriptions sont ouvertes (statut planifie + avant la date de début)
    if (!EventRegistration.isRegistrationOpen(event)) {
      req.flash('error', 'Les inscriptions sont closes (l\'événement a déjà commencé ou n\'est plus disponible).');
      return res.redirect('/profile');
    }

    // Vérifie si déjà inscrit
    const alreadyRegistered = await EventRegistration.isRegistered(eventId, req.session.userId);
    if (alreadyRegistered) {
      req.flash('error', 'Vous êtes déjà inscrit à cet événement.');
      return res.redirect('/profile');
    }

    await EventRegistration.create(eventId, req.session.userId);
    logger.info(`[PROFILE] Utilisateur #${req.session.userId} s'est inscrit à l'événement #${eventId}`);
    req.flash('success', `Vous êtes inscrit à l'événement "${event.nom}" !`);
  } catch (err) {
    logger.error(`[PROFILE] Erreur inscription événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors de l\'inscription à l\'événement.');
  }
  return res.redirect('/profile');
});

// ─── POST /profile/events/:id/unregister ──────────────────────────────────
// Désinscription d'un utilisateur d'un événement depuis son profil

router.post('/events/:id/unregister', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/profile');
    }

    // Vérifie si les inscriptions sont ouvertes (statut planifie + avant la date de début)
    if (!EventRegistration.isRegistrationOpen(event)) {
      req.flash('error', 'Les désinscriptions sont closes (l\'événement a déjà commencé ou n\'est plus disponible).');
      return res.redirect('/profile');
    }

    const deleted = await EventRegistration.delete(eventId, req.session.userId);
    if (deleted) {
      logger.info(`[PROFILE] Utilisateur #${req.session.userId} s'est désinscrit de l'événement #${eventId}`);
      req.flash('success', `Votre inscription à l'événement "${event.nom}" a été annulée.`);
    } else {
      req.flash('error', 'Inscription introuvable.');
    }
  } catch (err) {
    logger.error(`[PROFILE] Erreur désinscription événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors de la désinscription.');
  }
  return res.redirect('/profile');
});

// ─── GET /profile/badge ───────────────────────────────────────────────────
// Badge de membre : QR code permanent lié à l'utilisateur.
// Accessible à tout moment, indépendant des événements.

router.get('/badge', requireAuth, async (req, res) => {
  try {
    let user = await User.findById(req.session.userId);

    if (!user) {
      req.session.destroy(() => {});
      return res.redirect('/auth/login');
    }

    // Génère le badge_token si absent (migration partielle ou compte ancien)
    if (!user.badge_token) {
      user.badge_token = await User.ensureBadgeToken(user.id);
    }

    // Le QR code encode uniquement le badge_token de l'utilisateur.
    // La vérification côté modérateur contrôlera l'inscription à l'événement.
    const qrDataUrl = await QRCode.toDataURL(user.badge_token, {
      width:  300,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    logger.info(`[PROFILE] Utilisateur #${req.session.userId} consulte son badge de membre`);

    res.render('badge', {
      title:     'Mon badge de membre',
      pageClass: 'page-badge',
      user,
      qrDataUrl,
      backUrl:   '/profile',
      backLabel: 'Retour au profil',
    });
  } catch (err) {
    logger.error('[PROFILE] Erreur chargement badge de membre :', err);
    req.flash('error', 'Erreur lors du chargement du badge.');
    return res.redirect('/profile');
  }
});

module.exports = router;
