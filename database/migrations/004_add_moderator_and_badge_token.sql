-- ============================================================
-- Migration 004 - Modérateur et token de badge électronique
-- ============================================================
-- Ajoute le rôle modérateur sur les utilisateurs
-- Ajoute un token UUID sur les inscriptions aux événements
--   (utilisé pour générer le QR code du badge électronique)
-- ============================================================

-- Ajout de la colonne is_moderator sur la table users
ALTER TABLE `users`
  ADD COLUMN `is_moderator` TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1 = modérateur, 0 = standard'
  AFTER `is_admin`,
  ADD KEY `idx_users_is_moderator` (`is_moderator`);

-- Ajout du token UUID sur la table event_registrations
ALTER TABLE `event_registrations`
  ADD COLUMN `token` CHAR(36) NOT NULL DEFAULT ''
    COMMENT 'Token UUID unique pour la vérification du badge électronique'
  AFTER `user_id`,
  ADD UNIQUE KEY `uq_er_token` (`token`);

-- Génération d'un token UUID pour les inscriptions existantes
-- (nécessite MySQL 8.0+ pour UUID() intégré, sinon utiliser uuid())
UPDATE `event_registrations`
  SET `token` = UUID()
  WHERE `token` = '' OR `token` IS NULL;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
