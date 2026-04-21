/**
 * Tests d'intégration - Routes de l'application
 * Utilise supertest pour simuler les requêtes HTTP
 */
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test_secret_for_integration_tests';

const request = require('supertest');
const app = require('../../app');

// Mock de la base de données
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
  pool: { getConnection: jest.fn() },
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

describe('Routes: Pages publiques', () => {
  it('GET / - page d\'accueil répond 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('LAN');
  });

  it('GET /auth/login - page de connexion répond 200', async () => {
    const res = await request(app).get('/auth/login');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Connexion');
  });

  it('GET /auth/register - page d\'inscription répond 200', async () => {
    const res = await request(app).get('/auth/register');
    expect(res.statusCode).toBe(200);
    expect(res.text).toContain('Inscription');
  });

  it('GET /page-inexistante - répond 404', async () => {
    const res = await request(app).get('/page-inexistante');
    expect(res.statusCode).toBe(404);
  });
});

describe('Routes: Protection des routes privées', () => {
  it('GET /profile - redirige vers login si non connecté', async () => {
    const res = await request(app).get('/profile');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('/auth/login');
  });

  it('GET /admin - redirige si non connecté', async () => {
    const res = await request(app).get('/admin');
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toContain('/auth/login');
  });

  it('GET /admin/users - redirige si non connecté', async () => {
    const res = await request(app).get('/admin/users');
    expect(res.statusCode).toBe(302);
  });
});

describe('Routes: POST sans CSRF (test env)', () => {
  it('POST /auth/login - retourne 302 avec validation échouée', async () => {
    const { query } = require('../../src/config/database');
    query.mockResolvedValue([]);

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'pasunemail', password: '' });

    // Doit rediriger (flash + redirect) ou répondre 302
    expect([200, 302]).toContain(res.statusCode);
  });
});
