/**
 * Configuration de la connexion MySQL via pool
 * Utilise mysql2/promise pour les requêtes asynchrones.
 *
 * Le pool peut être réinitialisé dynamiquement via reinitPool()
 * après que l'assistant d'installation ait écrit le fichier .env,
 * ce qui évite tout redémarrage manuel du serveur.
 */
const mysql = require('mysql2/promise');
const logger = require('./logger');

/**
 * Crée un pool MySQL à partir des variables d'environnement ou
 * d'une configuration explicite passée en paramètre.
 * @param {object} [config] - Configuration optionnelle (écrase les env vars)
 */
function createPool(config = {}) {
  return mysql.createPool({
    host:     config.host     || process.env.DB_HOST     || 'localhost',
    port:     parseInt(config.port || process.env.DB_PORT || 3306),
    user:     config.user     || process.env.DB_USER     || 'root',
    password: config.password !== undefined ? config.password : (process.env.DB_PASSWORD || ''),
    database: config.database || process.env.DB_NAME     || 'lan_party_manager',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4'
  });
}

let pool = createPool();

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

/**
 * Réinitialise le pool avec une nouvelle configuration.
 * Appelé par l'assistant d'installation après écriture du .env
 * afin que l'application soit opérationnelle sans redémarrage.
 * @param {object} config - { host, port, user, password, database }
 */
async function reinitPool(config) {
  // Fermer proprement l'ancien pool
  try { await pool.end(); } catch (e) {
    logger.debug('Fermeture de l\'ancien pool MySQL (ignorée):', e.message);
  }

  // Mettre à jour les variables d'environnement en mémoire
  if (config.host)     process.env.DB_HOST     = config.host;
  if (config.port)     process.env.DB_PORT     = String(config.port);
  if (config.user)     process.env.DB_USER     = config.user;
  if (config.password !== undefined) process.env.DB_PASSWORD = config.password;
  if (config.database) process.env.DB_NAME     = config.database;

  pool = createPool(config);
  logger.info('♻️  Pool MySQL réinitialisé avec la nouvelle configuration');

  // Vérifier la connexion
  const conn = await pool.getConnection();
  conn.release();
  logger.info('✅ Nouvelle connexion MySQL vérifiée');

  return pool;
}

/**
 * Proxy transparent : toutes les méthodes appelées sur l'export
 * sont déléguées au pool courant, même après un reinitPool().
 */
const poolProxy = new Proxy({}, {
  get(_, prop) {
    if (prop === 'reinitPool') return reinitPool;
    const value = pool[prop];
    // Utiliser une closure qui lit `pool` au moment de l'appel, pas au moment du bind,
    // afin que les méthodes soient toujours exécutées sur le pool courant après reinitPool().
    return typeof value === 'function' ? (...args) => pool[prop](...args) : value;
  }
});

module.exports = poolProxy;
