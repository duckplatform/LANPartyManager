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

  // Avant chaque test de routes, on réassigne notre stub (d'autres fichiers de
  // test chargés après peuvent avoir remplacé dbModule.pool) et on configure
  // un comportement par défaut : retourne un tableau vide pour tout SELECT.
  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
    poolStub.execute.resolves([[]]); // résultat par défaut : liste vide
    app.locals.databaseReady = true;
    app.locals.databaseError = null;
  });

  // ── Page d'accueil ─────────────────────────────────────────────────────

  describe('GET /', function () {
    it('doit retourner 200 et le contenu HTML de la page d\'accueil', async function () {
      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/html/);
      expect(res.text).to.include('LANPartyManager');
    });

    it('doit retourner 503 si la base de donnees est indisponible', async function () {
      app.locals.databaseReady = false;

      const res = await request(app).get('/');

      expect(res.status).to.equal(503);
      expect(res.text).to.include('503');
      expect(res.text).to.include('Service temporairement indisponible');
    });

    it('doit inclure les en-têtes de sécurité Helmet', async function () {
      const res = await request(app).get('/');
      expect(res.headers).to.have.property('x-content-type-options');
      expect(res.headers).to.have.property('x-frame-options');
    });

    it('doit afficher la section événement quand un événement est planifié (statut planifie)', async function () {
      const fakeEvent = {
        id:         1,
        nom:        'LAN Printemps 2026',
        date_heure: new Date(Date.now() + 7 * 24 * 3600 * 1000), // dans 7 jours
        lieu:       'Salle des fêtes',
        statut:     'planifie',
      };
      // Appel 1 : Announcement.findLatestPublished → []
      // Appel 2 : Event.findActive → [fakeEvent]
      // Appel 3 : EventRegistration.countByEvent → [{total:5}]
      poolStub.execute
        .onCall(0).resolves([[]])
        .onCall(1).resolves([[fakeEvent]])
        .onCall(2).resolves([[{ total: 5 }]]);

      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('event-highlight-section');
      expect(res.text).to.include('LAN Printemps 2026');
      expect(res.text).to.include('Salle des fêtes');
    });

    it('doit afficher la section événement pour un événement en cours (statut en_cours)', async function () {
      const liveEvent = {
        id:         2,
        nom:        'LAN Été 2026',
        date_heure: new Date(Date.now() - 3600 * 1000), // commencé il y a 1h
        lieu:       'Paris',
        statut:     'en_cours',
      };
      poolStub.execute
        .onCall(0).resolves([[]])
        .onCall(1).resolves([[liveEvent]])
        .onCall(2).resolves([[{ total: 0 }]]);

      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.text).to.include('event-highlight-section');
      expect(res.text).to.include('LAN Été 2026');
    });

    it('ne doit pas afficher la section événement quand aucun événement n\'existe', async function () {
      // Tous les appels retournent une liste vide (comportement par défaut)
      const res = await request(app).get('/');
      expect(res.status).to.equal(200);
      expect(res.text).to.not.include('event-highlight-section');
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

  // ── Page Actualités (news) ─────────────────────────────────────────────

  describe('GET /news', function () {
    it('doit retourner 200 et inclure la page actualités', async function () {
      const res = await request(app).get('/news');
      expect(res.status).to.equal(200);
      expect(res.headers['content-type']).to.match(/text\/html/);
      expect(res.text).to.include('Actualités');
    });
  });

  describe('GET /health', function () {
    it('doit retourner 200 quand la base est disponible', async function () {
      const res = await request(app).get('/health');

      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal({
        status:   'ok',
        database: 'up',
      });
    });

    it('doit retourner 503 quand la base est indisponible', async function () {
      app.locals.databaseReady = false;

      const res = await request(app).get('/health');

      expect(res.status).to.equal(503);
      expect(res.body).to.deep.equal({
        status:   'degraded',
        database: 'down',
      });
    });
  });

  describe('GET /news/:id (annonce inexistante)', function () {
    it('doit retourner 404 pour un ID inexistant', async function () {
      const res = await request(app).get('/news/99999');
      expect(res.status).to.equal(404);
    });
  });

  describe('GET /news/:id (ID invalide)', function () {
    it('doit retourner 404 pour un ID non numérique', async function () {
      const res = await request(app).get('/news/abc');
      expect(res.status).to.equal(404);
    });
  });

  // ── Modérateur (non authentifié) ──────────────────────────────────────

  describe('GET /moderator (sans authentification)', function () {
    it('doit rediriger vers /auth/login', async function () {
      const res = await request(app).get('/moderator');
      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

  // ── Vérification billet (non authentifié) ─────────────────────────────

  describe('GET /moderator/verify/:token (sans authentification)', function () {
    it('doit rediriger vers /auth/login si non connecté', async function () {
      const res = await request(app).get('/moderator/verify/550e8400-e29b-41d4-a716-446655440000');
      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
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
