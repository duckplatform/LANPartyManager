'use strict';

/**
 * Modèle Game — Jeux disponibles pour les rencontres
 * CRUD sur la table `games`
 * Types de rencontre : '1v1' | '2v2'
 */

const db = require('../config/database');

/** Types de rencontre autorisés */
const TYPES_RENCONTRE = ['1v1', '2v2'];

const Game = {

  /**
   * Retourne tous les jeux, triés par nom
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await db.pool.execute(
      `SELECT id, nom, console, type_rencontre, created_at, updated_at
         FROM games
         ORDER BY nom ASC`
    );
    return rows;
  },

  /**
   * Trouve un jeu par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await db.pool.execute(
      'SELECT * FROM games WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Retourne les jeux filtrés par type de rencontre
   * @param {'1v1'|'2v2'} typeRencontre
   * @returns {Promise<Array>}
   */
  async findByType(typeRencontre) {
    const [rows] = await db.pool.execute(
      `SELECT id, nom, console, type_rencontre
         FROM games
        WHERE type_rencontre = ?
        ORDER BY nom ASC`,
      [typeRencontre]
    );
    return rows;
  },

  /**
   * Crée un nouveau jeu
   * @param {{ nom: string, console: string, type_rencontre?: string }} data
   * @returns {Promise<number>} ID du nouveau jeu
   */
  async create({ nom, console: consoleName, type_rencontre = '1v1' }) {
    const typeFinal = TYPES_RENCONTRE.includes(type_rencontre) ? type_rencontre : '1v1';
    const [result] = await db.pool.execute(
      `INSERT INTO games (nom, console, type_rencontre)
       VALUES (?, ?, ?)`,
      [nom.trim(), consoleName.trim(), typeFinal]
    );
    return result.insertId;
  },

  /**
   * Met à jour un jeu
   * @param {number} id
   * @param {{ nom: string, console: string, type_rencontre?: string }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { nom, console: consoleName, type_rencontre = '1v1' }) {
    const typeFinal = TYPES_RENCONTRE.includes(type_rencontre) ? type_rencontre : '1v1';
    const [result] = await db.pool.execute(
      `UPDATE games
          SET nom = ?, console = ?, type_rencontre = ?, updated_at = NOW()
        WHERE id = ?`,
      [nom.trim(), consoleName.trim(), typeFinal, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Supprime un jeu par son ID
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await db.pool.execute(
      'DELETE FROM games WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Compte le nombre total de jeux
   * @returns {Promise<number>}
   */
  async count() {
    const [rows] = await db.pool.execute(
      'SELECT COUNT(*) AS total FROM games'
    );
    return rows[0].total;
  },

  /** Types de rencontre autorisés */
  TYPES_RENCONTRE,
};

module.exports = Game;
