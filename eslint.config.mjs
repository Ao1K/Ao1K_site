import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

export default [
  { ignores: ['.next/**', 'amplify/**', 'public/**'] },
  ...nextCoreWebVitals,
];