import { fileURLToPath, URL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "logo.svg"],
      manifest: {
        name: "Flipbook.pics",
        short_name: "Flipbook.pics",
        description:
          "Pick your video and cover to generate your own offline flipbook animation!",
        theme_color: "#00BD7E",
      },
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // Silence Sass deprecation warnings to prevent build noise
        // - legacy-js-api: Dart Sass 2.0.0 will remove support for the legacy JavaScript API
        // - fs-importer-cwd: Using current working directory as implicit load path is deprecated
        // These settings ensure a clean build output while maintaining compatibility
        silenceDeprecations: ["legacy-js-api", "fs-importer-cwd"],
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  define: {
    global: "globalThis",
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        manualChunks: undefined,
      },
    },
  },
});
