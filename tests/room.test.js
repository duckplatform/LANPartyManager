'use strict';

/**
 * Tests unitaires - Modèle Room
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const Room = require('../models/Room');

// ─────────────────────────────────────────────────────────────────────────

describe('Room Model', function () {

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findByEvent ──────────────────────────────────────────────────────────

  describe('findByEvent()', function () {
    it('doit retourner les salles d\'un événement', async function () {
      const fakeRows = [
        { id: 1, nom: 'Zelda',  type: 'console', type_rencontre: '1v1', actif: 1, event_id: 1, battles_actives: 0 },
        { id: 2, nom: 'Mario',  type: 'console', type_rencontre: '2v2', actif: 1, event_id: 1, battles_actives: 1 },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Room.findByEvent(1);
      expect(result).to.deep.equal(fakeRows);
      expect(poolStub.execute.calledOnce).to.be.true;

      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include("'planifie'");
    });
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner une salle si trouvée', async function () {
      const fakeRoom = { id: 1, nom: 'Zelda', type: 'console', type_rencontre: '1v1', actif: 1, event_id: 1 };
      poolStub.execute.resolves([[fakeRoom]]);

      const result = await Room.findById(1);
      expect(result).to.deep.equal(fakeRoom);
    });

    it('doit retourner null si salle introuvable', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Room.findById(999);
      expect(result).to.be.null;
    });
  });

  // ── findAvailable ─────────────────────────────────────────────────────────

  describe('findAvailable()', function () {
    it('doit retourner les salles disponibles', async function () {
      const fakeRows = [
        { id: 1, nom: 'Zelda', type: 'console', type_rencontre: '1v1', actif: 1 },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Room.findAvailable(1, '1v1');
      expect(result).to.deep.equal(fakeRows);
      const args = poolStub.execute.firstCall.args;
      expect(args[1][0]).to.equal(1);    // event_id
      expect(args[1][1]).to.equal('1v1'); // type_rencontre

      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include("'planifie'");
      expect(query).to.include("'en_attente'");
      expect(query).to.include("'en_cours'");
    });

    it('doit retourner un tableau vide si aucune salle disponible', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Room.findAvailable(1, '2v2');
      expect(result).to.be.an('array').that.is.empty;
    });
  });

  // ── generateName ─────────────────────────────────────────────────────────

  describe('generateName()', function () {
    it('doit retourner le premier nom de la liste si aucune salle existante', async function () {
      poolStub.execute.resolves([[]]); // aucune salle existante
      const name = await Room.generateName(1);
      expect(name).to.equal(Room.ROOM_NAMES[0]); // 'Zelda'
    });

    it('doit sauter les noms déjà utilisés', async function () {
      const usedNames = Room.ROOM_NAMES.slice(0, 3).map(nom => ({ nom }));
      poolStub.execute.resolves([usedNames]);
      const name = await Room.generateName(1);
      expect(name).to.equal(Room.ROOM_NAMES[3]); // 4ème nom
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer une salle et retourner son ID', async function () {
      // Premier appel pour generateName si nom non fourni — simulons un nom fourni directement
      poolStub.execute.resolves([{ insertId: 5 }]);

      const id = await Room.create({
        nom:            'Sonic',
        type:           'console',
        type_rencontre: '1v1',
        actif:          1,
        event_id:       1,
      });
      expect(id).to.equal(5);
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('INSERT INTO rooms');
    });

    it('doit utiliser "console" par défaut si type absent', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Room.create({ nom: 'Kirby', type_rencontre: '1v1', actif: 1, event_id: 1 });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[1]).to.equal('console'); // type
    });

    it('doit rejeter un type invalide et utiliser "console"', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Room.create({ nom: 'Kirby', type: 'arcade', type_rencontre: '1v1', actif: 1, event_id: 1 });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[1]).to.equal('console');
    });

    it('doit trim le nom', async function () {
      poolStub.execute.resolves([{ insertId: 1 }]);
      await Room.create({ nom: '  Kirby  ', type: 'console', type_rencontre: '1v1', actif: 1, event_id: 1 });
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal('Kirby');
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', function () {
    it('doit retourner true si mise à jour réussie', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Room.update(1, { nom: 'Sonic', type: 'console', type_rencontre: '1v1', actif: 1 });
      expect(result).to.be.true;
    });

    it('doit retourner false si salle introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Room.update(999, { nom: 'X', type: 'console', type_rencontre: '1v1', actif: 1 });
      expect(result).to.be.false;
    });
  });

  // ── setActif ──────────────────────────────────────────────────────────────

  describe('setActif()', function () {
    it('doit activer une salle', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Room.setActif(1, true);
      expect(result).to.be.true;
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal(1); // actif = 1
    });

    it('doit désactiver une salle', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Room.setActif(1, false);
      expect(result).to.be.true;
      const args = poolStub.execute.firstCall.args[1];
      expect(args[0]).to.equal(0); // actif = 0
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si suppression réussie', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Room.delete(1);
      expect(result).to.be.true;
    });

    it('doit retourner false si salle introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Room.delete(999);
      expect(result).to.be.false;
    });
  });

  // ── TYPES_SALLE / TYPES_RENCONTRE ─────────────────────────────────────────

  describe('Constantes', function () {
    it('TYPES_SALLE doit contenir console et simulation', function () {
      expect(Room.TYPES_SALLE).to.include('console');
      expect(Room.TYPES_SALLE).to.include('simulation');
    });

    it('TYPES_RENCONTRE doit contenir 1v1 et 2v2', function () {
      expect(Room.TYPES_RENCONTRE).to.include('1v1');
      expect(Room.TYPES_RENCONTRE).to.include('2v2');
    });

    it('ROOM_NAMES doit être un tableau non vide', function () {
      expect(Room.ROOM_NAMES).to.be.an('array').that.is.not.empty;
      expect(Room.ROOM_NAMES[0]).to.equal('Zelda');
    });
  });

});
