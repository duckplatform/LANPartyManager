'use strict';

/**
 * Routes de gestion des rencontres (battles)
 * Accessible aux administrateurs ET aux modérateurs
 *
 * GET  /battles                         → liste des événements disponibles
 * GET  /battles/events/:id              → file d'attente + rencontres d'un événement
 * GET  /battles/events/:id/announce     → vue récapitulative pour annonces micro
 * GET  /battles/events/:id/create       → wizard étape 1 (choix du jeu)
 * POST /battles/events/:id/create       → wizard étape 2 (identification joueurs)
 * POST /battles/events/:id/store        → enregistre la rencontre
 * POST /battles/:id/start               → passe en_attente → en_cours
 * POST /battles/:id/ready               → passe planifie → en_attente
 * POST /battles/:id/result              → enregistre le résultat et termine
 * DELETE /battles/:id                   → annule une rencontre (file_attente/planifie seulement)
 */

const express = require('express');
const router  = express.Router();
const { body, validationResult } = require('express-validator');

const Battle = require('../models/Battle');
const Game   = require('../models/Game');
const Room   = require('../models/Room');
const Event  = require('../models/Event');
const User   = require('../models/User');
const EventRegistration = require('../models/EventRegistration');
const logger = require('../config/logger');
const { requireAuth, requireModerator } = require('../middleware/auth');

// Toutes les routes battles nécessitent auth + (admin ou modérateur)
router.use(requireAuth, requireModerator);

// Expression régulière UUID v4 (badge token)
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/**
 * Valide et parse un ID entier depuis req.params
 * @param {string} value
 * @returns {number|null}
 */
function parseId(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function ensureLiveEvent(event, req, res, redirectTo = '/battles') {
  if (!event) {
    req.flash('error', 'Événement introuvable.');
    res.redirect(redirectTo);
    return false;
  }

  if (event.statut !== 'en_cours') {
    req.flash('error', 'Les rencontres ne sont disponibles que pour un événement en cours.');
    res.redirect('/battles');
    return false;
  }

  return true;
}

// ─── GET /battles ─────────────────────────────────────────────────────────────
// Liste des événements disponibles pour la gestion des rencontres

router.get('/', async (req, res) => {
  try {
    const events = await Event.findAllWithRegistrationCount();
    res.render('moderator/battles/index', {
      title:     'Gestion des rencontres',
      pageClass: 'page-moderator page-battles',
      events,
    });
  } catch (err) {
    logger.error('[BATTLES] Erreur chargement liste événements :', err);
    req.flash('error', 'Erreur lors du chargement des événements.');
    return res.redirect('/moderator');
  }
});

// ─── GET /battles/events/:id ──────────────────────────────────────────────────
// Tableau de bord des rencontres d'un événement

router.get('/events/:id', async (req, res) => {
  const eventId = parseId(req.params.id);
  if (!eventId) {
    req.flash('error', 'Événement invalide.');
    return res.redirect('/battles');
  }

  try {
    const event = await Event.findById(eventId);
    if (!ensureLiveEvent(event, req, res)) {
      return;
    }

    await Battle.reevaluateQueue(eventId);

    const [battles, rooms, stats] = await Promise.all([
      Battle.findByEvent(eventId),
      Room.findByEvent(eventId),
      Battle.countByStatut(eventId),
    ]);

    res.render('moderator/battles/dashboard', {
      title:     `Rencontres — ${event.nom}`,
      pageClass: 'page-moderator page-battles',
      event,
      battles,
      rooms,
      stats,
    });
  } catch (err) {
    logger.error(`[BATTLES] Erreur chargement rencontres événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors du chargement des rencontres.');
    return res.redirect('/battles');
  }
});

// ─── GET /battles/events/:id/announce ─────────────────────────────────────────
// Vue dynamique pour projection écran géant

router.get('/events/:id/announce', async (req, res) => {
  const eventId = parseId(req.params.id);
  if (!eventId) {
    req.flash('error', 'Événement invalide.');
    return res.redirect('/battles');
  }

  try {
    const event = await Event.findById(eventId);
    if (!ensureLiveEvent(event, req, res)) {
      return;
    }

    await Battle.reevaluateQueue(eventId);

    const [battles, rooms, stats] = await Promise.all([
      Battle.findByEvent(eventId),
      Room.findByEvent(eventId),
      Battle.countByStatut(eventId),
    ]);

    const activeStatuts = ['planifie', 'en_attente', 'en_cours'];
    const globalQueue = battles
      .filter(b => b.statut === 'file_attente')
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const roomBoards = rooms.map((room) => {
      const roomBattles = battles.filter(
        b => b.room_id === room.id && activeStatuts.includes(b.statut)
      );

      const currentBattle = roomBattles.find(b => b.statut === 'en_cours') || null;
      const readyBattle = roomBattles.find(b => b.statut === 'en_attente') || null;
      const waitingBattle = roomBattles.find(b => b.statut === 'planifie') || null;

      let roomState = { key: 'libre', label: 'Libre', color: 'var(--color-success)' };
      if (!room.actif) {
        roomState = { key: 'inactive', label: 'Inactive', color: 'var(--color-danger)' };
      } else if (currentBattle) {
        roomState = { key: 'en_jeu', label: 'En jeu', color: 'var(--color-success)' };
      } else if (readyBattle) {
        roomState = { key: 'installation', label: 'Installation', color: 'var(--color-neon)' };
      } else if (waitingBattle) {
        roomState = { key: 'planifiee', label: 'Planifiee', color: 'var(--color-warning)' };
      }

      return {
        ...room,
        state: roomState,
        currentBattle,
        // Une "partie suivante" en salle doit deja avoir une salle attribuee.
        nextBattle: readyBattle || waitingBattle || null,
      };
    });

    const recentResults = battles
      .filter(b => b.statut === 'termine')
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 12);

    res.render('moderator/battles/announce', {
      title:     `Ecran geant — ${event.nom}`,
      pageClass: 'page-moderator page-battles page-announce',
      event,
      stats: stats || { en_cours: 0, en_attente: 0, planifie: 0, file_attente: 0, termine: 0 },
      roomBoards: Array.isArray(roomBoards) ? roomBoards : [],
      globalQueue: Array.isArray(globalQueue) ? globalQueue : [],
      recentResults: Array.isArray(recentResults) ? recentResults : [],
      now: new Date(),
    });
  } catch (err) {
    logger.error(`[BATTLES] Erreur chargement annonces événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors du chargement des annonces.');
    return res.redirect(`/battles/events/${eventId}`);
  }
});

// ─── GET /battles/events/:id/create ──────────────────────────────────────────
// Wizard étape 1 : choix du jeu

router.get('/events/:id/create', async (req, res) => {
  const eventId = parseId(req.params.id);
  if (!eventId) {
    req.flash('error', 'Événement invalide.');
    return res.redirect('/battles');
  }

  try {
    const [event, games] = await Promise.all([
      Event.findById(eventId),
      Game.findAll(),
    ]);

    if (!ensureLiveEvent(event, req, res)) {
      return;
    }

    res.render('moderator/battles/create-step1', {
      title:     `Nouvelle rencontre — ${event.nom}`,
      pageClass: 'page-moderator page-battles',
      event,
      games,
      errors:    req.flash('validation') || [],
      old:       {},
    });
  } catch (err) {
    logger.error(`[BATTLES] Erreur wizard étape 1 événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors du chargement du formulaire.');
    return res.redirect(`/battles/events/${eventId}`);
  }
});

// ─── POST /battles/events/:id/create ─────────────────────────────────────────
// Wizard étape 2 : identification des joueurs (après choix du jeu)

router.post(
  '/events/:id/create',
  [body('game_id').isInt({ min: 1 }).withMessage('Jeu invalide.')],
  async (req, res) => {
    const eventId = parseId(req.params.id);
    if (!eventId) {
      req.flash('error', 'Événement invalide.');
      return res.redirect('/battles');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('validation', errors.array().map(e => e.msg));
      return res.redirect(`/battles/events/${eventId}/create`);
    }

    const gameId = parseInt(req.body.game_id, 10);

    try {
      const [event, game] = await Promise.all([
        Event.findById(eventId),
        Game.findById(gameId),
      ]);

      if (!ensureLiveEvent(event, req, res) || !game) {
        req.flash('error', 'Événement ou jeu introuvable.');
        return res.redirect(`/battles/events/${eventId}/create`);
      }

      // Nombre de joueurs selon le type de rencontre
      const nbJoueurs = game.type_rencontre === '2v2' ? 4 : 2;

      res.render('moderator/battles/create-step2', {
        title:     `Nouvelle rencontre — ${event.nom}`,
        pageClass: 'page-moderator page-battles',
        event,
        game,
        nbJoueurs,
        errors:    [],
        old:       {},
      });
    } catch (err) {
      logger.error(`[BATTLES] Erreur wizard étape 2 événement #${eventId} :`, err);
      req.flash('error', 'Erreur lors du chargement du formulaire.');
      return res.redirect(`/battles/events/${eventId}/create`);
    }
  }
);

// ─── POST /battles/events/:id/store ──────────────────────────────────────────
// Enregistre la nouvelle rencontre avec les joueurs identifiés

router.post(
  '/events/:id/store',
  [
    body('game_id').isInt({ min: 1 }).withMessage('Jeu invalide.'),
    body('notes').optional().isLength({ max: 500 }).withMessage('Notes trop longues (500 car. max).'),
  ],
  async (req, res) => {
    const eventId = parseId(req.params.id);
    if (!eventId) {
      req.flash('error', 'Événement invalide.');
      return res.redirect('/battles');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join(' '));
      return res.redirect(`/battles/events/${eventId}/create`);
    }

    const gameId = parseInt(req.body.game_id, 10);
    const notes  = (req.body.notes || '').trim() || null;

    // Accepte les payloads urlencoded avec ou sans suffixe []
    // (selon le parseur/body encoder utilisé côté client)
    const readArrayField = (body, name) => {
      const raw = body[name] ?? body[`${name}[]`];
      if (raw == null) {
        return [];
      }
      return Array.isArray(raw) ? raw : [raw];
    };

    const tokens = readArrayField(req.body, 'badge_token')
      .map(token => (token || '').trim())
      .filter(Boolean);
    const equipes = readArrayField(req.body, 'equipe')
      .map(equipe => (equipe || '').toString().trim());

    try {
      const event = await Event.findById(eventId);
      if (!ensureLiveEvent(event, req, res)) {
        return;
      }

      const game = await Game.findById(gameId);
      if (!game) {
        req.flash('error', 'Jeu introuvable.');
        return res.redirect(`/battles/events/${eventId}/create`);
      }

      const nbJoueurs = game.type_rencontre === '2v2' ? 4 : 2;

      // Validation du nombre de joueurs
      if (tokens.length !== nbJoueurs) {
        req.flash('error', `Vous devez identifier exactement ${nbJoueurs} joueur(s).`);
        return res.redirect(`/battles/events/${eventId}/create`);
      }

      // Résolution des tokens → user_id
      const players = [];
      const seenIds = new Set();

      for (let i = 0; i < tokens.length; i++) {
        const token = (tokens[i] || '').trim();
        const equipe = parseInt(equipes[i], 10) || 1;

        if (!UUID_V4_RE.test(token)) {
          req.flash('error', `Badge invalide (joueur ${i + 1}).`);
          return res.redirect(`/battles/events/${eventId}/create`);
        }

        const user = await User.findByBadgeToken(token);
        if (!user) {
          req.flash('error', `Badge inconnu pour le joueur ${i + 1}. Vérifiez le QR code.`);
          return res.redirect(`/battles/events/${eventId}/create`);
        }

        const isRegistered = await EventRegistration.isRegistered(eventId, user.id);
        if (!isRegistered) {
          req.flash('error', `Le joueur ${user.pseudo} n'est pas inscrit a cet evenement.`);
          return res.redirect(`/battles/events/${eventId}/create`);
        }

        if (seenIds.has(user.id)) {
          req.flash('error', `Le joueur ${user.pseudo} est déjà dans cette rencontre.`);
          return res.redirect(`/battles/events/${eventId}/create`);
        }

        seenIds.add(user.id);
        players.push({ user_id: user.id, equipe });
      }

      // Crée la rencontre (et tente d'assigner une salle automatiquement)
      const battleId = await Battle.create({ event_id: eventId, game_id: gameId, notes }, players);

      logger.info(
        `[BATTLES] Nouvelle rencontre #${battleId} créée par #${req.session.userId} — jeu: ${game.nom} — joueurs: ${players.map(p => p.user_id).join(',')}`
      );

      req.flash('success', 'Rencontre créée avec succès ! La salle sera attribuée automatiquement.');
      return res.redirect(`/battles/events/${eventId}`);

    } catch (err) {
      logger.error(`[BATTLES] Erreur création rencontre événement #${eventId} :`, err);
      req.flash('error', 'Erreur lors de la création de la rencontre.');
      return res.redirect(`/battles/events/${eventId}`);
    }
  }
);

// ─── POST /battles/:id/ready ──────────────────────────────────────────────────
// Passe une rencontre de 'planifie' à 'en_attente' (joueurs qui s'installent)

router.post('/:id/ready', async (req, res) => {
  const battleId = parseId(req.params.id);
  if (!battleId) {
    req.flash('error', 'Rencontre invalide.');
    return res.redirect('/battles');
  }

  try {
    const battle = await Battle.findById(battleId);
    if (!battle) {
      req.flash('error', 'Rencontre introuvable.');
      return res.redirect('/battles');
    }

    const event = await Event.findById(battle.event_id);
    if (!ensureLiveEvent(event, req, res)) {
      return;
    }

    if (battle.statut !== 'planifie') {
      req.flash('error', 'Cette rencontre ne peut pas passer en phase d\'installation.');
      return res.redirect(`/battles/events/${battle.event_id}`);
    }

    await Battle.changeStatut(battleId, 'en_attente', battle.event_id);

    logger.info(`[BATTLES] Rencontre #${battleId} → en_attente par #${req.session.userId}`);
    req.flash('success', 'Rencontre en cours d\'installation.');
    return res.redirect(`/battles/events/${battle.event_id}`);

  } catch (err) {
    logger.error(`[BATTLES] Erreur passage en_attente rencontre #${battleId} :`, err);
    req.flash('error', 'Erreur lors du changement de statut.');
    return res.redirect('/battles');
  }
});

// ─── POST /battles/:id/start ──────────────────────────────────────────────────
// Lance officiellement la rencontre (en_attente → en_cours)

router.post('/:id/start', async (req, res) => {
  const battleId = parseId(req.params.id);
  if (!battleId) {
    req.flash('error', 'Rencontre invalide.');
    return res.redirect('/battles');
  }

  try {
    const battle = await Battle.findById(battleId);
    if (!battle) {
      req.flash('error', 'Rencontre introuvable.');
      return res.redirect('/battles');
    }

    const event = await Event.findById(battle.event_id);
    if (!ensureLiveEvent(event, req, res)) {
      return;
    }

    if (battle.statut !== 'en_attente') {
      req.flash('error', 'Cette rencontre ne peut pas être lancée (statut incorrect).');
      return res.redirect(`/battles/events/${battle.event_id}`);
    }

    await Battle.changeStatut(battleId, 'en_cours', battle.event_id);

    logger.info(`[BATTLES] Rencontre #${battleId} → en_cours par #${req.session.userId}`);
    req.flash('success', 'Rencontre lancée !');
    return res.redirect(`/battles/events/${battle.event_id}`);

  } catch (err) {
    logger.error(`[BATTLES] Erreur lancement rencontre #${battleId} :`, err);
    req.flash('error', 'Erreur lors du lancement de la rencontre.');
    return res.redirect('/battles');
  }
});

// ─── POST /battles/:id/result ─────────────────────────────────────────────────
// Enregistre le résultat et termine la rencontre

router.post(
  '/:id/result',
  [
    body('score').optional({ checkFalsy: true }).isLength({ max: 100 }).withMessage('Score trop long.'),
  ],
  async (req, res) => {
    const battleId = parseId(req.params.id);
    if (!battleId) {
      req.flash('error', 'Rencontre invalide.');
      return res.redirect('/battles');
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('error', errors.array().map(e => e.msg).join(' '));
      return res.redirect('/battles');
    }

    const score     = (req.body.score || '').trim() || null;
    const winnerIds = Array.isArray(req.body['winner_ids[]'])
      ? req.body['winner_ids[]'].map(Number).filter(n => n > 0)
      : req.body['winner_ids[]']
        ? [parseInt(req.body['winner_ids[]'], 10)].filter(n => n > 0)
        : [];

    try {
      const battle = await Battle.findById(battleId);
      if (!battle) {
        req.flash('error', 'Rencontre introuvable.');
        return res.redirect('/battles');
      }

      const event = await Event.findById(battle.event_id);
      if (!ensureLiveEvent(event, req, res)) {
        return;
      }

      if (!['en_attente', 'en_cours'].includes(battle.statut)) {
        req.flash('error', 'Cette rencontre ne peut pas être terminée (statut incorrect).');
        return res.redirect(`/battles/events/${battle.event_id}`);
      }

      await Battle.setResult(battleId, score, winnerIds, battle.event_id);

      logger.info(
        `[BATTLES] Rencontre #${battleId} terminée par #${req.session.userId} — score: ${score} — gagnants: ${winnerIds.join(',')}`
      );
      req.flash('success', 'Résultat enregistré. La file d\'attente a été mise à jour.');
      return res.redirect(`/battles/events/${battle.event_id}`);

    } catch (err) {
      logger.error(`[BATTLES] Erreur enregistrement résultat rencontre #${battleId} :`, err);
      req.flash('error', 'Erreur lors de l\'enregistrement du résultat.');
      return res.redirect('/battles');
    }
  }
);

// ─── DELETE /battles/:id ──────────────────────────────────────────────────────
// Annule une rencontre (uniquement file_attente ou planifie)

router.delete('/:id', async (req, res) => {
  const battleId = parseId(req.params.id);
  if (!battleId) {
    req.flash('error', 'Rencontre invalide.');
    return res.redirect('/battles');
  }

  try {
    const battle = await Battle.findById(battleId);
    if (!battle) {
      req.flash('error', 'Rencontre introuvable.');
      return res.redirect('/battles');
    }

    const event = await Event.findById(battle.event_id);
    if (!ensureLiveEvent(event, req, res)) {
      return;
    }

    const eventId = battle.event_id;
    const deleted = await Battle.delete(battleId);

    if (!deleted) {
      req.flash('error', 'Impossible d\'annuler une rencontre en cours ou terminée.');
      return res.redirect(`/battles/events/${eventId}`);
    }

    // Réévalue la file après suppression
    await Battle.reevaluateQueue(eventId);

    logger.info(`[BATTLES] Rencontre #${battleId} annulée par #${req.session.userId}`);
    req.flash('success', 'Rencontre annulée.');
    return res.redirect(`/battles/events/${eventId}`);

  } catch (err) {
    logger.error(`[BATTLES] Erreur annulation rencontre #${battleId} :`, err);
    req.flash('error', 'Erreur lors de l\'annulation.');
    return res.redirect('/battles');
  }
});

module.exports = router;
