'use strict';

/**
 * Tests - Middleware d'authentification et de sécurité
 */

const { expect } = require('chai');
const sinon      = require('sinon');
const { requireAuth, requireAdmin, injectLocals } = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────

describe('Middleware Auth', function () {

  // ── requireAuth ────────────────────────────────────────────────────────

  describe('requireAuth()', function () {
    it('doit appeler next() si l\'utilisateur est authentifié', function () {
      const req  = { session: { userId: 1 } };
      const res  = {};
      const next = sinon.spy();

      requireAuth(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('doit rediriger vers /auth/login si l\'utilisateur n\'est pas authentifié', function () {
      const req  = { session: {}, flash: sinon.stub() };
      const res  = { redirect: sinon.spy() };
      const next = sinon.spy();

      requireAuth(req, res, next);
      expect(next.called).to.be.false;
      expect(res.redirect.calledWith('/auth/login')).to.be.true;
    });

    it('doit rediriger si la session est absente', function () {
      const req  = { session: null, flash: sinon.stub() };
      const res  = { redirect: sinon.spy() };
      const next = sinon.spy();

      requireAuth(req, res, next);
      expect(res.redirect.calledWith('/auth/login')).to.be.true;
    });
  });

  // ── requireAdmin ───────────────────────────────────────────────────────

  describe('requireAdmin()', function () {
    it('doit appeler next() si l\'utilisateur est admin', function () {
      const req  = { session: { userId: 1, isAdmin: true } };
      const res  = {};
      const next = sinon.spy();

      requireAdmin(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('doit rediriger vers / si l\'utilisateur n\'est pas admin', function () {
      const req  = { session: { userId: 1, isAdmin: false }, flash: sinon.stub() };
      const res  = { redirect: sinon.spy() };
      const next = sinon.spy();

      requireAdmin(req, res, next);
      expect(next.called).to.be.false;
      expect(res.redirect.calledWith('/')).to.be.true;
    });

    it('doit rediriger si userId est absent', function () {
      const req  = { session: { isAdmin: true }, flash: sinon.stub() };
      const res  = { redirect: sinon.spy() };
      const next = sinon.spy();

      requireAdmin(req, res, next);
      expect(res.redirect.calledWith('/')).to.be.true;
    });
  });

  // ── injectLocals ───────────────────────────────────────────────────────

  describe('injectLocals()', function () {
    it('doit injecter null dans currentUser si non connecté', function () {
      const req = {
        session: {},
        flash:   sinon.stub().returns([]),
        csrfToken: sinon.stub().returns('tok'),
      };
      const res  = { locals: {} };
      const next = sinon.spy();

      injectLocals(req, res, next);
      expect(res.locals.currentUser).to.be.null;
      expect(next.calledOnce).to.be.true;
    });

    it('doit injecter les données utilisateur si connecté', function () {
      const req = {
        session: { userId: 5, pseudo: 'GamerX', isAdmin: false },
        flash:   sinon.stub().returns([]),
        csrfToken: sinon.stub().returns('tok'),
      };
      const res  = { locals: {} };
      const next = sinon.spy();

      injectLocals(req, res, next);
      expect(res.locals.currentUser).to.deep.equal({
        id:      5,
        pseudo:  'GamerX',
        isAdmin: false,
      });
    });

    it('doit rendre csrfToken accessible dans les locals', function () {
      const tokenFn = sinon.stub().returns('csrf-token-value');
      const req = {
        session: {},
        flash:   sinon.stub().returns([]),
        csrfToken: tokenFn,
      };
      const res  = { locals: {} };
      const next = sinon.spy();

      injectLocals(req, res, next);
      expect(typeof res.locals.csrfToken).to.equal('function');
      const token = res.locals.csrfToken();
      expect(token).to.equal('csrf-token-value');
    });
  });

});
