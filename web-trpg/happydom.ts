import { plugin } from "bun";
import { afterEach } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Stub `import "./x.css"` so components can be rendered in tests without a
// bundler processing their stylesheets.
plugin({
  name: "ignore-css",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
  },
});

// Register a happy-dom DOM into the global scope so `bun test` can render
// React components/hooks. Loaded as a bun test preload (bunfig.toml [test]).
// Guarded so double-preload is a no-op.
const NativeWebSocket = globalThis.WebSocket;
if (typeof document === "undefined") {
  GlobalRegistrator.register();
}
// Keep bun's native WebSocket (happy-dom replaces it) so E2E tests can open a
// real connection to a running SpacetimeDB instance.
globalThis.WebSocket = NativeWebSocket;

// Unmount rendered React trees after each test so DOM does not leak between
// tests (imported lazily, after the DOM is registered above).
const { cleanup } = await import("@testing-library/react");
afterEach(cleanup);
