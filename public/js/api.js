/* ── Token / session storage ────────────────────────────────────── */

const TOKEN_KEY = 'lpm_token';
const USER_KEY  = 'lpm_user';

function getToken()  { return localStorage.getItem(TOKEN_KEY); }
function getUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; } }

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/* ── Navigation guards ──────────────────────────────────────────── */

function requireAuth() {
  if (!getToken()) { window.location.href = '/login.html'; return false; }
  return true;
}

function requireAdmin() {
  if (!requireAuth()) return false;
  const user = getUser();
  if (!user || user.role !== 'admin') { window.location.href = '/dashboard.html'; return false; }
  return true;
}

function redirectIfLoggedIn(dest) {
  if (!getToken()) return;
  const user = getUser();
  window.location.href = (dest || (user && user.role === 'admin' ? '/admin.html' : '/dashboard.html'));
}

/* ── API fetch wrapper ───────────────────────────────────────────── */

async function apiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* ── Alert helper ────────────────────────────────────────────────── */

function showAlert(el, message, type = 'error') {
  el.textContent = message;
  el.className = `alert alert--${type} show`;
}

function hideAlert(el) {
  el.className = 'alert';
  el.textContent = '';
}

/* ── Navbar auth state ───────────────────────────────────────────── */

function initNavbar() {
  const logoutBtn = document.getElementById('nav-logout');
  const adminLink = document.getElementById('nav-admin');
  const dashLink  = document.getElementById('nav-dashboard');
  const loginLink = document.getElementById('nav-login');
  const regLink   = document.getElementById('nav-register');
  const nameEl    = document.getElementById('nav-username');

  const user  = getUser();
  const token = getToken();

  if (token && user) {
    if (logoutBtn) logoutBtn.style.display = '';
    if (dashLink)  dashLink.style.display  = '';
    if (loginLink) loginLink.style.display = 'none';
    if (regLink)   regLink.style.display   = 'none';
    if (nameEl)    nameEl.textContent = user.surnom || user.email;
    if (adminLink) adminLink.style.display = user.role === 'admin' ? '' : 'none';
  } else {
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (dashLink)  dashLink.style.display  = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (nameEl)    nameEl.style.display    = 'none';
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.href = '/';
    });
  }
}
