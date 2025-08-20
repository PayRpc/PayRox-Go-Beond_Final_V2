// Flat ESLint config migrated from legacy .eslintrc.js (CommonJS form)
// Using require since project doesn't declare "type": "module".
const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-plugin-prettier');
const importPlugin = require('eslint-plugin-import');

/** @type {import('eslint').Linter.FlatConfig[]} */
const tsRecommended = tsPlugin.configs.recommended?.rules || {};
const importRecommended = importPlugin.configs.recommended?.rules || {};

module.exports = [
  js.configs.recommended,
  // JS files: simpler parsing, Node globals
  {
    files: ['**/*.js', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
      },
    },
    plugins: {
      import: importPlugin,
      prettier,
    },
    rules: {
      ...importRecommended,
      'prettier/prettier': 'error',
      // Relax strict rules for JS quick pass
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/named': 'off',
      'import/no-duplicates': 'off',
    },
  },
  // TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.hardhat.json'],
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
        require: 'readonly',
        Buffer: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
      prettier,
    },
    rules: {
      ...tsRecommended,
      ...importRecommended,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'import/no-unresolved': 'off',
      'import/namespace': 'off',
      'import/named': 'off',
      'import/no-duplicates': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off',
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
