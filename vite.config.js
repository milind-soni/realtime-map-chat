import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const path = fileURLToPath(import.meta.url);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    root: join(dirname(path), "client"),
    plugins: [react()],
    define: {
      'import.meta.env.VITE_MAPBOX_API_KEY': JSON.stringify(env.MAPBOX_API_KEY)
    }
  };
});
