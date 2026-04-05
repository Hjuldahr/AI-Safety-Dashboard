module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/?(*.)+(test).[jt]s?(x)'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/e2e/'
  ]
};