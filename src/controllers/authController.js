/**
 * Contrôleur d'authentification
 * Gère inscription, connexion, déconnexion et profil utilisateur
 */
const User = require('../models/User');
const logger = require('../config/logger');
const { BASE_PATH } = require('../config/appConfig');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  getValidationErrors,
} = require('../middleware/validation');

const authController = {
  // ─── Inscription ────────────────────────────────────────────────────────────

  /**
   * Affiche le formulaire d'inscription
   */
  showRegister(req, res) {
    res.render('auth/register', {
      title: 'Inscription - LAN Party Manager',
      user: req.session.user || null,
      errors: req.flash('errors'),
      formData: req.flash('formData')[0] || {},
    });
  },

  /**
   * Traite la soumission du formulaire d'inscription
   */
  async register(req, res) {
    const errors = getValidationErrors(req);
    if (errors.length > 0) {
      req.flash('errors', errors);
      req.flash('formData', { ...req.body, password: '', confirmPassword: '' });
      return res.redirect(BASE_PATH + '/auth/register');
    }

    const { firstName, lastName, nickname, email, password } = req.body;

    try {
      // Vérifier si l'email est déjà pris
      const emailTaken = await User.emailExists(email);
      if (emailTaken) {
        req.flash('errors', ['Cette adresse email est déjà utilisée.']);
        req.flash('formData', { firstName, lastName, nickname, email });
        return res.redirect(BASE_PATH + '/auth/register');
      }

      const newUser = await User.create({ firstName, lastName, nickname, email, password });

      // Connexion automatique après inscription
      req.session.userId = newUser.id;
      req.session.userRole = newUser.role;
      req.session.user = newUser;

      req.flash('success', `Bienvenue ${newUser.nickname} ! Votre compte a été créé avec succès.`);
      logger.info('Nouvel utilisateur inscrit', { userId: newUser.id, email });
      res.redirect(BASE_PATH + '/profile');
    } catch (err) {
      logger.error('Erreur lors de l\'inscription', { error: err.message });
      req.flash('errors', ['Une erreur est survenue. Veuillez réessayer.']);
      res.redirect(BASE_PATH + '/auth/register');
    }
  },

  // ─── Connexion ──────────────────────────────────────────────────────────────

  /**
   * Affiche le formulaire de connexion
   */
  showLogin(req, res) {
    res.render('auth/login', {
      title: 'Connexion - LAN Party Manager',
      user: req.session.user || null,
      errors: req.flash('errors'),
      success: req.flash('success'),
      formData: req.flash('formData')[0] || {},
    });
  },

  /**
   * Traite la soumission du formulaire de connexion
   */
  async login(req, res) {
    const errors = getValidationErrors(req);
    if (errors.length > 0) {
      req.flash('errors', errors);
      req.flash('formData', { email: req.body.email });
      return res.redirect(BASE_PATH + '/auth/login');
    }

    const { email, password } = req.body;

    try {
      const user = await User.findByEmail(email);
      if (!user) {
        req.flash('errors', ['Email ou mot de passe incorrect.']);
        req.flash('formData', { email });
        return res.redirect(BASE_PATH + '/auth/login');
      }

      const passwordValid = await User.verifyPassword(password, user.password);
      if (!passwordValid) {
        req.flash('errors', ['Email ou mot de passe incorrect.']);
        req.flash('formData', { email });
        logger.warn('Tentative de connexion échouée', { email });
        return res.redirect(BASE_PATH + '/auth/login');
      }

      // Régénérer la session pour prévenir la fixation de session
      req.session.regenerate((err) => {
        if (err) {
          logger.error('Erreur régénération session', { error: err.message });
          req.flash('errors', ['Erreur de session. Veuillez réessayer.']);
          return res.redirect(BASE_PATH + '/auth/login');
        }
        const { password: _pwd, ...safeUser } = user;
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.user = safeUser;

        logger.info('Utilisateur connecté', { userId: user.id, email });
        req.flash('success', `Bienvenue ${user.nickname} !`);
        res.redirect(user.role === 'admin' ? BASE_PATH + '/admin' : BASE_PATH + '/profile');
      });
    } catch (err) {
      logger.error('Erreur lors de la connexion', { error: err.message });
      req.flash('errors', ['Une erreur est survenue. Veuillez réessayer.']);
      res.redirect(BASE_PATH + '/auth/login');
    }
  },

  // ─── Déconnexion ────────────────────────────────────────────────────────────

  /**
   * Déconnecte l'utilisateur
   */
  logout(req, res) {
    const userId = req.session.userId;
    req.session.destroy((err) => {
      if (err) {
        logger.error('Erreur lors de la déconnexion', { error: err.message });
      } else {
        logger.info('Utilisateur déconnecté', { userId });
      }
      res.clearCookie('connect.sid');
      res.redirect(BASE_PATH + '/');
    });
  },

  // ─── Profil ─────────────────────────────────────────────────────────────────

  /**
   * Affiche le profil de l'utilisateur connecté
   */
  async showProfile(req, res) {
    try {
      const user = await User.findById(req.session.userId);
      if (!user) {
        req.session.destroy();
        return res.redirect(BASE_PATH + '/auth/login');
      }
      res.render('auth/profile', {
        title: 'Mon Profil - LAN Party Manager',
        user,
        success: req.flash('success'),
        errors: req.flash('errors'),
      });
    } catch (err) {
      logger.error('Erreur affichage profil', { error: err.message });
      req.flash('errors', ['Impossible de charger le profil.']);
      res.redirect(BASE_PATH + '/');
    }
  },

  /**
   * Traite la mise à jour du profil
   */
  async updateProfile(req, res) {
    const errors = getValidationErrors(req);
    if (errors.length > 0) {
      req.flash('errors', errors);
      return res.redirect(BASE_PATH + '/profile');
    }

    const { firstName, lastName, nickname, email } = req.body;
    const userId = req.session.userId;

    try {
      // Vérifier si le nouvel email est déjà pris par un autre utilisateur
      const emailTaken = await User.emailExists(email, userId);
      if (emailTaken) {
        req.flash('errors', ['Cette adresse email est déjà utilisée par un autre compte.']);
        return res.redirect(BASE_PATH + '/profile');
      }

      const updatedUser = await User.update(userId, { firstName, lastName, nickname, email });

      // Mettre à jour la session
      req.session.user = updatedUser;

      req.flash('success', 'Profil mis à jour avec succès.');
      res.redirect(BASE_PATH + '/profile');
    } catch (err) {
      logger.error('Erreur mise à jour profil', { error: err.message, userId });
      req.flash('errors', ['Impossible de mettre à jour le profil.']);
      res.redirect(BASE_PATH + '/profile');
    }
  },

  /**
   * Traite le changement de mot de passe
   */
  async changePassword(req, res) {
    const errors = getValidationErrors(req);
    if (errors.length > 0) {
      req.flash('errors', errors);
      return res.redirect(BASE_PATH + '/profile');
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    try {
      const user = await User.findByEmail(req.session.user.email);
      const validPassword = await User.verifyPassword(currentPassword, user.password);

      if (!validPassword) {
        req.flash('errors', ['Le mot de passe actuel est incorrect.']);
        return res.redirect(BASE_PATH + '/profile');
      }

      await User.updatePassword(userId, newPassword);
      req.flash('success', 'Mot de passe changé avec succès.');
      res.redirect(BASE_PATH + '/profile');
    } catch (err) {
      logger.error('Erreur changement mot de passe', { error: err.message, userId });
      req.flash('errors', ['Impossible de changer le mot de passe.']);
      res.redirect(BASE_PATH + '/profile');
    }
  },
};

// Exports avec middleware de validation intégrés
authController.registerValidation = registerValidation;
authController.loginValidation = loginValidation;
authController.updateProfileValidation = updateProfileValidation;
authController.changePasswordValidation = changePasswordValidation;

module.exports = authController;
