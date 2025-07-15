import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'commander',
        'chalk',
        'ora',
        'pg',
        'mongodb',
        'path',
        'fs',
        'fs/promises',
        'url',
        'util',
        'stream',
        'process',
        'clipboardy',
        'os',
        'dotenv',
        '@inquirer/prompts',
        '@inquirer/checkbox',
        '@inquirer/core',
        'node:async_hooks',
        'node:events',
        'node:fs',
        'node:path',
        'node:process',
        'node:readline',
        'node:stream',
        'node:tty',
        'node:util',
        'readline',
        'async_hooks',
        'events',
        'tty',
      ],
    },
    sourcemap: true,
    target: 'node16',
    outDir: 'dist',
    emptyOutDir: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      requireReturnsDefault: true,
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  optimizeDeps: {
    include: ['pg', 'clipboardy'],
    exclude: ['fs', 'path', 'os', '@inquirer/prompts', '@inquirer/checkbox'],
  },
});
