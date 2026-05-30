import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import json from '@rollup/plugin-json';

const dev = process.env.ROLLUP_WATCH;

export default {
  input: 'src/ha-vacuum-commander-card.ts',
  output: {
    file: 'dist/ha-vacuum-commander-card.js',
    format: 'es',
    sourcemap: dev ? true : false,
    inlineDynamicImports: true,
  },
  plugins: [
    resolve(),
    commonjs(),
    json(),
    typescript(),
    !dev && terser({
      format: {
        comments: false,
      },
    }),
  ].filter(Boolean),
};
