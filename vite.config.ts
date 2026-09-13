import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' keeps asset URLs relative, so the built app also works from file://
export default defineConfig({
  plugins: [react()],
  base: './',
});