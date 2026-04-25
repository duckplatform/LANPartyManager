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
        { id: 1, nom: 'LAN Spring', date_heure: new Date(), lieu: 'Paris', statut: 'planifie' },
        { id: 2, nom: 'LAN Summer', date_heure: new Date(), lieu: 'Lyon',  statut: 'termine'  },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Event.findAll();
      expect(result).to.deep.equal(fakeRows);
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('statut');
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner un événement si trouvé', async function () {
      const fakeEvent = { id: 1, nom: 'LAN Test', date_heure: new Date(), lieu: 'Paris', statut: 'planifie' };
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
    it('doit prioritiser l\'événement en_cours', async function () {
      const live = { id: 1, nom: 'LAN Live', date_heure: new Date(), lieu: 'Paris', statut: 'en_cours' };
      poolStub.execute.resolves([[live]]);

      const result = await Event.findActive();
      expect(result).to.deep.equal(live);
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('en_cours');
      expect(query).to.include('planifie');
    });

    it('doit retourner un événement planifie si aucun n\'est en_cours', async function () {
      const upcoming = { id: 2, nom: 'LAN Upcoming', date_heure: new Date(Date.now() + 86400000), lieu: 'Lyon', statut: 'planifie' };
      poolStub.execute.resolves([[upcoming]]);

      const result = await Event.findActive();
      expect(result).to.deep.equal(upcoming);
    });

    it('doit retourner null si aucun événement planifie ou en_cours', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Event.findActive();
      expect(result).to.be.null;
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer un événement et retourner son ID', async function () {
      poolStub.execute.resolves([{ insertId: 42 }]);

      const id = await Event.create({
        nom:        'LAN Hiver',
        date_heure: '2025-12-20 18:00:00',
        lieu:       'Salle des fêtes',
        statut:     'planifie',
      });

      expect(id).to.equal(42);
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('INSERT INTO events');
    });

    it('doit utiliser "planifie" par défaut si statut absent', async function () {
      poolStub.execute.resolves([{ insertId: 5 }]);

      await Event.create({
        nom:        'LAN Défaut',
        date_heure: '2025-01-01 10:00:00',
        lieu:       'Quelque part',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[4]).to.equal('planifie');
    });

    it('doit rejeter un statut invalide et utiliser "planifie"', async function () {
      poolStub.execute.resolves([{ insertId: 7 }]);

      await Event.create({
        nom:        'LAN Invalide',
        date_heure: '2025-01-01 10:00:00',
        lieu:       'Quelque part',
        statut:     'inexistant',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[4]).to.equal('planifie');
    });

    it('doit trim le nom et le lieu', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Event.create({ nom: '  LAN  ', date_heure: '2025-01-01', lieu: '  Paris  ' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal('LAN');
      expect(args[2]).to.equal('Paris');
    });

    it('doit stocker discord_channel_id quand il est fourni', async function () {
      poolStub.execute.resolves([{ insertId: 11 }]);

      await Event.create({
        nom: 'LAN Discord',
        date_heure: '2026-01-01 12:00:00',
        lieu: 'Paris',
        statut: 'planifie',
        discord_channel_id: '123456789012345678',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[3]).to.equal('123456789012345678');
    });

    it('doit normaliser discord_channel_id vide a null', async function () {
      poolStub.execute.resolves([{ insertId: 12 }]);

      await Event.create({
        nom: 'LAN Sans Canal',
        date_heure: '2026-01-01 12:00:00',
        lieu: 'Paris',
        statut: 'planifie',
        discord_channel_id: '   ',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[3]).to.equal(null);
    });

    it('doit refuser la creation d\'un 2e evenement en_cours', async function () {
      poolStub.execute.onFirstCall().resolves([[{ id: 99, nom: 'LAN Active' }]]);

      let thrown;
      try {
        await Event.create({
          nom: 'LAN Concurrent',
          date_heure: '2026-01-01 10:00:00',
          lieu: 'Paris',
          statut: 'en_cours',
        });
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.exist;
      expect(thrown.code).to.equal('EVENT_ACTIVE_CONFLICT');
      expect(poolStub.execute.callCount).to.equal(1);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', function () {
    it('doit retourner true si la mise à jour réussit', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);

      const result = await Event.update(1, {
        nom:        'LAN Modifié',
        date_heure: '2025-06-15 14:00:00',
        lieu:       'Lyon',
        statut:     'planifie',
      });
      expect(result).to.be.true;
      // Une seule requête UPDATE
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('UPDATE events');
      expect(query).to.include('discord_channel_id');
      expect(query).to.include('statut');
    });

    it('doit retourner false si aucune ligne affectée', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Event.update(999, { nom: 'X', date_heure: '2025-01-01', lieu: 'Y', statut: 'planifie', discord_channel_id: null });
      expect(result).to.be.false;
    });

    it('doit refuser de passer en_cours si un autre evenement est deja actif', async function () {
      poolStub.execute.onFirstCall().resolves([[{ id: 2, nom: 'LAN Déjà Active' }]]);

      let thrown;
      try {
        await Event.update(1, {
          nom: 'LAN A',
          date_heure: '2026-01-02 12:00:00',
          lieu: 'Lyon',
          statut: 'en_cours',
        });
      } catch (err) {
        thrown = err;
      }

      expect(thrown).to.exist;
      expect(thrown.code).to.equal('EVENT_ACTIVE_CONFLICT');
      expect(poolStub.execute.callCount).to.equal(1);
    });

    it('doit autoriser en_cours si aucun autre evenement n\'est actif', async function () {
      poolStub.execute.onFirstCall().resolves([[]]);
      poolStub.execute.onSecondCall().resolves([{ affectedRows: 1 }]);

      const result = await Event.update(1, {
        nom: 'LAN A',
        date_heure: '2026-01-02 12:00:00',
        lieu: 'Lyon',
        statut: 'en_cours',
      });

      expect(result).to.be.true;
      expect(poolStub.execute.callCount).to.equal(2);
    });

    it('doit trim discord_channel_id en mise a jour', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);

      await Event.update(1, {
        nom: 'LAN A',
        date_heure: '2026-01-02 12:00:00',
        lieu: 'Lyon',
        statut: 'planifie',
        discord_channel_id: ' 123456789012345678 ',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[3]).to.equal('123456789012345678');
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
