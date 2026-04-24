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
│   └── Announcement.js       # CRUD annonces (blog/news)
│
├── routes/
│   ├── index.js              # GET / (page d'accueil + dernières annonces)
│   ├── auth.js               # GET/POST /auth/login, register, logout
│   ├── profile.js            # GET/POST /profile, /profile/password
│   ├── admin.js              # GET /admin, gestion users + annonces
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
│   │   └── news/
│   │       ├── index.ejs     # Gestion des annonces (admin)
│   │       └── form.ejs      # Formulaire création/modification
│   └── errors/
│       ├── 404.ejs           # Page 404
│       └── 500.ejs           # Page 500
│
├── public/
│   ├── css/style.css         # Feuille de style (thème gaming dark/neon)
│   └── js/main.js            # JavaScript frontend (menu, flash, tabs, pwd toggle)
│
├── database/
│   ├── install.sql           # Script SQL d'installation (tables + compte admin)
│   └── migrations/
│       └── 001_add_announcements.sql  # Migration : ajout table announcements
│
├── tests/
│   ├── announcement.test.js  # Tests unitaires modèle Announcement
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

### Modèle de données

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

> **Mise à jour d'une installation existante** : si vous avez déjà une installation de la version précédente, importez uniquement `database/migrations/001_add_announcements.sql` pour ajouter la table `announcements` sans perdre vos données.

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

> ⚠️ **`SESSION_SECRET`** doit être une chaîne longue et aléatoire (64+ caractères).

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
