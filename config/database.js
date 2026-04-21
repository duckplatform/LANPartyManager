'use strict';

/**
 * Configuration de la connexion à la base de données MySQL
 * Les variables d'environnement sont définies dans cPanel (pas de dotenv)
 */

const mysql = require('mysql2/promise');

// Création du pool de connexions MySQL
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'lanpartymanager',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Activer la reconnexion automatique
  enableKeepAlive:    true,
  keepAliveInitialDelay: 0,
  // Timezone UTC pour cohérence
  timezone: 'Z',
});

/**
 * Teste la connexion à la base de données au démarrage
 * @returns {Promise<void>}
 */
async function testConnection() {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.ping();
    console.log('[DB] Connexion MySQL établie avec succès.');
  } catch (err) {
    console.error('[DB] Impossible de se connecter à MySQL :', err.message);
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { pool, testConnection };
