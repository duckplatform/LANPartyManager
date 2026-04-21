/**
 * Modèle Utilisateur
 * Gère toutes les opérations liées aux utilisateurs en base de données
 */
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const logger = require('../config/logger');

const SALT_ROUNDS = 12;

const User = {
  /**
   * Crée un nouvel utilisateur
   * @param {Object} userData - Données de l'utilisateur
   * @returns {Promise<Object>} L'utilisateur créé
   */
  async create({ firstName, lastName, nickname, email, password, role = 'user' }) {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const sql = `
      INSERT INTO users (first_name, last_name, nickname, email, password, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [firstName, lastName, nickname, email, hashedPassword, role]);
    logger.info('Nouvel utilisateur créé', { userId: result.insertId, email });
    return this.findById(result.insertId);
  },

  /**
   * Trouve un utilisateur par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const rows = await query(
      'SELECT id, first_name, last_name, nickname, email, role, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Trouve un utilisateur par son email
   * @param {string} email
   * @returns {Promise<Object|null>} Inclut le hash du mot de passe
   */
  async findByEmail(email) {
    const rows = await query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0] || null;
  },

  /**
   * Récupère tous les utilisateurs (sans les mots de passe)
   * @returns {Promise<Array>}
   */
  async findAll() {
    return query(
      'SELECT id, first_name, last_name, nickname, email, role, created_at, updated_at FROM users ORDER BY created_at DESC'
    );
  },

  /**
   * Met à jour le profil d'un utilisateur
   * @param {number} id
   * @param {Object} userData
   * @returns {Promise<Object>} L'utilisateur mis à jour
   */
  async update(id, { firstName, lastName, nickname, email }) {
    await query(
      'UPDATE users SET first_name = ?, last_name = ?, nickname = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [firstName, lastName, nickname, email, id]
    );
    logger.info('Profil utilisateur mis à jour', { userId: id });
    return this.findById(id);
  },

  /**
   * Met à jour le mot de passe d'un utilisateur
   * @param {number} id
   * @param {string} newPassword
   */
  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
    logger.info('Mot de passe mis à jour', { userId: id });
  },

  /**
   * Supprime un utilisateur par son ID
   * @param {number} id
   */
  async delete(id) {
    await query('DELETE FROM users WHERE id = ?', [id]);
    logger.info('Utilisateur supprimé', { userId: id });
  },

  /**
   * Met à jour le rôle d'un utilisateur
   * @param {number} id
   * @param {string} role - 'user' ou 'admin'
   */
  async updateRole(id, role) {
    await query(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, id]
    );
    logger.info('Rôle utilisateur mis à jour', { userId: id, role });
  },

  /**
   * Vérifie si un email est déjà utilisé (optionnel : ignorer un ID)
   * @param {string} email
   * @param {number|null} excludeId
   * @returns {Promise<boolean>}
   */
  async emailExists(email, excludeId = null) {
    let sql = 'SELECT id FROM users WHERE email = ?';
    const params = [email];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const rows = await query(sql, params);
    return rows.length > 0;
  },

  /**
   * Vérifie un mot de passe contre le hash stocké
   * @param {string} plainPassword
   * @param {string} hashedPassword
   * @returns {Promise<boolean>}
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
  },

  /**
   * Compte le nombre total d'utilisateurs
   * @returns {Promise<number>}
   */
  async count() {
    const rows = await query('SELECT COUNT(*) as total FROM users');
    return rows[0].total;
  },

  /**
   * Compte les utilisateurs par rôle
   * @returns {Promise<Object>} { user: number, admin: number }
   */
  async countByRole() {
    const rows = await query(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );
    return rows.reduce((acc, row) => {
      acc[row.role] = row.count;
      return acc;
    }, {});
  },
};

module.exports = User;
