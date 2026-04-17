import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx,js,cjs}'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['netlify/functions/**/*.cjs', 'src/**/*.ts'],
      exclude: ['tests/**', 'node_modules/**'],
    },
  },
});
