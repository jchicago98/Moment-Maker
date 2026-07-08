import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/assets\/(.*)$/, replacement: path.resolve(__dirname, 'assets') + '/$1' },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, 'src') + '/$1' },
    ],
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
