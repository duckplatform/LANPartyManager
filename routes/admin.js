'use strict';

/**
 * Routes du panneau d'administration
 * Accessible uniquement aux utilisateurs avec is_admin = true
 */

const express      = require('express');
const router       = express.Router();
const { body, validationResult } = require('express-validator');
const User              = require('../models/User');
const Announcement      = require('../models/Announcement');
const Event             = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const { renderMarkdown } = require('../config/markdown');
const logger       = require('../config/logger');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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
        admins:  users.filter(u => u.is_admin).length,
        members: users.filter(u => !u.is_admin).length,
      },
    });
  } catch (err) {
    logger.error('[ADMIN] Erreur chargement dashboard :', err);
    req.flash('error', 'Erreur lors du chargement du panneau d\'administration.');
    return res.redirect('/');
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
    const actif = req.body.actif === '1';
    const id = await Event.create({ nom, date_heure, lieu, actif });
    logger.info(`[ADMIN/EVENTS] Événement #${id} créé par l'utilisateur #${req.session.userId}`);
    req.flash('success', `L'événement "${nom}" a été créé.`);
    return res.redirect('/admin/events');
  } catch (err) {
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
    const actif = req.body.actif === '1';
    await Event.update(id, { nom, date_heure, lieu, actif });
    logger.info(`[ADMIN/EVENTS] Événement #${id} modifié par l'utilisateur #${req.session.userId}`);
    req.flash('success', `L'événement "${nom}" a été mis à jour.`);
    return res.redirect('/admin/events');
  } catch (err) {
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

module.exports = router;

