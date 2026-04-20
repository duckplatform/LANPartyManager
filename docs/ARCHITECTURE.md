# Architecture — LAN Party Manager

## Vue d'ensemble

LAN Party Manager est une application web MVC construite sur Node.js/Express avec MySQL.

```
Client Browser
      │
      ▼
  Express App (app.js)
      │
   ┌──┴───────────────────────────────────────┐
   │           Middleware Stack               │
   │  Helmet → RateLimit → Session → Flash   │
   │  CheckInstall → CSRF → Routes           │
   └──┬───────────────────────────────────────┘
      │
   ┌──┴───────────────────────────┐
   │         Routes               │
   │  /install  /  /auth  /admin  │
   └──┬───────────────────────────┘
      │
   ┌──┴───────────────┐
   │     Models       │
   │ User News Event  │
   │    Setting       │
   └──┬───────────────┘
      │
   ┌──┴────────────┐
   │  MySQL Pool   │
   │  (mysql2)     │
   └───────────────┘
```

## Structure des fichiers

```
LANPartyManager/
├── app.js                  # Point d'entrée Express
├── package.json
├── .env.example            # Template de configuration
├── config/
│   ├── database.js         # Pool de connexions MySQL
│   └── logger.js           # Configuration Winston
├── middleware/
│   ├── auth.js             # isAuthenticated, isAdmin, isModerator
│   ├── install.js          # checkInstall + cache
│   └── security.js         # Helmet, rate limiters
├── models/
│   ├── User.js             # CRUD utilisateurs + bcrypt
│   ├── News.js             # CRUD actualités + slugify
│   ├── Event.js            # CRUD événements + inscriptions
│   └── Setting.js          # Paramètres app (clé/valeur)
├── routes/
│   ├── index.js            # Pages publiques
│   ├── auth.js             # Login/register/logout/profile
│   ├── admin.js            # CRUD admin
│   └── install.js          # Wizard d'installation
├── views/                  # Templates EJS
├── public/                 # Assets statiques
├── database/
│   ├── schema.sql          # Schéma des tables
│   ├── seeds.sql           # Données de démonstration
│   └── seed.js             # Script de seeding Node.js
├── tests/                  # Tests Jest + Supertest
└── docs/                   # Documentation
```

## Modèles de données

### users
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT AUTO_INCREMENT | Clé primaire |
| username | VARCHAR(50) UNIQUE | Pseudo |
| email | VARCHAR(255) UNIQUE | Email |
| password_hash | VARCHAR(255) | Hash bcrypt (12 rounds) |
| role | ENUM(admin,moderator,user) | Rôle |
| bio | TEXT | Biographie |
| is_active | TINYINT(1) | Compte actif/inactif |

### news
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT AUTO_INCREMENT | Clé primaire |
| title | VARCHAR(255) | Titre |
| slug | VARCHAR(255) UNIQUE | URL slug |
| content | LONGTEXT | Contenu HTML |
| excerpt | TEXT | Résumé |
| author_id | INT (FK) | Auteur |
| is_published | TINYINT(1) | Publié ou brouillon |

### events
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT AUTO_INCREMENT | Clé primaire |
| title | VARCHAR(255) | Titre |
| slug | VARCHAR(255) UNIQUE | URL slug |
| description | LONGTEXT | Description HTML |
| location | VARCHAR(255) | Lieu |
| start_date | DATETIME | Début |
| end_date | DATETIME | Fin |
| max_participants | INT | 0 = illimité |
| is_active | TINYINT(1) | Affiché en bannière |
| is_published | TINYINT(1) | Publié |

### event_registrations
| Colonne | Type | Description |
|---------|------|-------------|
| id | INT AUTO_INCREMENT | Clé primaire |
| event_id | INT (FK) | Événement |
| user_id | INT (FK) | Utilisateur |
| registered_at | TIMESTAMP | Date d'inscription |

### settings
| Colonne | Type | Description |
|---------|------|-------------|
| key | VARCHAR(100) PK | Clé du paramètre |
| value | TEXT | Valeur |

## Sécurité

| Mesure | Outil | Configuration |
|--------|-------|---------------|
| Headers HTTP | helmet | CSP, HSTS, X-Frame-Options |
| Rate limiting | express-rate-limit | 200 req/15min global, 10 req/15min auth |
| CSRF | csurf | Token en session |
| Passwords | bcrypt | 12 rounds de salage |
| Sessions | express-session | httpOnly, sameSite:strict |
| Validation | express-validator | Toutes les entrées utilisateur |
| Logs | morgan + winston | Accès HTTP + erreurs applicatives |

## Flux d'authentification

1. `POST /auth/login` → Validation email + password
2. Vérification bcrypt du hash
3. `session.regenerate()` → Prévention fixation de session
4. Stockage `session.user = { id, username, role }`
5. Redirect selon le rôle (admin → `/admin`, user → `/`)

## Wizard d'installation

Le middleware `checkInstall` vérifie à chaque requête si `settings.installed = 'true'`.
Un cache de 60 secondes est utilisé pour éviter les requêtes DB excessives.

Le wizard en 4 étapes :
1. `/install/step1` → Config DB + création des tables
2. `/install/step2` → Création compte admin
3. `/install/step3` → Données de démonstration
4. `/install/complete` → Affichage des identifiants

Les routes d'installation utilisent **CSRF** comme toutes les autres routes (le middleware CSRF est appliqué globalement avant le montage des routes).