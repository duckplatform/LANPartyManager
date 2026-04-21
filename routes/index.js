'use strict';

/**
 * Route principale : Page d'accueil
 */

const express      = require('express');
const router       = express.Router();
const Announcement = require('../models/Announcement');
const { renderMarkdown } = require('../config/markdown');
const logger       = require('../config/logger');

// GET /
router.get('/', async (req, res) => {
  try {
    const latestAnnouncements = await Announcement.findLatestPublished(3);

    // Pré-rendu Markdown pour l'extrait affiché sur la home
    latestAnnouncements.forEach(a => {
      a.contenuHtml = renderMarkdown(a.contenu);
    });

    res.render('index', {
      title:               'Accueil',
      pageClass:           'page-home',
      latestAnnouncements,
    });
  } catch (err) {
    logger.error('[HOME] Erreur chargement annonces :', err);
    // En cas d'erreur, on affiche quand même la page d'accueil sans annonces
    res.render('index', {
      title:               'Accueil',
      pageClass:           'page-home',
      latestAnnouncements: [],
    });
  }
});

module.exports = router;
