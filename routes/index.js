/**
 * Routes publiques principales
 */
const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Event = require('../models/Event');
const { isAuthenticated } = require('../middleware/auth');
const logger = require('../config/logger');

// GET / - Page d'accueil
router.get('/', async (req, res) => {
  try {
    const [activeEvent, latestNews] = await Promise.all([
      Event.findActive(),
      News.findAll({ page: 1, limit: 6, published_only: true })
    ]);

    res.render('index', {
      title: 'Accueil',
      activeEvent,
      latestNews
    });
  } catch (err) {
    logger.error('Erreur page accueil:', err);
    res.render('index', { title: 'Accueil', activeEvent: null, latestNews: [] });
  }
});

// GET /news - Liste des actualités
router.get('/news', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const [news, total] = await Promise.all([
      News.findAll({ page, limit, published_only: true }),
      News.count(true)
    ]);

    res.render('news/list', {
      title: 'Actualités',
      news,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    logger.error('Erreur liste news:', err);
    res.render('news/list', { title: 'Actualités', news: [], currentPage: 1, totalPages: 1 });
  }
});

// GET /news/:slug - Article
router.get('/news/:slug', async (req, res) => {
  try {
    const article = await News.findBySlug(req.params.slug);
    if (!article) {
      return res.status(404).render('errors/404', { title: 'Article introuvable' });
    }
    res.render('news/show', { title: article.title, article });
  } catch (err) {
    logger.error('Erreur affichage news:', err);
    res.status(500).render('errors/500', { title: 'Erreur', error: {} });
  }
});

// GET /events - Liste des événements
router.get('/events', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const [events, total] = await Promise.all([
      Event.findAll({ page, limit, published_only: true }),
      Event.count()
    ]);

    res.render('events/list', {
      title: 'Événements',
      events,
      currentPage: page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    logger.error('Erreur liste événements:', err);
    res.render('events/list', { title: 'Événements', events: [], currentPage: 1, totalPages: 1 });
  }
});

// GET /events/:slug - Détail événement
router.get('/events/:slug', async (req, res) => {
  try {
    const event = await Event.findBySlug(req.params.slug);
    if (!event) {
      return res.status(404).render('errors/404', { title: 'Événement introuvable' });
    }

    const [registrations, isRegistered] = await Promise.all([
      Event.getRegistrations(event.id),
      req.session.user ? Event.isRegistered(event.id, req.session.user.id) : Promise.resolve(false)
    ]);

    res.render('events/show', {
      title: event.title,
      event,
      registrations,
      isRegistered
    });
  } catch (err) {
    logger.error('Erreur affichage événement:', err);
    res.status(500).render('errors/500', { title: 'Erreur', error: {} });
  }
});

// POST /events/:slug/register
router.post('/events/:slug/register', isAuthenticated, async (req, res) => {
  try {
    const event = await Event.findBySlug(req.params.slug);
    if (!event) return res.redirect('/events');

    const registrations = await Event.getRegistrations(event.id);

    if (event.max_participants > 0 && registrations.length >= event.max_participants) {
      req.flash('error', 'Cet événement est complet.');
      return res.redirect(`/events/${event.slug}`);
    }

    await Event.register(event.id, req.session.user.id);
    req.flash('success', 'Inscription confirmée !');
    res.redirect(`/events/${event.slug}`);
  } catch (err) {
    logger.error('Erreur inscription événement:', err);
    req.flash('error', "Erreur lors de l'inscription.");
    res.redirect(`/events/${req.params.slug}`);
  }
});

// POST /events/:slug/unregister
router.post('/events/:slug/unregister', isAuthenticated, async (req, res) => {
  try {
    const event = await Event.findBySlug(req.params.slug);
    if (!event) return res.redirect('/events');

    await Event.unregister(event.id, req.session.user.id);
    req.flash('success', 'Désinscription effectuée.');
    res.redirect(`/events/${event.slug}`);
  } catch (err) {
    logger.error('Erreur désinscription événement:', err);
    req.flash('error', 'Erreur lors de la désinscription.');
    res.redirect(`/events/${req.params.slug}`);
  }
});

module.exports = router;
