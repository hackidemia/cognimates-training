/**
 * ESLint configuration
 */
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // Essential Code Quality Rules
    'no-unused-vars': ['error', { args: 'after-used' }],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': ['error', { allowNamedFunctions: true }],
    
    // Readability and Consistency
    'camelcase': ['error', { properties: 'never' }],
    'indent': ['error', 2, { SwitchCase: 1 }],
    'quotes': ['error', 'single', { allowTemplateLiterals: true }],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'eol-last': ['error', 'always'],

    // Spacing Rules
    'arrow-spacing': 'error',
    'block-spacing': 'error',
    'comma-spacing': ['error', { before: false, after: true }],
    'keyword-spacing': 'error',
    'key-spacing': ['error', { beforeColon: false, afterColon: true }],
    'object-curly-spacing': ['error', 'always'],
    'space-before-blocks': 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always',
    }],
    'space-in-parens': ['error', 'never'],
    'space-infix-ops': 'error',
    
    // Documentation
    'valid-jsdoc': ['warn', {
      requireReturn: false,
      requireParamType: true,
      requireReturnType: true,
    }],
    
    // Line Length and Style
    'max-len': ['warn', { 
      code: 100, 
      ignoreUrls: true, 
      ignoreStrings: true, 
      ignoreTemplateLiterals: true,
      ignoreComments: true,
    }],
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
    
    // Style Preferences
    'no-console': 'warn', // Prefer structured logging in production
    'prefer-template': 'error',
    'object-shorthand': 'error',
  },
};
