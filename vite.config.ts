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
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,mp4}"],
        navigateFallback: "/offline.html",
        navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // <== 365 days
              },
            },
          },
        ],
      },
      includeAssets: [
        "favicon.ico",
        "kekeflipnote.mp4",
        "android-chrome-192x192.png",
        "android-chrome-512x512.png",
        "browserconfig.xml",
        "offline.html",
        "preview.png",
      ],
      manifest: {
        name: "Flipbook.pics - Video to Flipbook Generator",
        short_name: "Flipbook.pics",
        description:
          "Pick your video and cover to generate your own offline flipbook animation! Create printable flipbooks from video files.",
        theme_color: "#00BD7E",
        background_color: "#ffffff",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        categories: ["productivity", "graphics", "utilities"],
        lang: "en",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "48x48",
            type: "image/x-icon",
          },
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        screenshots: [
          {
            src: "/preview.png",
            sizes: "250x250",
            type: "image/png",
            form_factor: "narrow",
          },
        ],
      },
      devOptions: {
        enabled: true,
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
