-- ============================================================
-- LANPartyManager - Jeu de donnees de demonstration pour Codespace
-- ============================================================
-- Objectif : fournir un environnement de test immediatement exploitable
-- dans le Codespace avec utilisateurs, actualites, evenements, inscriptions,
-- jeux, salles et rencontres.
--
-- Contraintes :
--   - le script doit etre idempotent
--   - il ne doit pas ecraser les donnees deja saisies a la main
--   - il s'appuie sur le schema SQL unique (install.sql)
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Utilisateurs de demonstration
-- Mot de passe commun : Admin1234
-- Hash bcrypt 12 rounds reutilise depuis l'admin par defaut
-- ------------------------------------------------------------

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Martin', 'Lea', 'Nova', 'lea.martin@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 1, '10000000-0000-4000-8000-000000000001'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'lea.martin@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Bernard', 'Hugo', 'PixelWolf', 'hugo.bernard@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000002'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'hugo.bernard@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Dubois', 'Ines', 'Arcadia', 'ines.dubois@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000003'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'ines.dubois@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Petit', 'Lucas', 'Rush42', 'lucas.petit@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000004'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'lucas.petit@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Garcia', 'Sarah', 'Nymeria', 'sarah.garcia@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000005'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'sarah.garcia@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Moreau', 'Tom', 'ByteStorm', 'tom.moreau@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000006'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'tom.moreau@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Roux', 'Emma', 'Astra', 'emma.roux@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000007'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'emma.roux@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Faure', 'Nolan', 'Volt', 'nolan.faure@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000008'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'nolan.faure@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Chevalier', 'Mila', 'Blitz', 'mila.chevalier@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000009'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'mila.chevalier@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Andre', 'Leo', 'Orbit', 'leo.andre@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000010'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'leo.andre@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Renard', 'Jade', 'Kitsune', 'jade.renard@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000011'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'jade.renard@lanparty.local'
);

INSERT INTO `users` (`nom`, `prenom`, `pseudo`, `email`, `password`, `is_admin`, `is_moderator`, `badge_token`)
SELECT 'Lemoine', 'Theo', 'Quartz', 'theo.lemoine@lanparty.local', '$2a$12$xLvrzkyO/kJTg4sb8qt8VeSDWYfKmC4t.Ii0gku1ZI3pCC6Pa3ffC', 0, 0, '10000000-0000-4000-8000-000000000012'
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `email` = 'theo.lemoine@lanparty.local'
);

-- ------------------------------------------------------------
-- Actualites de demonstration
-- ------------------------------------------------------------

INSERT INTO `announcements` (`titre`, `contenu`, `statut`, `created_at`, `updated_at`)
SELECT
  'Bienvenue sur le LAN Party Manager',
  'Le Codespace contient maintenant un jeu de donnees de demonstration pour tester les inscriptions, la moderation et le systeme de rencontres.',
  'publie',
  '2026-04-10 09:00:00',
  '2026-04-10 09:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `announcements` WHERE `titre` = 'Bienvenue sur le LAN Party Manager'
);

INSERT INTO `announcements` (`titre`, `contenu`, `statut`, `created_at`, `updated_at`)
SELECT
  'Programme du week-end',
  'Retrouvez une scene console, un espace simulation et des rencontres organisees automatiquement sur plusieurs jeux.',
  'publie',
  '2026-04-15 18:30:00',
  '2026-04-15 18:30:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `announcements` WHERE `titre` = 'Programme du week-end'
);

INSERT INTO `announcements` (`titre`, `contenu`, `statut`, `created_at`, `updated_at`)
SELECT
  'Preparation de la prochaine saison',
  'Annonce en brouillon laissee volontairement pour tester le back-office des actualites.',
  'brouillon',
  '2026-04-20 12:00:00',
  '2026-04-20 12:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `announcements` WHERE `titre` = 'Preparation de la prochaine saison'
);

-- ------------------------------------------------------------
-- Evenements de demonstration
-- ------------------------------------------------------------

INSERT INTO `events` (`nom`, `date_heure`, `lieu`, `statut`, `created_at`, `updated_at`)
SELECT 'LAN Spring Showdown', '2026-04-25 10:00:00', 'Salle Polyvalente - Lyon', 'en_cours', '2026-04-01 09:00:00', '2026-04-25 10:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `events` WHERE `nom` = 'LAN Spring Showdown'
);

INSERT INTO `events` (`nom`, `date_heure`, `lieu`, `statut`, `created_at`, `updated_at`)
SELECT 'Retro Arena Weekend', '2026-04-26 14:00:00', 'Maison des Associations - Lille', 'planifie', '2026-03-28 14:00:00', '2026-04-25 10:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `events` WHERE `nom` = 'Retro Arena Weekend' AND `date_heure` = '2026-04-26 14:00:00'
);

UPDATE `events`
SET `statut` = 'planifie', `updated_at` = NOW()
WHERE `nom` = 'Retro Arena Weekend' AND `statut` <> 'planifie';

INSERT INTO `events` (`nom`, `date_heure`, `lieu`, `statut`, `created_at`, `updated_at`)
SELECT 'Finales Hiver 2025', '2025-12-14 09:30:00', 'Centre Numerique - Bordeaux', 'termine', '2025-11-20 08:00:00', '2025-12-14 23:00:00'
WHERE NOT EXISTS (
  SELECT 1 FROM `events` WHERE `nom` = 'Finales Hiver 2025' AND `date_heure` = '2025-12-14 09:30:00'
);

-- ------------------------------------------------------------
-- Inscriptions a l'evenement public a venir
-- ------------------------------------------------------------

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000001', '2026-04-11 08:00:00'
FROM `events` e
JOIN `users` u ON u.email = 'lea.martin@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000002', '2026-04-11 08:05:00'
FROM `events` e
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000003', '2026-04-11 08:10:00'
FROM `events` e
JOIN `users` u ON u.email = 'ines.dubois@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000004', '2026-04-11 08:15:00'
FROM `events` e
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000005', '2026-04-11 08:20:00'
FROM `events` e
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000006', '2026-04-11 08:25:00'
FROM `events` e
JOIN `users` u ON u.email = 'tom.moreau@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000007', '2026-04-11 08:30:00'
FROM `events` e
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000008', '2026-04-11 08:35:00'
FROM `events` e
JOIN `users` u ON u.email = 'nolan.faure@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000009', '2026-04-11 08:40:00'
FROM `events` e
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000010', '2026-04-11 08:45:00'
FROM `events` e
JOIN `users` u ON u.email = 'leo.andre@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000011', '2026-04-11 08:50:00'
FROM `events` e
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

INSERT INTO `event_registrations` (`event_id`, `user_id`, `token`, `created_at`)
SELECT e.id, u.id, '20000000-0000-4000-8000-000000000012', '2026-04-11 08:55:00'
FROM `events` e
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `event_registrations` er WHERE er.event_id = e.id AND er.user_id = u.id
  );

-- ------------------------------------------------------------
-- Jeux de demonstration pour les rencontres
-- ------------------------------------------------------------

INSERT INTO `games` (`nom`, `console`, `type_rencontre`)
SELECT 'EA Sports FC 26', 'PS5', '1v1'
WHERE NOT EXISTS (
  SELECT 1 FROM `games` WHERE `nom` = 'EA Sports FC 26' AND `console` = 'PS5'
);

INSERT INTO `games` (`nom`, `console`, `type_rencontre`)
SELECT 'Mario Kart 8 Deluxe', 'Nintendo Switch', '2v2'
WHERE NOT EXISTS (
  SELECT 1 FROM `games` WHERE `nom` = 'Mario Kart 8 Deluxe' AND `console` = 'Nintendo Switch'
);

INSERT INTO `games` (`nom`, `console`, `type_rencontre`)
SELECT 'Street Fighter 6', 'PC', '1v1'
WHERE NOT EXISTS (
  SELECT 1 FROM `games` WHERE `nom` = 'Street Fighter 6' AND `console` = 'PC'
);

INSERT INTO `games` (`nom`, `console`, `type_rencontre`)
SELECT 'Trackmania Turbo', 'PC', 'solo'
WHERE NOT EXISTS (
  SELECT 1 FROM `games` WHERE `nom` = 'Trackmania Turbo' AND `console` = 'PC'
);

-- ------------------------------------------------------------
-- Salles de demonstration rattachees a l'evenement a venir
-- ------------------------------------------------------------

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Zelda', 'console', '1v1', 1, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Zelda'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Mario', 'console', '2v2', 1, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Mario'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Samus', 'simulation', '1v1', 0, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Samus'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Link', 'console', '1v1', 1, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Link'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Kirby', 'console', '2v2', 1, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Kirby'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Tifa', 'simulation', '2v2', 0, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Tifa'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Fox', 'simulation', 'solo', 1, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Fox'
  );

INSERT INTO `rooms` (`nom`, `type`, `type_rencontre`, `actif`, `event_id`)
SELECT 'Cortex', 'simulation', 'solo', 0, e.id
FROM `events` e
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `rooms` r WHERE r.event_id = e.id AND r.nom = 'Cortex'
  );

-- ------------------------------------------------------------
-- Rencontres de demonstration pour l'evenement a venir
-- ------------------------------------------------------------

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'en_cours', NULL,
       'Rencontre de demonstration deja affectee a une salle active.',
       '2026-04-24 18:00:00', '2026-04-25 10:15:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Street Fighter 6' AND g.console = 'PC'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Zelda'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre de demonstration deja affectee a une salle active.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'en_cours', NULL,
       'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.',
       '2026-04-24 18:10:00', '2026-04-25 10:20:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Mario'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.'
  );

UPDATE `battles` b
JOIN `events` e ON e.id = b.event_id
JOIN `games` g ON g.id = b.game_id
JOIN `rooms` r ON r.id = b.room_id
SET b.statut = 'en_cours', b.updated_at = NOW(),
    b.notes = 'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.'
WHERE e.nom = 'LAN Spring Showdown'
  AND g.nom = 'Mario Kart 8 Deluxe'
  AND g.console = 'Nintendo Switch'
  AND r.nom = 'Mario'
  AND b.notes = 'Rencontre 2v2 prete a etre lancee depuis le tableau moderateur.';

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Rencontre volontairement en file d''attente faute de salle 1v1 disponible.',
       '2026-04-24 18:20:00', '2026-04-25 10:25:00'
FROM `events` e
JOIN `games` g ON g.nom = 'EA Sports FC 26' AND g.console = 'PS5'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre volontairement en file d''attente faute de salle 1v1 disponible.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'installation', NULL,
       'Duel 1v1 en installation pour occuper la seconde salle active.',
       '2026-04-24 18:22:00', '2026-04-25 10:27:00'
FROM `events` e
JOIN `games` g ON g.nom = 'EA Sports FC 26' AND g.console = 'PS5'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Link'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 en installation pour occuper la seconde salle active.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'planifie', NULL,
       'Duel 1v1 planifie sur Link (slot suivant) pour tester le verrou d''occupation.',
       '2026-04-24 18:23:00', '2026-04-25 10:28:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Street Fighter 6' AND g.console = 'PC'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Link'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 planifie sur Link (slot suivant) pour tester le verrou d''occupation.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'en_cours', NULL,
       'Rencontre 2v2 deja lancee sur la seconde salle active.',
       '2026-04-24 18:24:00', '2026-04-25 10:29:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Kirby'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 deja lancee sur la seconde salle active.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'planifie', NULL,
       'Rencontre 2v2 planifiee sur Kirby (slot suivant) pour tester la file bloquee.',
       '2026-04-24 18:25:00', '2026-04-25 10:30:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Kirby'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 planifiee sur Kirby (slot suivant) pour tester la file bloquee.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'en_cours', NULL,
       'Session solo en cours sur Fox (salle unique active).',
       '2026-04-24 18:34:00', '2026-04-25 10:39:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Fox'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo en cours sur Fox (salle unique active).'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'planifie', NULL,
       'Session solo planifiee sur Fox pour verifier la promotion unique.',
       '2026-04-24 18:35:00', '2026-04-25 10:40:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Fox'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo planifiee sur Fox pour verifier la promotion unique.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Session solo en attente numero 1 (doit rester bloquee tant que Fox a un planifie).',
       '2026-04-24 18:36:00', '2026-04-25 10:41:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo en attente numero 1 (doit rester bloquee tant que Fox a un planifie).'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Session solo en attente numero 2 pour verifier l''ordre FIFO.',
       '2026-04-24 18:37:00', '2026-04-25 10:42:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo en attente numero 2 pour verifier l''ordre FIFO.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Duel 1v1 en attente numero 2 pour verifier la file chronologique.',
       '2026-04-24 18:26:00', '2026-04-25 10:31:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Street Fighter 6' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 en attente numero 2 pour verifier la file chronologique.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Duel 1v1 en attente numero 3 pour saturer les salles compatibles.',
       '2026-04-24 18:28:00', '2026-04-25 10:33:00'
FROM `events` e
JOIN `games` g ON g.nom = 'EA Sports FC 26' AND g.console = 'PS5'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 en attente numero 3 pour saturer les salles compatibles.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Rencontre 2v2 en attente numero 1 faute de salle libre.',
       '2026-04-24 18:30:00', '2026-04-25 10:35:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 en attente numero 1 faute de salle libre.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Rencontre 2v2 en attente numero 2 pour tester la file apres liberation.',
       '2026-04-24 18:32:00', '2026-04-25 10:37:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 en attente numero 2 pour tester la file apres liberation.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Duel 1v1 en attente numero 4 pour stress test FIFO.',
       '2026-04-24 18:38:00', '2026-04-25 10:43:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Street Fighter 6' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 en attente numero 4 pour stress test FIFO.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Duel 1v1 en attente numero 5 avec joueur deja planifie.',
       '2026-04-24 18:39:00', '2026-04-25 10:44:00'
FROM `events` e
JOIN `games` g ON g.nom = 'EA Sports FC 26' AND g.console = 'PS5'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 en attente numero 5 avec joueur deja planifie.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Duel 1v1 en attente numero 6 pour couverture joueurs.',
       '2026-04-24 18:40:00', '2026-04-25 10:45:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Street Fighter 6' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 en attente numero 6 pour couverture joueurs.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Rencontre 2v2 en attente numero 3 avec joueurs deja engages.',
       '2026-04-24 18:41:00', '2026-04-25 10:46:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 en attente numero 3 avec joueurs deja engages.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Rencontre 2v2 en attente numero 4 pour stress test file.',
       '2026-04-24 18:42:00', '2026-04-25 10:47:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 en attente numero 4 pour stress test file.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Rencontre 2v2 en attente numero 5 pour couverture joueurs.',
       '2026-04-24 18:43:00', '2026-04-25 10:48:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 en attente numero 5 pour couverture joueurs.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Session solo en attente numero 3 avec joueur deja en cours.',
       '2026-04-24 18:44:00', '2026-04-25 10:49:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo en attente numero 3 avec joueur deja en cours.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Session solo en attente numero 4 avec joueur deja planifie.',
       '2026-04-24 18:45:00', '2026-04-25 10:50:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo en attente numero 4 avec joueur deja planifie.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, NULL, 'file_attente', NULL,
       'Session solo en attente numero 5 pour couverture joueurs.',
       '2026-04-24 18:46:00', '2026-04-25 10:51:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Trackmania Turbo' AND g.console = 'PC'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Session solo en attente numero 5 pour couverture joueurs.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'termine', '2-1',
       'Duel 1v1 termine conserve pour verifier l''historique et les scores.',
       '2026-04-24 17:15:00', '2026-04-24 17:45:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Street Fighter 6' AND g.console = 'PC'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Zelda'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Duel 1v1 termine conserve pour verifier l''historique et les scores.'
  );

INSERT INTO `battles` (`event_id`, `game_id`, `room_id`, `statut`, `score`, `notes`, `created_at`, `updated_at`)
SELECT e.id, g.id, r.id, 'termine', '36-34',
       'Rencontre 2v2 terminee pour enrichir l''historique du tableau.',
       '2026-04-24 17:20:00', '2026-04-24 18:00:00'
FROM `events` e
JOIN `games` g ON g.nom = 'Mario Kart 8 Deluxe' AND g.console = 'Nintendo Switch'
JOIN `rooms` r ON r.event_id = e.id AND r.nom = 'Mario'
WHERE e.nom = 'LAN Spring Showdown'
  AND NOT EXISTS (
    SELECT 1 FROM `battles` b
    WHERE b.event_id = e.id AND b.game_id = g.id AND b.notes = 'Rencontre 2v2 terminee pour enrichir l''historique du tableau.'
  );

-- ------------------------------------------------------------
-- Joueurs associes aux rencontres seeded
-- ------------------------------------------------------------

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Rencontre de demonstration deja affectee a une salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'ines.dubois@lanparty.local'
WHERE b.notes = 'Rencontre de demonstration deja affectee a une salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lea.martin@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 prete a etre lancee depuis le tableau moderateur.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 prete a etre lancee depuis le tableau moderateur.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 prete a etre lancee depuis le tableau moderateur.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'tom.moreau@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 prete a etre lancee depuis le tableau moderateur.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lea.martin@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'tom.moreau@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en cours sur Mario pour preparer la partie suivante.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Rencontre volontairement en file d''attente faute de salle 1v1 disponible.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE b.notes = 'Rencontre volontairement en file d''attente faute de salle 1v1 disponible.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE b.notes = 'Duel 1v1 en installation pour occuper la seconde salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'nolan.faure@lanparty.local'
WHERE b.notes = 'Duel 1v1 en installation pour occuper la seconde salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 deja lancee sur la seconde salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Duel 1v1 planifie sur Link (slot suivant) pour tester le verrou d''occupation.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'leo.andre@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 4 pour stress test FIFO.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 4 pour stress test FIFO.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 5 avec joueur deja planifie.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'nolan.faure@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 5 avec joueur deja planifie.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'ines.dubois@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 6 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 6 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lea.martin@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 3 avec joueurs deja engages.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 3 avec joueurs deja engages.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 3 avec joueurs deja engages.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 3 avec joueurs deja engages.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 4 pour stress test file.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'ines.dubois@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 4 pour stress test file.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'nolan.faure@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 4 pour stress test file.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 4 pour stress test file.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 5 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'leo.andre@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 5 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 5 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'tom.moreau@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 5 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE b.notes = 'Session solo en attente numero 3 avec joueur deja en cours.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE b.notes = 'Session solo en attente numero 4 avec joueur deja planifie.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Session solo en attente numero 5 pour couverture joueurs.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Duel 1v1 planifie sur Link (slot suivant) pour tester le verrou d''occupation.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'leo.andre@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 deja lancee sur la seconde salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 deja lancee sur la seconde salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 deja lancee sur la seconde salle active.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'ines.dubois@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 planifiee sur Kirby (slot suivant) pour tester la file bloquee.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 planifiee sur Kirby (slot suivant) pour tester la file bloquee.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 planifiee sur Kirby (slot suivant) pour tester la file bloquee.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'tom.moreau@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 planifiee sur Kirby (slot suivant) pour tester la file bloquee.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE b.notes = 'Session solo en cours sur Fox (salle unique active).'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE b.notes = 'Session solo planifiee sur Fox pour verifier la promotion unique.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'leo.andre@lanparty.local'
WHERE b.notes = 'Session solo en attente numero 1 (doit rester bloquee tant que Fox a un planifie).'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE b.notes = 'Session solo en attente numero 2 pour verifier l''ordre FIFO.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lea.martin@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 2 pour verifier la file chronologique.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 2 pour verifier la file chronologique.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 3 pour saturer les salles compatibles.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE b.notes = 'Duel 1v1 en attente numero 3 pour saturer les salles compatibles.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 1 faute de salle libre.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'ines.dubois@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 1 faute de salle libre.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'nolan.faure@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 1 faute de salle libre.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 1 faute de salle libre.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lea.martin@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 2 pour tester la file apres liberation.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 0
FROM `battles` b
JOIN `users` u ON u.email = 'lucas.petit@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 2 pour tester la file apres liberation.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'sarah.garcia@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 2 pour tester la file apres liberation.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 en attente numero 2 pour tester la file apres liberation.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 1
FROM `battles` b
JOIN `users` u ON u.email = 'hugo.bernard@lanparty.local'
WHERE b.notes = 'Duel 1v1 termine conserve pour verifier l''historique et les scores.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'emma.roux@lanparty.local'
WHERE b.notes = 'Duel 1v1 termine conserve pour verifier l''historique et les scores.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 1
FROM `battles` b
JOIN `users` u ON u.email = 'mila.chevalier@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 terminee pour enrichir l''historique du tableau.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 1, 1
FROM `battles` b
JOIN `users` u ON u.email = 'leo.andre@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 terminee pour enrichir l''historique du tableau.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'jade.renard@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 terminee pour enrichir l''historique du tableau.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

INSERT INTO `battle_players` (`battle_id`, `user_id`, `equipe`, `est_gagnant`)
SELECT b.id, u.id, 2, 0
FROM `battles` b
JOIN `users` u ON u.email = 'theo.lemoine@lanparty.local'
WHERE b.notes = 'Rencontre 2v2 terminee pour enrichir l''historique du tableau.'
  AND NOT EXISTS (
    SELECT 1 FROM `battle_players` bp WHERE bp.battle_id = b.id AND bp.user_id = u.id
  );

-- ------------------------------------------------------------
-- Checklist de validation manuelle (file d'attente)
-- Copier/coller ces requetes dans MySQL apres seed si besoin.
-- ------------------------------------------------------------
-- 1) Verifier la repartition des statuts par format
-- SELECT g.type_rencontre, b.statut, COUNT(*) AS total
-- FROM battles b
-- JOIN games g ON g.id = b.game_id
-- JOIN events e ON e.id = b.event_id
-- WHERE e.nom = 'LAN Spring Showdown'
-- GROUP BY g.type_rencontre, b.statut
-- ORDER BY g.type_rencontre, FIELD(b.statut,'en_cours','installation','planifie','file_attente','termine');
--
-- 2) Verifier les slots d'occupation par salle (active + planifie)
-- SELECT r.nom AS room, r.type_rencontre,
--        SUM(CASE WHEN b.statut IN ('installation','en_cours') THEN 1 ELSE 0 END) AS active_slot,
--        SUM(CASE WHEN b.statut = 'planifie' THEN 1 ELSE 0 END) AS planifie_slot,
--        SUM(CASE WHEN b.statut = 'file_attente' THEN 1 ELSE 0 END) AS waiting_attached
-- FROM rooms r
-- LEFT JOIN battles b ON b.room_id = r.id
-- JOIN events e ON e.id = r.event_id
-- WHERE e.nom = 'LAN Spring Showdown'
-- GROUP BY r.id, r.nom, r.type_rencontre
-- ORDER BY r.type_rencontre, r.nom;
--
-- 3) Verifier l'ordre FIFO des rencontres en attente
-- SELECT b.id, g.type_rencontre, g.nom AS game, b.created_at, b.notes
-- FROM battles b
-- JOIN games g ON g.id = b.game_id
-- JOIN events e ON e.id = b.event_id
-- WHERE e.nom = 'LAN Spring Showdown' AND b.statut = 'file_attente'
-- ORDER BY b.created_at ASC;
--
-- 4) Verifier les rencontres en attente bloquees par joueurs deja engages
-- SELECT bw.id AS waiting_id, g.nom AS game, u.pseudo AS joueur_bloquant,
--        bo.id AS battle_engagee, bo.statut AS statut_engage,
--        bw.notes AS waiting_notes
-- FROM battles bw
-- JOIN events e ON e.id = bw.event_id
-- JOIN battle_players bpw ON bpw.battle_id = bw.id
-- JOIN battle_players bpo ON bpo.user_id = bpw.user_id AND bpo.battle_id <> bw.id
-- JOIN battles bo ON bo.id = bpo.battle_id AND bo.event_id = bw.event_id
-- JOIN users u ON u.id = bpw.user_id
-- JOIN games g ON g.id = bw.game_id
-- WHERE e.nom = 'LAN Spring Showdown'
--   AND bw.statut = 'file_attente'
--   AND bo.statut IN ('planifie','installation','en_cours')
-- ORDER BY bw.created_at, u.pseudo;