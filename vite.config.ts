import { defineConfig } from 'vite';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    {
      name: 'copy-package-json',
      writeBundle() {
        copyFileSync('package.json', 'dist/package.json');
      }
    }
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'mcp/server/index': resolve(__dirname, 'src/mcp/server/index.ts')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName === 'mcp/server/index') {
          return `mcp/server/index.${format === 'es' ? 'js' : 'cjs'}`;
        }
        return `index.${format === 'es' ? 'js' : 'cjs'}`;
      },
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
        'child_process',
        'crypto',
        '@inquirer/prompts',
        '@inquirer/checkbox',
        '@inquirer/core',
        '@modelcontextprotocol/sdk',
        'better-sqlite3',
        'node:async_hooks',
        'node:events',
        'node:fs',
        'node:path',
        'node:process',
        'node:readline',
        'node:stream',
        'node:tty',
        'node:util',
        'node:child_process',
        'node:crypto',
        'readline',
        'async_hooks',
        'events',
        'tty',
      ],
    },
    sourcemap: true,
    target: 'node16',
    outDir: 'dist',
    emptyOutDir: false,
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
    exclude: [
      'fs',
      'path',
      'os',
      '@inquirer/prompts',
      '@inquirer/checkbox',
      'better-sqlite3',
      '@modelcontextprotocol/sdk',
      'child_process',
      'crypto',
    ],
  },
});
