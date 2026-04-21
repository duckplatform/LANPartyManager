/**
 * Tests unitaires - Middleware de validation
 */
const { validationResult } = require('express-validator');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  getValidationErrors,
} = require('../../src/middleware/validation');

jest.mock('../../src/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

/**
 * Exécute les validators express-validator sur un objet body simulé
 * @param {Array} validators
 * @param {Object} body
 */
async function runValidators(validators, body) {
  const req = {
    body,
    query: {},
    params: {},
    headers: {},
    cookies: {},
    get: jest.fn(),
  };
  for (const validator of validators) {
    await validator.run(req);
  }
  return req;
}

describe('Validation: registerValidation', () => {
  it('passe avec des données valides', async () => {
    const req = await runValidators(registerValidation, {
      firstName: 'Jean',
      lastName: 'Dupont',
      nickname: 'JeanD',
      email: 'jean@test.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(true);
  });

  it('échoue si le prénom est vide', async () => {
    const req = await runValidators(registerValidation, {
      firstName: '',
      lastName: 'Dupont',
      nickname: 'JeanD',
      email: 'jean@test.com',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'firstName')).toBe(true);
  });

  it('échoue si l\'email est invalide', async () => {
    const req = await runValidators(registerValidation, {
      firstName: 'Jean',
      lastName: 'Dupont',
      nickname: 'JeanD',
      email: 'pasUneEmail',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'email')).toBe(true);
  });

  it('échoue si le mot de passe est trop court', async () => {
    const req = await runValidators(registerValidation, {
      firstName: 'Jean',
      lastName: 'Dupont',
      nickname: 'JeanD',
      email: 'jean@test.com',
      password: 'Abc1',
      confirmPassword: 'Abc1',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'password')).toBe(true);
  });

  it('échoue si les mots de passe ne correspondent pas', async () => {
    const req = await runValidators(registerValidation, {
      firstName: 'Jean',
      lastName: 'Dupont',
      nickname: 'JeanD',
      email: 'jean@test.com',
      password: 'Password1',
      confirmPassword: 'AutrePassword1',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'confirmPassword')).toBe(true);
  });

  it('échoue si le mot de passe n\'a pas de majuscule', async () => {
    const req = await runValidators(registerValidation, {
      firstName: 'Jean',
      lastName: 'Dupont',
      nickname: 'JeanD',
      email: 'jean@test.com',
      password: 'password1',
      confirmPassword: 'password1',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'password')).toBe(true);
  });
});

describe('Validation: loginValidation', () => {
  it('passe avec des données valides', async () => {
    const req = await runValidators(loginValidation, {
      email: 'jean@test.com',
      password: 'quelconque',
    });
    const errors = validationResult(req);
    expect(errors.isEmpty()).toBe(true);
  });

  it('échoue si l\'email est manquant', async () => {
    const req = await runValidators(loginValidation, {
      email: '',
      password: 'quelconque',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'email')).toBe(true);
  });

  it('échoue si le mot de passe est manquant', async () => {
    const req = await runValidators(loginValidation, {
      email: 'jean@test.com',
      password: '',
    });
    const errors = validationResult(req).array();
    expect(errors.some(e => e.path === 'password')).toBe(true);
  });
});

describe('getValidationErrors', () => {
  it('retourne un tableau vide si pas d\'erreurs', async () => {
    const req = await runValidators(loginValidation, {
      email: 'jean@test.com',
      password: 'quelconque',
    });
    const errors = getValidationErrors(req);
    expect(errors).toEqual([]);
  });

  it('retourne les messages d\'erreur', async () => {
    const req = await runValidators(loginValidation, {
      email: 'pasunemail',
      password: '',
    });
    const errors = getValidationErrors(req);
    expect(errors.length).toBeGreaterThan(0);
    errors.forEach(e => expect(typeof e).toBe('string'));
  });
});
