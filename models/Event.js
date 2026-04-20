/**
 * Modèle événements LAN
 */
const pool = require('../config/database');
const slugify = require('slugify');

class Event {
  static async findAll({ page = 1, limit = 10, published_only = true } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM events';
    const params = [];

    if (published_only) {
      query += ' WHERE is_published = 1';
    }

    query += ' ORDER BY start_date DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findActive() {
    const [rows] = await pool.query(
      'SELECT * FROM events WHERE is_active = 1 AND is_published = 1 ORDER BY start_date ASC LIMIT 1'
    );
    return rows[0] || null;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM events WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await pool.query(
      'SELECT * FROM events WHERE slug = ? AND is_published = 1',
      [slug]
    );
    return rows[0] || null;
  }

  static async create(data) {
    let slug = slugify(data.title, { lower: true, strict: true });
    const [existing] = await pool.query('SELECT id FROM events WHERE slug LIKE ?', [`${slug}%`]);
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;

    const [result] = await pool.query(
      `INSERT INTO events (title, slug, description, location, start_date, end_date,
        max_participants, is_active, is_published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title, slug, data.description || null, data.location || null,
        data.start_date || null, data.end_date || null,
        data.max_participants || 0,
        data.is_active ? 1 : 0,
        data.is_published ? 1 : 0
      ]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?'); values.push(data.title);
      let slug = slugify(data.title, { lower: true, strict: true });
      const [existing] = await pool.query('SELECT id FROM events WHERE slug LIKE ? AND id != ?', [`${slug}%`, id]);
      if (existing.length > 0) slug = `${slug}-${Date.now()}`;
      fields.push('slug = ?'); values.push(slug);
    }
    if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
    if (data.location !== undefined) { fields.push('location = ?'); values.push(data.location); }
    if (data.start_date !== undefined) { fields.push('start_date = ?'); values.push(data.start_date); }
    if (data.end_date !== undefined) { fields.push('end_date = ?'); values.push(data.end_date); }
    if (data.max_participants !== undefined) { fields.push('max_participants = ?'); values.push(data.max_participants); }
    if (data.is_active !== undefined) { fields.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
    if (data.is_published !== undefined) { fields.push('is_published = ?'); values.push(data.is_published ? 1 : 0); }

    if (fields.length === 0) return;
    values.push(id);
    await pool.query(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id) {
    await pool.query('DELETE FROM events WHERE id = ?', [id]);
  }

  static async register(eventId, userId) {
    await pool.query(
      'INSERT IGNORE INTO event_registrations (event_id, user_id) VALUES (?, ?)',
      [eventId, userId]
    );
  }

  static async unregister(eventId, userId) {
    await pool.query(
      'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
  }

  static async isRegistered(eventId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
      [eventId, userId]
    );
    return rows.length > 0;
  }

  static async getRegistrations(eventId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.avatar, er.registered_at
       FROM event_registrations er
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = ?
       ORDER BY er.registered_at ASC`,
      [eventId]
    );
    return rows;
  }

  static async count() {
    const [rows] = await pool.query('SELECT COUNT(*) as total FROM events');
    return rows[0].total;
  }
}

module.exports = Event;
