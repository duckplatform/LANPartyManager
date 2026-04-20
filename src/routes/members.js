const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { authenticate, requireAdmin } = require('../middleware/auth');
const Member = require('../models/member');

const router = express.Router();

/**
 * GET /api/members/me
 * Get the authenticated member's profile.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    if (!member) {
      return res.status(404).json({ message: 'Membre introuvable.' });
    }
    return res.json({ member: Member.sanitize(member) });
  } catch (err) {
    console.error('get profile error:', err);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

/**
 * PUT /api/members/me
 * Update the authenticated member's profile (info and/or password).
 */
router.put(
  '/me',
  authenticate,
  [
    body('nom').optional().trim().notEmpty().withMessage('Le nom ne peut pas être vide.'),
    body('prenom').optional().trim().notEmpty().withMessage('Le prénom ne peut pas être vide.'),
    body('surnom').optional().trim().notEmpty().withMessage('Le surnom ne peut pas être vide.'),
    body('email').optional().isEmail().normalizeEmail().withMessage("L'adresse email est invalide."),
    body('newPassword')
      .optional()
      .isLength({ min: 6 })
      .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.'),
    body('currentPassword')
      .if(body('newPassword').exists())
      .notEmpty()
      .withMessage('Le mot de passe actuel est requis pour changer de mot de passe.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, surnom, email, currentPassword, newPassword } = req.body;

    try {
      const member = await Member.findById(req.user.id);
      if (!member) {
        return res.status(404).json({ message: 'Membre introuvable.' });
      }

      if (newPassword) {
        const match = await bcrypt.compare(currentPassword, member.password);
        if (!match) {
          return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
        }
        await Member.updatePassword(req.user.id, newPassword);
      }

      const updated = await Member.update(req.user.id, { nom, prenom, surnom, email });
      return res.json({
        message: 'Profil mis à jour.',
        member: Member.sanitize(updated),
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Ce surnom ou cet email est déjà utilisé.' });
      }
      console.error('update profile error:', err);
      return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  }
);

/**
 * GET /api/members
 * List all members (admin only).
 */
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const members = await Member.findAll();
    return res.json({ members });
  } catch (err) {
    console.error('list members error:', err);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

/**
 * DELETE /api/members/:id
 * Delete a member (admin only).
 */
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID invalide.' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte." });
  }
  try {
    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ message: 'Membre introuvable.' });
    }
    await Member.remove(id);
    return res.json({ message: 'Membre supprimé.' });
  } catch (err) {
    console.error('delete member error:', err);
    return res.status(500).json({ message: 'Erreur interne du serveur.' });
  }
});

module.exports = router;
