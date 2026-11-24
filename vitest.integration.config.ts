import { defineConfig } from 'vitest/config';

// Tes integrasi memakai Postgres sungguhan dan dijalankan berurutan (tanpa paralel antar berkas)
// supaya data uji tidak saling mengganggu. Konfigurasi unit ada di vitest.config.ts.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    setupFiles: ['tests/integration/setup-env.ts'],
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
});
