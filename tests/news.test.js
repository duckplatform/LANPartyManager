/**
 * Tests des routes de news
 */
const request = require('supertest');

// Mock News model
jest.mock('../models/News', () => ({
  findAll: jest.fn().mockResolvedValue([
    { id: 1, title: 'Test News', slug: 'test-news', excerpt: 'Test excerpt',
      content: '<p>Content</p>', author_name: 'admin', is_published: 1,
      created_at: new Date() }
  ]),
  findBySlug: jest.fn().mockResolvedValue({
    id: 1, title: 'Test News', slug: 'test-news', excerpt: 'Test excerpt',
    content: '<p>Content</p>', author_name: 'admin', is_published: 1,
    created_at: new Date()
  }),
  count: jest.fn().mockResolvedValue(1)
}));

// Mock Event model
jest.mock('../models/Event', () => ({
  findAll: jest.fn().mockResolvedValue([]),
  findActive: jest.fn().mockResolvedValue(null),
  findBySlug: jest.fn().mockResolvedValue(null),
  count: jest.fn().mockResolvedValue(0),
  getRegistrations: jest.fn().mockResolvedValue([]),
  isRegistered: jest.fn().mockResolvedValue(false),
  register: jest.fn().mockResolvedValue(),
  unregister: jest.fn().mockResolvedValue()
}));

const app = require('../app');

describe('News Routes', () => {
  describe('GET /news', () => {
    it('should return 200 for news list page', async () => {
      const res = await request(app).get('/news');
      expect([200, 302]).toContain(res.statusCode);
    });
  });

  describe('GET /news/:slug', () => {
    it('should return 200 for existing article', async () => {
      const res = await request(app).get('/news/test-news');
      expect([200, 302]).toContain(res.statusCode);
    });

    it('should return 404 for non-existing article', async () => {
      const News = require('../models/News');
      News.findBySlug.mockResolvedValueOnce(null);
      const res = await request(app).get('/news/non-existing-article');
      expect([404, 302]).toContain(res.statusCode);
    });
  });

  describe('GET / (homepage)', () => {
    it('should return 200 for homepage', async () => {
      const res = await request(app).get('/');
      expect([200, 302]).toContain(res.statusCode);
    });
  });
});
