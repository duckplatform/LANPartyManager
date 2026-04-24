-- ============================================================
-- Migration 006 - Système de gestion des rencontres (battles)
-- ============================================================
-- Ajoute les tables :
--   games        : jeux disponibles pour les rencontres
--   rooms        : salles/espaces de jeu
--   battles      : rencontres entre joueurs
--   battle_players : joueurs participant à chaque rencontre
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Table `games` — Jeux disponibles pour les rencontres
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `games` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nom`             VARCHAR(100)  NOT NULL COMMENT 'Nom du jeu',
  `console`         VARCHAR(100)  NOT NULL COMMENT 'Console / plateforme (PC, PS5, Xbox, etc.)',
  `type_rencontre`  ENUM('1v1','2v2') NOT NULL DEFAULT '1v1'
                    COMMENT 'Format de la rencontre',
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_games_type` (`type_rencontre`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Jeux disponibles pour les rencontres lors d''un événement';

-- ------------------------------------------------------------
-- Table `rooms` — Espaces de jeu
-- Noms générés automatiquement basés sur des jeux vidéo iconiques
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rooms` (
  `id`              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nom`             VARCHAR(100)  NOT NULL COMMENT 'Nom de la salle (auto-généré)',
  `type`            ENUM('console','simulation') NOT NULL DEFAULT 'console'
                    COMMENT 'Type de la salle',
  `type_rencontre`  ENUM('1v1','2v2') NOT NULL DEFAULT '1v1'
                    COMMENT 'Format de rencontre supporté',
  `actif`           TINYINT(1)    NOT NULL DEFAULT 1
                    COMMENT '1 = active, 0 = inactive (panne, etc.)',
  `event_id`        INT UNSIGNED  NOT NULL COMMENT 'Événement auquel la salle est rattachée',
  `created_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rooms_event`    (`event_id`),
  KEY `idx_rooms_actif`    (`actif`),
  KEY `idx_rooms_type_r`   (`type_rencontre`),
  CONSTRAINT `fk_rooms_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Salles/espaces de jeu disponibles lors d''un événement';

-- ------------------------------------------------------------
-- Table `battles` — Rencontres entre joueurs
-- Statuts :
--   file_attente : aucune salle dispo, en attente
--   planifie     : salle attribuée, rencontre précédente en cours
--   en_attente   : joueurs en train de s'installer
--   en_cours     : partie lancée
--   termine      : partie terminée
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `battles` (
  `id`         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `event_id`   INT UNSIGNED  NOT NULL COMMENT 'Événement',
  `game_id`    INT UNSIGNED  NOT NULL COMMENT 'Jeu',
  `room_id`    INT UNSIGNED  NULL      COMMENT 'Salle attribuée (NULL si file_attente)',
  `statut`     ENUM('file_attente','planifie','en_attente','en_cours','termine')
               NOT NULL DEFAULT 'file_attente'
               COMMENT 'État de la rencontre',
  `score`      VARCHAR(100)  NULL      COMMENT 'Score final (ex: 3-1, 100-85)',
  `notes`      TEXT          NULL      COMMENT 'Notes libres du modérateur',
  `created_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_battles_event`   (`event_id`),
  KEY `idx_battles_game`    (`game_id`),
  KEY `idx_battles_room`    (`room_id`),
  KEY `idx_battles_statut`  (`statut`),
  CONSTRAINT `fk_battles_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_battles_game`
    FOREIGN KEY (`game_id`)  REFERENCES `games`  (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_battles_room`
    FOREIGN KEY (`room_id`)  REFERENCES `rooms`  (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Rencontres entre joueurs lors d''un événement';

-- ------------------------------------------------------------
-- Table `battle_players` — Joueurs participant à une rencontre
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `battle_players` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `battle_id`   INT UNSIGNED  NOT NULL COMMENT 'Rencontre',
  `user_id`     INT UNSIGNED  NOT NULL COMMENT 'Joueur',
  `equipe`      TINYINT(1)    NOT NULL DEFAULT 1
                COMMENT 'Numéro d''équipe : 1 ou 2',
  `est_gagnant` TINYINT(1)    NOT NULL DEFAULT 0
                COMMENT '1 = gagnant, 0 = perdant ou non déterminé',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_battle_player`  (`battle_id`, `user_id`),
  KEY `idx_bp_battle`  (`battle_id`),
  KEY `idx_bp_user`    (`user_id`),
  CONSTRAINT `fk_bp_battle`
    FOREIGN KEY (`battle_id`) REFERENCES `battles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bp_user`
    FOREIGN KEY (`user_id`)   REFERENCES `users`   (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Joueurs associés à chaque rencontre, avec leur équipe et statut gagnant';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
