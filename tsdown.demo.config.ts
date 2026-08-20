import { defineConfig } from 'tsdown'

/**
 * Demo-mode build: a standalone ES module bundle (React + anime.js + all
 * views inlined) loaded by `docs/demo.html` via `<script type="module">`,
 * rendered with a rich synthetic dataset. Not part of the shipped plugin
 * bundle — built on demand via `pnpm demo:build`.
 */
export default defineConfig({
  entry: { demo: 'src/client/demo.tsx' },
  outDir: 'lib',
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: false,
  // Inline every runtime dependency so the page needs no CDN or module map.
  deps: {
    alwaysBundle: (id: string) =>
      ['react', 'react-dom', 'react/jsx-runtime', 'animejs', 'zod']
        .some(p => id === p || id.startsWith(`${p}/`)),
  },
  outputOptions: {
    entryFileNames: 'demo.js',
  },
})
