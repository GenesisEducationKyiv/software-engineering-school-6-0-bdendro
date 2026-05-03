import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import jest from 'eslint-plugin-jest';

const testFiles = ['**/*.spec.ts', 'test/**/*.ts'];

export default defineConfig([
  {
    ignores: [
      'eslint.config.mjs',
      'dist',
      '**/dist/**',
      '**/node_modules/**',
      'prisma.config.ts',
      'src/generated/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  {
    files: testFiles,
    ...jest.configs['flat/recommended'],
  },

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },

  {
    rules: {
      indent: 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'no-console': 'warn',
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-warning-comments': ['warn', { terms: ['todo', 'fixme'], location: 'anywhere' }],
    },
  },

  {
    files: testFiles,
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      // '@typescript-eslint/no-unsafe-member-access': 'off',
      // '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  eslintConfigPrettier,
]);
