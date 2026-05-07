# LANPartyManager — Installation & Configuration

## Prérequis

| Outil | Version minimale |
|-------|-----------------|
| Node.js | ≥ 16 |
| MySQL | 5.7+ ou MariaDB 10+ |
| npm | ≥ 8 |

---

## Installation sur VPS / cPanel

### 1. Importer la base de données

Depuis **PHPMyAdmin** ou la ligne de commande, importez le schéma complet :

```bash
mysql -u <user> -p <database> < database/install.sql
```

> ⚠️ `database/install.sql` est la **source de vérité unique** du schéma. Il n'y a pas de migrations SQL incrémentales à maintenir.

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copiez `.env.example` en `.env` et renseignez les valeurs :

```env
# Serveur
PORT=3000
NODE_ENV=production

# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=votre_utilisateur
DB_PASSWORD=votre_mot_de_passe
DB_NAME=votre_base

# Sessions (changer impérativement en production)
SESSION_SECRET=changez-moi-en-production

# Discord OAuth (optionnel)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=https://votre-domaine.com/auth/discord/callback
DISCORD_BOT_TOKEN=

# URL publique
APP_URL=https://votre-domaine.com
```

### 4. Démarrer l'application

```bash
npm start
```

---

## Compte admin par défaut

| Champ | Valeur |
|-------|--------|
| Email | `admin@lanparty.local` |
| Mot de passe | `Admin1234` |

> ⚠️ **Changez ce mot de passe dès la première connexion.**

---

## Environnement de développement (Codespace / Docker)

Dans un Codespace, l'initialisation importe automatiquement un jeu de données de démonstration :

- utilisateurs de test (admin, modératrice et joueurs)
- actualités publiées + brouillon
- événements planifié / en cours / terminé
- inscriptions, jeux, salles et rencontres de démonstration

**Comptes de test disponibles :**

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@lanparty.local` | `Admin1234` | Admin |
| `lea.martin@lanparty.local` | `Admin1234` | Modératrice |
| `hugo.bernard@lanparty.local` | `Admin1234` | Joueur |

### Réinitialiser la base de données

```bash
# Réappliquer le schéma + le jeu de démonstration
bash .devcontainer/init-db.sh

# Repartir d'une base propre
npm run db:reset
```

### Connexion MySQL en Codespace

- **Système :** MySQL
- **Serveur :** `db`
- **Identifiants :** voir `.devcontainer/docker-compose.yml`

---

## Tests

```bash
npm test
```

Les tests couvrent les modèles, services, middlewares et routes. Ils sont compatibles avec Node.js standard (pas de dépendance à un environnement Docker spécifique).

---

## Monitoring & Logs

Les logs sont écrits dans le dossier `logs/` (créé automatiquement au démarrage) :

| Fichier | Contenu |
|---------|---------|
| `logs/app.log` | Log principal (toutes les requêtes + infos) |
| `logs/error.log` | Erreurs uniquement |

Le niveau de log est configurable via la variable d'environnement `LOG_LEVEL` (`debug`, `info`, `warn`, `error`).

---

## Mise à jour

1. Sauvegardez la base de données
2. Récupérez les nouvelles sources
3. Relancez `npm install`
4. Si le schéma a évolué, ré-importez `database/install.sql` *(attention : opération destructive, sauvegardez d'abord)*
5. Redémarrez l'application

> Pour le détail des changements entre versions, consultez [UPDATES.md](UPDATES.md).
