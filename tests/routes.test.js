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
const eventsRouter = require('../routes/events');
const Battle = require('../models/Battle');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const EventRanking = require('../models/EventRanking');
const Game = require('../models/Game');
const Room = require('../models/Room');
const User = require('../models/User');
const discord = require('../services/discord');

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

    it('doit retourner 503 si la base de données est indisponible', async function () {
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
        last_name:        'LAN Printemps 2026',
        start_at: new Date(Date.now() + 7 * 24 * 3600 * 1000), // dans 7 jours
        location:       'Salle des fêtes',
        status:     'planned',
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
        last_name:        'LAN Été 2026',
        start_at: new Date(Date.now() - 3600 * 1000), // commencé il y a 1h
        location:       'Paris',
        status:     'in_progress',
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

    it('ne doit pas afficher de CTA invité si l\'événement mis en avant est fermé', async function () {
      const liveEvent = {
        id:         3,
        last_name:        'LAN Fermée',
        start_at: new Date(Date.now() - 3600 * 1000),
        location:       'Lille',
        status:     'in_progress',
      };
      poolStub.execute
        .onCall(0).resolves([[]])
        .onCall(1).resolves([[liveEvent]])
        .onCall(2).resolves([[{ total: 12 }]])
        .onCall(3).resolves([[]]);

      const res = await request(app).get('/');

      expect(res.status).to.equal(200);
      expect(res.text).to.not.include('Créer un compte pour s\'inscrire');
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

  describe('GET /events', function () {
    it('ne doit pas afficher de CTA invité pour un événement aux inscriptions fermées', async function () {
      const closedEvent = {
        id: 21,
        last_name: 'LAN Close List',
        start_at: new Date(Date.now() - 3600 * 1000),
        location: 'Rennes',
        status: 'in_progress',
        registrationCount: 8,
      };

      poolStub.execute
        .onCall(0).resolves([[closedEvent]])
        .onCall(1).resolves([[]]);

      const res = await request(app).get('/events');

      expect(res.status).to.equal(200);
      expect(res.text).to.not.include('Connexion pour s\'inscrire');
      expect(res.text).to.include('Inscriptions fermées');
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

  describe('GET /events/:id (handler)', function () {
    let eventFindByIdStub;
    let rankingFindByEventStub;
    let registrationCountByEventStub;
    let registrationIsRegisteredStub;
    let battleFindByEventStub;
    let roomFindByEventStub;

    beforeEach(function () {
      eventFindByIdStub = sinon.stub(Event, 'findById');
      rankingFindByEventStub = sinon.stub(EventRanking, 'findByEvent');
      registrationCountByEventStub = sinon.stub(EventRegistration, 'countByEvent');
      registrationIsRegisteredStub = sinon.stub(EventRegistration, 'isRegistered');
      battleFindByEventStub = sinon.stub(Battle, 'findByEvent');
      roomFindByEventStub = sinon.stub(Room, 'findByEvent');
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit fournir les agrégats de graphiques à la vue détail événement', async function () {
      const handler = getRouteHandler(eventsRouter, 'get', '/:id');
      const req = {
        params: { id: '12' },
        session: { userId: 99 },
        flash: sinon.stub(),
      };
      const res = {
        render: sinon.stub(),
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({
        id: 12,
        last_name: 'LAN Analytics',
        start_at: '2099-06-10 14:00:00',
        location: 'Nantes',
        status: 'planned',
      });
      registrationCountByEventStub.resolves(18);
      rankingFindByEventStub.resolves([
        { rang: 1, username: 'Alpha', points: 9, wins: 4, battles_played: 5 },
        { rang: 2, username: 'Bravo', points: 6, wins: 3, battles_played: 4 },
      ]);
      battleFindByEventStub.resolves([
        { id: 1, status: 'in_progress', game_nom: 'Tekken 8', game_console: 'PS5', room_id: 101 },
        { id: 2, status: 'ended', game_nom: 'Tekken 8', game_console: 'PS5', room_id: 101 },
        { id: 3, status: 'planned', game_nom: 'Mario Kart 8', game_console: 'Switch', room_id: 102 },
        { id: 4, status: 'queue', game_nom: 'Mario Kart 8', game_console: 'Switch', room_id: null },
      ]);
      roomFindByEventStub.resolves([
        { id: 101, last_name: 'Zelda', type: 'console', match_type: '1v1', is_active: 1 },
        { id: 102, last_name: 'Mario', type: 'console', match_type: '1v1', is_active: 1 },
        { id: 103, last_name: 'Sonic', type: 'simulation', match_type: 'solo', is_active: 0 },
      ]);
      registrationIsRegisteredStub.resolves(false);

      await handler(req, res);

      expect(roomFindByEventStub.calledOnceWithExactly(12)).to.be.true;
      expect(res.redirect.notCalled).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('events/show');

      const payload = res.render.firstCall.args[1];
      expect(payload.chartData).to.exist;
      expect(payload.chartData.statuses.total).to.equal(4);
      expect(payload.chartData.statuses.segments.find(s => s.status === 'in_progress').count).to.equal(1);
      expect(payload.chartData.games.items[0]).to.include({ name: 'Mario Kart 8', total: 2 });
      expect(payload.chartData.rankings.items[0]).to.include({ username: 'Alpha', points: 9 });
      expect(payload.chartData.rooms.total).to.equal(3);
      expect(payload.chartData.rooms.availableNow).to.equal(0);
      expect(payload.chartData.rooms.items.find(room => room.name === 'Zelda')).to.include({ assigned: 2, active: 1, done: 1 });
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

    it('doit rejeter une requête POST avec _csrf sous forme de tableau (protection confusion de type)', async function () {
      // Un attaquant peut tenter d'envoyer _csrf[]=val1&_csrf[]=val2 pour créer un tableau.
      // Le middleware CSRF doit ignorer les tableaux et invalider la requête.
      const loginPage = await request(app).get('/auth/login');
      const cookie    = loginPage.headers['set-cookie'];

      const res = await request(app)
        .post('/auth/login')
        .set('Cookie', cookie)
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('_csrf[]=tampered1&_csrf[]=tampered2&email=test@test.com&password=test');

      // La requête doit être rejetée (400 CSRF invalide ou redirection)
      expect([302, 400, 403]).to.include(res.status);
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
        last_name: 'Dupont',
        first_name: 'Jean',
        username: 'JD',
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
        backLabel: 'Retour à l\'administration',
      });
    });

    it('doit générer un badge_token manquant avant rendu', async function () {
      const handler = getRouteHandler(adminRouter, 'get', '/users/:id/badge');
      const user = {
        id: 8,
        last_name: 'Martin',
        first_name: 'Alice',
        username: 'Alicat',
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
    let battleFindByIdStub;
    let eventFindByIdStub;
    let gameFindByIdStub;
    let userFindByBadgeTokenStub;
    let registrationIsRegisteredStub;
    let notifyBattleCreatedStub;
    let notifyBattlePlannedStub;

    beforeEach(function () {
      battleCreateStub = sinon.stub(Battle, 'create');
      battleFindByIdStub = sinon.stub(Battle, 'findById');
      eventFindByIdStub = sinon.stub(Event, 'findById');
      gameFindByIdStub = sinon.stub(Game, 'findById');
      userFindByBadgeTokenStub = sinon.stub(User, 'findByBadgeToken');
      registrationIsRegisteredStub = sinon.stub(EventRegistration, 'isRegistered');
      notifyBattleCreatedStub = sinon.stub(discord, 'notifyBattleCreated').resolves();
      notifyBattlePlannedStub = sinon.stub(discord, 'notifyBattlePlanned').resolves();
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit refuser un joueur non inscrit à l\'événement', async function () {
      const handler = getRouteHandler(battlesRouter, 'post', '/events/:id/store', 2);
      const req = {
        params: { id: '3' },
        body: {
          game_id: '1',
          badge_token: [
            '550e8400-e29b-41d4-a716-446655440000',
            '550e8400-e29b-41d4-a716-446655440001',
          ],
          team: ['1', '2'],
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 3, status: 'in_progress' });
      gameFindByIdStub.resolves({ id: 1, last_name: 'Street Fighter 6', match_type: '1v1' });
      userFindByBadgeTokenStub
        .onFirstCall().resolves({ id: 10, username: 'Player1' })
        .onSecondCall().resolves({ id: 11, username: 'Player2' });
      registrationIsRegisteredStub
        .onFirstCall().resolves(true)
        .onSecondCall().resolves(false);

      await handler(req, res);

      expect(gameFindByIdStub.calledOnceWithExactly(1)).to.be.true;
      expect(userFindByBadgeTokenStub.calledTwice).to.be.true;
      expect(registrationIsRegisteredStub.firstCall.args).to.deep.equal([3, 10]);
      expect(registrationIsRegisteredStub.secondCall.args).to.deep.equal([3, 11]);
      expect(battleCreateStub.notCalled).to.be.true;
      expect(req.flash.calledOnceWithExactly('error', "Le joueur Player2 n'est pas inscrit à cet événement.")).to.be.true;
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
          team: ['1', '2'],
          notes: 'Finale',
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 4, status: 'in_progress' });
      gameFindByIdStub.resolves({ id: 2, last_name: 'Tekken 8', match_type: '1v1' });
      userFindByBadgeTokenStub
        .onFirstCall().resolves({ id: 21, username: 'Alpha' })
        .onSecondCall().resolves({ id: 22, username: 'Bravo' });
      registrationIsRegisteredStub.resolves(true);
      battleCreateStub.resolves(77);
      battleFindByIdStub.resolves({ id: 77, event_id: 4, status: 'queue' });

      await handler(req, res);

      expect(registrationIsRegisteredStub.calledTwice).to.be.true;
      expect(battleCreateStub.calledOnceWithExactly(
        { event_id: 4, game_id: 2, notes: 'Finale' },
        [
          { user_id: 21, team: 1 },
          { user_id: 22, team: 2 },
        ]
      )).to.be.true;
      expect(notifyBattleCreatedStub.calledOnce).to.be.true;
      expect(notifyBattlePlannedStub.notCalled).to.be.true;
      expect(req.flash.calledOnceWithExactly('success', 'Rencontre créée avec succès ! La salle sera attribuée automatiquement.')).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles/events/4')).to.be.true;
    });

    it('doit notifier Discord quand la rencontre est promue immediatement en planifie', async function () {
      const handler = getRouteHandler(battlesRouter, 'post', '/events/:id/store', 2);
      const req = {
        params: { id: '4' },
        body: {
          game_id: '2',
          badge_token: [
            '550e8400-e29b-41d4-a716-446655440002',
            '550e8400-e29b-41d4-a716-446655440003',
          ],
          team: ['1', '2'],
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      const event = { id: 4, last_name: 'LAN Test', status: 'in_progress', discord_channel_id: '333333333333333333' };
      const createdBattle = { id: 77, event_id: 4, status: 'planned', room_nom: 'Neo Tokyo' };

      eventFindByIdStub.resolves(event);
      gameFindByIdStub.resolves({ id: 2, last_name: 'Tekken 8', match_type: '1v1' });
      userFindByBadgeTokenStub
        .onFirstCall().resolves({ id: 21, username: 'Alpha' })
        .onSecondCall().resolves({ id: 22, username: 'Bravo' });
      registrationIsRegisteredStub.resolves(true);
      battleCreateStub.resolves(77);
      battleFindByIdStub.resolves(createdBattle);

      await handler(req, res);

      expect(notifyBattleCreatedStub.calledOnceWithExactly({ event, battle: createdBattle })).to.be.true;
      expect(notifyBattlePlannedStub.calledOnceWithExactly({ event, battle: createdBattle })).to.be.true;
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
          team: ['1', '2'],
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 5, status: 'planned' });

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

      eventFindByIdStub.resolves({ id: 7, status: 'planned' });

      await handler(req, res);

      expect(req.flash.calledOnceWithExactly('error', 'Les rencontres ne sont disponibles que pour un événement en cours.')).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles')).to.be.true;
      expect(res.render.notCalled).to.be.true;
    });
  });

  describe('POST /battles/:id/result (handler)', function () {
    let battleFindByIdStub;
    let eventFindByIdStub;
    let setResultWithQueueStub;
    let recalculateRankingStub;
    let notifyBattleEndedStub;

    beforeEach(function () {
      battleFindByIdStub = sinon.stub(Battle, 'findById');
      eventFindByIdStub = sinon.stub(Event, 'findById');
      setResultWithQueueStub = sinon.stub(Battle, 'setResultWithQueue');
      recalculateRankingStub = sinon.stub(EventRanking, 'recalculateForEvent').resolves();
      notifyBattleEndedStub = sinon.stub(discord, 'notifyBattleEnded').resolves();
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit lire les gagnants depuis winner_ids comme soumis par express.urlencoded', async function () {
      const handler = getRouteHandler(battlesRouter, 'post', '/:id/result', 1);
      const req = {
        params: { id: '12' },
        body: {
          score: '3-0',
          winner_ids: ['10', '11'],
        },
        flash: sinon.stub(),
        session: { userId: 99 },
      };
      const res = {
        redirect: sinon.stub(),
      };

      const battle = { id: 12, event_id: 1, status: 'in_progress' };
      const event = { id: 1, last_name: 'LAN Spring Showdown', status: 'in_progress' };
      const endedBattle = {
        id: 12,
        event_id: 1,
        status: 'ended',
        score: '3-0',
        players: [
          { user_id: 10, username: 'Blitz', is_winner: 1 },
          { user_id: 11, username: 'Orbit', is_winner: 1 },
        ],
      };

      battleFindByIdStub.onCall(0).resolves(battle);
      battleFindByIdStub.onCall(1).resolves(endedBattle);
      eventFindByIdStub.resolves(event);
      setResultWithQueueStub.resolves({ success: true, promotedBattleIds: [] });

      await handler(req, res);

      expect(setResultWithQueueStub.calledOnceWithExactly(12, '3-0', [10, 11], 1)).to.be.true;
      expect(recalculateRankingStub.calledOnceWithExactly(1)).to.be.true;
      expect(notifyBattleEndedStub.calledOnceWithExactly({ event, battle: endedBattle })).to.be.true;
      expect(res.redirect.calledOnceWithExactly('/battles/events/1')).to.be.true;
    });
  });

  describe('GET /battles/events/:id/announce (handler)', function () {
    let eventFindByIdStub;
    let battleFindByEventStub;
    let battleCountByStatutStub;
    let roomFindByEventStub;
    let battleReevaluateQueueStub;
    let rankingFindByEventStub;

    beforeEach(function () {
      eventFindByIdStub = sinon.stub(Event, 'findById');
      battleFindByEventStub = sinon.stub(Battle, 'findByEvent');
      battleCountByStatutStub = sinon.stub(Battle, 'countByStatus');
      roomFindByEventStub = sinon.stub(Room, 'findByEvent');
      battleReevaluateQueueStub = sinon.stub(Battle, 'reevaluateQueue');
      rankingFindByEventStub = sinon.stub(EventRanking, 'findByEvent');
    });

    afterEach(function () {
      sinon.restore();
    });

    it('doit rendre la vue announce avec des valeurs par défaut si stats est absent', async function () {
      const handler = getRouteHandler(battlesRouter, 'get', '/events/:id/announce');
      const req = {
        params: { id: '9' },
        flash: sinon.stub(),
      };
      const res = {
        render: sinon.stub(),
        redirect: sinon.stub(),
      };

      eventFindByIdStub.resolves({ id: 9, last_name: 'LAN Test', status: 'in_progress' });
      battleFindByEventStub.resolves([]);
      roomFindByEventStub.resolves([]);
      battleCountByStatutStub.resolves(undefined);
      battleReevaluateQueueStub.resolves([]);
      rankingFindByEventStub.resolves([]);

      await handler(req, res);

      expect(res.redirect.notCalled).to.be.true;
      expect(res.render.calledOnce).to.be.true;
      expect(res.render.firstCall.args[0]).to.equal('moderator/battles/announce');

      const payload = res.render.firstCall.args[1];
      expect(payload).to.include.keys('event', 'stats', 'roomBoards', 'globalQueue', 'recentResults', 'rankingBoard', 'now');
      expect(payload.stats).to.deep.equal({ en_cours: 0, installation: 0, planifie: 0, file_attente: 0, termine: 0 });
      expect(payload.roomBoards).to.deep.equal([]);
      expect(payload.globalQueue).to.deep.equal([]);
      expect(payload.recentResults).to.deep.equal([]);
      expect(payload.rankingBoard).to.deep.equal([]);
    });
  });

  // ── Routes Discord OAuth2 ──────────────────────────────────────────────

  describe('GET /auth/discord (sans DISCORD_CLIENT_ID)', function () {
    it('doit rediriger vers /auth/login si Discord non configuré', async function () {
      const savedClientId = process.env.DISCORD_CLIENT_ID;
      const savedAppUrl   = process.env.APP_URL;
      delete process.env.DISCORD_CLIENT_ID;
      delete process.env.APP_URL;

      const res = await request(app).get('/auth/discord');

      process.env.DISCORD_CLIENT_ID = savedClientId;
      process.env.APP_URL           = savedAppUrl;

      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

  describe('GET /auth/discord (avec DISCORD_CLIENT_ID configuré)', function () {
    it('doit rediriger vers Discord OAuth si configuré', async function () {
      const savedClientId = process.env.DISCORD_CLIENT_ID;
      const savedAppUrl   = process.env.APP_URL;
      process.env.DISCORD_CLIENT_ID = 'test-client-id';
      process.env.APP_URL           = 'https://lanparty.example.com';

      const res = await request(app).get('/auth/discord');

      process.env.DISCORD_CLIENT_ID = savedClientId;
      process.env.APP_URL           = savedAppUrl;

      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('discord.com/oauth2/authorize');
      expect(res.headers['location']).to.include('test-client-id');
    });
  });

  describe('GET /auth/discord/callback (erreur Discord)', function () {
    it('doit rediriger vers /auth/login si Discord renvoie une erreur', async function () {
      const res = await request(app)
        .get('/auth/discord/callback?error=access_denied');

      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

  describe('GET /auth/discord/callback (state invalide)', function () {
    it('doit rediriger vers /auth/login si le state est invalide', async function () {
      const res = await request(app)
        .get('/auth/discord/callback?code=test-code&state=invalid-state');

      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

  describe('GET /auth/discord/complete (sans session discordPending)', function () {
    it('doit rediriger vers /auth/register si pas de session discordPending', async function () {
      const res = await request(app).get('/auth/discord/complete');

      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/register');
    });
  });

  describe('POST /auth/discord/complete (sans session discordPending)', function () {
    it('doit rediriger vers /auth/register si pas de session discordPending', async function () {
      const completePage = await request(app).get('/auth/register');
      const csrfMatch    = completePage.text.match(/name="_csrf" value="([^"]+)"/);
      const csrfToken    = csrfMatch ? csrfMatch[1] : '';
      const cookie       = completePage.headers['set-cookie'];

      const res = await request(app)
        .post('/auth/discord/complete')
        .set('Cookie', cookie)
        .send(
          `_csrf=${encodeURIComponent(csrfToken)}` +
          '&nom=Test&prenom=User&pseudo=TU&email=test@test.com'
        );

      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/register');
    });
  });

  // ── Routes Paramètres ──────────────────────────────────────────────────

  describe('GET /admin/settings (sans authentification)', function () {
    it('doit rediriger vers /auth/login si non connecté', async function () {
      const res = await request(app).get('/admin/settings');
      expect(res.status).to.equal(302);
      expect(res.headers['location']).to.include('/auth/login');
    });
  });

});
