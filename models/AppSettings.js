'use strict';

/**
 * Modèle AppSettings — Configuration globale de l'application
 *
 * Gère la table `app_settings` (paires clé/valeur).
 * Remplace les variables d'environnement Discord par un paramétrage
 * stocké en base de données et administrable depuis l'interface admin.
 *
 * Clés reconnues :
 *   
 *   # Identité de l'association
 *   organization_name         — Nom de l'association (ex: "LANPartyManager")
 *   organization_logo         — URL du logo (PNG, SVG recommandé)
 *   organization_slogan       — Slogan ou tagline
 *   
 *   # Liens des communautés (affichés seulement s'ils sont renseignés)
 *   community_link_discord    — URL d'invitation Discord
 *   community_link_twitter    — URL du profil Twitter/X
 *   community_link_twitch     — URL de la chaîne Twitch
 *   community_link_youtube    — URL de la chaîne YouTube
 *   community_link_website    — URL du site web officiel
 *   
 *   # Discord (notifications et OAuth2)
 *   discord_enabled           — '1' | '0'  (activer/désactiver Discord globalement)
 *   discord_bot_token         — Token du bot Discord (notifications)
 *   discord_channel_news      — ID du canal Discord pour les actualités
 *   discord_client_id         — Client ID OAuth2 Discord (connexion utilisateur)
 *   discord_client_secret     — Client Secret OAuth2 Discord (connexion utilisateur)
 */

const db     = require('../config/database');
const logger = require('../config/logger');

// ─── Cache en mémoire ──────────────────────────────────────────────────────
// Évite une lecture BDD à chaque requête.
// Invalidé automatiquement après TTL ou à la sauvegarde.

/** @type {Object|null} Cache des paramètres */
let _cache     = null;
/** @type {number} Timestamp de la dernière mise en cache */
let _cacheTime = 0;
/** Durée de validité du cache (1 minute) */
const CACHE_TTL_MS = 60_000;

// ─── Méthodes ─────────────────────────────────────────────────────────────

const AppSettings = {

  /**
   * Retourne tous les paramètres sous forme d'objet { cle: valeur }.
   * Utilise le cache interne ; lit la BDD si le cache est expiré.
   * En cas d'erreur BDD, retourne un objet vide (fallback silencieux).
   * @returns {Promise<Object>}
   */
  async getAll() {
    const now = Date.now();
    if (_cache && now - _cacheTime < CACHE_TTL_MS) {
      return _cache;
    }

    try {
      const [rows] = await db.pool.execute(
        'SELECT `cle`, `valeur` FROM `app_settings`'
      );
      _cache     = {};
      for (const row of rows) {
        _cache[row.cle] = row.valeur;
      }
      _cacheTime = now;
      return _cache;
    } catch (err) {
      // La table n'existe peut-être pas encore (première installation)
      // ou la BDD est indisponible. On retourne silencieusement un objet vide.
      logger.warn('[APP_SETTINGS] Impossible de lire app_settings (BDD indisponible ?) :', err.message);
      return {};
    }
  },

  /**
   * Retourne la valeur d'un paramètre ou null si non défini.
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    const all = await AppSettings.getAll();
    return (all[key] !== undefined && all[key] !== null) ? all[key] : null;
  },

  /**
   * Enregistre la valeur d'un paramètre (INSERT … ON DUPLICATE KEY UPDATE).
   * Le cache est invalidé APRÈS l'écriture en BDD pour éviter une fenêtre
   * de lecture incohérente.
   * @param {string} key
   * @param {string|null} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    await db.pool.execute(
      'INSERT INTO `app_settings` (`cle`, `valeur`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `valeur` = VALUES(`valeur`)',
      [key, value ?? null]
    );
    AppSettings.clearCache(); // Invalidation après l'écriture réussie
  },

  /**
   * Enregistre plusieurs paramètres de manière atomique dans une transaction.
   * Le cache est invalidé une seule fois après l'ensemble des écritures.
   * @param {Object} settings  — ex: { discord_enabled: '1', discord_bot_token: 'MTx…' }
   * @returns {Promise<void>}
   */
  async setMultiple(settings) {
    const conn = await db.pool.getConnection();
    try {
      await conn.beginTransaction();
      for (const [key, value] of Object.entries(settings)) {
        await conn.execute(
          'INSERT INTO `app_settings` (`cle`, `valeur`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `valeur` = VALUES(`valeur`)',
          [key, value ?? null]
        );
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    AppSettings.clearCache(); // Invalidation après la transaction réussie
  },

  /**
   * Invalide le cache en mémoire.
   * À appeler après une mise à jour des paramètres pour forcer
   * la relecture depuis la BDD lors du prochain accès.
   */
  clearCache() {
    _cache     = null;
    _cacheTime = 0;
  },
};

module.exports = AppSettings;
