'use strict';

/**
 * Modèle Inscription Événement
 * CRUD sur la table `event_registrations`
 *
 * Règle métier (vérifiée côté route) :
 *   Les inscriptions sont bloquées 24 h avant le début de l'événement.
 */

const db = require('../config/database');

const EventRegistration = {

  /**
   * Retourne toutes les inscriptions d'un événement avec les informations
   * de l'utilisateur
   * @param {number} eventId
   * @returns {Promise<Array>}
   */
  async findByEvent(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT er.id, er.event_id, er.user_id, er.created_at,
              u.pseudo, u.nom, u.prenom, u.email
         FROM event_registrations er
         JOIN users u ON u.id = er.user_id
        WHERE er.event_id = ?
        ORDER BY er.created_at ASC`,
      [eventId]
    );
    return rows;
  },

  /**
   * Retourne toutes les inscriptions d'un utilisateur avec les informations
   * de l'événement
   * @param {number} userId
   * @returns {Promise<Array>}
   */
  async findByUser(userId) {
    const [rows] = await db.pool.execute(
      `SELECT er.id, er.event_id, er.user_id, er.created_at,
              e.nom, e.date_heure, e.lieu, e.statut
         FROM event_registrations er
         JOIN events e ON e.id = er.event_id
        WHERE er.user_id = ?
        ORDER BY e.date_heure DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * Vérifie si un utilisateur est inscrit à un événement
   * @param {number} eventId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async isRegistered(eventId, userId) {
    const [rows] = await db.pool.execute(
      'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    return rows.length > 0;
  },

  /**
   * Inscrit un utilisateur à un événement
   * @param {number} eventId
   * @param {number} userId
   * @returns {Promise<number>} ID de l'inscription créée
   */
  async create(eventId, userId) {
    const [result] = await db.pool.execute(
      'INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );
    return result.insertId;
  },

  /**
   * Désinscrit un utilisateur d'un événement
   * @param {number} eventId
   * @param {number} userId
   * @returns {Promise<boolean>}
   */
  async delete(eventId, userId) {
    const [result] = await db.pool.execute(
      'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    return result.affectedRows > 0;
  },

  /**
   * Supprime une inscription par son ID (usage admin)
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async deleteById(id) {
    const [result] = await db.pool.execute(
      'DELETE FROM event_registrations WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Compte le nombre d'inscrits à un événement
   * @param {number} eventId
   * @returns {Promise<number>}
   */
  async countByEvent(eventId) {
    const [rows] = await db.pool.execute(
      'SELECT COUNT(*) AS total FROM event_registrations WHERE event_id = ?',
      [eventId]
    );
    return rows[0].total;
  },

  /**
   * Vérifie si les inscriptions sont encore ouvertes pour un événement.
   * Les inscriptions sont ouvertes tant que l'événement est 'planifie'
   * et que sa date de début n'est pas encore atteinte.
   * @param {Object} event - objet événement avec statut et date_heure
   * @returns {boolean}
   */
  isRegistrationOpen(event) {
    return event.statut === 'planifie' && new Date() < new Date(event.date_heure);
  },
};

module.exports = EventRegistration;
