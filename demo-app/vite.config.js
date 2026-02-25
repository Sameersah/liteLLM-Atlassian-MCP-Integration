import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime so we don't need React in scope for JSX.
      // We still expose React globally in main.jsx for any code that expects window.React.
      jsxRuntime: 'automatic',
    }),
  ],
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
