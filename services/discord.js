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
  const { appUrl, channelEvents } = getConfig();
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
    channelEvents,
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
  const { appUrl, channelEvents } = getConfig();
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
    channelEvents,
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
  const { channelEvents } = getConfig();

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

  await sendEmbed(channelEvents, embed);
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

// ─── Export ────────────────────────────────────────────────────────────────

module.exports = {
  notifyEventCreated,
  notifyEventStarted,
  notifyEventEnded,
  notifyNewsPublished,
  // Exposés pour les tests uniquement
  _getRestClient: getRestClient,
  _setRestClient,
};
