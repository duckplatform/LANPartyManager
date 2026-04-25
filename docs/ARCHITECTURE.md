# LANPartyManager — Documentation technique

## Architecture

### Vue d'ensemble

```
LANPartyManager/
├── app.js                    # Point d'entrée de l'application
├── package.json              # Dépendances et scripts npm
├── .gitignore
│
├── config/
│   ├── database.js           # Pool de connexion MySQL (mysql2/promise)
│   ├── logger.js             # Configuration du logger Winston
│   └── markdown.js           # Utilitaire de rendu Markdown sécurisé (marked + sanitize-html)
│
├── middleware/
│   ├── auth.js               # requireAuth, requireAdmin, injectLocals
│   └── rateLimiter.js        # Rate limiting global et auth (express-rate-limit)
│
├── models/
│   ├── User.js               # CRUD utilisateur + bcrypt
│   ├── Announcement.js       # CRUD annonces (blog/news)
│   ├── Event.js              # CRUD événements
│   ├── EventRegistration.js  # CRUD inscriptions + QR code badge
│   ├── Game.js               # CRUD jeux (rencontres) — Étape 5
│   ├── Room.js               # CRUD salles de jeu — Étape 5
│   └── Battle.js             # CRUD rencontres + file d'attente auto — Étape 5
│
├── services/
│   └── discord.js            # Notifications Discord (REST, embeds, sans WebSocket)
│
├── routes/
│   ├── index.js              # GET / (page d'accueil + dernières annonces)
│   ├── auth.js               # GET/POST /auth/login, register, logout
│   ├── profile.js            # GET/POST /profile, /profile/password
│   ├── admin.js              # GET /admin, gestion users + annonces + jeux + salles
│   ├── events.js             # GET/POST /events (public + inscription)
│   ├── moderator.js          # GET/POST /moderator (contrôle billets)
│   ├── battles.js            # GET/POST /battles (gestion rencontres) — Étape 5
│   └── news.js               # GET /news, GET /news/:id (public)
│
├── views/
│   ├── partials/
│   │   ├── head.ejs          # Début de page HTML (doctype, head, header, flash)
│   │   ├── foot.ejs          # Fin de page HTML (footer, scripts)
│   │   ├── header.ejs        # Barre de navigation (avec lien Actualités)
│   │   ├── footer.ejs        # Pied de page
│   │   └── flash.ejs         # Messages flash (succès/erreur/info)
│   ├── index.ejs             # Page d'accueil (avec dernières annonces)
│   ├── profile.ejs           # Page profil utilisateur
│   ├── auth/
│   │   ├── login.ejs         # Formulaire de connexion
│   │   └── register.ejs      # Formulaire d'inscription
│   ├── news/
│   │   ├── index.ejs         # Liste des annonces publiées (/news)
│   │   └── show.ejs          # Détail d'une annonce (/news/:id)
│   ├── admin/
│   │   ├── dashboard.ejs     # Panneau d'administration
│   │   ├── games/            # Gestion des jeux (rencontres) — Étape 5
│   │   │   ├── index.ejs     # Liste des jeux
│   │   │   ├── create.ejs    # Formulaire création
│   │   │   └── edit.ejs      # Formulaire modification
│   │   ├── rooms/            # Gestion des salles — Étape 5
│   │   │   ├── index.ejs     # Liste des salles (par événement)
│   │   │   ├── create.ejs    # Formulaire création
│   │   │   └── edit.ejs      # Formulaire modification
│   │   └── news/
│   │       ├── index.ejs     # Gestion des annonces (admin)
│   │       └── form.ejs      # Formulaire création/modification
│   ├── moderator/
│   │   ├── index.ejs         # Liste événements (contrôle billets)
│   │   ├── scan.ejs          # Scan QR code
│   │   ├── verify.ejs        # Vérification badge
│   │   └── battles/          # Gestion rencontres — Étape 5
│   │       ├── index.ejs     # Liste événements (rencontres)
│   │       ├── dashboard.ejs # Tableau de bord rencontres + file d'attente
│   │       ├── create-step1.ejs  # Wizard : choix du jeu
│   │       ├── create-step2.ejs  # Wizard : identification joueurs
│   │       └── announce.ejs  # Vue récapitulative écran d'annonce
│   └── errors/
│       ├── 404.ejs           # Page 404
│       └── 500.ejs           # Page 500
│
├── public/
│   ├── css/style.css         # Feuille de style (thème gaming dark/neon)
│   └── js/main.js            # JavaScript frontend (menu, flash, tabs, pwd toggle)
│
├── database/
│   ├── install.sql           # Schéma SQL complet (tables + contraintes + compte admin)
│   ├── seeds/
│   │   └── codespace.sql     # Jeu de donnees de demonstration pour Codespace
│
├── tests/
│   ├── game.test.js          # Tests unitaires modèle Game — Étape 5
│   ├── room.test.js          # Tests unitaires modèle Room — Étape 5
│   ├── battle.test.js        # Tests unitaires modèle Battle — Étape 5
│   ├── discord.test.js       # Tests unitaires service Discord
│   ├── event.test.js         # Tests unitaires modèle Event
│   ├── event_registration.test.js  # Tests unitaires modèle EventRegistration
│   ├── middleware.test.js    # Tests unitaires middleware
│   ├── routes.test.js        # Tests d'intégration routes
│   └── user.test.js          # Tests unitaires modèle User
│
├── logs/                     # Dossier créé automatiquement au démarrage
│   ├── app.log               # Log principal
│   └── error.log             # Erreurs uniquement
│
└── docs/
    ├── ARCHITECTURE.md       # Ce fichier
    └── USAGE.md              # Guide d'utilisation
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Node.js ≥ 16 |
| Framework HTTP | Express 4.x |
| Base de données | MySQL 5.7+ / MariaDB 10+ |
| Driver DB | mysql2/promise (pool de connexions) |
| Templates | EJS (Embedded JavaScript) |
| Authentification | Sessions (express-session) + bcryptjs |
| Protection CSRF | csrf-sync (Synchroniser Token Pattern) |
| Sécurité headers | helmet |
| Rate limiting | express-rate-limit |
| Validation | express-validator |
| Rendu Markdown | marked + sanitize-html (XSS safe) |
| Logging | winston (console + fichiers rotatifs) |
| HTTP log | morgan → winston |
| Notifications Discord | discord.js v14 (REST uniquement, sans WebSocket) |

### Modèle de données

### Initialisation Codespace

Le bootstrap Codespace repose sur [.devcontainer/init-db.sh](.devcontainer/init-db.sh), execute via le postCreateCommand du conteneur. Il effectue, dans l'ordre :

1. creation de la base si necessaire ;
2. import du schema complet depuis [database/install.sql](database/install.sql) ;
3. import du jeu de donnees de demonstration depuis [database/seeds/codespace.sql](database/seeds/codespace.sql).

Le seed est idempotent : il ajoute uniquement des enregistrements de demonstration absents, sans supprimer les donnees deja saisies dans le Codespace.

**Table `users`**

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT UNSIGNED AUTO_INCREMENT | Clé primaire |
| nom | VARCHAR(100) | Nom de famille |
| prenom | VARCHAR(100) | Prénom |
| pseudo | VARCHAR(50) | Surnom en jeu (unique dans l'interface) |
| email | VARCHAR(255) UNIQUE | Adresse e-mail (login) |
| password | VARCHAR(255) | Mot de passe haché (bcrypt 12 rounds) |
| is_admin | TINYINT(1) DEFAULT 0 | 1 = admin, 0 = membre |
| created_at | DATETIME | Date de création |
| updated_at | DATETIME | Date de dernière modification |

**Table `announcements`**

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT UNSIGNED AUTO_INCREMENT | Clé primaire |
| titre | VARCHAR(255) | Titre de l'annonce |
| contenu | LONGTEXT | Contenu en syntaxe Markdown |
| statut | ENUM('publie','brouillon') | Statut de publication |
| created_at | DATETIME | Date de création |
| updated_at | DATETIME | Date de dernière modification |

**Table `games`** *(Étape 5 — Système de rencontres)*

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT UNSIGNED AUTO_INCREMENT | Clé primaire |
| nom | VARCHAR(100) | Nom du jeu |
| console | VARCHAR(100) | Console / plateforme (PC, PS5, Xbox…) |
| type_rencontre | ENUM('1v1','2v2') | Format de la rencontre |
| created_at | DATETIME | Date de création |
| updated_at | DATETIME | Date de dernière modification |

**Table `rooms`** *(Étape 5 — Système de rencontres)*

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT UNSIGNED AUTO_INCREMENT | Clé primaire |
| nom | VARCHAR(100) | Nom auto-généré (jeux vidéo iconiques) |
| type | ENUM('console','simulation') | Type de la salle |
| type_rencontre | ENUM('1v1','2v2') | Format de rencontre supporté |
| actif | TINYINT(1) DEFAULT 1 | 1 = active, 0 = inactive (panne) |
| event_id | INT UNSIGNED | Référence vers events.id (CASCADE) |
| created_at | DATETIME | Date de création |
| updated_at | DATETIME | Date de dernière modification |

**Table `battles`** *(Étape 5 — Système de rencontres)*

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT UNSIGNED AUTO_INCREMENT | Clé primaire |
| event_id | INT UNSIGNED | Référence vers events.id (CASCADE) |
| game_id | INT UNSIGNED | Référence vers games.id (RESTRICT) |
| room_id | INT UNSIGNED NULL | Référence vers rooms.id (SET NULL) |
| statut | ENUM | file_attente / planifie / en_attente / en_cours / termine |
| score | VARCHAR(100) NULL | Score final saisi manuellement |
| notes | TEXT NULL | Notes libres du modérateur |
| created_at | DATETIME | Date de création |
| updated_at | DATETIME | Date de dernière modification |

**Table `battle_players`** *(Étape 5 — Système de rencontres)*

| Colonne | Type | Description |
|---------|------|-------------|
| id | INT UNSIGNED AUTO_INCREMENT | Clé primaire |
| battle_id | INT UNSIGNED | Référence vers battles.id (CASCADE) |
| user_id | INT UNSIGNED | Référence vers users.id (CASCADE) |
| equipe | TINYINT(1) DEFAULT 1 | Numéro d'équipe (1 ou 2) |
| est_gagnant | TINYINT(1) DEFAULT 0 | 1 = gagnant, 0 = perdant |

### Système de rencontres (Étape 5)

#### Logique de file d'attente automatique

1. À la **création** d'une rencontre : le système vérifie si une salle est disponible (active, bon type, sans battle en_attente/en_cours). Si oui → statut `planifie` + salle attribuée. Sinon → statut `file_attente`.
2. À la **fin** d'une rencontre (`termine`) : `reevaluateQueue()` parcourt les rencontres en `file_attente` par ordre chronologique et tente d'assigner une salle à chacune.
3. **Règle immuable** : une salle attribuée ne peut jamais changer.

#### Cycle de vie d'une rencontre

```
file_attente  →  planifie  →  en_attente  →  en_cours  →  termine
     │                │            │              │
     └── (salle dispo)┘    (Joueurs   (Lancer     (Score +
                             en place)  la partie)  gagnants)
```

#### Rôles

- **Admin** : gère les jeux (`/admin/games`) et les salles (`/admin/rooms`)
- **Admin/Modérateur** : crée et gère les rencontres (`/battles/events/:id`)
- **Admin/Modérateur** : consulte la vue annonces (`/battles/events/:id/announce`)

### Intégration Discord

Le service `services/discord.js` envoie des notifications formatées (Discord Embeds) sur des canaux Discord configurés lors des événements métier suivants :

| Déclencheur | Canal | Message |
|-------------|-------|---------|
| Création d'un événement | `DISCORD_CHANNEL_EVENTS` | Embed bleu avec nom, date, lieu |
| Passage d'un événement en statut `en_cours` | `DISCORD_CHANNEL_EVENTS` | Embed vert + mention `@everyone` |
| Passage d'un événement en statut `termine` | `DISCORD_CHANNEL_EVENTS` | Embed rouge |
| Publication d'une actualité (création ou mise à jour vers `publie`) | `DISCORD_CHANNEL_NEWS` | Embed jaune avec résumé et lien |

**Caractéristiques techniques :**
- Utilise l'API REST Discord via `discord.js` v14 (pas de connexion WebSocket permanente)
- Les erreurs Discord ne sont jamais propagées à l'application (dégradation gracieuse)
- Toutes les actions sont journalisées via Winston (`[DISCORD]`)
- Si `DISCORD_BOT_TOKEN` est absent, les notifications sont silencieusement ignorées

### Flux de sécurité

1. **Helmet** — Headers HTTP sécurisés (CSP, HSTS, X-Frame-Options, etc.)
2. **Rate Limiting** — 200 req/15min global, 10 req/15min sur les routes auth
3. **Sessions** — express-session avec cookie `httpOnly`, `sameSite: lax`, `secure` en prod
4. **CSRF** — csrf-sync (Synchroniser Token Pattern) sur toutes les routes POST
5. **Bcrypt** — Mots de passe hachés avec 12 rounds
6. **Validation** — express-validator sur tous les formulaires
7. **Requêtes préparées** — mysql2 avec paramètres bind (anti-injection SQL)
8. **Session regenerate** — Régénération de session après login/register (anti-fixation)

---

## Développement avec GitHub Codespace

Le dépôt inclut une configuration `.devcontainer/` clé-en-main pour GitHub Codespace.
L'environnement complet (Node.js 20 + MySQL 8.0) est provisionné automatiquement.

### Démarrage rapide

1. Ouvrez le dépôt sur GitHub
2. Cliquez sur **Code → Codespaces → Create codespace on \<branch\>**
3. Attendez la fin du provisionnement (~2–3 min pour la première fois)
4. L'application démarre automatiquement et le port **3000 est exposé en public**
5. Cliquez sur l'URL affichée dans l'onglet **Ports** pour accéder à l'application

### Ce qui est provisionné automatiquement

| Étape | Déclencheur | Action |
|-------|-------------|--------|
| Création du Codespace | `postCreateCommand` | `npm install` + initialisation du schéma MySQL (`database/install.sql`) |
| Chaque ouverture | `postStartCommand` | Démarrage de `node app.js` en arrière-plan |
| Port 3000 | `portsAttributes` | Visibilité **public** (aucune action manuelle requise) |

### Identifiants admin par défaut (Codespace)

| Variable | Valeur |
|----------|--------|
| Email | `admin@lanparty.local` |
| Mot de passe | `Admin1234` |

> ⚠️ Ces identifiants ne sont valables qu'en développement Codespace.

### Variables d'environnement injectées (Codespace)

Définies dans `.devcontainer/docker-compose.yml` :

| Variable | Valeur Codespace |
|----------|-----------------|
| `DB_HOST` | `mysql` (nom du service Docker) |
| `DB_USER` | `lanparty` |
| `DB_PASSWORD` | `lanparty_dev` |
| `DB_NAME` | `lanpartymanager` |
| `NODE_ENV` | `development` |
| `PORT` | `3000` |
| `SESSION_SECRET` | `codespace-session-secret-not-for-production` |
| `LOG_LEVEL` | `debug` |

### Commandes utiles en Codespace

```bash
# Consulter les logs de l'application
tail -f /tmp/app.log

# Redémarrer l'application
bash .devcontainer/start-app.sh

# Exécuter les tests
npm test

# Se connecter à MySQL (le mot de passe est demandé interactivement)
MYSQL_PWD=lanparty_dev mysql -h mysql -u lanparty lanpartymanager
```

---

## Installation

### Prérequis

- Node.js ≥ 16.0.0
- MySQL 5.7+ ou MariaDB 10+
- Serveur cPanel avec Node.js selector

### 1. Base de données

1. Connectez-vous à PHPMyAdmin
2. Créez une nouvelle base de données (ex : `lanpartymanager`)
3. Sélectionnez la base, allez dans **Importer**
4. Importez le fichier `database/install.sql`
5. Vérifiez la création des tables `users` et `announcements`, et du compte admin

> **Mise à jour d'une installation existante** : réimportez le schéma complet via `database/install.sql` puis redémarrez l'application.

### 2. Application

```bash
# Cloner / déposer les fichiers sur le serveur
# Dans le dossier de l'application :
npm install --omit=dev
```

### 3. Variables d'environnement (cPanel)

Configurez ces variables dans l'interface cPanel → **Node.js Selector** :

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_USER` | Utilisateur MySQL | `mon_user` |
| `DB_PASSWORD` | Mot de passe MySQL | `secret` |
| `DB_NAME` | Nom de la base | `lanpartymanager` |
| `DB_PORT` | Port MySQL (optionnel) | `3306` |
| `SESSION_SECRET` | Secret de session (clé longue aléatoire) | `abc123...xyz` |
| `NODE_ENV` | Environnement | `production` |
| `PORT` | Port d'écoute (optionnel) | `3000` |
| `LOG_LEVEL` | Niveau de log (optionnel) | `info` |
| `APP_URL` | URL publique du site (pour les liens Discord) | `https://monsite.example.com` |
| `DISCORD_BOT_TOKEN` | Token du bot Discord (optionnel) | `MTxxxxxxxx.xxxxxx.xxxxxxxxxx` |
| `DISCORD_CHANNEL_EVENTS` | ID du canal Discord pour les événements (optionnel) | `123456789012345678` |
| `DISCORD_CHANNEL_NEWS` | ID du canal Discord pour les actualités (optionnel) | `987654321098765432` |

> ⚠️ **`SESSION_SECRET`** doit être une chaîne longue et aléatoire (64+ caractères).

> 💡 **Discord (optionnel)** : si `DISCORD_BOT_TOKEN` est absent, les notifications Discord sont simplement désactivées sans impact sur le reste de l'application.

### Comment obtenir les paramètres Discord

1. Créez un bot sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Copiez le **Token** du bot → `DISCORD_BOT_TOKEN`
3. Activez le mode développeur dans Discord (Paramètres → Avancés → Mode développeur)
4. Clic droit sur un canal → **Copier l'identifiant** → `DISCORD_CHANNEL_EVENTS` ou `DISCORD_CHANNEL_NEWS`
5. Invitez le bot sur votre serveur avec la permission **Envoyer des messages** (scope `bot` + permission `Send Messages`)

### 4. Démarrage

```bash
npm start
# ou via cPanel Node.js Selector → Start Application
```

### 5. Première connexion

Compte administrateur par défaut :
- **Email** : `admin@lanparty.local`
- **Mot de passe** : `Admin1234`

> ⚠️ **Changez immédiatement ce mot de passe après la première connexion !**

---

## Mise à jour

1. Sauvegardez la base de données (export SQL via PHPMyAdmin)
2. Déposez les nouveaux fichiers (sauf `node_modules/` et `logs/`)
3. Exécutez `npm install --omit=dev` si les dépendances ont changé
4. Redémarrez l'application dans cPanel Node.js Selector
5. Vérifiez les logs (`logs/app.log`) après redémarrage

---

## Exécution des tests

```bash
# Tous les tests (requires Node.js + deps)
npm test

# Avec affichage du rapport de couverture (si nyc installé)
npx nyc npm test
```

Les tests utilisent des stubs (sinon) pour simuler la base de données et ne nécessitent pas de connexion MySQL.

---

## Logs

Les logs sont écrits dans le dossier `logs/` :
- `logs/app.log` — Toutes les activités (niveau configuré via `LOG_LEVEL`)
- `logs/error.log` — Erreurs uniquement

En développement, les logs sont également affichés en console avec couleurs.

Rotation automatique : max 5 fichiers × 5 MB.
