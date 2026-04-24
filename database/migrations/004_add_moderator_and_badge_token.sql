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
-- UUID() génère des UUID v1 (basés sur le temps) dans MySQL 5.0+
-- Les nouvelles inscriptions utiliseront des UUID v4 générés par Node.js (crypto.randomUUID)
-- Les anciens tokens v1 sont valides car le format CHAR(36) est compatible
UPDATE `event_registrations`
  SET `token` = UUID()
  WHERE `token` = '' OR `token` IS NULL;

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
