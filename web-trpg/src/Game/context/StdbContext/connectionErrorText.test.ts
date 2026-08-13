import { test, expect } from "bun:test";
import { describeConnectionError } from "./connectionErrorText";

test("a real Error renders its message", () => {
  expect(describeConnectionError(new Error("boom"))).toBe("boom");
});

test("a message-less Error falls back to its name", () => {
  expect(describeConnectionError(new TypeError(""))).toBe("TypeError");
});

test("a DOM event never renders as [object Object]", () => {
  // The exact shape ws.onerror produces: an Event with no reason inside.
  const rendered = describeConnectionError(new Event("error"));
  expect(rendered).toBe("The connection attempt failed.");
  expect(rendered).not.toContain("object Object");
});

test("strings pass through; empty values get the fallback", () => {
  expect(describeConnectionError("server said no")).toBe("server said no");
  expect(describeConnectionError("")).toBe(
    "The connection failed for an unreportable reason.",
  );
});

test("plain objects serialize instead of coercing", () => {
  expect(describeConnectionError({ code: 1006 })).toBe('{"code":1006}');
});

test("unserializable values get the fallback, not a crash", () => {
  const circular: { self?: unknown } = {};
  circular.self = circular;
  expect(describeConnectionError(circular)).toBe(
    "The connection failed for an unreportable reason.",
  );
});
