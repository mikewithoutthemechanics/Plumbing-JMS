import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup-tests.ts'],
    // Exclude Playwright e2e specs (run via `npm run test:e2e`) so Vitest doesn't
    // try to execute them as unit tests.
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
  },
});
