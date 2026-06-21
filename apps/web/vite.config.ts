import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL ?? 'http://localhost:4000/api/v1'
    ),
  },
})
