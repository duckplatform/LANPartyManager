-- ============================================================
-- LAN Party Manager - Schéma de base de données
-- ============================================================
-- Instructions :
--   1. Créer la base de données : CREATE DATABASE lan_party_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--   2. Importer ce fichier via PHPMyAdmin ou : mysql -u user -p lan_party_manager < schema.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ─── Table des utilisateurs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(50)  NOT NULL COMMENT 'Prénom',
  `last_name`  VARCHAR(50)  NOT NULL COMMENT 'Nom',
  `nickname`   VARCHAR(30)  NOT NULL COMMENT 'Pseudo dans les jeux',
  `email`      VARCHAR(255) NOT NULL COMMENT 'Adresse email unique',
  `password`   VARCHAR(255) NOT NULL COMMENT 'Mot de passe hashé (bcrypt)',
  `role`       ENUM('user', 'admin') NOT NULL DEFAULT 'user' COMMENT 'Rôle : user ou admin',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`),
  INDEX `users_role_idx` (`role`),
  INDEX `users_nickname_idx` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Table des membres de l''association';

-- ─── Compte administrateur par défaut ────────────────────────────────────────
-- Mot de passe : Admin@LAN2024!  (hashé avec bcrypt, 12 rounds)
-- IMPORTANT : Changer ce mot de passe immédiatement après la première connexion !
INSERT INTO `users` (`first_name`, `last_name`, `nickname`, `email`, `password`, `role`)
VALUES (
  'Admin',
  'Système',
  'AdminLAN',
  'admin@lanparty.local',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj0q3rRfYqDS',
  'admin'
)
ON DUPLICATE KEY UPDATE `role` = 'admin';

-- Note : Le hash ci-dessus correspond à 'Admin@LAN2024!'
-- Pour générer un nouveau hash : node -e "const b=require('bcryptjs');b.hash('VotreMotDePasse',12).then(console.log)"

SET FOREIGN_KEY_CHECKS = 1;
