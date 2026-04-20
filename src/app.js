require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');

const app = express();

app.use(cors());
app.use(express.json());

// Serve the web frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

const isTest = process.env.NODE_ENV === 'test';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 0 : 20,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Veuillez réessayer dans 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 0 : 200,
  skip: () => isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes. Veuillez réessayer dans 15 minutes.' },
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/members', apiLimiter, memberRoutes);

// Unknown API routes → JSON 404
app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route introuvable.' });
});

// All other routes → serve the landing page (SPA-style fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`LANPartyManager server running on port ${PORT}`);
  });
}

module.exports = app;
