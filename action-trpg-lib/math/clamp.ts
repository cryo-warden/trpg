export const clamp: (value: number, bottom: number, top: number) => number = (
  value,
  bottom,
  top
) => Math.max(bottom, Math.min(value, top));
