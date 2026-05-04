'use strict';

/**
 * Service de commandes Discord (slash commands)
 *
 * Implémente les interactions Discord de type slash command :
 *   /classement     — Classement de l'événement en cours (canal de l'événement)
 *   /position       — Position du joueur qui exécute la commande (OAuth Discord requis)
 *   /statistiques   — Statistiques du joueur qui exécute la commande (OAuth Discord requis)
 *   /evenement      — Informations sur l'événement en cours ou le prochain (canal actualités)
 *
 * Architecture :
 *   Discord envoie les interactions vers l'endpoint POST /discord/interactions.
 *   La vérification de signature Ed25519 est effectuée avant tout traitement.
 *   L'enregistrement des commandes est déclenché depuis le panneau d'administration.
 */

const { REST, Routes, InteractionType, InteractionResponseType } = require('discord.js');
const nacl = require('tweetnacl');
const logger = require('../config/logger');

// ─── Constantes ────────────────────────────────────────────────────────────────

/**
 * Flag Discord pour les réponses éphémères (visibles uniquement par l'auteur).
 * Valeur numérique selon la spécification de l'API Discord.
 */
const EPHEMERAL_FLAG = 64;

// ─── Définitions des commandes slash ──────────────────────────────────────────

/**
 * Déclarations des slash commands à enregistrer auprès de l'API Discord.
 * Modifier ici pour ajouter/supprimer des commandes et relancer l'enregistrement.
 */
const SLASH_COMMANDS = [
  {
    name: 'classement',
    description: "Affiche le classement de l'événement LAN en cours.",
    dm_permission: false,
  },
  {
    name: 'position',
    description: "Affiche votre position dans le classement (requiert un compte Discord lié).",
    dm_permission: false,
  },
  {
    name: 'statistiques',
    description: "Affiche vos statistiques de l'événement en cours (requiert un compte Discord lié).",
    dm_permission: false,
  },
  {
    name: 'evenement',
    description: "Affiche l'événement LAN en cours ou le prochain événement avec lien d'inscription.",
  },
];

// ─── Enregistrement des commandes ─────────────────────────────────────────────

/**
 * Enregistre (ou met à jour) les slash commands globalement via l'API Discord.
 * Utilise un PUT qui remplace toutes les commandes existantes par celles définies
 * dans SLASH_COMMANDS (idempotent).
 *
 * @param {string} applicationId  — ID de l'application Discord (= Client ID)
 * @param {string} token          — Token du bot Discord
 * @returns {Promise<Object[]>}   Liste des commandes enregistrées retournée par Discord
 */
async function registerCommands(applicationId, token) {
  if (!applicationId || !token) {
    throw new Error('Application ID et token Discord requis pour enregistrer les commandes.');
  }

  const rest = new REST({ version: '10' }).setToken(token);

  const result = await rest.put(
    Routes.applicationCommands(applicationId),
    { body: SLASH_COMMANDS }
  );

  logger.info(`[DISCORD_COMMANDS] ${result.length} commande(s) enregistrée(s) globalement (appId=${applicationId}).`);
  return result;
}

// ─── Vérification de signature Ed25519 ────────────────────────────────────────

/**
 * Vérifie la signature Discord (Ed25519) d'une interaction entrante.
 * Utilise tweetnacl pour la vérification Ed25519 (conforme à la documentation Discord).
 * Une réponse 401 doit être renvoyée en cas d'échec.
 *
 * Référence Discord :
 * https://discord.com/developers/docs/interactions/receiving-and-responding#security
 *
 * @param {Buffer} rawBody       — Corps brut de la requête (Buffer)
 * @param {string} signature     — Valeur de l'en-tête X-Signature-Ed25519
 * @param {string} timestamp     — Valeur de l'en-tête X-Signature-Timestamp
 * @param {string} publicKeyHex  — Clé publique hex (depuis Discord Developer Portal)
 * @returns {boolean}            true si la signature est valide
 */
function verifySignature(rawBody, signature, timestamp, publicKeyHex) {
  if (!rawBody || !signature || !timestamp || !publicKeyHex) {
    const missing = [];
    if (!rawBody) missing.push('rawBody');
    if (!signature) missing.push('signature');
    if (!timestamp) missing.push('timestamp');
    if (!publicKeyHex) missing.push('publicKeyHex');
    logger.debug(`[DISCORD_INTERACTIONS] Signature verification failed: missing ${missing.join(', ')}`);
    return false;
  }

  try {
    logger.debug(`[DISCORD_INTERACTIONS] Verifying signature - timestamp: ${timestamp}, bodySize: ${rawBody.length} bytes, pubKeyLen: ${publicKeyHex.length} chars`);
    
    // Message = timestamp + body (concatenation d'octets)
    const message = Buffer.from(timestamp + rawBody.toString('utf-8'));
    const signatureBuffer = Buffer.from(signature, 'hex');
    const publicKeyBuffer = Buffer.from(publicKeyHex, 'hex');

    const isValid = nacl.sign.detached.verify(message, signatureBuffer, publicKeyBuffer);
    
    if (isValid) {
      logger.debug(`[DISCORD_INTERACTIONS] OK - Signature verification successful`);
    } else {
      logger.warn(`[DISCORD_INTERACTIONS] FAILED - Signature doesn't match`);
    }
    
    return isValid;
  } catch (err) {
    logger.error(`[DISCORD_INTERACTIONS] Signature verification error: ${err.message}`, { stack: err.stack });
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
 * Retourne l'emoji médaille correspondant à un rang dans le classement.
 * Utilisé par handleClassement() et handlePosition() pour assurer la cohérence.
 *
 * @param {number} rang  — Position dans le classement (1 = premier)
 * @returns {string}     — Emoji médaille ou numéro de rang
 */
function getMedalForRank(rang) {
  if (rang === 1) return '🥇';
  if (rang === 2) return '🥈';
  if (rang === 3) return '🥉';
  return `🏅 #${rang}`;
}

// ─── Handlers de commandes ────────────────────────────────────────────────────

/**
 * Handler /classement
 * Retourne le classement de l'événement en cours (top 10).
 * Réponse publique dans le canal où la commande est exécutée.
 *
 * @returns {Promise<Object>}  Objet de réponse Discord (InteractionResponse)
 */
async function handleClassement() {
  // Import tardif pour éviter les dépendances circulaires
  const Event        = require('../models/Event');
  const EventRanking = require('../models/EventRanking');

  const event = await Event.findActive();

  if (!event || event.statut !== 'en_cours') {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "❌ Aucun événement LAN n'est actuellement en cours.",
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const rankings = await EventRanking.findByEvent(event.id, 10);

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  const eventUrl = appUrl ? `${appUrl}/events/${event.id}` : null;

  let rankingText;
  if (!rankings || rankings.length === 0) {
    rankingText = 'Aucun point attribué pour le moment.';
  } else {
    rankingText = rankings
      .map(entry => {
        const medal = getMedalForRank(entry.rang);
        return `${medal} **${entry.pseudo}** — ${entry.points} pts (${entry.wins} victoire${entry.wins > 1 ? 's' : ''})`;
      })
      .join('\n');
  }

  const embed = {
    title:       `🏆 Classement — ${event.nom}`,
    description: rankingText,
    color:       0x5865F2,
    fields: [
      { name: '📍 Lieu', value: event.lieu, inline: true },
    ],
    footer:    { text: 'LANPartyManager • Classement en temps réel' },
    timestamp: new Date().toISOString(),
  };

  if (eventUrl) embed.url = eventUrl;

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { embeds: [embed] },
  };
}

/**
 * Handler /position
 * Retourne la position du joueur dans le classement de l'événement en cours.
 * Réponse éphémère (visible uniquement par l'auteur de la commande).
 *
 * @param {string} discordUserId  — Discord user ID extrait de l'interaction
 * @returns {Promise<Object>}
 */
async function handlePosition(discordUserId) {
  const Event        = require('../models/Event');
  const EventRanking = require('../models/EventRanking');
  const User         = require('../models/User');

  if (!discordUserId) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: '❌ Impossible de déterminer votre identifiant Discord.',
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const user = await User.findByDiscordId(discordUserId);

  if (!user) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "❌ Votre compte Discord n'est pas lié à un compte LANPartyManager. Connectez-vous via Discord sur notre site pour lier votre compte.",
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const event = await Event.findActive();

  if (!event || event.statut !== 'en_cours') {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "❌ Aucun événement LAN n'est actuellement en cours.",
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const rankings = await EventRanking.findByEvent(event.id);
  const myEntry  = rankings.find(r => Number(r.user_id) === Number(user.id));

  if (!myEntry) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: `📊 Vous n'êtes pas encore classé(e) dans **${event.nom}**. Participez à des rencontres pour apparaître au classement !`,
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const medal   = getMedalForRank(myEntry.rang);
  const battles = myEntry.battles_played;

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: `${medal} **${user.pseudo}**, vous êtes actuellement **${myEntry.rang}e** dans **${event.nom}** avec **${myEntry.points} point${myEntry.points > 1 ? 's' : ''}** et **${myEntry.wins} victoire${myEntry.wins > 1 ? 's' : ''}** sur ${battles} rencontre${battles > 1 ? 's' : ''}.`,
      flags: EPHEMERAL_FLAG,
    },
  };
}

/**
 * Handler /statistiques
 * Retourne les statistiques détaillées du joueur dans l'événement en cours.
 * Réponse éphémère (visible uniquement par l'auteur de la commande).
 *
 * @param {string} discordUserId  — Discord user ID extrait de l'interaction
 * @returns {Promise<Object>}
 */
async function handleStatistiques(discordUserId) {
  const Event        = require('../models/Event');
  const EventRanking = require('../models/EventRanking');
  const User         = require('../models/User');

  if (!discordUserId) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: '❌ Impossible de déterminer votre identifiant Discord.',
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const user = await User.findByDiscordId(discordUserId);

  if (!user) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "❌ Votre compte Discord n'est pas lié à un compte LANPartyManager. Connectez-vous via Discord sur notre site pour lier votre compte.",
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const event = await Event.findActive();

  if (!event || event.statut !== 'en_cours') {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "❌ Aucun événement LAN n'est actuellement en cours.",
        flags: EPHEMERAL_FLAG,
      },
    };
  }

  const rankings = await EventRanking.findByEvent(event.id);
  const myEntry  = rankings.find(r => Number(r.user_id) === Number(user.id));

  const appUrl     = (process.env.APP_URL || '').replace(/\/$/, '');
  const profileUrl = appUrl ? `${appUrl}/profile` : null;

  const embed = {
    title:  `📊 Statistiques de ${user.pseudo}`,
    color:  0x5865F2,
    fields: [
      { name: '🎮 Événement', value: event.nom, inline: false },
    ],
    footer:    { text: 'LANPartyManager' },
    timestamp: new Date().toISOString(),
  };

  if (myEntry) {
    const ratio = myEntry.battles_played > 0
      ? Math.round((myEntry.wins / myEntry.battles_played) * 100)
      : 0;

    embed.fields.push(
      { name: '🏅 Classement',         value: `#${myEntry.rang}`,              inline: true },
      { name: '⭐ Points',              value: `${myEntry.points}`,             inline: true },
      { name: '🏆 Victoires',          value: `${myEntry.wins}`,               inline: true },
      { name: '⚔️ Rencontres jouées',  value: `${myEntry.battles_played}`,     inline: true },
      { name: '📈 Ratio victoires',    value: `${ratio}%`,                     inline: true }
    );
  } else {
    embed.description = "Vous n'avez pas encore participé à des rencontres dans cet événement.";
  }

  if (profileUrl) embed.url = profileUrl;

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      embeds: [embed],
      flags:  64, // EPHEMERAL — visible uniquement par l'auteur
    },
  };
}

/**
 * Handler /evenement
 * Retourne les informations sur l'événement en cours ou le prochain événement à venir,
 * avec le lien d'inscription si les inscriptions sont encore ouvertes.
 * Réponse publique dans le canal des actualités.
 *
 * @returns {Promise<Object>}
 */
async function handleEvenement() {
  const Event             = require('../models/Event');
  const EventRegistration = require('../models/EventRegistration');

  const event = await Event.findActive();

  if (!event) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "❌ Aucun événement LAN n'est prévu pour le moment. Revenez plus tard !",
      },
    };
  }

  const appUrl          = (process.env.APP_URL || '').replace(/\/$/, '');
  const eventUrl        = appUrl ? `${appUrl}/events/${event.id}` : null;
  const registrationCount = await EventRegistration.countByEvent(event.id);
  const isRegistrationOpen = EventRegistration.isRegistrationOpen(event);

  let statusEmoji = '🗓️';
  let statusLabel = 'Planifié';
  let color       = 0x5865F2;

  if (event.statut === 'en_cours') {
    statusEmoji = '🟢';
    statusLabel = 'En cours';
    color       = 0x57F287;
  }

  const embed = {
    title:  `${statusEmoji} ${event.nom}`,
    color,
    fields: [
      { name: '📍 Lieu',        value: event.lieu,                         inline: true },
      { name: '🕐 Date',        value: formatDate(event.date_heure),       inline: true },
      { name: '📊 Statut',      value: `${statusEmoji} ${statusLabel}`,    inline: true },
      { name: '👥 Inscrits',    value: `${registrationCount} participant(s)`, inline: true },
    ],
    footer:    { text: 'LANPartyManager' },
    timestamp: new Date().toISOString(),
  };

  if (eventUrl) embed.url = eventUrl;

  let content = '';

  if (event.statut === 'en_cours') {
    content = `🎮 **L'événement ${event.nom} est en cours !**`;
  } else if (event.statut === 'planifie') {
    if (isRegistrationOpen && eventUrl) {
      embed.fields.push({
        name:   '📝 Inscription',
        value:  `[Inscrivez-vous maintenant !](${eventUrl})`,
        inline: false,
      });
      content = `📣 **${event.nom}** arrive bientôt ! Les inscriptions sont ouvertes.`;
    } else {
      content = `📣 **${event.nom}** arrive bientôt !`;
    }
  }

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content:  content || undefined,
      embeds:   [embed],
    },
  };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

/**
 * Traite une interaction Discord et retourne la réponse appropriée.
 * Ne propage jamais d'erreur vers l'appelant ; en cas d'erreur interne,
 * retourne un message d'erreur générique à l'utilisateur.
 *
 * @param {Object} interaction  — Corps de l'interaction (JSON parsé)
 * @returns {Promise<Object>}   Objet de réponse Discord (InteractionResponse)
 */
async function handleInteraction(interaction) {
  const type = interaction && interaction.type;

  // PING — vérification Discord lors de la configuration de l'Interactions Endpoint URL
  if (type === InteractionType.Ping) {
    return { type: InteractionResponseType.Pong };
  }

  // Commandes slash (ApplicationCommand)
  if (type === InteractionType.ApplicationCommand) {
    const commandName   = interaction.data && interaction.data.name;
    // L'auteur est dans member.user (serveur) ou user (DM)
    const discordUserId = (interaction.member && interaction.member.user && interaction.member.user.id)
      || (interaction.user && interaction.user.id);

    try {
      switch (commandName) {
        case 'classement':   return await handleClassement();
        case 'position':     return await handlePosition(discordUserId);
        case 'statistiques': return await handleStatistiques(discordUserId);
        case 'evenement':    return await handleEvenement();
        default:
          return {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: {
              content: `❓ Commande inconnue : /${commandName}`,
              flags:   64,
            },
          };
      }
    } catch (err) {
      logger.error(`[DISCORD_COMMANDS] Erreur lors du traitement de /${commandName} :`, err);
      return {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: '❌ Une erreur interne est survenue. Veuillez réessayer plus tard.',
          flags:   64,
        },
      };
    }
  }

  // Type d'interaction non géré
  logger.warn(`[DISCORD_COMMANDS] Type d'interaction non géré : ${type}`);
  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      content: '❌ Type d\'interaction non supporté.',
      flags:   64,
    },
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  SLASH_COMMANDS,
  registerCommands,
  verifySignature,
  handleInteraction,
  // Exposés pour les tests unitaires
  handleClassement,
  handlePosition,
  handleStatistiques,
  handleEvenement,
};
