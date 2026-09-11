export const clamp01 = (value: number): number =>
  Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

export const toDOMRectLike = (rect: DOMRect) => ({
  x: rect.x,
  y: rect.y,
  width: rect.width,
  height: rect.height,
  top: rect.top,
  right: rect.right,
  bottom: rect.bottom,
  left: rect.left,
});
