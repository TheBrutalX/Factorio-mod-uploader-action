const { pathsToModuleNameMapper } = require('ts-jest');
const tsconfig = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    "node_modules/variables/.+\\.(j|t)sx?$": "ts-jest"
  },
  transformIgnorePatterns: [
    "node_modules/(?!variables/.*)"
  ],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: pathsToModuleNameMapper(tsconfig.compilerOptions.paths, { prefix: '<rootDir>/' }),
};