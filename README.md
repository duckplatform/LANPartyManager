# LANPartyManager

> Portail web pour la gestion de LAN Party — événements, matchmaking, contrôle d'accès et classements en temps réel.

**Stack :** Node.js · Express · MySQL · EJS &nbsp;|&nbsp; **Thème :** Gaming dark/neon (responsive)

---

## Présentation

LANPartyManager est un portail complet pour organiser et animer des événements LAN. Il couvre l'ensemble du cycle de vie d'un événement, de l'inscription des participants jusqu'à l'affichage du classement final.

### Fonctionnalités principales

| Domaine | Fonctionnalités |
|---------|----------------|
| **Événements** | Création, planification et suivi d'état (planifié → en cours → terminé) |
| **Inscriptions** | Formulaire web + OAuth Discord · Badge QR code personnel |
| **Contrôle d'accès** | Scan de badge par les modérateurs pour valider l'entrée physique |
| **Rencontres** | Création par scan de badge + sélection du jeu · Attribution automatique de salle |
| **File d'attente** | Gestion FIFO automatique · Détection des conflits de joueurs |
| **Classement** | Suivi en temps réel des résultats et du classement par événement |
| **Notifications** | Intégration Discord (annonces, résultats) |
| **Administration** | Gestion complète des utilisateurs, jeux, salles et actualités |

---

## Captures d'écran

### Pages publiques

| Accueil | Événements | Détail événement | Actualités |
| --- | --- | --- | --- |
| <a href="docs/screenshots/01-accueil.png"><img src="docs/screenshots/01-accueil.png" alt="Accueil" width="150" /></a> | <a href="docs/screenshots/02-événements.png"><img src="docs/screenshots/02-événements.png" alt="Événements" width="150" /></a> | <a href="docs/screenshots/14-evenement-detail-public.png"><img src="docs/screenshots/14-evenement-detail-public.png" alt="Détail événement" width="150" /></a> | <a href="docs/screenshots/03-actualités.png"><img src="docs/screenshots/03-actualités.png" alt="Actualités" width="150" /></a> |

| Connexion | Inscription |
| --- | --- |
| <a href="docs/screenshots/04-connexion.png"><img src="docs/screenshots/04-connexion.png" alt="Connexion" width="150" /></a> | <a href="docs/screenshots/05-inscription.png"><img src="docs/screenshots/05-inscription.png" alt="Inscription" width="150" /></a> |

### Profil utilisateur

| Profil | Badge QR |
| --- | --- |
| <a href="docs/screenshots/15-profil-utilisateur.png"><img src="docs/screenshots/15-profil-utilisateur.png" alt="Profil utilisateur" width="150" /></a> | <a href="docs/screenshots/15b-badge-qr-code.png"><img src="docs/screenshots/15b-badge-qr-code.png" alt="Badge QR code" width="150" /></a> |

### Panel administrateur

| Dashboard | Événements | Jeux | Salles |
| --- | --- | --- | --- |
| <a href="docs/screenshots/06-dashboard-administrateur.png"><img src="docs/screenshots/06-dashboard-administrateur.png" alt="Dashboard administrateur" width="150" /></a> | <a href="docs/screenshots/07-gestion-des-événements.png"><img src="docs/screenshots/07-gestion-des-événements.png" alt="Gestion des événements" width="150" /></a> | <a href="docs/screenshots/08-gestion-des-jeux.png"><img src="docs/screenshots/08-gestion-des-jeux.png" alt="Gestion des jeux" width="150" /></a> | <a href="docs/screenshots/09-gestion-des-salles.png"><img src="docs/screenshots/09-gestion-des-salles.png" alt="Gestion des salles" width="150" /></a> |

| Actualités | Paramètres |
| --- | --- |
| <a href="docs/screenshots/13-gestion-de-l-actualité.png"><img src="docs/screenshots/13-gestion-de-l-actualité.png" alt="Gestion de l'actualité" width="150" /></a> | <a href="docs/screenshots/16-paramètres-de-l-application.png"><img src="docs/screenshots/16-paramètres-de-l-application.png" alt="Paramètres" width="150" /></a> |

### Modération et rencontres

| Contrôle d'accès | Scan tickets | Création rencontre |
| --- | --- | --- |
| <a href="docs/screenshots/10-contrôle-d-accès.png"><img src="docs/screenshots/10-contrôle-d-accès.png" alt="Contrôle d'accès" width="150" /></a> | <a href="docs/screenshots/17-scan-des-tickets.png"><img src="docs/screenshots/17-scan-des-tickets.png" alt="Scan tickets" width="150" /></a> | <a href="docs/screenshots/18-formulaire-rencontres.png"><img src="docs/screenshots/18-formulaire-rencontres.png" alt="Création rencontre" width="150" /></a> |

| Tableau de bord | Écran d'annonce |
| --- | --- |
| <a href="docs/screenshots/11-tableau-de-bord-rencontres.png"><img src="docs/screenshots/11-tableau-de-bord-rencontres.png" alt="Tableau de bord rencontres" width="150" /></a> | <a href="docs/screenshots/12-ecran-annonce.png"><img src="docs/screenshots/12-ecran-annonce.png" alt="Écran d'annonce" width="150" /></a> |

---

## Démarrage rapide

```bash
# 1. Importer database/install.sql dans PHPMyAdmin (ou via CLI)
# 2. Configurer les variables d'environnement
npm install
npm start
```

Pour l'installation complète, la configuration Discord et les variables d'environnement, voir [docs/INSTALLATION.md](docs/INSTALLATION.md).

---

## Documentation

| Document | Description |
|----------|-------------|
| [Installation & Configuration](docs/INSTALLATION.md) | Prérequis, variables d'environnement, démarrage, tests |
| [Architecture technique](docs/ARCHITECTURE.md) | Structure du projet, stack, modèle de données |
| [Guide d'utilisation](docs/USAGE.md) | Guide complet par profil (joueur, modérateur, admin) |
| [Configuration admin](docs/ADMIN_CONFIGURATION.md) | Configuration avancée depuis le panneau admin |
| [Journal des mises à jour](docs/UPDATES.md) | Historique des changements |
