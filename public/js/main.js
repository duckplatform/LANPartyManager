/* global.js - Scripts frontend LANPartyManager */
'use strict';

// ── Navigation mobile ──────────────────────────────────────────
(function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  function setMenuState(isOpen) {
    nav.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Fermer le menu' : 'Ouvrir le menu');
    document.body.classList.toggle('menu-open', isOpen);
  }

  toggle.addEventListener('click', function () {
    const isOpen = !nav.classList.contains('is-open');
    setMenuState(isOpen);
  });

  // Ferme le menu si clic en dehors
  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      setMenuState(false);
    }
  });

  // Ferme le menu lors du clic sur un lien/bouton de navigation
  nav.querySelectorAll('a, button').forEach(function (el) {
    el.addEventListener('click', function () {
      setMenuState(false);
    });
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 768) {
      setMenuState(false);
    }
  });
})();

// ── Fermeture des alertes flash ────────────────────────────────
(function initFlashAlerts() {
  document.querySelectorAll('.alert-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const alert = btn.closest('.alert');
      if (alert) {
        alert.style.transition = 'opacity 0.3s ease';
        alert.style.opacity    = '0';
        setTimeout(function () { alert.remove(); }, 300);
      }
    });
  });

  // Auto-fermeture après 5 secondes pour les succès
  document.querySelectorAll('.alert--success').forEach(function (alert) {
    setTimeout(function () {
      if (!alert.parentNode) return;
      alert.style.transition = 'opacity 0.5s ease';
      alert.style.opacity    = '0';
      setTimeout(function () { if (alert.parentNode) alert.remove(); }, 500);
    }, 5000);
  });
})();

// ── Afficher/masquer les mots de passe ─────────────────────────
(function initPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const wrap  = btn.closest('.input-password-wrap');
      const input = wrap ? wrap.querySelector('.form-input') : null;
      if (!input) return;

      const isPassword = input.type === 'password';
      input.type       = isPassword ? 'text' : 'password';
      const icon       = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye',        !isPassword);
        icon.classList.toggle('fa-eye-slash',   isPassword);
      }
    });
  });
})();

// ── Onglets profil ─────────────────────────────────────────────
(function initProfileTabs() {
  const tabBtns   = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  if (!tabBtns.length) return;

  tabBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.getAttribute('data-tab');

      // Désactive tous les onglets
      tabBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(function (p) { p.classList.remove('active'); });

      // Active l'onglet sélectionné
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(targetId);
      if (panel) panel.classList.add('active');
    });
  });
})();

// ── Confirmation suppression (protection double clic) ──────────
(function initDeleteConfirm() {
  document.querySelectorAll('form.inline-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;
      // Re-enable si le dialog est annulé (géré par onclick="return confirm()")
      // Ici on s'assure juste que le submit ne se déclenche pas deux fois
    });
  });
})();
