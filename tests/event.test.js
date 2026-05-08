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
        { id: 1, name: 'LAN Spring', start_at: new Date(), location: 'Paris', status: 'planned' },
        { id: 2, name: 'LAN Summer', start_at: new Date(), location: 'Lyon',  status: 'ended'  },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Event.findAll();
      expect(result).to.deep.equal(fakeRows);
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('status');
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner un événement si trouvé', async function () {
      const fakeEvent = { id: 1, name: 'LAN Test', start_at: new Date(), location: 'Paris', status: 'planned' };
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
      const live = { id: 1, name: 'LAN Live', start_at: new Date(), location: 'Paris', status: 'in_progress' };
      poolStub.execute.resolves([[live]]);

      const result = await Event.findActive();
      expect(result).to.deep.equal(live);
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('in_progress');
      expect(query).to.include('planned');
    });

    it('doit retourner un événement planifie si aucun n\'est en_cours', async function () {
      const upcoming = { id: 2, name: 'LAN Upcoming', start_at: new Date(Date.now() + 86400000), location: 'Lyon', status: 'planned' };
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
        name:             'LAN Hiver',
        start_at: '2025-12-20 18:00:00',
        location:       'Salle des fêtes',
        status:     'planned',
      });

      expect(id).to.equal(42);
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('INSERT INTO events');
    });

    it('doit utiliser "planned" par défaut si status absent', async function () {
      poolStub.execute.resolves([{ insertId: 5 }]);

      await Event.create({
        name:             'LAN Défaut',
        start_at: '2025-01-01 10:00:00',
        location:       'Quelque part',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[4]).to.equal('planned');
    });

    it('doit rejeter un status invalide et utiliser "planned"', async function () {
      poolStub.execute.resolves([{ insertId: 7 }]);

      await Event.create({
        name:             'LAN Invalide',
        start_at: '2025-01-01 10:00:00',
        location:       'Quelque part',
        status:     'inexistant',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[4]).to.equal('planned');
    });

    it('doit trim le nom et le lieu', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Event.create({ name: '  LAN  ', start_at: '2025-01-01', location: '  Paris  ' });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal('LAN');
      expect(args[2]).to.equal('Paris');
    });

    it('doit stocker discord_channel_id quand il est fourni', async function () {
      poolStub.execute.resolves([{ insertId: 11 }]);

      await Event.create({
        name: 'LAN Discord',
        start_at: '2026-01-01 12:00:00',
        location: 'Paris',
        status: 'planned',
        discord_channel_id: '123456789012345678',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[3]).to.equal('123456789012345678');
    });

    it('doit normaliser discord_channel_id vide a null', async function () {
      poolStub.execute.resolves([{ insertId: 12 }]);

      await Event.create({
        name: 'LAN Sans Canal',
        start_at: '2026-01-01 12:00:00',
        location: 'Paris',
        status: 'planned',
        discord_channel_id: '   ',
      });

      const args = poolStub.execute.firstCall.args[1];
      expect(args[3]).to.equal(null);
    });

    it('doit refuser la creation d\'un 2e evenement en_cours', async function () {
      poolStub.execute.onFirstCall().resolves([[{ id: 99, name: 'LAN Active' }]]);

      let thrown;
      try {
        await Event.create({
          name: 'LAN Concurrent',
          start_at: '2026-01-01 10:00:00',
          location: 'Paris',
          status: 'in_progress',
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
        name:             'LAN Modifié',
        start_at: '2025-06-15 14:00:00',
        location:       'Lyon',
        status:     'planned',
      });
      expect(result).to.be.true;
      // Une seule requête UPDATE
      expect(poolStub.execute.calledOnce).to.be.true;
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('UPDATE events');
      expect(query).to.include('discord_channel_id');
      expect(query).to.include('status');
    });

    it('doit retourner false si aucune ligne affectée', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Event.update(999, { name: 'X', start_at: '2025-01-01', location: 'Y', status: 'planned', discord_channel_id: null });
      expect(result).to.be.false;
    });

    it('doit refuser de passer en_cours si un autre evenement est deja actif', async function () {
      poolStub.execute.onFirstCall().resolves([[{ id: 2, name: 'LAN Déjà Active' }]]);

      let thrown;
      try {
        await Event.update(1, {
          name: 'LAN A',
          start_at: '2026-01-02 12:00:00',
          location: 'Lyon',
          status: 'in_progress',
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
        name: 'LAN A',
        start_at: '2026-01-02 12:00:00',
        location: 'Lyon',
        status: 'in_progress',
      });

      expect(result).to.be.true;
      expect(poolStub.execute.callCount).to.equal(2);
    });

    it('doit trim discord_channel_id en mise a jour', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);

      await Event.update(1, {
        name: 'LAN A',
        start_at: '2026-01-02 12:00:00',
        location: 'Lyon',
        status: 'planned',
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
