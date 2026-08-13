import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/trpg/",
  // Bind to 0.0.0.0 so the dev server is reachable from other devices on the
  // LAN (e.g. manual testing on a phone). Port 5180 keeps DEV clear of the
  // production web port; prod (vite preview) gets its port explicitly from
  // TRPG_WEB_PORT via scripts/prod-web.sh.
  server: { host: true, port: 5180 },
  // Production (vite preview behind the cw proxy) is reached through
  // corywatson.dev hostnames; the leading dot allows every subdomain, so a
  // future dedicated host needs no config change.
  preview: { allowedHosts: [".corywatson.dev"] },
});
