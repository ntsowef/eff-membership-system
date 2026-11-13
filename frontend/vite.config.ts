/// <reference types="vitest" />
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

const VIRTUAL_MUI_BARREL = '\0virtual:mui-icons-material-barrel'
const VIRTUAL_MUI_ITEM_PREFIX = '\0virtual:mui-icons-material-item:'
let cachedMuiBarrelCode: string | null = null

/**
 * Replaces the 10,600+ file @mui/icons-material barrel during Vitest runs so
 * Windows/CI test workers do not stall transforming every icon module on startup.
 */
function vitestMuiIconsStubPlugin(): Plugin {
  return {
    name: 'vitest-mui-icons-stub',
    enforce: 'pre',
    resolveId(id) {
      if (process.env.VITEST !== 'true') return null
      if (id === '@mui/icons-material') return VIRTUAL_MUI_BARREL
      if (id.startsWith('@mui/icons-material/')) {
        return `${VIRTUAL_MUI_ITEM_PREFIX}${id.slice('@mui/icons-material/'.length)}`
      }
      return null
    },
    load(id) {
      if (process.env.VITEST !== 'true') return null
      if (id === VIRTUAL_MUI_BARREL) {
        if (!cachedMuiBarrelCode) {
          const idxPath = path.resolve(__dirname, 'node_modules/@mui/icons-material/esm/index.js')
          const src = fs.readFileSync(idxPath, 'utf8')
          const names = Array.from(
            src.matchAll(/export\s+\{\s*default\s+as\s+([A-Za-z0-9_$]+)\s*\}/g),
            (m) => m[1]
          )
          cachedMuiBarrelCode = [
            "import React from 'react';",
            "const makeIcon = (name) => { const Icon = (props) => React.createElement('svg', { 'aria-hidden': true, 'data-testid': `mui-icon-${name}`, ...props }); Icon.displayName = name; return Icon; };",
            ...names.map((name) => `export const ${name} = makeIcon('${name}');`),
          ].join('\n')
        }
        return cachedMuiBarrelCode
      }
      if (id.startsWith(VIRTUAL_MUI_ITEM_PREFIX)) {
        const raw = id.slice(VIRTUAL_MUI_ITEM_PREFIX.length).replace(/[^A-Za-z0-9_$]/g, '_')
        return [
          "import React from 'react';",
          `const Icon = (props) => React.createElement('svg', { 'aria-hidden': true, 'data-testid': 'mui-icon-${raw}', ...props });`,
          `Icon.displayName = '${raw}';`,
          'export default Icon;',
        ].join('\n')
      }
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vitestMuiIconsStubPlugin()],
  server: {
    host: '0.0.0.0', // Allow external access
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    exclude: [
      'chunk-MYSE25TX.js',
      'chunk-O7L3EQ5H.js',
      'chunk-XYUXPGWQ.js',
      'chunk-J6POAYNW.js',
      'chunk-JFTWKUK5.js',
      'chunk-OWRKKZ7G.js',
      'chunk-5LXP2RUJ.js',
      'chunk-VASY6R4K.js',
      'chunk-VKOGV2SF.js',
      'chunk-JXGDMFB6.js',
      'chunk-SJNWXYXV.js',
      'chunk-HE43T4XM.js',
    ],
    force: true, // Force re-optimization
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    exclude: [
      ...configDefaults.exclude,
      // Pre-existing legacy Jest-syntax spec pending migration to Vitest
      'src/components/common/SessionWarningDialog.test.tsx',
    ],
  },
})
