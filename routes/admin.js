'use strict';

/**
 * Routes du panneau d'administration
 * Accessible uniquement aux utilisateurs avec is_admin = true
 */

const express      = require('express');
const router       = express.Router();
const { body, validationResult } = require('express-validator');
const QRCode            = require('qrcode');
const User              = require('../models/User');
const Announcement      = require('../models/Announcement');
const Event             = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Game              = require('../models/Game');
const Room              = require('../models/Room');
const Battle            = require('../models/Battle');
const { renderMarkdown } = require('../config/markdown');
const logger       = require('../config/logger');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const discord      = require('../services/discord');

// Toutes les routes admin nécessitent auth + admin
router.use(requireAuth, requireAdmin);

// ─── GET /admin ────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const [users, totalUsers, totalAnnouncements, totalEvents] = await Promise.all([
      User.findAll(),
      User.count(),
      Announcement.count(),
      Event.count(),
    ]);
    res.render('admin/dashboard', {
      title:               'Administration',
      pageClass:           'page-admin',
      users,
      totalUsers,
      totalAnnouncements,
      totalEvents,
      stats: {
        admins:      users.filter(u => u.is_admin).length,
        moderators:  users.filter(u => u.is_moderator && !u.is_admin).length,
        members:     users.filter(u => !u.is_admin && !u.is_moderator).length,
      },
    });
  } catch (err) {
    logger.error('[ADMIN] Erreur chargement dashboard :', err);
    req.flash('error', 'Erreur lors du chargement du panneau d\'administration.');
    return res.redirect('/');
  }
});

// ─── GET /admin/users/:id/badge ───────────────────────────────────────────

router.get('/users/:id/badge', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    req.flash('error', 'Utilisateur introuvable.');
    return res.redirect('/admin');
  }

  try {
    let user = await User.findById(targetId);

    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin');
    }

    if (!user.badge_token) {
      user.badge_token = await User.ensureBadgeToken(user.id);
    }

    const qrDataUrl = await QRCode.toDataURL(user.badge_token, {
      width:  300,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    });

    logger.info(`[ADMIN] Utilisateur #${req.session.userId} consulte le badge du membre #${targetId}`);

    return res.render('badge', {
      title:     `Badge membre - ${user.pseudo}`,
      pageClass: 'page-badge',
      user,
      qrDataUrl,
      backUrl:   '/admin',
      backLabel: 'Retour a l\'administration',
    });
  } catch (err) {
    logger.error(`[ADMIN] Erreur chargement badge utilisateur #${targetId} :`, err);
    req.flash('error', 'Erreur lors du chargement du badge utilisateur.');
    return res.redirect('/admin');
  }
});

// ─── POST /admin/users/:id/toggle-admin ───────────────────────────────────

router.post('/users/:id/toggle-admin', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  // Empêche l'admin de se retirer ses propres droits
  if (targetId === req.session.userId) {
    req.flash('error', 'Vous ne pouvez pas modifier vos propres droits administrateur.');
    return res.redirect('/admin');
  }

  try {
    const user = await User.findById(targetId);
    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin');
    }
    const newStatus = !user.is_admin;
    await User.setAdmin(targetId, newStatus);
    logger.info(`[ADMIN] Utilisateur #${req.session.userId} a ${newStatus ? 'promu' : 'rétrogradé'} l'utilisateur #${targetId}`);
    req.flash('success', `Droits administrateur ${newStatus ? 'accordés' : 'retirés'} à ${user.pseudo}.`);
  } catch (err) {
    logger.error('[ADMIN] Erreur toggle-admin :', err);
    req.flash('error', 'Erreur lors de la modification des droits.');
  }
  return res.redirect('/admin');
});

// ─── POST /admin/users/:id/toggle-moderator ──────────────────────────────

router.post('/users/:id/toggle-moderator', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  // Empêche l'admin de modifier ses propres droits depuis ce panneau
  if (targetId === req.session.userId) {
    req.flash('error', 'Vous ne pouvez pas modifier vos propres droits de modérateur.');
    return res.redirect('/admin');
  }

  try {
    const user = await User.findById(targetId);
    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin');
    }
    const newStatus = !user.is_moderator;
    await User.setModerator(targetId, newStatus);
    logger.info(`[ADMIN] Utilisateur #${req.session.userId} a ${newStatus ? 'accordé' : 'retiré'} le rôle modérateur à l'utilisateur #${targetId}`);
    req.flash('success', `Rôle modérateur ${newStatus ? 'accordé à' : 'retiré de'} ${user.pseudo}.`);
  } catch (err) {
    logger.error('[ADMIN] Erreur toggle-moderator :', err);
    req.flash('error', 'Erreur lors de la modification du rôle modérateur.');
  }
  return res.redirect('/admin');
});

// ─── POST /admin/users/:id/delete ─────────────────────────────────────────

router.post('/users/:id/delete', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  // Empêche l'admin de supprimer son propre compte depuis ce panneau
  if (targetId === req.session.userId) {
    req.flash('error', 'Vous ne pouvez pas supprimer votre propre compte depuis le panneau admin.');
    return res.redirect('/admin');
  }

  try {
    const user = await User.findById(targetId);
    if (!user) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin');
    }
    await User.delete(targetId);
    logger.info(`[ADMIN] Utilisateur #${req.session.userId} a supprimé l'utilisateur #${targetId} (${user.email})`);
    req.flash('success', `L'utilisateur ${user.pseudo} a été supprimé.`);
  } catch (err) {
    logger.error('[ADMIN] Erreur suppression utilisateur :', err);
    req.flash('error', 'Erreur lors de la suppression de l\'utilisateur.');
  }
  return res.redirect('/admin');
});

// ═══════════════════════════════════════════════════════════════════════════
// GESTION DES ANNONCES (BLOG/NEWS)
// ═══════════════════════════════════════════════════════════════════════════

// Règles de validation communes aux formulaires d'annonces
const announcementValidation = [
  body('titre')
    .trim()
    .notEmpty().withMessage('Le titre est obligatoire.')
    .isLength({ max: 255 }).withMessage('Le titre ne peut pas dépasser 255 caractères.'),
  body('contenu')
    .notEmpty().withMessage('Le contenu est obligatoire.'),
  body('statut')
    .isIn(['publie', 'brouillon']).withMessage('Statut invalide.'),
];

// ─── GET /admin/news ──────────────────────────────────────────────────────

router.get('/news', async (req, res) => {
  try {
    const announcements = await Announcement.findAll();
    res.render('admin/news/index', {
      title:         'Gestion des annonces',
      pageClass:     'page-admin',
      announcements,
    });
  } catch (err) {
    logger.error('[ADMIN/NEWS] Erreur chargement liste :', err);
    req.flash('error', 'Erreur lors du chargement des annonces.');
    return res.redirect('/admin');
  }
});

// ─── GET /admin/news/create ───────────────────────────────────────────────

router.get('/news/create', (req, res) => {
  res.render('admin/news/form', {
    title:        'Nouvelle annonce',
    pageClass:    'page-admin',
    announcement: null,
    errors:       [],
  });
});

// ─── POST /admin/news ─────────────────────────────────────────────────────

router.post('/news', announcementValidation, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/news/form', {
      title:        'Nouvelle annonce',
      pageClass:    'page-admin',
      announcement: req.body,
      errors:       errors.array(),
    });
  }

  try {
    const { titre, contenu, statut } = req.body;
    const id = await Announcement.create({ titre, contenu, statut });
    logger.info(`[ADMIN/NEWS] Annonce #${id} créée par l'utilisateur #${req.session.userId} (statut: ${statut})`);

    // Notification Discord si l'annonce est directement publiée
    if (statut === 'publie') {
      discord.notifyNewsPublished({ id, titre, contenu }).catch(() => {});
    }

    req.flash('success', `L'annonce "${titre}" a été créée.`);
    return res.redirect('/admin/news');
  } catch (err) {
    logger.error('[ADMIN/NEWS] Erreur création :', err);
    req.flash('error', 'Erreur lors de la création de l\'annonce.');
    return res.redirect('/admin/news/create');
  }
});

// ─── GET /admin/news/:id/edit ─────────────────────────────────────────────

router.get('/news/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      req.flash('error', 'Annonce introuvable.');
      return res.redirect('/admin/news');
    }
    res.render('admin/news/form', {
      title:        `Modifier : ${announcement.titre}`,
      pageClass:    'page-admin',
      announcement,
      errors:       [],
    });
  } catch (err) {
    logger.error(`[ADMIN/NEWS] Erreur chargement annonce #${id} :`, err);
    req.flash('error', 'Erreur lors du chargement de l\'annonce.');
    return res.redirect('/admin/news');
  }
});

// ─── POST /admin/news/:id ─────────────────────────────────────────────────

router.post('/news/:id', announcementValidation, async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/news/form', {
      title:        'Modifier l\'annonce',
      pageClass:    'page-admin',
      announcement: { id, ...req.body },
      errors:       errors.array(),
    });
  }

  try {
    const existing = await Announcement.findById(id);
    if (!existing) {
      req.flash('error', 'Annonce introuvable.');
      return res.redirect('/admin/news');
    }

    const { titre, contenu, statut } = req.body;
    await Announcement.update(id, { titre, contenu, statut });
    logger.info(`[ADMIN/NEWS] Annonce #${id} modifiée par l'utilisateur #${req.session.userId}`);

    // Notification Discord lors du passage en statut 'publie'
    if (statut === 'publie' && existing.statut !== 'publie') {
      discord.notifyNewsPublished({ id, titre, contenu }).catch(() => {});
    }

    req.flash('success', `L'annonce "${titre}" a été mise à jour.`);
    return res.redirect('/admin/news');
  } catch (err) {
    logger.error(`[ADMIN/NEWS] Erreur modification annonce #${id} :`, err);
    req.flash('error', 'Erreur lors de la mise à jour de l\'annonce.');
    return res.redirect(`/admin/news/${id}/edit`);
  }
});

// ─── POST /admin/news/:id/delete ──────────────────────────────────────────

router.post('/news/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      req.flash('error', 'Annonce introuvable.');
      return res.redirect('/admin/news');
    }
    await Announcement.delete(id);
    logger.info(`[ADMIN/NEWS] Annonce #${id} supprimée par l'utilisateur #${req.session.userId}`);
    req.flash('success', `L'annonce "${announcement.titre}" a été supprimée.`);
  } catch (err) {
    logger.error(`[ADMIN/NEWS] Erreur suppression annonce #${id} :`, err);
    req.flash('error', 'Erreur lors de la suppression de l\'annonce.');
  }
  return res.redirect('/admin/news');
});

// ─── POST /admin/news/:id/preview ────────────────────────────────────────
// Endpoint AJAX : retourne le HTML rendu depuis un fragment Markdown

router.post('/news/preview', async (req, res) => {
  try {
    const { contenu } = req.body;
    const html = renderMarkdown(contenu || '');
    return res.json({ html });
  } catch (err) {
    logger.error('[ADMIN/NEWS] Erreur prévisualisation :', err);
    return res.status(500).json({ html: '' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GESTION DES ÉVÉNEMENTS
// ═══════════════════════════════════════════════════════════════════════════

// Règles de validation communes aux formulaires d'événements
const eventValidation = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom de l\'événement est obligatoire.')
    .isLength({ max: 255 }).withMessage('Le nom ne peut pas dépasser 255 caractères.'),
  body('date_heure')
    .notEmpty().withMessage('La date et l\'heure sont obligatoires.')
    .isISO8601().withMessage('Format de date invalide.'),
  body('lieu')
    .trim()
    .notEmpty().withMessage('Le lieu est obligatoire.')
    .isLength({ max: 255 }).withMessage('Le lieu ne peut pas dépasser 255 caractères.'),
  body('statut')
    .isIn(['planifie', 'en_cours', 'termine']).withMessage('Statut invalide.'),
];

// ─── GET /admin/events ────────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  try {
    const events = await Event.findAllWithRegistrationCount();

    res.render('admin/events/index', {
      title:     'Gestion des événements',
      pageClass: 'page-admin',
      events,
    });
  } catch (err) {
    logger.error('[ADMIN/EVENTS] Erreur chargement liste :', err);
    req.flash('error', 'Erreur lors du chargement des événements.');
    return res.redirect('/admin');
  }
});

// ─── GET /admin/events/create ─────────────────────────────────────────────

router.get('/events/create', (req, res) => {
  res.render('admin/events/form', {
    title:            'Nouvel événement',
    pageClass:        'page-admin',
    event:            null,
    dateHeureLocal:   '',
    errors:           [],
  });
});

// ─── POST /admin/events ───────────────────────────────────────────────────

router.post('/events', eventValidation, async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/events/form', {
      title:          'Nouvel événement',
      pageClass:      'page-admin',
      event:          req.body,
      dateHeureLocal: req.body.date_heure || '',
      errors:         errors.array(),
    });
  }

  try {
    const { nom, date_heure, lieu } = req.body;
    const statut = req.body.statut;
    const id = await Event.create({ nom, date_heure, lieu, statut });
    logger.info(`[ADMIN/EVENTS] Événement #${id} créé par l'utilisateur #${req.session.userId}`);

    // Notification Discord à la création de l'événement
    discord.notifyEventCreated({ id, nom, date_heure, lieu, statut }).catch(() => {});

    req.flash('success', `L'événement "${nom}" a été créé.`);
    return res.redirect('/admin/events');
  } catch (err) {
    if (err && err.code === 'EVENT_ACTIVE_CONFLICT') {
      const conflictName = err.conflictEvent && err.conflictEvent.nom
        ? ` (${err.conflictEvent.nom})`
        : '';
      req.flash('error', `Impossible de créer un deuxième événement en cours${conflictName}. Terminez d'abord l'événement actif.`);
      return res.redirect('/admin/events/create');
    }

    logger.error('[ADMIN/EVENTS] Erreur création :', err);
    req.flash('error', 'Erreur lors de la création de l\'événement.');
    return res.redirect('/admin/events/create');
  }
});

// ─── GET /admin/events/:id/edit ───────────────────────────────────────────

router.get('/events/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const event = await Event.findById(id);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/admin/events');
    }
    // Formate la date pour l'input datetime-local (sans offset TZ)
    const d = new Date(event.date_heure);
    const dateHeureLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    res.render('admin/events/form', {
      title:          `Modifier : ${event.nom}`,
      pageClass:      'page-admin',
      event,
      dateHeureLocal,
      errors:         [],
    });
  } catch (err) {
    logger.error(`[ADMIN/EVENTS] Erreur chargement événement #${id} :`, err);
    req.flash('error', 'Erreur lors du chargement de l\'événement.');
    return res.redirect('/admin/events');
  }
});

// ─── POST /admin/events/:id ───────────────────────────────────────────────

router.post('/events/:id', eventValidation, async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/events/form', {
      title:          'Modifier l\'événement',
      pageClass:      'page-admin',
      event:          { id, ...req.body },
      dateHeureLocal: req.body.date_heure || '',
      errors:         errors.array(),
    });
  }

  try {
    const existing = await Event.findById(id);
    if (!existing) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/admin/events');
    }

    const { nom, date_heure, lieu } = req.body;
    const statut = req.body.statut;
    await Event.update(id, { nom, date_heure, lieu, statut });
    logger.info(`[ADMIN/EVENTS] Événement #${id} modifié par l'utilisateur #${req.session.userId}`);

    // Notifications Discord selon les transitions de statut
    if (existing.statut !== statut) {
      const updatedEvent = { id, nom, date_heure, lieu, statut };
      if (statut === 'en_cours') {
        discord.notifyEventStarted(updatedEvent).catch(() => {});
      } else if (statut === 'termine') {
        discord.notifyEventEnded(updatedEvent).catch(() => {});
      }
    }

    req.flash('success', `L'événement "${nom}" a été mis à jour.`);
    return res.redirect('/admin/events');
  } catch (err) {
    if (err && err.code === 'EVENT_ACTIVE_CONFLICT') {
      const conflictName = err.conflictEvent && err.conflictEvent.nom
        ? ` (${err.conflictEvent.nom})`
        : '';
      req.flash('error', `Impossible d'activer cet événement${conflictName}. Un seul événement peut être en cours à la fois.`);
      return res.redirect(`/admin/events/${id}/edit`);
    }

    logger.error(`[ADMIN/EVENTS] Erreur modification événement #${id} :`, err);
    req.flash('error', 'Erreur lors de la mise à jour de l\'événement.');
    return res.redirect(`/admin/events/${id}/edit`);
  }
});

// ─── POST /admin/events/:id/delete ───────────────────────────────────────

router.post('/events/:id/delete', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const event = await Event.findById(id);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/admin/events');
    }
    await Event.delete(id);
    logger.info(`[ADMIN/EVENTS] Événement #${id} supprimé par l'utilisateur #${req.session.userId}`);
    req.flash('success', `L'événement "${event.nom}" a été supprimé.`);
  } catch (err) {
    logger.error(`[ADMIN/EVENTS] Erreur suppression événement #${id} :`, err);
    req.flash('error', 'Erreur lors de la suppression de l\'événement.');
  }
  return res.redirect('/admin/events');
});

// ─── GET /admin/events/:id/registrations ─────────────────────────────────

router.get('/events/:id/registrations', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const event = await Event.findById(id);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/admin/events');
    }

    const [registrations, allUsers] = await Promise.all([
      EventRegistration.findByEvent(id),
      User.findAll(),
    ]);

    // Filtre les membres déjà inscrits pour la liste déroulante d'ajout
    const registeredIds  = new Set(registrations.map(r => r.user_id));
    const availableUsers = allUsers.filter(u => !registeredIds.has(u.id));
    const registrationOpen = EventRegistration.isRegistrationOpen(event);

    res.render('admin/events/registrations', {
      title:            `Inscrits — ${event.nom}`,
      pageClass:        'page-admin',
      event,
      registrations,
      availableUsers,
      registrationOpen,
    });
  } catch (err) {
    logger.error(`[ADMIN/EVENTS] Erreur inscrits événement #${id} :`, err);
    req.flash('error', 'Erreur lors du chargement des inscriptions.');
    return res.redirect('/admin/events');
  }
});

// ─── POST /admin/events/:id/registrations ────────────────────────────────
// Ajout manuel d'un inscrit par un admin

router.post('/events/:id/registrations', async (req, res) => {
  const id     = parseInt(req.params.id, 10);
  const userId = parseInt(req.body.user_id, 10);

  if (!userId) {
    req.flash('error', 'Veuillez sélectionner un membre.');
    return res.redirect(`/admin/events/${id}/registrations`);
  }

  try {
    const [event, user] = await Promise.all([
      Event.findById(id),
      User.findById(userId),
    ]);

    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/admin/events');
    }
    if (!user) {
      req.flash('error', 'Membre introuvable.');
      return res.redirect(`/admin/events/${id}/registrations`);
    }

    const alreadyRegistered = await EventRegistration.isRegistered(id, userId);
    if (alreadyRegistered) {
      req.flash('error', `${user.pseudo} est déjà inscrit à cet événement.`);
      return res.redirect(`/admin/events/${id}/registrations`);
    }

    await EventRegistration.create(id, userId);
    logger.info(`[ADMIN/EVENTS] Admin #${req.session.userId} a inscrit l'utilisateur #${userId} à l'événement #${id}`);
    req.flash('success', `${user.pseudo} a été inscrit à l'événement.`);
  } catch (err) {
    logger.error(`[ADMIN/EVENTS] Erreur inscription manuelle :`, err);
    req.flash('error', 'Erreur lors de l\'inscription.');
  }
  return res.redirect(`/admin/events/${id}/registrations`);
});

// ─── POST /admin/events/:id/registrations/:regId/delete ──────────────────
// Suppression d'une inscription par un admin

router.post('/events/:id/registrations/:regId/delete', async (req, res) => {
  const id    = parseInt(req.params.id, 10);
  const regId = parseInt(req.params.regId, 10);

  try {
    await EventRegistration.deleteById(regId);
    logger.info(`[ADMIN/EVENTS] Admin #${req.session.userId} a supprimé l'inscription #${regId} de l'événement #${id}`);
    req.flash('success', 'Inscription supprimée.');
  } catch (err) {
    logger.error(`[ADMIN/EVENTS] Erreur suppression inscription #${regId} :`, err);
    req.flash('error', 'Erreur lors de la suppression de l\'inscription.');
  }
  return res.redirect(`/admin/events/${id}/registrations`);
});

// ═══════════════════════════════════════════════════════════════════════════
// GESTION DES JEUX (GAMES)
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /admin/games ─────────────────────────────────────────────────────
// Liste des jeux disponibles

router.get('/games', async (req, res) => {
  try {
    const games = await Game.findAll();
    res.render('admin/games/index', {
      title:     'Jeux disponibles',
      pageClass: 'page-admin',
      games,
    });
  } catch (err) {
    logger.error('[ADMIN/GAMES] Erreur chargement jeux :', err);
    req.flash('error', 'Erreur lors du chargement des jeux.');
    return res.redirect('/admin');
  }
});

// ─── GET /admin/games/create ──────────────────────────────────────────────
// Formulaire de création d'un jeu

router.get('/games/create', (req, res) => {
  res.render('admin/games/create', {
    title:     'Ajouter un jeu',
    pageClass: 'page-admin',
    errors:    [],
    old:       {},
    TYPES_RENCONTRE: Game.TYPES_RENCONTRE,
  });
});

// ─── POST /admin/games ────────────────────────────────────────────────────
// Création d'un jeu

router.post(
  '/games',
  [
    body('nom').trim().notEmpty().withMessage('Le nom est obligatoire.')
      .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères.'),
    body('console').trim().notEmpty().withMessage('La console est obligatoire.')
      .isLength({ max: 100 }).withMessage('La console ne peut pas dépasser 100 caractères.'),
    body('type_rencontre').isIn(Game.TYPES_RENCONTRE).withMessage('Type de rencontre invalide.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('admin/games/create', {
        title:     'Ajouter un jeu',
        pageClass: 'page-admin',
        errors:    errors.array(),
        old:       req.body,
        TYPES_RENCONTRE: Game.TYPES_RENCONTRE,
      });
    }

    try {
      const id = await Game.create({
        nom:            req.body.nom,
        console:        req.body.console,
        type_rencontre: req.body.type_rencontre,
      });
      logger.info(`[ADMIN/GAMES] Admin #${req.session.userId} a créé le jeu #${id} : ${req.body.nom}`);
      req.flash('success', `Jeu "${req.body.nom}" créé avec succès.`);
      return res.redirect('/admin/games');
    } catch (err) {
      logger.error('[ADMIN/GAMES] Erreur création jeu :', err);
      req.flash('error', 'Erreur lors de la création du jeu.');
      return res.redirect('/admin/games/create');
    }
  }
);

// ─── GET /admin/games/:id/edit ────────────────────────────────────────────
// Formulaire d'édition d'un jeu

router.get('/games/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const game = await Game.findById(id);
    if (!game) {
      req.flash('error', 'Jeu introuvable.');
      return res.redirect('/admin/games');
    }
    res.render('admin/games/edit', {
      title:     `Modifier — ${game.nom}`,
      pageClass: 'page-admin',
      game,
      errors:    [],
      old:       game,
      TYPES_RENCONTRE: Game.TYPES_RENCONTRE,
    });
  } catch (err) {
    logger.error(`[ADMIN/GAMES] Erreur chargement édition jeu #${id} :`, err);
    req.flash('error', 'Erreur lors du chargement du jeu.');
    return res.redirect('/admin/games');
  }
});

// ─── PUT /admin/games/:id ─────────────────────────────────────────────────
// Mise à jour d'un jeu

router.put(
  '/games/:id',
  [
    body('nom').trim().notEmpty().withMessage('Le nom est obligatoire.')
      .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères.'),
    body('console').trim().notEmpty().withMessage('La console est obligatoire.')
      .isLength({ max: 100 }).withMessage('La console ne peut pas dépasser 100 caractères.'),
    body('type_rencontre').isIn(Game.TYPES_RENCONTRE).withMessage('Type de rencontre invalide.'),
  ],
  async (req, res) => {
    const id     = parseInt(req.params.id, 10);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const game = await Game.findById(id).catch(() => null);
      return res.render('admin/games/edit', {
        title:     `Modifier — ${game ? game.nom : 'Jeu'}`,
        pageClass: 'page-admin',
        game:      game || { id },
        errors:    errors.array(),
        old:       req.body,
        TYPES_RENCONTRE: Game.TYPES_RENCONTRE,
      });
    }

    try {
      const updated = await Game.update(id, {
        nom:            req.body.nom,
        console:        req.body.console,
        type_rencontre: req.body.type_rencontre,
      });
      if (!updated) {
        req.flash('error', 'Jeu introuvable.');
        return res.redirect('/admin/games');
      }
      logger.info(`[ADMIN/GAMES] Admin #${req.session.userId} a modifié le jeu #${id}`);
      req.flash('success', 'Jeu mis à jour.');
      return res.redirect('/admin/games');
    } catch (err) {
      logger.error(`[ADMIN/GAMES] Erreur mise à jour jeu #${id} :`, err);
      req.flash('error', 'Erreur lors de la mise à jour du jeu.');
      return res.redirect(`/admin/games/${id}/edit`);
    }
  }
);

// ─── DELETE /admin/games/:id ──────────────────────────────────────────────
// Suppression d'un jeu

router.delete('/games/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const deleted = await Game.delete(id);
    if (!deleted) {
      req.flash('error', 'Jeu introuvable.');
    } else {
      logger.info(`[ADMIN/GAMES] Admin #${req.session.userId} a supprimé le jeu #${id}`);
      req.flash('success', 'Jeu supprimé.');
    }
  } catch (err) {
    logger.error(`[ADMIN/GAMES] Erreur suppression jeu #${id} :`, err);
    req.flash('error', 'Impossible de supprimer ce jeu (des rencontres y sont peut-être associées).');
  }
  return res.redirect('/admin/games');
});

// ═══════════════════════════════════════════════════════════════════════════
// GESTION DES SALLES (ROOMS)
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /admin/rooms ─────────────────────────────────────────────────────
// Liste des salles (filtrée par événement si ?event_id=X)

router.get('/rooms', async (req, res) => {
  const eventId = parseInt(req.query.event_id, 10) || null;
  try {
    const [events, rooms] = await Promise.all([
      Event.findAll(),
      eventId ? Room.findByEvent(eventId) : Promise.resolve([]),
    ]);
    const selectedEvent = eventId ? events.find(e => e.id === eventId) || null : null;

    res.render('admin/rooms/index', {
      title:         'Salles de jeu',
      pageClass:     'page-admin',
      events,
      rooms,
      selectedEvent,
      eventId,
      TYPES_SALLE:      Room.TYPES_SALLE,
      TYPES_RENCONTRE:  Room.TYPES_RENCONTRE,
    });
  } catch (err) {
    logger.error('[ADMIN/ROOMS] Erreur chargement salles :', err);
    req.flash('error', 'Erreur lors du chargement des salles.');
    return res.redirect('/admin');
  }
});

// ─── GET /admin/rooms/create ──────────────────────────────────────────────
// Formulaire de création d'une salle (event_id requis en query)

router.get('/rooms/create', async (req, res) => {
  const eventId = parseInt(req.query.event_id, 10) || null;
  try {
    const [events, suggestedName] = await Promise.all([
      Event.findAll(),
      eventId ? Room.generateName(eventId) : Promise.resolve(''),
    ]);
    res.render('admin/rooms/create', {
      title:    'Ajouter une salle',
      pageClass: 'page-admin',
      events,
      errors:   [],
      old:      { event_id: eventId, nom: suggestedName },
      TYPES_SALLE:      Room.TYPES_SALLE,
      TYPES_RENCONTRE:  Room.TYPES_RENCONTRE,
    });
  } catch (err) {
    logger.error('[ADMIN/ROOMS] Erreur chargement formulaire création salle :', err);
    req.flash('error', 'Erreur lors du chargement du formulaire.');
    return res.redirect('/admin/rooms');
  }
});

// ─── POST /admin/rooms ────────────────────────────────────────────────────
// Création d'une salle

router.post(
  '/rooms',
  [
    body('event_id').isInt({ min: 1 }).withMessage('Événement invalide.'),
    body('nom').trim().notEmpty().withMessage('Le nom est obligatoire.')
      .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères.'),
    body('type').isIn(Room.TYPES_SALLE).withMessage('Type de salle invalide.'),
    body('type_rencontre').isIn(Room.TYPES_RENCONTRE).withMessage('Type de rencontre invalide.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const events = await Event.findAll().catch(() => []);
      return res.render('admin/rooms/create', {
        title:    'Ajouter une salle',
        pageClass: 'page-admin',
        events,
        errors:   errors.array(),
        old:      req.body,
        TYPES_SALLE:      Room.TYPES_SALLE,
        TYPES_RENCONTRE:  Room.TYPES_RENCONTRE,
      });
    }

    try {
      const eventId = parseInt(req.body.event_id, 10);
      const id = await Room.create({
        nom:            req.body.nom,
        type:           req.body.type,
        type_rencontre: req.body.type_rencontre,
        actif:          req.body.actif === '1' ? 1 : 0,
        event_id:       eventId,
      });
      logger.info(`[ADMIN/ROOMS] Admin #${req.session.userId} a créé la salle #${id} : ${req.body.nom}`);

      // Une nouvelle salle disponible peut libérer des rencontres en file d'attente
      await Battle.reevaluateQueue(eventId).catch(e => logger.error('[ADMIN/ROOMS] reevaluateQueue erreur :', e));

      req.flash('success', `Salle "${req.body.nom}" créée avec succès.`);
      return res.redirect(`/admin/rooms?event_id=${req.body.event_id}`);
    } catch (err) {
      logger.error('[ADMIN/ROOMS] Erreur création salle :', err);
      req.flash('error', 'Erreur lors de la création de la salle.');
      return res.redirect('/admin/rooms/create');
    }
  }
);

// ─── GET /admin/rooms/:id/edit ────────────────────────────────────────────
// Formulaire d'édition d'une salle

router.get('/rooms/:id/edit', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const [room, events] = await Promise.all([
      Room.findById(id),
      Event.findAll(),
    ]);
    if (!room) {
      req.flash('error', 'Salle introuvable.');
      return res.redirect('/admin/rooms');
    }
    res.render('admin/rooms/edit', {
      title:     `Modifier — ${room.nom}`,
      pageClass: 'page-admin',
      room,
      events,
      errors:    [],
      old:       room,
      TYPES_SALLE:      Room.TYPES_SALLE,
      TYPES_RENCONTRE:  Room.TYPES_RENCONTRE,
    });
  } catch (err) {
    logger.error(`[ADMIN/ROOMS] Erreur chargement édition salle #${id} :`, err);
    req.flash('error', 'Erreur lors du chargement de la salle.');
    return res.redirect('/admin/rooms');
  }
});

// ─── PUT /admin/rooms/:id ─────────────────────────────────────────────────
// Mise à jour d'une salle

router.put(
  '/rooms/:id',
  [
    body('nom').trim().notEmpty().withMessage('Le nom est obligatoire.')
      .isLength({ max: 100 }).withMessage('Le nom ne peut pas dépasser 100 caractères.'),
    body('type').isIn(Room.TYPES_SALLE).withMessage('Type de salle invalide.'),
    body('type_rencontre').isIn(Room.TYPES_RENCONTRE).withMessage('Type de rencontre invalide.'),
  ],
  async (req, res) => {
    const id     = parseInt(req.params.id, 10);
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const [room, events] = await Promise.all([
        Room.findById(id).catch(() => null),
        Event.findAll().catch(() => []),
      ]);
      return res.render('admin/rooms/edit', {
        title:     `Modifier — ${room ? room.nom : 'Salle'}`,
        pageClass: 'page-admin',
        room:      room || { id },
        events,
        errors:    errors.array(),
        old:       req.body,
        TYPES_SALLE:      Room.TYPES_SALLE,
        TYPES_RENCONTRE:  Room.TYPES_RENCONTRE,
      });
    }

    try {
      const updated = await Room.update(id, {
        nom:            req.body.nom,
        type:           req.body.type,
        type_rencontre: req.body.type_rencontre,
        actif:          req.body.actif === '1' ? 1 : 0,
      });
      if (!updated) {
        req.flash('error', 'Salle introuvable.');
        return res.redirect('/admin/rooms');
      }
      const room = await Room.findById(id);
      logger.info(`[ADMIN/ROOMS] Admin #${req.session.userId} a modifié la salle #${id}`);

      // Une salle modifiée (activée/désactivée ou type changé) peut impacter la file d'attente
      await Battle.reevaluateQueue(room.event_id).catch(e => logger.error('[ADMIN/ROOMS] reevaluateQueue erreur :', e));

      req.flash('success', 'Salle mise à jour.');
      return res.redirect(`/admin/rooms?event_id=${room.event_id}`);
    } catch (err) {
      logger.error(`[ADMIN/ROOMS] Erreur mise à jour salle #${id} :`, err);
      req.flash('error', 'Erreur lors de la mise à jour de la salle.');
      return res.redirect(`/admin/rooms/${id}/edit`);
    }
  }
);

// ─── POST /admin/rooms/:id/toggle ─────────────────────────────────────────
// Active / désactive une salle (toggle)

router.post('/rooms/:id/toggle', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const room = await Room.findById(id);
    if (!room) {
      req.flash('error', 'Salle introuvable.');
      return res.redirect('/admin/rooms');
    }
    await Room.setActif(id, !room.actif);
    logger.info(`[ADMIN/ROOMS] Admin #${req.session.userId} a ${room.actif ? 'désactivé' : 'activé'} la salle #${id}`);

    // Un changement d'état de salle doit réévaluer la file d'attente
    await Battle.reevaluateQueue(room.event_id).catch(e => logger.error('[ADMIN/ROOMS] reevaluateQueue erreur :', e));

    req.flash('success', `Salle "${room.nom}" ${room.actif ? 'désactivée' : 'activée'}.`);
    return res.redirect(`/admin/rooms?event_id=${room.event_id}`);
  } catch (err) {
    logger.error(`[ADMIN/ROOMS] Erreur toggle salle #${id} :`, err);
    req.flash('error', 'Erreur lors du changement d\'état de la salle.');
    return res.redirect('/admin/rooms');
  }
});

// ─── DELETE /admin/rooms/:id ──────────────────────────────────────────────
// Suppression d'une salle

router.delete('/rooms/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    const room = await Room.findById(id);
    if (!room) {
      req.flash('error', 'Salle introuvable.');
      return res.redirect('/admin/rooms');
    }
    const eventId = room.event_id;
    const deleted = await Room.delete(id);
    if (!deleted) {
      req.flash('error', 'Impossible de supprimer cette salle.');
    } else {
      logger.info(`[ADMIN/ROOMS] Admin #${req.session.userId} a supprimé la salle #${id}`);

      // La suppression d'une salle peut libérer des places dans la file d'attente
      await Battle.reevaluateQueue(eventId).catch(e => logger.error('[ADMIN/ROOMS] reevaluateQueue erreur :', e));

      req.flash('success', 'Salle supprimée.');
    }
    return res.redirect(`/admin/rooms?event_id=${eventId}`);
  } catch (err) {
    logger.error(`[ADMIN/ROOMS] Erreur suppression salle #${id} :`, err);
    req.flash('error', 'Impossible de supprimer cette salle (des rencontres y sont peut-être associées).');
    return res.redirect('/admin/rooms');
  }
});

module.exports = router;
