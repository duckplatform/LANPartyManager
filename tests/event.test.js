'use strict';

/**
 * Tests unitaires - Modèle Event
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const Event = require('../models/Event');

// ─────────────────────────────────────────────────────────────────────────

describe('Event Model', function () {

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findAll ──────────────────────────────────────────────────────────────

  describe('findAll()', function () {
    it('doit retourner tous les événements', async function () {
      const fakeRows = [
        { id: 1, nom: 'LAN Spring', date_heure: new Date(), lieu: 'Paris', actif: 1 },
        { id: 2, nom: 'LAN Summer', date_heure: new Date(), lieu: 'Lyon',  actif: 0 },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Event.findAll();
      expect(result).to.deep.equal(fakeRows);
      expect(poolStub.execute.calledOnce).to.be.true;
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner un événement si trouvé', async function () {
      const fakeEvent = { id: 1, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris', actif: 1 };
      poolStub.execute.resolves([[fakeEvent]]);

      const result = await Event.findById(1);
      expect(result).to.deep.equal(fakeEvent);
    });

    it('doit retourner null si événement introuvable', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Event.findById(999);
      expect(result).to.be.null;
    });
  });

  // ── findActive ────────────────────────────────────────────────────────────

  describe('findActive()', function () {
    it('doit retourner l\'événement actif', async function () {
      const fakeEvent = { id: 1, nom: 'LAN Active', date_heure: new Date(), lieu: 'Paris', actif: 1 };
      poolStub.execute.resolves([[fakeEvent]]);

      const result = await Event.findActive();
      expect(result).to.deep.equal(fakeEvent);
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('actif = 1');
    });

    it('doit retourner null si aucun événement actif', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Event.findActive();
      expect(result).to.be.null;
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer un événement et retourner son ID', async function () {
      // Stub pour UPDATE actif=0 + INSERT
      poolStub.execute.onFirstCall().resolves([{ affectedRows: 0 }]);
      poolStub.execute.onSecondCall().resolves([{ insertId: 42 }]);

      const id = await Event.create({
        nom:        'LAN Hiver',
        date_heure: '2025-12-20 18:00:00',
        lieu:       'Salle des fêtes',
        actif:      true,
      });

      expect(id).to.equal(42);
      // Vérifie que la désactivation des autres événements est faite en premier
      const firstQuery = poolStub.execute.firstCall.args[0];
      expect(firstQuery).to.include('UPDATE events SET actif = 0');
    });

    it('ne doit pas désactiver les autres si actif = false', async function () {
      poolStub.execute.resolves([{ insertId: 5 }]);

      await Event.create({
        nom:        'LAN Inactif',
        date_heure: '2025-01-01 10:00:00',
        lieu:       'Quelque part',
        actif:      false,
      });

      // Une seule requête : l'INSERT
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('INSERT INTO events');
    });

    it('doit trim le nom et le lieu', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Event.create({ nom: '  LAN  ', date_heure: '2025-01-01', lieu: '  Paris  ', actif: false });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal('LAN');
      expect(args[2]).to.equal('Paris');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', function () {
    it('doit retourner true si la mise à jour réussit', async function () {
      // UPDATE actif=0 + UPDATE événement
      poolStub.execute.onFirstCall().resolves([{ affectedRows: 1 }]);
      poolStub.execute.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await Event.update(1, {
        nom:        'LAN Modifié',
        date_heure: '2025-06-15 14:00:00',
        lieu:       'Lyon',
        actif:      true,
      });
      expect(result).to.be.true;
    });

    it('doit retourner false si aucune ligne affectée', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Event.update(999, { nom: 'X', date_heure: '2025-01-01', lieu: 'Y', actif: false });
      expect(result).to.be.false;
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si la suppression réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Event.delete(1);
      expect(result).to.be.true;
    });

    it('doit retourner false si événement introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Event.delete(999);
      expect(result).to.be.false;
    });
  });

  // ── count ─────────────────────────────────────────────────────────────────

  describe('count()', function () {
    it('doit retourner le nombre total d\'événements', async function () {
      poolStub.execute.resolves([[{ total: 7 }]]);
      const count = await Event.count();
      expect(count).to.equal(7);
    });
  });

});
