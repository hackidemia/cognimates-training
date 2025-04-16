/**
 * Jest configuration for testing the application
 */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  testMatch: ['**/src/**/*.test.js'],
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,
  testTimeout: 10000,
  setupFilesAfterEnv: [],
  moduleFileExtensions: ['js', 'json'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  modulePathIgnorePatterns: ['<rootDir>/node_modules/'],
};
