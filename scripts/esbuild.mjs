import { build } from 'esbuild';

const commonConfig = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  sourcemap: true,
  platform: 'node',
  target: 'node16',
  external: ['properties'],
};

async function buildAll() {
  // Build ESM version
  await build({
    ...commonConfig,
    format: 'esm',
    outfile: 'dist/index.mjs',
  });

  // Build CJS version
  await build({
    ...commonConfig,
    format: 'cjs',
    outfile: 'dist/index.js',
  });
}

try {
  await buildAll();
} catch (error) {
  process.exitCode = 1;
  console.error(error);
}
