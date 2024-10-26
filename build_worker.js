const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.resolve(__dirname, 'src/ts/workers/spectrogramWorker.ts')],
  outfile: path.resolve(__dirname, 'src/ts/workers/spectrogramWorker.js'),
  bundle: true,
  format: 'esm',
  target: 'esnext',
  platform: 'browser',
  sourcemap: true,
}).catch(() => process.exit(1));
