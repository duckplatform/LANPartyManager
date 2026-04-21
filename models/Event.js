'use strict';

/**
 * Modèle Événement
 * CRUD sur la table `events`
 * Contrainte : un seul événement peut être actif simultanément.
 */

const db = require('../config/database');

const Event = {

  /**
   * Retourne tous les événements, triés par date décroissante
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await db.pool.execute(
      `SELECT id, nom, date_heure, lieu, actif, created_at, updated_at
         FROM events
         ORDER BY date_heure DESC`
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
   * Retourne l'événement actif (actif = 1), s'il existe
   * @returns {Promise<Object|null>}
   */
  async findActive() {
    const [rows] = await db.pool.execute(
      'SELECT * FROM events WHERE actif = 1 LIMIT 1'
    );
    return rows[0] || null;
  },

  /**
   * Crée un nouvel événement.
   * Si actif = true, tous les autres événements sont d'abord désactivés
   * (contrainte : un seul actif simultanément).
   * @param {{ nom: string, date_heure: string, lieu: string, actif?: boolean }} data
   * @returns {Promise<number>} ID du nouvel événement
   */
  async create({ nom, date_heure, lieu, actif = false }) {
    if (actif) {
      await db.pool.execute('UPDATE events SET actif = 0');
    }
    const [result] = await db.pool.execute(
      `INSERT INTO events (nom, date_heure, lieu, actif)
       VALUES (?, ?, ?, ?)`,
      [nom.trim(), date_heure, lieu.trim(), actif ? 1 : 0]
    );
    return result.insertId;
  },

  /**
   * Met à jour un événement.
   * Si actif = true, les autres événements sont désactivés.
   * @param {number} id
   * @param {{ nom: string, date_heure: string, lieu: string, actif?: boolean }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { nom, date_heure, lieu, actif = false }) {
    if (actif) {
      // Désactive tous les autres événements sauf celui-ci
      await db.pool.execute('UPDATE events SET actif = 0 WHERE id != ?', [id]);
    }
    const [result] = await db.pool.execute(
      `UPDATE events
          SET nom = ?, date_heure = ?, lieu = ?, actif = ?, updated_at = NOW()
        WHERE id = ?`,
      [nom.trim(), date_heure, lieu.trim(), actif ? 1 : 0, id]
    );
    return result.affectedRows > 0;
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
};

module.exports = Event;
