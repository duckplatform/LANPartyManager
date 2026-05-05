'use strict';

/**
 * Routes publiques — Catalogue des événements
 * Accessible sans authentification pour consulter les événements.
 * L'inscription à un événement nécessite d'être connecté.
 */

const express           = require('express');
const router            = express.Router();
const Event             = require('../models/Event');
const EventRanking      = require('../models/EventRanking');
const EventRegistration = require('../models/EventRegistration');
const Battle            = require('../models/Battle');
const Room              = require('../models/Room');
const discord           = require('../services/discord');
const logger            = require('../config/logger');
const { requireAuth }   = require('../middleware/auth');

const BATTLE_STATUS_META = {
  in_progress: { label: 'En cours', color: '#388E3C' },
  setup: { label: 'Installation', color: '#7B1FA2' },
  planned: { label: 'Planifié', color: '#1976D2' },
  queue: { label: 'File d\'attente', color: '#F57F17' },
  ended: { label: 'Terminé', color: '#757575' },
};

function buildStatusChart(battles) {
  const order = ['in_progress', 'setup', 'planned', 'queue', 'ended'];
  const counts = battles.reduce((acc, battle) => {
    acc[battle.status] = (acc[battle.status] || 0) + 1;
    return acc;
  }, {});

  const total = battles.length;
  const segments = order.map((status) => {
    const count = counts[status] || 0;
    return {
      status,
      label: BATTLE_STATUS_META[status].label,
      color: BATTLE_STATUS_META[status].color,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });

  let cursor = 0;
  const gradientParts = segments
    .filter(segment => segment.count > 0)
    .map((segment) => {
      const start = cursor;
      cursor += (segment.count / total) * 100;
      return `${segment.color} ${start.toFixed(2)}% ${cursor.toFixed(2)}%`;
    });

  return {
    total,
    segments,
    gradient: gradientParts.length > 0
      ? `conic-gradient(${gradientParts.join(', ')})`
      : 'conic-gradient(#E5E7EB 0 100%)',
  };
}

function buildGameChart(battles) {
  const gameMap = new Map();

  battles.forEach((battle) => {
    const key = `${battle.game_name}__${battle.game_console || ''}`;
    if (!gameMap.has(key)) {
      gameMap.set(key, {
        name: battle.game_name,
        console: battle.game_console || '',
        total: 0,
        done: 0,
        active: 0,
      });
    }

    const entry = gameMap.get(key);
    entry.total += 1;
    if (battle.status === 'ended') entry.done += 1;
    if (['in_progress', 'setup'].includes(battle.status)) entry.active += 1;
  });

  const items = Array.from(gameMap.values())
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fr'));
  const max = items.reduce((highest, item) => Math.max(highest, item.total), 0);

  return {
    max,
    items: items.map(item => ({
      ...item,
      width: max > 0 ? Math.max((item.total / max) * 100, 8) : 0,
    })),
  };
}

function buildRankingChart(rankings) {
  const items = rankings.slice(0, 5);
  const max = items.reduce((highest, item) => Math.max(highest, item.points), 0);

  return {
    max,
    items: items.map((item) => ({
      rang: item.rang,
      pseudo: item.username,
      points: item.points,
      wins: item.wins,
      battles_played: item.battles_played,
      width: max > 0 ? Math.max((item.points / max) * 100, 12) : 0,
    })),
  };
}

function buildRoomChart(rooms, battles) {
  const roomMap = new Map(rooms.map(room => [room.id, {
    id: room.id,
    name: room.name,
    type: room.type,
    matchType: room.match_type,
    isActive: room.is_active === 1,
    assigned: 0,
    active: 0,
    done: 0,
  }]));

  battles.forEach((battle) => {
    if (!battle.room_id || !roomMap.has(battle.room_id)) return;
    const room = roomMap.get(battle.room_id);
    room.assigned += 1;
    if (['planned', 'setup', 'in_progress'].includes(battle.status)) room.active += 1;
    if (battle.status === 'ended') room.done += 1;
  });

  const items = Array.from(roomMap.values())
    .sort((a, b) => b.assigned - a.assigned || a.name.localeCompare(b.name, 'fr'));
  const max = items.reduce((highest, item) => Math.max(highest, item.assigned), 0);

  return {
    max,
    total: rooms.length,
    activeNow: items.filter(item => item.active > 0).length,
    availableNow: items.filter(item => item.isActive && item.active === 0).length,
    items: items.map(item => ({
      ...item,
      width: max > 0 ? Math.max((item.assigned / max) * 100, item.assigned > 0 ? 10 : 0) : 0,
    })),
  };
}

function buildEventCharts({ battles, rankings, rooms }) {
  return {
    statuses: buildStatusChart(battles),
    games: buildGameChart(battles),
    rankings: buildRankingChart(rankings),
    rooms: buildRoomChart(rooms, battles),
  };
}

// ─── GET /events ───────────────────────────────────────────────────────────
// Liste publique de tous les événements planifiés et en cours

router.get('/', async (req, res) => {
  try {
    const events = await Event.findAllPublic();

    // Pour chaque événement, calculer si les inscriptions sont ouvertes
    events.forEach(e => {
      e.registrationOpen = EventRegistration.isRegistrationOpen(e);
    });

    // Si l'utilisateur est connecté, récupérer ses inscriptions pour marquer
    // les événements auxquels il est déjà inscrit
    let userRegistrations = new Set();
    if (req.session && req.session.userId) {
      const regs = await EventRegistration.findByUser(req.session.userId);
      regs.forEach(r => userRegistrations.add(r.event_id));
    }

    events.forEach(e => {
      e.isRegistered = userRegistrations.has(e.id);
    });

    await Promise.all(events.map(async (event) => {
      event.rankingTop = await EventRanking.findByEvent(event.id, 10);
    }));

    res.render('events/index', {
      title:     'Événements',
      pageClass: 'page-events',
      events,
    });
  } catch (err) {
    logger.error('[EVENTS] Erreur chargement liste événements :', err);
    req.flash('error', 'Erreur lors du chargement des événements.');
    return res.redirect('/');
  }
});

// ─── GET /events/:id ──────────────────────────────────────────────────────
// Page de détail d'un événement avec stats, classement et rencontres

router.get('/:id', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  if (isNaN(eventId)) {
    req.flash('error', 'Identifiant d\'événement invalide.');
    return res.redirect('/events');
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/events');
    }

    event.registrationOpen = EventRegistration.isRegistrationOpen(event);

    // Chargement parallèle des données de l'événement
    const [registrationCount, rankings, battles, rooms] = await Promise.all([
      EventRegistration.countByEvent(eventId),
      EventRanking.findByEvent(eventId),
      Battle.findByEvent(eventId),
      Room.findByEvent(eventId),
    ]);

    // Vérifier si l'utilisateur connecté est inscrit
    let isRegistered = false;
    if (req.session && req.session.userId) {
      isRegistered = await EventRegistration.isRegistered(eventId, req.session.userId);
    }

    res.render('events/show', {
      title:             event.name,
      pageClass:         'page-events',
      event,
      registrationCount,
      rankings,
      battles,
      rooms,
      chartData: buildEventCharts({ battles, rankings, rooms }),
      isRegistered,
    });
  } catch (err) {
    logger.error(`[EVENTS] Erreur chargement événement #${eventId} :`, err);
    req.flash('error', 'Erreur lors du chargement de l\'événement.');
    return res.redirect('/events');
  }
});

// ─── POST /events/:id/register ─────────────────────────────────────────────
// Inscription à un événement (utilisateur connecté uniquement)

router.post('/:id/register', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  if (isNaN(eventId)) {
    req.flash('error', 'Identifiant d\'événement invalide.');
    return res.redirect('/events');
  }

  try {
    const event = await Event.findById(eventId);
    if (!event || !['planned', 'in_progress'].includes(event.status)) {
      req.flash('error', 'Événement introuvable ou terminé.');
      return res.redirect('/events');
    }

    if (!EventRegistration.isRegistrationOpen(event)) {
      req.flash('error', 'Les inscriptions sont fermées pour cet événement.');
      return res.redirect('/events');
    }

    const alreadyRegistered = await EventRegistration.isRegistered(eventId, req.session.userId);
    if (alreadyRegistered) {
      req.flash('info', 'Vous êtes déjà inscrit à cet événement.');
      return res.redirect('/events');
    }

    await EventRegistration.create(eventId, req.session.userId);
    logger.info(`[EVENTS] Inscription : user #${req.session.userId} → event #${eventId}`);
    req.flash('success', `Inscription confirmée pour « ${event.name} » !`);

    // Notification Discord (fire-and-forget)
    discord.notifyUserRegisteredAsync(eventId, req.session.userId, event);

    return res.redirect(`/events/${eventId}`);
  } catch (err) {
    logger.error(`[EVENTS] Erreur inscription event #${eventId} :`, err);
    req.flash('error', 'Erreur lors de l\'inscription. Veuillez réessayer.');
    return res.redirect('/events');
  }
});

// ─── POST /events/:id/unregister ───────────────────────────────────────────
// Désinscription d'un événement (utilisateur connecté uniquement)

router.post('/:id/unregister', requireAuth, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);

  if (isNaN(eventId)) {
    req.flash('error', 'Identifiant d\'événement invalide.');
    return res.redirect('/events');
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      req.flash('error', 'Événement introuvable.');
      return res.redirect('/events');
    }

    // Bloquer la désinscription si l'événement a déjà commencé
    if (event.status === 'in_progress' || new Date(event.start_at) <= new Date()) {
      req.flash('error', 'Impossible de se désinscrire d\'un événement en cours ou passé.');
      return res.redirect(`/events/${eventId}`);
    }

    const deleted = await EventRegistration.delete(eventId, req.session.userId);
    if (deleted) {
      logger.info(`[EVENTS] Désinscription : user #${req.session.userId} → event #${eventId}`);
      req.flash('success', `Désinscription de « ${event.name} » confirmée.`);
    } else {
      req.flash('info', 'Vous n\'étiez pas inscrit à cet événement.');
    }
    return res.redirect(`/events/${eventId}`);
  } catch (err) {
    logger.error(`[EVENTS] Erreur désinscription event #${eventId} :`, err);
    req.flash('error', 'Erreur lors de la désinscription. Veuillez réessayer.');
    return res.redirect('/events');
  }
});

module.exports = router;
