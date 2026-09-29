'use strict';

/**
 * Utilitaires disponibles dans toutes les vues EJS (app.locals).
 */

const LINE_SEPARATOR_RE      = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR_RE = new RegExp(String.fromCharCode(0x2029), 'g');

/**
 * Sérialise une valeur en JSON injectable dans un bloc <script> via <%- %>.
 * JSON.stringify n'échappe pas « < » : une chaîne contenant « </script> »
 * fermerait le bloc et permettrait d'injecter du HTML. Les séparateurs
 * U+2028/U+2029 sont aussi échappés (invalides dans les littéraux JS anciens).
 *
 * Réservé au contexte <script>. Dans un attribut HTML, utiliser
 * <%= JSON.stringify(valeur) %> (échappement HTML standard).
 *
 * @param {*} value
 * @returns {string}
 */
function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(LINE_SEPARATOR_RE, '\\u2028')
    .replace(PARAGRAPH_SEPARATOR_RE, '\\u2029');
}

module.exports = { jsonForScript };
