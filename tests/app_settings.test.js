'use strict';

/**
 * Tests unitaires - Modèle AppSettings
 * Vérifie la lecture, écriture et invalidation du cache des paramètres.
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };
dbModule.pool  = poolStub;

const AppSettings = require('../models/AppSettings');

// ─────────────────────────────────────────────────────────────────────────

describe('AppSettings Model', function () {

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
    AppSettings.clearCache(); // repart d'un cache vide avant chaque test
  });

  afterEach(function () {
    poolStub.execute.reset();
    AppSettings.clearCache();
  });

  // ── getAll ────────────────────────────────────────────────────────────────

  describe('getAll()', function () {

    it('doit retourner un objet vide si la table est vide', async function () {
      poolStub.execute.resolves([[]]);
      const settings = await AppSettings.getAll();
      expect(settings).to.deep.equal({});
    });

    it('doit retourner les paramètres sous forme d\'objet {cle: valeur}', async function () {
      poolStub.execute.resolves([[
        { cle: 'discord_enabled',   valeur: '1' },
        { cle: 'discord_bot_token', valeur: 'MTxxxxxx' },
      ]]);
      const settings = await AppSettings.getAll();
      expect(settings).to.deep.equal({
        discord_enabled:   '1',
        discord_bot_token: 'MTxxxxxx',
      });
    });

    it('doit mettre en cache les paramètres (2e appel sans requête BDD)', async function () {
      poolStub.execute.resolves([[
        { cle: 'discord_enabled', valeur: '0' },
      ]]);
      await AppSettings.getAll();
      await AppSettings.getAll();
      // La BDD n'est appelée qu'une seule fois (le 2e appel utilise le cache)
      expect(poolStub.execute.callCount).to.equal(1);
    });

    it('doit retourner un objet vide si la BDD lève une erreur (fallback silencieux)', async function () {
      poolStub.execute.rejects(new Error('Connexion BDD impossible'));
      const settings = await AppSettings.getAll();
      expect(settings).to.deep.equal({});
    });

  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get()', function () {

    it('doit retourner la valeur d\'une clé existante', async function () {
      poolStub.execute.resolves([[
        { cle: 'discord_enabled', valeur: '1' },
      ]]);
      const value = await AppSettings.get('discord_enabled');
      expect(value).to.equal('1');
    });

    it('doit retourner null si la clé n\'existe pas', async function () {
      poolStub.execute.resolves([[]]);
      const value = await AppSettings.get('cle_inexistante');
      expect(value).to.be.null;
    });

    it('doit retourner null si la valeur en BDD est NULL', async function () {
      poolStub.execute.resolves([[
        { cle: 'discord_bot_token', valeur: null },
      ]]);
      const value = await AppSettings.get('discord_bot_token');
      expect(value).to.be.null;
    });

  });

  // ── set ───────────────────────────────────────────────────────────────────

  describe('set()', function () {

    it('doit exécuter un INSERT ON DUPLICATE KEY UPDATE', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      await AppSettings.set('discord_enabled', '1');
      expect(poolStub.execute.calledOnce).to.be.true;
      const sql = poolStub.execute.firstCall.args[0];
      expect(sql).to.include('INSERT INTO');
      expect(sql).to.include('ON DUPLICATE KEY UPDATE');
      const params = poolStub.execute.firstCall.args[1];
      expect(params[0]).to.equal('discord_enabled');
      expect(params[1]).to.equal('1');
    });

    it('doit stocker null si la valeur est undefined', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      await AppSettings.set('discord_bot_token', undefined);
      const params = poolStub.execute.firstCall.args[1];
      expect(params[1]).to.be.null;
    });

    it('doit invalider le cache après la mise à jour', async function () {
      // 1er appel getAll() → remplit le cache
      poolStub.execute.onFirstCall().resolves([[{ cle: 'discord_enabled', valeur: '0' }]]);
      // Appel set() → INSERT (cache invalidé APRÈS)
      poolStub.execute.onSecondCall().resolves([{ affectedRows: 1 }]);
      // 3e appel getAll() → relit depuis la BDD car cache invalidé
      poolStub.execute.onThirdCall().resolves([[{ cle: 'discord_enabled', valeur: '1' }]]);

      await AppSettings.getAll();   // charge le cache
      await AppSettings.set('discord_enabled', '1'); // écriture BDD puis invalidation
      const settings = await AppSettings.getAll();   // relit depuis la BDD
      expect(settings.discord_enabled).to.equal('1');
      expect(poolStub.execute.callCount).to.equal(3);
    });

  });

  // ── setMultiple ───────────────────────────────────────────────────────────

  describe('setMultiple()', function () {

    it('doit exécuter autant de requêtes que de clés dans une transaction', async function () {
      // Simule une connexion de pool avec une transaction
      const connStub = {
        beginTransaction: sinon.stub().resolves(),
        execute:          sinon.stub().resolves([{ affectedRows: 1 }]),
        commit:           sinon.stub().resolves(),
        rollback:         sinon.stub().resolves(),
        release:          sinon.stub(),
      };
      poolStub.getConnection = sinon.stub().resolves(connStub);

      await AppSettings.setMultiple({
        discord_enabled:      '1',
        discord_bot_token:    'token123',
        discord_channel_news: '123456789012345678',
      });

      expect(connStub.beginTransaction.calledOnce).to.be.true;
      expect(connStub.execute.callCount).to.equal(3);
      expect(connStub.commit.calledOnce).to.be.true;
      expect(connStub.release.calledOnce).to.be.true;
    });

  });

  // ── clearCache ────────────────────────────────────────────────────────────

  describe('clearCache()', function () {

    it('doit forcer une nouvelle lecture BDD après invalidation', async function () {
      poolStub.execute.resolves([[{ cle: 'discord_enabled', valeur: '0' }]]);
      await AppSettings.getAll(); // charge le cache
      AppSettings.clearCache();   // invalide
      await AppSettings.getAll(); // doit relire
      expect(poolStub.execute.callCount).to.equal(2);
    });

  });

});
