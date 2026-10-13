import { defineConfig } from 'vite';

// Relative base so the build works on GitHub Pages and inside Capacitor/Tauri wrappers.
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
