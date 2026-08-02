/**
 * The rendering seam that lets game narration be produced without assuming
 * React. Rendering code builds output by calling these operations instead of
 * writing JSX, so the same narration can be fulfilled as React nodes (the web
 * client) or as plain strings (a headless/CLI player) purely by injecting a
 * different `Markup`. This is generic infrastructure, not game-domain logic.
 */
export type Markup<Node> = {
  /** The empty node — nothing rendered. */
  empty: Node;
  /** A run of literal text. */
  text: (value: string) => Node;
  /** A child node tagged with a presentation class (styling hint). */
  styled: (className: string, child: Node) => Node;
  /** Concatenate nodes in order into a single node. */
  join: (nodes: Node[]) => Node;
};
