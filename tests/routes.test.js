'use strict';

/**
 * Tests d'intégration - Routes (sans base de données réelle)
 * Utilise supertest pour simuler des requêtes HTTP
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');

// ── Mock de la base de données avant l'import de l'app ────────────────────

const dbModule = require('../config/database');
// Remplacement direct du pool et de testConnection
const poolStub = { execute: sinon.stub() };
dbModule.pool = poolStub;
dbModule.testConnection = async () => {};

const app = require('../app');

// ─────────────────────────────────────────────────────────────────────────

describe('Routes - Tests d\'intégration', function () {

  // ── Page d'accueil ─────────────────────────────────────────────────────

  describe('GET /', function () {
    it('doit retourner 200 et le contenu HTML de la page d\'accueil', async function () {
      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/html/);
      expect(res.text).to.include('LANPartyManager');
    });

    it('doit inclure les en-têtes de sécurité Helmet', async function () {
      const res = await request(app).get('/');
      expect(res.headers).to.have.property('x-content-type-options');
      expect(res.headers).to.have.property('x-frame-options');
    });
  });

  // ── Page de connexion ──────────────────────────────────────────────────

  describe('GET /auth/login', function () {
    it('doit retourner 200 avec le formulaire de connexion', async function () {
      const res = await request(app).get('/auth/login');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('Connexion');
      expect(res.text).to.include('form');
    });
  });

  // ── Page d'inscription ─────────────────────────────────────────────────

  describe('GET /auth/register', function () {
    it('doit retourner 200 avec le formulaire d\'inscription', async function () {
      const res = await request(app).get('/auth/register');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('Inscription');
      expect(res.text).to.include('form');
    });
  });

  // ── Profil (non authentifié) ───────────────────────────────────────────

  describe('GET /profile (sans authentification)', function () {
    it('doit rediriger vers /auth/login', async function () {
      const res = await request(app).get('/profile');
      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

  // ── Admin (non authentifié) ────────────────────────────────────────────

  describe('GET /admin (sans authentification)', function () {
    it('doit rediriger vers /auth/login', async function () {
      const res = await request(app).get('/admin');
      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

  // ── 404 ────────────────────────────────────────────────────────────────

  describe('GET /route-inexistante', function () {
    it('doit retourner 404', async function () {
      const res = await request(app).get('/cette-page-nexiste-pas-du-tout');
      expect(res.status).to.equal(404);
      expect(res.text).to.include('404');
    });
  });

  // ── POST /auth/login - validation ─────────────────────────────────────

  describe('POST /auth/login (validation)', function () {
    it('doit rejeter une requête avec email invalide', async function () {
      // On doit d'abord obtenir un CSRF token via GET
      const loginPage = await request(app).get('/auth/login');
      const csrfMatch = loginPage.text.match(/name="_csrf" value="([^"]+)"/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';
      const cookie    = loginPage.headers['set-cookie'];

      const res = await request(app)
        .post('/auth/login')
        .set('Cookie', cookie)
        .send(`_csrf=${encodeURIComponent(csrfToken)}&email=pas-un-email&password=test`);

      expect(res.status).to.equal(200);
      expect(res.text).to.include('invalide');
    });
  });

  // ── POST /auth/register - validation ──────────────────────────────────

  describe('POST /auth/register (validation)', function () {
    it('doit rejeter un mot de passe trop court', async function () {
      const regPage   = await request(app).get('/auth/register');
      const csrfMatch = regPage.text.match(/name="_csrf" value="([^"]+)"/);
      const csrfToken = csrfMatch ? csrfMatch[1] : '';
      const cookie    = regPage.headers['set-cookie'];

      const res = await request(app)
        .post('/auth/register')
        .set('Cookie', cookie)
        .send(
          `_csrf=${encodeURIComponent(csrfToken)}` +
          '&nom=Test&prenom=User&pseudo=TU&email=test@test.com' +
          '&password=court&password_confirm=court'
        );

      expect(res.status).to.equal(200);
      expect(res.text).to.include('8 caract');
    });
  });

});
