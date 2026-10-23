import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Explicitly register the existing React and Tailwind v4 plugins.
// Without this config, @theme and @import "tailwindcss" reach the CSS minifier unprocessed.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
