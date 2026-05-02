'use strict';

/**
 * Routes Discord Interactions
 *
 * Endpoint webhook pour les interactions Discord (slash commands).
 * Discord envoie une requête POST sur /discord/interactions à chaque
 * interaction utilisateur (commande slash, ping de vérification…).
 *
 * Sécurité :
 *   - Le corps brut de la requête est capturé via express.raw() (AVANT express.json()).
 *   - La signature Ed25519 fournie par Discord est vérifiée avant tout traitement.
 *   - Toute requête avec signature invalide reçoit une réponse 401.
 *
 * Configuration requise dans app_settings :
 *   discord_application_public_key  — Clé publique hexadécimale de l'application Discord
 *                                     (Discord Developer Portal → General Information → Public Key)
 *
 * Important :
 *   Ce routeur doit être monté dans app.js AVANT express.json() et AVANT la
 *   protection CSRF, afin de recevoir le corps brut non parsé.
 */

const express  = require('express');
const router   = express.Router();
const logger   = require('../config/logger');
const { verifySignature, handleInteraction } = require('../services/discordCommands');
const AppSettings = require('../models/AppSettings');

/**
 * POST /discord/interactions
 * Point d'entrée pour toutes les interactions Discord.
 *
 * 1. Capture le corps brut (express.raw) pour la vérification de signature
 * 2. Vérifie la signature Ed25519 — 401 si invalide
 * 3. Parse le JSON et dispatche l'interaction
 */
router.post(
  '/interactions',
  // express.raw() capture le corps en Buffer (nécessaire pour la vérification Ed25519)
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const rawBody   = req.body; // Buffer grâce à express.raw()

    // Récupérer la clé publique depuis la configuration
    let publicKey = '';
    try {
      publicKey = (await AppSettings.get('discord_application_public_key')) || '';
    } catch (err) {
      logger.warn('[DISCORD_INTERACTIONS] Impossible de lire la clé publique depuis app_settings :', err.message);
    }

    // Vérification obligatoire de la signature Discord (Ed25519)
    // Discord exige cette vérification ; rejeter avec 401 sinon.
    if (!publicKey || !verifySignature(rawBody, signature, timestamp, publicKey)) {
      logger.warn(`[DISCORD_INTERACTIONS] Signature invalide ou clé publique absente (ip=${req.ip})`);
      return res.status(401).json({ error: 'Invalid request signature' });
    }

    // Parser le JSON maintenant que la signature est vérifiée
    let interaction;
    try {
      interaction = JSON.parse(rawBody.toString('utf-8'));
    } catch {
      logger.warn('[DISCORD_INTERACTIONS] Corps JSON invalide');
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    // Traiter l'interaction et renvoyer la réponse Discord
    try {
      const response = await handleInteraction(interaction);
      return res.status(200).json(response);
    } catch (err) {
      logger.error('[DISCORD_INTERACTIONS] Erreur inattendue lors du traitement :', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
