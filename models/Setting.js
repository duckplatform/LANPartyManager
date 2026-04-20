/**
 * Modèle pour les paramètres de l'application
 */
const pool = require('../config/database');

class Setting {
  /**
   * Récupère la valeur d'un paramètre
   */
  static async get(key) {
    const [rows] = await pool.query(
      'SELECT `value` FROM settings WHERE `key` = ?',
      [key]
    );
    return rows.length > 0 ? rows[0].value : null;
  }

  /**
   * Définit ou met à jour un paramètre
   */
  static async set(key, value) {
    await pool.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?, updated_at = NOW()',
      [key, value, value]
    );
  }

  /**
   * Récupère tous les paramètres sous forme d'objet
   */
  static async getAll() {
    const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    rows.forEach(row => { settings[row.key] = row.value; });
    return settings;
  }

  /**
   * Supprime un paramètre
   */
  static async delete(key) {
    await pool.query('DELETE FROM settings WHERE `key` = ?', [key]);
  }
}

module.exports = Setting;
