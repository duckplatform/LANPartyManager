/**
 * Routes de l'assistant d'installation
 * Wizard en 4 étapes pour configurer l'application
 */
const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const dotenv = require('dotenv');
const { installLimiter } = require('../middleware/security');
const { resetInstallCache } = require('../middleware/install');
const logger = require('../config/logger');

// Middleware: si déjà installé, rediriger vers l'accueil (sauf page complete)
router.use(async (req, res, next) => {
  if (req.path === '/complete') return next();
  try {
    const pool = require('../config/database');
    const [rows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'installed'");
    if (rows.length > 0 && rows[0].value === 'true') {
      return res.redirect('/');
    }
  } catch (e) {
    // DB inaccessible, continuer l'installation
  }
  next();
});

// GET /install → step1
router.get('/', (req, res) => res.redirect('/install/step1'));

// ─── Étape 1: Configuration DB ────────────────────────────────────────────────
router.get('/step1', (req, res) => {
  res.render('install/step1', {
    title: 'Installation - Étape 1',
    csrfToken: req.csrfToken(),
    errors: [],
    data: {
      db_host: 'localhost',
      db_port: '3306',
      db_user: 'root',
      db_name: 'lan_party_manager'
    }
  });
});

router.post('/step1', installLimiter, [
  body('db_host').trim().notEmpty().withMessage('Hôte DB requis'),
  body('db_port').isInt({ min: 1, max: 65535 }).withMessage('Port invalide'),
  body('db_user').trim().notEmpty().withMessage('Utilisateur DB requis'),
  body('db_name').trim().notEmpty().withMessage('Nom de base de données requis')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Nom de base de données: caractères alphanumériques et underscores uniquement')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('install/step1', {
      title: 'Installation - Étape 1',
      csrfToken: req.csrfToken(),
      errors: errors.array(),
      data: req.body
    });
  }

  const { db_host, db_port, db_user, db_password, db_name } = req.body;

  try {
    // Tester la connexion et créer la base
    const conn = await mysql.createConnection({
      host: db_host,
      port: parseInt(db_port),
      user: db_user,
      password: db_password || '',
      multipleStatements: true
    });

    const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    await conn.query(schemaSQL);
    await conn.end();

    req.session.dbConfig = { db_host, db_port, db_user, db_password, db_name };
    req.session.installStep = 1;

    logger.info('Installation étape 1 complétée: DB créée');
    res.redirect('/install/step2');
  } catch (err) {
    logger.error('Erreur installation étape 1:', err.message);
    res.render('install/step1', {
      title: 'Installation - Étape 1',
      csrfToken: req.csrfToken(),
      errors: [{ msg: `Erreur de connexion: ${err.message}` }],
      data: req.body
    });
  }
});

// ─── Étape 2: Création du compte admin ───────────────────────────────────────
router.get('/step2', (req, res) => {
  if (!req.session.installStep || req.session.installStep < 1) {
    return res.redirect('/install/step1');
  }
  res.render('install/step2', {
    title: 'Installation - Étape 2',
    csrfToken: req.csrfToken(),
    errors: [],
    data: {}
  });
});

router.post('/step2', installLimiter, [
  body('username').trim().isLength({ min: 3, max: 30 })
    .withMessage("Nom d'utilisateur: 3-30 caractères")
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Caractères alphanumériques uniquement'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe: minimum 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_#^])[A-Za-z\d@$!%*?&_#^]{8,}$/)
    .withMessage('Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial'),
  body('password_confirm').custom((val, { req }) => {
    if (val !== req.body.password) throw new Error('Les mots de passe ne correspondent pas');
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('install/step2', {
      title: 'Installation - Étape 2',
      csrfToken: req.csrfToken(),
      errors: errors.array(),
      data: req.body
    });
  }

  if (!req.session.installStep || req.session.installStep < 1) {
    return res.redirect('/install/step1');
  }

  const { db_host, db_port, db_user, db_password, db_name } = req.session.dbConfig;
  const { username, email, password } = req.body;

  try {
    const conn = await mysql.createConnection({
      host: db_host,
      port: parseInt(db_port),
      user: db_user,
      password: db_password || '',
      database: db_name
    });

    const password_hash = await bcrypt.hash(password, 12);
    await conn.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email.toLowerCase(), password_hash, 'admin']
    );
    await conn.end();

    req.session.installStep = 2;
    req.session.adminCreated = { username, email };

    logger.info(`Installation étape 2 complétée: admin ${username} créé`);
    res.redirect('/install/step3');
  } catch (err) {
    logger.error('Erreur installation étape 2:', err.message);
    res.render('install/step2', {
      title: 'Installation - Étape 2',
      csrfToken: req.csrfToken(),
      errors: [{ msg: `Erreur: ${err.message}` }],
      data: req.body
    });
  }
});

// ─── Étape 3: Données de démonstration ───────────────────────────────────────
router.get('/step3', (req, res) => {
  if (!req.session.installStep || req.session.installStep < 2) {
    return res.redirect('/install/step1');
  }
  res.render('install/step3', {
    title: 'Installation - Étape 3',
    csrfToken: req.csrfToken(),
    errors: []
  });
});

router.post('/step3', installLimiter, async (req, res) => {
  if (!req.session.installStep || req.session.installStep < 2) {
    return res.redirect('/install/step1');
  }

  const { db_host, db_port, db_user, db_password, db_name } = req.session.dbConfig;
  const loadSeeds = req.body.load_seeds === '1';

  try {
    const conn = await mysql.createConnection({
      host: db_host,
      port: parseInt(db_port),
      user: db_user,
      password: db_password || '',
      database: db_name,
      multipleStatements: true
    });

    if (loadSeeds) {
      const seedsSQL = fs.readFileSync(path.join(__dirname, '..', 'database', 'seeds.sql'), 'utf8');
      await conn.query(seedsSQL);
      logger.info('Installation: données de démonstration chargées');
    }

    // Marquer l'application comme installée
    await conn.query(
      "INSERT INTO settings (`key`, `value`) VALUES ('installed', 'true') ON DUPLICATE KEY UPDATE `value` = 'true'"
    );
    await conn.query(
      "INSERT INTO settings (`key`, `value`) VALUES ('app_name', 'LAN Party Manager') ON DUPLICATE KEY UPDATE `value` = 'LAN Party Manager'"
    );
    await conn.end();

    // Écrire le fichier .env (créé si inexistant, mis à jour sinon)
    const envContent = `NODE_ENV=production
PORT=3000
SESSION_SECRET=${generateSecret()}
DB_HOST=${db_host}
DB_PORT=${db_port}
DB_USER=${db_user}
DB_PASSWORD=${db_password || ''}
DB_NAME=${db_name}
APP_NAME=LAN Party Manager
`;
    try {
      fs.writeFileSync(path.join(__dirname, '..', '.env'), envContent);
      // Recharger dotenv pour que les prochaines lectures de process.env soient à jour
      dotenv.config({ override: true });
    } catch (e) {
      logger.warn('Impossible d\'écrire .env:', e.message);
    }

    // Réinitialiser le pool MySQL avec la nouvelle configuration
    // → l'application est opérationnelle immédiatement, sans redémarrage
    try {
      const db = require('../config/database');
      await db.reinitPool({
        host: db_host,
        port: parseInt(db_port),
        user: db_user,
        password: db_password || '',
        database: db_name
      });
    } catch (poolErr) {
      logger.warn('Échec de la réinitialisation du pool MySQL:', poolErr.message);
    }

    resetInstallCache();
    req.session.installStep = 3;
    req.session.installComplete = true;

    logger.info('Installation complétée avec succès!');
    res.redirect('/install/complete');
  } catch (err) {
    logger.error('Erreur installation étape 3:', err.message);
    res.render('install/step3', {
      title: 'Installation - Étape 3',
      csrfToken: req.csrfToken(),
      errors: [{ msg: `Erreur: ${err.message}` }]
    });
  }
});

// ─── Étape finale ─────────────────────────────────────────────────────────────
router.get('/complete', (req, res) => {
  const admin = req.session.adminCreated || { username: 'admin' };
  req.session.destroy(() => {});
  res.render('install/complete', {
    title: 'Installation terminée',
    csrfToken: req.csrfToken(),
    admin
  });
});

/**
 * Génère un secret aléatoire cryptographiquement sécurisé
 */
function generateSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(48).toString('base64url');
}

module.exports = router;
