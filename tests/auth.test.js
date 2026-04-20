/**
 * Tests for authentication endpoints:
 *   POST /api/auth/register
 *   POST /api/auth/login
 */
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../src/app');
const { setupTestDb, clearMembers, teardownTestDb } = require('./testDb');

beforeAll(async () => {
  await setupTestDb();
});

afterEach(async () => {
  await clearMembers();
});

afterAll(async () => {
  await teardownTestDb();
});

// ─── Registration ───────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  const validMember = {
    nom: 'Dupont',
    prenom: 'Jean',
    surnom: 'jd42',
    email: 'jean.dupont@example.com',
    password: 'secret123',
  };

  it('should register a new member successfully', async () => {
    const res = await request(app).post('/api/auth/register').send(validMember);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/inscription/i);
    expect(res.body.member).toMatchObject({
      nom: 'Dupont',
      prenom: 'Jean',
      surnom: 'jd42',
      email: 'jean.dupont@example.com',
      role: 'member',
    });
    expect(res.body.member.password).toBeUndefined();
  });

  it('should reject registration with missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      nom: 'Dupont',
      email: 'jean@example.com',
      password: 'secret123',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject registration with an invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validMember,
      email: 'not-an-email',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject registration with a password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      ...validMember,
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validMember);
    const res = await request(app).post('/api/auth/register').send(validMember);
    expect(res.status).toBe(409);
  });

  it('should reject duplicate surnom', async () => {
    await request(app).post('/api/auth/register').send(validMember);
    const res = await request(app).post('/api/auth/register').send({
      ...validMember,
      email: 'other@example.com',
    });
    expect(res.status).toBe(409);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  const memberData = {
    nom: 'Martin',
    prenom: 'Alice',
    surnom: 'alice99',
    email: 'alice@example.com',
    password: 'mypassword',
  };

  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(memberData);
  });

  it('should login successfully with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'mypassword',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.member).toMatchObject({ email: 'alice@example.com', role: 'member' });
    expect(res.body.member.password).toBeUndefined();
  });

  it('should login the default admin account', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.member.role).toBe('admin');
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
  });

  it('should reject login with unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'anypassword',
    });
    expect(res.status).toBe(401);
  });

  it('should reject login with invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'anypassword',
    });
    expect(res.status).toBe(400);
  });
});
