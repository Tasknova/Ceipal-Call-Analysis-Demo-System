import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    strictPort: false, // Allow Vite to try other ports if 3000 is in use
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  plugins: [
    react({
      fastRefresh: true,
      include: "**/*.{jsx,tsx}",
    }), 
    mode === "development" && componentTagger()
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Add timestamp to filenames for cache busting
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  }
}));
