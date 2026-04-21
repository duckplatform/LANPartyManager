'use strict';

/**
 * LANPartyManager - Application principale
 * Site web pour association de jeux vidéo
 *
 * Stack : Node.js + Express + MySQL + EJS
 * Déploiement : VPS cPanel (variables d'environnement définies dans cPanel)
 */

const express        = require('express');
const path           = require('path');
const morgan         = require('morgan');
const helmet         = require('helmet');
const session        = require('express-session');
const flash          = require('connect-flash');
const methodOverride = require('method-override');
const { csrfSync }   = require('csrf-sync');

const logger             = require('./config/logger');
const { testConnection } = require('./config/database');
const { globalLimiter }  = require('./middleware/rateLimiter');
const { injectLocals }   = require('./middleware/auth');

// ─── Initialisation de l'application Express ──────────────────────────────

const app  = express();
const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';

// ─── Moteur de templates EJS ───────────────────────────────────────────────

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Proxy inverse (Apache cPanel) ────────────────────────────────────────
// Nécessaire pour que express-session (cookie secure) et express-rate-limit
// lisent correctement l'IP et le protocole réels du client derrière Apache.

app.set('trust proxy', 1);

// ─── Sécurité : Helmet (headers HTTP) ─────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc:      ["'self'", 'data:', 'https:'],
      connectSrc:  ["'self'"],
    },
  },
}));

// ─── Logging HTTP (Morgan → Winston) ──────────────────────────────────────

const morganStream = { write: (msg) => logger.http(msg.trim()) };
app.use(morgan(ENV === 'production' ? 'combined' : 'dev', { stream: morganStream }));

// ─── Parsing des requêtes ──────────────────────────────────────────────────

app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(methodOverride('_method'));

// ─── Fichiers statiques ────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: ENV === 'production' ? '1d' : 0,
}));

// ─── Sessions ─────────────────────────────────────────────────────────────

const SESSION_SECRET = process.env.SESSION_SECRET || 'change-this-secret-in-production';
app.use(session({
  name:   'sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure:   ENV === 'production',
    sameSite: 'lax',
    maxAge:   24 * 60 * 60 * 1000, // 24h
  },
}));

// ─── Flash messages ────────────────────────────────────────────────────────

app.use(flash());

// ─── Protection CSRF (csrf-sync - Synchroniser Token Pattern) ─────────────

const {
  generateToken: generateCsrfToken,
  csrfSynchronisedProtection,
} = csrfSync({
  // Lit le token depuis le corps de la requête ou les headers
  getTokenFromRequest: (req) => req.body._csrf || req.headers['x-csrf-token'],
});

// Rend csrfToken() disponible dans les routes via req.csrfToken()
app.use((req, res, next) => {
  req.csrfToken = () => generateCsrfToken(req);
  next();
});

// ─── Rate limiting global ──────────────────────────────────────────────────

app.use(globalLimiter);

// ─── Protection CSRF globale ───────────────────────────────────────────────
// csrf-sync valide uniquement les méthodes non-sûres (POST/PUT/PATCH/DELETE)
// Les requêtes GET/HEAD/OPTIONS sont automatiquement exemptées

app.use(csrfSynchronisedProtection);

// ─── Injection des variables locales dans les vues ────────────────────────

app.use(injectLocals);

// ─── Routes ───────────────────────────────────────────────────────────────

app.use('/',        require('./routes/index'));
app.use('/auth',    require('./routes/auth'));
app.use('/profile', require('./routes/profile'));
app.use('/admin',   require('./routes/admin'));
app.use('/news',    require('./routes/news'));

// ─── Page 404 ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).render('errors/404', {
    title:     'Page introuvable',
    pageClass: 'page-error',
  });
});

// ─── Gestionnaire d'erreurs global ────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Erreur CSRF
  if (err.code === 'EBADCSRFTOKEN' || err.code === 'INVALID_CSRF_TOKEN') {
    logger.warn(`[CSRF] Token invalide depuis ${req.ip} - ${req.method} ${req.originalUrl}`);
    req.flash('error', 'Requête invalide (token de sécurité expiré). Veuillez réessayer.');
    return res.redirect(req.get('Referrer') || '/');
  }

  logger.error(`[ERROR] ${err.status || 500} - ${err.message}`, { stack: err.stack });
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title:     'Erreur serveur',
    pageClass: 'page-error',
    message:   ENV === 'development' ? err.message : 'Une erreur interne est survenue.',
  });
});

// ─── Démarrage du serveur ──────────────────────────────────────────────────

async function startServer() {
  try {
    // Vérifie la connexion DB avant de démarrer
    await testConnection();
    app.listen(PORT, () => {
      logger.info(`[SERVER] LANPartyManager démarré sur le port ${PORT} (${ENV})`);
    });
  } catch (err) {
    logger.error('[SERVER] Impossible de démarrer :', err.message);
    process.exit(1);
  }
}

// Démarre le serveur sauf pendant les tests automatisés.
// En production cPanel (Phusion Passenger), le fichier est chargé via require()
// et non exécuté directement, donc require.main !== module. On utilise
// NODE_ENV=test dans les tests pour éviter de démarrer le serveur.
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
