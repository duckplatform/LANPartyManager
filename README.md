# LAN Party Manager

> Site web pour une association de jeux vidéo avec gestion d'utilisateurs.

**Stack :** Node.js · Express · MySQL · EJS

---

## Table des matières

- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [GitHub Codespaces](#github-codespaces)
- [Tests](#tests)
- [Mise à jour](#mise-à-jour)

---

## Architecture

```
LAN Party Manager
├── app.js                    # Point d'entrée - configuration Express
├── src/
│   ├── config/
│   │   ├── database.js       # Connexion MySQL (pool)
│   │   └── logger.js         # Système de logs Winston
│   ├── controllers/
│   │   ├── homeController.js # Page d'accueil
│   │   ├── authController.js # Auth : inscription/connexion/profil
│   │   └── adminController.js# Panneau d'administration
│   ├── middleware/
│   │   ├── auth.js           # Protection routes connecté
│   │   ├── adminAuth.js      # Protection routes admin
│   │   └── validation.js     # Validation des formulaires
│   ├── models/
│   │   └── User.js           # Modèle utilisateur (CRUD)
│   └── routes/
│       ├── index.js          # Route accueil
│       ├── auth.js           # Routes /auth/*
│       ├── profile.js        # Routes /profile/*
│       └── admin.js          # Routes /admin/*
├── views/                    # Templates EJS
│   ├── partials/layout.ejs   # Layout principal
│   ├── home.ejs              # Page d'accueil
│   ├── auth/                 # Connexion / Inscription / Profil
│   ├── admin/                # Tableau de bord / Gestion utilisateurs
│   └── errors/               # Pages d'erreur 403/404/500
├── public/
│   ├── css/style.css         # CSS thème gaming sombre
│   └── js/main.js            # JavaScript frontend
├── database/
│   └── schema.sql            # Schéma MySQL + compte admin par défaut
├── tests/
│   ├── unit/                 # Tests unitaires
│   └── integration/          # Tests d'intégration
└── .env.example              # Template de configuration
```

### Modèle de données

**Table `users`**

| Colonne      | Type                    | Description                 |
|--------------|-------------------------|-----------------------------|
| `id`         | INT AUTO_INCREMENT      | Identifiant unique          |
| `first_name` | VARCHAR(50)             | Prénom                      |
| `last_name`  | VARCHAR(50)             | Nom                         |
| `nickname`   | VARCHAR(30)             | Pseudo dans les jeux        |
| `email`      | VARCHAR(255) UNIQUE     | Adresse email               |
| `password`   | VARCHAR(255)            | Mot de passe hashé (bcrypt) |
| `role`       | ENUM('user', 'admin')   | Rôle                        |
| `created_at` | DATETIME                | Date d'inscription          |
| `updated_at` | DATETIME                | Dernière modification       |

### Sécurité

- **Mots de passe** : bcrypt (12 rounds)
- **Sessions** : cookie httpOnly + sameSite + durée limitée
- **CSRF** : double-submit cookie (csrf-csrf)
- **Rate Limiting** : global (500 req/15min) + login (10/15min)
- **En-têtes HTTP** : helmet (CSP, HSTS, XSS, etc.)
- **Injection SQL** : requêtes paramétrées uniquement
- **Validation** : express-validator côté serveur

---

## Installation

### Prérequis

- Node.js ≥ 16
- MySQL ≥ 5.7

### 1. Base de données

**Via PHPMyAdmin :**
1. Créer une base : `lan_party_manager` (utf8mb4_unicode_ci)
2. Importer `database/schema.sql`

**Via terminal :**
```bash
mysql -u root -p -e "CREATE DATABASE lan_party_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p lan_party_manager < database/schema.sql
```

### 2. Installation des dépendances

```bash
npm install
```

### 3. Configuration

```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

---

## Configuration

| Variable                     | Défaut                | Description               |
|------------------------------|-----------------------|---------------------------|
| `PORT`                       | `3000`                | Port du serveur           |
| `APP_URL`                    | `http://localhost:3000` | URL publique de l'application (sans slash final). Utilisée pour les liens canoniques et les logs. |
| `DB_HOST`                    | `localhost`           | Hôte MySQL                |
| `DB_USER`                    | `root`                | Utilisateur MySQL         |
| `DB_PASSWORD`                | *(vide)*              | Mot de passe MySQL        |
| `DB_NAME`                    | `lan_party_manager`   | Nom de la base            |
| `SESSION_SECRET`             | *(à changer!)*        | Clé secrète des sessions  |

---

## Démarrage

```bash
# Développement
npm run dev

# Production
NODE_ENV=production npm start
```

### Compte administrateur par défaut

| Email                   | Mot de passe      |
|-------------------------|-------------------|
| `admin@lanparty.local`  | `Admin@LAN2024!`  |

> ⚠️ **Changer immédiatement ce mot de passe après la première connexion.**

---

## GitHub Codespaces

Le projet inclut une configuration prête à l'emploi dans `.devcontainer/`.

### Ce qui est automatisé

- Démarrage d'un conteneur Node.js (service `app`)
- Démarrage d'un service MySQL 8 (`mysql`)
- Création/ajustement du fichier `.env` pour Codespaces
- Installation des dépendances (`npm ci`)
- Initialisation de la base via `database/schema.sql`

### Utilisation

1. Ouvrir le dépôt dans GitHub Codespaces
2. Attendre la fin de la phase `postCreate` (installation)
3. Lancer l'application :

```bash
npm run dev
```

4. Ouvrir le port `3000` (auto-preview activé)

---

## Tests

```bash
npm test                  # Tous les tests
npm run test:coverage     # Avec couverture de code
```

---

## Mise à jour

1. Sauvegarder la base de données
2. Mettre à jour les fichiers
3. `npm install`
4. Redémarrer l'application

---

## Logs

- `logs/app.log` — tous les logs
- `logs/error.log` — erreurs uniquement