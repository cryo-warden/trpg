import { GlobalRegistrator } from "@happy-dom/global-registrator";

// Registers a happy-dom DOM into the global scope so `bun test` can render
// React components/hooks. Loaded as a bun test preload (bunfig.toml [test] and
// the test-web command's --preload). Guarded so double-preload is a no-op.
if (typeof document === "undefined") {
  GlobalRegistrator.register();
}
