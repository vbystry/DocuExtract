module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'next/core-web-vitals',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended'
  ],
  rules: {
    // Turn off no-explicit-any rule
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Turn off unused variables
    '@typescript-eslint/no-unused-vars': 'off',
    
    // React specific rules
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    'react/no-unescaped-entities': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
}; 