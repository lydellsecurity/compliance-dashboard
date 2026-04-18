import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Bundle warning was fired at ~548 kB for the main index chunk. Split
    // heavy third-party deps into their own chunks so they cache separately
    // and don't block first paint.
    rollupOptions: {
      output: {
        manualChunks: {
          // Supabase client — pulled in on every page but rarely changes.
          supabase: ['@supabase/supabase-js'],
          // Framer Motion — large; used across modals, drawers, dashboard.
          motion: ['framer-motion'],
          // Recharts — big dependency only loaded by the reporting tab.
          charts: ['recharts'],
          // PDF generation runs via Netlify functions, but pdfkit bundles
          // with @azure/* + aws-sdk refs leak into client as side effects.
          // Bucket the lucide icon set so it caches across deploys.
          icons: ['lucide-react'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
