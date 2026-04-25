'use strict';

/**
 * Routes publiques — Catalogue des événements
 * Accessible sans authentification pour consulter les événements.
 * L'inscription à un événement nécessite d'être connecté.
 */

const express           = require('express');
const router            = express.Router();
const Event             = require('../models/Event');
const EventRanking      = require('../models/EventRanking');
const EventRegistration = require('../models/EventRegistration');
const logger            = require('../config/logger');
const { requireAuth }   = require('../middleware/auth');

// ─── GET /events ───────────────────────────────────────────────────────────
// Liste publique de tous les événements planifiés et en cours

router.get('/', async (req, res) => {
  try {
    const events = await Event.findAllPublic();

    // Pour chaque événement, calculer si les inscriptions sont ouvertes
    events.forEach(e => {
      e.registrationOpen = EventRegistration.isRegistrationOpen(e);
    });

    // Si l'utilisateur est connecté, récupérer ses inscriptions pour marquer
    // les événements auxquels il est déjà inscrit
    let userRegistrations = new Set();
    if (req.session && req.session.userId) {
      const regs = await EventRegistration.findByUser(req.session.userId);
      regs.forEach(r => userRegistrations.add(r.event_id));
    }

    events.forEach(e => {
      e.isRegistered = userRegistrations.has(e.id);
    });

    await Promise.all(events.map(async (event) => {
      event.rankingTop = await EventRanking.findByEvent(event.id, 10);
    }));

    res.render('events/index', {
      title:     'Événements',
      pageClass: 'page-events',
      events,
    });
  } catch (err) {
    logger.error('[EVENTS] Erreur chargement liste événements :', err);
    req.flash('error', 'Erreur lors du chargement des événements.');
    return res.redirect('/');
  }
});

// ─── POST /events/:id/register ─────────────────────────────────────────────
// Inscription à un événement (utilisateur connecté uniquement)

router.post('/:id/register', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  if (isNaN(eventId)) {
    req.flash('error', 'Identifiant d\'événement invalide.');
    return res.redirect('/events');
  }

  try {
    const event = await Event.findById(eventId);
    if (!event || !['planifie', 'en_cours'].includes(event.statut)) {
      req.flash('error', 'Événement introuvable ou terminé.');
      return res.redirect('/events');
    }

    if (!EventRegistration.isRegistrationOpen(event)) {
      req.flash('error', 'Les inscriptions sont fermées pour cet événement.');
      return res.redirect('/events');
    }

    const alreadyRegistered = await EventRegistration.isRegistered(eventId, req.session.userId);
    if (alreadyRegistered) {
      req.flash('info', 'Vous êtes déjà inscrit à cet événement.');
      return res.redirect('/events');
    }

    await EventRegistration.create(eventId, req.session.userId);
    logger.info(`[EVENTS] Inscription : user #${req.session.userId} → event #${eventId}`);
    req.flash('success', `Inscription confirmée pour « ${event.nom} » !`);
    return res.redirect('/events');
  } catch (err) {
    logger.error(`[EVENTS] Erreur inscription event #${eventId} :`, err);
    req.flash('error', 'Erreur lors de l\'inscription. Veuillez réessayer.');
    return res.redirect('/events');
  }
});

// ─── POST /events/:id/unregister ───────────────────────────────────────────
// Désinscription d'un événement (utilisateur connecté uniquement)

router.post('/:id/unregister', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  if (isNaN(eventId)) {
    req.flash('error', 'Identifiant d\'événement invalide.');
    return res.redirect('/events');
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/events');
    }

    // Bloquer la désinscription si l'événement a déjà commencé
    if (event.statut === 'en_cours' || new Date(event.date_heure) <= new Date()) {
      req.flash('error', 'Impossible de se désinscrire d\'un événement en cours ou passé.');
      return res.redirect('/events');
    }

    const deleted = await EventRegistration.delete(eventId, req.session.userId);
    if (deleted) {
      logger.info(`[EVENTS] Désinscription : user #${req.session.userId} → event #${eventId}`);
      req.flash('success', `Désinscription de « ${event.nom} » confirmée.`);
    } else {
      req.flash('info', 'Vous n\'étiez pas inscrit à cet événement.');
    }
    return res.redirect('/events');
  } catch (err) {
    logger.error(`[EVENTS] Erreur désinscription event #${eventId} :`, err);
    req.flash('error', 'Erreur lors de la désinscription. Veuillez réessayer.');
    return res.redirect('/events');
  }
});

module.exports = router;
