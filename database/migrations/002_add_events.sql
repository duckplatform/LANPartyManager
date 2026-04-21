-- ============================================================
-- Migration 002 - Gestion des événements
-- ============================================================
-- Tables : events, event_registrations
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Création de la table `events`
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `events` (
  `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  `nom`        VARCHAR(255)     NOT NULL COMMENT 'Nom de l''événement',
  `date_heure` DATETIME         NOT NULL COMMENT 'Date et heure de début de l''événement',
  `lieu`       VARCHAR(255)     NOT NULL COMMENT 'Lieu de l''événement',
  `actif`      TINYINT(1)       NOT NULL DEFAULT 0 COMMENT '1 = actif / affiché, 0 = inactif',
  `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_events_actif`      (`actif`),
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
-- FIN DE LA MIGRATION
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
