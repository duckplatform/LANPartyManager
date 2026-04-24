'use strict';

/**
 * Routes du panneau modérateur
 * Accessible aux administrateurs ET aux modérateurs
 * Permet la vérification des billets électroniques à l'entrée des événements
 */

const express      = require('express');
const router       = express.Router();
const Event             = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const logger       = require('../config/logger');
const { requireAuth, requireModerator } = require('../middleware/auth');

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
      title:         `Contrôle — ${event.nom}`,
      pageClass:     'page-moderator',
      event,
      registrations,
      scannedToken:  null,
      verifyResult:  null,
    });
  } catch (err) {
    logger.error(`[MODERATOR] Erreur chargement scan événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors du chargement de la page de contrôle.');
    return res.redirect('/moderator');
  }
});

// ─── GET /moderator/verify/:token ─────────────────────────────────────────
// Vérifie un billet via son token UUID (URL encodée dans le QR code)
// Accessible sans session pour permettre la vérification via scan externe,
// mais protégé par requireModerator pour afficher les détails complets.

router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;

  // Valide le format UUID (v4) pour éviter les injections
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return res.status(400).render('moderator/verify', {
      title:        'Vérification de billet',
      pageClass:    'page-moderator',
      registration: null,
      token,
      error:        'Token de billet invalide.',
    });
  }

  try {
    const registration = await EventRegistration.findByToken(token);

    logger.info(
      `[MODERATOR] Vérification billet token=${token} par #${req.session.userId} — ${registration ? 'VALIDE' : 'INVALIDE'}`
    );

    res.render('moderator/verify', {
      title:        'Vérification de billet',
      pageClass:    'page-moderator',
      registration,
      token,
      error:        null,
    });
  } catch (err) {
    logger.error(`[MODERATOR] Erreur vérification token ${token} :`, err);
    res.status(500).render('moderator/verify', {
      title:        'Vérification de billet',
      pageClass:    'page-moderator',
      registration: null,
      token,
      error:        'Erreur lors de la vérification du billet.',
    });
  }
});

// ─── POST /moderator/verify ────────────────────────────────────────────────
// Vérifie un billet via saisie manuelle du token (formulaire de la page scan)

router.post('/verify', async (req, res) => {
  const token = (req.body.token || '').trim();

  if (!token) {
    req.flash('error', 'Veuillez saisir un token de billet.');
    return res.redirect(req.get('Referrer') || '/moderator');
  }

  return res.redirect(`/moderator/verify/${encodeURIComponent(token)}`);
});

module.exports = router;
