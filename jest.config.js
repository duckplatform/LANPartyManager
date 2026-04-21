/**
 * Configuration Jest pour les tests
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    'app.js',
    '!src/config/logger.js',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 15000,
};
