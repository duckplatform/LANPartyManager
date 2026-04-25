'use strict';

/**
 * Tests d'intégration - Routes (sans base de données réelle)
 * Utilise supertest pour simuler des requêtes HTTP
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const QRCode = require('qrcode');

// ── Mock de la base de données avant l'import de l'app ────────────────────

const dbModule = require('../config/database');
// Remplacement direct du pool et de testConnection
const poolStub = { execute: sinon.stub() };
dbModule.pool = poolStub;
dbModule.testConnection = async () => {};

const app = require('../app');
const adminRouter = require('../routes/admin');
const battlesRouter = require('../routes/battles');
const Battle = require('../models/Battle');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const Game = require('../models/Game');
const User = require('../models/User');

function getRouteHandler(router, method, path, stackIndex = 0) {
  const layer = router.stack.find((entry) => entry.route && entry.route.path === path && entry.route.methods[method]);
  return layer && layer.route.stack[stackIndex] ? layer.route.stack[stackIndex].handle : null;
}

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

  describe('GET /admin/users/:id/badge (handler)', function () {
    let findByIdStub;
    let ensureBadgeTokenStub;
    let qrCodeStub;

    beforeEach(function () {
      findByIdStub = sinon.stub(User, 'findById');
      ensureBadgeTokenStub = sinon.stub(User, 'ensureBadgeToken');
      qrCodeStub = sinon.stub(QRCode, 'toDataURL');
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit rendre le badge utilisateur depuis l\'administration', async function () {
      const handler = getRouteHandler(adminRouter, 'get', '/users/:id/badge');
      const user = {
        id: 7,
        nom: 'Dupont',
        prenom: 'Jean',
        pseudo: 'JD',
        email: 'jd@test.com',
        is_admin: 0,
        is_moderator: 0,
        badge_token: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date('2026-04-01T10:00:00Z'),
      };
      const req = {
        params: { id: '7' },
        session: { userId: 1 },
        flash: sinon.stub(),
      };
      const res = {
        render: sinon.stub(),
        redirect: sinon.stub(),
      };

      findByIdStub.resolves(user);
      qrCodeStub.resolves('data:image/png;base64,abc');

      await handler(req, res);

      expect(findByIdStub.calledOnceWithExactly(7)).to.be.true;
      expect(ensureBadgeTokenStub.notCalled).to.be.true;
      expect(qrCodeStub.calledOnce).to.be.true;
      expect(qrCodeStub.firstCall.args[0]).to.equal(user.badge_token);
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('badge');
      expect(res.render.firstCall.args[1]).to.include({
        user,
        qrDataUrl: 'data:image/png;base64,abc',
        backUrl: '/admin',
        backLabel: 'Retour a l\'administration',
      });
    });

    it('doit générer un badge_token manquant avant rendu', async function () {
      const handler = getRouteHandler(adminRouter, 'get', '/users/:id/badge');
      const user = {
        id: 8,
        nom: 'Martin',
        prenom: 'Alice',
        pseudo: 'Alicat',
        email: 'alice@test.com',
        is_admin: 0,
        is_moderator: 0,
        badge_token: '',
        created_at: new Date('2026-04-02T10:00:00Z'),
      };
      const req = {
        params: { id: '8' },
        session: { userId: 1 },
        flash: sinon.stub(),
      };
      const res = {
        render: sinon.stub(),
        redirect: sinon.stub(),
      };

      findByIdStub.resolves(user);
      ensureBadgeTokenStub.resolves('550e8400-e29b-41d4-a716-446655440001');
      qrCodeStub.resolves('data:image/png;base64,generated');

      await handler(req, res);

      expect(ensureBadgeTokenStub.calledOnceWithExactly(8)).to.be.true;
      expect(qrCodeStub.calledOnceWithExactly('550e8400-e29b-41d4-a716-446655440001', sinon.match.object)).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[1].user.badge_token).to.equal('550e8400-e29b-41d4-a716-446655440001');
    });
  });

  describe('POST /battles/events/:id/store (handler)', function () {
    let battleCreateStub;
    let eventFindByIdStub;
    let gameFindByIdStub;
    let userFindByBadgeTokenStub;
    let registrationIsRegisteredStub;

    beforeEach(function () {
      battleCreateStub = sinon.stub(Battle, 'create');
      eventFindByIdStub = sinon.stub(Event, 'findById');
      gameFindByIdStub = sinon.stub(Game, 'findById');
      userFindByBadgeTokenStub = sinon.stub(User, 'findByBadgeToken');
      registrationIsRegisteredStub = sinon.stub(EventRegistration, 'isRegistered');
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit refuser un joueur non inscrit a l\'evenement', async function () {
      const handler = getRouteHandler(battlesRouter, 'post', '/events/:id/store', 2);
      const req = {
        params: { id: '3' },
        body: {
          game_id: '1',
          badge_token: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
          equipe: ['1', '2'],
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 3, statut: 'en_cours' });
      gameFindByIdStub.resolves({ id: 1, nom: 'Street Fighter 6', type_rencontre: '1v1' });
      userFindByBadgeTokenStub
        .onFirstCall().resolves({ id: 10, pseudo: 'Player1' })
        .onSecondCall().resolves({ id: 11, pseudo: 'Player2' });
      registrationIsRegisteredStub
        .onFirstCall().resolves(true)
        .onSecondCall().resolves(false);

      await handler(req, res);

      expect(gameFindByIdStub.calledOnceWithExactly(1)).to.be.true;
      expect(userFindByBadgeTokenStub.calledTwice).to.be.true;
      expect(registrationIsRegisteredStub.firstCall.args).to.deep.equal([3, 10]);
      expect(registrationIsRegisteredStub.secondCall.args).to.deep.equal([3, 11]);
      expect(battleCreateStub.notCalled).to.be.true;
      expect(req.flash.calledOnceWithExactly('error', "Le joueur Player2 n'est pas inscrit a cet evenement.")).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles/events/3/create')).to.be.true;
    });

    it('doit creer la rencontre quand tous les joueurs sont inscrits', async function () {
      const handler = getRouteHandler(battlesRouter, 'post', '/events/:id/store', 2);
      const req = {
        params: { id: '4' },
        body: {
          game_id: '2',
          badge_token: [
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
          equipe: ['1', '2'],
          notes: 'Finale',
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 4, statut: 'en_cours' });
      gameFindByIdStub.resolves({ id: 2, nom: 'Tekken 8', type_rencontre: '1v1' });
      userFindByBadgeTokenStub
        .onFirstCall().resolves({ id: 21, pseudo: 'Alpha' })
        .onSecondCall().resolves({ id: 22, pseudo: 'Bravo' });
      registrationIsRegisteredStub.resolves(true);
      battleCreateStub.resolves(77);

      await handler(req, res);

      expect(registrationIsRegisteredStub.calledTwice).to.be.true;
      expect(battleCreateStub.calledOnceWithExactly(
        { event_id: 4, game_id: 2, notes: 'Finale' },
        [
          { user_id: 21, equipe: 1 },
          { user_id: 22, equipe: 2 },
        ]
      )).to.be.true;
      expect(req.flash.calledOnceWithExactly('success', 'Rencontre créée avec succès ! La salle sera attribuée automatiquement.')).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles/events/4')).to.be.true;
    });

    it('doit refuser la creation si l\'evenement n\'est pas en cours', async function () {
      const handler = getRouteHandler(battlesRouter, 'post', '/events/:id/store', 2);
      const req = {
        params: { id: '5' },
        body: {
          game_id: '2',
          badge_token: [
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
          equipe: ['1', '2'],
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 5, statut: 'planifie' });

      await handler(req, res);

      expect(gameFindByIdStub.notCalled).to.be.true;
      expect(battleCreateStub.notCalled).to.be.true;
      expect(req.flash.calledOnceWithExactly('error', 'Les rencontres ne sont disponibles que pour un événement en cours.')).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles')).to.be.true;
    });
  });

  describe('GET /battles/events/:id (handler)', function () {
    let eventFindByIdStub;

    beforeEach(function () {
      eventFindByIdStub = sinon.stub(Event, 'findById');
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit refuser l\'acces au tableau si l\'evenement n\'est pas en cours', async function () {
      const handler = getRouteHandler(battlesRouter, 'get', '/events/:id');
      const req = {
        params: { id: '7' },
        flash: sinon.stub(),
      };
      const res = {
        render: sinon.stub(),
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 7, statut: 'planifie' });

      await handler(req, res);

      expect(req.flash.calledOnceWithExactly('error', 'Les rencontres ne sont disponibles que pour un événement en cours.')).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles')).to.be.true;
      expect(res.render.notCalled).to.be.true;
    });
  });

});
