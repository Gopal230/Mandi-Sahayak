import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    ignores: ['dist/**', 'api/**', 'docs/**', 'server/**', 'server/dist/**'],
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'react-hooks/purity': 'off',
    },
  },
])
