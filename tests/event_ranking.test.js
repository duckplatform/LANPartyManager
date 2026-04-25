'use strict';

/**
 * Tests unitaires - Modele EventRanking
 */

const { expect } = require('chai');
const sinon = require('sinon');

const dbModule = require('../config/database');
const EventRanking = require('../models/EventRanking');

describe('EventRanking Model', function () {
  let executeStub;
  let connection;

  beforeEach(function () {
    executeStub = sinon.stub();
    connection = {
      beginTransaction: sinon.stub().resolves(),
      execute: sinon.stub().resolves([[]]),
      commit: sinon.stub().resolves(),
      rollback: sinon.stub().resolves(),
      release: sinon.stub(),
    };

    dbModule.pool = {
      execute: executeStub,
      getConnection: sinon.stub().resolves(connection),
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('pointsForType()', function () {
    it('retourne le bon bareme selon le type', function () {
      expect(EventRanking.pointsForType('solo')).to.equal(1);
      expect(EventRanking.pointsForType('1v1')).to.equal(2);
      expect(EventRanking.pointsForType('2v2')).to.equal(3);
      expect(EventRanking.pointsForType('invalide')).to.equal(0);
    });
  });

  describe('recalculateForEvent()', function () {
    it('recalcule le classement dans une transaction', async function () {
      await EventRanking.recalculateForEvent(42);

      expect(connection.beginTransaction.calledOnce).to.be.true;
      expect(connection.execute.callCount).to.equal(2);
      expect(connection.execute.firstCall.args[0]).to.include('DELETE FROM event_rankings');
      expect(connection.execute.secondCall.args[0]).to.include('INSERT INTO event_rankings');
      expect(connection.commit.calledOnce).to.be.true;
      expect(connection.release.calledOnce).to.be.true;
      expect(connection.rollback.notCalled).to.be.true;
    });

    it('rollback en cas d erreur SQL', async function () {
      connection.execute.onSecondCall().rejects(new Error('boom'));

      try {
        await EventRanking.recalculateForEvent(42);
        throw new Error('should fail');
      } catch (err) {
        expect(err.message).to.equal('boom');
      }

      expect(connection.rollback.calledOnce).to.be.true;
      expect(connection.release.calledOnce).to.be.true;
    });
  });

  describe('findByEvent()', function () {
    it('retourne le classement ordonne avec un rang calcule', async function () {
      executeStub.resolves([[
        { event_id: 1, user_id: 9, points: 8, wins: 3, battles_played: 4, pseudo: 'Alpha', discord_user_id: null },
        { event_id: 1, user_id: 7, points: 4, wins: 2, battles_played: 3, pseudo: 'Beta', discord_user_id: null },
      ]]);

      const rows = await EventRanking.findByEvent(1, 10);
      expect(rows).to.have.length(2);
      expect(rows[0].rang).to.equal(1);
      expect(rows[1].rang).to.equal(2);
      expect(executeStub.calledOnce).to.be.true;
      expect(executeStub.firstCall.args[0]).to.include('ORDER BY er.points DESC');
    });
  });
});
