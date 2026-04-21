/**
 * LAN Party Manager - Scripts frontend
 */

document.addEventListener('DOMContentLoaded', function () {

  // ─── Menu mobile ──────────────────────────────────────────────────────────
  const navToggle = document.getElementById('navToggle');
  const navMenu   = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', navMenu.classList.contains('open'));
    });

    // Fermer le menu en cliquant ailleurs
    document.addEventListener('click', function (e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('open');
      }
    });
  }

  // ─── Afficher/cacher le mot de passe ──────────────────────────────────────
  document.querySelectorAll('.btn-toggle-password').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const targetId = btn.getAttribute('data-target');
      const input    = document.getElementById(targetId);
      const icon     = btn.querySelector('i');

      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  });

  // ─── Indicateur de force du mot de passe ──────────────────────────────────
  const passwordInput    = document.getElementById('password') || document.getElementById('newPassword');
  const strengthIndicator = document.getElementById('passwordStrength');

  if (passwordInput && strengthIndicator) {
    passwordInput.addEventListener('input', function () {
      const val = this.value;
      const strength = getPasswordStrength(val);

      strengthIndicator.className = 'password-strength';
      if (val.length === 0) return;

      const levels = ['', 'weak', 'fair', 'good', 'strong'];
      strengthIndicator.classList.add(levels[strength]);
    });
  }

  /**
   * Calcule la force d'un mot de passe (1-4)
   * @param {string} password
   * @returns {number}
   */
  function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 8)  score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }

  // ─── Auto-dismiss des alertes ──────────────────────────────────────────────
  setTimeout(function () {
    document.querySelectorAll('.alert-success').forEach(function (alert) {
      alert.style.transition = 'opacity 0.5s';
      alert.style.opacity = '0';
      setTimeout(() => alert.remove(), 500);
    });
  }, 5000);

  // ─── Confirmation de suppression ──────────────────────────────────────────
  // (Géré par l'attribut onsubmit dans le HTML pour les éléments dynamiques)

});
