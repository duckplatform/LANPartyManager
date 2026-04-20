# LANPartyManager

Application **Node.js / Express + MySQL** de gestion des membres d'une association de jeux vidéo.

---

## Fonctionnalités

| Fonctionnalité | Endpoint | Accès |
|---|---|---|
| Inscription | `POST /api/auth/register` | Public |
| Connexion | `POST /api/auth/login` | Public |
| Voir son profil | `GET /api/members/me` | Membre authentifié |
| Mettre à jour son profil | `PUT /api/members/me` | Membre authentifié |
| Lister tous les membres | `GET /api/members` | Admin seulement |
| Supprimer un membre | `DELETE /api/members/:id` | Admin seulement |
| Health check | `GET /api/health` | Public |

### Compte admin par défaut

| Champ | Valeur |
|---|---|
| Email | `admin@lanparty.local` |
| Mot de passe | `Admin@123` |

> ⚠️ Changez ces valeurs dans votre fichier `.env` avant de déployer en production.

---

## Prérequis

- **Node.js** ≥ 18
- **MySQL** ≥ 8.0 ou **MariaDB** ≥ 10.6

---

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/duckplatform/LANPartyManager.git
cd LANPartyManager

# 2. Installer les dépendances
npm install

# 3. Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres (DB, JWT_SECRET, etc.)

# 4. Initialiser la base de données (crée la BDD, la table et le compte admin)
npm run db:init

# 5. Démarrer l'application
npm start
```

Le serveur écoute par défaut sur **http://localhost:3000**.

---

## Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `PORT` | Port du serveur HTTP | `3000` |
| `NODE_ENV` | Environnement (`development`, `production`, `test`) | `development` |
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL/MariaDB | *(vide)* |
| `DB_NAME` | Nom de la base de données | `lan_party_manager` |
| `DB_SOCKET_PATH` | Chemin du socket unix MariaDB/MySQL (optionnel, remplace host/port) | *(non défini)* |
| `JWT_SECRET` | Clé secrète JWT | *(obligatoire)* |
| `JWT_EXPIRES_IN` | Durée de validité des tokens | `24h` |
| `ADMIN_EMAIL` | Email du compte admin par défaut | `admin@lanparty.local` |
| `ADMIN_PASSWORD` | Mot de passe du compte admin par défaut | `Admin@123` |

---

## MariaDB – authentification par socket unix

Sur les distributions Linux (Debian, Ubuntu…), le compte `root` de MariaDB utilise par défaut le plugin `unix_socket` plutôt qu'un mot de passe TCP. `npm run db:init` peut alors échouer avec `Access denied` même si le mot de passe dans `.env` est correct.

**Solution A – utiliser le socket unix (recommandé)**

Ajoutez dans votre `.env` :

```ini
DB_SOCKET_PATH=/var/run/mysqld/mysqld.sock
DB_PASSWORD=
```

> Le chemin exact peut varier : `/run/mysqld/mysqld.sock` ou `/tmp/mysql.sock` selon la distribution.

**Solution B – créer un utilisateur dédié avec mot de passe TCP**

```sql
CREATE USER 'lpm'@'localhost' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON lan_party_manager.* TO 'lpm'@'localhost';
GRANT ALL PRIVILEGES ON lan_party_manager_test.* TO 'lpm'@'localhost';
FLUSH PRIVILEGES;
```

Puis dans `.env` :

```ini
DB_USER=lpm
DB_PASSWORD=votre_mot_de_passe
```

---

## Structure du projet

```
LANPartyManager/
├── src/
│   ├── app.js               # Point d'entrée Express
│   ├── config/
│   │   ├── database.js      # Pool de connexions MySQL
│   │   └── initDb.js        # Script d'initialisation de la BDD
│   ├── middleware/
│   │   └── auth.js          # Middleware JWT (authenticate, requireAdmin)
│   ├── models/
│   │   └── member.js        # Couche d'accès aux données (membres)
│   └── routes/
│       ├── auth.js          # Routes d'authentification
│       └── members.js       # Routes de gestion du profil et administration
├── tests/
│   ├── auth.test.js         # Tests des endpoints d'authentification
│   ├── members.test.js      # Tests des endpoints membres / admin
│   ├── testDb.js            # Helpers de base de données pour les tests
│   └── globalTeardown.js    # Nettoyage Jest (fermeture du pool MySQL)
├── .env.example             # Modèle de fichier d'environnement
├── .env.test                # Variables d'environnement pour les tests
├── package.json
└── README.md
```

---

## API Reference

### `POST /api/auth/register`

Inscrit un nouveau membre.

**Corps de la requête**
```json
{
  "nom":      "Dupont",
  "prenom":   "Jean",
  "surnom":   "jd42",
  "email":    "jean.dupont@example.com",
  "password": "secret123"
}
```

**Réponse 201**
```json
{
  "message": "Inscription réussie.",
  "member": {
    "id": 2,
    "nom": "Dupont",
    "prenom": "Jean",
    "surnom": "jd42",
    "email": "jean.dupont@example.com",
    "role": "member",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### `POST /api/auth/login`

Authentifie un membre et retourne un token JWT.

**Corps de la requête**
```json
{
  "email":    "jean.dupont@example.com",
  "password": "secret123"
}
```

**Réponse 200**
```json
{
  "message": "Connexion réussie.",
  "token": "<JWT>",
  "member": { ... }
}
```

---

### `GET /api/members/me`

Retourne le profil du membre authentifié.

**En-tête requis** : `Authorization: Bearer <JWT>`

**Réponse 200**
```json
{
  "member": { "id": 2, "nom": "Dupont", ... }
}
```

---

### `PUT /api/members/me`

Met à jour le profil du membre authentifié (tous les champs sont optionnels).

**En-tête requis** : `Authorization: Bearer <JWT>`

**Corps de la requête** (exemple – changement de surnom + mot de passe)
```json
{
  "surnom":          "nouveau_surnom",
  "currentPassword": "ancienMotDePasse",
  "newPassword":     "nouveauMotDePasse"
}
```

> Pour changer le mot de passe, `currentPassword` et `newPassword` sont tous les deux obligatoires.

---

### `GET /api/members` *(admin)*

Liste tous les membres.

**En-tête requis** : `Authorization: Bearer <JWT admin>`

**Réponse 200**
```json
{
  "members": [ { "id": 1, "role": "admin", ... }, { "id": 2, "role": "member", ... } ]
}
```

---

### `DELETE /api/members/:id` *(admin)*

Supprime un membre par son identifiant.

**En-tête requis** : `Authorization: Bearer <JWT admin>`

**Réponse 200**
```json
{ "message": "Membre supprimé." }
```

---

## Tests automatisés

```bash
# Lancer les tests
npm test

# Avec rapport de couverture
npm run test:coverage
```

Les tests utilisent une base de données dédiée (`lan_party_manager_test`), créée automatiquement lors du premier lancement. Ils couvrent :

- Inscription : succès, champs manquants, email invalide, mot de passe trop court, doublons
- Connexion : succès, connexion admin, mauvais mot de passe, email inconnu, format invalide
- Profil : lecture, mise à jour (nom/prénom/surnom/email/mot de passe), erreurs de validation
- Administration : liste des membres, suppression, contrôles d'accès

---

## Sécurité

- Les mots de passe sont hachés avec **bcryptjs** (12 rounds).
- L'authentification repose sur des **JWT** (HS256, expiration configurable).
- Les routes sensibles sont protégées par les middlewares `authenticate` et `requireAdmin`.
- Les entrées utilisateur sont validées avec **express-validator**.
- Le mot de passe n'est jamais renvoyé dans les réponses API.