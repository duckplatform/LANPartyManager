'use strict';

/**
 * Store de sessions express-session persistant en MySQL (table `sessions`).
 *
 * Remplace le MemoryStore par défaut d'express-session, inadapté à la
 * production : fuite mémoire, sessions perdues au redémarrage et non partagées
 * entre les processus Phusion Passenger (déconnexions et erreurs CSRF aléatoires).
 *
 * Réutilise le pool mysql2 de l'application. La table est créée à la première
 * utilisation si elle n'existe pas (elle figure aussi dans database/install.sql).
 */

const session = require('express-session');
const db      = require('./database');
const logger  = require('./logger');

/** Durée de vie par défaut d'une session sans date d'expiration de cookie */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
/** Intervalle de purge des sessions expirées */
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS \`sessions\` (
  \`session_id\` VARCHAR(128) NOT NULL,
  \`expires\`    INT UNSIGNED NOT NULL,
  \`data\`       MEDIUMTEXT   NOT NULL,
  PRIMARY KEY (\`session_id\`),
  KEY \`idx_sessions_expires\` (\`expires\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

/**
 * Relie une promesse à un callback Node (err, value) attendu par express-session.
 * @param {Promise<*>} promise
 * @param {Function} [cb]
 */
function callbackify(promise, cb) {
  promise.then(
    (value) => { if (cb) cb(null, value); },
    (err)   => { if (cb) cb(err); }
  );
}

class MySQLSessionStore extends session.Store {
  /**
   * @param {{ ttlMs?: number, cleanupIntervalMs?: number }} [options]
   */
  constructor({ ttlMs = DEFAULT_TTL_MS, cleanupIntervalMs = CLEANUP_INTERVAL_MS } = {}) {
    super();
    this.ttlMs  = ttlMs;
    this._ready = null;

    if (cleanupIntervalMs > 0) {
      this._cleanupTimer = setInterval(() => {
        this.clearExpired().catch((err) => {
          logger.warn('[SESSIONS] Purge des sessions expirées impossible :', err.message);
        });
      }, cleanupIntervalMs);
      if (typeof this._cleanupTimer.unref === 'function') {
        this._cleanupTimer.unref();
      }
    }
  }

  /** Crée la table au premier accès (réessaie si la BDD était indisponible). */
  _ensureTable() {
    if (!this._ready) {
      this._ready = db.pool.execute(CREATE_TABLE_SQL).catch((err) => {
        this._ready = null;
        throw err;
      });
    }
    return this._ready;
  }

  /** Timestamp (secondes) d'expiration d'une session, aligné sur son cookie. */
  _expiresFor(sess) {
    const cookieExpires = sess && sess.cookie && sess.cookie.expires;
    const expiresMs = cookieExpires
      ? new Date(cookieExpires).getTime()
      : Date.now() + this.ttlMs;
    return Math.floor(expiresMs / 1000);
  }

  get(sid, cb) {
    callbackify((async () => {
      await this._ensureTable();
      const [rows] = await db.pool.execute(
        'SELECT `data` FROM `sessions` WHERE `session_id` = ? AND `expires` > ?',
        [sid, nowSeconds()]
      );
      return rows[0] ? JSON.parse(rows[0].data) : null;
    })(), cb);
  }

  set(sid, sess, cb) {
    callbackify((async () => {
      await this._ensureTable();
      await db.pool.execute(
        `INSERT INTO \`sessions\` (\`session_id\`, \`expires\`, \`data\`) VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE \`expires\` = VALUES(\`expires\`), \`data\` = VALUES(\`data\`)`,
        [sid, this._expiresFor(sess), JSON.stringify(sess)]
      );
    })(), cb);
  }

  touch(sid, sess, cb) {
    callbackify((async () => {
      await this._ensureTable();
      await db.pool.execute(
        'UPDATE `sessions` SET `expires` = ? WHERE `session_id` = ?',
        [this._expiresFor(sess), sid]
      );
    })(), cb);
  }

  destroy(sid, cb) {
    callbackify((async () => {
      await this._ensureTable();
      await db.pool.execute('DELETE FROM `sessions` WHERE `session_id` = ?', [sid]);
    })(), cb);
  }

  /** Supprime les sessions expirées. */
  async clearExpired() {
    await this._ensureTable();
    await db.pool.execute('DELETE FROM `sessions` WHERE `expires` <= ?', [nowSeconds()]);
  }

  /**
   * Supprime toutes les sessions d'un utilisateur, sauf éventuellement une.
   * @param {number} userId
   * @param {string|null} [exceptSid]
   * @returns {Promise<void>}
   */
  async destroyUserSessions(userId, exceptSid = null) {
    await this._ensureTable();
    await db.pool.execute(
      `DELETE FROM \`sessions\`
        WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(\`data\`, '$.userId')) AS UNSIGNED) = ?
          AND \`session_id\` <> ?`,
      [userId, exceptSid || '']
    );
  }
}

/**
 * Déconnecte un utilisateur de toutes ses autres sessions (ex. après un
 * changement de mot de passe). Utilise destroyUserSessions() du store MySQL,
 * ou à défaut all()/destroy() (MemoryStore utilisé en test).
 * @param {Object} store      — req.sessionStore
 * @param {number} userId
 * @param {string} currentSid — session à conserver (req.sessionID)
 * @returns {Promise<void>}
 */
async function destroyOtherUserSessions(store, userId, currentSid) {
  if (!store) return;

  if (typeof store.destroyUserSessions === 'function') {
    await store.destroyUserSessions(userId, currentSid);
    return;
  }

  if (typeof store.all !== 'function') return;

  const sessions = await new Promise((resolve, reject) => {
    store.all((err, all) => (err ? reject(err) : resolve(all || {})));
  });
  const sids = Object.keys(sessions).filter(
    sid => sid !== currentSid && sessions[sid] && Number(sessions[sid].userId) === Number(userId)
  );
  await Promise.all(sids.map(sid => new Promise((resolve, reject) => {
    store.destroy(sid, err => (err ? reject(err) : resolve()));
  })));
}

module.exports = { MySQLSessionStore, destroyOtherUserSessions };
