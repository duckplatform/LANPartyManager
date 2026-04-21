/**
 * Routes d'administration
 * Toutes les routes sont protégées par requireAdmin
 */
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/adminAuth');

// Appliquer la protection admin à toutes les routes
router.use(requireAdmin);

// Tableau de bord
router.get('/', adminController.dashboard);

// Gestion des utilisateurs
router.get('/users', adminController.listUsers);
router.get('/users/:id/edit', adminController.showEditUser);
router.post('/users/:id/edit', adminController.editUserValidation, adminController.updateUser);
router.post('/users/:id/delete', adminController.deleteUser);

module.exports = router;
