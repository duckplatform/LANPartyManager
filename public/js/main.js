/**
 * LAN Party Manager - JavaScript principal
 */

// ─── Navigation mobile ────────────────────────────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navMenu.classList.remove('open');
    }
  });
}

// ─── Flash messages: fermeture et auto-dismiss ────────────────────────────────
document.querySelectorAll('.flash').forEach(flash => {
  const closeBtn = flash.querySelector('.flash-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => flash.remove());
  }
  setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.transition = 'opacity 0.5s';
    setTimeout(() => flash.remove(), 500);
  }, 5000);
});

// ─── Active nav link ──────────────────────────────────────────────────────────
/**
 * Détermine si un lien de navigation est actif selon le chemin courant
 */
function isNavLinkActive(linkHref, currentPath) {
  if (linkHref === '/') return currentPath === '/';
  return currentPath.startsWith(linkHref);
}

const currentPath = window.location.pathname;
document.querySelectorAll('.nav-link').forEach(link => {
  if (isNavLinkActive(link.getAttribute('href'), currentPath)) {
    link.style.color = 'var(--primary)';
    link.style.background = 'rgba(0, 212, 255, 0.1)';
  }
});
