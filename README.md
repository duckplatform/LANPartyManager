# LAN Party Manager

> Site web public pour une association de jeux vidéo — construit avec Node.js, Express et MySQL.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express)
![MySQL](https://img.shields.io/badge/MySQL-5.7%2B-4479A1?logo=mysql)
![License](https://img.shields.io/badge/licence-MIT-blue)

---

## ✨ Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🧙 **Assistant d'installation** | Wizard web en 4 étapes (DB → admin → données → terminé). Aucun fichier à éditer à la main. |
| 👤 **Système utilisateur** | Inscription, connexion, profil modifiable. Trois rôles : admin, modérateur, utilisateur. |
| 📰 **Gestion des actualités** | CRUD complet depuis le panel admin (titre, contenu, image de couverture). |
| 🎮 **Gestion des événements** | Création / modification / archivage. Un seul événement actif à la fois, inscription des membres. |
| 🛡️ **Panel d'administration** | Tableau de bord, modération des contenus et gestion des comptes utilisateurs. |
| 🌱 **Données de démo** | Jeu de données factices prêt à l'emploi (news, events, utilisateurs). |
| 📱 **Responsive** | Interface mobile-first avec thème gaming sombre (néon cyan/violet). |

---

## 🚀 Démarrage rapide

### Prérequis
- **Node.js** 18+ (LTS recommandé)
- **MySQL** 5.7+ ou MariaDB 10.3+
- **npm** 8+

### Installation via l'assistant web (recommandé)

```bash
# 1. Cloner le dépôt
git clone https://github.com/duckplatform/LANPartyManager.git
cd LANPartyManager

# 2. Installer les dépendances
npm install

# 3. Démarrer l'application
npm start
```

Ouvrez http://localhost:3000 — vous serez automatiquement redirigé vers l'**assistant d'installation** qui configure la base de données, crée le compte admin et charge optionnellement les données de démo, le tout **depuis votre navigateur**.

### Installation manuelle (alternative)

```bash
# Copier et éditer la configuration
cp .env.example .env
# → Renseigner DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, SESSION_SECRET

# Créer le schéma et les données de démo
node database/seed.js

# Démarrer
npm start
```

---

## 🎮 Comptes de démonstration (après chargement des seeds)

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Admin | `admin@lanparty.local` | `Admin123!` |
| Modérateur | `modo@lanparty.local` | `Modo123!` |
| Utilisateur | `user1@lanparty.local` | `User123!` |

---

## 🧪 Tests

```bash
npm test          # 17 tests Jest + Supertest (MySQL mocké — aucune DB requise)
```

---

## 📚 Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Structure du projet, couches MVC, flux de données |
| [Guide d'installation](docs/INSTALLATION.md) | Prérequis, déploiement cPanel/VPS, mise à jour |
| [Guide d'utilisation](docs/USER_GUIDE.md) | Utilisation du site public et du panel admin |

---

## 🔐 Sécurité

- **Helmet** — en-têtes HTTP sécurisés avec CSP
- **CSRF** — token sur tous les formulaires POST
- **Rate limiting** — 5 req/15 min sur les routes d'authentification
- **bcrypt** (12 rounds) — hachage des mots de passe
- **express-validator** — validation et sanitisation des entrées
- **Requêtes paramétrées** — protection SQL injection
- **Sessions sécurisées** — `httpOnly`, `sameSite: strict`, `secure` en production

---

## 🛠️ Stack technique

- **Runtime** : Node.js 18 LTS
- **Framework** : Express 4
- **Base de données** : MySQL 5.7 / MariaDB 10.3 (pilote `mysql2`)
- **Templating** : EJS
- **Sécurité** : Helmet, csurf, express-rate-limit, bcrypt, express-validator
- **Logging** : Winston + Morgan
- **Tests** : Jest + Supertest

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE).