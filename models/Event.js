'use strict';

/**
 * Modèle Événement
 * CRUD sur la table `events`
 * Statuts possibles : 'planifie' | 'en_cours' | 'termine'
 */

const db = require('../config/database');

/** Valeurs autorisées pour le champ status */
const VALID_STATUSES = ['planned', 'in_progress', 'ended'];

function buildActiveEventConflictError(conflictEvent = null) {
  const err = new Error('Un seul événement peut être en cours à la fois.');
  err.code = 'EVENT_ACTIVE_CONFLICT';
  err.conflictEvent = conflictEvent;
  return err;
}

const Event = {

  /**
   * Retourne l'événement actuellement en cours (optionnellement hors ID donné).
   * @param {number|null} excludeId
   * @returns {Promise<Object|null>}
   */
  async findCurrentLive(excludeId = null) {
    if (excludeId) {
      const [rows] = await db.pool.execute(
        `SELECT id, name, start_at, location, status
           FROM events
          WHERE status = 'in_progress' AND id <> ?
          LIMIT 1`,
        [excludeId]
      );
      return rows[0] || null;
    }

    const [rows] = await db.pool.execute(
      `SELECT id, name, start_at, location, status
         FROM events
        WHERE status = 'in_progress'
        LIMIT 1`
    );
    return rows[0] || null;
  },

  /**
   * Retourne tous les événements, triés par date décroissante
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await db.pool.execute(
      `SELECT id, name, start_at, location, discord_channel_id, status, created_at, updated_at
         FROM events
         ORDER BY start_at DESC`
    );
    return rows;
  },

  /**
   * Trouve un événement par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await db.pool.execute(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Retourne l'événement le plus pertinent à afficher sur la page d'accueil :
   *   1. Un événement avec statut 'en_cours' (priorité maximale).
   *   2. Sinon, le prochain événement 'planifie' (le plus proche dans le futur).
   * Les événements 'termine' ne sont jamais mis en avant.
   * @returns {Promise<Object|null>}
   */
  async findActive() {
    const [rows] = await db.pool.execute(
      `SELECT *
         FROM events
        WHERE status IN ('planned', 'in_progress')
        ORDER BY
          CASE status WHEN 'in_progress' THEN 0 ELSE 1 END ASC,
          start_at ASC
        LIMIT 1`
    );
    return rows[0] || null;
  },

  /**
   * Retourne tous les événements visibles publiquement (planifiés, en cours et terminés)
   * avec leur nombre d'inscrits.
   * @returns {Promise<Array>}
   */
  async findAllPublic() {
    const [rows] = await db.pool.execute(
      `SELECT e.id, e.name, e.start_at, e.location, e.discord_channel_id, e.status,
              COUNT(er.id) AS registrationCount
         FROM events e
         LEFT JOIN event_registrations er ON er.event_id = e.id
        WHERE e.status IN ('planned', 'in_progress', 'ended')
        GROUP BY e.id
        ORDER BY
          CASE e.status
            WHEN 'in_progress' THEN 0
            WHEN 'planned' THEN 1
            ELSE 2
          END ASC,
          CASE WHEN e.status = 'ended' THEN e.start_at END DESC,
          CASE WHEN e.status IN ('in_progress', 'planned') THEN e.start_at END ASC`
    );
    return rows;
  },

  /**
   * Crée un nouvel événement.
   * @param {{ nom: string, date_heure: string, lieu: string, statut?: string, discord_channel_id?: string|null, discord_notifications_enabled?: number }} data
   * @returns {Promise<number>} ID du nouvel événement
   */
  async create({ name, start_at, location, status = 'planned', discord_channel_id = null, discord_notifications_enabled = 1 }) {
    const statusFinal = VALID_STATUSES.includes(status) ? status : 'planned';
    const discordChannelIdFinal = typeof discord_channel_id === 'string' && discord_channel_id.trim()
      ? discord_channel_id.trim()
      : null;
    const discordNotifFinal = discord_notifications_enabled === 0 || discord_notifications_enabled === '0' ? 0 : 1;

    if (statusFinal === 'in_progress') {
      const conflict = await Event.findCurrentLive();
      if (conflict) {
        throw buildActiveEventConflictError(conflict);
      }
    }

    try {
      const [result] = await db.pool.execute(
        `INSERT INTO events (name, start_at, location, discord_channel_id, status, discord_notifications_enabled)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name.trim(), start_at, location.trim(), discordChannelIdFinal, statusFinal, discordNotifFinal]
      );
      return result.insertId;
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw buildActiveEventConflictError();
      }
      throw err;
    }
  },

  /**
   * Met à jour un événement.
   * @param {number} id
   * @param {{ nom: string, date_heure: string, lieu: string, statut?: string, discord_channel_id?: string|null, discord_notifications_enabled?: number }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { name, start_at, location, status = 'planned', discord_channel_id = null, discord_notifications_enabled = 1 }) {
    const statusFinal = VALID_STATUSES.includes(status) ? status : 'planned';
    const discordChannelIdFinal = typeof discord_channel_id === 'string' && discord_channel_id.trim()
      ? discord_channel_id.trim()
      : null;
    const discordNotifFinal = discord_notifications_enabled === 0 || discord_notifications_enabled === '0' ? 0 : 1;

    if (statusFinal === 'in_progress') {
      const conflict = await Event.findCurrentLive(id);
      if (conflict) {
        throw buildActiveEventConflictError(conflict);
      }
    }

    try {
      const [result] = await db.pool.execute(
        `UPDATE events
            SET name = ?, start_at = ?, location = ?, discord_channel_id = ?, status = ?, discord_notifications_enabled = ?, updated_at = NOW()
          WHERE id = ?`,
        [name.trim(), start_at, location.trim(), discordChannelIdFinal, statusFinal, discordNotifFinal, id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        throw buildActiveEventConflictError();
      }
      throw err;
    }
  },

  /**
   * Retourne tous les événements avec leur nombre d'inscrits,
   * en une seule requête SQL (évite le problème N+1).
   * @returns {Promise<Array>}
   */
  async findAllWithRegistrationCount() {
    const [rows] = await db.pool.execute(
      `SELECT e.id, e.name, e.start_at, e.location, e.discord_channel_id, e.status,
              e.created_at, e.updated_at,
              COUNT(er.id) AS registrationCount
         FROM events e
         LEFT JOIN event_registrations er ON er.event_id = e.id
         GROUP BY e.id
         ORDER BY e.start_at DESC`
    );
    return rows;
  },

  /**
   * Supprime un événement (et ses inscriptions via CASCADE)
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await db.pool.execute(
      'DELETE FROM events WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Compte le nombre total d'événements
   * @returns {Promise<number>}
   */
  async count() {
    const [rows] = await db.pool.execute(
      'SELECT COUNT(*) AS total FROM events'
    );
    return rows[0].total;
  },

  /** Liste des valeurs de statut autorisées (utile pour les vues/formulaires) */
  VALID_STATUSES,
};

module.exports = Event;
