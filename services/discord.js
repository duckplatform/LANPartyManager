'use strict';

/**
 * Service de notifications Discord
 *
 * Envoie des messages formatés (embeds) sur les canaux Discord configurés
 * lors des événements métier clés :
 *   - Création / début / fin d'un événement LAN
 *   - Publication d'une actualité
 *
 * Utilise l'API REST Discord via discord.js (pas de WebSocket requis).
 * La configuration se fait exclusivement par variables d'environnement :
 *   DISCORD_BOT_TOKEN        — Token du bot Discord
 *   DISCORD_CHANNEL_EVENTS   — ID du canal pour les événements
 *   DISCORD_CHANNEL_NEWS     — ID du canal pour les actualités
 *   APP_URL                  — URL publique de l'application (ex: https://lanparty.example.com)
 */

const { REST, Routes } = require('discord.js');
const logger = require('../config/logger');

// ─── Configuration ─────────────────────────────────────────────────────────
// Les variables sont lues dynamiquement pour permettre l'injection dans les tests.

/**
 * Retourne la configuration Discord depuis les variables d'environnement.
 * @returns {{ token: string, channelEvents: string, channelNews: string, appUrl: string }}
 */
function getConfig() {
  return {
    token:         process.env.DISCORD_BOT_TOKEN      || '',
    channelEvents: process.env.DISCORD_CHANNEL_EVENTS || '',
    channelNews:   process.env.DISCORD_CHANNEL_NEWS   || '',
    appUrl:        (process.env.APP_URL || '').replace(/\/$/, ''),
  };
}

// ─── Client REST (lazy init) ───────────────────────────────────────────────

let _rest = null;

/**
 * Retourne l'instance REST Discord initialisée, ou null si le token est absent.
 * Permet l'injection d'un mock client dans les tests via `_setRestClient`.
 * @returns {REST|null}
 */
function getRestClient() {
  const { token } = getConfig();
  if (!token) return null;
  if (!_rest) {
    _rest = new REST({ version: '10' }).setToken(token);
  }
  return _rest;
}

/**
 * Injecte un client REST factice (pour les tests uniquement).
 * @param {Object|null} client
 */
function _setRestClient(client) {
  _rest = client;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Formate une date pour l'affichage en français.
 * @param {Date|string} date
 * @returns {string}
 */
function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  });
}

/**
 * Envoie un message (embed) sur un canal Discord.
 * Les erreurs Discord ne font jamais planter l'application.
 *
 * @param {string} channelId  — ID du canal Discord cible
 * @param {Object} embed      — Objet embed Discord
 * @param {string} [content]  — Texte brut optionnel au-dessus de l'embed
 * @returns {Promise<void>}
 */
async function sendEmbed(channelId, embed, content) {
  const rest = getRestClient();

  if (!rest) {
    logger.warn('[DISCORD] DISCORD_BOT_TOKEN non configuré — notification ignorée.');
    return;
  }

  if (!channelId) {
    logger.warn('[DISCORD] ID de canal non configuré — notification ignorée.');
    return;
  }

  try {
    const body = { embeds: [embed] };
    if (content) body.content = content;

    await rest.post(Routes.channelMessages(channelId), { body });
    logger.info(`[DISCORD] Message envoyé sur le canal #${channelId}`);
  } catch (err) {
    // Ne pas propager l'erreur : Discord est une fonctionnalité additionnelle
    logger.error('[DISCORD] Erreur lors de l\'envoi du message :', err);
  }
}

// ─── Notifications événements ──────────────────────────────────────────────

/**
 * Notifie la création d'un nouvel événement LAN.
 * @param {{ id: number, nom: string, date_heure: string|Date, lieu: string, statut: string }} event
 * @returns {Promise<void>}
 */
async function notifyEventCreated(event) {
  const { appUrl } = getConfig();
  const channelId = resolveBattleChannel(event);
  const eventUrl = appUrl ? `${appUrl}/` : null;

  const embed = {
    title:       `📅 Nouvel événement : ${event.nom}`,
    description: `Un nouvel événement vient d'être planifié ! Marquez la date dans votre agenda.`,
    color:       0x5865F2, // Bleu Discord
    fields: [
      { name: '📍 Lieu',    value: event.lieu,               inline: true },
      { name: '🕐 Date',    value: formatDate(event.date_heure), inline: true },
      { name: '📊 Statut', value: '🗓️ Planifié',              inline: true },
    ],
    footer: { text: 'LANPartyManager' },
    timestamp: new Date().toISOString(),
  };

  if (eventUrl) {
    embed.url = eventUrl;
  }

  await sendEmbed(
    channelId,
    embed,
    '@everyone 🎮 Un nouvel événement a été planifié !'
  );
}

/**
 * Notifie le début d'un événement LAN (passage en statut 'en_cours').
 * @param {{ id: number, nom: string, date_heure: string|Date, lieu: string }} event
 * @returns {Promise<void>}
 */
async function notifyEventStarted(event) {
  const { appUrl } = getConfig();
  const channelId = resolveBattleChannel(event);
  const eventUrl = appUrl ? `${appUrl}/` : null;

  const embed = {
    title:       `🟢 C'est parti ! ${event.nom}`,
    description: `L'événement vient de commencer ! Rejoignez-nous dès maintenant.`,
    color:       0x57F287, // Vert Discord
    fields: [
      { name: '📍 Lieu', value: event.lieu, inline: true },
      { name: '📊 Statut', value: '🟢 En cours', inline: true },
    ],
    footer: { text: 'LANPartyManager' },
    timestamp: new Date().toISOString(),
  };

  if (eventUrl) {
    embed.url = eventUrl;
  }

  await sendEmbed(
    channelId,
    embed,
    `@everyone 🚀 **${event.nom}** vient de commencer !`
  );
}

/**
 * Notifie la fin d'un événement LAN (passage en statut 'termine').
 * @param {{ id: number, nom: string, date_heure: string|Date, lieu: string }} event
 * @returns {Promise<void>}
 */
async function notifyEventEnded(event) {
  const channelId = resolveBattleChannel(event);

  const embed = {
    title:       `🏁 Fin de l'événement : ${event.nom}`,
    description: `L'événement est maintenant terminé. Merci à tous les participants ! À bientôt pour la prochaine LAN ! 🎮`,
    color:       0xED4245, // Rouge Discord
    fields: [
      { name: '📍 Lieu', value: event.lieu, inline: true },
      { name: '📊 Statut', value: '🏁 Terminé', inline: true },
    ],
    footer: { text: 'LANPartyManager' },
    timestamp: new Date().toISOString(),
  };

  await sendEmbed(channelId, embed);
}

// ─── Notifications actualités ──────────────────────────────────────────────

/**
 * Notifie la publication d'une nouvelle actualité.
 * @param {{ id: number, titre: string, contenu: string }} announcement
 * @returns {Promise<void>}
 */
async function notifyNewsPublished(announcement) {
  const { appUrl, channelNews } = getConfig();
  const newsUrl = appUrl ? `${appUrl}/news/${announcement.id}` : null;

  // Nettoie le contenu Markdown pour le résumé Discord (max 300 caractères) :
  //   1. Convertit les liens [texte](url) en conservant uniquement le texte
  //   2. Supprime les symboles Markdown restants
  let description = (announcement.contenu || '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [texte](url) → texte
    .replace(/[#*_~`>!]/g, '')               // titres, gras, italic, barré, code, blockquote, images
    .replace(/\s+/g, ' ')                    // normalise les espaces multiples
    .trim();
  if (description.length > 300) {
    description = description.slice(0, 297) + '…';
  }
  if (!description) {
    description = 'Pas de résumé disponible.';
  }

  const embed = {
    title:       `📰 ${announcement.titre}`,
    description,
    color:       0xFEE75C, // Jaune Discord
    footer:      { text: 'LANPartyManager — Actualités' },
    timestamp:   new Date().toISOString(),
  };

  if (newsUrl) {
    embed.url   = newsUrl;
    description += `\n\n[Lire l'article complet](${newsUrl})`;
    embed.description = description;
  }

  await sendEmbed(
    channelNews,
    embed,
    `📢 **Nouvelle actualité publiée !** — ${announcement.titre}`
  );
}

// ─── Notifications rencontres ──────────────────────────────────────────────

function buildBattlePlayersField(players = []) {
  if (!Array.isArray(players) || players.length === 0) {
    return 'Participants non disponibles.';
  }

  const teams = new Map();
  for (const player of players) {
    const team = Number(player.equipe) || 1;
    const pseudo = (player.pseudo || `Joueur #${player.user_id || '?'}`).toString().trim();
    if (!teams.has(team)) {
      teams.set(team, []);
    }
    teams.get(team).push(pseudo);
  }

  return Array.from(teams.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([team, pseudos]) => `Equipe ${team}: ${pseudos.join(', ')}`)
    .join('\n');
}

function isWinningPlayer(value) {
  if (Buffer.isBuffer(value)) {
    return value.length > 0 && value[0] !== 0;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }

  return Number(value) === 1;
}

function buildBattleWinnersField(players = []) {
  const winners = (players || [])
    .filter(player => isWinningPlayer(player.est_gagnant))
    .map(player => (player.pseudo || `Joueur #${player.user_id || '?'}`).toString().trim());

  if (winners.length === 0) {
    return 'Non renseigne';
  }

  return winners.join(', ');
}

function resolveBattleChannel(event) {
  const { channelEvents } = getConfig();
  const eventChannel = event && typeof event.discord_channel_id === 'string'
    ? event.discord_channel_id.trim()
    : '';
  return eventChannel || channelEvents;
}

function battleBaseEmbed(event, battle, color) {
  return {
    color,
    fields: [
      {
        name: 'Evenement',
        value: event && event.nom ? event.nom : `Evenement #${battle && battle.event_id ? battle.event_id : '?'}`,
        inline: false,
      },
      {
        name: 'Jeu',
        value: battle && battle.game_nom ? `${battle.game_nom}${battle.game_console ? ` (${battle.game_console})` : ''}` : 'Non renseigne',
        inline: true,
      },
      {
        name: 'Salle',
        value: battle && battle.room_nom ? battle.room_nom : 'Aucune (file d\'attente)',
        inline: true,
      },
      {
        name: 'Participants',
        value: buildBattlePlayersField(battle && battle.players),
        inline: false,
      },
    ],
    footer: { text: `LANPartyManager • Rencontre #${battle && battle.id ? battle.id : '?'}` },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Notification lors de la creation d'une rencontre.
 * Utilise le canal dedie a l'evenement s'il est configure.
 * @param {{ event: Object, battle: Object }} payload
 * @returns {Promise<void>}
 */
async function notifyBattleCreated({ event, battle }) {
  if (!battle) return;

  const channelId = resolveBattleChannel(event);
  const isQueued = battle.statut === 'file_attente';

  const embed = battleBaseEmbed(event, battle, isQueued ? 0xFEE75C : 0x5865F2);
  embed.title = isQueued
    ? `⏳ Rencontre #${battle.id} en file d'attente`
    : `🗓️ Rencontre #${battle.id} planifiee`;
  embed.description = isQueued
    ? 'La rencontre a ete creee et attend une salle compatible disponible.'
    : 'La rencontre a ete creee et une salle a ete attribuee.';

  if (battle.notes) {
    embed.fields.push({ name: 'Notes', value: battle.notes, inline: false });
  }

  await sendEmbed(channelId, embed, '🎮 Nouvelle rencontre en preparation');
}

/**
 * Notification d'une promotion automatique file_attente -> planifie.
 * @param {{ event: Object, battle: Object }} payload
 * @returns {Promise<void>}
 */
async function notifyBattlePlanned({ event, battle }) {
  if (!battle) return;

  const channelId = resolveBattleChannel(event);
  const embed = battleBaseEmbed(event, battle, 0x5865F2);
  embed.title = `🗓️ Rencontre #${battle.id} planifiee`;
  embed.description = 'Une salle est disponible: la rencontre sort de la file d\'attente.';

  await sendEmbed(channelId, embed, '📣 Mise a jour du planning des rencontres');
}

/**
 * Notification de passage en installation.
 * @param {{ event: Object, battle: Object }} payload
 * @returns {Promise<void>}
 */
async function notifyBattleInstallation({ event, battle }) {
  if (!battle) return;
  const channelId = resolveBattleChannel(event);
  const embed = battleBaseEmbed(event, battle, 0xFEE75C);
  embed.title = `🛠️ Installation en cours • Rencontre #${battle.id}`;
  embed.description = 'Les joueurs s\'installent en salle. Prochaine etape : lancement de la partie.';

  await sendEmbed(channelId, embed, '🧩 Les joueurs prennent place');
}

/**
 * Notification de lancement de rencontre.
 * @param {{ event: Object, battle: Object }} payload
 * @returns {Promise<void>}
 */
async function notifyBattleStarted({ event, battle }) {
  if (!battle) return;
  const channelId = resolveBattleChannel(event);
  const embed = battleBaseEmbed(event, battle, 0x57F287);
  embed.title = `▶️ Rencontre #${battle.id} en cours`;
  embed.description = 'La partie vient de commencer.';

  await sendEmbed(channelId, embed, `🚀 C'est parti pour la rencontre #${battle.id}`);
}

/**
 * Notification de fin de rencontre avec score et gagnants.
 * @param {{ event: Object, battle: Object }} payload
 * @returns {Promise<void>}
 */
async function notifyBattleEnded({ event, battle }) {
  if (!battle) return;
  const channelId = resolveBattleChannel(event);
  const embed = battleBaseEmbed(event, battle, 0xED4245);
  embed.title = `🏁 Rencontre #${battle.id} terminee`;
  embed.description = 'Resultat enregistre. La file d\'attente est en cours de re-evaluation.';

  embed.fields.push({
    name: 'Score',
    value: battle.score || 'Non renseigne',
    inline: true,
  });
  embed.fields.push({
    name: 'Gagnant(s)',
    value: buildBattleWinnersField(battle.players),
    inline: true,
  });

  await sendEmbed(channelId, embed, `✅ Fin de la rencontre #${battle.id}`);
}

// ─── Export ────────────────────────────────────────────────────────────────

module.exports = {
  notifyEventCreated,
  notifyEventStarted,
  notifyEventEnded,
  notifyNewsPublished,
  notifyBattleCreated,
  notifyBattlePlanned,
  notifyBattleInstallation,
  notifyBattleStarted,
  notifyBattleEnded,
  // Exposés pour les tests uniquement
  _getRestClient: getRestClient,
  _setRestClient,
};
