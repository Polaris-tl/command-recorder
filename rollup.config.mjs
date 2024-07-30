import { defineConfig } from 'rollup'
import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs'
import babel from '@rollup/plugin-babel'
import { readFileSync } from 'fs'
import replace from '@rollup/plugin-replace'

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))

export default defineConfig({
  input: './src/index.ts',
  plugins: [
    typescript(),
    commonjs(),
    resolve({
      extensions: ['.js', '.ts']
    }),
    babel({ babelHelpers: 'bundled' }),
    replace({
      preventAssignment: true,
      values: {
        __VERSION__: packageJson.version
      },
      delimiters: ['', '']
    }),
    terser()
  ],
  output: [
    {
      dir: './dist',
      format: 'cjs',
      sourcemap: false,
      preserveModules: false
    }
  ]
})
