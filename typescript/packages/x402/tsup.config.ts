import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'shared/index': 'src/shared/index.ts'
    },
    format: 'esm',
    dts: {
      resolve: true,
    },
    sourcemap: true,
    outDir: 'dist/esm',
    clean: true,
    target: 'node16'
  },
  {
    entry: {
      'index': 'src/index.ts',
      'shared/index': 'src/shared/index.ts'
    },
    format: 'cjs',
    dts: {
      resolve: true,
    },
    sourcemap: true,
    outDir: 'dist/cjs',
    clean: false,
    target: 'node16'
  }
])
