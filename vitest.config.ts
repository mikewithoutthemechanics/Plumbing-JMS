import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup-tests.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    pool: 'threads',
    threads: {
      // Enable VM for faster test execution
      enabled: true,
      // Use workerThreads for better stability
      singleFile: false,
    },
  },
});