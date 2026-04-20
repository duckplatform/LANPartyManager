const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Member = require('../models/member');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new member.
 */
router.post(
  '/register',
  [
    body('nom').trim().notEmpty().withMessage('Le nom est requis.'),
    body('prenom').trim().notEmpty().withMessage('Le prénom est requis.'),
    body('surnom').trim().notEmpty().withMessage('Le surnom est requis.'),
    body('email').isEmail().normalizeEmail().withMessage("L'adresse email est invalide."),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, surnom, email, password } = req.body;

    try {
      const existing = await Member.findByEmail(email);
      if (existing) {
        return res.status(409).json({ message: 'Un compte avec cet email existe déjà.' });
      }

      const member = await Member.create({ nom, prenom, surnom, email, password });
      return res.status(201).json({
        message: 'Inscription réussie.',
        member: Member.sanitize(member),
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Ce surnom ou cet email est déjà utilisé.' });
      }
      console.error('register error:', err);
      return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate a member and return a JWT token.
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage("L'adresse email est invalide."),
    body('password').notEmpty().withMessage('Le mot de passe est requis.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const member = await Member.findByEmail(email);
      if (!member) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
      }

      const match = await bcrypt.compare(password, member.password);
      if (!match) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
      }

      const token = jwt.sign(
        { id: member.id, email: member.email, role: member.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      return res.json({
        message: 'Connexion réussie.',
        token,
        member: Member.sanitize(member),
      });
    } catch (err) {
      console.error('login error:', err);
      return res.status(500).json({ message: 'Erreur interne du serveur.' });
    }
  }
);

module.exports = router;
