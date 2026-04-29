import path from 'path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'

const LIBRARY_NAME = 'alephscript-escribiente-dashboard-recorder'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}'
  },
  plugins: [vue(), cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'ui/index.js'),
      name: LIBRARY_NAME,
      formats: ['umd'],
      fileName: () => 'escribiente-dashboard-recorder.umd.js'
    },
    rollupOptions: {
      external: ['vue', 'vuex'],
      output: {
        globals: {
          vue: 'Vue',
          vuex: 'vuex'
        }
      }
    },
    outDir: 'resources',
    emptyOutDir: false
  }
})
