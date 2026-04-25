'use strict';

/**
 * Route principale : Page d'accueil
 */

const express      = require('express');
const router       = express.Router();
const Announcement      = require('../models/Announcement');
const Event             = require('../models/Event');
const EventRanking      = require('../models/EventRanking');
const EventRegistration = require('../models/EventRegistration');
const { renderMarkdown } = require('../config/markdown');
const logger       = require('../config/logger');

// GET /
router.get('/', async (req, res) => {
  try {
    const [latestAnnouncements, activeEvent] = await Promise.all([
      Announcement.findLatestPublished(3),
      Event.findActive(),
    ]);

    // Pré-rendu Markdown pour l'extrait affiché sur la home
    latestAnnouncements.forEach(a => {
      a.contenuHtml = renderMarkdown(a.contenu);
    });

    // Données supplémentaires pour l'événement mis en avant
    let isRegistered      = false;
    let registrationOpen  = false;
    let registrationCount = 0;
    let eventIsLive       = false;
    let eventRanking      = [];
    let registrationDeadlineISO = null;

    if (activeEvent) {
      registrationOpen  = EventRegistration.isRegistrationOpen(activeEvent);
      registrationCount = await EventRegistration.countByEvent(activeEvent.id);
      eventRanking = await EventRanking.findByEvent(activeEvent.id, 10);
      // Considéré "en cours" si le statut est 'en_cours' ou si la date est atteinte
      eventIsLive       = activeEvent.statut === 'en_cours' || new Date(activeEvent.date_heure) <= new Date();
      // Deadline = début de l'événement (les inscriptions ferment à l'heure de début)
      registrationDeadlineISO = new Date(activeEvent.date_heure).toISOString();

      if (req.session && req.session.userId) {
        isRegistered = await EventRegistration.isRegistered(activeEvent.id, req.session.userId);
      }
    }

    res.render('index', {
      title:               'Accueil',
      pageClass:           'page-home',
      latestAnnouncements,
      activeEvent,
      isRegistered,
      registrationOpen,
      registrationCount,
      eventIsLive,
      eventRanking,
      registrationDeadlineISO,
    });
  } catch (err) {
    logger.error('[HOME] Erreur chargement page d\'accueil :', err);
    // En cas d'erreur, on affiche quand même la page d'accueil sans données dynamiques
    res.render('index', {
      title:               'Accueil',
      pageClass:           'page-home',
      latestAnnouncements: [],
      activeEvent:         null,
      isRegistered:        false,
      registrationOpen:    false,
      registrationCount:   0,
      eventIsLive:         false,
      eventRanking:        [],
      registrationDeadlineISO: null,
    });
  }
});

module.exports = router;
