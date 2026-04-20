/**
 * Configuration des tests Jest
 * Mock de mysql2 pour éviter les connexions DB réelles
 */

// Mock mysql2/promise avant tout chargement de module
jest.mock('mysql2/promise', () => {
  const mockPool = {
    query: jest.fn().mockResolvedValue([[{ value: 'true' }], []]),
    getConnection: jest.fn().mockResolvedValue({
      release: jest.fn(),
      query: jest.fn().mockResolvedValue([[]])
    })
  };
  return {
    createPool: jest.fn(() => mockPool),
    createConnection: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue([[]]),
      end: jest.fn()
    })
  };
});

// Définir NODE_ENV pour les tests
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-for-jest';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';
