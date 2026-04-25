'use strict';

/**
 * Tests unitaires - Modèle Battle
 * Utilise des stubs Sinon pour éviter les appels réels à la base de données
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const Battle = require('../models/Battle');

// ─────────────────────────────────────────────────────────────────────────

describe('Battle Model', function () {

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  // ── findById ─────────────────────────────────────────────────────────────

  describe('findById()', function () {
    it('doit retourner une battle avec ses joueurs', async function () {
      const fakeBattle = {
        id: 1, event_id: 1, game_id: 1, room_id: null, statut: 'file_attente',
        score: null, notes: null, created_at: new Date(), updated_at: new Date(),
        game_nom: 'SF6', game_console: 'PS5', type_rencontre: '1v1', room_nom: null, room_type: null,
      };
      const fakePlayers = [
        { id: 1, battle_id: 1, user_id: 10, equipe: 1, est_gagnant: 0, pseudo: 'Player1', nom: 'Dupont', prenom: 'Jean' },
        { id: 2, battle_id: 1, user_id: 11, equipe: 2, est_gagnant: 0, pseudo: 'Player2', nom: 'Martin', prenom: 'Luc' },
      ];

      poolStub.execute.onFirstCall().resolves([[fakeBattle]]);  // battle query
      poolStub.execute.onSecondCall().resolves([fakePlayers]);  // players query

      const result = await Battle.findById(1);
      expect(result).to.not.be.null;
      expect(result.id).to.equal(1);
      expect(result.players).to.deep.equal(fakePlayers);
    });

    it('doit retourner null si battle introuvable', async function () {
      poolStub.execute.resolves([[]]);
      const result = await Battle.findById(999);
      expect(result).to.be.null;
    });
  });

  // ── findPlayers ──────────────────────────────────────────────────────────

  describe('findPlayers()', function () {
    it('doit retourner les joueurs d\'une battle', async function () {
      const fakePlayers = [
        { id: 1, battle_id: 1, user_id: 10, equipe: 1, est_gagnant: 0, pseudo: 'P1', nom: 'A', prenom: 'B' },
      ];
      poolStub.execute.resolves([fakePlayers]);

      const result = await Battle.findPlayers(1);
      expect(result).to.deep.equal(fakePlayers);
    });
  });

  // ── create ───────────────────────────────────────────────────────────────

  describe('create()', function () {
    it('doit créer une battle, ajouter des joueurs et tenter d\'assigner une salle', async function () {
      // INSERT battle → insertId = 42
      poolStub.execute.onCall(0).resolves([{ insertId: 42 }]);
      // INSERT player 1
      poolStub.execute.onCall(1).resolves([{ insertId: 1 }]);
      // INSERT player 2
      poolStub.execute.onCall(2).resolves([{ insertId: 2 }]);
      // assignRoomIfAvailable → SELECT battle (file_attente)
      poolStub.execute.onCall(3).resolves([[{ statut: 'file_attente', type_rencontre: '1v1' }]]);
      // assignRoomIfAvailable → SELECT rooms (aucune salle dispo)
      poolStub.execute.onCall(4).resolves([[]]);

      const players = [
        { user_id: 10, equipe: 1 },
        { user_id: 11, equipe: 2 },
      ];

      const id = await Battle.create({ event_id: 1, game_id: 1, notes: null }, players);
      expect(id).to.equal(42);

      // Vérifie la requête INSERT battle
      const insertQuery = poolStub.execute.getCall(0).args[0];
      expect(insertQuery).to.include('INSERT INTO battles');
    });

    it('doit assigner une salle si disponible lors de la création', async function () {
      // INSERT battle
      poolStub.execute.onCall(0).resolves([{ insertId: 1 }]);
      // INSERT player 1
      poolStub.execute.onCall(1).resolves([{ insertId: 1 }]);
      // INSERT player 2
      poolStub.execute.onCall(2).resolves([{ insertId: 2 }]);
      // assignRoomIfAvailable → statut file_attente
      poolStub.execute.onCall(3).resolves([[{ statut: 'file_attente', type_rencontre: '1v1' }]]);
      // assignRoomIfAvailable → salle dispo
      poolStub.execute.onCall(4).resolves([[{ id: 5 }]]);
      // UPDATE battle statut → planifie
      poolStub.execute.onCall(5).resolves([{ affectedRows: 1 }]);

      const players = [{ user_id: 10, equipe: 1 }, { user_id: 11, equipe: 2 }];
      const id = await Battle.create({ event_id: 1, game_id: 1 }, players);
      expect(id).to.equal(1);

      // Vérifie que l'UPDATE a été appelé (assignation de salle)
      const updateCall = poolStub.execute.getCall(5);
      expect(updateCall.args[0]).to.include('UPDATE battles');
      expect(updateCall.args[0]).to.include('planifie');
    });
  });

  // ── assignRoomIfAvailable ────────────────────────────────────────────────

  describe('assignRoomIfAvailable()', function () {
    it('doit retourner false si la battle n\'est pas en file_attente', async function () {
      poolStub.execute.resolves([[{ statut: 'en_cours', type_rencontre: '1v1' }]]);
      const result = await Battle.assignRoomIfAvailable(1, 1, 1);
      expect(result).to.be.false;
    });

    it('doit retourner false si aucune salle disponible', async function () {
      poolStub.execute.onFirstCall().resolves([[{ statut: 'file_attente', type_rencontre: '1v1' }]]);
      poolStub.execute.onSecondCall().resolves([[]]);
      const result = await Battle.assignRoomIfAvailable(1, 1, 1);
      expect(result).to.be.false;
    });

    it('doit retourner true et mettre à jour si une salle est disponible', async function () {
      poolStub.execute.onFirstCall().resolves([[{ statut: 'file_attente', type_rencontre: '1v1' }]]);
      poolStub.execute.onSecondCall().resolves([[{ id: 3 }]]);
      poolStub.execute.onThirdCall().resolves([{ affectedRows: 1 }]);
      const result = await Battle.assignRoomIfAvailable(1, 1, 1);
      expect(result).to.be.true;
    });

    it('doit considérer une salle planifiée comme non disponible', async function () {
      poolStub.execute.onFirstCall().resolves([[{ statut: 'file_attente', type_rencontre: '1v1' }]]);
      poolStub.execute.onSecondCall().resolves([[]]);

      await Battle.assignRoomIfAvailable(1, 1, 1);

      const roomsQuery = poolStub.execute.getCall(1).args[0];
      expect(roomsQuery).to.include("'planifie'");
      expect(roomsQuery).to.include("'en_attente'");
      expect(roomsQuery).to.include("'en_cours'");
    });
  });

  // ── changeStatut ─────────────────────────────────────────────────────────

  describe('changeStatut()', function () {
    it('doit retourner true si changement réussi', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Battle.changeStatut(1, 'en_cours', 1);
      expect(result).to.be.true;
    });

    it('doit retourner false si statut invalide', async function () {
      const result = await Battle.changeStatut(1, 'inexistant', 1);
      expect(result).to.be.false;
      expect(poolStub.execute.called).to.be.false;
    });

    it('doit appeler reevaluateQueue quand la battle se termine', async function () {
      // UPDATE battle
      poolStub.execute.onCall(0).resolves([{ affectedRows: 1 }]);
      // reevaluateQueue → SELECT battles en file_attente
      poolStub.execute.onCall(1).resolves([[]]); // aucune en file_attente

      const result = await Battle.changeStatut(1, 'termine', 1);
      expect(result).to.be.true;
      expect(poolStub.execute.callCount).to.be.at.least(2);
    });

    it('ne doit pas appeler reevaluateQueue si statut n\'est pas "termine"', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      await Battle.changeStatut(1, 'en_cours', 1);
      // Une seule requête (UPDATE)
      expect(poolStub.execute.callCount).to.equal(1);
    });
  });

  // ── setResult ────────────────────────────────────────────────────────────

  describe('setResult()', function () {
    it('doit enregistrer le résultat et marquer les gagnants', async function () {
      // UPDATE battle (score + statut)
      poolStub.execute.onCall(0).resolves([{ affectedRows: 1 }]);
      // RESET gagnants
      poolStub.execute.onCall(1).resolves([{ affectedRows: 2 }]);
      // UPDATE gagnant #10
      poolStub.execute.onCall(2).resolves([{ affectedRows: 1 }]);
      // reevaluateQueue → SELECT battles file_attente
      poolStub.execute.onCall(3).resolves([[]]); // aucune en file_attente

      const result = await Battle.setResult(1, '3-1', [10], 1);
      expect(result).to.be.true;

      // Vérifie UPDATE score
      const scoreQuery = poolStub.execute.getCall(0).args;
      expect(scoreQuery[0]).to.include('UPDATE battles');
      expect(scoreQuery[1][0]).to.equal('3-1');
    });

    it('doit retourner false si la battle est introuvable', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Battle.setResult(999, '3-1', [10], 1);
      expect(result).to.be.false;
    });
  });

  // ── delete ────────────────────────────────────────────────────────────────

  describe('delete()', function () {
    it('doit retourner true si suppression réussie (battle en file_attente)', async function () {
      poolStub.execute.resolves([{ affectedRows: 1 }]);
      const result = await Battle.delete(1);
      expect(result).to.be.true;
    });

    it('doit retourner false si battle en cours (non supprimable)', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      const result = await Battle.delete(1);
      expect(result).to.be.false;
    });

    it('doit utiliser la contrainte statut IN (file_attente, planifie)', async function () {
      poolStub.execute.resolves([{ affectedRows: 0 }]);
      await Battle.delete(1);
      const query = poolStub.execute.firstCall.args[0];
      expect(query).to.include('file_attente');
      expect(query).to.include('planifie');
    });
  });

  // ── countByStatut ─────────────────────────────────────────────────────────

  describe('countByStatut()', function () {
    it('doit retourner les compteurs par statut', async function () {
      const fakeRows = [
        { statut: 'file_attente', total: 2 },
        { statut: 'planifie',     total: 1 },
        { statut: 'en_cours',     total: 3 },
      ];
      poolStub.execute.resolves([fakeRows]);

      const result = await Battle.countByStatut(1);
      expect(result.file_attente).to.equal(2);
      expect(result.planifie).to.equal(1);
      expect(result.en_cours).to.equal(3);
      expect(result.en_attente).to.equal(0);  // non présent → défaut 0
      expect(result.termine).to.equal(0);
    });
  });

  // ── STATUTS_VALIDES ───────────────────────────────────────────────────────

  describe('STATUTS_VALIDES', function () {
    it('doit contenir tous les statuts attendus', function () {
      expect(Battle.STATUTS_VALIDES).to.include('file_attente');
      expect(Battle.STATUTS_VALIDES).to.include('planifie');
      expect(Battle.STATUTS_VALIDES).to.include('en_attente');
      expect(Battle.STATUTS_VALIDES).to.include('en_cours');
      expect(Battle.STATUTS_VALIDES).to.include('termine');
    });
  });

});
