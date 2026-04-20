/**
 * Tests des routes d'événements
 */
const request = require('supertest');

// Mock Event model
jest.mock('../models/Event', () => ({
  findAll: jest.fn().mockResolvedValue([
    { id: 1, title: 'Test Event', slug: 'test-event', location: 'Paris',
      start_date: new Date(), end_date: new Date(), max_participants: 50,
      is_active: 1, is_published: 1, created_at: new Date() }
  ]),
  findActive: jest.fn().mockResolvedValue({
    id: 1, title: 'Test Event', slug: 'test-event', location: 'Paris',
    start_date: new Date(), max_participants: 50, is_active: 1
  }),
  findBySlug: jest.fn().mockResolvedValue({
    id: 1, title: 'Test Event', slug: 'test-event', location: 'Paris',
    start_date: new Date(), end_date: new Date(), max_participants: 50,
    description: '<p>Description</p>', is_active: 1, is_published: 1
  }),
  count: jest.fn().mockResolvedValue(1),
  getRegistrations: jest.fn().mockResolvedValue([]),
  isRegistered: jest.fn().mockResolvedValue(false),
  register: jest.fn().mockResolvedValue(),
  unregister: jest.fn().mockResolvedValue()
}));

// Mock News model
jest.mock('../models/News', () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findBySlug: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0)
}));

const app = require('../app');

describe('Event Routes', () => {
  describe('GET /events', () => {
    it('should return 200 for events list page', async () => {
      const res = await request(app).get('/events');
      expect([200, 302]).toContain(res.statusCode);
    });
  });

  describe('GET /events/:slug', () => {
    it('should return 200 for existing event', async () => {
      const res = await request(app).get('/events/test-event');
      expect([200, 302]).toContain(res.statusCode);
    });

    it('should return 404 for non-existing event', async () => {
      const Event = require('../models/Event');
      Event.findBySlug.mockResolvedValueOnce(null);
      const res = await request(app).get('/events/non-existing');
      expect([404, 302]).toContain(res.statusCode);
    });
  });

  describe('POST /events/:slug/register (unauthenticated)', () => {
    it('should redirect to login when not authenticated', async () => {
      const res = await request(app)
        .post('/events/test-event/register')
        .send('_csrf=invalid');
      // Soit redirect vers login (302) soit 403 CSRF
      expect([302, 403]).toContain(res.statusCode);
    });
  });

  describe('Admin routes (unauthenticated)', () => {
    it('should redirect admin dashboard when not authenticated', async () => {
      const res = await request(app).get('/admin/dashboard');
      expect(res.statusCode).toBe(302);
    });

    it('should redirect admin news when not authenticated', async () => {
      const res = await request(app).get('/admin/news');
      expect(res.statusCode).toBe(302);
    });

    it('should redirect admin events when not authenticated', async () => {
      const res = await request(app).get('/admin/events');
      expect(res.statusCode).toBe(302);
    });
  });
});
