/**
 * Contrôleur de la page d'accueil
 */
const logger = require('../config/logger');

const homeController = {
  /**
   * Affiche la page d'accueil
   */
  index(req, res) {
    logger.debug('Page d\'accueil visitée');
    res.render('home', {
      title: 'Accueil - LAN Party Manager',
      user: req.session.user || null,
    });
  },
};

module.exports = homeController;
