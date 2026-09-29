'use strict';

/**
 * Tests unitaires - Store de sessions MySQL (config/sessionStore.js)
 */

const { expect } = require('chai');
const sinon      = require('sinon');

// ── Stub du pool de base de données ───────────────────────────────────────

const dbModule = require('../config/database');
const poolStub = { execute: sinon.stub() };

const session = require('express-session');
const { MySQLSessionStore, destroyOtherUserSessions } = require('../config/sessionStore');

function call(store, method, ...args) {
  return new Promise((resolve, reject) => {
    store[method](...args, (err, value) => (err ? reject(err) : resolve(value)));
  });
}

// ─────────────────────────────────────────────────────────────────────────

describe('MySQLSessionStore', function () {

  let store;

  beforeEach(function () {
    dbModule.pool = poolStub;
    poolStub.execute.reset();
    poolStub.execute.resolves([[]]);
    store = new MySQLSessionStore({ cleanupIntervalMs: 0 });
  });

  afterEach(function () {
    poolStub.execute.reset();
  });

  it('doit créer la table une seule fois avant la première requête', async function () {
    await call(store, 'get', 'sid-1');
    await call(store, 'get', 'sid-2');

    const createCalls = poolStub.execute.getCalls().filter(c => c.args[0].includes('CREATE TABLE IF NOT EXISTS'));
    expect(createCalls).to.have.length(1);
    expect(poolStub.execute.firstCall.args[0]).to.include('CREATE TABLE IF NOT EXISTS');
  });

  it('doit retourner null pour une session absente ou expirée', async function () {
    const sess = await call(store, 'get', 'unknown');
    expect(sess).to.be.null;

    const selectCall = poolStub.execute.getCalls().find(c => c.args[0].startsWith('SELECT'));
    expect(selectCall.args[0]).to.include('`expires` > ?');
    expect(selectCall.args[1][0]).to.equal('unknown');
  });

  it('doit désérialiser une session existante', async function () {
    poolStub.execute.withArgs(sinon.match(/^SELECT/)).resolves([[{ data: JSON.stringify({ userId: 3 }) }]]);
    const sess = await call(store, 'get', 'sid-3');
    expect(sess).to.deep.equal({ userId: 3 });
  });

  it('doit enregistrer la session avec l\'expiration de son cookie', async function () {
    const expires = new Date('2030-01-01T00:00:00Z');
    await call(store, 'set', 'sid-4', { cookie: { expires }, userId: 4 });

    const insertCall = poolStub.execute.getCalls().find(c => c.args[0].includes('INSERT INTO'));
    expect(insertCall.args[0]).to.include('ON DUPLICATE KEY UPDATE');
    expect(insertCall.args[1][0]).to.equal('sid-4');
    expect(insertCall.args[1][1]).to.equal(Math.floor(expires.getTime() / 1000));
    expect(JSON.parse(insertCall.args[1][2]).userId).to.equal(4);
  });

  it('doit prolonger l\'expiration via touch()', async function () {
    const expires = new Date('2031-06-01T12:00:00Z');
    await call(store, 'touch', 'sid-5', { cookie: { expires } });

    const updateCall = poolStub.execute.getCalls().find(c => c.args[0].startsWith('UPDATE'));
    expect(updateCall.args[1]).to.deep.equal([Math.floor(expires.getTime() / 1000), 'sid-5']);
  });

  it('doit supprimer la session via destroy()', async function () {
    await call(store, 'destroy', 'sid-6');

    const deleteCall = poolStub.execute.getCalls().find(c => c.args[0].startsWith('DELETE'));
    expect(deleteCall.args[1]).to.deep.equal(['sid-6']);
  });

  it('doit transmettre les erreurs BDD au callback et réessayer la création de table', async function () {
    poolStub.execute.onFirstCall().rejects(new Error('DB down'));

    let caught = null;
    try {
      await call(store, 'get', 'sid-7');
    } catch (err) {
      caught = err;
    }
    expect(caught).to.be.an('error');

    await call(store, 'get', 'sid-7');
    const createCalls = poolStub.execute.getCalls().filter(c => c.args[0].includes('CREATE TABLE IF NOT EXISTS'));
    expect(createCalls).to.have.length(2);
  });

  it('doit supprimer les sessions d\'un utilisateur sauf la session courante', async function () {
    await store.destroyUserSessions(5, 'current-sid');

    const deleteCall = poolStub.execute.getCalls().find(c => c.args[0].includes('DELETE FROM'));
    expect(deleteCall.args[0]).to.include("JSON_EXTRACT(`data`, '$.userId')");
    expect(deleteCall.args[1]).to.deep.equal([5, 'current-sid']);
  });
});

describe('destroyOtherUserSessions()', function () {
  function setSession(store, sid, data) {
    return new Promise((resolve, reject) => {
      store.set(sid, { cookie: { expires: null }, ...data }, err => (err ? reject(err) : resolve()));
    });
  }

  it('doit utiliser destroyUserSessions() du store MySQL', async function () {
    const store = { destroyUserSessions: sinon.stub().resolves() };
    await destroyOtherUserSessions(store, 5, 'current');
    expect(store.destroyUserSessions.calledOnceWithExactly(5, 'current')).to.be.true;
  });

  it('doit se replier sur all()/destroy() pour les autres stores', async function () {
    const store = new session.MemoryStore();
    await setSession(store, 'current', { userId: 5 });
    await setSession(store, 'other-device', { userId: 5 });
    await setSession(store, 'someone-else', { userId: 6 });
    await setSession(store, 'anonymous', {});

    await destroyOtherUserSessions(store, 5, 'current');

    const remaining = await new Promise((resolve, reject) => {
      store.all((err, all) => (err ? reject(err) : resolve(Object.keys(all).sort())));
    });
    expect(remaining).to.deep.equal(['anonymous', 'current', 'someone-else']);
  });
});
