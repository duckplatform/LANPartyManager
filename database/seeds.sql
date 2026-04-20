-- Seeds de démonstration pour LAN Party Manager
-- Utilisé par seed.js (les utilisateurs sont créés via bcrypt dans seed.js)
-- ADMIN_ID sera remplacé par l'ID réel de l'admin lors de l'exécution

-- ─── Actualités de démonstration ──────────────────────────────────────────────
INSERT IGNORE INTO `news` (title, slug, content, excerpt, author_id, is_published, created_at) VALUES

('Bienvenue sur LAN Party Manager !',
 'bienvenue-sur-lan-party-manager',
 '<p>Nous sommes ravis de vous accueillir sur la nouvelle plateforme de gestion de LAN parties de notre association !</p><p>Ce site vous permettra de :</p><ul><li>Consulter les prochains événements LAN</li><li>Vous inscrire aux événements</li><li>Suivre toutes les actualités de notre communauté</li></ul><p>N\'hésitez pas à créer votre compte pour profiter de toutes les fonctionnalités.</p>',
 'Découvrez notre nouvelle plateforme de gestion de LAN parties !',
 ADMIN_ID, 1, NOW() - INTERVAL 10 DAY),

('Résultats du Tournoi Counter-Strike 2',
 'resultats-tournoi-counter-strike-2',
 '<p>Le tournoi CS2 de notre dernière LAN s\'est terminé de manière spectaculaire !</p><p>Le classement final :</p><ol><li><strong>Team Alpha</strong> - Champions incontestés avec 3 victoires consécutives</li><li><strong>Les Frags Volants</strong> - Deuxième place après une belle remontée</li><li><strong>Pixel Warriors</strong> - Troisième place méritée</li></ol><p>Bravo à tous les participants pour leur fair-play et leur esprit compétitif !</p>',
 'Découvrez les résultats du tournoi CS2 de notre dernière LAN party.',
 ADMIN_ID, 1, NOW() - INTERVAL 7 DAY),

('Nouveaux jeux au programme de la prochaine LAN',
 'nouveaux-jeux-programme-prochaine-lan',
 '<p>Pour la prochaine édition de notre LAN party, nous avons le plaisir d\'annoncer une sélection de jeux encore plus variée !</p><p><strong>Jeux compétitifs :</strong></p><ul><li>Counter-Strike 2 - Tournoi principal</li><li>League of Legends - Draft mode</li><li>Rocket League - 3v3</li></ul><p><strong>Jeux casual :</strong></p><ul><li>Among Us</li><li>Fall Guys</li><li>Minecraft - Serveur dédié</li></ul>',
 'Programme complet des jeux pour la prochaine édition.',
 ADMIN_ID, 1, NOW() - INTERVAL 5 DAY),

('Tutoriel : Comment se préparer pour une LAN Party',
 'tutoriel-comment-se-preparer-lan-party',
 '<p>Vous venez de vous inscrire à votre première LAN party ? Voici tout ce qu\'il faut savoir pour arriver prêt !</p><p><strong>Matériel indispensable :</strong></p><ul><li>Tour/PC portable en bon état</li><li>Câble réseau RJ45 (5m minimum)</li><li>Multiprise (4 prises minimum)</li><li>Casque gaming</li><li>Souris + tapis de souris</li></ul><p><strong>Logiciels à installer :</strong></p><ul><li>Steam avec vos jeux téléchargés</li><li>Discord pour la communication</li><li>Pilotes graphiques à jour</li></ul>',
 'Tout ce qu\'il faut savoir pour préparer votre premier LAN.',
 ADMIN_ID, 1, NOW() - INTERVAL 3 DAY),

('Partenariat avec GameZone Hardware',
 'partenariat-gamezone-hardware',
 '<p>Excellente nouvelle pour notre communauté ! Nous avons le plaisir d\'annoncer notre partenariat avec <strong>GameZone Hardware</strong>, le spécialiste du matériel gaming de la région.</p><p>Ce partenariat nous permettra de :</p><ul><li>Bénéficier de matériel de qualité pour nos tournois</li><li>Offrir des réductions exclusives à nos membres</li><li>Organiser des démonstrations de nouveaux produits</li></ul><p>Code promo pour nos membres : <strong>LANPARTY15</strong> pour 15% de réduction !</p>',
 'Nouveau partenariat avec GameZone Hardware - réductions pour nos membres !',
 ADMIN_ID, 1, NOW() - INTERVAL 1 DAY);

-- ─── Événements de démonstration ──────────────────────────────────────────────
INSERT IGNORE INTO `events` (title, slug, description, location, start_date, end_date, max_participants, is_active, is_published) VALUES

('LAN Party Été 2025',
 'lan-party-ete-2025',
 '<p>L\'événement de l\'été est là ! Rejoignez-nous pour 48 heures de gaming intensif dans une ambiance conviviale et festive.</p><p><strong>Au programme :</strong></p><ul><li>Tournoi CS2 (prix à gagner !)</li><li>Tournoi Rocket League</li><li>Free-play toute la nuit</li><li>Animations et concours</li><li>Restauration sur place</li></ul><p>Places limitées, inscrivez-vous vite !</p>',
 'Salle Omnisports de la Ville, 12 Rue du Sport',
 DATE_ADD(NOW(), INTERVAL 30 DAY),
 DATE_ADD(NOW(), INTERVAL 32 DAY),
 64, 1, 1),

('Mini LAN Printemps',
 'mini-lan-printemps',
 '<p>Une mini LAN décontractée pour se retrouver entre passionnés et passer un bon week-end de jeu !</p><p>Format plus petit et familial, idéal pour les nouveaux membres qui souhaitent découvrir l\'ambiance LAN.</p>',
 'Local de l\'association, 5 Avenue des Gamers',
 DATE_SUB(NOW(), INTERVAL 60 DAY),
 DATE_SUB(NOW(), INTERVAL 59 DAY),
 24, 0, 1),

('LAN Party Hiver 2024',
 'lan-party-hiver-2024',
 '<p>La LAN de l\'hiver a été un grand succès avec plus de 50 participants ! Merci à tous pour votre participation et votre bonne humeur.</p><p>Retrouvez les photos et résultats dans la galerie.</p>',
 'Espace Culturel Municipal',
 DATE_SUB(NOW(), INTERVAL 120 DAY),
 DATE_SUB(NOW(), INTERVAL 118 DAY),
 56, 0, 1);
