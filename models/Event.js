'use strict';

/**
 * Modèle Événement
 * CRUD sur la table `events`
 * Statuts possibles : 'planifie' | 'en_cours' | 'termine'
 */

const db = require('../config/database');

/** Valeurs autorisées pour le champ statut */
const STATUTS_VALIDES = ['planifie', 'en_cours', 'termine'];

const Event = {

  /**
   * Retourne tous les événements, triés par date décroissante
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await db.pool.execute(
      `SELECT id, nom, date_heure, lieu, statut, created_at, updated_at
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
        WHERE statut IN ('planifie', 'en_cours')
        ORDER BY
          CASE statut WHEN 'en_cours' THEN 0 ELSE 1 END ASC,
          date_heure ASC
        LIMIT 1`
    );
    return rows[0] || null;
  },

  /**
   * Retourne tous les événements visibles publiquement (planifiés + en cours)
   * avec leur nombre d'inscrits, triés par date ASC (les plus proches en premier).
   * Inclut tous les événements planifiés, même ceux non mis en avant sur la home.
   * @returns {Promise<Array>}
   */
  async findAllPublic() {
    const [rows] = await db.pool.execute(
      `SELECT e.id, e.nom, e.date_heure, e.lieu, e.statut,
              COUNT(er.id) AS registrationCount
         FROM events e
         LEFT JOIN event_registrations er ON er.event_id = e.id
        WHERE e.statut IN ('planifie', 'en_cours')
        GROUP BY e.id
        ORDER BY
          CASE e.statut WHEN 'en_cours' THEN 0 ELSE 1 END ASC,
          e.date_heure ASC`
    );
    return rows;
  },

  /**
   * Crée un nouvel événement.
   * @param {{ nom: string, date_heure: string, lieu: string, statut?: string }} data
   * @returns {Promise<number>} ID du nouvel événement
   */
  async create({ nom, date_heure, lieu, statut = 'planifie' }) {
    const statutFinal = STATUTS_VALIDES.includes(statut) ? statut : 'planifie';
    const [result] = await db.pool.execute(
      `INSERT INTO events (nom, date_heure, lieu, statut)
       VALUES (?, ?, ?, ?)`,
      [nom.trim(), date_heure, lieu.trim(), statutFinal]
    );
    return result.insertId;
  },

  /**
   * Met à jour un événement.
   * @param {number} id
   * @param {{ nom: string, date_heure: string, lieu: string, statut?: string }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { nom, date_heure, lieu, statut = 'planifie' }) {
    const statutFinal = STATUTS_VALIDES.includes(statut) ? statut : 'planifie';
    const [result] = await db.pool.execute(
      `UPDATE events
          SET nom = ?, date_heure = ?, lieu = ?, statut = ?, updated_at = NOW()
        WHERE id = ?`,
      [nom.trim(), date_heure, lieu.trim(), statutFinal, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Retourne tous les événements avec leur nombre d'inscrits,
   * en une seule requête SQL (évite le problème N+1).
   * @returns {Promise<Array>}
   */
  async findAllWithRegistrationCount() {
    const [rows] = await db.pool.execute(
      `SELECT e.id, e.nom, e.date_heure, e.lieu, e.statut,
              e.created_at, e.updated_at,
              COUNT(er.id) AS registrationCount
         FROM events e
         LEFT JOIN event_registrations er ON er.event_id = e.id
         GROUP BY e.id
         ORDER BY e.date_heure DESC`
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
  STATUTS_VALIDES,
};

module.exports = Event;
