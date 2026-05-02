-- ============================================================
-- LANPartyManager - Script unique d'installation de la base
-- ============================================================
-- Instructions :
--   1. Créer la base de données dans PHPMyAdmin
--   2. Sélectionner la base
--   3. Importer ce fichier via l'onglet "Importer"
--
-- Ce fichier contient le schéma complet actuel (sans migrations).
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Table `users`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `nom`           VARCHAR(100)  NOT NULL COMMENT 'Nom de famille',
  `prenom`        VARCHAR(100)  NOT NULL COMMENT 'Prenom',
  `pseudo`        VARCHAR(50)   NOT NULL COMMENT 'Pseudo en jeu',
  `email`         VARCHAR(255)  NOT NULL COMMENT 'Adresse e-mail de connexion',
  `password`      VARCHAR(255)  NULL    DEFAULT NULL COMMENT 'Mot de passe hashé (bcrypt), NULL pour les comptes créés via OAuth Discord',
  `is_admin`      TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = administrateur',
  `is_moderator`  TINYINT(1)    NOT NULL DEFAULT 0 COMMENT '1 = moderateur',
  `badge_token`   CHAR(36)      NOT NULL COMMENT 'Token UUID permanent pour badge membre',
  `discord_user_id` VARCHAR(20) NULL DEFAULT NULL COMMENT 'ID Discord Snowflake (ex: 123456789012345678) — identifiant OAuth et mentions dans les notifications',
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_badge_token` (`badge_token`),
  UNIQUE KEY `uq_users_discord_user_id` (`discord_user_id`),
  KEY `idx_users_is_admin` (`is_admin`),
  KEY `idx_users_is_moderator` (`is_moderator`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Utilisateurs de l''association';

-- Compte admin par défaut : admin@lanparty.local / Admin1234
-- Changer ce mot de passe dès la première connexion.
INSERT IGNORE INTO `users`
  (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
VALUES
  (
    'Administrateur',
    'Super',
    'Admin',
    'admin@lanparty.local',
    '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC',
    1,
    1,
    '00000000-0000-4000-8000-000000000001'
  );

-- ------------------------------------------------------------
-- Table `announcements`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `announcements` (
  `id`          INT UNSIGNED               NOT NULL AUTO_INCREMENT,
  `titre`       VARCHAR(255)               NOT NULL COMMENT 'Titre de l''annonce',
  `contenu`     LONGTEXT                   NOT NULL COMMENT 'Contenu en Markdown',
  `statut`      ENUM('publie','brouillon') NOT NULL DEFAULT 'brouillon',
  `created_at`  DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_statut` (`statut`),
  KEY `idx_announcements_created_at` (`created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Actualites publiees et brouillons';

-- ------------------------------------------------------------
-- Table `events`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `events` (
  `id`          INT UNSIGNED                           NOT NULL AUTO_INCREMENT,
  `nom`         VARCHAR(255)                           NOT NULL COMMENT 'Nom de l''evenement',
  `date_heure`  DATETIME                               NOT NULL COMMENT 'Date et heure de debut',
  `lieu`        VARCHAR(255)                           NOT NULL COMMENT 'Lieu de l''evenement',
  `discord_channel_id` VARCHAR(32)                     NULL COMMENT 'ID du canal Discord dedie a l''evenement (remplace DISCORD_CHANNEL_EVENTS)',
  `discord_notifications_enabled` TINYINT(1)           NOT NULL DEFAULT 1 COMMENT 'Activer les notifications Discord pour cet evenement (1=oui, 0=non)',
  `statut`      ENUM('planifie','en_cours','termine') NOT NULL DEFAULT 'planifie',
  `active_unique_slot` TINYINT GENERATED ALWAYS AS (CASE WHEN `statut` = 'en_cours' THEN 1 ELSE NULL END) STORED,
  `created_at`  DATETIME                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_events_single_active` (`active_unique_slot`),
  CONSTRAINT `chk_events_discord_channel_id`
    CHECK (`discord_channel_id` IS NULL OR `discord_channel_id` REGEXP '^[0-9]{17,20}$'),
  KEY `idx_events_statut` (`statut`),
  KEY `idx_events_date_heure` (`date_heure`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Evenements organises par l''association';

-- ------------------------------------------------------------
-- Table `event_registrations`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id`          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `event_id`    INT UNSIGNED  NOT NULL COMMENT 'Reference vers events.id',
  `user_id`     INT UNSIGNED  NOT NULL COMMENT 'Reference vers users.id',
  `created_at`  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_event_user` (`event_id`, `user_id`),
  KEY `idx_er_event_id` (`event_id`),
  KEY `idx_er_user_id` (`user_id`),
  CONSTRAINT `fk_er_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_er_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Inscriptions des membres aux evenements';

-- ------------------------------------------------------------
-- Table `games`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `games` (
  `id`              INT UNSIGNED           NOT NULL AUTO_INCREMENT,
  `nom`             VARCHAR(100)           NOT NULL COMMENT 'Nom du jeu',
  `console`         VARCHAR(100)           NOT NULL COMMENT 'Plateforme',
  `type_rencontre`  ENUM('1v1','2v2','solo') NOT NULL DEFAULT '1v1',
  `created_at`      DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_games_type` (`type_rencontre`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Jeux disponibles pour les rencontres';

-- ------------------------------------------------------------
-- Table `rooms`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `rooms` (
  `id`              INT UNSIGNED                 NOT NULL AUTO_INCREMENT,
  `nom`             VARCHAR(100)                 NOT NULL COMMENT 'Nom de la salle',
  `type`            ENUM('console','simulation') NOT NULL DEFAULT 'console',
  `type_rencontre`  ENUM('1v1','2v2','solo')      NOT NULL DEFAULT '1v1',
  `actif`           TINYINT(1)                   NOT NULL DEFAULT 1,
  `event_id`        INT UNSIGNED                 NOT NULL,
  `created_at`      DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME                     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rooms_event` (`event_id`),
  KEY `idx_rooms_actif` (`actif`),
  KEY `idx_rooms_type_r` (`type_rencontre`),
  CONSTRAINT `fk_rooms_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Salles de jeu disponibles par evenement';

-- ------------------------------------------------------------
-- Table `battles`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `battles` (
  `id`          INT UNSIGNED                                                          NOT NULL AUTO_INCREMENT,
  `event_id`    INT UNSIGNED                                                          NOT NULL,
  `game_id`     INT UNSIGNED                                                          NOT NULL,
  `room_id`     INT UNSIGNED                                                          NULL,
  `statut`      ENUM('file_attente','planifie','installation','en_cours','termine') NOT NULL DEFAULT 'file_attente',
  `score`       VARCHAR(100)                                                          NULL,
  `notes`       TEXT                                                                  NULL,
  `started_at`  DATETIME                                                              NULL COMMENT 'Quand la partie a commencé (statut=en_cours)',
  `ended_at`    DATETIME                                                              NULL COMMENT 'Quand la partie s''est terminée (statut=termine)',
  `created_at`  DATETIME                                                              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME                                                              NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_battles_event` (`event_id`),
  KEY `idx_battles_game` (`game_id`),
  KEY `idx_battles_room` (`room_id`),
  KEY `idx_battles_statut` (`statut`),
  CONSTRAINT `fk_battles_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_battles_game`
    FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_battles_room`
    FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Rencontres entre joueurs';

-- ------------------------------------------------------------
-- Table `battle_players`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `battle_players` (
  `id`           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  `battle_id`    INT UNSIGNED  NOT NULL,
  `user_id`      INT UNSIGNED  NOT NULL,
  `equipe`       TINYINT(1)    NOT NULL DEFAULT 1,
  `est_gagnant`  TINYINT(1)    NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_battle_player` (`battle_id`, `user_id`),
  KEY `idx_bp_battle` (`battle_id`),
  KEY `idx_bp_user` (`user_id`),
  CONSTRAINT `fk_bp_battle`
    FOREIGN KEY (`battle_id`) REFERENCES `battles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bp_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Participants de chaque rencontre';

-- ------------------------------------------------------------
-- Table `event_rankings`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `event_rankings` (
  `event_id`        INT UNSIGNED NOT NULL,
  `user_id`         INT UNSIGNED NOT NULL,
  `points`          INT UNSIGNED NOT NULL DEFAULT 0,
  `wins`            INT UNSIGNED NOT NULL DEFAULT 0,
  `battles_played`  INT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`event_id`, `user_id`),
  KEY `idx_rankings_event_points` (`event_id`, `points`),
  CONSTRAINT `fk_rankings_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rankings_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_rankings_points_nonneg` CHECK (`points` >= 0),
  CONSTRAINT `chk_rankings_wins_nonneg` CHECK (`wins` >= 0),
  CONSTRAINT `chk_rankings_battles_nonneg` CHECK (`battles_played` >= 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Classement des joueurs par evenement, recalcule apres chaque resultat';

-- ------------------------------------------------------------
-- Table `app_settings`
-- ------------------------------------------------------------
-- Configuration globale de l'application.
-- Remplace les variables d'environnement Discord pour un
-- paramétrage entièrement géré depuis l'interface d'administration.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `app_settings` (
  `cle`        VARCHAR(100) NOT NULL  COMMENT 'Clé du paramètre (identifiant unique)',
  `valeur`     TEXT         NULL      COMMENT 'Valeur du paramètre (NULL = non défini)',
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cle`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Configuration globale de l''application (remplace les variables d''environnement Discord)';

-- Valeurs par défaut : Discord désactivé jusqu'à configuration explicite
INSERT IGNORE INTO `app_settings` (`cle`, `valeur`) VALUES
  ('discord_enabled',       '0'),
  ('discord_bot_token',     NULL),
  ('discord_channel_news',  NULL),
  ('discord_client_id',     NULL),
  ('discord_client_secret', NULL);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
