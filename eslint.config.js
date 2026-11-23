import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default [
  { ignores: ['dist/', '.astro/', 'node_modules/', 'drizzle/'] },
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  // Berkas tipe bawaan Astro memang memakai triple-slash reference.
  { files: ['src/env.d.ts'], rules: { '@typescript-eslint/triple-slash-reference': 'off' } },
];
