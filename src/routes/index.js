/**
 * Routes principales (page d'accueil)
 */
const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Page d'accueil
router.get('/', homeController.index);

module.exports = router;
