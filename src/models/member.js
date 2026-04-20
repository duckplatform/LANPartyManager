const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Find a member by their email address.
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [email]);
  return rows[0] || null;
}

/**
 * Find a member by their ID.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [id]);
  return rows[0] || null;
}

/**
 * Create a new member.
 * @param {Object} data - { nom, prenom, surnom, email, password }
 * @returns {Promise<Object>} The created member (without password)
 */
async function create({ nom, prenom, surnom, email, password }) {
  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const [result] = await pool.query(
    `INSERT INTO members (nom, prenom, surnom, email, password, role)
     VALUES (?, ?, ?, ?, ?, 'member')`,
    [nom, prenom, surnom, email, hashed]
  );
  return findById(result.insertId);
}

/**
 * Update member information (excluding password).
 * @param {number} id
 * @param {Object} data - Partial { nom, prenom, surnom, email }
 * @returns {Promise<Object>} The updated member (without password)
 */
async function update(id, { nom, prenom, surnom, email }) {
  const fields = [];
  const values = [];

  if (nom !== undefined) { fields.push('nom = ?'); values.push(nom); }
  if (prenom !== undefined) { fields.push('prenom = ?'); values.push(prenom); }
  if (surnom !== undefined) { fields.push('surnom = ?'); values.push(surnom); }
  if (email !== undefined) { fields.push('email = ?'); values.push(email); }

  if (fields.length === 0) return findById(id);

  values.push(id);
  await pool.query(`UPDATE members SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(id);
}

/**
 * Update a member's password.
 * @param {number} id
 * @param {string} newPassword  Plain-text new password
 */
async function updatePassword(id, newPassword) {
  const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await pool.query('UPDATE members SET password = ? WHERE id = ?', [hashed, id]);
}

/**
 * Return all members (admin use), excluding passwords.
 * @returns {Promise<Array>}
 */
async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, nom, prenom, surnom, email, role, created_at, updated_at FROM members ORDER BY id'
  );
  return rows;
}

/**
 * Delete a member by ID.
 * @param {number} id
 */
async function remove(id) {
  await pool.query('DELETE FROM members WHERE id = ?', [id]);
}

/**
 * Strip the password field from a member object.
 * @param {Object} member
 * @returns {Object}
 */
function sanitize(member) {
  if (!member) return null;
  const { password, ...safe } = member;
  return safe;
}

module.exports = { findByEmail, findById, create, update, updatePassword, findAll, remove, sanitize };
