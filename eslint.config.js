const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const boundaries = require('eslint-plugin-boundaries');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'uploads/**', 'src/generated/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/index.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { node: { extensions: ['.ts', '.js', '.json'] } },
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain' },
        { type: 'application', pattern: 'src/application' },
        { type: 'infrastructure', pattern: 'src/infrastructure' },
        { type: 'main', pattern: 'src/main' },
      ],
    },
    rules: {
      // domain imports nothing; application imports only domain; infrastructure imports both.
      'boundaries/dependencies': [
        2,
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { types: { anyOf: ['domain', 'application'] } } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: { element: { types: { anyOf: ['domain', 'application', 'infrastructure'] } } },
              },
            },
            {
              from: { element: { type: 'main' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['domain', 'application', 'infrastructure', 'main'] },
                  },
                },
              },
            },
            // Packages from node_modules and Node built-ins are not constrained here.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
          ],
        },
      ],
    },
  },
);
