/**
 * Middleware de vérification de l'installation
 * Redirige vers l'assistant d'installation si l'app n'est pas configurée
 */
const logger = require('../config/logger');

let isInstalledCache = null;
let cacheTime = null;
const CACHE_DURATION = 60000; // 1 minute

const checkInstall = async (req, res, next) => {
  // Ignorer les fichiers statiques
  if (req.path.startsWith('/public') || req.path.startsWith('/css') ||
      req.path.startsWith('/js') || req.path.startsWith('/images') ||
      req.path.startsWith('/favicon')) {
    return next();
  }

  // Si on est déjà sur /install, laisser passer
  if (req.path.startsWith('/install')) {
    return next();
  }

  // Vérifier le cache
  const now = Date.now();
  if (isInstalledCache !== null && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    if (!isInstalledCache) {
      return res.redirect('/install');
    }
    return next();
  }

  try {
    const pool = require('../config/database');
    const [rows] = await pool.query(
      'SELECT `value` FROM settings WHERE `key` = ?',
      ['installed']
    );

    const installed = rows.length > 0 && rows[0].value === 'true';
    isInstalledCache = installed;
    cacheTime = now;

    if (!installed) {
      return res.redirect('/install');
    }
    next();
  } catch (err) {
    // Si la DB n'est pas accessible, rediriger vers l'installation
    logger.warn('DB inaccessible, redirection vers installation:', err.message);
    isInstalledCache = false;
    cacheTime = now;
    res.redirect('/install');
  }
};

// Permet de réinitialiser le cache (utilisé après installation)
const resetInstallCache = () => {
  isInstalledCache = null;
  cacheTime = null;
};

module.exports = { checkInstall, resetInstallCache };
