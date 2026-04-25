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

Dans le Codespace, l'initialisation importe aussi un jeu de donnees de demonstration :
- utilisateurs de test (admin, moderatrice et joueurs)
- actualites publiees + brouillon
- evenements planifie / en cours / termine
- inscriptions, jeux, salles et rencontres de demonstration

Comptes utiles :
- `admin@lanparty.local` / `Admin1234`
- `lea.martin@lanparty.local` / `Admin1234`
- `hugo.bernard@lanparty.local` / `Admin1234`

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

Pour reappliquer manuellement le schema et les donnees du Codespace :

```bash
bash .devcontainer/init-db.sh
```

Pour repartir d'une base Codespace propre avec le jeu de donnees de demonstration :

```bash
npm run db:reset
```
