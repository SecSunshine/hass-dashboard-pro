import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/hass-dashboard-pro.js',
    format: 'es',
    sourcemap: !production,
    inlineDynamicImports: true,
  },
  plugins: [nodeResolve({ browser: true, preferBuiltins: false }), commonjs(), typescript({ tsconfig: './tsconfig.json', sourceMap: !production }), production && terser({ format: { comments: false } })].filter(Boolean),
};
