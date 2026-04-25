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

2. Salles et rencontres:
- Une salle ne peut avoir qu'une seule rencontre active (`installation` ou `en_cours`) en meme temps.
- Une salle peut avoir au maximum une rencontre `planifie` en attente du prochain slot.
- La file d'attente doit rester FIFO (ordre chronologique de creation).
- Un joueur ne peut pas etre engage dans deux rencontres `planifie`/`installation`/`en_cours` en meme temps sur un meme evenement.
- Lors du traitement de la file d'attente, toute rencontre contenant un joueur deja engage doit rester en `file_attente` (non traitable).

3. Validation et robustesse:
- Les contraintes critiques doivent etre protegees a 2 niveaux: logique applicative + contraintes SQL.
- Les messages d'erreur doivent etre compréhensibles et exploitables en operation (admin/moderation).

4. Gouvernance SQL:
- Le schema SQL est centralise dans `database/install.sql` (source de verite unique).
- Il n'y a pas de migrations SQL incrementales a maintenir dans ce repository.
