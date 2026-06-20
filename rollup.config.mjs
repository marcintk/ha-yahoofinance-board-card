import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const version = process.env.VERSION ?? '0.0.0-dev';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/card.js',
    format: 'es',
    banner: `/* ha-yahoofinance-board-card v${version} */`,
    intro: `const __CARD_VERSION__ = '${version}';`,
  },
  plugins: [
    resolve(),
    typescript(),
    ...(process.env.NODE_ENV === 'production' ? [terser()] : []),
  ],
};
