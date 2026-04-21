'use strict';

/**
 * Utilitaire de rendu Markdown sécurisé
 * Utilise marked pour parser le Markdown et sanitize-html pour nettoyer
 * le HTML généré (prévention XSS).
 */

const { marked }    = require('marked');
const sanitizeHtml  = require('sanitize-html');

// Options marked : GFM (GitHub Flavored Markdown) activé par défaut
marked.setOptions({
  gfm:    true,
  breaks: true,   // Sauts de ligne simples convertis en <br>
});

// Tags HTML autorisés après rendu Markdown
const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'em', 'del', 's', 'u',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTRIBUTES = {
  a:   ['href', 'title', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  td:  ['align'],
  th:  ['align'],
};

// Schémas d'URL autorisés dans les liens
const ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

/**
 * Transforme du texte Markdown en HTML sécurisé (sans XSS).
 * Prend en charge les emojis Unicode natifs (🎮 😀 etc.).
 *
 * @param {string} text - Texte en Markdown
 * @returns {string} HTML sécurisé
 */
function renderMarkdown(text) {
  if (!text) return '';

  // Conversion Markdown → HTML brut
  const rawHtml = marked.parse(text);

  // Nettoyage HTML (suppression balises/attributs dangereux)
  return sanitizeHtml(rawHtml, {
    allowedTags:       ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes:    ALLOWED_SCHEMES,
    // Force rel="noopener noreferrer" sur les liens externes
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || '';
        const isExternal = href.startsWith('http');
        return {
          tagName,
          attribs: {
            ...attribs,
            ...(isExternal ? { rel: 'noopener noreferrer', target: '_blank' } : {}),
          },
        };
      },
    },
  });
}

module.exports = { renderMarkdown };
