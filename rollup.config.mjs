import { defineConfig } from 'rollup'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import { readFileSync } from 'fs'
import replace from '@rollup/plugin-replace'
import { builtinModules } from 'module'

const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
const dependencies = Object.keys(packageJson.dependencies || {})
const peerDependencies = Object.keys(packageJson.peerDependencies || {})
const builtins = [...builtinModules, ...builtinModules.map((name) => `node:${name}`)]

export default defineConfig({
  input: './src/index.ts',
  external: [...dependencies, ...peerDependencies, ...builtins],
  plugins: [
    typescript(),
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
