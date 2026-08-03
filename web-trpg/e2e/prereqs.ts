/**
 * Verify the external tools an E2E run needs, before using them. E2E tests
 * drive a real SpacetimeDB instance via the `spacetime` CLI; if it is missing
 * we fail fast with a clear message rather than deep inside a scenario.
 */
export type PrereqResult = { name: string; ok: boolean; detail: string };

const tryRun = (cmd: string[]): { code: number; out: string } => {
  try {
    const result = Bun.spawnSync({ cmd });
    const decode = (buffer: Uint8Array | null) =>
      buffer ? new TextDecoder().decode(buffer) : "";
    return {
      code: result.exitCode ?? 1,
      out: `${decode(result.stdout)}${decode(result.stderr)}`.trim(),
    };
  } catch (error) {
    return { code: 1, out: String(error) };
  }
};

export const checkPrereqs = (): PrereqResult[] => {
  const spacetime = tryRun(["spacetime", "--version"]);
  return [
    {
      name: "spacetime CLI",
      ok: spacetime.code === 0,
      detail: spacetime.out || "not found on PATH",
    },
  ];
};

/** Throw with a clear summary if any prerequisite is missing. */
export const requirePrereqs = (): PrereqResult[] => {
  const results = checkPrereqs();
  const missing = results.filter((result) => !result.ok);
  if (missing.length > 0) {
    throw new Error(
      `E2E prerequisites missing:\n${missing
        .map((m) => `  - ${m.name}: ${m.detail}`)
        .join("\n")}`,
    );
  }
  return results;
};
