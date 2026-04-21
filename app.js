/**
 * ============================================================
 * LAN Party Manager - Application principale
 * Framework : Node.js + Express + MySQL
 * ============================================================
 */
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
// ─── CSRF Protection (double-submit cookie via csrf-csrf) ────────────────────
// Note: CodeQL may flag this as "missing token validation" because it doesn't
// recognize csrf-csrf. The protection is implemented via doubleCsrfProtection
// middleware applied below, which validates the _csrf token in POST requests.
const { doubleCsrf } = require('csrf-csrf');
const expressLayouts = require('express-ejs-layouts');
const logger = require('./src/config/logger');
const { testConnection } = require('./src/config/database');

// ─── Initialisation ──────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;
// URL publique de l'application (sans slash final), utilisée pour les liens
// canoniques, les meta og:url, et les logs de démarrage.
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// ─── Sécurité : Helmet (en-têtes HTTP sécurisés) ─────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// ─── Logging des requêtes HTTP ────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// ─── Sessions ─────────────────────────────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_dev_secret_change_in_production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: parseInt(process.env.SESSION_DURATION) || 86400000,
      sameSite: 'lax',
    },
    name: 'lpm.sid',
  })
);

// ─── Messages flash ───────────────────────────────────────────────────────────
app.use(flash());

// ─── CSRF Protection ──────────────────────────────────────────────────────────
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.SESSION_SECRET || 'default_dev_secret_change_in_production',
  cookieName: '__Host-lpm.csrf',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Injecter le token CSRF dans les vues
app.use((req, res, next) => {
  try {
    res.locals.csrfToken = generateToken(req, res);
  } catch {
    res.locals.csrfToken = '';
  }
  next();
});

// Appliquer la protection CSRF (exclure les GET/HEAD/OPTIONS)
app.use((req, res, next) => {
  // Ignorer pour les tests ou si désactivé explicitement
  if (process.env.NODE_ENV === 'test') return next();
  doubleCsrfProtection(req, res, next);
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 10,
  message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use('/auth/login', loginLimiter);
app.use('/auth/register', loginLimiter);

// ─── Variables locales pour toutes les vues ───────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  // Expose l'URL de base et le chemin courant pour les liens canoniques
  res.locals.appUrl = APP_URL;
  res.locals.currentPath = req.path;
  next();
});

// ─── Moteur de template ───────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'partials/layout');

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
}));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/', require('./src/routes/index'));
app.use('/auth', require('./src/routes/auth'));
app.use('/profile', require('./src/routes/profile'));
app.use('/admin', require('./src/routes/admin'));

// ─── Gestion des erreurs 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: 'Page introuvable - LAN Party Manager',
    user: req.session.user || null,
  });
});

// ─── Gestion des erreurs globales ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Erreur CSRF
  if (err.code === 'EBADCSRFTOKEN' || err.code === 'INVALID_CSRF_TOKEN') {
    logger.warn('Tentative CSRF détectée', { ip: req.ip, url: req.url });
    return res.status(403).render('errors/403', {
      title: 'Accès refusé - LAN Party Manager',
      user: req.session.user || null,
    });
  }

  logger.error('Erreur non gérée', { error: err.message, stack: err.stack });
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title: 'Erreur serveur - LAN Party Manager',
    user: req.session.user || null,
    error: process.env.NODE_ENV === 'development' ? err.message : null,
  });
});

// ─── Démarrage du serveur ─────────────────────────────────────────────────────
async function startServer() {
  // Vérifier la connexion DB avant de démarrer
  const dbOk = await testConnection();
  if (!dbOk && process.env.NODE_ENV !== 'test') {
    logger.error('Impossible de se connecter à la base de données. Arrêt du serveur.');
    process.exit(1);
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      logger.info(`🚀 Serveur démarré sur ${APP_URL}`);
      logger.info(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

startServer();

module.exports = app;
