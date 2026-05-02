'use strict';

/**
 * Tests unitaires - Modèle Utilisateur
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');
const bcrypt     = require('bcryptjs');

// ── Stub du pool de base de données ───────────────────────────────────────

// On remplace le pool de connexion avant de charger le modèle User
const poolStub = { execute: sinon.stub() };
const dbModule = require('../config/database');
// Remplacement direct (compatible avec toutes versions de sinon)
const originalPool = dbModule.pool;
dbModule.pool = poolStub;

const User = require('../models/User');

// ─────────────────────────────────────────────────────────────────────────

describe('User Model', function () {

  // Réassigne notre stub avant chaque test (d'autres fichiers de test peuvent
  // avoir remplacé dbModule.pool entre deux suites de tests)
  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findById ────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner un utilisateur si trouvé', async function () {
      const fakeUser = { id: 1, nom: 'Dupont', prenom: 'Jean', pseudo: 'JD', email: 'jean@test.com', is_admin: 0 };
      poolStub.execute.resolves([[fakeUser]]);

      const result = await User.findById(1);
      expect(result).to.deep.equal(fakeUser);
      expect(poolStub.execute.calledOnce).to.be.true;
    });

    it('doit retourner null si aucun utilisateur trouvé', async function () {
      poolStub.execute.resolves([[]]);
      const result = await User.findById(999);
      expect(result).to.be.null;
    });
  });

  // ── findByEmail ─────────────────────────────────────────────────────────

  describe('findByEmail()', function () {
    it('doit retourner l\'utilisateur correspondant à l\'email', async function () {
      const fakeUser = { id: 2, email: 'test@example.com', pseudo: 'Tester' };
      poolStub.execute.resolves([[fakeUser]]);

      const result = await User.findByEmail('TEST@EXAMPLE.COM'); // Test normalisation
      expect(result).to.deep.equal(fakeUser);
      // Vérifie que l'email est passé en minuscules
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal('test@example.com');
    });

    it('doit retourner null si email introuvable', async function () {
      poolStub.execute.resolves([[]]);
      const result = await User.findByEmail('unknown@test.com');
      expect(result).to.be.null;
    });
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer un utilisateur et retourner son ID', async function () {
      poolStub.execute.resolves([{ insertId: 42 }]);

      const id = await User.create({
        nom:      'Martin',
        prenom:   'Alice',
        pseudo:   'Alicat',
        email:    'alice@test.com',
        password: 'Password1',
      });

      expect(id).to.equal(42);
      expect(poolStub.execute.calledOnce).to.be.true;

      // Vérifie que le mot de passe est haché (ne doit pas être en clair)
      const callArgs = poolStub.execute.firstCall.args[1];
      const storedPassword = callArgs[4];
      expect(storedPassword).to.not.equal('Password1');
      expect(storedPassword).to.match(/^\$2[ab]\$\d+\$/); // Pattern bcrypt
      expect(callArgs[7]).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('doit mettre is_admin à 0 par défaut', async function () {
      poolStub.execute.resolves([{ insertId: 5 }]);
      await User.create({ nom: 'X', prenom: 'Y', pseudo: 'Z', email: 'z@test.com', password: 'Pass1234' });
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[5]).to.equal(0); // is_admin = 0
      expect(callArgs[6]).to.equal(0); // is_moderator = 0
    });

    it('doit permettre de créer un admin', async function () {
      poolStub.execute.resolves([{ insertId: 10 }]);
      await User.create({ nom: 'Admin', prenom: 'Super', pseudo: 'SA', email: 'admin@test.com', password: 'Pass1234', is_admin: true });
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[5]).to.equal(1); // is_admin = 1
    });
  });

  // ── verifyPassword ──────────────────────────────────────────────────────

  describe('verifyPassword()', function () {
    it('doit valider un mot de passe correct', async function () {
      const hash   = await bcrypt.hash('TestPassword1', 10);
      const result = await User.verifyPassword('TestPassword1', hash);
      expect(result).to.be.true;
    });

    it('doit rejeter un mot de passe incorrect', async function () {
      const hash   = await bcrypt.hash('TestPassword1', 10);
      const result = await User.verifyPassword('WrongPassword', hash);
      expect(result).to.be.false;
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update()', function () {
    it('doit retourner true si la mise à jour réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await User.update(1, { nom: 'Nouveau', prenom: 'Test', pseudo: 'NT', email: 'nt@test.com' });
      expect(result).to.be.true;
    });

    it('doit retourner false si aucune ligne affectée', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await User.update(999, { nom: 'X', prenom: 'Y', pseudo: 'Z', email: 'z@test.com' });
      expect(result).to.be.false;
    });
  });

  // ── delete ──────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si la suppression réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await User.delete(1);
      expect(result).to.be.true;
    });
  });

  // ── emailExists ─────────────────────────────────────────────────────────

  describe('emailExists()', function () {
    it('doit retourner true si l\'email existe', async function () {
      poolStub.execute.resolves([[{ id: 1 }]]);
      const result = await User.emailExists('existing@test.com');
      expect(result).to.be.true;
    });

    it('doit retourner false si l\'email n\'existe pas', async function () {
      poolStub.execute.resolves([[]]);
      const result = await User.emailExists('new@test.com');
      expect(result).to.be.false;
    });
  });

  // ── setAdmin ────────────────────────────────────────────────────────────

  describe('setAdmin()', function () {
    it('doit mettre à jour le statut admin', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await User.setAdmin(1, true);
      expect(result).to.be.true;
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal(1); // is_admin = 1
    });
  });

  // ── setModerator ────────────────────────────────────────────────────────

  describe('setModerator()', function () {
    it('doit accorder le rôle modérateur', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await User.setModerator(2, true);
      expect(result).to.be.true;
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal(1); // is_moderator = 1
      expect(callArgs[1]).to.equal(2); // user id = 2
    });

    it('doit retirer le rôle modérateur', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await User.setModerator(2, false);
      expect(result).to.be.true;
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal(0); // is_moderator = 0
    });
  });

  // ── count ───────────────────────────────────────────────────────────────

  describe('count()', function () {
    it('doit retourner le nombre total d\'utilisateurs', async function () {
      poolStub.execute.resolves([[{ total: 42 }]]);
      const count = await User.count();
      expect(count).to.equal(42);
    });
  });

  // ── findByDiscordId ─────────────────────────────────────────────────────

  describe('findByDiscordId()', function () {
    it('doit retourner l\'utilisateur correspondant à l\'ID Discord', async function () {
      const fakeUser = { id: 3, pseudo: 'DiscordUser', discord_user_id: '123456789012345678' };
      poolStub.execute.resolves([[fakeUser]]);

      const result = await User.findByDiscordId('123456789012345678');
      expect(result).to.deep.equal(fakeUser);
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal('123456789012345678');
    });

    it('doit retourner null si l\'ID Discord est introuvable', async function () {
      poolStub.execute.resolves([[]]);
      const result = await User.findByDiscordId('000000000000000000');
      expect(result).to.be.null;
    });
  });

  // ── createFromDiscord ───────────────────────────────────────────────────

  describe('createFromDiscord()', function () {
    it('doit créer un utilisateur Discord et retourner son ID', async function () {
      poolStub.execute.resolves([{ insertId: 99 }]);

      const id = await User.createFromDiscord({
        nom:       'Dupont',
        prenom:    'Jean',
        pseudo:    'JD',
        email:     'jean@discord.com',
        discordId: '123456789012345678',
      });

      expect(id).to.equal(99);
      expect(poolStub.execute.calledOnce).to.be.true;

      const callArgs = poolStub.execute.firstCall.args[1];
      // Ordre : [nom, prenom, pseudo, email, hashedPassword, badgeToken, discordId]
      expect(callArgs[0]).to.equal('Dupont');
      expect(callArgs[3]).to.equal('jean@discord.com');
      // mot de passe hashé bcrypt (index 4)
      expect(callArgs[4]).to.match(/^\$2[ab]\$\d+\$/);
      // badge_token est un UUID (index 5)
      expect(callArgs[5]).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      // discord_user_id (index 6)
      expect(callArgs[6]).to.equal('123456789012345678');
    });
  });

  // ── linkDiscord ─────────────────────────────────────────────────────────

  describe('linkDiscord()', function () {
    it('doit retourner true si la liaison réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await User.linkDiscord(5, '123456789012345678');
      expect(result).to.be.true;
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal('123456789012345678');
      expect(callArgs[1]).to.equal(5);
    });

    it('doit retourner false si utilisateur introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await User.linkDiscord(999, '123456789012345678');
      expect(result).to.be.false;
    });
  });

  // ── verifyPassword avec null ─────────────────────────────────────────────

  describe('verifyPassword() avec mot de passe null (compte Discord)', function () {
    it('doit retourner false si le hash est null', async function () {
      const result = await User.verifyPassword('anypassword', null);
      expect(result).to.be.false;
    });

    it('doit retourner false si le hash est une chaîne vide', async function () {
      const result = await User.verifyPassword('anypassword', '');
      expect(result).to.be.false;
    });
  });

});
