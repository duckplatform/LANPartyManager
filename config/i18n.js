'use strict';

/**
 * Service i18n (internationalisation)
 *
 * Charge les fichiers de traduction JSON depuis le dossier `locales/`
 * et fournit une fonction `t(key, params)` pour accéder aux chaînes
 * traduites par clé pointée (ex. : 'nav.home', 'status.planned').
 *
 * Langues supportées : fr (défaut), en
 * Le fichier de langue est déterminé par le paramètre `language` de
 * la table `app_settings` (gérable depuis l'interface d'administration).
 *
 * La locale BCP 47 (ex. : 'fr-FR', 'en-US') est stockée séparément
 * dans `app_settings.locale` et utilisée pour le formatage des dates.
 */

const path   = require('path');
const logger = require('./logger');

// ─── Constantes ────────────────────────────────────────────────────────────

/** Langues supportées par l'application */
const SUPPORTED_LANGUAGES = ['fr', 'en'];

/** Langue par défaut si le paramètre n'est pas configuré */
const DEFAULT_LANGUAGE = 'fr';

/** Locale BCP 47 par défaut pour le formatage des dates */
const DEFAULT_LOCALE = 'fr-FR';

// ─── Cache en mémoire ──────────────────────────────────────────────────────
// Les fichiers JSON sont chargés une seule fois et mis en cache pour
// éviter des lectures disque répétées à chaque requête.

/** @type {Object.<string, Object>} Cache des traductions par langue */
const _translationCache = {};

// ─── Chargement des traductions ────────────────────────────────────────────

/**
 * Charge et retourne les traductions pour une langue donnée.
 * Utilise le cache en mémoire ; lit le fichier JSON si non chargé.
 * Replie automatiquement sur la langue par défaut si la langue demandée
 * n'est pas disponible.
 *
 * @param {string} language  Code de langue ('fr', 'en', …)
 * @returns {Object}         Objet de traductions plat/imbriqué
 */
function loadTranslations(language) {
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;

  if (_translationCache[lang]) {
    return _translationCache[lang];
  }

  try {
    const filePath     = path.join(__dirname, '..', 'locales', `${lang}.json`);
    // require() met déjà en cache Node.js, mais on garde notre propre cache
    // pour pouvoir l'invalider sans redémarrage si nécessaire.
    const translations = require(filePath);
    _translationCache[lang] = translations;
    return translations;
  } catch (err) {
    logger.warn(`[I18N] Impossible de charger le fichier de traduction "${lang}.json" :`, err.message);
    // Repli sur la langue par défaut pour éviter les erreurs en production
    if (lang !== DEFAULT_LANGUAGE) {
      return loadTranslations(DEFAULT_LANGUAGE);
    }
    return {};
  }
}

// ─── Accès aux clés imbriquées ─────────────────────────────────────────────

/**
 * Accède à une valeur imbriquée par clé pointée ('nav.home' → obj.nav.home).
 *
 * @param {Object} obj  Objet de traductions
 * @param {string} key  Clé pointée ('nav.home', 'status.planned', etc.)
 * @returns {*}         Valeur trouvée ou undefined
 */
function getNestedValue(obj, key) {
  return key.split('.').reduce(
    (current, segment) => (current && current[segment] !== undefined ? current[segment] : undefined),
    obj
  );
}

// ─── Création de la fonction de traduction ─────────────────────────────────

/**
 * Crée et retourne la fonction de traduction `t()` liée à un objet
 * de traductions donné.
 *
 * La fonction `t(key, params)` :
 *  - Cherche `key` dans les traductions (clé pointée tolérée).
 *  - Si absent, journalise un avertissement et retourne la clé elle-même
 *    (comportement gracieux — jamais de crash en production).
 *  - Interpole les paramètres `{{param}}` si fournis.
 *
 * Exemple :
 *   t('battle.best_of', { n: 3 })  → "BO3"
 *   t('nav.home')                   → "Accueil"
 *   t('missing.key')                → "missing.key"
 *
 * @param {Object} translations  Objet de traductions (issu de loadTranslations)
 * @returns {Function}           Fonction t(key, params?)
 */
function createT(translations) {
  return function t(key, params) {
    let value = getNestedValue(translations, key);

    if (value === undefined) {
      logger.warn(`[I18N] Clé de traduction manquante : "${key}"`);
      value = key; // Affiche la clé en fallback
    }

    // Interpolation des paramètres {{param}}
    if (params && typeof value === 'string') {
      Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
      });
    }

    return value;
  };
}

// ─── Invalidation du cache ────────────────────────────────────────────────

/**
 * Vide le cache des traductions.
 * À appeler après modification du paramètre `language` en base de données.
 */
function clearCache() {
  Object.keys(_translationCache).forEach(k => delete _translationCache[k]);
  // Invalide également le cache require() de Node.js pour les fichiers JSON
  SUPPORTED_LANGUAGES.forEach(lang => {
    const filePath = path.join(__dirname, '..', 'locales', `${lang}.json`);
    delete require.cache[require.resolve(filePath)];
  });
}

// ─── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  loadTranslations,
  createT,
  clearCache,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  DEFAULT_LOCALE,
};
