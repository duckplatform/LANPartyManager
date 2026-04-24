-- ============================================================
-- Migration 005 - Token de badge de membre
-- ============================================================
-- Le badge est désormais propre à l'utilisateur (pas à l'inscription).
-- Un token UUID permanent est généré une fois et ne change jamais.
-- Le QR code encode ce token ; la vérification à l'entrée confirme
-- que le membre porteur du badge est bien inscrit à l'événement.
-- ============================================================

-- Ajout du badge_token permanent sur la table users
-- Note : la contrainte UNIQUE est ajoutée APRÈS le remplissage
-- pour éviter une erreur de doublon sur la valeur par défaut '' vide.
ALTER TABLE `users`
  ADD COLUMN `badge_token` CHAR(36) NOT NULL DEFAULT ''
    COMMENT 'Token UUID permanent pour le badge de membre (QR code unique)'
  AFTER `is_moderator`;

-- Génération d'un token UUID pour tous les utilisateurs existants
UPDATE `users`
  SET `badge_token` = UUID()
  WHERE `badge_token` = '' OR `badge_token` IS NULL;

-- Ajout de la contrainte UNIQUE une fois les valeurs remplies
ALTER TABLE `users`
  ADD UNIQUE KEY `uq_users_badge_token` (`badge_token`);

-- ============================================================
-- FIN DE LA MIGRATION
-- ============================================================
