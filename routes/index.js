'use strict';

/**
 * Route principale : Page d'accueil
 */

const express      = require('express');
const router       = express.Router();
const Announcement      = require('../models/Announcement');
const Event             = require('../models/Event');
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

    // Données supplémentaires pour l'événement actif
    let isRegistered      = false;
    let registrationOpen  = false;
    let registrationCount = 0;

    if (activeEvent) {
      registrationOpen  = EventRegistration.isRegistrationOpen(activeEvent);
      registrationCount = await EventRegistration.countByEvent(activeEvent.id);

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
    });
  }
});

module.exports = router;
