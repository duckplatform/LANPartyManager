/**
 * Tests for member profile endpoints:
 *   GET  /api/members/me
 *   PUT  /api/members/me
 *   GET  /api/members        (admin only)
 *   DELETE /api/members/:id  (admin only)
 */
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, clearMembers, teardownTestDb } = require('./testDb');

let adminToken;
let memberToken;
let memberId;

async function loginAs(email, password) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

beforeAll(async () => {
  await setupTestDb();
  adminToken = await loginAs(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD);
});

beforeEach(async () => {
  await clearMembers();
  const reg = await request(app).post('/api/auth/register').send({
    nom: 'Lemaire',
    prenom: 'Bob',
    surnom: 'bob_gamer',
    email: 'bob@example.com',
    password: 'password123',
  });
  memberId = reg.body.member.id;
  memberToken = await loginAs('bob@example.com', 'password123');
});

afterAll(async () => {
  await clearMembers();
  await teardownTestDb();
});

// ─── GET /api/members/me ──────────────────────────────────────────────────────

describe('GET /api/members/me', () => {
  it('should return the authenticated member profile', async () => {
    const res = await request(app)
      .get('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(200);
    expect(res.body.member).toMatchObject({ email: 'bob@example.com', surnom: 'bob_gamer' });
    expect(res.body.member.password).toBeUndefined();
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/members/me');
    expect(res.status).toBe(401);
  });

  it('should reject requests with an invalid token', async () => {
    const res = await request(app)
      .get('/api/members/me')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(401);
  });
});

// ─── PUT /api/members/me ──────────────────────────────────────────────────────

describe('PUT /api/members/me', () => {
  it('should update the member nom and prenom', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ nom: 'Nouveau', prenom: 'Prenom' });
    expect(res.status).toBe(200);
    expect(res.body.member.nom).toBe('Nouveau');
    expect(res.body.member.prenom).toBe('Prenom');
  });

  it('should update the member email', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'new_email@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.member.email).toBe('new_email@example.com');
  });

  it('should change the password when currentPassword is correct', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ currentPassword: 'password123', newPassword: 'newpassword456' });
    expect(res.status).toBe(200);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'bob@example.com', password: 'newpassword456' });
    expect(loginRes.status).toBe(200);
  });

  it('should reject password change with wrong currentPassword', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ currentPassword: 'wrongpass', newPassword: 'newpassword456' });
    expect(res.status).toBe(401);
  });

  it('should reject update with invalid email format', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('should reject update with a new password shorter than 6 characters', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ currentPassword: 'password123', newPassword: '123' });
    expect(res.status).toBe(400);
  });

  it('should require currentPassword when setting newPassword', async () => {
    const res = await request(app)
      .put('/api/members/me')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ newPassword: 'newpassword456' });
    expect(res.status).toBe(400);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app).put('/api/members/me').send({ nom: 'Test' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/members (admin) ─────────────────────────────────────────────────

describe('GET /api/members', () => {
  it('should list all members for admin', async () => {
    const res = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members.length).toBeGreaterThanOrEqual(2); // admin + bob
    res.body.members.forEach((m) => expect(m.password).toBeUndefined());
  });

  it('should deny access to regular members', async () => {
    const res = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });

  it('should deny unauthenticated requests', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(401);
  });
});

// ─── DELETE /api/members/:id (admin) ─────────────────────────────────────────

describe('DELETE /api/members/:id', () => {
  it('should allow admin to delete a member', async () => {
    const res = await request(app)
      .delete(`/api/members/${memberId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/supprimé/i);
  });

  it('should return 404 when member does not exist', async () => {
    const res = await request(app)
      .delete('/api/members/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('should deny deletion by a non-admin member', async () => {
    const res = await request(app)
      .delete(`/api/members/${memberId}`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(res.status).toBe(403);
  });
});

// ─── Misc ─────────────────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('404 handler', () => {
  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
  });
});
