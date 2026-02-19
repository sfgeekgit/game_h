import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default tseslint.config(
  // Global ignores
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'frontend/public/**'],
  },

  // Base JS rules
  eslint.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommended,

  // General overrides
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },

  // React config for frontend files
  {
    files: ['frontend/src/**/*.tsx', 'frontend/src/**/*.ts'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },

  // mysql2 restriction: only backend/db/ may import mysql2
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['backend/src/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['mysql2', 'mysql2/*'],
              message:
                'mysql2 may only be imported from backend/db/. Use the query wrapper instead.',
            },
          ],
        },
      ],
    },
  },

  // Prettier — must be last to override formatting rules
  prettierConfig,
);
