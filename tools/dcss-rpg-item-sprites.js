const freeze = (value) => Object.freeze(value);

function positiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TypeError(`${label} must be a positive integer`);
  }
  return value;
}

export function opaquePixelBounds({ width, height, data }, alphaThreshold = 8) {
  positiveInteger(width, 'Sprite width');
  positiveInteger(height, 'Sprite height');
  if (!data || data.length < width * height * 4) {
    throw new TypeError('Sprite RGBA data is incomplete');
  }
  if (!Number.isFinite(alphaThreshold) || alphaThreshold < 0 || alphaThreshold > 255) {
    throw new RangeError('Alpha threshold must be between 0 and 255');
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) {
    return freeze({ x: 0, y: 0, width, height, empty: true });
  }
  return freeze({
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    empty: false,
  });
}

export function fittedSpriteRect(bounds, targetSize = 44) {
  const width = positiveInteger(bounds?.width, 'Visible sprite width');
  const height = positiveInteger(bounds?.height, 'Visible sprite height');
  if (!Number.isFinite(bounds?.x) || !Number.isFinite(bounds?.y)) {
    throw new TypeError('Visible sprite origin must be finite');
  }
  if (!Number.isFinite(targetSize) || targetSize <= 0) {
    throw new RangeError('Target sprite size must be positive');
  }
  const scale = targetSize / Math.max(width, height);
  return freeze({
    sourceX: bounds.x,
    sourceY: bounds.y,
    sourceWidth: width,
    sourceHeight: height,
    drawWidth: Math.max(1, Math.round(width * scale)),
    drawHeight: Math.max(1, Math.round(height * scale)),
  });
}
