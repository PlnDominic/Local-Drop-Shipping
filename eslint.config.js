const js = require('@eslint/js')
const globals = require('globals')
const reactHooks = require('eslint-plugin-react-hooks')
const tseslint = require('typescript-eslint')

module.exports = [
  {
    ignores: ['dist', '.next', 'next-env.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
]
