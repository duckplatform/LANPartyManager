# LANPartyManager

Site web pour association de jeux vidéo — gestion d'utilisateurs et panneau d'administration.

**Stack :** Node.js · Express · MySQL · EJS  
**Thème :** Gaming dark/neon (responsive)

## Installation rapide

```bash
# 1. Importer database/install.sql dans PHPMyAdmin
# 2. Configurer les variables d'environnement dans cPanel
npm install
npm start
```

Compte admin par défaut : `admin@lanparty.local` / `Admin1234`  
⚠️ Changez ce mot de passe dès la première connexion.

## Documentation

- [Architecture & Installation](docs/ARCHITECTURE.md)
- [Guide d'utilisation](docs/USAGE.md)

## Tests

```bash
npm test
```

## Consultation rapide de la base (Adminer)

Dans le Codespace, demarrer Adminer avec:

```bash
npm run db:adminer
```

Puis ouvrir le port `8081` (visibilite `private`) depuis l'onglet Ports.

Parametres de connexion habituels dans ce projet:
- Systeme: `MySQL`
- Serveur: `db`
- Utilisateur / mot de passe / base: voir `.devcontainer/docker-compose.yml`
