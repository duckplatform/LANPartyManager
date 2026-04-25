'use strict';

/**
 * Modele EventRanking
 * Gere le recalcul du classement de points pour un evenement.
 */

const db = require('../config/database');

const POINTS_BY_TYPE = {
  solo: 1,
  '1v1': 2,
  '2v2': 3,
};

const EventRanking = {

  /**
   * Retourne les points attribues pour un type de rencontre.
   * @param {'solo'|'1v1'|'2v2'} typeRencontre
   * @returns {number}
   */
  pointsForType(typeRencontre) {
    return POINTS_BY_TYPE[typeRencontre] || 0;
  },

  /**
   * Recalcule entierement le classement d'un evenement.
   * - Supprime l'ancien snapshot
   * - Recalcule points/wins/battles depuis les rencontres terminees
   * @param {number} eventId
   * @returns {Promise<void>}
   */
  async recalculateForEvent(eventId) {
    const connection = await db.pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'DELETE FROM event_rankings WHERE event_id = ?',
        [eventId]
      );

      await connection.execute(
        `INSERT INTO event_rankings (event_id, user_id, points, wins, battles_played)
         SELECT
           b.event_id,
           bp.user_id,
           SUM(
             CASE g.type_rencontre
               WHEN 'solo' THEN 1
               WHEN '1v1'  THEN 2
               WHEN '2v2'  THEN 3
               ELSE 0
             END
           ) AS points,
           COUNT(*) AS wins,
           (
             SELECT COUNT(*)
             FROM battle_players bp2
             JOIN battles b2 ON b2.id = bp2.battle_id
             WHERE bp2.user_id = bp.user_id
               AND b2.event_id = b.event_id
               AND b2.statut = 'termine'
           ) AS battles_played
         FROM battles b
         JOIN games g ON g.id = b.game_id
         JOIN battle_players bp ON bp.battle_id = b.id
         WHERE b.event_id = ?
           AND b.statut = 'termine'
           AND bp.est_gagnant = 1
         GROUP BY b.event_id, bp.user_id`,
        [eventId]
      );

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },

  /**
   * Retourne le classement d'un evenement, trie par points decroissants.
   * @param {number} eventId
   * @param {number} [limit]
   * @returns {Promise<Array>}
   */
  async findByEvent(eventId, limit = null) {
    const params = [eventId];
    let limitClause = '';

    if (Number.isInteger(limit) && limit > 0) {
      // Certains serveurs MySQL refusent LIMIT parametre en prepared statement.
      // On injecte un entier deja valide pour garantir la compatibilite.
      limitClause = `LIMIT ${limit}`;
    }

    const [rows] = await db.pool.execute(
      `SELECT er.event_id, er.user_id, er.points, er.wins, er.battles_played,
              u.pseudo, u.discord_user_id
         FROM event_rankings er
         JOIN users u ON u.id = er.user_id
        WHERE er.event_id = ?
        ORDER BY er.points DESC, er.wins DESC, u.pseudo ASC
        ${limitClause}`,
      params
    );

    return rows.map((row, index) => ({
      rang: index + 1,
      ...row,
    }));
  },
};

module.exports = EventRanking;
