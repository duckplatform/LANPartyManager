'use strict';

/**
 * Modèle Battle — Rencontres entre joueurs
 * CRUD sur les tables `battles` et `battle_players`
 *
 * Statuts possibles :
 *   file_attente : aucune salle disponible, en attente dans la file
 *   planifie     : salle attribuée, planifiée (salle active et compatible, sans rencontre planifiée)
 *   installation : joueurs en train de s'installer dans la salle
 *   en_cours     : partie lancée
 *   termine      : partie terminée
 *
 * Logique de file d'attente :
 *   - À chaque création, annulation, changement de statut de rencontre → reevaluateQueue()
 *   - À chaque changement d'état d'une salle (actif/inactif, ajout/suppression) → reevaluateQueue()
 *   - Les rencontres en file_attente sont promues à 'planifie' si une salle est disponible
 *   - Une salle est disponible si elle est active, compatible avec le jeu,
 *     et n'a pas de battle déjà planifiée ou en cours/installation
 *   - Une salle attribuée ne peut plus changer (règle métier)
 */

const db = require('../config/database');

/** Statuts autorisés pour une battle */
const VALID_STATUSES = ['queue', 'planned', 'setup', 'in_progress', 'ended'];

function shouldReevaluateQueueOnStatus(newStatus) {
  return newStatus === 'setup' || newStatus === 'ended';
}

const Battle = {

  // ──────────────────────────────────────────────────────────────
  // Requêtes READ
  // ──────────────────────────────────────────────────────────────

  /**
   * Retourne toutes les rencontres d'un événement avec détails (jeu, salle, joueurs)
   * @param {number} eventId
   * @returns {Promise<Array>}
   */
  async findByEvent(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT b.id, b.event_id, b.game_id, b.room_id, b.status,
              b.score, b.notes, b.started_at, b.ended_at, b.created_at, b.updated_at,
              g.name AS game_name, g.console AS game_console, g.match_type,
              r.name AS room_name, r.type AS room_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.event_id = ?
        ORDER BY
          FIELD(b.status, 'in_progress','setup','planned','queue','ended'),
          b.created_at ASC`,
      [eventId]
    );

    // Charge les joueurs pour chaque battle
    for (const battle of rows) {
      battle.players = await Battle.findPlayers(battle.id);
    }

    return rows;
  },

  /**
   * Retourne les rencontres actives (non terminées) d'un événement
   * @param {number} eventId
   * @returns {Promise<Array>}
   */
  async findActiveByEvent(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT b.id, b.event_id, b.game_id, b.room_id, b.status,
              b.score, b.notes, b.started_at, b.ended_at, b.created_at, b.updated_at,
              g.name AS game_name, g.console AS game_console, g.match_type,
              r.name AS room_name, r.type AS room_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.event_id = ?
          AND b.status != 'ended'
        ORDER BY
          FIELD(b.status, 'in_progress','setup','planned','queue'),
          b.created_at ASC`,
      [eventId]
    );

    for (const battle of rows) {
      battle.players = await Battle.findPlayers(battle.id);
    }

    return rows;
  },

  /**
   * Trouve une rencontre par son ID avec ses détails complets
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await db.pool.execute(
      `SELECT b.id, b.event_id, b.game_id, b.room_id, b.status,
              b.score, b.notes, b.started_at, b.ended_at, b.created_at, b.updated_at,
              g.name AS game_name, g.console AS game_console, g.match_type,
              r.name AS room_name, r.type AS room_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    const battle = rows[0];
    battle.players = await Battle.findPlayers(id);
    return battle;
  },

  /**
   * Retourne les joueurs d'une rencontre
   * @param {number} battleId
   * @returns {Promise<Array>}
   */
  async findPlayers(battleId) {
    const [rows] = await db.pool.execute(
      `SELECT bp.id, bp.battle_id, bp.user_id, bp.team, bp.is_winner,
              u.username, u.last_name, u.first_name, u.discord_user_id
         FROM battle_players bp
         JOIN users u ON u.id = bp.user_id
        WHERE bp.battle_id = ?
        ORDER BY bp.team ASC, u.username ASC`,
      [battleId]
    );
    return rows;
  },

  /**
   * Retourne le conflit d'occupation de salle pour une rencontre, si present.
   * Utilise quand une transition vers installation/en_cours est refusee.
   * @param {number} battleId
   * @returns {Promise<Object|null>}
   */
  async findRoomConflict(battleId) {
    const [rows] = await db.pool.execute(
      `SELECT r.name AS room_name,
              b2.id AS conflicting_battle_id,
              b2.status AS conflicting_status
         FROM battles b
         JOIN rooms r ON r.id = b.room_id
         JOIN battles b2
           ON b2.room_id = b.room_id
          AND b2.id <> b.id
          AND b2.status IN ('setup', 'in_progress')
        WHERE b.id = ?
        LIMIT 1`,
      [battleId]
    );

    return rows[0] || null;
  },

  /**
   * Retourne la vue récapitulative pour l'écran d'annonce
   * (battles planifiées avec salle, triées par ordre de création)
   * @param {number} eventId
   * @returns {Promise<Array>}
   */
  async findForAnnounce(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT b.id, b.status, b.created_at, b.started_at, b.ended_at,
              g.name AS game_name, g.console AS game_console, g.match_type,
              r.name AS room_name, r.type AS room_type, b.score
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.event_id = ?
          AND b.status IN ('planned', 'setup', 'in_progress', 'ended')
        ORDER BY FIELD(b.status, 'in_progress','setup','planned','queue','ended'), b.created_at DESC`,
      [eventId]
    );

    for (const battle of rows) {
      battle.players = await Battle.findPlayers(battle.id);
    }

    return rows;
  },

  // ──────────────────────────────────────────────────────────────
  // Requêtes WRITE
  // ──────────────────────────────────────────────────────────────

  /**
   * Crée une nouvelle rencontre et ajoute les joueurs.
   * Tente immédiatement d'assigner une salle disponible.
   * @param {{ event_id: number, game_id: number, notes?: string }} battleData
   * @param {Array<{ user_id: number, equipe: number }>} players
   * @returns {Promise<number>} ID de la nouvelle rencontre
   */
  async create({ event_id, game_id, notes = null }, players) {
    const [result] = await db.pool.execute(
      `INSERT INTO battles (event_id, game_id, status, notes)
       VALUES (?, ?, 'queue', ?)`,
      [event_id, game_id, notes]
    );
    const battleId = result.insertId;

    // Ajoute les joueurs
    for (const p of players) {
      await db.pool.execute(
        `INSERT INTO battle_players (battle_id, user_id, team)
         VALUES (?, ?, ?)`,
        [battleId, p.user_id, p.team]
      );
    }

    // Tente d'assigner une salle
    await Battle.assignRoomIfAvailable(battleId, event_id, game_id);

    return battleId;
  },

  /**
   * Tente d'assigner une salle disponible à une rencontre en file_attente.
   * Une salle est disponible si :
   *   - Elle est active
   *   - Son type_rencontre correspond au jeu
   *   - Elle n'a aucune battle planifie, installation ou en_cours
   * Une salle attribuée ne change jamais (règle métier).
   * @param {number} battleId
   * @param {number} eventId
   * @param {number} gameId
   * @returns {Promise<boolean>} true si une salle a été attribuée
   */
  async assignRoomIfAvailable(battleId, eventId, gameId) {
    // Vérifie que la battle est bien en file_attente
    const [battleRows] = await db.pool.execute(
      `SELECT b.status, b.event_id, g.match_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
        WHERE b.id = ? AND b.game_id = ?`,
      [battleId, gameId]
    );
    if (!battleRows[0] || battleRows[0].status !== 'queue') return false;

    const targetEventId = battleRows[0].event_id || eventId;
    const matchType = battleRows[0].match_type;

    // Regle metier: une rencontre en file d'attente n'est pas traitable
    // si un de ses joueurs est deja engage sur une autre rencontre
    // planifie/installation/en_cours dans le meme evenement.
    const [conflicts] = await db.pool.execute(
      `SELECT COUNT(*) AS total
         FROM battle_players bp_wait
         JOIN battle_players bp_other
           ON bp_other.user_id = bp_wait.user_id
          AND bp_other.battle_id <> bp_wait.battle_id
         JOIN battles b_other ON b_other.id = bp_other.battle_id
        WHERE bp_wait.battle_id = ?
          AND b_other.event_id = ?
          AND b_other.status IN ('planned', 'setup', 'in_progress')`,
      [battleId, targetEventId]
    );

    if (conflicts[0] && conflicts[0].total > 0) return false;

    // Cherche une salle disponible pour planifier la prochaine rencontre.
    // Regle metier: une salle peut avoir au maximum
    // - 1 rencontre en cours/installation (en_cours ou installation)
    // - 1 rencontre planifiee (prochaine partie)
    const [rooms] = await db.pool.execute(
      `SELECT r.id,
              (
                SELECT COUNT(*) FROM battles b3
                 WHERE b3.room_id = r.id
                   AND b3.status IN ('setup', 'in_progress')
              ) AS active_count
         FROM rooms r
        WHERE r.event_id = ?
          AND r.match_type = ?
          AND r.is_active = 1
          AND NOT EXISTS (
            SELECT 1 FROM battles b2
             WHERE b2.room_id = r.id
               AND b2.status = 'planned'
          )
          AND (
            SELECT COUNT(*) FROM battles b3
             WHERE b3.room_id = r.id
               AND b3.status IN ('setup', 'in_progress')
          ) <= 1
        ORDER BY r.name ASC
        LIMIT 1`,
      [targetEventId, matchType]
    );

    if (!rooms[0]) return false;

    const roomId = rooms[0].id;
    const activeCount = Number(rooms[0].active_count) || 0;
    const nextStatus = activeCount === 0 ? 'setup' : 'planned';
    await db.pool.execute(
      `UPDATE battles SET room_id = ?, status = ?, updated_at = NOW()
        WHERE id = ? AND status = 'queue'`,
      [roomId, nextStatus, battleId]
    );
    return true;
  },

  /**
   * Réévalue la file d'attente pour un événement.
   * Appelé après chaque changement de statut de rencontre.
   * Parcourt les battles en file_attente par ordre de création et tente de leur attribuer une salle.
   * @param {number} eventId
    * @returns {Promise<number[]>} IDs des rencontres promues en planifie
   */
  async reevaluateQueue(eventId) {
    // Récupère les battles en file_attente, dans l'ordre de création
    const [waiting] = await db.pool.execute(
      `SELECT b.id, b.game_id
         FROM battles b
        WHERE b.event_id = ?
          AND b.status = 'queue'
        ORDER BY b.created_at ASC`,
      [eventId]
    );

    const promotedBattleIds = [];

    for (const battle of waiting) {
      const promoted = await Battle.assignRoomIfAvailable(battle.id, eventId, battle.game_id);
      if (promoted) {
        promotedBattleIds.push(battle.id);
      }
    }

    return promotedBattleIds;
  },

  /**
  * Change le statut d'une rencontre.
  * Déclenche la réévaluation de la file quand une salle libère un slot planifié
  * (passage en installation) ou une place active (passage en terminé).
   * @param {number} id
   * @param {'installation'|'en_cours'|'termine'} newStatut
   * @param {number} eventId — nécessaire pour reevaluateQueue
   * @returns {Promise<boolean>}
   */
  async changeStatus(id, newStatus, eventId) {
    const result = await Battle.changeStatusWithQueue(id, newStatus, eventId);
    return result.success;
  },

  /**
   * Variante détaillée de changeStatut qui expose les promotions de file d'attente.
   * Le passage en installation libère le slot "planifie" de la salle et doit donc
   * réévaluer la file, tout comme une fin de rencontre.
   * @param {number} id
   * @param {'installation'|'en_cours'|'termine'|'planifie'|'file_attente'} newStatut
   * @param {number} eventId
   * @returns {Promise<{success: boolean, promotedBattleIds: number[]}>}
   */
  async changeStatusWithQueue(id, newStatus, eventId) {
    if (!VALID_STATUSES.includes(newStatus)) {
      return { success: false, promotedBattleIds: [] };
    }

    let affectedRows = 0;

    // Verrouille la rencontre pour eviter qu'une meme salle passe en
    // setup/in_progress sur 2 battles en concurrence.
    if (newStatus === 'setup' || newStatus === 'in_progress') {
      const conn = await db.pool.getConnection();
      try {
        await conn.beginTransaction();

        const [battleRows] = await conn.execute(
          'SELECT id, room_id FROM battles WHERE id = ? FOR UPDATE',
          [id]
        );
        if (!battleRows[0] || !battleRows[0].room_id) {
          await conn.rollback();
          return { success: false, promotedBattleIds: [] };
        }

        const roomId = battleRows[0].room_id;
        const [busyRows] = await conn.execute(
          `SELECT COUNT(*) AS total
             FROM battles
            WHERE room_id = ?
              AND status IN ('setup', 'in_progress')
              AND id <> ?
            FOR UPDATE`,
          [roomId, id]
        );

        if ((busyRows[0] && busyRows[0].total > 0)) {
          await conn.rollback();
          return { success: false, promotedBattleIds: [] };
        }

        const [result] = await conn.execute(
          `UPDATE battles SET status = ?, started_at = IF(? = 'in_progress', NOW(), started_at), updated_at = NOW()
            WHERE id = ?`,
          [newStatus, newStatus, id]
        );
        affectedRows = result.affectedRows;

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } else {
      const [result] = await db.pool.execute(
        `UPDATE battles SET status = ?, started_at = IF(? = 'in_progress', NOW(), started_at), updated_at = NOW()
          WHERE id = ?`,
        [newStatus, newStatus, id]
      );
      affectedRows = result.affectedRows;
    }

    // Une rencontre qui passe en setup ou se termine peut libérer un slot.
    let promotedBattleIds = [];
    if (affectedRows > 0 && shouldReevaluateQueueOnStatus(newStatus)) {
      promotedBattleIds = await Battle.reevaluateQueue(eventId);
    }

    return { success: affectedRows > 0, promotedBattleIds };
  },

  /**
   * Enregistre le résultat d'une rencontre (score + gagnants)
   * @param {number} id
   * @param {string|null} score
   * @param {number[]} winnerIds — IDs des utilisateurs gagnants
   * @param {number} eventId
   * @returns {Promise<boolean>}
   */
  async setResult(id, score, winnerIds, eventId) {
    const result = await Battle.setResultWithQueue(id, score, winnerIds, eventId);
    return result.success;
  },

  /**
   * Variante détaillée de setResult qui expose les promotions de file d'attente.
   * @param {number} id
   * @param {string|null} score
   * @param {number[]} winnerIds
   * @param {number} eventId
   * @returns {Promise<{success: boolean, promotedBattleIds: number[]}>}
   */
  async setResultWithQueue(id, score, winnerIds, eventId) {
    // Met à jour le score et le statut
    const [result] = await db.pool.execute(
      `UPDATE battles SET score = ?, status = 'ended', ended_at = NOW(), updated_at = NOW()
        WHERE id = ?`,
      [score || null, id]
    );

    if (result.affectedRows === 0) {
      return { success: false, promotedBattleIds: [] };
    }

    // Réinitialise tous les gagnants à 0
    await db.pool.execute(
      'UPDATE battle_players SET is_winner = 0 WHERE battle_id = ?',
      [id]
    );

    // Marque les gagnants
    if (winnerIds && winnerIds.length > 0) {
      for (const userId of winnerIds) {
        await db.pool.execute(
          'UPDATE battle_players SET is_winner = 1 WHERE battle_id = ? AND user_id = ?',
          [id, userId]
        );
      }
    }

    // Automatise l'etape "Joueurs en place":
    // la prochaine rencontre planifiee dans la meme salle passe en installation.
    // Cela libere ensuite un slot planifie pour la file d'attente.
    let autoInstalledBattleId = null;
    const [roomRows] = await db.pool.execute(
      'SELECT room_id FROM battles WHERE id = ?',
      [id]
    );
    const roomId = roomRows[0] ? roomRows[0].room_id : null;

    if (roomId) {
      const [plannedRows] = await db.pool.execute(
        `SELECT id
           FROM battles
          WHERE event_id = ?
            AND room_id = ?
            AND status = 'planned'
          ORDER BY created_at ASC
          LIMIT 1`,
        [eventId, roomId]
      );

      if (plannedRows[0]) {
        const plannedBattleId = plannedRows[0].id;
        const [installResult] = await db.pool.execute(
          `UPDATE battles
              SET status = 'setup', updated_at = NOW()
            WHERE id = ?
              AND status = 'planned'
              AND (
                SELECT active_count FROM (
                  SELECT COUNT(*) AS active_count FROM battles bx
                   WHERE bx.room_id = ?
                     AND bx.status IN ('setup', 'in_progress')
                ) AS subq
              ) = 0`,
          [plannedBattleId, roomId]
        );

        if (installResult.affectedRows > 0) {
          autoInstalledBattleId = plannedBattleId;
        }
      }
    }

    // Réévalue la file d'attente
    const promotedBattleIds = await Battle.reevaluateQueue(eventId);

    return { success: true, promotedBattleIds, autoInstalledBattleId };
  },

  /**
   * Supprime une rencontre (uniquement si elle est en file_attente ou planifie)
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await db.pool.execute(
      `DELETE FROM battles
        WHERE id = ?
          AND status IN ('queue', 'planned')`,
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Compte les rencontres par statut pour un événement
   * @param {number} eventId
   * @returns {Promise<Object>} ex: { file_attente: 2, planifie: 1, en_cours: 1, ... }
   */
  async countByStatus(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT status, COUNT(*) AS total
         FROM battles
        WHERE event_id = ?
        GROUP BY status`,
      [eventId]
    );
    const result = { queue: 0, planned: 0, setup: 0, in_progress: 0, ended: 0 };
    for (const row of rows) result[row.status] = row.total;
    return result;
  },

  /** Liste des statuts valides */
  VALID_STATUSES,
};

module.exports = Battle;
