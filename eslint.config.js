// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import nodePlugin from 'eslint-plugin-node';
import promisePlugin from 'eslint-plugin-promise';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'vite.config.ts'],
  },

  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      node: nodePlugin,
      promise: promisePlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'node/no-unsupported-features/es-syntax': 'off',
      'node/no-missing-import': 'off',
      'promise/always-return': 'warn',
      'promise/no-return-wrap': 'warn',
      'promise/param-names': 'warn',
    },
  },

  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: {
      node: nodePlugin,
      promise: promisePlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      'promise/always-return': 'warn',
      'promise/no-return-wrap': 'warn',
      'promise/param-names': 'warn',
    },
  }
);
