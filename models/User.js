'use strict';

/**
 * Modèle Utilisateur
 * CRUD sur la table `users` avec hachage bcrypt des mots de passe
 */

const bcrypt  = require('bcryptjs');
const { randomUUID } = require('crypto');
const db      = require('../config/database');
const BCRYPT_ROUNDS = 12;

const User = {

  /**
   * Trouve un utilisateur par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await db.pool.execute(
      'SELECT id, nom, prenom, pseudo, email, is_admin, is_moderator, badge_token, discord_user_id, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Trouve un utilisateur par son adresse e-mail
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    const [rows] = await db.pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );
    return rows[0] || null;
  },

  /**
   * Crée un nouvel utilisateur (mot de passe haché automatiquement)
   * @param {Object} data - { nom, prenom, pseudo, email, password, is_admin?, is_moderator? }
   * @returns {Promise<number>} ID du nouvel utilisateur
   */
  async create({ nom, prenom, pseudo, email, password, is_admin = false, is_moderator = false }) {
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const badgeToken = randomUUID();
    const [result] = await db.pool.execute(
      `INSERT INTO users (nom, prenom, pseudo, email, password, is_admin, is_moderator, badge_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom.trim(), prenom.trim(), pseudo.trim(), email.toLowerCase().trim(), hashedPassword, is_admin ? 1 : 0, is_moderator ? 1 : 0, badgeToken]
    );
    return result.insertId;
  },

  /**
   * Met à jour les informations d'un utilisateur
   * @param {number} id
   * @param {Object} data - champs à mettre à jour
   * @returns {Promise<boolean>} succès
   */
  async update(id, { nom, prenom, pseudo, email, discord_user_id }) {
    // Valide que discord_user_id est un Snowflake numérique ou null
    const discordId = discord_user_id && /^\d{15,20}$/.test(discord_user_id.trim())
      ? discord_user_id.trim()
      : null;
    const [result] = await db.pool.execute(
      `UPDATE users SET nom = ?, prenom = ?, pseudo = ?, email = ?, discord_user_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [nom.trim(), prenom.trim(), pseudo.trim(), email.toLowerCase().trim(), discordId, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Change le mot de passe d'un utilisateur
   * @param {number} id
   * @param {string} newPassword - mot de passe en clair
   * @returns {Promise<boolean>}
   */
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const [result] = await db.pool.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Vérifie un mot de passe en clair contre le hash stocké
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Retourne tous les utilisateurs (sans mot de passe)
   * @returns {Promise<Array>}
   */
  async findAll() {
    const [rows] = await db.pool.execute(
      'SELECT id, nom, prenom, pseudo, email, is_admin, is_moderator, badge_token, discord_user_id, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  },

  /**
   * Supprime un utilisateur par son ID
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await db.pool.execute('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  /**
   * Met à jour le statut admin d'un utilisateur
   * @param {number} id
   * @param {boolean} isAdmin
   * @returns {Promise<boolean>}
   */
  async setAdmin(id, isAdmin) {
    const [result] = await db.pool.execute(
      'UPDATE users SET is_admin = ?, updated_at = NOW() WHERE id = ?',
      [isAdmin ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Met à jour le statut modérateur d'un utilisateur
   * @param {number} id
   * @param {boolean} isModerator
   * @returns {Promise<boolean>}
   */
  async setModerator(id, isModerator) {
    const [result] = await db.pool.execute(
      'UPDATE users SET is_moderator = ?, updated_at = NOW() WHERE id = ?',
      [isModerator ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Vérifie si un email est déjà utilisé (sauf par l'utilisateur avec excludeId)
   * @param {string} email
   * @param {number} [excludeId]
   * @returns {Promise<boolean>}
   */
  async emailExists(email, excludeId = null) {
    let query  = 'SELECT id FROM users WHERE email = ?';
    const params = [email.toLowerCase().trim()];
    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }
    const [rows] = await db.pool.execute(query, params);
    return rows.length > 0;
  },

  /**
   * Compte le nombre total d'utilisateurs
   * @returns {Promise<number>}
   */
  async count() {
    const [rows] = await db.pool.execute('SELECT COUNT(*) AS total FROM users');
    return rows[0].total;
  },

  /**
   * Trouve un utilisateur par son badge_token (QR code de membre)
   * @param {string} token - badge_token UUID
   * @returns {Promise<Object|null>}
   */
  async findByBadgeToken(token) {
    const [rows] = await db.pool.execute(
      'SELECT id, nom, prenom, pseudo, email, is_admin, is_moderator, badge_token, created_at FROM users WHERE badge_token = ?',
      [token]
    );
    return rows[0] || null;
  },

  /**
   * S'assure qu'un utilisateur possède un badge_token.
   * En génère un si absent (cas de migration partielle).
   * @param {number} id
   * @returns {Promise<string>} badge_token
   */
  async ensureBadgeToken(id) {
    const newToken = randomUUID();
    await db.pool.execute(
      'UPDATE users SET badge_token = ? WHERE id = ? AND (badge_token = \'\' OR badge_token IS NULL)',
      [newToken, id]
    );
    // Re-lit pour retourner la valeur finale (qu'elle soit nouvelle ou déjà existante)
    const [rows] = await db.pool.execute(
      'SELECT badge_token FROM users WHERE id = ?',
      [id]
    );
    return rows[0] ? rows[0].badge_token : newToken;
  },
};

module.exports = User;
