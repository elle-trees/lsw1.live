import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import viteCompression from "vite-plugin-compression";
import { VitePWA } from "vite-plugin-pwa";
import checker from "vite-plugin-checker";
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';

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
    // Optimize dependency pre-bundling
    optimizeDeps: {
      // Include dependencies that should be pre-bundled
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        'lucide-react',
        'framer-motion',
        'date-fns',
      ],
      // Exclude dependencies from pre-bundling (let them be handled by the bundler)
      exclude: ['recharts'], // Large library, better to code-split
      // Force optimization for better dev experience
      force: false, // Set to true to force re-optimization when needed
    },
    server: {
      host: host,
      port: port,
      strictPort: true,
      // Enable HMR (Hot Module Replacement) for instant updates
      hmr: {
        protocol: 'ws',
        host: host,
        port: port,
      },
      // Watch configuration for better file change detection
      watch: {
        // Use polling for better compatibility (especially in Docker/VM environments)
        usePolling: false,
        // Watch for changes in these directories
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.git/**',
        ],
      },
      // Faster file system operations
      fs: {
        // Allow serving files from one level up to the project root
        strict: false,
        // Allow serving files from these directories
        allow: ['..'],
      },
    },
    preview: {
      host: host,
      port: port,
      strictPort: true,
      cors: true,
    },
    plugins: [
      TanStackRouterVite(),
      react(),
      // Type checking in dev mode only (faster than tsc watch)
      // Disable in production builds for faster compilation
      // Note: ESLint checking is disabled here due to compatibility issues with ESLint 9.x
      // Use 'npm run lint:eslint' separately for linting
      // Note: TypeScript checking is disabled to avoid blocking dev server
      // Run 'tsc --project tsconfig.app.json --noEmit' manually to check types
      // !isProduction && checker({
      //   typescript: {
      //     tsconfigPath: "./tsconfig.app.json",
      //     buildMode: false, // Only check in dev, not during build
      //   },
      // }),
      // PWA plugin - enables Progressive Web App features
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.ico", "robots.txt", "placeholder.svg"],
        manifest: {
          name: "lsw1.dev - Lego Star Wars Speedrunning",
          short_name: "lsw1.dev",
          description: "Lego Star Wars speedrunning leaderboards and community",
          theme_color: "#ffffff",
          background_color: "#ffffff",
          display: "standalone",
          icons: [
            {
              src: "/favicon.ico",
              sizes: "64x64 32x32 24x24 16x16",
              type: "image/x-icon",
            },
            {
              src: "/placeholder.svg",
              sizes: "192x192",
              type: "image/svg+xml",
            },
            {
              src: "/placeholder.svg",
              sizes: "512x512",
              type: "image/svg+xml",
            },
          ],
        },
        workbox: {
          // Optimize glob patterns - exclude dev files, source maps, and stats
          globPatterns: [
            "**/*.{js,css,html,ico,png,svg,woff2}",
            "!**/*.map",
            "!**/stats.html",
            "!**/stats.html.gz",
            "!**/stats.html.br",
          ],
          // Exclude source maps and dev files from cache
          globIgnores: [
            "**/*.map",
            "**/stats.html*",
            "**/node_modules/**/*",
          ],
          // Skip waiting and claim clients immediately for faster updates
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/.*\.firebase(?:app|io)\.com\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "firebase-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        devOptions: {
          enabled: false, // Disable PWA in dev mode for faster development
        },
      }),
      // Bundle analyzer - only in production to avoid dev overhead
      // Disable during regular builds for speed, enable when needed for analysis
      isProduction && process.env.ANALYZE && visualizer({
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
      // Reduce chunk size warnings threshold
      chunkSizeWarningLimit: 600,
      // Minify CSS
      cssMinify: true,
      // Enable minification (Rolldown handles this efficiently)
      minify: 'esbuild', // Use esbuild for faster minification
      // Optimize build output
      emptyOutDir: true,
      // Reduce build output verbosity
      assetsInlineLimit: 4096, // Inline assets smaller than 4KB
      // Improve build performance
      target: "esnext", // Target modern browsers for smaller bundles
      // Disable compressed size reporting to speed up build
      reportCompressedSize: false,
      // Use terser for better minification (optional, esbuild is faster but terser produces smaller bundles)
      // minify: 'terser', // Uncomment if you want smaller bundles at the cost of build time
      // Optimize chunking strategy
      rollupOptions: {
        output: {
          // Optimize chunk file names for better caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          manualChunks: (id) => {
            // Separate vendor chunks for better caching and parallel loading
            if (id.includes('node_modules')) {
              // Firebase and related - large dependency, separate for better caching
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // React and React DOM - core framework (most frequently used)
              if (id.includes('react-dom') || id.includes('react/')) {
                return 'vendor-react';
              }
              // Radix UI components - large UI library (used across many pages)
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }
              // Recharts (only used on Stats page) - large charting library, lazy load
              // This will be code-split since it's lazy loaded
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
              // Framer Motion - animation library (can be large, used selectively)
              if (id.includes('framer-motion')) {
                return 'vendor-animations';
              }
              // Uploadthing - file upload library (only on specific pages)
              if (id.includes('uploadthing') || id.includes('@uploadthing')) {
                return 'vendor-upload';
              }
              // Form libraries (react-hook-form, zod, etc.) - used on submit/settings pages
              if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
                return 'vendor-forms';
              }
              // Icon and utility libraries
              if (id.includes('lucide-react') || id.includes('date-fns')) {
                return 'vendor-utils';
              }
              // Everything else from node_modules
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
