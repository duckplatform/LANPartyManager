-- LAN Party Manager - Schéma de base de données
-- Encodage: UTF8MB4 pour le support des emojis et caractères spéciaux

CREATE DATABASE IF NOT EXISTS `lan_party_manager`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `lan_party_manager`;

-- ─── Paramètres de l'application ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `settings` (
  `key`        VARCHAR(100)  NOT NULL,
  `value`      TEXT,
  `created_at` TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Utilisateurs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT           NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(50)   NOT NULL,
  `email`         VARCHAR(255)  NOT NULL,
  `password_hash` VARCHAR(255)  NOT NULL,
  `role`          ENUM('admin','moderator','user') DEFAULT 'user',
  `avatar`        VARCHAR(255),
  `bio`           TEXT,
  `is_active`     TINYINT(1)    DEFAULT 1,
  `created_at`    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_username` (`username`),
  UNIQUE KEY `uq_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Actualités ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `news` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `title`        VARCHAR(255) NOT NULL,
  `slug`         VARCHAR(255) NOT NULL,
  `content`      LONGTEXT     NOT NULL,
  `excerpt`      TEXT,
  `cover_image`  VARCHAR(255),
  `author_id`    INT,
  `is_published` TINYINT(1)   DEFAULT 0,
  `created_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_news_slug` (`slug`),
  INDEX `idx_news_published` (`is_published`),
  CONSTRAINT `fk_news_author` FOREIGN KEY (`author_id`)
    REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Événements ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `events` (
  `id`               INT          NOT NULL AUTO_INCREMENT,
  `title`            VARCHAR(255) NOT NULL,
  `slug`             VARCHAR(255) NOT NULL,
  `description`      LONGTEXT,
  `location`         VARCHAR(255),
  `start_date`       DATETIME,
  `end_date`         DATETIME,
  `max_participants` INT          DEFAULT 0,
  `cover_image`      VARCHAR(255),
  `is_active`        TINYINT(1)   DEFAULT 0,
  `is_published`     TINYINT(1)   DEFAULT 0,
  `created_at`       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_event_slug` (`slug`),
  INDEX `idx_event_active` (`is_active`, `is_published`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Inscriptions aux événements ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `event_registrations` (
  `id`            INT       NOT NULL AUTO_INCREMENT,
  `event_id`      INT       NOT NULL,
  `user_id`       INT       NOT NULL,
  `registered_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_registration` (`event_id`, `user_id`),
  CONSTRAINT `fk_reg_event` FOREIGN KEY (`event_id`)
    REFERENCES `events` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reg_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
