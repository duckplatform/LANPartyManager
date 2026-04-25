'use strict';

/**
 * Tests unitaires - Modèle EventRegistration
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const EventRegistration = require('../models/EventRegistration');

// ─────────────────────────────────────────────────────────────────────────

describe('EventRegistration Model', function () {

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findByEvent ───────────────────────────────────────────────────────────

  describe('findByEvent()', function () {
    it('doit retourner tous les inscrits d\'un événement', async function () {
      const fakeRows = [
        { id: 1, event_id: 10, user_id: 2, pseudo: 'Player1', nom: 'Doe', prenom: 'John', email: 'j@d.com', created_at: new Date() },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await EventRegistration.findByEvent(10);
      expect(result).to.deep.equal(fakeRows);
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal(10);
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser()', function () {
    it('doit retourner toutes les inscriptions d\'un utilisateur', async function () {
      const fakeRows = [
        { id: 1, event_id: 10, user_id: 5, nom: 'LAN Spring', date_heure: new Date(), lieu: 'Paris', statut: 'planifie', created_at: new Date() },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await EventRegistration.findByUser(5);
      expect(result).to.deep.equal(fakeRows);
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal(5);
      // Vérifie que la requête sélectionne statut et non actif
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('e.statut');
    });
  });

  // ── isRegistered ─────────────────────────────────────────────────────────

  describe('isRegistered()', function () {
    it('doit retourner true si l\'inscription existe', async function () {
      poolStub.execute.resolves([[{ id: 1 }]]);
      const result = await EventRegistration.isRegistered(10, 5);
      expect(result).to.be.true;
    });

    it('doit retourner false si l\'inscription n\'existe pas', async function () {
      poolStub.execute.resolves([[]]);
      const result = await EventRegistration.isRegistered(10, 5);
      expect(result).to.be.false;
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer une inscription et retourner son ID', async function () {
      poolStub.execute.resolves([{ insertId: 99 }]);
      const id = await EventRegistration.create(10, 5);
      expect(id).to.equal(99);
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal(10);
      expect(args[1]).to.equal(5);
    });


  });

  // ── findByEventAndUser ────────────────────────────────────────────────────

  describe('findByEventAndUser()', function () {
    it('doit retourner l\'inscription d\'un utilisateur pour un événement', async function () {
      const fakeReg = {
        id: 1, event_id: 10, user_id: 5,
        nom: 'LAN Spring', date_heure: new Date(), lieu: 'Paris', statut: 'planifie',
      };
      poolStub.execute.resolves([[fakeReg]]);

      const result = await EventRegistration.findByEventAndUser(10, 5);
      expect(result).to.deep.equal(fakeReg);
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal(10);
      expect(args[1]).to.equal(5);
    });

    it('doit retourner null si l\'inscription n\'existe pas', async function () {
      poolStub.execute.resolves([[]]);
      const result = await EventRegistration.findByEventAndUser(10, 99);
      expect(result).to.be.null;
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si la désinscription réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await EventRegistration.delete(10, 5);
      expect(result).to.be.true;
    });

    it('doit retourner false si l\'inscription n\'existe pas', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await EventRegistration.delete(10, 5);
      expect(result).to.be.false;
    });
  });

  // ── deleteById ────────────────────────────────────────────────────────────

  describe('deleteById()', function () {
    it('doit retourner true si la suppression réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await EventRegistration.deleteById(99);
      expect(result).to.be.true;
    });
  });

  // ── countByEvent ─────────────────────────────────────────────────────────

  describe('countByEvent()', function () {
    it('doit retourner le nombre d\'inscrits', async function () {
      poolStub.execute.resolves([[{ total: 12 }]]);
      const count = await EventRegistration.countByEvent(10);
      expect(count).to.equal(12);
    });
  });

  // ── isRegistrationOpen ────────────────────────────────────────────────────

  describe('isRegistrationOpen()', function () {
    it('doit retourner true si statut planifie et événement dans le futur', function () {
      const event = { statut: 'planifie', date_heure: new Date(Date.now() + 48 * 3600 * 1000) };
      expect(EventRegistration.isRegistrationOpen(event)).to.be.true;
    });

    it('doit retourner false si statut planifie mais date passée', function () {
      const event = { statut: 'planifie', date_heure: new Date(Date.now() - 1000) };
      expect(EventRegistration.isRegistrationOpen(event)).to.be.false;
    });

    it('doit retourner false si statut en_cours (même si date future)', function () {
      const event = { statut: 'en_cours', date_heure: new Date(Date.now() + 48 * 3600 * 1000) };
      expect(EventRegistration.isRegistrationOpen(event)).to.be.false;
    });

    it('doit retourner false si statut termine', function () {
      const event = { statut: 'termine', date_heure: new Date(Date.now() - 1000) };
      expect(EventRegistration.isRegistrationOpen(event)).to.be.false;
    });

    it('doit retourner false exactement à l\'heure de début (statut planifie)', function () {
      // now >= date_heure → false
      const event = { statut: 'planifie', date_heure: new Date(Date.now()) };
      expect(EventRegistration.isRegistrationOpen(event)).to.be.false;
    });
  });

});
