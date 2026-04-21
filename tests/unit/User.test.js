/**
 * Tests unitaires - Modèle User
 */
const bcrypt = require('bcryptjs');
const User = require('../../src/models/User');

// Mock de la base de données
jest.mock('../../src/config/database', () => ({
  query: jest.fn(),
}));
jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const { query } = require('../../src/config/database');

describe('User Model', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── findById ────────────────────────────────────────────────────────────
  describe('findById', () => {
    it('retourne l\'utilisateur trouvé', async () => {
      const mockUser = { id: 1, first_name: 'Jean', last_name: 'Dupont', nickname: 'JD', email: 'jean@test.com', role: 'user' };
      query.mockResolvedValue([mockUser]);

      const user = await User.findById(1);
      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [1]);
    });

    it('retourne null si l\'utilisateur n\'existe pas', async () => {
      query.mockResolvedValue([]);
      const user = await User.findById(999);
      expect(user).toBeNull();
    });
  });

  // ─── findByEmail ─────────────────────────────────────────────────────────
  describe('findByEmail', () => {
    it('retourne l\'utilisateur avec le bon email', async () => {
      const mockUser = { id: 1, email: 'jean@test.com', password: 'hash123' };
      query.mockResolvedValue([mockUser]);

      const user = await User.findByEmail('jean@test.com');
      expect(user).toEqual(mockUser);
    });

    it('retourne null si l\'email n\'existe pas', async () => {
      query.mockResolvedValue([]);
      const user = await User.findByEmail('inconnu@test.com');
      expect(user).toBeNull();
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────
  describe('create', () => {
    it('crée un utilisateur et retourne ses données', async () => {
      const insertResult = { insertId: 42 };
      const mockUser = { id: 42, first_name: 'Marie', last_name: 'Martin', nickname: 'MM', email: 'marie@test.com', role: 'user' };

      query
        .mockResolvedValueOnce(insertResult) // INSERT
        .mockResolvedValueOnce([mockUser]);  // SELECT (findById)

      const user = await User.create({
        firstName: 'Marie',
        lastName: 'Martin',
        nickname: 'MM',
        email: 'marie@test.com',
        password: 'TestPassword1',
      });

      expect(user).toEqual(mockUser);
      expect(query).toHaveBeenCalledTimes(2);
      // Vérifier que le mot de passe est hashé (ne doit pas contenir le mot de passe en clair)
      const insertCall = query.mock.calls[0];
      expect(insertCall[1]).not.toContain('TestPassword1');
    });
  });

  // ─── emailExists ─────────────────────────────────────────────────────────
  describe('emailExists', () => {
    it('retourne true si l\'email existe', async () => {
      query.mockResolvedValue([{ id: 1 }]);
      const exists = await User.emailExists('jean@test.com');
      expect(exists).toBe(true);
    });

    it('retourne false si l\'email n\'existe pas', async () => {
      query.mockResolvedValue([]);
      const exists = await User.emailExists('nouveau@test.com');
      expect(exists).toBe(false);
    });

    it('exclut un ID spécifique de la vérification', async () => {
      query.mockResolvedValue([]);
      await User.emailExists('jean@test.com', 1);
      const callArgs = query.mock.calls[0];
      expect(callArgs[0]).toContain('AND id != ?');
      expect(callArgs[1]).toContain(1);
    });
  });

  // ─── verifyPassword ──────────────────────────────────────────────────────
  describe('verifyPassword', () => {
    it('retourne true pour un mot de passe correct', async () => {
      const hash = await bcrypt.hash('MonMotDePasse1', 10);
      const valid = await User.verifyPassword('MonMotDePasse1', hash);
      expect(valid).toBe(true);
    });

    it('retourne false pour un mauvais mot de passe', async () => {
      const hash = await bcrypt.hash('MonMotDePasse1', 10);
      const valid = await User.verifyPassword('MauvaisMotDePasse', hash);
      expect(valid).toBe(false);
    });
  });

  // ─── count ───────────────────────────────────────────────────────────────
  describe('count', () => {
    it('retourne le nombre total d\'utilisateurs', async () => {
      query.mockResolvedValue([{ total: 42 }]);
      const total = await User.count();
      expect(total).toBe(42);
    });
  });

  // ─── countByRole ─────────────────────────────────────────────────────────
  describe('countByRole', () => {
    it('retourne le compte par rôle', async () => {
      query.mockResolvedValue([
        { role: 'user', count: 40 },
        { role: 'admin', count: 2 },
      ]);
      const counts = await User.countByRole();
      expect(counts.user).toBe(40);
      expect(counts.admin).toBe(2);
    });
  });

  // ─── delete ──────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('appelle DELETE avec le bon ID', async () => {
      query.mockResolvedValue([]);
      await User.delete(1);
      expect(query).toHaveBeenCalledWith('DELETE FROM users WHERE id = ?', [1]);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────
  describe('update', () => {
    it('met à jour et retourne l\'utilisateur', async () => {
      const updatedUser = { id: 1, first_name: 'Jean', last_name: 'Dupont', nickname: 'JDupont', email: 'jean2@test.com' };
      query
        .mockResolvedValueOnce([]) // UPDATE
        .mockResolvedValueOnce([updatedUser]); // SELECT

      const result = await User.update(1, {
        firstName: 'Jean',
        lastName: 'Dupont',
        nickname: 'JDupont',
        email: 'jean2@test.com',
      });

      expect(result).toEqual(updatedUser);
    });
  });

});
