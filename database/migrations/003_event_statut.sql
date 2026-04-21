-- ============================================================
-- Migration 003 : Remplacement de la colonne `actif` par `statut`
--                 sur la table `events`
-- ============================================================
-- Statuts possibles :
--   planifie  — événement à venir, inscriptions ouvertes
--   en_cours  — événement en cours de déroulement
--   termine   — événement terminé
-- ============================================================
-- Instructions :
--   Exécuter ce script une seule fois sur la base existante
--   via PHPMyAdmin > onglet « SQL ».
-- ============================================================

-- Étape 1 : Ajouter la nouvelle colonne avec la valeur par défaut 'planifie'
ALTER TABLE `events`
  ADD COLUMN `statut` ENUM('planifie','en_cours','termine')
    NOT NULL
    DEFAULT 'planifie'
    COMMENT 'Statut de l''événement : planifie | en_cours | termine'
  AFTER `lieu`;

-- Étape 2 : Migrer les données existantes
--   Les événements actifs (actif=1) deviennent 'planifie' ;
--   les événements inactifs (actif=0) deviennent 'termine'.
UPDATE `events` SET `statut` = CASE
  WHEN `actif` = 1 THEN 'planifie'
  ELSE                   'termine'
END;

-- Étape 3 : Supprimer l'ancien index et la colonne `actif`
ALTER TABLE `events`
  DROP INDEX `idx_events_actif`,
  DROP COLUMN `actif`;

-- Étape 4 : Créer l'index sur la nouvelle colonne
ALTER TABLE `events`
  ADD KEY `idx_events_statut` (`statut`);
