/**
 * Configuration de la connexion MySQL via pool
 * Utilise mysql2/promise pour les requêtes asynchrones
 */
const mysql = require('mysql2/promise');
const logger = require('./logger');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lan_party_manager',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  charset: 'utf8mb4'
});

// Test de la connexion au démarrage (uniquement hors tests)
if (process.env.NODE_ENV !== 'test') {
  pool.getConnection()
    .then(conn => {
      logger.info('✅ Connexion MySQL établie avec succès');
      conn.release();
    })
    .catch(err => {
      logger.error('❌ Impossible de se connecter à MySQL:', err.message);
    });
}

module.exports = pool;
