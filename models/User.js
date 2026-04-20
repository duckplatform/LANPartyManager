/**
 * Modèle utilisateur
 */
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

class User {
  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, avatar, bio, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    return rows[0] || null;
  }

  static async findByUsername(username) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    return rows[0] || null;
  }

  static async create({ username, email, password, role = 'user' }) {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email.toLowerCase(), password_hash, role]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.username !== undefined) { fields.push('username = ?'); values.push(data.username); }
    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email.toLowerCase()); }
    if (data.password !== undefined) {
      const hash = await bcrypt.hash(data.password, SALT_ROUNDS);
      fields.push('password_hash = ?');
      values.push(hash);
    }
    if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
    if (data.bio !== undefined) { fields.push('bio = ?'); values.push(data.bio); }
    if (data.avatar !== undefined) { fields.push('avatar = ?'); values.push(data.avatar); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active); }

    if (fields.length === 0) return;

    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }

  static async delete(id) {
    await pool.query('DELETE FROM users WHERE id = ?', [id]);
  }

  static async findAll({ page = 1, limit = 20, search = '' } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, username, email, role, is_active, created_at FROM users';
    const params = [];

    if (search) {
      query += ' WHERE username LIKE ? OR email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  }

  static async count() {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM users');
    return rows[0].total;
  }
}

module.exports = User;
