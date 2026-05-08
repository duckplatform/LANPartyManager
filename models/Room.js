'use strict';

/**
 * Modèle Room — Espaces/salles de jeu
 * CRUD sur la table `rooms`
 * Les noms sont générés automatiquement à partir d'une liste de jeux vidéo iconiques.
 */

const db = require('../config/database');

/** Types de salles autorisés */
const ROOM_TYPES = ['console', 'simulation'];

/** Types de rencontre autorisés */
const MATCH_TYPES = ['1v1', '2v2', 'solo'];

/**
 * Noms de salles auto-générés, inspirés de jeux vidéo iconiques.
 * Utilisés lors de la création automatique de salles.
 */
const ROOM_NAMES = [
  'Zelda', 'Mario', 'Sonic', 'Pikachu', 'Samus', 'Link', 'Kirby',
  'Donkey Kong', 'Megaman', 'Street Fighter', 'Mortal Kombat', 'Tetris',
  'Pac-Man', 'Space Invaders', 'Halo', 'Master Chief', 'Kratos', 'Geralt',
  'Lara Croft', 'Nathan Drake', 'Cloud', 'Tifa', 'Aerith', 'Sephiroth',
  'Dante', 'Solid Snake', 'Raiden', 'Gordon Freeman', 'Doom Slayer',
  'Marcus Fenix', 'Commander Shepard', 'Ezio', 'Altaïr', 'Bayek',
  'Noctis', 'Lightning', 'Terra', 'Kefka', 'Tidus', 'Yuna', 'Auron',
];

const Room = {

  /**
   * Retourne toutes les salles d'un événement
   * @param {number} eventId
   * @returns {Promise<Array>}
   */
  async findByEvent(eventId) {
    const [rows] = await db.pool.execute(
      `SELECT r.id, r.name, r.type, r.match_type, r.is_active,
              r.event_id, r.created_at, r.updated_at,
              (SELECT COUNT(*) FROM battles b
                WHERE b.room_id = r.id
                  AND b.status IN ('planned','setup','in_progress')) AS battles_actives
         FROM rooms r
        WHERE r.event_id = ?
        ORDER BY r.name ASC`,
      [eventId]
    );
    return rows;
  },

  /**
   * Trouve une salle par son ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [rows] = await db.pool.execute(
      'SELECT * FROM rooms WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Retourne les salles disponibles pour un type de rencontre donné dans un événement.
   * Une salle est "disponible" si elle est active ET n'a aucune battle planifie/installation/en_cours.
   * @param {number} eventId
   * @param {'1v1'|'2v2'} typeRencontre
   * @returns {Promise<Array>}
   */
  async findAvailable(eventId, matchType) {
    const [rows] = await db.pool.execute(
      `SELECT r.id, r.name, r.type, r.match_type, r.is_active
         FROM rooms r
        WHERE r.event_id = ?
          AND r.match_type = ?
          AND r.is_active = 1
          AND NOT EXISTS (
            SELECT 1 FROM battles b
             WHERE b.room_id = r.id
               AND b.status IN ('planned', 'setup', 'in_progress')
          )
        ORDER BY r.name ASC`,
      [eventId, matchType]
    );
    return rows;
  },

  /**
   * Génère un nom de salle unique pour un événement.
   * Parcourt la liste ROOM_NAMES et retourne le premier nom non encore utilisé.
   * Si tous les noms sont pris, ajoute un suffixe numérique.
   * @param {number} eventId
   * @returns {Promise<string>}
   */
  async generateName(eventId) {
    const [rows] = await db.pool.execute(
      'SELECT name FROM rooms WHERE event_id = ?',
      [eventId]
    );
    const usedNames = new Set(rows.map(r => r.name));

    for (const name of ROOM_NAMES) {
      if (!usedNames.has(name)) return name;
    }

    // Tous les noms de base sont pris : on ajoute un suffixe numérique
    let suffix = 2;
    while (usedNames.has(`Zelda ${suffix}`)) suffix++;
    return `Zelda ${suffix}`;
  },

  /**
   * Crée une nouvelle salle
   * @param {{ nom?: string, type: string, type_rencontre: string, actif?: number, event_id: number }} data
   * @returns {Promise<number>} ID de la nouvelle salle
   */
  async create({ name, type = 'console', match_type = '1v1', is_active = 1, event_id }) {
    const typeFinal = ROOM_TYPES.includes(type) ? type : 'console';
    const typeRFinal = MATCH_TYPES.includes(match_type) ? match_type : '1v1';

    // Génère un nom automatique si non fourni
    const nameFinal = name ? name.trim() : await Room.generateName(event_id);

    const [result] = await db.pool.execute(
      `INSERT INTO rooms (name, type, match_type, is_active, event_id)
       VALUES (?, ?, ?, ?, ?)`,
      [nameFinal, typeFinal, typeRFinal, is_active ? 1 : 0, event_id]
    );
    return result.insertId;
  },

  /**
   * Met à jour une salle
   * @param {number} id
   * @param {{ nom: string, type: string, type_rencontre: string, actif: number }} data
   * @returns {Promise<boolean>}
   */
  async update(id, { name, type = 'console', match_type = '1v1', is_active = 1 }) {
    const typeFinal = ROOM_TYPES.includes(type) ? type : 'console';
    const typeRFinal = MATCH_TYPES.includes(match_type) ? match_type : '1v1';
    const [result] = await db.pool.execute(
      `UPDATE rooms
          SET name = ?, type = ?, match_type = ?, is_active = ?, updated_at = NOW()
        WHERE id = ?`,
      [name.trim(), typeFinal, typeRFinal, is_active ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Active ou désactive une salle
   * @param {number} id
   * @param {boolean} actif
   * @returns {Promise<boolean>}
   */
  async setActive(id, isActive) {
    const [result] = await db.pool.execute(
      'UPDATE rooms SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [isActive ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  /**
   * Supprime une salle par son ID
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const [result] = await db.pool.execute(
      'DELETE FROM rooms WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  },

  /** Types de salles autorisés */
  ROOM_TYPES,
  /** Types de rencontre autorisés */
  MATCH_TYPES,
  /** Liste des noms de salles */
  ROOM_NAMES,
};

module.exports = Room;
