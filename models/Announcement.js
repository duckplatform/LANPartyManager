'use strict';

/**
 * Modèle Annonce
 * CRUD sur la table `announcements`
 */

const db = require('../config/database');

const Announcement = {

  /**
   * Retourne toutes les annonces (admin : brouillons + publiées)
   * @param {{ onlyPublished?: boolean }} [opts]
   * @returns {Promise<Array>}
   */
  async findAll({ onlyPublished = false } = {}) {
    const where = onlyPublished ? "WHERE status = 'published'" : '';
    const [rows] = await db.pool.execute(
      `SELECT id, title, status, created_at, updated_at
         FROM announcements
         ${where}
         ORDER BY created_at DESC`
    );
    return rows;
  },

  /**
   * Retourne les N dernières annonces publiées (pour la page d'accueil)
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async findLatestPublished(limit = 3) {
    // Certains environnements MySQL échouent avec LIMIT paramétré en prepared statement.
    // On normalise donc la valeur et on l'injecte en entier borné.
    const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 3));

    const runQuery = typeof db.pool.query === 'function'
      ? db.pool.query.bind(db.pool)
      : db.pool.execute.bind(db.pool);

    const [rows] = await runQuery(
      `SELECT id, title, content, created_at
         FROM announcements
         WHERE status = 'published'
         ORDER BY created_at DESC
         LIMIT ${safeLimit}`
    );
    return rows;
  },

  /**
   * Trouve une annonce par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await db.pool.execute(
      'SELECT * FROM announcements WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Crée une nouvelle annonce
   * @param {{ titre: string, contenu: string, statut: string }} data
   * @returns {Promise<number>} ID de la nouvelle annonce
   */
  async create({ title, content, status = 'draft' }) {
    const [result] = await db.pool.execute(
      `INSERT INTO announcements (title, content, status)
       VALUES (?, ?, ?)`,
      [title.trim(), content, status]
    );
    return result.insertId;
  },

  /**
   * Met à jour une annonce
   * @param {number} id
   * @param {{ titre: string, contenu: string, statut: string }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { title, content, status }) {
    const [result] = await db.pool.execute(
      `UPDATE announcements
          SET title = ?, content = ?, status = ?, updated_at = NOW()
        WHERE id = ?`,
      [title.trim(), content, status, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Supprime une annonce
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await db.pool.execute(
      'DELETE FROM announcements WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Compte le nombre total d'annonces (publiées + brouillons)
   * @returns {Promise<number>}
   */
  async count() {
    const [rows] = await db.pool.execute(
      'SELECT COUNT(*) AS total FROM announcements'
    );
    return rows[0].total;
  },

  /**
   * Compte uniquement les annonces publiées
   * @returns {Promise<number>}
   */
  async countPublished() {
    const [rows] = await db.pool.execute(
      "SELECT COUNT(*) AS total FROM announcements WHERE status = 'published'"
    );
    return rows[0].total;
  },
};

module.exports = Announcement;
