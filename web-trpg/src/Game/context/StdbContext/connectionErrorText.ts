/**
 * The SDK's connectionError field is TYPED as Error, but at runtime it
 * forwards whatever the platform produced: ws.onerror hands it a DOM
 * ErrorEvent (which for WebSocket failures carries no reason at all —
 * browsers deliberately withhold it from scripts), and the connect
 * promise's catch forwards any thrown value. This is OUR rendering
 * boundary: narrow the unknown explicitly, never coerce blindly — a blind
 * String() renders an event object as "[object Object]".
 */
export const describeConnectionError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message === "" ? error.name : error.message;
  }
  if (typeof error === "string" && error !== "") {
    return error;
  }
  if (typeof Event !== "undefined" && error instanceof Event) {
    // All a WebSocket error event truthfully tells us is that the attempt
    // failed; there is no reason inside it to surface.
    return "The connection attempt failed.";
  }
  if (typeof error === "object" && error != null) {
    try {
      const serialized = JSON.stringify(error);
      if (typeof serialized === "string" && serialized !== "{}") {
        return serialized;
      }
    } catch {
      // Circular or otherwise unserializable: fall through.
    }
  }
  return "The connection failed for an unreportable reason.";
};
