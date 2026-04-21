/**
 * Routes de profil utilisateur
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Affichage du profil
router.get('/', requireAuth, authController.showProfile);

// Mise à jour du profil
router.post('/update', requireAuth, authController.updateProfileValidation, authController.updateProfile);

// Changement de mot de passe
router.post('/change-password', requireAuth, authController.changePasswordValidation, authController.changePassword);

module.exports = router;
