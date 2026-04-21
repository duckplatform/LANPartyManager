-- ============================================================
-- LANPartyManager - Script d'installation de la base de données
-- ============================================================
-- Instructions :
--   1. Créer la base de données dans PHPMyAdmin
--   2. Sélectionner la base de données
--   3. Importer ce fichier via l'onglet "Importer"
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Création de la table `users`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `nom`        VARCHAR(100)     NOT NULL COMMENT 'Nom de famille',
  `prenom`     VARCHAR(100)     NOT NULL COMMENT 'Prénom',
  `pseudo`     VARCHAR(50)      NOT NULL COMMENT 'Surnom / Pseudo en jeu',
  `email`      VARCHAR(255)     NOT NULL COMMENT 'Adresse e-mail (unique, utilisée pour la connexion)',
  `password`   VARCHAR(255)     NOT NULL COMMENT 'Mot de passe hashé (bcrypt)',
  `is_admin`   TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '1 = administrateur, 0 = membre',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  KEY `idx_users_is_admin` (`is_admin`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Table des utilisateurs de l''association';

-- ------------------------------------------------------------
-- Compte administrateur par défaut
-- Identifiants : admin@lanparty.local / Admin1234
-- !! CHANGER LE MOT DE PASSE DÈS LA PREMIÈRE CONNEXION !!
-- Hash bcrypt 12 rounds du mot de passe : Admin1234
-- ------------------------------------------------------------

INSERT IGNORE INTO `users`
  (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`)
VALUES (
  'Administrateur',
  'Super',
  'Admin',
  'admin@lanparty.local',
  '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC',
  1
);

-- ------------------------------------------------------------
-- Création de la table `announcements`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `announcements` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `titre`      VARCHAR(255)     NOT NULL COMMENT 'Titre de l''annonce',
  `contenu`    LONGTEXT         NOT NULL COMMENT 'Contenu en Markdown',
  `statut`     ENUM('publie','brouillon') NOT NULL DEFAULT 'brouillon'
                                COMMENT 'Statut de publication',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_announcements_statut`     (`statut`),
  KEY `idx_announcements_created_at` (`created_at`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Annonces / articles de blog de l''association';

-- ------------------------------------------------------------
-- Création de la table `events`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `events` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `nom`        VARCHAR(255)     NOT NULL COMMENT 'Nom de l''événement',
  `date_heure` DATETIME         NOT NULL COMMENT 'Date et heure de début de l''événement',
  `lieu`       VARCHAR(255)     NOT NULL COMMENT 'Lieu de l''événement',
  `statut`     ENUM('planifie','en_cours','termine')
               NOT NULL DEFAULT 'planifie'
               COMMENT 'Statut de l''événement : planifie | en_cours | termine',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_statut`     (`statut`),
  KEY `idx_events_date_heure` (`date_heure`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Événements organisés par l''association';

-- ------------------------------------------------------------
-- Création de la table `event_registrations`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `event_id`   INT UNSIGNED     NOT NULL COMMENT 'Référence vers events.id',
  `user_id`    INT UNSIGNED     NOT NULL COMMENT 'Référence vers users.id',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE  KEY `uq_event_user`    (`event_id`, `user_id`),
  KEY `idx_er_event_id` (`event_id`),
  KEY `idx_er_user_id`  (`user_id`),
  CONSTRAINT `fk_er_event` FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_er_user`  FOREIGN KEY (`user_id`)  REFERENCES `users`  (`id`) ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Inscriptions des membres aux événements';

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
