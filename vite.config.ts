import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  // Always read from environment variable, fallback to 8080
  const port = parseInt(process.env.PORT || "8080", 10);
  const host = "0.0.0.0";
  
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
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
