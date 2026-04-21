'use strict';

/**
 * Routes publiques des annonces (Blog/News)
 * GET /news        → liste des annonces publiées
 * GET /news/:id    → détail d'une annonce
 */

const express      = require('express');
const router       = express.Router();
const Announcement = require('../models/Announcement');
const { renderMarkdown } = require('../config/markdown');
const logger       = require('../config/logger');

// ─── GET /news ─────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const announcements = await Announcement.findAll({ onlyPublished: true });
    res.render('news/index', {
      title:         'Actualités',
      pageClass:     'page-news',
      announcements,
    });
  } catch (err) {
    logger.error('[NEWS] Erreur chargement liste annonces :', err);
    return res.status(500).render('errors/500', {
      title:     'Erreur serveur',
      pageClass: 'page-error',
      message:   'Une erreur interne est survenue.',
    });
  }
});

// ─── GET /news/:id ─────────────────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!id || id < 1) {
    return res.status(404).render('errors/404', {
      title:     'Page introuvable',
      pageClass: 'page-error',
    });
  }

  try {
    const announcement = await Announcement.findById(id);

    // Annonce inexistante ou brouillon non accessible au public
    if (!announcement || announcement.statut !== 'publie') {
      return res.status(404).render('errors/404', {
        title:     'Page introuvable',
        pageClass: 'page-error',
      });
    }

    // Rendu Markdown sécurisé
    announcement.contenuHtml = renderMarkdown(announcement.contenu);

    res.render('news/show', {
      title:        announcement.titre,
      pageClass:    'page-news',
      announcement,
    });
  } catch (err) {
    logger.error(`[NEWS] Erreur chargement annonce #${id} :`, err);
    return res.status(500).render('errors/500', {
      title:     'Erreur serveur',
      pageClass: 'page-error',
      message:   'Une erreur interne est survenue.',
    });
  }
});

module.exports = router;
