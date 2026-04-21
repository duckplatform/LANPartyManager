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

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================

SET FOREIGN_KEY_CHECKS = 1;
