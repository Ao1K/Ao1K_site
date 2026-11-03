import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import noMoveParsing from './eslint-rules/no-move-parsing.mjs';

const config = [
  { ignores: ['.next/**', 'amplify/**', 'public/**'] },
  ...nextCoreWebVitals,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['utils/parser/**', 'scripts/verifyParser.ts'],
    plugins: { ao1k: { rules: { 'no-move-parsing': noMoveParsing } } },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: { 'ao1k/no-move-parsing': ['error', { allowSplitOn: ['viewBox', 'pts', 'step'] }] },
  },
  {
    files: ['composables/recon/cubeImageCapture.ts'],
    rules: { 'ao1k/no-move-parsing': ['error', { allowWhitespaceSplit: true }] },
  },
];

export default config;
