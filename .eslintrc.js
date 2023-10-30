module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    requireConfigFile: false
  },
  extends: [
    'eslint:recommended',
  ],
  rules: {
    'no-console': 'off',
    'no-debugger': 'warn'
  },
  env: {
    browser: true,
    node: true,
  }
};