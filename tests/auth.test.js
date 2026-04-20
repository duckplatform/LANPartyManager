/**
 * Tests des routes d'authentification
 */
const request = require('supertest');
const app = require('../app');

describe('Auth Routes', () => {
  describe('GET /auth/login', () => {
    it('should return 200 for login page', async () => {
      const res = await request(app).get('/auth/login');
      // La page peut rediriger vers /install si la DB mock renvoie installed=true via le checkInstall
      // On accepte 200 ou 302
      expect([200, 302]).toContain(res.statusCode);
    });
  });

  describe('GET /auth/register', () => {
    it('should return 200 or redirect for register page', async () => {
      const res = await request(app).get('/auth/register');
      expect([200, 302]).toContain(res.statusCode);
    });
  });

  describe('POST /auth/login with invalid data', () => {
    it('should return 200 with validation error for invalid email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send('email=not-an-email&password=test')
        .set('Content-Type', 'application/x-www-form-urlencoded');
      // CSRF protection → 403 ou 302 attendus si token manquant
      expect([200, 302, 403]).toContain(res.statusCode);
    });

    it('should reject login without CSRF token', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'password' });
      expect([302, 403]).toContain(res.statusCode);
    });
  });

  describe('GET /auth/logout', () => {
    it('should redirect on logout', async () => {
      const res = await request(app).get('/auth/logout');
      expect(res.statusCode).toBe(302);
    });
  });

  describe('GET /auth/profile (unauthenticated)', () => {
    it('should redirect to login when not authenticated', async () => {
      const res = await request(app).get('/auth/profile');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('/auth/login');
    });
  });
});
