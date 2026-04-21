/**
 * Configuration et connexion à la base de données MySQL
 * Utilise mysql2 avec gestion du pool de connexions
 */
const mysql = require('mysql2/promise');
const logger = require('./logger');

// Création du pool de connexions MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lan_party_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: '+00:00',
});

/**
 * Teste la connexion à la base de données
 * @returns {Promise<boolean>} true si la connexion est établie
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    logger.info('✅ Connexion MySQL établie avec succès');
    return true;
  } catch (err) {
    logger.error('❌ Impossible de se connecter à MySQL :', err.message);
    return false;
  }
}

/**
 * Exécute une requête SQL avec paramètres
 * @param {string} sql - La requête SQL
 * @param {Array} params - Les paramètres de la requête
 * @returns {Promise<Array>} Les résultats de la requête
 */
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    logger.error('Erreur SQL :', { sql, error: err.message });
    throw err;
  }
}

module.exports = { pool, query, testConnection };
