import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Core game logic must be provable without a DOM. Anything that needs the
    // DOM belongs in the shell and is verified in a browser instead.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
