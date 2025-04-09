import { defineConfig } from 'tsup'

const baseConfig = {
  entry: {
    'index': 'src/index.ts',
    'shared/index': 'src/shared/index.ts',
    'client/index': 'src/client/index.ts',
    'facilitator/index': 'src/facilitator/index.ts',
    'verify/index': 'src/verify/index.ts',
    'types/index': 'src/types/index.ts'
  },
  dts: {
    resolve: true,
  },
  sourcemap: true,
  outDir: 'dist/esm',
  clean: true,
  target: 'node16'
}

export default defineConfig([
  {
    ...baseConfig,
    format: "esm",
    outDir: "dist/esm",
    clean: true
  },
  {
    ...baseConfig,
    format: "cjs",
    outDir: "dist/cjs",
    clean: false
  }
])