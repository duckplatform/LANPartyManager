'use strict';

/**
 * Tests unitaires - Modèle Game
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const Game = require('../models/Game');

// ─────────────────────────────────────────────────────────────────────────

describe('Game Model', function () {

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', function () {
    it('doit retourner tous les jeux', async function () {
      const fakeRows = [
        { id: 1, nom: 'Street Fighter 6', console: 'PS5', type_rencontre: '1v1' },
        { id: 2, nom: 'Rocket League',    console: 'PC',  type_rencontre: '2v2' },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Game.findAll();
      expect(result).to.deep.equal(fakeRows);
      expect(poolStub.execute.calledOnce).to.be.true;
    });

    it('doit retourner un tableau vide si aucun jeu', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Game.findAll();
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner un jeu si trouvé', async function () {
      const fakeGame = { id: 1, nom: 'Tekken 8', console: 'PS5', type_rencontre: '1v1' };
      poolStub.execute.resolves([[fakeGame]]);

      const result = await Game.findById(1);
      expect(result).to.deep.equal(fakeGame);
    });

    it('doit retourner null si jeu introuvable', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Game.findById(999);
      expect(result).to.be.null;
    });
  });

  // ── findByType ───────────────────────────────────────────────────────────

  describe('findByType()', function () {
    it('doit filtrer les jeux par type de rencontre', async function () {
      const fakeRows = [
        { id: 1, nom: 'Street Fighter 6', console: 'PS5', type_rencontre: '1v1' },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Game.findByType('1v1');
      expect(result).to.deep.equal(fakeRows);
      const args = poolStub.execute.firstCall.args;
      expect(args[1][0]).to.equal('1v1');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer un jeu et retourner son ID', async function () {
      poolStub.execute.resolves([{ insertId: 10 }]);

      const id = await Game.create({ nom: 'Tekken 8', console: 'PS5', type_rencontre: '1v1' });
      expect(id).to.equal(10);
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('INSERT INTO games');
    });

    it('doit utiliser "1v1" par défaut si type_rencontre absent', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Game.create({ nom: 'SF6', console: 'PC' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[2]).to.equal('1v1');
    });

    it('doit rejeter un type_rencontre invalide et utiliser "1v1"', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Game.create({ nom: 'SF6', console: 'PC', type_rencontre: 'invalid' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[2]).to.equal('1v1');
    });

    it('doit accepter "2v2" comme type_rencontre', async function () {
      poolStub.execute.resolves([{ insertId: 2 }]);
      await Game.create({ nom: 'Rocket League', console: 'PC', type_rencontre: '2v2' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[2]).to.equal('2v2');
    });

    it('doit accepter "solo" comme type_rencontre', async function () {
      poolStub.execute.resolves([{ insertId: 3 }]);
      await Game.create({ nom: 'Tetris Sprint', console: 'PC', type_rencontre: 'solo' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[2]).to.equal('solo');
    });

    it('doit trim le nom et la console', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Game.create({ nom: '  SF6  ', console: '  PS5  ', type_rencontre: '1v1' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal('SF6');
      expect(args[1]).to.equal('PS5');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', function () {
    it('doit retourner true si la mise à jour réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Game.update(1, { nom: 'SF6', console: 'PS5', type_rencontre: '1v1' });
      expect(result).to.be.true;
    });

    it('doit retourner false si aucune ligne affectée', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Game.update(999, { nom: 'X', console: 'Y', type_rencontre: '1v1' });
      expect(result).to.be.false;
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si la suppression réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Game.delete(1);
      expect(result).to.be.true;
    });

    it('doit retourner false si jeu introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Game.delete(999);
      expect(result).to.be.false;
    });
  });

  // ── count ─────────────────────────────────────────────────────────────────

  describe('count()', function () {
    it('doit retourner le nombre total de jeux', async function () {
      poolStub.execute.resolves([[{ total: 5 }]]);
      const count = await Game.count();
      expect(count).to.equal(5);
    });
  });

  // ── TYPES_RENCONTRE ───────────────────────────────────────────────────────

  describe('TYPES_RENCONTRE', function () {
    it('doit contenir 1v1, 2v2 et solo', function () {
      expect(Game.TYPES_RENCONTRE).to.include('1v1');
      expect(Game.TYPES_RENCONTRE).to.include('2v2');
      expect(Game.TYPES_RENCONTRE).to.include('solo');
    });
  });

});
