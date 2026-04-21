/**
 * Middleware de validation des données utilisateur
 * Utilise express-validator
 */
const { body, validationResult } = require('express-validator');

/**
 * Règles de validation pour l'inscription
 */
const registerValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Le prénom est requis.')
    .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('Le prénom contient des caractères invalides.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Le nom est requis.')
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('Le nom contient des caractères invalides.'),

  body('nickname')
    .trim()
    .notEmpty().withMessage('Le pseudo est requis.')
    .isLength({ min: 2, max: 30 }).withMessage('Le pseudo doit faire entre 2 et 30 caractères.')
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Le pseudo ne peut contenir que des lettres, chiffres, tirets, underscores et points.'),

  body('email')
    .trim()
    .normalizeEmail()
    .notEmpty().withMessage('L\'email est requis.')
    .isEmail().withMessage('L\'adresse email n\'est pas valide.'),

  body('password')
    .notEmpty().withMessage('Le mot de passe est requis.')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.'),

  body('confirmPassword')
    .notEmpty().withMessage('La confirmation du mot de passe est requise.')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Les mots de passe ne correspondent pas.');
      }
      return true;
    }),
];

/**
 * Règles de validation pour la connexion
 */
const loginValidation = [
  body('email')
    .trim()
    .normalizeEmail()
    .notEmpty().withMessage('L\'email est requis.')
    .isEmail().withMessage('L\'adresse email n\'est pas valide.'),

  body('password')
    .notEmpty().withMessage('Le mot de passe est requis.'),
];

/**
 * Règles de validation pour la mise à jour du profil
 */
const updateProfileValidation = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('Le prénom est requis.')
    .isLength({ min: 2, max: 50 }).withMessage('Le prénom doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('Le prénom contient des caractères invalides.'),

  body('lastName')
    .trim()
    .notEmpty().withMessage('Le nom est requis.')
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit faire entre 2 et 50 caractères.')
    .matches(/^[a-zA-ZÀ-ÿ\s'-]+$/).withMessage('Le nom contient des caractères invalides.'),

  body('nickname')
    .trim()
    .notEmpty().withMessage('Le pseudo est requis.')
    .isLength({ min: 2, max: 30 }).withMessage('Le pseudo doit faire entre 2 et 30 caractères.')
    .matches(/^[a-zA-Z0-9_\-. ]+$/).withMessage('Le pseudo contient des caractères invalides.'),

  body('email')
    .trim()
    .normalizeEmail()
    .notEmpty().withMessage('L\'email est requis.')
    .isEmail().withMessage('L\'adresse email n\'est pas valide.'),
];

/**
 * Règles de validation pour le changement de mot de passe
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Le mot de passe actuel est requis.'),

  body('newPassword')
    .notEmpty().withMessage('Le nouveau mot de passe est requis.')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit faire au moins 8 caractères.')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.'),

  body('confirmNewPassword')
    .notEmpty().withMessage('La confirmation est requise.')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Les nouveaux mots de passe ne correspondent pas.');
      }
      return true;
    }),
];

/**
 * Extrait les erreurs de validation et les retourne sous forme de tableau
 * @param {Object} req
 * @returns {Array} Tableau des messages d'erreur
 */
function getValidationErrors(req) {
  const errors = validationResult(req);
  return errors.array().map((e) => e.msg);
}

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
  getValidationErrors,
};
