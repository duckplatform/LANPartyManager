'use strict';

/**
 * Routes du panneau modérateur
 * Accessible aux administrateurs ET aux modérateurs
 * Permet la vérification des billets électroniques à l'entrée des événements
 */

const express           = require('express');
const router            = express.Router();
const Event             = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const User              = require('../models/User');
const logger            = require('../config/logger');
const { requireAuth, requireModerator } = require('../middleware/auth');

// Expression régulière de validation UUID v4 (même format que Node.js crypto.randomUUID)
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sanitizeReturnTo(value) {
  const v = String(value || '').trim();
  // Autorise uniquement le retour vers une page de scan modérateur
  return /^\/moderator\/events\/\d+\/scan$/.test(v) ? v : null;
}

// Toutes les routes modérateur nécessitent auth + (admin ou modérateur)
router.use(requireAuth, requireModerator);

// ─── GET /moderator ────────────────────────────────────────────────────────
// Tableau de bord modérateur : liste des événements à contrôler

router.get('/', async (req, res) => {
  try {
    const events = await Event.findAllWithRegistrationCount();
    res.render('moderator/index', {
      title:     'Contrôle des billets',
      pageClass: 'page-moderator',
      events,
    });
  } catch (err) {
    logger.error('[MODERATOR] Erreur chargement liste événements :', err);
    req.flash('error', 'Erreur lors du chargement des événements.');
    return res.redirect('/');
  }
});

// ─── GET /moderator/events/:id/scan ───────────────────────────────────────
// Page de contrôle des billets pour un événement spécifique

router.get('/events/:id/scan', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/moderator');
    }

    const registrations = await EventRegistration.findByEvent(eventId);

    res.render('moderator/scan', {
      title:        `Contrôle — ${event.nom}`,
      pageClass:    'page-moderator',
      event,
      registrations,
    });
  } catch (err) {
    logger.error(`[MODERATOR] Erreur chargement scan événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors du chargement de la page de contrôle.');
    return res.redirect('/moderator');
  }
});

// ─── GET /moderator/verify/:token ─────────────────────────────────────────
// Affiche les détails d'un membre via son badge_token et vérifie
// son inscription à l'événement passé en query string (?eventId=X)

router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  const returnTo  = sanitizeReturnTo(req.query.returnTo);
  const eventId   = parseInt(req.query.eventId, 10) || null;

  // Valide le format UUID v4
  if (!UUID_V4_RE.test(token)) {
    return res.status(400).render('moderator/verify', {
      title:        'Vérification de badge',
      pageClass:    'page-moderator',
      member:       null,
      event:        null,
      isRegistered: false,
      token,
      error:        'Badge invalide (format incorrect).',
      returnTo:     returnTo || '/moderator',
    });
  }

  try {
    const [member, event] = await Promise.all([
      User.findByBadgeToken(token),
      eventId ? Event.findById(eventId) : Promise.resolve(null),
    ]);

    let isRegistered = false;
    if (member && event) {
      isRegistered = await EventRegistration.isRegistered(event.id, member.id);
    }

    logger.info(
      `[MODERATOR] Vérification badge token=${token} par #${req.session.userId} — membre=${member ? member.pseudo : 'INCONNU'} inscrit=${isRegistered}`
    );

    res.render('moderator/verify', {
      title:        'Vérification de badge',
      pageClass:    'page-moderator',
      member,
      event,
      isRegistered,
      token,
      error:        null,
      returnTo:     returnTo || '/moderator',
    });
  } catch (err) {
    logger.error(`[MODERATOR] Erreur vérification badge token=${token} :`, err);
    res.status(500).render('moderator/verify', {
      title:        'Vérification de badge',
      pageClass:    'page-moderator',
      member:       null,
      event:        null,
      isRegistered: false,
      token,
      error:        'Erreur lors de la vérification du badge.',
      returnTo:     returnTo || '/moderator',
    });
  }
});

// ─── POST /moderator/verify ────────────────────────────────────────────────
// Vérifie un badge via saisie manuelle ou scanner caméra (AJAX).

router.post('/verify', async (req, res) => {
  const isAjax   = req.headers['x-requested-with'] === 'XMLHttpRequest';
  const token    = (req.body.token || '').trim();
  const returnTo = sanitizeReturnTo(req.body.returnTo);
  const eventId  = parseInt(req.body.eventId, 10) || null;

  // -- Validation format ---------------------------------------------------
  if (!token) {
    if (isAjax) return res.status(400).json({ valid: false, error: 'Token manquant.' });
    req.flash('error', 'Veuillez saisir un token de badge.');
    return res.redirect(returnTo || '/moderator');
  }

  if (!UUID_V4_RE.test(token)) {
    if (isAjax) return res.status(400).json({ valid: false, error: 'Format de badge invalide.' });
    const qs = new URLSearchParams();
    if (returnTo) qs.set('returnTo', returnTo);
    if (eventId)  qs.set('eventId',  eventId);
    return res.redirect(`/moderator/verify/${encodeURIComponent(token)}?${qs.toString()}`);
  }

  // -- Formulaire classique : redirection vers la page de détail -----------
  if (!isAjax) {
    const qs = new URLSearchParams();
    if (returnTo) qs.set('returnTo', returnTo);
    if (eventId)  qs.set('eventId',  eventId);
    return res.redirect(`/moderator/verify/${encodeURIComponent(token)}?${qs.toString()}`);
  }

  // -- Requête AJAX depuis le scanner caméra --------------------------------
  try {
    const [member, event] = await Promise.all([
      User.findByBadgeToken(token),
      eventId ? Event.findById(eventId) : Promise.resolve(null),
    ]);

    if (!member) {
      return res.json({ valid: false, error: 'Badge inconnu. Ce membre n\'existe pas.' });
    }

    let isRegistered = false;
    if (event) {
      isRegistered = await EventRegistration.isRegistered(event.id, member.id);
    }

    logger.info(
      `[MODERATOR] Vérification AJAX badge token=${token} par #${req.session.userId} — membre=${member.pseudo} inscrit=${isRegistered}`
    );

    return res.json({
      valid:        true,
      pseudo:       member.pseudo,
      nom:          `${member.prenom} ${member.nom}`,
      isRegistered,
      event_nom:    event ? event.nom : null,
    });
  } catch (err) {
    logger.error(`[MODERATOR] Erreur vérification AJAX badge token=${token} :`, err);
    return res.status(500).json({ valid: false, error: 'Erreur serveur lors de la vérification.' });
  }
});

module.exports = router;
