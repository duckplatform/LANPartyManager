# Guide d'installation — LAN Party Manager

## Prérequis

- Node.js 18+ (LTS recommandé)
- MySQL 5.7+ ou MariaDB 10.3+
- npm 8+

## Installation rapide

### 1. Cloner le dépôt

```bash
git clone https://github.com/votre-repo/LANPartyManager.git
cd LANPartyManager
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer l'environnement

```bash
cp .env.example .env
nano .env
```

Remplissez les variables :

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=votre-secret-tres-long-et-aleatoire
DB_HOST=localhost
DB_PORT=3306
DB_USER=votre_user_mysql
DB_PASSWORD=votre_password_mysql
DB_NAME=lan_party_manager
APP_NAME=Votre Asso Gaming
```

### 4. Préparer la base de données MySQL

```sql
CREATE DATABASE lan_party_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lan_user'@'localhost' IDENTIFIED BY 'votre_password';
GRANT ALL PRIVILEGES ON lan_party_manager.* TO 'lan_user'@'localhost';
FLUSH PRIVILEGES;
```

### 5. Option A — Utiliser l'assistant d'installation (recommandé)

Démarrez l'application et accédez à `http://localhost:3000/install` :

```bash
npm start
```

L'assistant guidera la création des tables et du compte admin.

### 5. Option B — Installation via script de seeding

```bash
npm run seed
```

Cela crée les tables et charge des données de démonstration avec ces comptes :
- **Admin** : admin@lanparty.local / Admin123!
- **Modérateur** : modo@lanparty.local / Modo123!
- **Utilisateur** : gamer1@example.com / Gamer123!

### 6. Démarrer l'application

```bash
# Développement
npm run dev

# Production
npm start
```

## Configuration cPanel (VPS)

### Prérequis cPanel
- Node.js Selector activé dans cPanel
- SSH access

### Configuration

1. Créez l'application Node.js dans **cPanel → Node.js Selector**
2. Définissez la version Node.js (18.x recommandé)
3. Définissez le répertoire de l'application
4. Définissez le fichier de démarrage : `app.js`
5. Configurez les variables d'environnement

### Variables d'environnement cPanel

Dans Node.js Selector, ajoutez :
```
NODE_ENV=production
SESSION_SECRET=...
DB_HOST=localhost
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

### Proxy Apache/Nginx

Configurez un reverse proxy vers le port Node.js (généralement automatique avec cPanel).

## Tests

```bash
npm test
```

Les tests utilisent des mocks et ne nécessitent pas de connexion MySQL.

## Logs

Les logs sont stockés dans `./logs/` :
- `access.log` — Requêtes HTTP (format Apache Combined)
- `combined.log` — Logs applicatifs tous niveaux
- `error.log` — Erreurs uniquement

## Mise à jour

1. Sauvegarder la base de données
2. `git pull`
3. `npm install`
4. Redémarrer l'application

Si des modifications de schéma sont nécessaires, appliquer manuellement les migrations SQL.

## Sécurité en production

- Changez `SESSION_SECRET` avec une valeur longue et aléatoire
- Activez HTTPS (Let's Encrypt recommandé)
- Limitez les accès SSH
- Sauvegardez régulièrement la base de données
- Surveillez les logs d'erreurs
