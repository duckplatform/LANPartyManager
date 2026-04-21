/**
 * Tests unitaires - Middlewares d'authentification
 */
const { requireAuth, redirectIfAuthenticated } = require('../../src/middleware/auth');
const { requireAdmin } = require('../../src/middleware/adminAuth');

// Mock du logger
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

/**
 * Crée un objet req mock
 */
function mockReq(sessionData = {}) {
  return {
    session: sessionData,
    flash: jest.fn().mockReturnValue([]),
  };
}

/**
 * Crée un objet res mock
 */
function mockRes() {
  const res = {
    redirect: jest.fn(),
    status: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('Middleware: requireAuth', () => {
  it('appelle next() si l\'utilisateur est connecté', () => {
    const req  = mockReq({ userId: 1, user: { id: 1 } });
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirige vers /auth/login si non connecté (session vide)', () => {
    const req  = mockReq({});
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirige vers /auth/login si session nulle', () => {
    const req  = { session: null, flash: jest.fn().mockReturnValue([]) };
    const res  = mockRes();
    const next = jest.fn();

    requireAuth(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
  });
});

describe('Middleware: redirectIfAuthenticated', () => {
  it('appelle next() si l\'utilisateur n\'est pas connecté', () => {
    const req  = mockReq({});
    const res  = mockRes();
    const next = jest.fn();

    redirectIfAuthenticated(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it('redirige vers /profile si déjà connecté', () => {
    const req  = mockReq({ userId: 1 });
    const res  = mockRes();
    const next = jest.fn();

    redirectIfAuthenticated(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/profile');
    expect(next).not.toHaveBeenCalled();
  });
});

describe('Middleware: requireAdmin', () => {
  it('appelle next() si l\'utilisateur est admin', () => {
    const req  = mockReq({ userId: 1, userRole: 'admin' });
    const res  = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('redirige vers / si l\'utilisateur est connecté mais pas admin', () => {
    const req  = mockReq({ userId: 1, userRole: 'user' });
    const res  = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/');
    expect(next).not.toHaveBeenCalled();
  });

  it('redirige vers /auth/login si non connecté', () => {
    const req  = mockReq({});
    const res  = mockRes();
    const next = jest.fn();

    requireAdmin(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith('/auth/login');
    expect(next).not.toHaveBeenCalled();
  });
});
