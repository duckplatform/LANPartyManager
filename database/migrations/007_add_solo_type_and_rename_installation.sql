-- =============================================================
-- Migration 007 — Ajout du type 'solo' et renommage
--                 du statut 'en_attente' → 'installation'
-- =============================================================
-- À appliquer sur une installation existante avec les tables
-- games, rooms et battles de l'Étape 5.
-- =============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Ajouter 'solo' au type_rencontre des jeux
ALTER TABLE `games`
  MODIFY COLUMN `type_rencontre`
    ENUM('1v1','2v2','solo') NOT NULL DEFAULT '1v1';

-- 2. Ajouter 'solo' au type_rencontre des salles
ALTER TABLE `rooms`
  MODIFY COLUMN `type_rencontre`
    ENUM('1v1','2v2','solo') NOT NULL DEFAULT '1v1';

-- 3. Renommer le statut 'en_attente' → 'installation' dans battles
--    (ENUM doit inclure les deux valeurs pendant la migration)
ALTER TABLE `battles`
  MODIFY COLUMN `statut`
    ENUM('file_attente','planifie','en_attente','installation','en_cours','termine')
    NOT NULL DEFAULT 'file_attente';

-- Mise à jour des données existantes
UPDATE `battles` SET `statut` = 'installation' WHERE `statut` = 'en_attente';

-- Retrait de l'ancienne valeur 'en_attente'
ALTER TABLE `battles`
  MODIFY COLUMN `statut`
    ENUM('file_attente','planifie','installation','en_cours','termine')
    NOT NULL DEFAULT 'file_attente';

SET FOREIGN_KEY_CHECKS = 1;
