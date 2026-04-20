/**
 * Routes du panneau d'administration
 */
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAuthenticated, isAdmin, isModerator } = require('../middleware/auth');
const User = require('../models/User');
const News = require('../models/News');
const Event = require('../models/Event');
const logger = require('../config/logger');

// Toutes les routes admin nécessitent une authentification modérateur minimum
router.use(isAuthenticated, isModerator);

// GET /admin → /admin/dashboard
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// GET /admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [userCount, newsCount, eventCount] = await Promise.all([
      User.count(),
      News.count(),
      Event.count()
    ]);
    res.render('admin/dashboard', {
      title: 'Tableau de bord',
      stats: { userCount, newsCount, eventCount }
    });
  } catch (err) {
    logger.error('Erreur dashboard:', err);
    res.render('admin/dashboard', { title: 'Tableau de bord', stats: { userCount: 0, newsCount: 0, eventCount: 0 } });
  }
});

// ─── NEWS CRUD ────────────────────────────────────────────────────────────────

router.get('/news', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const news = await News.findAll({ page, limit: 20, published_only: false });
    const total = await News.count(false);
    res.render('admin/news/list', {
      title: 'Gestion des actualités',
      news,
      currentPage: page,
      totalPages: Math.ceil(total / 20)
    });
  } catch (err) {
    logger.error('Erreur admin news list:', err);
    req.flash('error', 'Erreur lors du chargement des actualités.');
    res.redirect('/admin/dashboard');
  }
});

router.get('/news/create', (req, res) => {
  res.render('admin/news/create', { title: 'Créer une actualité', errors: [] });
});

router.post('/news/create', [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Titre: 3 à 255 caractères'),
  body('content').trim().notEmpty().withMessage('Contenu requis'),
  body('excerpt').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/news/create', { title: 'Créer une actualité', errors: errors.array() });
  }

  try {
    const { title, content, excerpt, is_published } = req.body;
    await News.create({
      title,
      content,
      excerpt: excerpt || null,
      author_id: req.session.user.id,
      is_published: is_published === '1'
    });
    req.flash('success', 'Actualité créée avec succès.');
    res.redirect('/admin/news');
  } catch (err) {
    logger.error('Erreur création news:', err);
    res.render('admin/news/create', {
      title: 'Créer une actualité',
      errors: [{ msg: 'Erreur lors de la création.' }]
    });
  }
});

router.get('/news/:id/edit', async (req, res) => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) {
      req.flash('error', 'Actualité introuvable.');
      return res.redirect('/admin/news');
    }
    res.render('admin/news/edit', { title: "Modifier l'actualité", article, errors: [] });
  } catch (err) {
    logger.error('Erreur chargement news edit:', err);
    req.flash('error', 'Erreur.');
    res.redirect('/admin/news');
  }
});

router.post('/news/:id/edit', [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Titre: 3 à 255 caractères'),
  body('content').trim().notEmpty().withMessage('Contenu requis'),
  body('excerpt').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const article = await News.findById(req.params.id);
    return res.render('admin/news/edit', { title: "Modifier l'actualité", article, errors: errors.array() });
  }

  try {
    const { title, content, excerpt, is_published } = req.body;
    await News.update(req.params.id, {
      title, content,
      excerpt: excerpt || null,
      is_published: is_published === '1'
    });
    req.flash('success', 'Actualité mise à jour.');
    res.redirect('/admin/news');
  } catch (err) {
    logger.error('Erreur mise à jour news:', err);
    req.flash('error', 'Erreur lors de la mise à jour.');
    res.redirect('/admin/news');
  }
});

router.post('/news/:id/delete', isAdmin, async (req, res) => {
  try {
    await News.delete(req.params.id);
    req.flash('success', 'Actualité supprimée.');
  } catch (err) {
    logger.error('Erreur suppression news:', err);
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/admin/news');
});

// ─── EVENTS CRUD ──────────────────────────────────────────────────────────────

router.get('/events', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const events = await Event.findAll({ page, limit: 20, published_only: false });
    const total = await Event.count();
    res.render('admin/events/list', {
      title: 'Gestion des événements',
      events,
      currentPage: page,
      totalPages: Math.ceil(total / 20)
    });
  } catch (err) {
    logger.error('Erreur admin events list:', err);
    req.flash('error', 'Erreur lors du chargement des événements.');
    res.redirect('/admin/dashboard');
  }
});

router.get('/events/create', (req, res) => {
  res.render('admin/events/create', { title: 'Créer un événement', errors: [] });
});

router.post('/events/create', [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Titre: 3 à 255 caractères'),
  body('description').optional().trim(),
  body('location').optional().trim().isLength({ max: 255 }),
  body('start_date').optional({ checkFalsy: true }).isISO8601().withMessage('Date de début invalide'),
  body('end_date').optional({ checkFalsy: true }).isISO8601().withMessage('Date de fin invalide'),
  body('max_participants').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Nombre de participants invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('admin/events/create', { title: 'Créer un événement', errors: errors.array() });
  }

  try {
    const { title, description, location, start_date, end_date, max_participants, is_active, is_published } = req.body;
    await Event.create({
      title, description, location,
      start_date: start_date || null,
      end_date: end_date || null,
      max_participants: parseInt(max_participants) || 0,
      is_active: is_active === '1',
      is_published: is_published === '1'
    });
    req.flash('success', 'Événement créé avec succès.');
    res.redirect('/admin/events');
  } catch (err) {
    logger.error('Erreur création événement:', err);
    res.render('admin/events/create', {
      title: 'Créer un événement',
      errors: [{ msg: 'Erreur lors de la création.' }]
    });
  }
});

router.get('/events/:id/edit', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/admin/events');
    }
    res.render('admin/events/edit', { title: "Modifier l'événement", event, errors: [] });
  } catch (err) {
    logger.error('Erreur chargement event edit:', err);
    req.flash('error', 'Erreur.');
    res.redirect('/admin/events');
  }
});

router.post('/events/:id/edit', [
  body('title').trim().isLength({ min: 3, max: 255 }).withMessage('Titre: 3 à 255 caractères'),
  body('start_date').optional({ checkFalsy: true }).isISO8601().withMessage('Date de début invalide'),
  body('end_date').optional({ checkFalsy: true }).isISO8601().withMessage('Date de fin invalide'),
  body('max_participants').optional({ checkFalsy: true }).isInt({ min: 0 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const event = await Event.findById(req.params.id);
    return res.render('admin/events/edit', { title: "Modifier l'événement", event, errors: errors.array() });
  }

  try {
    const { title, description, location, start_date, end_date, max_participants, is_active, is_published } = req.body;
    await Event.update(req.params.id, {
      title, description, location,
      start_date: start_date || null,
      end_date: end_date || null,
      max_participants: parseInt(max_participants) || 0,
      is_active: is_active === '1',
      is_published: is_published === '1'
    });
    req.flash('success', 'Événement mis à jour.');
    res.redirect('/admin/events');
  } catch (err) {
    logger.error('Erreur mise à jour événement:', err);
    req.flash('error', 'Erreur lors de la mise à jour.');
    res.redirect('/admin/events');
  }
});

router.post('/events/:id/delete', isAdmin, async (req, res) => {
  try {
    await Event.delete(req.params.id);
    req.flash('success', 'Événement supprimé.');
  } catch (err) {
    logger.error('Erreur suppression événement:', err);
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/admin/events');
});

// ─── USERS MANAGEMENT (admin only) ───────────────────────────────────────────

router.get('/users', isAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const users = await User.findAll({ page, limit: 20, search });
    const total = await User.count();
    res.render('admin/users/list', {
      title: 'Gestion des utilisateurs',
      users, search,
      currentPage: page,
      totalPages: Math.ceil(total / 20)
    });
  } catch (err) {
    logger.error('Erreur admin users list:', err);
    req.flash('error', 'Erreur lors du chargement des utilisateurs.');
    res.redirect('/admin/dashboard');
  }
});

router.get('/users/:id/edit', isAdmin, async (req, res) => {
  try {
    const editUser = await User.findById(req.params.id);
    if (!editUser) {
      req.flash('error', 'Utilisateur introuvable.');
      return res.redirect('/admin/users');
    }
    res.render('admin/users/edit', { title: "Modifier l'utilisateur", editUser, errors: [] });
  } catch (err) {
    logger.error('Erreur chargement user edit:', err);
    req.flash('error', 'Erreur.');
    res.redirect('/admin/users');
  }
});

router.post('/users/:id/edit', isAdmin, [
  body('role').isIn(['admin', 'moderator', 'user']).withMessage('Rôle invalide'),
  body('is_active').isIn(['0', '1']).withMessage('Statut invalide')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const editUser = await User.findById(req.params.id);
    return res.render('admin/users/edit', { title: "Modifier l'utilisateur", editUser, errors: errors.array() });
  }

  // Empêcher l'admin de se rétrograder lui-même
  if (parseInt(req.params.id) === req.session.user.id && req.body.role !== 'admin') {
    req.flash('error', 'Vous ne pouvez pas modifier votre propre rôle.');
    return res.redirect('/admin/users');
  }

  try {
    await User.update(req.params.id, {
      role: req.body.role,
      is_active: req.body.is_active === '1' ? 1 : 0
    });
    req.flash('success', 'Utilisateur mis à jour.');
    res.redirect('/admin/users');
  } catch (err) {
    logger.error('Erreur mise à jour utilisateur:', err);
    req.flash('error', 'Erreur lors de la mise à jour.');
    res.redirect('/admin/users');
  }
});

router.post('/users/:id/delete', isAdmin, async (req, res) => {
  if (parseInt(req.params.id) === req.session.user.id) {
    req.flash('error', 'Vous ne pouvez pas supprimer votre propre compte.');
    return res.redirect('/admin/users');
  }
  try {
    await User.delete(req.params.id);
    req.flash('success', 'Utilisateur supprimé.');
  } catch (err) {
    logger.error('Erreur suppression utilisateur:', err);
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/admin/users');
});

module.exports = router;
