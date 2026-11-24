// @ts-check
import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [preact({ compat: true })],
  security: { checkOrigin: true },
  vite: {
    plugins: [tailwindcss()],
    // GSAP dimuat dengan import() dinamis (src/lib/motion), sehingga Vite baru "menemukannya" saat halaman
    // pertama dibuka, lalu mengoptimasi ulang dan memuat ulang halaman; browser yang sudah terbuka bisa
    // mendapat 504 "Outdated Optimize Dep" dan efek gerak mati diam-diam. Didaftarkan di sini agar dioptimasi
    // sejak server dev dinyalakan. Hanya berlaku di mode dev.
    optimizeDeps: { include: ['gsap', 'gsap/ScrollTrigger'] },
  },
  env: {
    schema: {
      PUBLIC_SITE_URL: envField.string({
        context: 'client',
        access: 'public',
        default: 'http://localhost:4321',
      }),
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      BETTER_AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
});
