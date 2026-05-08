'use strict';

/**
 * Modèle Game — Jeux disponibles pour les rencontres
 * CRUD sur la table `games`
 * Types de rencontre : '1v1' | '2v2' | 'solo'
 */

const db = require('../config/database');

/** Types de rencontre autorisés */
const MATCH_TYPES = ['1v1', '2v2', 'solo'];

const Game = {

  /**
   * Retourne tous les jeux, triés par nom
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await db.pool.execute(
      `SELECT id, name, console, match_type, created_at, updated_at
         FROM games
         ORDER BY name ASC`
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
   * @param {'1v1'|'2v2'|'solo'} typeRencontre
   * @returns {Promise<Array>}
   */
  async findByType(matchType) {
    const [rows] = await db.pool.execute(
      `SELECT id, name, console, match_type
         FROM games
        WHERE match_type = ?
        ORDER BY name ASC`,
      [matchType]
    );
    return rows;
  },

  /**
   * Crée un nouveau jeu
   * @param {{ nom: string, console: string, type_rencontre?: string }} data
   * @returns {Promise<number>} ID du nouveau jeu
   */
  async create({ name, console: consoleName, match_type = '1v1' }) {
    const typeFinal = MATCH_TYPES.includes(match_type) ? match_type : '1v1';
    const [result] = await db.pool.execute(
      `INSERT INTO games (name, console, match_type)
       VALUES (?, ?, ?)`,
      [name.trim(), consoleName.trim(), typeFinal]
    );
    return result.insertId;
  },

  /**
   * Met à jour un jeu
   * @param {number} id
   * @param {{ nom: string, console: string, type_rencontre?: string }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { name, console: consoleName, match_type = '1v1' }) {
    const typeFinal = MATCH_TYPES.includes(match_type) ? match_type : '1v1';
    const [result] = await db.pool.execute(
      `UPDATE games
          SET name = ?, console = ?, match_type = ?, updated_at = NOW()
        WHERE id = ?`,
      [name.trim(), consoleName.trim(), typeFinal, id]
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
  MATCH_TYPES,
};

module.exports = Game;
