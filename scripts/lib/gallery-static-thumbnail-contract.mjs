export function expectedStaticThumbnailDimensions(
  fullWidth,
  fullHeight,
  maximumEdge = 640,
) {
  for (const [label, value] of [
    ["full width", fullWidth],
    ["full height", fullHeight],
    ["maximum edge", maximumEdge],
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`Gallery static thumbnail ${label} must be a positive safe integer.`);
    }
  }

  const scale = Math.min(1, maximumEdge / Math.max(fullWidth, fullHeight));
  return {
    width: Math.max(1, Math.round(fullWidth * scale)),
    height: Math.max(1, Math.round(fullHeight * scale)),
  };
}
