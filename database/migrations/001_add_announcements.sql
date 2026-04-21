-- ============================================================
-- LANPartyManager - Migration 001 : Ajout de la table announcements
-- ============================================================
-- À exécuter sur les bases de données existantes.
-- Pour une installation fraîche, utiliser install.sql.
-- ============================================================

SET NAMES utf8mb4;

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

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
