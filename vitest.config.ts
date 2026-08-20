import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Day-bucket and hour-profile assertions are local-timezone dependent;
    // pin UTC so every worker computes the same local dates.
    env: { TZ: 'UTC' },
  },
})
