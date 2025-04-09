import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: 'esm',
    outDir: 'dist/esm',
    dts: {
      resolve: true,
      entry: 'src/index.ts',
    },
    clean: true,
    sourcemap: true,
    target: 'node16'
  },
  {
    entry: ['src/index.ts'],
    format: 'cjs',
    outDir: 'dist/cjs',
    sourcemap: true,
    clean: false,
    target: 'node16'
  }
])
