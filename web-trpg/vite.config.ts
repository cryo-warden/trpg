import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/trpg/",
  // Bind to 0.0.0.0 so the dev server is reachable from other devices on the
  // LAN (e.g. manual testing on a phone).
  server: { host: true },
});
