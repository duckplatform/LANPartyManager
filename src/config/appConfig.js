/**
 * Configuration générale de l'application
 * Centralise les paramètres dérivés de APP_URL pour un déploiement
 * en sous-répertoire (ex. https://myapp.com/app).
 *
 * APP_URL  : URL publique complète sans slash final (ex. https://myapp.com/app).
 *            Utilisée pour les liens canoniques, les meta og:url et les logs.
 *            En production sans sous-répertoire : https://www.monsite.com
 *            En production avec sous-répertoire  : https://www.monsite.com/app
 *
 * BASE_PATH : chemin extrait de APP_URL (ex. '/app'), vide si déployé à la racine.
 *   - Utilisé côté vues comme préfixe de tous les liens et des ressources statiques.
 *   - Utilisé côté contrôleurs/middleware comme préfixe des redirections.
 */

const PORT = process.env.PORT || 3000;
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

// Extraction du chemin de base (pathname sans slash final)
// '' pour https://myapp.com, '/app' pour https://myapp.com/app
let BASE_PATH = '';
try {
  const parsed = new URL(APP_URL);
  BASE_PATH = parsed.pathname.replace(/\/$/, '');
} catch {
  BASE_PATH = '';
}

module.exports = { APP_URL, BASE_PATH };
