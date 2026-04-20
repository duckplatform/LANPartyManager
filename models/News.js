/**
 * Modèle actualités
 */
const pool = require('../config/database');
const slugify = require('slugify');

class News {
  static async findAll({ page = 1, limit = 10, published_only = true } = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT n.*, u.username as author_name
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
    `;
    const params = [];

    if (published_only) {
      query += ' WHERE n.is_published = 1';
    }

    query += ' ORDER BY n.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT n.*, u.username as author_name
       FROM news n LEFT JOIN users u ON n.author_id = u.id
       WHERE n.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT n.*, u.username as author_name
       FROM news n LEFT JOIN users u ON n.author_id = u.id
       WHERE n.slug = ? AND n.is_published = 1`,
      [slug]
    );
    return rows[0] || null;
  }

  static async create({ title, content, excerpt, author_id, is_published = 0 }) {
    let slug = slugify(title, { lower: true, strict: true });
    const [existing] = await pool.query('SELECT id FROM news WHERE slug LIKE ?', [`${slug}%`]);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
    }

    const [result] = await pool.query(
      'INSERT INTO news (title, slug, content, excerpt, author_id, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [title, slug, content, excerpt || null, author_id, is_published ? 1 : 0]
    );
    return result.insertId;
  }

  static async update(id, data) {
    const fields = [];
    const values = [];

    if (data.title !== undefined) {
      fields.push('title = ?'); values.push(data.title);
      let slug = slugify(data.title, { lower: true, strict: true });
      const [existing] = await pool.query('SELECT id FROM news WHERE slug LIKE ? AND id != ?', [`${slug}%`, id]);
      if (existing.length > 0) slug = `${slug}-${Date.now()}`;
      fields.push('slug = ?'); values.push(slug);
    }
    if (data.content !== undefined) { fields.push('content = ?'); values.push(data.content); }
    if (data.excerpt !== undefined) { fields.push('excerpt = ?'); values.push(data.excerpt); }
    if (data.is_published !== undefined) { fields.push('is_published = ?'); values.push(data.is_published ? 1 : 0); }
    if (data.cover_image !== undefined) { fields.push('cover_image = ?'); values.push(data.cover_image); }

    if (fields.length === 0) return;
    values.push(id);
    await pool.query(`UPDATE news SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  static async delete(id) {
    await pool.query('DELETE FROM news WHERE id = ?', [id]);
  }

  static async count(published_only = false) {
    const query = published_only
      ? 'SELECT COUNT(*) as total FROM news WHERE is_published = 1'
      : 'SELECT COUNT(*) as total FROM news';
    const [rows] = await pool.query(query);
    return rows[0].total;
  }
}

module.exports = News;
