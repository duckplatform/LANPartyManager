'use strict';

/**
 * Routes du panneau d'administration
 * Accessible uniquement aux utilisateurs avec is_admin = true
 */

const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const logger  = require('../config/logger');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Toutes les routes admin nécessitent auth + admin
router.use(requireAuth, requireAdmin);

// ─── GET /admin ────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const [users, totalUsers] = await Promise.all([
      User.findAll(),
      User.count(),
    ]);
    res.render('admin/dashboard', {
      title:      'Administration',
      pageClass:  'page-admin',
      csrfToken:  req.csrfToken(),
      users,
      totalUsers,
      stats: {
        admins: users.filter(u => u.is_admin).length,
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

module.exports = router;
