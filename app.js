/**
 * LAN Party Manager - Application principale
 * Point d'entrée Express
 */
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const path = require('path');
const csrf = require('csurf');
const fs = require('fs');

const logger = require('./config/logger');
const { helmetConfig, generalLimiter } = require('./middleware/security');
const { checkInstall } = require('./middleware/install');

// Routes
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const installRoutes = require('./routes/install');

const app = express();

// ─── Sécurité ─────────────────────────────────────────────────────────────────
app.use(helmetConfig);
app.use(generalLimiter);

// ─── Template engine ──────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Fichiers statiques ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Parsing ──────────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// ─── Logging HTTP ─────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24h
  }
}));

// ─── Flash messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Variables globales pour les vues ─────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.appName = process.env.APP_NAME || 'LAN Party Manager';
  res.locals.csrfToken = '';
  next();
});

// ─── CSRF Protection (toutes les routes) ─────────────────────────────────────
const csrfProtection = csrf({ cookie: false });
app.use(csrfProtection);

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// ─── Vérification installation ────────────────────────────────────────────────
app.use(checkInstall);

// ─── Routes principales ───────────────────────────────────────────────────────
app.use('/install', installRoutes);
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);

// ─── Gestion des erreurs 404 ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('errors/404', { title: 'Page introuvable' });
});

// ─── Gestion des erreurs globales ─────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Erreur CSRF
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn(`CSRF token invalide: ${req.ip} -> ${req.path}`);
    req.flash('error', 'Session expirée. Veuillez réessayer.');
    return res.redirect(req.get('Referrer') || '/');
  }

  logger.error('Erreur serveur:', err);
  const status = err.status || 500;
  res.status(status).render('errors/500', {
    title: 'Erreur serveur',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// ─── Démarrage du serveur ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`🚀 LAN Party Manager démarré sur le port ${PORT}`);
    logger.info(`   Environnement: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   URL: http://localhost:${PORT}`);
  });
}

module.exports = app;
