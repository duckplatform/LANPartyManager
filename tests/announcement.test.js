'use strict';

/**
 * Tests unitaires - Modèle Announcement
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const Announcement = require('../models/Announcement');

// ─────────────────────────────────────────────────────────────────────────

describe('Announcement Model', function () {

  // Réassigne notre stub avant chaque test (d'autres fichiers de test peuvent
  // avoir remplacé dbModule.pool entre deux suites de tests)
  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', function () {
    it('doit retourner toutes les annonces (sans filtre)', async function () {
      const fakeRows = [
        { id: 1, titre: 'Test 1', statut: 'publie',    created_at: new Date(), updated_at: new Date() },
        { id: 2, titre: 'Test 2', statut: 'brouillon', created_at: new Date(), updated_at: new Date() },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Announcement.findAll();
      expect(result).to.deep.equal(fakeRows);
      expect(poolStub.execute.calledOnce).to.be.true;
    });

    it('doit filtrer uniquement les publiées si onlyPublished=true', async function () {
      const fakeRows = [{ id: 1, titre: 'Publiée', statut: 'publie', created_at: new Date(), updated_at: new Date() }];
      poolStub.execute.resolves([fakeRows]);

      const result = await Announcement.findAll({ onlyPublished: true });
      expect(result).to.deep.equal(fakeRows);
      // Vérifie que la requête contient WHERE statut = 'publie'
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('publie');
    });
  });

  // ── findLatestPublished ──────────────────────────────────────────────────

  describe('findLatestPublished()', function () {
    it('doit retourner les N dernières annonces publiées', async function () {
      const fakeRows = [
        { id: 3, titre: 'Dernière', contenu: '## Hello 🎮', created_at: new Date() },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Announcement.findLatestPublished(3);
      expect(result).to.deep.equal(fakeRows);
      // Vérifie que la requête applique bien une limite numérique
      const sql = poolStub.execute.firstCall.args[0];
      expect(sql).to.include('LIMIT 3');
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner une annonce si trouvée', async function () {
      const fakeAnnouncement = { id: 5, titre: 'Mon annonce', contenu: 'Texte', statut: 'publie' };
      poolStub.execute.resolves([[fakeAnnouncement]]);

      const result = await Announcement.findById(5);
      expect(result).to.deep.equal(fakeAnnouncement);
      expect(poolStub.execute.calledOnce).to.be.true;
    });

    it('doit retourner null si annonce introuvable', async function () {
      poolStub.execute.resolves([[]]);

      const result = await Announcement.findById(999);
      expect(result).to.be.null;
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer une annonce et retourner son ID', async function () {
      poolStub.execute.resolves([{ insertId: 7 }]);

      const id = await Announcement.create({
        titre:   'Titre de test',
        contenu: '**Contenu** en Markdown',
        statut:  'publie',
      });

      expect(id).to.equal(7);
      expect(poolStub.execute.calledOnce).to.be.true;
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal('Titre de test');
      expect(callArgs[2]).to.equal('publie');
    });

    it('doit utiliser le statut "brouillon" par défaut', async function () {
      poolStub.execute.resolves([{ insertId: 8 }]);

      await Announcement.create({ titre: 'Test', contenu: 'Texte' });
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[2]).to.equal('brouillon');
    });

    it('doit trim le titre', async function () {
      poolStub.execute.resolves([{ insertId: 9 }]);
      await Announcement.create({ titre: '  Titre avec espaces  ', contenu: 'X' });
      const callArgs = poolStub.execute.firstCall.args[1];
      expect(callArgs[0]).to.equal('Titre avec espaces');
    });
  });

  // ── update ───────────────────────────────────────────────────────────────

  describe('update()', function () {
    it('doit retourner true si la mise à jour réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);

      const result = await Announcement.update(1, {
        titre:   'Nouveau titre',
        contenu: 'Nouveau contenu',
        statut:  'publie',
      });
      expect(result).to.be.true;
    });

    it('doit retourner false si aucune ligne affectée', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Announcement.update(999, { titre: 'X', contenu: 'Y', statut: 'brouillon' });
      expect(result).to.be.false;
    });
  });

  // ── delete ───────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si la suppression réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Announcement.delete(1);
      expect(result).to.be.true;
    });

    it('doit retourner false si annonce introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Announcement.delete(999);
      expect(result).to.be.false;
    });
  });

  // ── count ────────────────────────────────────────────────────────────────

  describe('count()', function () {
    it('doit retourner le nombre total d\'annonces', async function () {
      poolStub.execute.resolves([[{ total: 15 }]]);
      const count = await Announcement.count();
      expect(count).to.equal(15);
    });
  });

  // ── countPublished ───────────────────────────────────────────────────────

  describe('countPublished()', function () {
    it('doit retourner le nombre d\'annonces publiées', async function () {
      poolStub.execute.resolves([[{ total: 8 }]]);
      const count = await Announcement.countPublished();
      expect(count).to.equal(8);
    });
  });

});
