import { plugin } from "bun";
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
if (typeof document === "undefined") {
  GlobalRegistrator.register();
}
