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
const STATUTS_VALIDES = ['file_attente', 'planifie', 'installation', 'en_cours', 'termine'];

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
      `SELECT b.id, b.event_id, b.game_id, b.room_id, b.statut,
              b.score, b.notes, b.created_at, b.updated_at,
              g.nom AS game_nom, g.console AS game_console, g.type_rencontre,
              r.nom AS room_nom, r.type AS room_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.event_id = ?
        ORDER BY
          FIELD(b.statut, 'en_cours','installation','planifie','file_attente','termine'),
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
      `SELECT b.id, b.event_id, b.game_id, b.room_id, b.statut,
              b.score, b.notes, b.created_at, b.updated_at,
              g.nom AS game_nom, g.console AS game_console, g.type_rencontre,
              r.nom AS room_nom, r.type AS room_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.event_id = ?
          AND b.statut != 'termine'
        ORDER BY
          FIELD(b.statut, 'en_cours','installation','planifie','file_attente'),
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
      `SELECT b.id, b.event_id, b.game_id, b.room_id, b.statut,
              b.score, b.notes, b.created_at, b.updated_at,
              g.nom AS game_nom, g.console AS game_console, g.type_rencontre,
              r.nom AS room_nom, r.type AS room_type
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
      `SELECT bp.id, bp.battle_id, bp.user_id, bp.equipe, bp.est_gagnant,
              u.pseudo, u.nom, u.prenom
         FROM battle_players bp
         JOIN users u ON u.id = bp.user_id
        WHERE bp.battle_id = ?
        ORDER BY bp.equipe ASC, u.pseudo ASC`,
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
      `SELECT r.nom AS room_nom,
              b2.id AS conflicting_battle_id,
              b2.statut AS conflicting_statut
         FROM battles b
         JOIN rooms r ON r.id = b.room_id
         JOIN battles b2
           ON b2.room_id = b.room_id
          AND b2.id <> b.id
          AND b2.statut IN ('installation', 'en_cours')
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
      `SELECT b.id, b.statut, b.created_at,
              g.nom AS game_nom, g.console AS game_console, g.type_rencontre,
              r.nom AS room_nom, r.type AS room_type
         FROM battles b
         JOIN games g ON g.id = b.game_id
         LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.event_id = ?
          AND b.statut IN ('planifie', 'installation', 'en_cours')
        ORDER BY b.created_at ASC`,
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
      `INSERT INTO battles (event_id, game_id, statut, notes)
       VALUES (?, ?, 'file_attente', ?)`,
      [event_id, game_id, notes]
    );
    const battleId = result.insertId;

    // Ajoute les joueurs
    for (const p of players) {
      await db.pool.execute(
        `INSERT INTO battle_players (battle_id, user_id, equipe)
         VALUES (?, ?, ?)`,
        [battleId, p.user_id, p.equipe]
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
      `SELECT b.statut, g.type_rencontre
         FROM battles b
         JOIN games g ON g.id = b.game_id
        WHERE b.id = ? AND b.game_id = ?`,
      [battleId, gameId]
    );
    if (!battleRows[0] || battleRows[0].statut !== 'file_attente') return false;

    const typeRencontre = battleRows[0].type_rencontre;

    // Cherche une salle disponible pour planifier la prochaine rencontre.
    // Regle metier: une salle peut avoir au maximum
    // - 1 rencontre en cours/installation (en_cours ou installation)
    // - 1 rencontre planifiee (prochaine partie)
    const [rooms] = await db.pool.execute(
      `SELECT r.id
         FROM rooms r
        WHERE r.event_id = ?
          AND r.type_rencontre = ?
          AND r.actif = 1
          AND NOT EXISTS (
            SELECT 1 FROM battles b2
             WHERE b2.room_id = r.id
               AND b2.statut = 'planifie'
          )
          AND (
            SELECT COUNT(*) FROM battles b3
             WHERE b3.room_id = r.id
               AND b3.statut IN ('installation', 'en_cours')
          ) <= 1
        ORDER BY r.nom ASC
        LIMIT 1`,
      [eventId, typeRencontre]
    );

    if (!rooms[0]) return false;

    const roomId = rooms[0].id;
    await db.pool.execute(
      `UPDATE battles SET room_id = ?, statut = 'planifie', updated_at = NOW()
        WHERE id = ? AND statut = 'file_attente'`,
      [roomId, battleId]
    );
    return true;
  },

  /**
   * Réévalue la file d'attente pour un événement.
   * Appelé après chaque changement de statut de rencontre.
   * Parcourt les battles en file_attente par ordre de création et tente de leur attribuer une salle.
   * @param {number} eventId
   * @returns {Promise<void>}
   */
  async reevaluateQueue(eventId) {
    // Récupère les battles en file_attente, dans l'ordre de création
    const [waiting] = await db.pool.execute(
      `SELECT b.id, b.game_id
         FROM battles b
        WHERE b.event_id = ?
          AND b.statut = 'file_attente'
        ORDER BY b.created_at ASC`,
      [eventId]
    );

    for (const battle of waiting) {
      await Battle.assignRoomIfAvailable(battle.id, eventId, battle.game_id);
    }
  },

  /**
   * Change le statut d'une rencontre.
   * Déclenche la réévaluation de la file si la rencontre se termine.
   * @param {number} id
   * @param {'installation'|'en_cours'|'termine'} newStatut
   * @param {number} eventId — nécessaire pour reevaluateQueue
   * @returns {Promise<boolean>}
   */
  async changeStatut(id, newStatut, eventId) {
    if (!STATUTS_VALIDES.includes(newStatut)) return false;

    let affectedRows = 0;

    // Verrouille la rencontre pour eviter qu'une meme salle passe en
    // installation/en_cours sur 2 battles en concurrence.
    if (newStatut === 'installation' || newStatut === 'en_cours') {
      const conn = await db.pool.getConnection();
      try {
        await conn.beginTransaction();

        const [battleRows] = await conn.execute(
          'SELECT id, room_id FROM battles WHERE id = ? FOR UPDATE',
          [id]
        );
        if (!battleRows[0] || !battleRows[0].room_id) {
          await conn.rollback();
          return false;
        }

        const roomId = battleRows[0].room_id;
        const [busyRows] = await conn.execute(
          `SELECT COUNT(*) AS total
             FROM battles
            WHERE room_id = ?
              AND statut IN ('installation', 'en_cours')
              AND id <> ?
            FOR UPDATE`,
          [roomId, id]
        );

        if ((busyRows[0] && busyRows[0].total > 0)) {
          await conn.rollback();
          return false;
        }

        const [result] = await conn.execute(
          `UPDATE battles SET statut = ?, updated_at = NOW()
            WHERE id = ?`,
          [newStatut, id]
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
        `UPDATE battles SET statut = ?, updated_at = NOW()
          WHERE id = ?`,
        [newStatut, id]
      );
      affectedRows = result.affectedRows;
    }

    // Si la rencontre vient de se terminer, réévalue la file d'attente
    if (affectedRows > 0 && newStatut === 'termine') {
      await Battle.reevaluateQueue(eventId);
    }

    return affectedRows > 0;
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
    // Met à jour le score et le statut
    const [result] = await db.pool.execute(
      `UPDATE battles SET score = ?, statut = 'termine', updated_at = NOW()
        WHERE id = ?`,
      [score || null, id]
    );

    if (result.affectedRows === 0) return false;

    // Réinitialise tous les gagnants à 0
    await db.pool.execute(
      'UPDATE battle_players SET est_gagnant = 0 WHERE battle_id = ?',
      [id]
    );

    // Marque les gagnants
    if (winnerIds && winnerIds.length > 0) {
      for (const userId of winnerIds) {
        await db.pool.execute(
          'UPDATE battle_players SET est_gagnant = 1 WHERE battle_id = ? AND user_id = ?',
          [id, userId]
        );
      }
    }

    // Réévalue la file d'attente
    await Battle.reevaluateQueue(eventId);

    return true;
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
          AND statut IN ('file_attente', 'planifie')`,
      [id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Compte les rencontres par statut pour un événement
   * @param {number} eventId
   * @returns {Promise<Object>} ex: { file_attente: 2, planifie: 1, en_cours: 1, ... }
   */
  async countByStatut(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT statut, COUNT(*) AS total
         FROM battles
        WHERE event_id = ?
        GROUP BY statut`,
      [eventId]
    );
    const result = { file_attente: 0, planifie: 0, installation: 0, en_cours: 0, termine: 0 };
    for (const row of rows) result[row.statut] = row.total;
    return result;
  },

  /** Liste des statuts valides */
  STATUTS_VALIDES,
};

module.exports = Battle;
