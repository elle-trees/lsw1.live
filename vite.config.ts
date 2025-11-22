import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";

export default defineConfig(({ mode }) => {
  // Always read from environment variable, fallback to 8080
  const port = parseInt(process.env.PORT || "8080", 10);
  const host = "0.0.0.0";
  const isProduction = mode === "production";
  
  return {
    // Enable Rolldown's native plugins for better performance
    experimental: {
      enableNativePlugin: 'v1',
    },
    server: {
      host: host,
      port: port,
      strictPort: true,
    },
    preview: {
      host: host,
      port: port,
      strictPort: true,
      cors: true,
    },
    plugins: [
      react(),
      // Bundle analyzer - only in production to avoid dev overhead
      isProduction && visualizer({
        filename: "dist/stats.html",
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: "treemap", // or "sunburst", "network"
      }),
      // Compression plugin - generates .gz and .br files for better performance
      isProduction && viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024, // Only compress files larger than 1KB
        deleteOriginFile: false, // Keep original files
      }),
      isProduction && viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024,
        deleteOriginFile: false,
      }),
    ].filter(Boolean), // Remove false values
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Optimize build performance
      // Rolldown has built-in minification, no need to specify
      sourcemap: false, // Disable sourcemaps in production for faster builds (enable if needed for debugging)
      cssCodeSplit: true, // Split CSS into separate files for better caching
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separate vendor chunks for better caching
            if (id.includes('node_modules')) {
              // Firebase and related - large dependency, separate for better caching
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // React and React DOM - core framework
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'vendor-react';
              }
              // Radix UI components - large UI library
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              // Recharts (only used on Stats page) - large charting library
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              // React Router - routing library
              if (id.includes('react-router')) {
                return 'vendor-router';
              }
              // React Query - data fetching
              if (id.includes('@tanstack/react-query')) {
                return 'vendor-query';
              }
              // Framer Motion - animation library (can be large)
              if (id.includes('framer-motion')) {
                return 'vendor-animations';
              }
              // Other large dependencies
              if (id.includes('lucide-react') || id.includes('date-fns')) {
                return 'vendor-utils';
              }
              // Everything else from node_modules
              return 'vendor';
            }
          },
        },
      },
      // Target modern browsers for smaller bundles
      target: "esnext",
      // Increase chunk size warning limit since we're splitting better
      chunkSizeWarningLimit: 600,
    },
  };
});
