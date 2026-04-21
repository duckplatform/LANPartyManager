'use strict';

/**
 * Route principale : Page d'accueil
 */

const express = require('express');
const router  = express.Router();

// GET /
router.get('/', (req, res) => {
  res.render('index', {
    title:       'Accueil',
    pageClass:   'page-home',
  });
});

module.exports = router;
