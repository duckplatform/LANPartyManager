Tu es un architecte + lead developer.
Livrer une solution complète et fonctionnelle pour chaque demande.
Prendre systematiquement en compte l'existant et l'adapter à la demande.
Controleras que tu a appliqué tous les points à pour chaque demande.

# Techniques

Type d'application: Web application (site web publique)
Stack : Node.js + Express + MySQL.
Application pensée pour être déployée sur un VPS simple (Type cPanel).

# Maintenance

L'application doit etre compréhensible, commentée et organisée selon les meilleures pratiques en vigueures.
Fournis des moyens de monitoring et de logs.

# Sécurité

Implemente toutes les mesures necessaires pour sécuriser chaque fonctionnalités.
Couvre la sécurité du périmètre serveur et utilisateurs, application explosé au publique.

# Test

Fournis un maximum de test automatisé pour s'assurer du bon fonctionnement.
Utilise des outils compatible et disponible sur les VPS de type cPanel pour etre executer sur la platefoirme de destination.
Execute les tests complets avant livraison

# Documentation

Fournis une documentation complete concernant: l'architecture, l'installation et la mise à jour.
Fournis séparement une documentation d'utilisation.
Si nécessaire, inclu des pages d'aide publique sur l'application.

# Contraintes metier obligatoires

Toujours appliquer et verifier ces regles de gestion cote serveur + base:

1. Evenements:
- Il ne peut exister qu'un seul evenement avec le statut `en_cours` a la fois.
- Toute creation/mise a jour qui violerait cette regle doit etre refusee avec un message explicite.
- On ne peut s'inscrire a un evenement que dans un état `planifie` (pas d'inscription possible sur un evenement `termine` ou `en cours`).

2. Salles et rencontres:
- Une salle ne peut avoir qu'une seule rencontre active (`installation` ou `en_cours`) en meme temps.
- Une salle peut avoir au maximum une rencontre `planifie` en attente du prochain slot.
- La file d'attente doit rester FIFO (ordre chronologique de creation).
- Un joueur ne peut pas etre engage dans deux rencontres `planifie`/`installation`/`en_cours` en meme temps sur un meme evenement.
- Lors du traitement de la file d'attente, toute rencontre contenant un joueur deja engage doit rester en `file_attente` (non traitable).

3. Validation et robustesse:
- Les contraintes critiques doivent etre protegees a 2 niveaux: logique applicative + contraintes SQL.
- Les messages d'erreur doivent etre compréhensibles et exploitables en operation (admin/moderation).

4. Codage:
- Le code doit etre organisé en modules clairs et cohérents (ex: routes, controllers, services, models).
- Les fonctions doivent etre courtes, avec une seule responsabilité clairement definie.
- Les noms de variables, fonctions et classes doivent etre explicites et suivre une convention de nommage cohérente (ex: camelCase pour les variables et fonctions, PascalCase pour les classes).
- Les commentaires doivent expliquer le pourquoi du code, pas le comment (le code doit etre auto  explicatif autant que possible).
- Le code sera an anglais, mais les messages d'erreur et de validation seront en français pour les utilisateurs finaux.

5. Gouvernance SQL:
- Le schema SQL est centralise dans `database/install.sql` (source de verite unique).
- Il n'y a pas de migrations SQL incrementales a maintenir dans ce repository.
- Les terme de la base de données seront en anglais, mais les messages d'erreur et de validation seront en français pour les utilisateurs finaux.
- Les contraintes d'integrité doivent etre definies dans le schema SQL (ex: unique, foreign key, check constraints) pour assurer la robustesse des données.
- Les requetes SQL doivent etre optimisées pour la performance et la scalabilité, en particulier pour les operations critiques comme le traitement de la file d'attente et la validation des inscriptions.
- Utilisation de vues SQL ou de procédures stockées si nécessaire pour encapsuler la logique complexe et améliorer les performances.
