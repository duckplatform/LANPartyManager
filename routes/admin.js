'use strict';

/**
 * Routes du panneau d'administration
 * Accessible uniquement aux utilisateurs avec is_admin = true
 */

const express      = require('express');
const router       = express.Router();
const { body, validationResult } = require('express-validator');
const User         = require('../models/User');
const Announcement = require('../models/Announcement');
const { renderMarkdown } = require('../config/markdown');
const logger       = require('../config/logger');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Toutes les routes admin nécessitent auth + admin
router.use(requireAuth, requireAdmin);

// ─── GET /admin ────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const [users, totalUsers, totalAnnouncements] = await Promise.all([
      User.findAll(),
      User.count(),
      Announcement.count(),
    ]);
    res.render('admin/dashboard', {
      title:               'Administration',
      pageClass:           'page-admin',
      users,
      totalUsers,
      totalAnnouncements,
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

module.exports = router;

