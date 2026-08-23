import { defineConfig, ProxyOptions } from "vite";
import react from "@vitejs/plugin-react";

// The client dials SpacetimeDB same-origin (see StdbContext): every /v1
// request that reaches the web server -- dev or preview -- is relayed to the
// local SpacetimeDB face named by TRPG_STDB_PORT, the SAME env var the cw
// manifest declares. Same-origin is what makes the client work identically
// from the LAN and from the public tunnel (which carries only 443): the
// browser never needs a separate host:port for the database.
const stdbProxy = (target: string): Record<string, ProxyOptions> => ({
  "/v1": { target, ws: true, changeOrigin: true, secure: false },
});

// Deliberately NO default port: every serving context states which
// SpacetimeDB instance it relays to (dev scripts pass 3000 explicitly; cw
// injects the prod value), and one that forgot fails loudly at startup
// instead of silently talking to the wrong database. Builds don't relay, so
// `vite build` needs no port.
const requireStdbPort = (): string => {
  const port = process.env.TRPG_STDB_PORT;
  if (port == null || port === "") {
    throw new Error(
      "TRPG_STDB_PORT must be set to serve: the web server relays /v1 to that local SpacetimeDB instance.",
    );
  }
  return port;
};

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  // `command` is "serve" for both dev and preview; only builds skip the relay.
  const stdbPort = command === "serve" ? requireStdbPort() : null;
  return {
    plugins: [react()],
    base: "/trpg/",
    // The client bakes exactly the vars the cw manifest declares — no
    // parallel VITE_* names to drift out of sync.
    envPrefix: "TRPG_",
    // Bind to 0.0.0.0 so the dev server is reachable from other devices on the
    // LAN (e.g. manual testing on a phone). Port 5180 keeps DEV clear of the
    // production web port; prod (vite preview) gets its port explicitly from
    // TRPG_WEB_PORT via scripts/prod-web.sh.
    server: {
      host: true,
      port: 5180,
      // Dev relays straight to the plain-HTTP dev instance.
      ...(stdbPort === null ? {} : { proxy: stdbProxy(`http://localhost:${stdbPort}`) }),
    },
    // Production (vite preview behind the cw proxy) is reached through
    // corywatson.dev hostnames; the leading dot allows every subdomain, so a
    // future dedicated host needs no config change.
    preview: {
      allowedHosts: [".corywatson.dev"],
      // Preview relays to the cw proxy's fixed TLS forwarder for the
      // spacetimedb process (its real port churns per deploy; the forwarder
      // is the stable face). The forwarder serves the public domain's
      // certificate, which can never match localhost -- hence secure: false
      // on this loopback hop.
      ...(stdbPort === null ? {} : { proxy: stdbProxy(`https://localhost:${stdbPort}`) }),
    },
  };
});
