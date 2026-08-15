import { test, expect } from "bun:test";
import { Glob } from "bun";
import { join, relative } from "node:path";

/**
 * The "more interesting" marker is an OUTLINE because box-shadow is
 * last-write-wins: the Panel drop shadow and the focus glow once replaced
 * an inset-shadow marker outright, and the class-presence unit tests never
 * noticed (they see no stylesheets). The marker only stays collision-free
 * while the outline channel belongs to it alone — this test reserves it.
 */

const SRC_DIR = import.meta.dir;

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const cssSources = async (): Promise<Map<string, string>> => {
  const sources = new Map<string, string>();
  for await (const path of new Glob("**/*.css").scan(SRC_DIR)) {
    sources.set(path, stripComments(await Bun.file(join(SRC_DIR, path)).text()));
  }
  return sources;
};

test("only the .interesting rule uses the outline channel", async () => {
  const sources = await cssSources();
  expect(sources.size).toBeGreaterThan(0);

  const filesUsingOutline = [...sources.entries()]
    .filter(([, css]) => /\boutline\b/.test(css))
    .map(([path]) => path);
  expect(filesUsingOutline).toEqual(["index.css"]);

  // Within index.css, outline appears only inside the .interesting rule.
  const indexCss = sources.get("index.css") ?? "";
  const interestingRule = indexCss.match(/\.interesting\s*\{[^}]*\}/)?.[0] ?? "";
  expect(interestingRule).toContain("outline: 2px solid");
  expect(interestingRule).toContain("outline-offset: -2px");
  const outsideRule = indexCss.replace(interestingRule, "");
  expect(outsideRule).not.toMatch(/\boutline\b/);
});

test("no rule counterfeits the marker in the box-shadow channel", async () => {
  // The dragging chip once restated the golden inset as a box-shadow —
  // the same collision papered over locally. The marker's color belongs
  // to inner-border duty only through the outline rule; glows (non-inset
  // shadows) in the marker color remain fine.
  const sources = await cssSources();
  for (const [path, css] of sources) {
    const counterfeit = /box-shadow[^;]*inset[^;]*#d9a521/.test(css);
    expect(
      counterfeit,
      `${relative(SRC_DIR, join(SRC_DIR, path))} restates the marker as an inset box-shadow`,
    ).toBe(false);
  }
});
