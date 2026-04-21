/**
 * Routes d'authentification
 * Inscription, connexion, déconnexion, profil
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, redirectIfAuthenticated } = require('../middleware/auth');

// ─── Inscription ──────────────────────────────────────────────────────────────
router.get('/register', redirectIfAuthenticated, authController.showRegister);
router.post('/register', redirectIfAuthenticated, authController.registerValidation, authController.register);

// ─── Connexion ────────────────────────────────────────────────────────────────
router.get('/login', redirectIfAuthenticated, authController.showLogin);
router.post('/login', redirectIfAuthenticated, authController.loginValidation, authController.login);

// ─── Déconnexion ──────────────────────────────────────────────────────────────
router.post('/logout', requireAuth, authController.logout);

module.exports = router;
