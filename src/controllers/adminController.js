/**
 * Contrôleur d'administration
 * Gère la gestion des utilisateurs depuis le panneau admin
 */
const User = require('../models/User');
const logger = require('../config/logger');
const { BASE_PATH } = require('../config/appConfig');
const { body } = require('express-validator');
const { getValidationErrors } = require('../middleware/validation');

const adminController = {
  /**
   * Tableau de bord administrateur
   */
  async dashboard(req, res) {
    try {
      const totalUsers = await User.count();
      const usersByRole = await User.countByRole();
      const recentUsers = await User.findAll();

      res.render('admin/dashboard', {
        title: 'Administration - LAN Party Manager',
        user: req.session.user,
        totalUsers,
        usersByRole,
        recentUsers: recentUsers.slice(0, 5),
        success: req.flash('success'),
        errors: req.flash('errors'),
      });
    } catch (err) {
      logger.error('Erreur tableau de bord admin', { error: err.message });
      req.flash('errors', ['Impossible de charger le tableau de bord.']);
      res.redirect(BASE_PATH + '/');
    }
  },

  /**
   * Liste tous les utilisateurs
   */
  async listUsers(req, res) {
    try {
      const users = await User.findAll();
      res.render('admin/users', {
        title: 'Gestion des utilisateurs - LAN Party Manager',
        user: req.session.user,
        users,
        success: req.flash('success'),
        errors: req.flash('errors'),
      });
    } catch (err) {
      logger.error('Erreur liste utilisateurs admin', { error: err.message });
      req.flash('errors', ['Impossible de charger la liste des utilisateurs.']);
      res.redirect(BASE_PATH + '/admin');
    }
  },

  /**
   * Affiche le formulaire d'édition d'un utilisateur
   */
  async showEditUser(req, res) {
    try {
      const targetUser = await User.findById(parseInt(req.params.id));
      if (!targetUser) {
        req.flash('errors', ['Utilisateur introuvable.']);
        return res.redirect(BASE_PATH + '/admin/users');
      }
      res.render('admin/edit-user', {
        title: `Éditer ${targetUser.nickname} - Administration`,
        user: req.session.user,
        targetUser,
        errors: req.flash('errors'),
        success: req.flash('success'),
      });
    } catch (err) {
      logger.error('Erreur affichage édition utilisateur', { error: err.message });
      req.flash('errors', ['Impossible de charger l\'utilisateur.']);
      res.redirect(BASE_PATH + '/admin/users');
    }
  },

  /**
   * Traite la mise à jour d'un utilisateur par l'admin
   */
  async updateUser(req, res) {
    const errors = getValidationErrors(req);
    if (errors.length > 0) {
      req.flash('errors', errors);
      return res.redirect(`${BASE_PATH}/admin/users/${req.params.id}/edit`);
    }

    const targetId = parseInt(req.params.id);
    const { firstName, lastName, nickname, email, role } = req.body;

    try {
      // Vérifier que l'email n'est pas pris par un autre
      const emailTaken = await User.emailExists(email, targetId);
      if (emailTaken) {
        req.flash('errors', ['Cet email est déjà utilisé par un autre compte.']);
        return res.redirect(`${BASE_PATH}/admin/users/${targetId}/edit`);
      }

      await User.update(targetId, { firstName, lastName, nickname, email });

      // Mise à jour du rôle si fourni et valide
      if (role && ['user', 'admin'].includes(role)) {
        await User.updateRole(targetId, role);
      }

      logger.info('Utilisateur mis à jour par admin', {
        adminId: req.session.userId,
        targetId,
      });
      req.flash('success', 'Utilisateur mis à jour avec succès.');
      res.redirect(BASE_PATH + '/admin/users');
    } catch (err) {
      logger.error('Erreur mise à jour utilisateur admin', { error: err.message });
      req.flash('errors', ['Impossible de mettre à jour l\'utilisateur.']);
      res.redirect(`${BASE_PATH}/admin/users/${targetId}/edit`);
    }
  },

  /**
   * Supprime un utilisateur
   */
  async deleteUser(req, res) {
    const targetId = parseInt(req.params.id);

    try {
      // Empêcher la suppression de son propre compte
      if (targetId === req.session.userId) {
        req.flash('errors', ['Vous ne pouvez pas supprimer votre propre compte.']);
        return res.redirect(BASE_PATH + '/admin/users');
      }

      const targetUser = await User.findById(targetId);
      if (!targetUser) {
        req.flash('errors', ['Utilisateur introuvable.']);
        return res.redirect(BASE_PATH + '/admin/users');
      }

      await User.delete(targetId);

      logger.info('Utilisateur supprimé par admin', {
        adminId: req.session.userId,
        deletedUserId: targetId,
      });
      req.flash('success', 'Utilisateur supprimé avec succès.');
      res.redirect(BASE_PATH + '/admin/users');
    } catch (err) {
      logger.error('Erreur suppression utilisateur admin', { error: err.message });
      req.flash('errors', ['Impossible de supprimer l\'utilisateur.']);
      res.redirect(BASE_PATH + '/admin/users');
    }
  },

  /**
   * Règles de validation pour l'édition admin
   */
  editUserValidation: [
    body('firstName')
      .trim()
      .notEmpty().withMessage('Le prénom est requis.')
      .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit faire entre 2 et 50 caractères.'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Le nom est requis.')
      .isLength({ min: 2, max: 50 }).withMessage('Le nom doit faire entre 2 et 50 caractères.'),
    body('nickname')
      .trim()
      .notEmpty().withMessage('Le pseudo est requis.')
      .isLength({ min: 2, max: 30 }).withMessage('Le pseudo doit faire entre 2 et 30 caractères.'),
    body('email')
      .trim()
      .normalizeEmail()
      .isEmail().withMessage('Email invalide.'),
    body('role')
      .isIn(['user', 'admin']).withMessage('Rôle invalide.'),
  ],
};

module.exports = adminController;
