module.exports = {
  extends: [
    'next/core-web-vitals',
    // other extends...
  ],
  rules: {
    // Disable the no-explicit-any rule
    '@typescript-eslint/no-explicit-any': 'off',
    
    // Disable unused variables warning
    '@typescript-eslint/no-unused-vars': 'off',
    
    // Keep your other rules
  }
}; 